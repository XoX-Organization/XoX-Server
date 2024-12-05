import { $ } from "zx/core"
import { PersistedObject } from "../persistences"

const nameScreen = <T extends PersistedObject>(metadata: T | string) => {
    return typeof metadata === "string" ? metadata : `${metadata.name}-${metadata.uuid}`
}

export const existsScreen = async <T extends PersistedObject>(metadata: T | string) => {
    const { stdout } = await $`screen -ls`.catch((reason) => reason)
    return stdout.includes(typeof metadata === "string" ? metadata : nameScreen(metadata))
}

export const createScreen = async <T extends PersistedObject>({
    metadata,
    screenArgs,
    cwd,
}: {
    metadata: T | string
    screenArgs: string[]
    cwd?: string
}) => {
    if (await existsScreen(metadata)) {
        throw new Error(`Screen ${nameScreen(metadata)} already exists, aborting`)
    }
    if (screenArgs.some((arg) => arg.match(/"/))) {
        throw new Error(`Screen arguments contain illegal double quotes`)
    }
    const command = [
        cwd ? `cd "${cwd}";` : ``,
        `screen`,
        `-dm`,
        `-S ${nameScreen(metadata)}`,
        `bash -c`,
        `"${screenArgs.join(" ")};`,
        `echo -e '\n\nScreen session has been closed. Press Enter to exit.';`,
        `read -p '';`,
        `exit 0"`,
    ].join(" ")

    if (process.env.NODE_ENV === "development") {
        console.debug(`& Creating screen ${nameScreen(metadata)} with command:\n\n${command}\n\n`)
    }
    await $`${command}`
}

export const attachScreen = async <T extends PersistedObject>(metadata: T | string) => {
    await $`screen -r ${typeof metadata === "string" ? metadata : nameScreen(metadata)}`
}
