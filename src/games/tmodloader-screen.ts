import { input } from "@inquirer/prompts"
import fs from "fs"
import * as Core from "."
import GameScreen from "./game-screen"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"

interface TModLoaderPersistedSchema extends Core.PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_working_directory_path: string

    game_autocreate: 1 | 2 | 3
    game_seed?: string

    game_port: number
    game_motd?: string
}

class TModLoaderPersistedObject extends Core.PersistedObject<TModLoaderPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameWorkingDirectoryPath = this.raw.game_working_directory_path

    gameAutocreate = this.raw.game_autocreate
    gameSeed = this.raw.game_seed

    gamePort = this.raw.game_port
    gameMotd = this.raw.game_motd
}

class TModLoaderScreen extends GameScreen<TModLoaderPersistedSchema, TModLoaderPersistedObject> {
    public static steamAppId = "1281930"
    public static executablePath = `${Steam.steamHomePath()}/tModLoader/start-tModLoaderServer.sh`

    protected persistence = new Core.Persistence<
        TModLoaderPersistedSchema,
        TModLoaderPersistedObject
    >("game_tmodloader", TModLoaderPersistedObject)

    protected metadataDefaultSchema: Omit<TModLoaderPersistedSchema, "id" | "timestamp" | "uuid"> =
        {
            name: "",
            steam_app_beta_branch: undefined,
            steam_username: undefined,

            game_working_directory_path: "",

            game_autocreate: 1,
            game_seed: undefined,

            game_port: 7777,
            game_motd: undefined,
        }

    protected promptMetadataConfiguration = async (
        metadata: Omit<TModLoaderPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
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
                message: "Steam App Beta Branch (Leave empty for none, e.g. '1.4.3-legacy')",
                default: metadata.steam_app_beta_branch,
                callback: (value: string) => (metadata.steam_app_beta_branch = value || undefined),
            },
            // {
            //     message: "Steam Username (Leave empty for default)",
            //     default: metadata.steam_username,
            //     callback: (value: string) =>
            //         (metadata.steam_username = value || undefined),
            // },
            {
                message: "Working Directory Path (e.g. /path/to/SaveData)",
                default: metadata.game_working_directory_path,
                validate: (value: string) => {
                    return (
                        value.trim().length > 0 ?
                            fs.existsSync(value) ?
                                fs.statSync(value).isDirectory() ?
                                    true
                                :   "Path is not a directory"
                            :   "Path does not exist"
                        :   "Path cannot be empty"
                    )
                },
                callback: (value: string) => {
                    metadata.game_working_directory_path = value
                },
            },
        ]) {
            prompt.callback(await input(prompt))
        }

        const worldPath = `${metadata.game_working_directory_path}/Worlds/world.wld`

        if (!fs.existsSync(worldPath)) {
            console.log(`! No existing world found at ${worldPath}, creating a new one`)
            for (const prompt of [
                {
                    message: "Game World Size (1 = small, 2 = medium, 3 = large)",
                    default: metadata.game_autocreate?.toString(),
                    validate: (value: string) => {
                        return value === "1" || value === "2" || value === "3" ?
                                true
                            :   "World size must be 1, 2 or 3"
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

    private freezeEnabledMods = (instance: TModLoaderPersistedObject) => {
        if (!fs.existsSync(`${instance.gameWorkingDirectoryPath}/Mods`)) {
            console.warn(
                `! Mods folder not found at ${instance.gameWorkingDirectoryPath}/Mods, assuming this is a clean installation.`,
            )
            return
        }
        try {
            if (!fs.existsSync(`${instance.gameWorkingDirectoryPath}/Mods/enabled.json.constant`)) {
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

    protected performStartupInitialization = async (instance: TModLoaderPersistedObject) => {
        await Steam.steamUpdate({
            steamAppId: TModLoaderScreen.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: false,
            steamUsername: instance.steamUsername,
        })
        this.freezeEnabledMods(instance)
        await Screen.createScreen({
            metadata: instance,
            screenArgs: [
                TModLoaderScreen.executablePath,
                `-nosteam`,
                `-tmlsavedirectory "${instance.gameWorkingDirectoryPath}"`,
                `-steamworkshopfolder none`,
                `-world "${instance.gameWorkingDirectoryPath}/Worlds/world.wld"`,
                `-autocreate ${instance.gameAutocreate}`,
                `-worldname "world"`,
                instance.gameSeed ? `-seed "${instance.gameSeed}"` : "",
                `-port ${instance.gamePort}`,
                `-maxplayers 16`,
                instance.gameMotd ? `-motd "${instance.gameMotd}"` : "",
            ],
        })
    }
}

export default new TModLoaderScreen()
