import { confirm, input } from "@inquirer/prompts"
import fs from "fs"
import { $ } from "zx"
import { CarriageReturnWritableStream } from "../utilities"
import GamePage from "./game-page"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"
import { PersistedObject, PersistedSchema, Persistence } from "./persistences"

interface DoNotStarveTogetherPersistedSchema extends PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_working_directory_path: string

    game_enable_caves: boolean
}

class DoNotStarveTogetherPersistedObject extends PersistedObject<DoNotStarveTogetherPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameWorkingDirectoryPath = this.raw.game_working_directory_path

    gameEnableCaves = this.raw.game_enable_caves
}

class DoNotStarveTogetherPage extends GamePage<
    DoNotStarveTogetherPersistedSchema,
    DoNotStarveTogetherPersistedObject
> {
    public static steamAppId = "343050"
    public static executableParentDir = `${Steam.steamHomePath()}/Don't Starve Together Dedicated Server`
    public static executableBinDir = `${this.executableParentDir}/bin64`
    public static executablePath = `${this.executableBinDir}/dontstarve_dedicated_server_nullrenderer_x64`

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
        game_enable_caves: true,
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<DoNotStarveTogetherPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const inputPrompt of [
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
            inputPrompt.callback(await input(inputPrompt))
        }

        for (const confirmPrompt of [
            {
                message: "Enable Caves",
                default: metadata.game_enable_caves,
                callback: (value: boolean) => {
                    metadata.game_enable_caves = value
                },
            },
        ]) {
            confirmPrompt.callback(await confirm(confirmPrompt))
        }

        return metadata
    }

    private configureRequiredMods = (
        modoverridesLuaFilePath: string,
        dedicatedServerModsSetupLuaFilePath: string,
    ) => {
        const data = fs.readFileSync(modoverridesLuaFilePath, "utf8")
        const regex = /workshop-(\d+)/g

        let workshopIds: string[] = []
        let match

        while ((match = regex.exec(data)) !== null) {
            workshopIds.push(match[1])
        }

        const outputContent = workshopIds.map((id) => `ServerModSetup("${id}")`).join("\n")

        fs.writeFileSync(dedicatedServerModsSetupLuaFilePath, outputContent, "utf8")
    }

    protected performStartupInitialization = async (
        instance: DoNotStarveTogetherPersistedObject,
    ) => {
        const executableModsDir = `${DoNotStarveTogetherPage.executableParentDir}/mods`

        await Steam.steamUpdate({
            steamAppId: DoNotStarveTogetherPage.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: true,
            steamUsername: instance.steamUsername,
        })

        console.log("! Checking for dependencies")
        await $`dpkg -l | grep libcurl4-gnutls-dev:i386 || sudo apt-get install -y libcurl4-gnutls-dev:i386`

        const modoverridesLuaFilePath = `${instance.gameWorkingDirectoryPath}/${instance.name}-${instance.uuid}/Cluster_1/Master/modoverrides.lua`

        if (fs.existsSync(modoverridesLuaFilePath)) {
            console.log("! Configuring server mods")
            this.configureRequiredMods(
                `${instance.gameWorkingDirectoryPath}/${instance.name}-${instance.uuid}/Cluster_1/Master/modoverrides.lua`,
                `${executableModsDir}/dedicated_server_mods_setup.lua`,
            )

            console.log("! Updating server mods")
            await $({ cwd: DoNotStarveTogetherPage.executableBinDir })`${[
                `LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu`,
                `'${DoNotStarveTogetherPage.executablePath.replace(/'/g, "'\\''")}'`,
                `-only_update_server_mods`,
                `-ugc_directory '${instance.gameWorkingDirectoryPath}/ugc_mods'`,
                `-persistent_storage_root '${instance.gameWorkingDirectoryPath}'`,
                `-conf_dir ${instance.name}-${instance.uuid}`,
                `-shard Master`,
            ].join(" ")}`.pipe(new CarriageReturnWritableStream())
        }

        await Screen.createScreen({
            metadata: instance,
            cwd: DoNotStarveTogetherPage.executableBinDir,
            screenArgs: [
                `LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu`,
                `'${DoNotStarveTogetherPage.executablePath.replace(/'/g, "'\\''")}'`,
                `-skip_update_server_mods`,
                `-ugc_directory '${instance.gameWorkingDirectoryPath}/ugc_mods'`,
                `-persistent_storage_root '${instance.gameWorkingDirectoryPath}'`,
                `-conf_dir ${instance.name}-${instance.uuid}`,
                `-shard Master`,
            ],
        })

        if (instance.gameEnableCaves) {
            await Screen.createScreen({
                metadata: { ...instance, name: `${instance.name}-caves` },
                cwd: DoNotStarveTogetherPage.executableBinDir,
                screenArgs: [
                    `LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu`,
                    `'${DoNotStarveTogetherPage.executablePath.replace(/'/g, "'\\''")}'`,
                    `-skip_update_server_mods`,
                    `-ugc_directory '${instance.gameWorkingDirectoryPath}/ugc_mods'`,
                    `-persistent_storage_root '${instance.gameWorkingDirectoryPath}'`,
                    `-conf_dir ${instance.name}-${instance.uuid}`,
                    `-shard Caves`,
                ],
            })
        }
    }
}

export default new DoNotStarveTogetherPage()
