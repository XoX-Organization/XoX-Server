import { confirm, input, select, Separator } from "@inquirer/prompts"
import fs from "fs"
import os from "os"
import { $ } from "zx/core"
import GamePage from "./game-page"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"
import { PersistedObject, PersistedSchema, Persistence } from "./persistences"

interface TerrariaPersistedSchema extends PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    game_autocreate: 1 | 2 | 3
    game_difficulty?: 0 | 1 | 2 | 3
    game_motd?: string
    game_npcstream?: number
    game_password?: string
    game_port: number
    game_priority?: 0 | 1 | 2 | 3 | 4 | 5
    game_secure?: boolean
    game_seed?: string
    game_upnp?: boolean
}

class TerrariaPersistedObject extends PersistedObject<TerrariaPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameAutocreate = this.raw.game_autocreate
    gameDifficulty = this.raw.game_difficulty
    gameMotd = this.raw.game_motd
    gameNpcstream = this.raw.game_npcstream
    gamePassword = this.raw.game_password
    gamePort = this.raw.game_port
    gamePriority = this.raw.game_priority
    gameSecure = this.raw.game_secure
    gameSeed = this.raw.game_seed
    gameUpnp = this.raw.game_upnp
}

class TerrariaPage extends GamePage<TerrariaPersistedSchema, TerrariaPersistedObject> {
    public static steamAppId = "105600"
    public static executablePath = `${Steam.steamHomePath()}/Terraria/TerrariaServer.bin.x86_64`
    public static savedWorldsPath = `${os.homedir()}/.local/share/Terraria/Worlds`

    protected persistence = new Persistence<TerrariaPersistedSchema, TerrariaPersistedObject>(
        "game_terraria",
        TerrariaPersistedObject,
    )

