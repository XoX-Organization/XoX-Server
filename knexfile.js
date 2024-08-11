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
            filename: "./dist/appdata.sqlite3",
        },
    },
    production: {
        ...configs,
        connection: {
            filename: `${process.env.HOME}/.xox-server/appdata.sqlite3`,
        },
    },
}
