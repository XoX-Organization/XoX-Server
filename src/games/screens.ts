import minecraftBedrockScreen from "./minecraft-bedrock-screen"
import minecraftJavaScreen from "./minecraft-java-screen"
import terrariaScreen from "./terraria-screen"
import theforestScreen from "./theforest-screen"
import tmodloaderScreen from "./tmodloader-screen"

export default [
    {
        name: "Terraria",
        value: terrariaScreen,
    },
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
    {
        name: "The Forest",
        value: theforestScreen,
    },
]
