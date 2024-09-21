import { Writable } from "stream"

export class CarriageReturnWritableStream extends Writable {
    private startTime: number
    private timeoutId?: NodeJS.Timeout

    constructor() {
        super()
        this.startTime = Date.now()
    }

    _write = (chunk?: any, encoding?: string, callback?: Function, ended?: boolean) => {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = undefined
        }
        if (!this.timeoutId && !this.writableFinished && !ended) {
            this.timeoutId = setTimeout(() => this._write(chunk), 100)
        }
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
        ;(chunk ?? "")
            .toString()
            .split("\n")
            .forEach((line: string) => {
                const message = line.trim()
                if (message.length <= 0) {
                    return
                }
                process.stdout.write(`\x1b[90m`)
                process.stdout.write(
                    `\r> [${elapsed}s] ${message.slice(0, process.stdout.columns - 20)}`.padEnd(
                        process.stdout.columns + 1,
                    ),
                )
                process.stdout.write(`\x1b[0m`)
            })
        callback?.()
    }

    end = (chunk?: any, encoding?: any, cb?: any) => {
        this._write(chunk, encoding, cb, true)
        return this
    }
}
