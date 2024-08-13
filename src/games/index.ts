import { randomUUID } from "crypto"
import sqlite3 from "sqlite3"
import { $ } from "zx/core"

$.quote = (str: string) => str
$.quiet = true

export interface PersistedSchema {
    id: number
    timestamp: Date
    uuid: string
    name: string
}

export class Persistence<
    T extends PersistedSchema,
    U extends PersistedObject<T>,
> {
    protected persistedConstructor: new (data: any) => U
    protected db: sqlite3.Database
    protected table: string

    constructor(table: string, persistedConstructor: new (data: any) => U) {
        this.db = new sqlite3.Database(
            process.env.NODE_ENV === "development"
                ? "./dist/appdata.sqlite3"
                : `${process.env.HOME}/.xox-server/appdata.sqlite3`,
        )

        this.persistedConstructor = persistedConstructor
        this.table = table
    }

    findAllInstances = async (): Promise<U[]> => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM ${this.table}`
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    return reject(err)
                }
                resolve(
                    rows.map((row: any) => new this.persistedConstructor(row)),
                )
            })
        })
    }

    createInstance = async (
        metadata: Omit<T, "id" | "timestamp" | "uuid">,
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const data = { ...metadata, uuid: randomUUID().slice(0, 4) }
            const columns = Object.keys(data).join(", ")
            const placeholders = Object.keys(data)
                .map(() => "?")
                .join(", ")
            const sql = `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`
            const values = Object.values(data)

            this.db.run(sql, values, function (err) {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        })
    }

    updateInstance = async (
        uuid: string,
        metadata: Omit<T, "id" | "timestamp" | "uuid">,
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const updates = Object.keys(metadata)
                .map((key) => `${key} = ?`)
                .join(", ")
            const sql = `UPDATE ${this.table} SET ${updates} WHERE uuid = ?`
            const values = [...Object.values(metadata), uuid]

            this.db.run(sql, values, function (err) {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        })
    }

    deleteInstance = async (uuid: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM ${this.table} WHERE uuid = ?`

            this.db.run(sql, [uuid], function (err) {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        })
    }
}

export class PersistedObject<T extends PersistedSchema = PersistedSchema> {
    public raw: T

    id: number
    timestamp: Date
    uuid: string
    name: string

    constructor(data: T) {
        this.raw = data
        this.id = this.raw.id
        this.timestamp = this.raw.timestamp
        this.uuid = this.raw.uuid
        this.name = this.raw.name
    }
}

export const verifyRequiredPackages = async (packages: string[]) => {
    await Promise.all(
        packages.map((name) =>
            $`command -v ${name}`.catch(() => {
                throw new Error(`Package ${name} not found`)
            }),
        ),
    )
}
