import axios from "axios"
import { randomUUID } from "crypto"
import fs from "fs"
import os from "os"
import ProgressBar from "progress"
import sqlite3 from "sqlite3"
import { Writable } from "stream"
import { $ } from "zx/core"

$.quote = (str: string) => str
$.quiet = true

export const platform = os.platform()

// Steam Handlers

export const steamPath = process.env.STEAM_PATH || "/usr/games/steamcmd"

const _steamHomePath = [
    `${os.homedir()}/.steam/SteamApps/common`,
    `${os.homedir()}/Steam/steamapps/common`,
]

export const steamHomePath = () => {
    return _steamHomePath.find((path) => fs.existsSync(path)) || ""
}

export const steamGlobalUsername = process.env.STEAM_USERNAME

export const steamUpdate = async ({
    steamAppId,
    steamUsername,
    steamAppBetaBranch,
    steamLoginAnonymous = true,
    targetPlatform,
}: {
    steamAppId: string
    steamUsername?: string
    steamAppBetaBranch?: string
    steamLoginAnonymous?: boolean
    targetPlatform?: string
}) => {
    if (!fs.existsSync(steamPath)) {
        throw new Error(
            "SteamCMD not found, refer to `https://developer.valvesoftware.com/wiki/SteamCMD` for installation instructions",
        )
    }
    const chosenSteamUsername =
        steamUsername ||
        steamGlobalUsername ||
        (steamLoginAnonymous ? "anonymous" : "")

    if (!chosenSteamUsername) {
        throw new Error("Steam username not provided")
    }

    const maxRetries = 5

    const command = [
        steamPath,
        `+@sSteamCmdForcePlatformType "${
            targetPlatform ?? platform === "win32" ? "windows" : "linux"
        }"`,
        `+login ${chosenSteamUsername}`,
        `+app_update ${steamAppId}`,
        `${steamAppBetaBranch ? `-beta ${steamAppBetaBranch}` : ``}`,
        `validate`,
        `+quit`,
    ].join(" ")

    console.log(
        `! Updating Steam App ${steamAppId} ${
            steamAppBetaBranch ? `on branch ${steamAppBetaBranch}) ` : ``
        }logged in as ${chosenSteamUsername}`,
    )
    for (let i = 0; i < maxRetries; i++) {
        try {
            await $`${command}`.pipe(new CarriageReturnWritableStream())
            return
        } catch {
            console.error(`X Steam App ${steamAppId} update failed. Retrying`)
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }
    }
    throw new Error(
        `Steam App ${steamAppId} update failed after ${maxRetries} retries under user ${chosenSteamUsername}`,
    )
}

// Screen Handlers

const nameScreen = <T extends PersistedObject>(metadata: T) => {
    return `${metadata.name}-${metadata.uuid}`
}

export const existsScreen = async <T extends PersistedObject>(metadata: T) => {
    const { stdout } = await $`screen -ls`.catch((reason) => reason)
    return stdout.includes(nameScreen(metadata))
}

export const createScreen = async <T extends PersistedObject>({
    metadata,
    screenArgs,
    cwd,
}: {
    metadata: T
    screenArgs: string[]
    cwd?: string
}) => {
    if (await existsScreen(metadata)) {
        throw new Error(
            `Screen ${nameScreen(metadata)} already exists, aborting`,
        )
    }

    const command = [
        cwd ? `cd "${cwd}";` : ``,
        `screen`,
        `-dm`,
        `-S ${nameScreen(metadata)}`,
        `bash -c`,
        `"${screenArgs.join(" ")};`,
        `echo -e '\n\nScreen session has been closed. Press Enter to exit.';`,
        `read -p '';`,
        `exit 0"`,
    ].join(" ")

    if (process.env.NODE_ENV === "development") {
        console.debug(
            `& Creating screen ${nameScreen(
                metadata,
            )} with command:\n\n${command}\n\n`,
        )
    }
    await $`${command}`
}

export const attachScreen = async <T extends PersistedObject>(metadata: T) => {
    await $`screen -r ${nameScreen(metadata)}`
}

// Game Instance Persistence Handlers

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

// Extra

export const download = async (url: string, outputPath: string) => {
    const { data, headers, status } = await axios.get(url, {
        responseType: "stream",
    })

    if (status !== 200) {
        throw new Error(`Failed to download file from ${url}`)
    }

    const totalLength = headers["content-length"]
    const progressBar = new ProgressBar("> [:bar] :percent | ETA: :etas", {
        width: 40,
        complete: "█",
        incomplete: "░",
        renderThrottle: 1,
        total: parseInt(totalLength ?? "0"),
    })

    return new Promise<void>((resolve, reject) => {
        data.on("data", (chunk: any) =>
            totalLength ? progressBar.tick(chunk.length) : null,
        )
        data.on("end", () => resolve())
        data.on("error", (err: any) => reject(err))
        data.pipe(fs.createWriteStream(outputPath))
    })
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

export class CarriageReturnWritableStream extends Writable {
    _write(chunk: any, encoding: string, callback: Function) {
        chunk
            .toString()
            .split("\n")
            .forEach((line: string) => {
                const message = line.trim()
                if (message.length <= 0) {
                    return
                }
                process.stdout.write(
                    `\r> ${message.slice(0, process.stdout.columns)}`.padEnd(
                        process.stdout.columns + 1,
                    ),
                )
            })
        callback()
    }
}
