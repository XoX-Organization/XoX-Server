import { confirm, input } from "@inquirer/prompts"
import axios from "axios"
import * as cheerio from "cheerio"
import fs from "fs"
import { $ } from "zx/core"
import * as Utilities from "../utilities"
import GamePage from "./game-page"
import * as Screen from "./integrations/screen"
import { PersistedObject, PersistedSchema, Persistence } from "./persistences"

interface MinecraftJavaPersistedSchema extends PersistedSchema {
    game_working_directory_path: string

    // The Minecraft Java Edition version
    game_version: string

    // Forge https://files.minecraftforge.net/net/minecraftforge/forge/
    // Fabric https://fabricmc.net/wiki/install
    game_modloader_type: "forge" | "neoforge" | "fabric"
    game_modloader_version: string

    // RAM in unit MB
    game_max_ram: number
    game_min_ram: number

    // 8 for Java 1.8, 16 for Java 16, etc.
    game_java_version: number
}

class MinecraftJavaPersistedObject extends PersistedObject<MinecraftJavaPersistedSchema> {
    gameWorkingDirectoryPath = this.raw.game_working_directory_path
    gameVersion = this.raw.game_version
    gameModloaderType = this.raw.game_modloader_type
    gameModloaderVersion = this.raw.game_modloader_version
    gameMaxRam = this.raw.game_max_ram
    gameMinRam = this.raw.game_min_ram
    gameJavaVersion = this.raw.game_java_version
}

class MinecraftJavaPage extends GamePage<
    MinecraftJavaPersistedSchema,
    MinecraftJavaPersistedObject
