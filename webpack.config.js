const path = require("path")
const webpackNodeExternals = require("webpack-node-externals")

const onEnvironment = (development, production) => {
    return process.env.NODE_ENV === "development" ? development : production
}

module.exports = {
    devtool: onEnvironment("inline-source-map", false),
    entry: {
        main: "./src/index",
    },
    mode: onEnvironment("development", "production"),
    target: "node",
    externals: [webpackNodeExternals()],
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        mainFields: ["main", "module"],
        extensions: [".js", ".json", ".ts"],
        extensionAlias: {
            ".js": [".js", ".ts"],
            ".cjs": [".cjs", ".cts"],
            ".mjs": [".mjs", ".mts"],
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
}
