const configs = {
    client: "sqlite3",
    useNullAsDefault: true,
    migrations: {
        directory: "./src/games/migrations",
    },
}

module.exports = {
    development: {
        ...configs,
        connection: {
            filename: "./dist/game.sqlite3",
        },
    },
    production: {
        ...configs,
        connection: {
            filename: `${process.env.HOME}/.local/share/xox-server/game.sqlite3`,
        },
    },
}
