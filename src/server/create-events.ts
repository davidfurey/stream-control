import { createLiveBroadcast } from '../youtube'
import { listWeekdays, setYoutubeId } from '../spreadsheet'
import fs from 'fs'

export function createEvents(): void {
  fs.readFile('/home/david/Downloads/SA_mass_welcome.png', function(err, data) {
    if (err) {
      console.log("Error reading thumbnail")
    } else {
      const thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer} = {
        mimeType: "image/jpeg",
        data: data
      }
      listWeekdays().then((weekdays) => {
        weekdays.filter((d) => d.creationState === "Creation overdue").map((d) => {
          console.log(`Creating event for ${d.eventName}`)
          createLiveBroadcast(
            d.eventName,
            d.description,
            thumbnail,
            d.scheduledStartTime,
            "private"
          ).then((youtubeId) => {
            setYoutubeId(d.rowNumber, youtubeId)
          })
        })
      })
    }
  })
}