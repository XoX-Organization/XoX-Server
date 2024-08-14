import axios from "axios"
import fs from "fs"
import ProgressBar from "progress"

export const download = async (url: string, outputPath: string) => {
    const { data, headers, status } = await axios.get(url, {
        responseType: "stream",
    })

    if (status !== 200) {
        throw new Error(`Failed to download file from ${url}`)
    }

    const totalLength = headers["content-length"]
    const progressBar = new ProgressBar("> [:bar] :percent | ETA: :etas", {
        width: 40,
        complete: "█",
        incomplete: "░",
        renderThrottle: 1,
        total: parseInt(totalLength ?? "0"),
    })

    return new Promise<void>((resolve, reject) => {
        data.on("data", (chunk: any) => (totalLength ? progressBar.tick(chunk.length) : null))
        data.on("end", () => resolve())
        data.on("error", (err: any) => reject(err))
        data.pipe(fs.createWriteStream(outputPath))
    })
}
