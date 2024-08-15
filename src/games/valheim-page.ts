import { input } from "@inquirer/prompts"
import fs from "fs"
import os from "os"
import GamePage from "./game-page"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"
import { PersistedObject, PersistedSchema, Persistence } from "./persistences"

interface ValheimPersistedSchema extends PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string
}

class ValheimPersistedObject extends PersistedObject<ValheimPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username
}

class ValheimPage extends GamePage<ValheimPersistedSchema, ValheimPersistedObject> {
    public static steamAppId = "896660"
    public static executableParentDir = `${Steam.steamHomePath()}/Valheim dedicated server`
    public static executablePath = `${ValheimPage.executableParentDir}/valheim_server.x86_64`

    public static savedWorldsPath = `${os.homedir()}/.config/unity3d/IronGate/Valheim/worlds_local`

    protected persistence = new Persistence<ValheimPersistedSchema, ValheimPersistedObject>(
        "game_valheim",
        ValheimPersistedObject,
    )

    protected metadataDefaultSchema: Omit<ValheimPersistedSchema, "id" | "timestamp" | "uuid"> = {
        name: "",
        steam_app_beta_branch: undefined,
        steam_username: undefined,
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<ValheimPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
            {
                message: "Name (e.g. Valheim-Server)",
                default: metadata.name,
                transformer: (value: string) => {
                    return value.trim().replace(/ /g, "-")
                },
                validate: (value: string) => {
                    return value.length > 0 ? true : "Name cannot be empty"
                },
                callback: (value: string) => {
                    metadata.name = value
                    const worldPath = `${
                        ValheimPage.savedWorldsPath
                    }/${metadata.name.toLowerCase()}.fwl`
                    console.log(
                        fs.existsSync(worldPath) ?
                            `! Found existing world at ${worldPath}`
                        :   `! No existing world found at ${worldPath}, creating a new one`,
                    )
                },
            },
            {
                message: "Steam App Beta Branch (Leave empty for none)",
                default: metadata.steam_app_beta_branch,
                callback: (value: string) => (metadata.steam_app_beta_branch = value || undefined),
            },
            // {
            //     message: "Steam Username (Leave empty for default)",
            //     default: metadata.steam_username,
            //     callback: (value: string) =>
            //         (metadata.steam_username = value || undefined),
            // },
        ]) {
            prompt.callback(await input(prompt))
        }
        return metadata
    }

    protected performStartupInitialization = async (instance: ValheimPersistedObject) => {
        await Steam.steamUpdate({
            steamAppId: ValheimPage.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: true,
            steamUsername: instance.steamUsername,
        })
        await Screen.createScreen({
            metadata: instance,
            cwd: ValheimPage.executableParentDir,
            screenArgs: [
                `TEMP_LD_LIBRARY_PATH=\\\${LD_LIBRARY_PATH:-};`,
                `export LD_LIBRARY_PATH=./linux64:\\\$LD_LIBRARY_PATH;`,
                `export SteamAppId=892970;`,
                `'${ValheimPage.executablePath}'`,
                `-name '${instance.name}'`,
                `-port '2456'`,
                `-world '${instance.name.toLowerCase()}'`,
                `-public 0`,
                `-nographics`,
                `-batchmode`,
                `-crossplay;`,
                `export LD_LIBRARY_PATH=\\\$TEMP_LD_LIBRARY_PATH`,
            ],
        })
    }
}

export default new ValheimPage()
