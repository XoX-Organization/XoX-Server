import { select, Separator } from "@inquirer/prompts"
import Screen from "./common/screen"
import screens from "./games/screens"

class StartScreen implements Screen {
    show = async () => {
        const game: Screen | undefined = await select({
            message: "Which game would you like to start",
            choices: [
                new Separator(),
                ...screens,
                new Separator(),
                {
                    name: "Quit",
                    value: undefined,
                },
            ],
        })
        if (game) {
            await game.show()
        }
        return
    }
}

export default new StartScreen()