> {
    public static minecraftJavaVersionMapping: Record<string, number> = {
        // https://minecraft.fandom.com/wiki/Tutorials/Update_Java#Why_update?
        8: 8,
        9: 8,
        10: 8,
        11: 8,
        12: 8,
        13: 8,
        14: 8,
        15: 8,
        16: 8,
        17: 16,
        18: 17,
        19: 17,
        20: 21, // Supposed to be Java 17
        21: 21,
        22: 21,
        23: 21,
        24: 21,
        25: 21,
        26: 21,
        27: 21,
        28: 21,
        29: 21,
        30: 21,
    }

    protected persistence = new Persistence<
        MinecraftJavaPersistedSchema,
        MinecraftJavaPersistedObject
    >("game_minecraft_java", MinecraftJavaPersistedObject)

    protected metadataDefaultSchema: Omit<
        MinecraftJavaPersistedSchema,
        "id" | "timestamp" | "uuid"
    > = {
        name: "",
        game_working_directory_path: "",
        game_version: "",
        game_modloader_type: "forge",
        game_modloader_version: "",
        game_max_ram: 6144,
        game_min_ram: 6144,
        game_java_version: 0,
    }

    private isVersionExists = async (
        type: "minecraft" | "forge" | "neoforge" | "fabric",
        minecraftVersion: string,
        modloaderVersion?: string,
    ) => {
        try {
            switch (type) {
                case "minecraft":
                    const { status: minecraftStatus } = await axios.head(
                        `https://files.minecraftforge.net/net/minecraftforge/forge/index_${minecraftVersion}.html`,
                    )
                    return minecraftStatus === 200

                case "neoforge":
                    const { status: neoforgeStatus } = await axios.head(
                        `https://maven.neoforged.net/releases/net/neoforged/neoforge/${modloaderVersion}/neoforge-${modloaderVersion}-installer.jar`,
                    )
                    return neoforgeStatus === 200

                case "forge":
                    const { status: forgeStatus } = await axios.head(
                        `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${modloaderVersion}/forge-${minecraftVersion}-${modloaderVersion}-installer.jar`,
                    )
                    return forgeStatus === 203

                case "fabric":
                    const { data: fabricData } = await axios.get(
                        `https://meta.fabricmc.net/v2/versions/loader`,
                    )
                    const fabricVersions = fabricData.map((version: any) => version.version)
                    return fabricVersions.includes(modloaderVersion)

                default:
                    return false
            }
        } catch {
            return false
        }
    }

    private retrieveVersion = async (
        modloaderType: "forge" | "neoforge" | "fabric",
        minecraftVersion: string,
    ) => {
        const forgeHomepage = `https://files.minecraftforge.net/net/minecraftforge/forge/index_${minecraftVersion}.html`
        const neoforgeHomepage = `https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge`
        const fabricHomepage = `https://meta.fabricmc.net/v2/versions/loader`

        switch (modloaderType) {
            case "forge":
                const { data: forgeData } = await axios.get(forgeHomepage)
                const forgeContent = cheerio.load(forgeData)
                const forgeVersion = forgeContent("i.fa.promo-latest")
                    .parent()
                    .find("br + small")
                    .text()
                    .replace(/ /g, "")
                    .split("-")[1]

                if (!forgeVersion) {
                    throw new Error(`Forge version not found for Minecraft ${minecraftVersion}`)
                }
                return forgeVersion

            case "neoforge":
                const { data: neoforgeData } = await axios.get(neoforgeHomepage)
                const neoforgeVersion = (neoforgeData.versions as string[])
                    .filter((version) =>
                        version.startsWith(
                            `${minecraftVersion.split(".")[1]}.${minecraftVersion.split(".")[2] ?? 0}`,
                        ),
                    )
                    .at(-1)
                return neoforgeVersion

            case "fabric":
                const { data: fabricData } = await axios.get(fabricHomepage)
                const fabricStableVersions = fabricData.filter((version: any) => version.stable)
                const fabricVersion = fabricStableVersions.sort((a: any, b: any) => {
                    const aParts = a.version.split(".").map(Number)
                    const bParts = b.version.split(".").map(Number)
                    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                        if ((aParts[i] || 0) > (bParts[i] || 0)) return -1
                        if ((aParts[i] || 0) < (bParts[i] || 0)) return 1
                    }
                    return 0
                })[0].version

                return fabricVersion

            default:
                throw new Error(`Modloader type ${modloaderType} is not supported`)
        }
    }

    protected promptMetadataConfiguration = async (
        metadata: Omit<MinecraftJavaPersistedSchema, "id" | "timestamp" | "uuid">,
    ) => {
        for (const prompt of [
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
            {
                message: "Minecraft Java Edition Version (e.g. 1.16.5)",
                default: metadata.game_version,
                validate: async (value: string) => {
                    return (await this.isVersionExists("minecraft", value)) ?
                            true
                        :   "Version does not exist"
                },
                callback: (value: string) => {
                    if (metadata.game_version !== value.trim()) {
                        metadata.game_modloader_version = ""
                    }
                    metadata.game_version = value.trim()
                },
            },
            {
                message: "Modloader Type (forge/neoforge/fabric)",
                default: metadata.game_modloader_type,
                transformer: (value: string) => {
                    return value.toLowerCase()
                },
                validate: (value: string) => {
                    return value === "forge" || value === "neoforge" || value === "fabric" ?
                            true
                        :   "Type must be one of forge/neoforge/fabric"
                },
                callback: (value: string) => {
                    if (metadata.game_modloader_type !== value.trim()) {
                        metadata.game_modloader_version = ""
                    }
                    metadata.game_modloader_type = value as "forge" | "neoforge" | "fabric"
                },
            },
        ]) {
            prompt.callback(await input(prompt))
        }

        console.log("! Retrieving Modloader Versions, this may take few seconds")

        metadata.game_modloader_version =
            metadata.game_modloader_version ||
            (await this.retrieveVersion(metadata.game_modloader_type, metadata.game_version))

        metadata.game_java_version =
            metadata.game_java_version ||
            MinecraftJavaPage.minecraftJavaVersionMapping[metadata.game_version.split(".")[1]]

        for (const prompt of [
            {
                message: [
                    `\u001b]8;;`,
                    (() => {
                        switch (metadata.game_modloader_type) {
                            case "fabric":
                                return `https://meta.fabricmc.net/v2/versions/loader`
                            case "forge":
                                return `https://files.minecraftforge.net/net/minecraftforge/forge/index_${metadata.game_version}.html`
                            case "neoforge":
                                return `https://projects.neoforged.net/neoforged/neoforge`
                        }
                    })(),
                    `\u0007`,
                    `Modloader Version (Leave empty for latest version, e.g. ${metadata.game_modloader_version})`,
                    `\u001b]8;;`,
                    `\u0007`,
                ].join(""),
                default: metadata.game_modloader_version,
                validate: async (value: string) => {
                    return (
                            (await this.isVersionExists(
                                metadata.game_modloader_type,
                                metadata.game_version,
                                value,
                            ))
                        ) ?
                            true
                        :   "Version does not exist"
                },
                callback: (value: string) => {
                    metadata.game_modloader_version = value
                },
            },
            {
                message: "Min RAM in MB (e.g. 4096)",
                default: metadata.game_min_ram.toString(),
                validate: (value: string) => {
                    return (
                        /^[0-9]+$/.test(value) ?
                            parseInt(value) >= 1000 ?
                                true
                            :   "RAM must be at least 1000 MB"
                        :   "RAM cannot be empty or non-numeric"
                    )
                },
                callback: (value: string) => {
                    metadata.game_min_ram = parseInt(value)
                },
            },
            {
                message: "Max RAM in MB (e.g. 8192)",
                default: metadata.game_max_ram.toString(),
                validate: (value: string) => {
                    return (
                        /^[0-9]+$/.test(value) ?
                            parseInt(value) >= metadata.game_min_ram ?
                                true
                            :   `Max RAM must be greater than the minimum RAM requirement of ${metadata.game_min_ram} MB.`
                        :   "RAM cannot be empty or non-numeric"
                    )
                },
                callback: (value: string) => {
                    metadata.game_max_ram = parseInt(value)
                },
            },
        ]) {
            prompt.callback(await input(prompt))
        }
        return metadata
    }

    private setupModloader = async (metadata: MinecraftJavaPersistedObject) => {
        const forgeLibraryPath = `${metadata.gameWorkingDirectoryPath}/libraries/net/minecraftforge/forge/${metadata.gameVersion}-${metadata.gameModloaderVersion}`
        const forgeJarBaseFilename = `forge-${metadata.gameVersion}-${metadata.gameModloaderVersion}`
        const forgeServerJarPath = `${forgeLibraryPath}/${forgeJarBaseFilename}-server.jar`
        const forgeUniversalJarPath = `${forgeLibraryPath}/${forgeJarBaseFilename}-universal.jar`
        const forgeShimJarPath = `${metadata.gameWorkingDirectoryPath}/${forgeJarBaseFilename}-shim.jar`
        const forgeInstallerJarPath = `${metadata.gameWorkingDirectoryPath}/${forgeJarBaseFilename}-installer.jar`
        const forgeInstallerJarUrl = `http://files.minecraftforge.net/maven/net/minecraftforge/forge/${metadata.gameVersion}-${metadata.gameModloaderVersion}/${forgeJarBaseFilename}-installer.jar`
        const forgeLegacyJarPath = `${metadata.gameWorkingDirectoryPath}/${forgeJarBaseFilename}.jar`

        if (
            metadata.gameModloaderType === "forge" &&
            !(fs.existsSync(forgeUniversalJarPath) && fs.existsSync(forgeServerJarPath))
        ) {
            if (process.env.NODE_ENV === "development") {
                console.debug("& Forge Server Jar Path:", forgeServerJarPath)
                console.debug("& Forge Universal Jar Path:", forgeUniversalJarPath)
                console.debug("& Forge Installer Jar Path:", forgeInstallerJarPath)
                console.debug("& Forge Installer Jar URL:", forgeInstallerJarUrl)
                console.debug("& Forge Legacy Jar Path:", forgeLegacyJarPath)
            }
            if (!fs.existsSync(forgeInstallerJarPath)) {
                console.log("! Downloading Forge Installer Jar")
                await Utilities.download(forgeInstallerJarUrl, forgeInstallerJarPath)
            }
            console.log("! Installing Forge Library")

            const java = this.setupJava(metadata)

            await $({
                cwd: metadata.gameWorkingDirectoryPath,
            })`${java} -jar ${forgeInstallerJarPath} --installServer`.pipe(
                new Utilities.CarriageReturnWritableStream(),
            )
            fs.rmSync(forgeInstallerJarPath)
            fs.rmSync(`${forgeInstallerJarPath}.log`)
        }

        const neoforgeLibraryPath = `${metadata.gameWorkingDirectoryPath}/libraries/net/neoforged/neoforge/${metadata.gameModloaderVersion}`
        const neoforgeJarBaseFilename = `neoforge-${metadata.gameModloaderVersion}`
        const neoforgeServerJarPath = `${neoforgeLibraryPath}/${neoforgeJarBaseFilename}-server.jar`
        const neoforgeUniversalJarPath = `${neoforgeLibraryPath}/${neoforgeJarBaseFilename}-universal.jar`
        const neoforgeInstallerJarUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${metadata.gameModloaderVersion}/neoforge-${metadata.gameModloaderVersion}-installer.jar`
        const neoforgeInstallerJarPath = `${metadata.gameWorkingDirectoryPath}/neoforge-${metadata.gameModloaderVersion}-installer.jar`

        if (
            metadata.gameModloaderType === "neoforge" &&
            !(fs.existsSync(neoforgeUniversalJarPath) && fs.existsSync(neoforgeServerJarPath))
        ) {
            if (process.env.NODE_ENV === "development") {
                console.debug("& NeoForge Server Jar Path:", neoforgeServerJarPath)
                console.debug("& NeoForge Universal Jar Path:", neoforgeUniversalJarPath)
                console.debug("& NeoForge Installer Jar Path:", neoforgeInstallerJarPath)
                console.debug("& NeoForge Installer Jar URL:", neoforgeInstallerJarUrl)
            }
            if (!fs.existsSync(neoforgeInstallerJarPath)) {
                console.log("! Downloading NeoForge Installer Jar")
                await Utilities.download(neoforgeInstallerJarUrl, neoforgeInstallerJarPath)
            }
            console.log("! Installing NeoForge Library")

            const java = this.setupJava(metadata)

            await $({
                cwd: metadata.gameWorkingDirectoryPath,
            })`${java} -jar ${neoforgeInstallerJarPath} --installServer`.pipe(
                new Utilities.CarriageReturnWritableStream(),
            )
            fs.rmSync(neoforgeInstallerJarPath)
            fs.rmSync(`${neoforgeInstallerJarPath}.log`)
        }

        const fabricInstallerVersion = "1.0.0"
        const fabricInstallerJarPath = `${metadata.gameWorkingDirectoryPath}/fabric-server-mc.${metadata.gameVersion}-loader.${metadata.gameModloaderVersion}-launcher.${fabricInstallerVersion}.jar`
        const fabricInstallerJarUrl = `https://meta.fabricmc.net/v2/versions/loader/${metadata.gameVersion}/${metadata.gameModloaderVersion}/${fabricInstallerVersion}/server/jar`

        if (metadata.gameModloaderType === "fabric" && !fs.existsSync(fabricInstallerJarPath)) {
            if (process.env.NODE_ENV === "development") {
                console.debug("& Fabric Installer Jar Path:", fabricInstallerJarPath)
                console.debug("& Fabric Installer Jar URL:", fabricInstallerJarUrl)
            }
            console.log("! Downloading Fabric Installer Jar")
            await Utilities.download(fabricInstallerJarUrl, fabricInstallerJarPath)
        }

        return {
            forgeLibraryPath,
            forgeServerJarPath,
            forgeUniversalJarPath,
            forgeShimJarPath,
            forgeLegacyJarPath,
            neoforgeLibraryPath,
            fabricInstallerJarPath,
        }
    }

    private setupJava = (metadata: MinecraftJavaPersistedObject) => {
        const javaVersion = metadata.gameJavaVersion
        const javaPath = `/usr/lib/jvm/java-${javaVersion}-openjdk-amd64/bin/java`

        if (process.env.NODE_ENV === "development") {
            console.debug("& Java Path:", javaPath)
        }
        if (!fs.existsSync(javaPath)) {
            throw new Error(
                `Java ${javaVersion} not found, please install it with \`sudo apt install openjdk-${javaVersion}-jdk\``,
            )
        }

        return javaPath
    }

    private signEula = async (metadata: MinecraftJavaPersistedObject) => {
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
            message: "Do you agree to the Minecraft EULA (https://aka.ms/MinecraftEULA)",
            default: true,
        })
        if (answer) {
            fs.writeFileSync(eulaPath, eulaText.replace("eula=false", "eula=true"))
            return true
        }
        return false
    }

    protected performStartupInitialization = async (instance: MinecraftJavaPersistedObject) => {
        const {
            forgeLibraryPath,
            forgeLegacyJarPath,
            forgeShimJarPath,
            neoforgeLibraryPath,
            fabricInstallerJarPath,
        } = await this.setupModloader(instance)

        if (!(await this.signEula(instance))) {
            return
        }

        const java = this.setupJava(instance)

        await Screen.createScreen({
            metadata: instance,
            cwd: instance.gameWorkingDirectoryPath,
            screenArgs: [
                ...(() => {
                    switch (instance.gameModloaderType) {
                        case "forge":
                            if (fs.existsSync(forgeShimJarPath)) {
                                return [
                                    java,
                                    `-jar`,
                                    forgeShimJarPath,
                                    `--onlyCheckJava ||`,
                                    `exit 1;`,
                                ]
                            }
                        default:
                            return []
                    }
                })(),

                java,
                `-server`,
                `-Xmx${instance.gameMaxRam}M`,
                `-Xms${instance.gameMinRam}M`,

                ...(() => {
                    switch (instance.gameModloaderType) {
                        case "fabric":
                            return [`-jar`, fabricInstallerJarPath]
                        case "forge":
                            if (fs.existsSync(forgeLegacyJarPath)) {
                                return [`-jar`, forgeLegacyJarPath]
                            }
                            return [
                                `@${instance.gameWorkingDirectoryPath}/user_jvm_args.txt`,
                                `@${forgeLibraryPath}/unix_args.txt`,
                            ]
                        case "neoforge":
                            return [
                                `@${instance.gameWorkingDirectoryPath}/user_jvm_args.txt`,
                                `@${neoforgeLibraryPath}/unix_args.txt`,
                            ]
                    }
                })(),

                `nogui`,
            ],
        })
    }
}

export default new MinecraftJavaPage()
