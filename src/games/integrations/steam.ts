import fs from "fs"
import os from "os"
import { $ } from "zx/core"
import { CarriageReturnWritableStream } from "../../utilities/pipe"

export const steamPath = process.env.STEAM_PATH || "/usr/games/steamcmd"

export const steamGlobalUsername = process.env.STEAM_USERNAME

const _steamHomePath = [
    `${os.homedir()}/.steam/SteamApps/common`,
    `${os.homedir()}/Steam/steamapps/common`,
]

export const steamHomePath = () => {
    return _steamHomePath.find((path) => fs.existsSync(path)) || ""
}

export const steamUpdate = async ({
    steamAppId,
    steamUsername,
    steamAppBetaBranch,
    steamLoginAnonymous = true,
    targetPlatform,
}: {
    steamAppId: string
    steamUsername?: string
    steamAppBetaBranch?: string
    steamLoginAnonymous?: boolean
    targetPlatform?: string
}) => {
    if (!fs.existsSync(steamPath)) {
        throw new Error(
            "SteamCMD not found, refer to `https://developer.valvesoftware.com/wiki/SteamCMD` for installation instructions",
        )
    }
    const chosenSteamUsername =
        steamUsername ||
        steamGlobalUsername ||
        (steamLoginAnonymous ? "anonymous" : "")

    if (!chosenSteamUsername) {
        throw new Error("Steam username not provided")
    }

    const maxRetries = 5

    const command = [
        steamPath,
        `+@sSteamCmdForcePlatformType "${
            targetPlatform ?? os.platform() === "win32" ? "windows" : "linux"
        }"`,
        `+login ${chosenSteamUsername}`,
        `+app_update ${steamAppId}`,
        `${steamAppBetaBranch ? `-beta ${steamAppBetaBranch}` : ``}`,
        `validate`,
        `+quit`,
    ].join(" ")

    console.log(
        `! Updating Steam App ${steamAppId} ${
            steamAppBetaBranch ? `on branch ${steamAppBetaBranch}) ` : ``
        }logged in as ${chosenSteamUsername}`,
    )
    for (let i = 0; i < maxRetries; i++) {
        try {
            await $`${command}`.pipe(new CarriageReturnWritableStream())
            return
        } catch {
            console.error(`X Steam App ${steamAppId} update failed. Retrying`)
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }
    }
    throw new Error(
        `Steam App ${steamAppId} update failed after ${maxRetries} retries under user ${chosenSteamUsername}`,
    )
}
