import { confirm, input } from "@inquirer/prompts"
import axios from "axios"
import * as cheerio from "cheerio"
import { randomUUID } from "crypto"
import fs from "fs"
import { $ } from "zx/core"
import * as Core from "."
import GameScreen from "./game-screen"

interface MinecraftPersistedSchema extends Core.PersistedSchema {
    game_working_directory_path: string

    // The Minecraft Java Edition version
    game_version: string

    // Forge https://files.minecraftforge.net/net/minecraftforge/forge/
    // Fabric https://fabricmc.net/wiki/install
    game_modloader_type: "forge" | "fabric"
    game_modloader_version: string

    // RAM in unit MB
    game_max_ram: number
    game_min_ram: number

    // 8 for Java 1.8, 16 for Java 16, etc.
    game_java_version: number
}

class MinecraftPersistedObject extends Core.PersistedObject<MinecraftPersistedSchema> {
    gameWorkingDirectoryPath = this.raw.game_working_directory_path
    gameVersion = this.raw.game_version
    gameModloaderType = this.raw.game_modloader_type
    gameModloaderVersion = this.raw.game_modloader_version
    gameMaxRam = this.raw.game_max_ram
    gameMinRam = this.raw.game_min_ram
    gameJavaVersion = this.raw.game_java_version
}

class MinecraftScreen extends GameScreen<
    MinecraftPersistedSchema,
    MinecraftPersistedObject
