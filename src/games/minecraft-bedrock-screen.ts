import { confirm, input } from "@inquirer/prompts"
import axios from "axios"
import * as cheerio from "cheerio"
import { randomUUID } from "crypto"
import fs from "fs"
import { $ } from "zx/core"
import * as Core from "."
import GameScreen from "./game-screen"

interface MinecraftBedrockPersistedSchema extends Core.PersistedSchema {
    game_working_directory_path: string

    // https://minecraft.fandom.com/wiki/Bedrock_Dedicated_Server#Download
    game_server_version: string
}

class MinecraftBedrockPersistedObject extends Core.PersistedObject<MinecraftBedrockPersistedSchema> {
    gameWorkingDirectoryPath = this.raw.game_working_directory_path
    gameServerVersion = this.raw.game_server_version
}

class MinecraftBedrockScreen extends GameScreen<
    MinecraftBedrockPersistedSchema,
    MinecraftBedrockPersistedObject
> {
    protected persistence = new Core.Persistence<
        MinecraftBedrockPersistedSchema,
        MinecraftBedrockPersistedObject
    >("game_minecraft_bedrock", MinecraftBedrockPersistedObject)

    protected updateMetadata = async (
        metadata: Omit<MinecraftBedrockPersistedSchema, "id" | "timestamp">,
    ) => {
        const updateForms = [
            {
                message: "Name (e.g. Minecraft-1.16.5)",
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
                    "Working Directory Path (e.g. /path/to/Minecraft-1.16.5)",
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
                message: [
                    `\u001b]8;;`,
                    `https://minecraft.fandom.com/wiki/Bedrock_Dedicated_Server#Download`,
                    `\u0007`,
                    `Minecraft Bedrock Dedicated Server Version (Leave black for latest, e.g. 1.21.3.01)`,
                    `\u001b]8;;`,
                    `\u0007`,
                ].join(""),
                default:
                    metadata.game_server_version ||
                    (() => this.retrieveVersion()),
                validate: (value: string) => {
                    const versionRegex = /^(?!.*\.0$).+$/
                    return versionRegex.test(value.trim())
                        ? true
                        : "Version cannot be empty or end with .0"
                },
                callback: (value: string) => {
                    metadata.game_server_version = value.trim()
                },
            },
        ]
        for (const form of updateForms) {
            const answer = await input({
                ...form,
                default:
                    typeof form.default === "function"
                        ? await form.default()
                        : form.default,
            })
            form.callback(answer)
        }
        return metadata
    }

    protected createScreen = async () => {
        const metadata: Omit<
            MinecraftBedrockPersistedSchema,
            "id" | "timestamp"
        > = {
            uuid: randomUUID().slice(0, 4),
            name: "",
            game_working_directory_path: "",
            game_server_version: "",
        }
        const updatedMetadata = await this.updateMetadata(metadata)
        await this.persistence.createInstance(updatedMetadata)
    }

    private retrieveVersion = async () => {
        const officialWebsiteUrl =
            "https://www.minecraft.net/en-us/download/server/bedrock"

        const officialWebsite = await axios.get(officialWebsiteUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
            },
        })
        const installerUrl = cheerio
            .load(officialWebsite.data)(
                'a[aria-label="Download Minecraft Dedicated Server software for Ubuntu (Linux)"]',
            )
            .attr("href")

        if (!installerUrl) {
            throw new Error("Failed to retrieve latest installer URL")
        }

        return installerUrl.split("/").pop()!.slice(15, -4)
    }

    private setupInstaller = async (
        metadata: MinecraftBedrockPersistedObject,
    ) => {
        if (
            fs.existsSync(`${metadata.gameWorkingDirectoryPath}/bedrock_server`)
        ) {
            return
        }

        const installerUrl = `https://minecraft.azureedge.net/bin-linux/bedrock-server-${metadata.gameServerVersion}.zip`
        const installerPath = `${metadata.gameWorkingDirectoryPath}/bedrock-server-${metadata.gameServerVersion}.zip`

        if (!fs.existsSync(installerPath)) {
            await Core.downloadFile(installerUrl, installerPath)
        }

        console.log("! Extracting Minecraft Bedrock Dedicated Server installer")
        await $`unzip -o ${installerPath} -d ${metadata.gameWorkingDirectoryPath}`
    }

    protected hostScreen = async (
        instance: MinecraftBedrockPersistedObject,
    ) => {
        await this.setupInstaller(instance)
        await Core.createScreen({
            metadata: instance,
            screenArgs: [
                `cd ${instance.gameWorkingDirectoryPath};`,
                `LD_LIBRARY_PATH=. ./bedrock_server`,
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

export default new MinecraftBedrockScreen()
