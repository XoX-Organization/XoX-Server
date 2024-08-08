import { confirm, input } from "@inquirer/prompts"
import { randomUUID } from "crypto"
import fs from "fs"
import * as Core from "."
import GameScreen from "./game-screen"

interface TModLoaderPersistedSchema extends Core.PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string
    game_config_file_path: string
    game_save_folder_path: string
}

class TModLoaderPersistedObject extends Core.PersistedObject<TModLoaderPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username
    gameConfigFilePath = this.raw.game_config_file_path
    gameSaveFolderPath = this.raw.game_save_folder_path
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
                message:
                    "Game Config File Path (e.g. /path/to/serverconfig.txt)",
                default: metadata.game_config_file_path,
                validate: (value: string) => {
                    return value.trim().length > 0
                        ? fs.existsSync(value)
                            ? fs.statSync(value).isFile()
                                ? true
                                : "Path is not a file"
                            : "Path does not exist"
                        : "Path cannot be empty"
                },
                callback: (value: string) => {
                    metadata.game_config_file_path = value
                },
            },
            {
                message: "Game Save Folder Path (e.g. /path/to/SaveData)",
                default: metadata.game_save_folder_path,
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
                    metadata.game_save_folder_path = value
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
            game_config_file_path: "",
            game_save_folder_path: "",
        }
        const updatedMetadata = await this.updateMetadata(metadata)
        await this.persistence.createInstance(updatedMetadata)
    }

    private freezeEnabledMods = (instance: TModLoaderPersistedObject) => {
        try {
            if (
                !fs.existsSync(
                    `${instance.gameSaveFolderPath}/Mods/enabled.json.constant`,
                )
            ) {
                fs.copyFileSync(
                    `${instance.gameSaveFolderPath}/Mods/enabled.json`,
                    `${instance.gameSaveFolderPath}/Mods/enabled.json.constant`,
                )
            }
            fs.rmSync(`${instance.gameSaveFolderPath}/Mods/enabled.json`)
            fs.copyFileSync(
                `${instance.gameSaveFolderPath}/Mods/enabled.json.constant`,
                `${instance.gameSaveFolderPath}/Mods/enabled.json`,
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
                `-config "${instance.gameConfigFilePath}"`,
                `-tmlsavedirectory "${instance.gameSaveFolderPath}"`,
                `-steamworkshopfolder none`,
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