> {
    protected persistence = new Core.Persistence<
        MinecraftPersistedSchema,
        MinecraftPersistedObject
    >("game_minecraft_java", MinecraftPersistedObject)

    protected updateMetadata = async (
        metadata: Omit<MinecraftPersistedSchema, "id" | "timestamp">,
    ) => {
        const updateForms = [
            {
                message: "Name (e.g. All-The-Mods-6-3.4.5)",
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
                message: "Working Directory Path (e.g. /path/to/ATM6-3.4.5)",
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
                message: "Minecraft Java Edition Version (e.g. 1.16.5)",
                default: metadata.game_version,
                validate: (value: string) => {
                    const versionRegex = /^(?!.*\.0$).+$/
                    return versionRegex.test(value.trim())
                        ? true
                        : "Version cannot be empty or end with .0"
                },
                callback: (value: string) => {
                    metadata.game_version = value.trim()
                },
            },
            {
                message: "Modloader Type (forge or fabric)",
                default: metadata.game_modloader_type,
                transformer: (value: string) => {
                    return value.toLowerCase()
                },
                validate: (value: string) => {
                    return value === "forge" || value === "fabric"
                        ? true
                        : "Type must be forge or fabric"
                },
                callback: (value: string) => {
                    metadata.game_modloader_type = value as "forge" | "fabric"
                },
            },
            {
                message:
                    "Modloader Version (Leave empty for latest version, e.g. 36.1.0)",
                default:
                    metadata.game_modloader_version ||
                    (() =>
                        this.retrieveVersion(
                            metadata.game_modloader_type,
                            metadata.game_version,
                        )),
                validate: (value: string) => {
                    return value.length > 0 ? true : "Version cannot be empty"
                },
                callback: (value: string) => {
                    metadata.game_modloader_version = value
                },
            },
            {
                message: "Max RAM in MB (e.g. 8192)",
                default: metadata.game_max_ram.toString(),
                validate: (value: string) => {
                    return /^[0-9]+$/.test(value)
                        ? true
                        : "RAM cannot be empty or non-numeric"
                },
                callback: (value: string) => {
                    metadata.game_max_ram = parseInt(value)
                },
            },
            {
                message: "Min RAM in MB (e.g. 4096)",
                default: metadata.game_min_ram.toString(),
                validate: (value: string) => {
                    return /^[0-9]+$/.test(value)
                        ? true
                        : "RAM cannot be empty or non-numeric"
                },
                callback: (value: string) => {
                    metadata.game_min_ram = parseInt(value)
                },
            },
            {
                message:
                    "Java Version (e.g. 8 for Minecraft 1.12.X, 16 for 1.17.X, 21 for 1.18.X onwards)",
                default: metadata.game_java_version.toString(),
                validate: (value: string) => {
                    return /^[1-9]+$/.test(value)
                        ? true
                        : "Version cannot be empty or non-numeric"
                },
                callback: (value: string) => {
                    metadata.game_java_version = parseInt(value)
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
        const metadata: Omit<MinecraftPersistedSchema, "id" | "timestamp"> = {
            uuid: randomUUID().slice(0, 4),
            name: "",
            game_working_directory_path: "",
            game_version: "",
            game_modloader_type: "forge",
            game_modloader_version: "",
            game_max_ram: 6144,
            game_min_ram: 6144,
            game_java_version: 0,
        }
        const updatedMetadata = await this.updateMetadata(metadata)
        await this.persistence.createInstance(updatedMetadata)
    }

    private retrieveVersion = async (
        type: "forge" | "fabric",
        minecraftVersion: string,
    ) => {
        const forgeHomepage = `https://files.minecraftforge.net/net/minecraftforge/forge/index_${minecraftVersion}.html`
        const fabricHomepage = `https://meta.fabricmc.net/v2/versions/loader`

        switch (type) {
            case "forge":
                const { data: forgeData } = await axios.get(forgeHomepage)
                const content = cheerio.load(forgeData)
                const forgeVersion = content("i.fa.promo-latest")
                    .parent()
                    .find("br + small")
                    .text()
                    .replace(/ /g, "")
                    .split("-")[1]

                if (!forgeVersion) {
                    throw new Error(
                        `Forge version not found for Minecraft ${minecraftVersion}`,
                    )
                }
                return forgeVersion

            case "fabric":
                const { data: fabricData } = await axios.get(fabricHomepage)
                const stableVersions = fabricData.filter(
                    (version: any) => version.stable,
                )
                const fabricVersion = stableVersions.sort((a: any, b: any) => {
                    const aParts = a.version.split(".").map(Number)
                    const bParts = b.version.split(".").map(Number)
                    for (
                        let i = 0;
                        i < Math.max(aParts.length, bParts.length);
                        i++
                    ) {
                        if ((aParts[i] || 0) > (bParts[i] || 0)) return -1
                        if ((aParts[i] || 0) < (bParts[i] || 0)) return 1
                    }
                    return 0
                })[0].version

                return fabricVersion

            default:
                throw new Error("Invalid modloader type")
        }
    }

    private setupModloader = async (metadata: MinecraftPersistedObject) => {
        const forgeLibraryPath = `${metadata.gameWorkingDirectoryPath}/libraries/net/minecraftforge/forge/${metadata.gameVersion}-${metadata.gameModloaderVersion}`
        const forgeJarBaseFilename = `forge-${metadata.gameVersion}-${metadata.gameModloaderVersion}`
        const forgeServerJarPath = `${forgeLibraryPath}/${forgeJarBaseFilename}-server.jar`
        const forgeUniversalJarPath = `${forgeLibraryPath}/${forgeJarBaseFilename}-universal.jar`
        const forgeShimJarPath = `${metadata.gameWorkingDirectoryPath}/${forgeJarBaseFilename}-shim.jar`
        const forgeInstallerJarPath = `${metadata.gameWorkingDirectoryPath}/${forgeJarBaseFilename}-installer.jar`
        const forgeInstallerJarUrl = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${metadata.gameVersion}-${metadata.gameModloaderVersion}/${forgeJarBaseFilename}-installer.jar`
        const forgeLegacyJarPath = `${metadata.gameWorkingDirectoryPath}/${forgeJarBaseFilename}.jar`

        const fabricInstallerVersion = "1.0.0"
        const fabricInstallerJarPath = `${metadata.gameWorkingDirectoryPath}/fabric-server-mc.${metadata.gameVersion}-loader.${metadata.gameModloaderVersion}-launcher.${fabricInstallerVersion}.jar`
        const fabricInstallerJarUrl = `https://meta.fabricmc.net/v2/versions/loader/${metadata.gameVersion}/${metadata.gameModloaderVersion}/${fabricInstallerVersion}/server/jar`

        if (
            metadata.gameModloaderType === "forge" &&
            !(
                fs.existsSync(forgeUniversalJarPath) &&
                fs.existsSync(forgeServerJarPath)
            )
        ) {
            if (process.env.NODE_ENV === "development") {
                console.log("Forge Server Jar Path:", forgeServerJarPath)
                console.log("Forge Universal Jar Path:", forgeUniversalJarPath)
                console.log("Forge Installer Jar Path:", forgeInstallerJarPath)
                console.log("Forge Installer Jar URL:", forgeInstallerJarUrl)
                console.log("Forge Legacy Jar Path:", forgeLegacyJarPath)
            }

            if (!fs.existsSync(forgeInstallerJarPath)) {
                console.log("Downloading Forge Installer Jar")
                await Core.downloadFile(
                    forgeInstallerJarUrl,
                    forgeInstallerJarPath,
                )
            }

            console.log("Installing Forge Library")
            await $({
                cwd: metadata.gameWorkingDirectoryPath,
            })`java -jar ${forgeInstallerJarPath} --installServer`.pipe(
                new Core.WritableStream(),
            )
            console.log("Removing Forge Installer Jar")
            fs.rmSync(forgeInstallerJarPath)
        }

        if (
            metadata.gameModloaderType === "fabric" &&
            !fs.existsSync(fabricInstallerJarPath)
        ) {
            if (process.env.NODE_ENV === "development") {
                console.log(
                    "Fabric Installer Jar Path:",
                    fabricInstallerJarPath,
                )
                console.log("Fabric Installer Jar URL:", fabricInstallerJarUrl)
            }

            console.log("Downloading Fabric Installer Jar")
            await Core.downloadFile(
                fabricInstallerJarUrl,
                fabricInstallerJarPath,
            )
        }

        return {
            forgeLibraryPath,
            forgeServerJarPath,
            forgeUniversalJarPath,
            forgeShimJarPath,
            forgeLegacyJarPath,
            fabricInstallerJarPath,
        }
    }

    private setupJava = (metadata: MinecraftPersistedObject) => {
        const javaVersion = metadata.gameJavaVersion
        const javaPath = `/usr/lib/jvm/java-${javaVersion}-openjdk-amd64/bin/java`

        if (process.env.NODE_ENV === "development") {
            console.log("Java Path:", javaPath)
        }
        if (!fs.existsSync(javaPath)) {
            throw new Error(
                `Java ${javaVersion} not found, please install it with \`sudo apt install openjdk-${javaVersion}-jdk\``,
            )
        }

        return javaPath
    }

    private signEula = async (metadata: MinecraftPersistedObject) => {
        const eulaPath = `${metadata.gameWorkingDirectoryPath}/eula.txt`
        const eulaText = [
            `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).`,
            `#${Date().toString()}`,
            `eula=false`,
        ].join("\n")

        if (!fs.existsSync(eulaPath)) {
            fs.writeFileSync(eulaPath, eulaText)
        }
        if (fs.readFileSync(eulaPath, "utf-8").includes("eula=true")) {
            return true
        }
        const answer = await confirm({
            message:
                "Do you agree to the Minecraft EULA (https://aka.ms/MinecraftEULA)",
            default: true,
        })
        if (answer) {
            fs.writeFileSync(
                eulaPath,
                eulaText.replace("eula=false", "eula=true"),
            )
            return true
        }
        return false
    }

    protected hostScreen = async (instance: MinecraftPersistedObject) => {
        const {
            forgeLibraryPath,
            forgeLegacyJarPath,
            forgeShimJarPath,
            fabricInstallerJarPath,
        } = await this.setupModloader(instance)

        if (!(await this.signEula(instance))) {
            return
        }

        const java = this.setupJava(instance)

        await Core.createScreen({
            metadata: instance,
            screenArgs: [
                `cd ${instance.gameWorkingDirectoryPath};`,
                ...(instance.gameModloaderType === "forge" &&
                fs.existsSync(forgeShimJarPath)
                    ? [
                          java,
                          `-jar`,
                          forgeShimJarPath,
                          `--onlyCheckJava ||`,
                          `exit 1;`,
                      ]
                    : []),
                java,
                `-server`,
                `-Xmx${instance.gameMaxRam}M`,
                `-Xms${instance.gameMinRam}M`,
                ...(instance.gameModloaderType === "fabric" ||
                (instance.gameModloaderType === "forge" &&
                    fs.existsSync(forgeLegacyJarPath))
                    ? [
                          `-jar`,
                          instance.gameModloaderType === "forge"
                              ? forgeLegacyJarPath
                              : fabricInstallerJarPath,
                      ]
                    : [
                          `@${instance.gameWorkingDirectoryPath}/user_jvm_args.txt`,
                          `@${forgeLibraryPath}/unix_args.txt`,
                      ]),
                `nogui`,
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

export default new MinecraftScreen()
