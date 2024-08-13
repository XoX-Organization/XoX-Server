import { input } from "@inquirer/prompts"
import fs from "fs"
import os from "os"
import { $ } from "zx/core"
import * as Core from "."
import GameScreen from "./game-screen"

interface TerrariaPersistedSchema extends Core.PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_autocreate: 1 | 2 | 3
    game_seed?: string

    game_port: number
    game_motd?: string
}

class TerrariaPersistedObject extends Core.PersistedObject<TerrariaPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameAutocreate = this.raw.game_autocreate
    gameSeed = this.raw.game_seed

    gamePort = this.raw.game_port
    gameMotd = this.raw.game_motd
}

class TerrariaScreen extends GameScreen<
    TerrariaPersistedSchema,
    TerrariaPersistedObject
> {
    public static steamAppId = "105600"
    public static executablePath = `${Core.steamHomePath()}/Terraria/TerrariaServer.bin.x86_64`
    public static savedWorldsPath = `${os.homedir()}/.local/share/Terraria/Worlds`

    protected persistence = new Core.Persistence<
        TerrariaPersistedSchema,
        TerrariaPersistedObject
    >("game_terraria", TerrariaPersistedObject)

    protected metadataDefaultSchema: Omit<
        TerrariaPersistedSchema,
        "id" | "timestamp" | "uuid"
    > = {
        name: "",
        steam_app_beta_branch: undefined,
        steam_username: undefined,

        game_autocreate: 1,
        game_seed: undefined,

        game_port: 7777,
        game_motd: undefined,
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<TerrariaPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
            {
                message: "Steam App Beta Branch (Leave empty for none)",
                default: metadata.steam_app_beta_branch,
                callback: (value: string) => {
                    metadata.steam_app_beta_branch = value || undefined
                },
            },
            // {
            //     message: "Steam Username (Leave empty for default)",
            //     default: metadata.steam_username,
            //     callback: (value: string) =>
            //         (metadata.steam_username = value || undefined),
            // },
            {
                message:
                    "Game World Name (e.g., 'Victor-World' for an existing world)",
                default: metadata.name,
                transformer: (value: string) => {
                    return value.trim().replace(/ /g, "-")
                },
                validate: (value: string) => {
                    return value.length > 0 ? true : "Name cannot be empty"
                },
                callback: (value: string) => {
                    metadata.name = value
                },
            },
        ]) {
            prompt.callback(await input(prompt))
        }

        const worldPath = `${TerrariaScreen.savedWorldsPath}/${metadata.name}.wld`

        if (!fs.existsSync(worldPath)) {
            console.log(
                `! No existing world found at ${worldPath}, creating a new one`,
            )
            for (const prompt of [
                {
                    message: "Game World Size (1=small, 2=medium, 3=large)",
                    default: metadata.game_autocreate?.toString(),
                    validate: (value: string) => {
                        return value === "1" || value === "2" || value === "3"
                            ? true
                            : "World size must be 1, 2 or 3"
                    },
                    callback: (value: string) => {
                        metadata.game_autocreate = parseInt(value) as 1 | 2 | 3
                    },
                },
                {
                    message: [
                        `\u001b]8;;`,
                        `https://terraria.fandom.com/wiki/Secret_world_seeds`,
                        `\u0007`,
                        `Game Seed (Leave empty for random)`,
                        `\u001b]8;;`,
                        `\u0007`,
                    ].join(""),
                    default: metadata.game_seed,
                    callback: (value: string) => {
                        metadata.game_seed = value || undefined
                    },
                },
            ]) {
                prompt.callback(await input(prompt))
            }
        } else {
            console.log(`! Found existing world at ${worldPath}`)
        }

        for (const prompt of [
            {
                message: "Game Port (e.g. 7777)",
                default: metadata.game_port?.toString(),
                validate: (value: string) => {
                    return value.length > 0 ? true : "Port cannot be empty"
                },
                callback: (value: string) => {
                    metadata.game_port = parseInt(value)
                },
            },
            {
                message: "Game Message of the Day (Leave empty for none)",
                default: metadata.game_motd,
                callback: (value: string) => {
                    metadata.game_motd = value || undefined
                },
            },
        ]) {
            prompt.callback(await input(prompt))
        }
        return metadata
    }

    protected performStartupInitialization = async (
        instance: TerrariaPersistedObject,
    ) => {
        await Core.steamUpdate({
            steamAppId: TerrariaScreen.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: false,
            steamUsername: instance.steamUsername,
        })
        $`chmod +x ${TerrariaScreen.executablePath}`
        await Core.createScreen({
            metadata: instance,
            screenArgs: [
                TerrariaScreen.executablePath,
                `-world "${TerrariaScreen.savedWorldsPath}/${instance.name}.wld"`,
                `-autocreate ${instance.gameAutocreate}`,
                `-worldname "${instance.name}"`,
                instance.gameSeed ? `-seed "${instance.gameSeed}"` : "",
                `-port ${instance.gamePort}`,
                `-maxplayers 16`,
                instance.gameMotd ? `-motd "${instance.gameMotd}"` : "",
            ],
        })
    }
}

export default new TerrariaScreen()
