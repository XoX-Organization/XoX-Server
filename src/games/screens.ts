import minecraftBedrockScreen from "./minecraft-bedrock-screen"
import minecraftJavaScreen from "./minecraft-java-screen"
import tmodloaderScreen from "./tmodloader-screen"

export default [
    {
        name: "TModLoader (Modded Terraria)",
        value: tmodloaderScreen,
    },
    {
        name: "Minecraft (Java Edition) (Vanilla | Modded)",
        value: minecraftJavaScreen,
    },
    {
        name: "Minecraft (Bedrock Edition)",
        value: minecraftBedrockScreen,
    },
]
