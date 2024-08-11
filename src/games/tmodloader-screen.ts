import { confirm, input } from "@inquirer/prompts"
import { randomUUID } from "crypto"
import fs from "fs"
import * as Core from "."
import GameScreen from "./game-screen"

interface TModLoaderPersistedSchema extends Core.PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_working_directory_path: string

    game_autocreate: 1 | 2 | 3
    game_seed?: string

    game_port: number
    game_maxplayers: number
    game_pass?: string
    game_motd?: string
    game_secure?: boolean
    game_noupnp?: boolean
}

class TModLoaderPersistedObject extends Core.PersistedObject<TModLoaderPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameWorkingDirectoryPath = this.raw.game_working_directory_path

    gameAutocreate = this.raw.game_autocreate
    gameSeed = this.raw.game_seed

    gamePort = this.raw.game_port
    gameMaxPlayers = this.raw.game_maxplayers
    gamePass = this.raw.game_pass
    gameMotd = this.raw.game_motd
    gameSecure = this.raw.game_secure
    gameNoUPnP = this.raw.game_noupnp
}

class TModLoaderScreen extends GameScreen<
    TModLoaderPersistedSchema,
    TModLoaderPersistedObject
> {
    public static steamAppId = "1281930"
    public static steamAppPath =
        "~/.steam/SteamApps/common/tModLoader/start-tModLoaderServer.sh"

    protected persistence = new Core.Persistence<
        TModLoaderPersistedSchema,
        TModLoaderPersistedObject
    >("game_tmodloader", TModLoaderPersistedObject)

    protected updateMetadata = async (
        metadata: Omit<TModLoaderPersistedSchema, "id" | "timestamp">,
    ) => {
        const updateForms = [
            {
                message: "Name (e.g. Calamity-Modpack-3.4.5)",
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
            {
                message:
                    "Steam App Beta Branch (Leave empty for none, e.g. '1.4.3-legacy')",
                default: metadata.steam_app_beta_branch,
                callback: (value: string) =>
                    (metadata.steam_app_beta_branch = value || undefined),
            },
            {
                message: "Steam Username (Leave empty for default)",
                default: metadata.steam_username,
                callback: (value: string) =>
                    (metadata.steam_username = value || undefined),
            },
            {
                message: "Working Directory Path (e.g. /path/to/SaveData)",
                default: metadata.game_working_directory_path,
                validate: (value: string) => {
                    return value.trim().length > 0
                        ? fs.existsSync(value)
                            ? fs.statSync(value).isDirectory()
                                ? true
                                : "Path is not a directory"
                            : "Path does not exist"
                        : "Path cannot be empty"
                },
                callback: (value: string) => {
                    metadata.game_working_directory_path = value
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
        ]
        for (const form of updateForms) {
            const answer = await input(form)
            form.callback(answer)
        }
        return metadata
    }

    protected createScreen = async () => {
        const metadata: Omit<TModLoaderPersistedSchema, "id" | "timestamp"> = {
            uuid: randomUUID().slice(0, 4),
            name: "",
            steam_app_beta_branch: undefined,
            steam_username: undefined,

            game_working_directory_path: "",

            game_autocreate: 1,
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

    private freezeEnabledMods = (instance: TModLoaderPersistedObject) => {
        if (!fs.existsSync(`${instance.gameWorkingDirectoryPath}/Mods`)) {
            console.warn(
                `! Mods folder not found at ${instance.gameWorkingDirectoryPath}/Mods, assuming this is a clean installation.`,
            )
            return
        }
        try {
            if (
                !fs.existsSync(
                    `${instance.gameWorkingDirectoryPath}/Mods/enabled.json.constant`,
                )
            ) {
                fs.copyFileSync(
                    `${instance.gameWorkingDirectoryPath}/Mods/enabled.json`,
                    `${instance.gameWorkingDirectoryPath}/Mods/enabled.json.constant`,
                )
            }
            fs.rmSync(`${instance.gameWorkingDirectoryPath}/Mods/enabled.json`)
            fs.copyFileSync(
                `${instance.gameWorkingDirectoryPath}/Mods/enabled.json.constant`,
                `${instance.gameWorkingDirectoryPath}/Mods/enabled.json`,
            )
        } catch (error) {
            throw new Error(
                `${error}. Perhaps you provided the wrong path for the game save folder.`,
            )
        }
    }

    protected hostScreen = async (instance: TModLoaderPersistedObject) => {
        await Core.steamUpdate({
            steamAppId: TModLoaderScreen.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: false,
            steamUsername: instance.steamUsername,
        })
        this.freezeEnabledMods(instance)
        await Core.createScreen({
            metadata: instance,
            screenArgs: [
                TModLoaderScreen.steamAppPath,
                `-nosteam`,
                `-tmlsavedirectory "${instance.gameWorkingDirectoryPath}"`,
                `-steamworkshopfolder none`,
                `-world "${instance.gameWorkingDirectoryPath}/Worlds/world.wld"`,
                `-autocreate ${instance.gameAutocreate}`,
                `-worldname "world"`,
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

export default new TModLoaderScreen()
