import startPage from "./games"

process.on("SIGINT", () => {
    process.exit(1)
})

if (process.env.NODE_ENV !== "development" && process.getuid?.() === 0) {
    console.error(
        "This program is not meant to be run as root as it may break some of the environment things",
    )
    process.exit(1)
}

const main = async () => {
    try {
        await startPage.show()
        process.exit(0)
    } catch (error: any) {
        if (process.env.NODE_ENV === "development") {
            throw error
        } else {
            console.error(`\nX Runtime Exception, ${error.message}\n`)
            process.exit(1)
        }
    }
}

main()
