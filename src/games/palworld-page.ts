import { confirm, input, select, Separator } from "@inquirer/prompts"
import { $, fs } from "zx"
import GamePage from "./game-page"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"
import { PersistedObject, PersistedSchema, Persistence } from "./persistences"

interface PalworldPersistedSchema extends PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string
}

class PalworldPersistedObject extends PersistedObject<PalworldPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username
}

class PalworldPage extends GamePage<PalworldPersistedSchema, PalworldPersistedObject> {
    public static steamAppId = "2394010"
    public static executableParentDir = `${Steam.steamHomePath()}/PalServer`
    public static executablePath = `${PalworldPage.executableParentDir}/PalServer.sh`

    protected persistence = new Persistence<PalworldPersistedSchema, PalworldPersistedObject>(
        "game_palworld",
        PalworldPersistedObject,
    )

    protected metadataDefaultSchema: Omit<PalworldPersistedSchema, "id" | "timestamp" | "uuid"> = {
        name: "",
        steam_app_beta_branch: undefined,
        steam_username: undefined,
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<PalworldPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
            {
                message: "Name (e.g. Palworld-Server)",
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

    protected performStartupInitialization = async (instance: PalworldPersistedObject) => {
        await Steam.steamUpdate({
            steamAppId: PalworldPage.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: true,
            steamUsername: instance.steamUsername,
        })
        const configParentDir = `${PalworldPage.executableParentDir}/Pal/Saved/Config/LinuxServer`
        const configPath = `${configParentDir}/PalWorldSettings.ini`
        await $`mkdir -p ${configParentDir}`
        if (fs.existsSync(configPath) && fs.readFileSync(configPath, "utf-8").trim().length <= 0) {
            fs.unlinkSync(configPath)
        }
        await $`cp -n ${PalworldPage.executableParentDir}/DefaultPalWorldSettings.ini ${PalworldPage.executableParentDir}/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini`
        if (
            await confirm({
                message: "Do you want to edit the configuration file?",
                default: false,
            })
        ) {
            await $`screen nano ${configPath}`
        }
        await Screen.createScreen({
            metadata: instance,
            cwd: PalworldPage.executableParentDir,
            screenArgs: [
                `'${PalworldPage.executablePath}'`,
                `-publiclobby`,
                `-NumberOfWorkerThreadsServer=4`,
                `-useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS`,
            ],
        })
    }

    public show = async () => {
        while (true) {
            const availableInstances = await this.persistence.findAllInstances()
            const selectInstance = await select({
                loop: false,
                message:
                    availableInstances.length > 0 ?
                        "Which instance would you like to play with"
                    :   "No instance found, what would you like to do",
                choices: [
                    ...(availableInstances.length > 0 ?
                        [
                            new Separator(),
                            ...availableInstances.map((instance, index) => ({
                                name: `(${instance.uuid}) ${instance.name}`,
                                value: index,
                            })),
                            new Separator(),
                        ]
                    :   []),
                    ...(availableInstances.length <= 0 ?
                        [
                            {
                                name: "Create New Instance",
                                value: -1,
                            },
                        ]
                    :   []),
                    ...(availableInstances.length > 0 ?
                        [
                            {
                                name: "Update Existing Instance",
                                value: -2,
                            },
                            {
                                name: "Delete Instance",
                                value: -3,
                            },
                        ]
                    :   []),
                    {
                        name: "Cancel",
                        value: undefined,
                    },
                ],
            })
            if (selectInstance == null) {
                return
            }
            switch (selectInstance) {
                case -1:
                    await this.promptCreatePage()
                    break
                case -2:
                    await this.promptUpdatePage(availableInstances)
                    break
                case -3:
                    await this.promptDeletePage(availableInstances)
                    break
                default:
                    await this.performStartupInitialization(availableInstances[selectInstance])
                    if (await Screen.existsScreen(availableInstances[selectInstance])) {
                        const attachToScreen = await confirm({
                            message: "Do you want to attach the screen to the terminal",
                            default: true,
                        })
                        if (attachToScreen) {
                            await Screen.attachScreen(availableInstances[selectInstance])
                        }
                    }
                    break
            }
            continue
        }
    }
}

export default new PalworldPage()