    protected metadataDefaultSchema: Omit<TerrariaPersistedSchema, "id" | "timestamp" | "uuid"> = {
        name: "",
        steam_app_beta_branch: undefined,
        steam_username: undefined,

        game_autocreate: 1,
        game_difficulty: 0,
        game_motd: undefined,
        game_npcstream: 60,
        game_password: undefined,
        game_port: 7777,
        game_priority: 3,
        game_secure: true,
        game_seed: undefined,
        game_upnp: true,
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
                message: "Game World Name (e.g., 'Victor-World' for an existing world)",
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

        const worldPath = `${TerrariaPage.savedWorldsPath}/${metadata.name}.wld`

        if (!fs.existsSync(worldPath)) {
            console.log(`! No existing world found at ${worldPath}, creating a new one`)
            for (const prompt of [
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

            for (const selectPrompt of [
                {
                    message: "Game World Size",
                    default: metadata.game_autocreate,
                    choices: [
                        {
                            name: "Small",
                            value: 1,
                        },
                        {
                            name: "Medium",
                            value: 2,
                        },
                        {
                            name: "Large",
                            value: 3,
                        },
                    ].map((choice) => ({
                        ...choice,
                        name: `${choice.name} ${choice.value === metadata.game_difficulty ? "(default)" : ""}`,
                    })),
                    callback: (value: number) => {
                        metadata.game_autocreate = (value as 1 | 2 | 3) ?? undefined
                    },
                },
                {
                    message: "Game Difficulty",
                    default: metadata.game_difficulty,
                    choices: [
                        {
                            name: "Normal",
                            value: 0,
                        },
                        {
                            name: "Expert",
                            value: 1,
                        },
                        {
                            name: "Master",
                            value: 2,
                        },
                        {
                            name: "Journey",
                            value: 3,
                        },
                    ].map((choice) => ({
                        ...choice,
                        name: `${choice.name} ${choice.value === metadata.game_difficulty ? "(default)" : ""}`,
                    })),
                    callback: (value: number) => {
                        metadata.game_difficulty = (value as 0 | 1 | 2 | 3) ?? undefined
                    },
                },
            ]) {
                selectPrompt.callback(await select(selectPrompt))
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

    protected promptAdvancedMetadataConfiguration = async (
        metadata: Omit<TerrariaPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const selectPrompt of [
            {
                message: "Game Priority",
                default: metadata.game_priority,
                choices: [
                    {
                        name: "Realtime",
                        value: 0,
                    },
                    {
                        name: "High",
                        value: 1,
                    },
                    {
                        name: "Above Normal",
                        value: 2,
                    },
                    {
                        name: "Normal",
                        value: 3,
                    },
                    {
                        name: "Below Normal",
                        value: 4,
                    },
                    {
                        name: "Idle",
                        value: 5,
                    },
                ].map((choice) => ({
                    ...choice,
                    name: `${choice.name} ${choice.value === metadata.game_priority ? "(chosen)" : ""}`,
                })),
                callback: (value: number) => {
                    metadata.game_priority = (value as 0 | 1 | 2 | 3 | 4 | 5) ?? undefined
                },
            },
        ]) {
            selectPrompt.callback(await select(selectPrompt))
        }

        for (const inputPrompt of [
            {
                message: "Game Password",
                default: metadata.game_password,
                callback: (value: string) => {
                    metadata.game_password = value?.length ? value : undefined
                },
            },
            {
                message: "Game NPC Stream",
                default: metadata.game_npcstream?.toString(),
                validate: (value: string) => {
                    return !isNaN(parseInt(value)) ? true : "Only numbers are allowed"
                },
                callback: (value: string) => {
                    metadata.game_npcstream = parseInt(value) ?? undefined
                },
            },
        ]) {
            inputPrompt.callback(await input(inputPrompt))
        }

        for (const confirmPrompt of [
            {
                message: "Game Secure",
                default: metadata.game_secure,
                callback: (value: boolean) => {
                    metadata.game_secure = value
                },
            },
            {
                message: "Game UPnP",
                default: metadata.game_upnp,
                callback: (value: boolean) => {
                    metadata.game_upnp = value
                },
            },
        ]) {
            confirmPrompt.callback(await confirm(confirmPrompt))
        }
        return metadata
    }

    private promptAdvancedUpdatePage = async (instances: TerrariaPersistedObject[]) => {
        const selected = await select({
            message: "Which instance would you like to update",
            choices: [
                new Separator(),
                ...instances.map((instance) => ({
                    name: `(${instance.uuid}) ${instance.name}`,
                    value: instance.raw,
                })),
                new Separator(),
                {
                    name: "Cancel",
                    value: undefined,
                },
            ],
        })
        if (selected == null) {
            return
        }
        await this.persistence.updateInstance(
            selected.uuid,
            await this.promptAdvancedMetadataConfiguration(selected),
        )
    }

    private freezeConfigs = (instance: TerrariaPersistedObject) => {
        const content = [
            `autocreate=${instance.gameAutocreate}`,
            instance.gameSeed ? `seed=${instance.gameSeed}` : "",
            instance.gameDifficulty ? `difficulty=${instance.gameDifficulty}` : "",
            `port=${instance.gamePort}`,
            instance.gamePassword ? `password=${instance.gamePassword}` : "",
            instance.gameMotd ? `motd=${instance.gameMotd}` : "",
            `secure=${instance.gameSecure ? "1" : "0"}`,
            `language=en-US`,
            `upnp=${instance.gameUpnp ? "1" : "0"}`,
            instance.gameNpcstream ? `npcstream=${instance.gameNpcstream}` : "",
            instance.gamePriority ? `priority=${instance.gamePriority}` : "",
        ].join("\n")

        const configPath = `${TerrariaPage.savedWorldsPath}/${instance.name}.systemgenerated.conf`
        fs.writeFileSync(configPath, content)
        return configPath
    }

    protected performStartupInitialization = async (instance: TerrariaPersistedObject) => {
        await Steam.steamUpdate({
            steamAppId: TerrariaPage.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: false,
            steamUsername: instance.steamUsername,
        })
        await $`chmod +x ${TerrariaPage.executablePath}`
        await $`mkdir -p ${TerrariaPage.savedWorldsPath}`
        const configPath = this.freezeConfigs(instance)
        await Screen.createScreen({
            metadata: instance,
            screenArgs: [
                TerrariaPage.executablePath,
                `-config '${configPath}'`,
                `-world '${TerrariaPage.savedWorldsPath}/${instance.name}.wld'`,
                `-worldname '${instance.name}'`,
                `-maxplayers 16`,
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
                    {
                        name: "Create New Instance",
                        value: -1,
                    },
                    ...(availableInstances.length > 0 ?
                        [
                            {
                                name: "Update Existing Instance",
                                value: -2,
                            },
                            {
                                name: "Advanced Update Options",
                                value: -4,
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
                case -4:
                    await this.promptAdvancedUpdatePage(availableInstances)
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

export default new TerrariaPage()
