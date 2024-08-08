const path = require("path")
const webpackNodeExternals = require("webpack-node-externals")

module.exports = {
    devtool: "inline-source-map",
    entry: {
        main: "./src/index",
    },
    mode: process.env.NODE_ENV || "development",
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
