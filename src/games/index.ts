import { select, Separator } from "@inquirer/prompts"
import { $ } from "zx/core"
import Page from "../common/page"
import minecraftBedrockPage from "./minecraft-bedrock-page"
import minecraftJavaPage from "./minecraft-java-page"
import terrariaPage from "./terraria-page"
import theforestPage from "./theforest-page"
import tmodloaderPage from "./tmodloader-page"
import valheimPage from "./valheim-page"
import doNotStarveTogetherPage from "./do-not-starve-together-page"

$.quote = (str: string) => str
$.quiet = true

export const verifyRequiredPackages = async (packages: string[]) => {
    await Promise.all(
        packages.map((name) =>
            $`command -v ${name}`.catch(() => {
                throw new Error(`Package ${name} not found`)
            }),
        ),
    )
}

class StartPage implements Page {
    show = async () => {
        while (true) {
            const game: Page | undefined = await select({
                loop: false,
                message: "Which game would you like to start",
                choices: [
                    new Separator(),
                    ...([
                        {
                            name: "Terraria",
                            value: terrariaPage,
                        },
                        {
                            name: "TModLoader (Modded Terraria)",
                            value: tmodloaderPage,
                        },
                        {
                            name: "Minecraft (Java Edition) (Vanilla | Modded)",
                            value: minecraftJavaPage,
                        },
                        {
                            name: "Minecraft (Bedrock Edition)",
                            value: minecraftBedrockPage,
                        },
                        {
                            name: "Don't Starve Together",
                            value: doNotStarveTogetherPage,
                        },
                        {
                            name: "The Forest",
                            value: theforestPage,
                        },
                        {
                            name: "Valheim",
                            value: valheimPage,
                        },
                    ] as { name: string; value: Page }[]),
                    new Separator(),
                    {
                        name: "Quit",
                        value: undefined,
                    },
                ],
            })
            if (game) {
                await game.show()
                continue
            }
            return
        }
    }
}

export default new StartPage()
