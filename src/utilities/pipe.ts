import { Writable } from "stream"

export class CarriageReturnWritableStream extends Writable {
    _write(chunk: any, encoding: string, callback: Function) {
        chunk
            .toString()
            .split("\n")
            .forEach((line: string) => {
                const message = line.trim()
                if (message.length <= 0) {
                    return
                }
                process.stdout.write(
                    `\r> ${message.slice(0, process.stdout.columns - 10)}`.padEnd(
                        process.stdout.columns + 1,
                    ),
                )
            })
        callback()
    }
}
