import { confirm, input } from "@inquirer/prompts"
import { randomUUID } from "crypto"
import { $ } from "zx/core"
import * as Core from "."
import GameScreen from "./game-screen"
import fs from "fs"

interface TerrariaPersistedSchema extends Core.PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_autocreate: 1 | 2 | 3
    game_worldname: string
    game_seed?: string

    game_port: number
    game_maxplayers: number
    game_pass?: string
    game_motd?: string
    game_secure?: boolean
    game_noupnp?: boolean
}

class TerrariaPersistedObject extends Core.PersistedObject<TerrariaPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameAutocreate = this.raw.game_autocreate
    gameWorldname = this.raw.game_worldname
    gameSeed = this.raw.game_seed

    gamePort = this.raw.game_port
    gameMaxPlayers = this.raw.game_maxplayers
    gamePass = this.raw.game_pass
    gameMotd = this.raw.game_motd
    gameSecure = this.raw.game_secure
    gameNoUPnP = this.raw.game_noupnp
}

class TerrariaScreen extends GameScreen<
    TerrariaPersistedSchema,
    TerrariaPersistedObject
> {
    public static steamAppId = "105600"
    public static steamAppPath =
        "~/.steam/SteamApps/common/Terraria/TerrariaServer.bin.x86_64"

    protected persistence = new Core.Persistence<
        TerrariaPersistedSchema,
        TerrariaPersistedObject
    >("game_terraria", TerrariaPersistedObject)

    protected updateMetadata = async (
        metadata: Omit<TerrariaPersistedSchema, "id" | "timestamp">,
    ) => {
        const updateForms = [
            // {
            //     message:
            //         "Steam App Beta Branch (Leave empty for none)",
            //     default: metadata.steam_app_beta_branch,
            //     callback: (value: string) => {
            //         metadata.steam_app_beta_branch = value || undefined
            // }
            // },
            {
                message: "Steam Username (Leave empty for default)",
                default: metadata.steam_username,
                callback: (value: string) =>
                    (metadata.steam_username = value || undefined),
            },
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
                    metadata.game_worldname = value
                },
            },
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
                message: "Game Seed (Leave empty for random)",
                default: metadata.game_seed,
                callback: (value: string) => {
                    metadata.game_seed = value || undefined
                },
            },
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
            // {
            //     message: "Game Max Players (e.g. 8)",
            //     default: metadata.game_maxplayers?.toString(),
            //     validate: (value: string) => {
            //         return value.length > 0
            //             ? true
            //             : "Max Players cannot be empty"
            //     },
            //     callback: (value: string) => {
            //         metadata.game_maxplayers = parseInt(value)
            //     },
            // },
            {
                message: "Game Password (Leave empty for none)",
                default: metadata.game_pass,
                callback: (value: string) => {
                    metadata.game_pass = value || undefined
                },
            },
            {
                message: "Game Message of the Day (Leave empty for none)",
                default: metadata.game_motd,
                callback: (value: string) => {
                    metadata.game_motd = value || undefined
                },
            },
            // {
            //     message: "Game Secure (true/false)",
            //     default: metadata.game_secure?.toString(),
            //     validate: (value: string) => {
            //         return value === "true" || value === "false"
            //             ? true
            //             : "Secure must be true or false"
            //     },
            //     callback: (value: string) => {
            //         metadata.game_secure = value === "true"
            //     },
            // },
            // {
            //     message: "Game No UPnP (true/false)",
            //     default: metadata.game_noupnp?.toString(),
            //     validate: (value: string) => {
            //         return value === "true" || value === "false"
            //             ? true
            //             : "No UPnP must be true or false"
            //     },
            //     callback: (value: string) => {
            //         metadata.game_noupnp = value === "true"
            //     },
            // }
        ]
        for (const form of updateForms) {
            const answer = await input(form)
            form.callback(answer)
        }
        return metadata
    }

    protected createScreen = async () => {
        const metadata: Omit<TerrariaPersistedSchema, "id" | "timestamp"> = {
            uuid: randomUUID().slice(0, 4),
            name: "",
            steam_app_beta_branch: undefined,
            steam_username: undefined,

            game_autocreate: 1,
            game_worldname: "",
            game_seed: undefined,

            game_port: 7777,
            game_maxplayers: 16,
            game_pass: undefined,
            game_motd: undefined,
            game_secure: true,
            game_noupnp: true,
        }
        const updatedMetadata = await this.updateMetadata(metadata)
        await this.persistence.createInstance(updatedMetadata)
    }

    protected hostScreen = async (instance: TerrariaPersistedObject) => {
        await Core.steamUpdate({
            steamAppId: TerrariaScreen.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: false,
            steamUsername: instance.steamUsername,
        })
        $`chmod +x ${TerrariaScreen.steamAppPath}`
        await Core.createScreen({
            metadata: instance,
            screenArgs: [
                TerrariaScreen.steamAppPath,
                `-world "~/.local/share/Terraria/Worlds/${instance.gameWorldname}.wld"`,
                `-autocreate ${instance.gameAutocreate}`,
                `-worldname "${instance.gameWorldname}"`,
                instance.gameSeed ? `-seed "${instance.gameSeed}"` : "",
                `-port ${instance.gamePort}`,
                `-maxplayers ${instance.gameMaxPlayers}`,
                instance.gamePass ? `-password "${instance.gamePass}"` : "",
                instance.gameMotd ? `-motd "${instance.gameMotd}"` : "",
                instance.gameSecure ? "-secure" : "",
                instance.gameNoUPnP ? "-noupnp" : "",
            ],
        })
        const attachToScreen = await confirm({
            message: "Do you want to attach the screen to the terminal",
            default: true,
        })
        if (attachToScreen) {
            await Core.attachScreen(instance)
        }
    }
}

export default new TerrariaScreen()
