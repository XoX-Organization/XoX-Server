import startScreen from "./start-screen"

process.on("SIGINT", () => {
    process.exit(1)
})

const main = async () => {
    await startScreen.show()
}

main()
