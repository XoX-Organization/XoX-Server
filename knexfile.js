module.exports = {
    development: {
        client: "sqlite3",
        connection: {
            filename: "./appdata/game.sqlite3",
        },
        useNullAsDefault: true,
        migrations: {
            directory: "./src/games/migrations",
        },
    },
}
