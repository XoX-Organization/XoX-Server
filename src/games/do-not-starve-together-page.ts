import { input } from "@inquirer/prompts"
import fs from "fs"
import GamePage from "./game-page"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"
import { PersistedObject, PersistedSchema, Persistence } from "./persistences"
import { $ } from "zx/core"

interface DoNotStarveTogetherPersistedSchema extends PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_working_directory_path: string
}

class DoNotStarveTogetherPersistedObject extends PersistedObject<DoNotStarveTogetherPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameWorkingDirectoryPath = this.raw.game_working_directory_path
}

class DoNotStarveTogetherPage extends GamePage<
    DoNotStarveTogetherPersistedSchema,
    DoNotStarveTogetherPersistedObject
> {
    public static steamAppId = "343050"
    public static executableParentDir = `${Steam.steamHomePath()}/Don't Starve Together Dedicated Server/bin`
    public static executablePath = `${this.executableParentDir}/dontstarve_dedicated_server_nullrenderer`

    protected persistence = new Persistence<
        DoNotStarveTogetherPersistedSchema,
        DoNotStarveTogetherPersistedObject
    >("game_do_not_starve_together", DoNotStarveTogetherPersistedObject)

    protected metadataDefaultSchema: Omit<
        DoNotStarveTogetherPersistedSchema,
        "id" | "timestamp" | "uuid"
    > = {
        name: "",
        game_working_directory_path: "",
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<DoNotStarveTogetherPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
            {
                message: "Name (e.g. XoX-DST)",
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
            // {
            //     message: "Steam App Beta Branch (Leave empty for none)",
            //     default: metadata.steam_app_beta_branch,
            //     callback: (value: string) => (metadata.steam_app_beta_branch = value || undefined),
            // },
            // {
            //     message: "Steam Username (Leave empty for default)",
            //     default: metadata.steam_username,
            //     callback: (value: string) =>
            //         (metadata.steam_username = value || undefined),
            // },
            {
                message: "Working Directory Path (e.g. /path/to/DST)",
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
        return metadata
    }

    protected performStartupInitialization = async (
        instance: DoNotStarveTogetherPersistedObject,
    ) => {
        // sudo apt-get install libcurl4-gnutls-dev:i386
        // await Steam.steamUpdate({
        //     steamAppId: DoNotStarveTogetherPage.steamAppId,
        //     steamAppBetaBranch: instance.steamAppBetaBranch,
        //     steamLoginAnonymous: true,
        //     steamUsername: instance.steamUsername,
        // })
        await Screen.createScreen({
            metadata: instance,
            cwd: DoNotStarveTogetherPage.executableParentDir,
            screenArgs: [
                `LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu`,
                `'${DoNotStarveTogetherPage.executablePath.replace(/'/g, "'\\''")}'`,
                `-persistent_storage_root '${instance.gameWorkingDirectoryPath}'`,
                `-conf_dir ${instance.name}-${instance.uuid}`,
            ],
        })
    }
}

export default new DoNotStarveTogetherPage()
