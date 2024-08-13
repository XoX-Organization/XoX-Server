import { confirm, input } from "@inquirer/prompts"
import fs from "fs"
import path from "path"
import * as Core from "."
import GameScreen from "./game-screen"
import * as Screen from "./integrations/screen"
import * as Steam from "./integrations/steam"

interface TheForestPersistedSchema extends Core.PersistedSchema {
    steam_app_beta_branch?: string
    steam_username?: string

    // https://steamcommunity.com/sharedfiles/filedetails/?id=907906289
    game_working_directory_path: string

    game_difficulty: "Peaceful" | "Normal" | "Hard"
    game_vegan_mode?: boolean
    game_vegetarian_mode?: boolean
    game_reset_holes_mode?: boolean
    game_tree_regrow_mode?: boolean
    game_no_building_destruction?: boolean
    game_allow_enemies_creative?: boolean
    game_allow_cheats?: boolean
    game_realistic_player_damage?: boolean
}

class TheForestPersistedObject extends Core.PersistedObject<TheForestPersistedSchema> {
    steamAppBetaBranch = this.raw.steam_app_beta_branch
    steamUsername = this.raw.steam_username

    gameWorkingDirectoryPath = this.raw.game_working_directory_path

    gameDifficulty = this.raw.game_difficulty
    gameVeganMode = this.raw.game_vegan_mode
    gameVegetarianMode = this.raw.game_vegetarian_mode
    gameResetHolesMode = this.raw.game_reset_holes_mode
    gameTreeRegrowMode = this.raw.game_tree_regrow_mode
    gameNoBuildingDestruction = this.raw.game_no_building_destruction
    gameAllowEnemiesCreative = this.raw.game_allow_enemies_creative
    gameAllowCheats = this.raw.game_allow_cheats
    gameRealisticPlayerDamage = this.raw.game_realistic_player_damage
}

class TheForestScreen extends GameScreen<
    TheForestPersistedSchema,
    TheForestPersistedObject
