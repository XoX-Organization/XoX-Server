import startScreen from "./start-screen"

process.on("SIGINT", () => {
    process.exit(1)
})

if (process.getuid && process.getuid() === 0) {
    console.error(
        "This program is not meant to be run as root as it may break some of the environment things",
    )
    process.exit(1)
}

const main = async () => {
    try {
        await startScreen.show()
    } catch (error: any) {
        if (process.env.NODE_ENV === "development") {
            throw error
        } else {
            console.error(`An error has occured, ${error.message}`)
            process.exit(1)
        }
    }
}

main()
