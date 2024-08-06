import knex, { Knex } from "knex"
import os from "os"
import fs from "fs"
import { $ } from "zx/core"

$.quote = (str: string) => str
$.quiet = true

export const platform = os.platform()

// Steam Handlers

export const steamPath = process.env.STEAM_PATH || "/usr/games/steamcmd"

export const steamGlobalUsername = process.env.STEAM_USERNAME

export const steamUpdate = async ({
    steamAppId,
    steamUsername,
    steamAppBetaBranch,
    steamLoginAnonymous = true,
}: {
    steamAppId: string
    steamUsername?: string
    steamAppBetaBranch?: string
    steamLoginAnonymous?: boolean
}) => {
    if (!fs.existsSync(steamPath)) {
        throw new Error(
            'SteamCMD not found, please install it with `curl -sqL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" | tar zxvf -`',
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
            platform === "win32" ? "windows" : "linux"
        }"`,
        `+login ${chosenSteamUsername}`,
        `+app_update ${steamAppId}`,
        `${steamAppBetaBranch ? `-beta ${steamAppBetaBranch}` : ``}`,
        `validate`,
        `+quit`,
    ].join(" ")

    console.log(
        `Updating Steam App ${steamAppId} ${
            steamAppBetaBranch ? `on branch ${steamAppBetaBranch})` : ``
        }`,
    )
    for (let i = 0; i < maxRetries; i++) {
        try {
            await $`${command}`
            return
        } catch {
            console.error("Steam update failed. Retrying...")
            await new Promise((resolve) => setTimeout(() => {}, 3000))
        }
    }
    throw new Error(`Steam update failed after ${maxRetries} retries`)
}

// Screen Handlers

export const createScreen = async <T extends PersistedObject>({
    metadata,
    screenArgs,
}: {
    metadata: T
    screenArgs: string[]
}) => {
    const command = [
        `screen`,
        `-dm`,
        `-S ${metadata.name}-${metadata.uuid}`,
        `bash -c`,
        `"${screenArgs.join(" ")};`,
        `echo -e '\n\nScreen session has been closed. Press Enter to exit.';`,
        `read -p '';`,
        `exit 0"`,
    ].join(" ")

    await $`${command}`
}

export const attachScreen = async <T extends PersistedObject>(metadata: T) => {
    await $`screen -r ${metadata.name}-${metadata.uuid}`
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
    protected commit: Knex
    protected table: string

    constructor(table: string, persistedConstructor: new (data: any) => U) {
        this.commit = knex({
            client: "sqlite3",
            connection: {
                filename: "./appdata/game.sqlite3",
            },
            useNullAsDefault: true,
        })

        this.persistedConstructor = persistedConstructor
        this.table = table
    }

    findAllInstances = async () => {
        const rows = await this.commit.select("*").from(this.table)
        return rows.map((row: U) => new this.persistedConstructor(row))
    }

    createInstance = async (metadata: Omit<T, "id" | "timestamp">) => {
        return this.commit.insert(metadata).into(this.table)
    }

    updateInstance = async (
        uuid: string,
        metadata: Omit<T, "id" | "timestamp">,
    ) => {
        return this.commit.update(metadata).from(this.table).where({ uuid })
    }

    deleteInstance = async (uuid: string) => {
        return this.commit.delete().from(this.table).where({ uuid })
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
