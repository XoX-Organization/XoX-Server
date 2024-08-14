import { $ } from "zx/core"
import { PersistedObject } from ".."

const nameScreen = <T extends PersistedObject>(metadata: T) => {
    return `${metadata.name}-${metadata.uuid}`
}

export const existsScreen = async <T extends PersistedObject>(metadata: T) => {
    const { stdout } = await $`screen -ls`.catch((reason) => reason)
    return stdout.includes(nameScreen(metadata))
}

export const createScreen = async <T extends PersistedObject>({
    metadata,
    screenArgs,
    cwd,
}: {
    metadata: T
    screenArgs: string[]
    cwd?: string
}) => {
    if (await existsScreen(metadata)) {
        throw new Error(`Screen ${nameScreen(metadata)} already exists, aborting`)
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

export const attachScreen = async <T extends PersistedObject>(metadata: T) => {
    await $`screen -r ${nameScreen(metadata)}`
}
