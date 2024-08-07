import axios from "axios"
import fs from "fs"
import knex, { Knex } from "knex"
import os from "os"
import ProgressBar from "progress"
import { Writable } from "stream"
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
            await $`${command}`.pipe(process.stdout)
            return
        } catch {
            console.error("Steam update failed. Retrying...")
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }
    }
    throw new Error(`Steam update failed after ${maxRetries} retries`)
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
}: {
    metadata: T
    screenArgs: string[]
}) => {
    if (await existsScreen(metadata)) {
        throw new Error(
            `Screen ${nameScreen(metadata)} already exists, aborting`,
        )
    }

    const command = [
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
        console.log(
            `Creating screen ${nameScreen(
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

// Extra

export const downloadFile = async (url: string, outputPath: string) => {
    const { data, headers, status } = await axios.get(url, {
        responseType: "stream",
    })

    if (status !== 200) {
        throw new Error(`Failed to download file from ${url}`)
    }

    const totalLength = headers["content-length"]
    const progressBar = new ProgressBar(
        "-> Downloading [:bar] :percent | ETA: :etas",
        {
            width: 40,
            complete: "█",
            incomplete: "░",
            renderThrottle: 1,
            total: parseInt(totalLength ?? "0"),
        },
    )

    return new Promise<void>((resolve, reject) => {
        data.on("data", (chunk: any) =>
            totalLength ? progressBar.tick(chunk.length) : null,
        )
        data.on("end", () => resolve())
        data.on("error", (err: any) => reject(err))
        data.pipe(fs.createWriteStream(outputPath))
    })
}

export class WritableStream extends Writable {
    _write(chunk: any, encoding: string, callback: Function) {
        if (process.env.NODE_ENV === "development") {
            process.stdout.write(chunk)
        }
        callback()
    }
}