> {
    public static steamAppId = "556450"
    public static executableParentDir = `${Steam.steamHomePath()}/TheForestDedicatedServer`
    public static executablePath = `${this.executableParentDir}/TheForestDedicatedServer.exe`

    protected persistence = new Core.Persistence<
        TheForestPersistedSchema,
        TheForestPersistedObject
    >("game_theforest", TheForestPersistedObject)

    protected metadataDefaultSchema: Omit<
        TheForestPersistedSchema,
        "id" | "timestamp" | "uuid"
    > = {
        name: "",
        steam_app_beta_branch: undefined,
        steam_username: undefined,

        game_working_directory_path: "",

        game_difficulty: "Normal",
        game_vegan_mode: undefined,
        game_vegetarian_mode: undefined,
        game_reset_holes_mode: undefined,
        game_tree_regrow_mode: undefined,
        game_no_building_destruction: undefined,
        game_allow_enemies_creative: undefined,
        game_allow_cheats: undefined,
        game_realistic_player_damage: undefined,
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<TheForestPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
            {
                message: "Name (e.g. TheForest)",
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
                callback: (value: string) =>
                    (metadata.steam_app_beta_branch = value || undefined),
            },
            // {
            //     message: "Steam Username (Leave empty for default)",
            //     default: metadata.steam_username,
            //     callback: (value: string) =>
            //         (metadata.steam_username = value || undefined),
            // },
            {
                message: "Working Directory Path (e.g. /path/to/theforest)",
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
                message: "Game Difficulty (Peaceful / Normal / Hard)",
                default: metadata.game_difficulty,
                validate: (value: string) => {
                    return ["Peaceful", "Normal", "Hard"].includes(value)
                        ? true
                        : "Invalid difficulty"
                },
                callback: (value: string) => {
                    metadata.game_difficulty = value as
                        | "Peaceful"
                        | "Normal"
                        | "Hard"
                },
            },
        ]) {
            prompt.callback(await input(prompt))
        }

        for (const prompt of [
            {
                message: "Game Vegan Mode (no enemies)",
                default: metadata.game_vegan_mode ?? false,
                callback: (value: boolean) => {
                    metadata.game_vegan_mode = value
                },
            },
            {
                message: "Game Vegetarian Mode (no enemies during daytime)",
                default: metadata.game_vegetarian_mode ?? false,
                callback: (value: boolean) => {
                    metadata.game_vegetarian_mode = value
                },
            },
            {
                message:
                    "Game Reset Holes Mode (reset all existing floor holes when loading a save)",
                default: metadata.game_reset_holes_mode ?? false,
                callback: (value: boolean) => {
                    metadata.game_reset_holes_mode = value
                },
            },
            {
                message: "Game Tree Regrow Mode (tree regrowth when sleeping)",
                default: metadata.game_tree_regrow_mode ?? false,
                callback: (value: boolean) => {
                    metadata.game_tree_regrow_mode = value
                },
            },
            {
                message:
                    "Game No Building Destruction (enemies and players cannot destroy buildings)",
                default: metadata.game_no_building_destruction ?? false,
                callback: (value: boolean) => {
                    metadata.game_no_building_destruction = value
                },
            },
            {
                message:
                    "Game Allow Enemies Creative (enemy spawn in creative games)",
                default: metadata.game_allow_enemies_creative ?? false,
                callback: (value: boolean) => {
                    metadata.game_allow_enemies_creative = value
                },
            },
            {
                message: "Game Allow Cheats (built in development console)",
                default: metadata.game_allow_cheats ?? false,
                callback: (value: boolean) => {
                    metadata.game_allow_cheats = value
                },
            },
            {
                message: "Game Realistic Player Damage",
                default: metadata.game_realistic_player_damage ?? false,
                callback: (value: boolean) => {
                    metadata.game_realistic_player_damage = value
                },
            },
        ]) {
            prompt.callback(await confirm(prompt))
        }
        return metadata
    }

    private generateConfigs = (instance: TheForestPersistedObject) => {
        const configPath = path.resolve(
            path.join(instance.gameWorkingDirectoryPath, "autogenerated.cfg"),
        )
        if (fs.existsSync(configPath)) {
            fs.rmSync(configPath)
        }
        const configContent = [
            `serverIP 0.0.0.0`,
            `serverSteamPort 8766`,
            `serverGamePort 27015`,
            `serverQueryPort 27016`,
            `serverName ${instance.name}`,
            `serverPlayers 16`,
            `serverPassword`,
            `serverPasswordAdmin`,
            `serverSteamAccount`,
            `enableVAC off`,
            `serverAutoSaveInterval 15`,
            `difficulty ${instance.gameDifficulty}`,
            `initType Continue`,
            `slot 1`,
            `showLogs off`,
            `serverContact`,
            `veganMode ${instance.gameVeganMode ? "on" : "off"}`,
            `vegetarianMode ${instance.gameVegetarianMode ? "on" : "off"}`,
            `resetHolesMode ${instance.gameResetHolesMode ? "on" : "off"}`,
            `treeRegrowMode ${instance.gameTreeRegrowMode ? "on" : "off"}`,
            `allowBuildingDestruction ${
                instance.gameNoBuildingDestruction ? "off" : "on"
            }`,
            `allowEnemiesCreativeMode ${
                instance.gameAllowEnemiesCreative ? "on" : "off"
            }`,
            `allowCheats ${instance.gameAllowCheats ? "on" : "off"}`,
            `realisticPlayerDamage ${
                instance.gameRealisticPlayerDamage ? "on" : "off"
            }`,
            `saveFolderPath '${instance.gameWorkingDirectoryPath}'`,
            `targetFpsIdle 5`,
            `targetFpsActive 60`,
        ]

        fs.writeFileSync(configPath, configContent.join("\n"))
        return configPath
    }

    protected performStartupInitialization = async (
        instance: TheForestPersistedObject,
    ) => {
        await Core.verifyRequiredPackages(["wine", "xvfb-run"])
        await Steam.steamUpdate({
            steamAppId: TheForestScreen.steamAppId,
            steamAppBetaBranch: instance.steamAppBetaBranch,
            steamLoginAnonymous: true,
            steamUsername: instance.steamUsername,
            targetPlatform: "windows",
        })
        const configPath = this.generateConfigs(instance)
        await Screen.createScreen({
            metadata: instance,
            cwd: TheForestScreen.executableParentDir,
            screenArgs: [
                `xvfb-run --auto-servernum --server-args='-screen 0 640x480x24:32'`,
                `wine ${TheForestScreen.executablePath}`,
                `-batchmode`,
                `-nographics`,
                `-configfilepath '${configPath}'`,
            ],
        })
    }
}

export default new TheForestScreen()
