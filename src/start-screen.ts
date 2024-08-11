import { select, Separator } from "@inquirer/prompts"
import Screen from "./common/screen"
import screens from "./games/screens"

class StartScreen implements Screen {
    show = async () => {
        while (true) {
            const game: Screen | undefined = await select({
                loop: false,
                message: "Which game would you like to start",
                choices: [
                    new Separator(),
                    ...(screens as { name: string; value: Screen }[]),
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

export default new StartScreen()
