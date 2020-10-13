import { YoutubeClientImpl } from '../youtube'
import fs from 'fs'
import { EventStore } from '../events'
import { ScheduleStore, creationOverdue, okay, Event } from '../schedules'

const youtubeClient = new YoutubeClientImpl()
function returnVoid(): void {
  // return void
}

function eventCreator(
  scheduleStore: ScheduleStore,
  eventStore: EventStore,
  d: Event,
  schedule: string,
  thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer}
): () => Promise<void | undefined> {
  console.log(`Creating event for ${d.eventName} (${schedule})`)
  return (): Promise<void | undefined> => youtubeClient.createLiveBroadcast(
    d.eventName,
    d.description,
    thumbnail,
    d.scheduledStartTime,
    d.streamId,
    "public"
  ).then((youtubeId) => {
    scheduleStore.setYoutubeId(schedule, d.rowNumber, youtubeId)
    if (d.automated) {
      return eventStore.createEvent(
        youtubeId,
        d.streamId,
        d.scheduledStartTime,
        d.eventName,
        d.template
      )
    } else {
      return
    }
  })
}

export function promiseSequence<T>(fns: (() => Promise<T>)[], result: T[] = []): Promise<T[]> {
  if (fns.length === 0) {
    return Promise.resolve(result)
  } else {
    return fns[0]().then((r) => {
      return promiseSequence(fns.slice(1), [...result, r])
    }).catch((e) => {
      console.log(`Recovering from ${e} by skipping`)
      return promiseSequence(fns.slice(1), result)
    })
  }
}

export function createEvents(scheduleStore: ScheduleStore, eventStore: EventStore): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.readFile('/home/user/Documents/general_slides/SA_mass_welcome.png', function(err, data) {
      if (err) {
        console.log("Error reading thumbnail")
        reject("Error reading thumbnail")
      } else {
        const thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer} = {
          mimeType: "image/jpeg",
          data: data
        }
        scheduleStore.getSchedules().then((schedules) =>
          Promise.all(
            schedules.map((schedule) =>
              scheduleStore.listEvents(schedule, creationOverdue).then((events) =>
                events.map((d) =>
                  eventCreator(
                    scheduleStore,
                    eventStore,
                    d,
                    schedule,
                    thumbnail
                  )
                )
              )
            )
          )
        ).then((r) => promiseSequence(r.flat())
        ).then(() => resolve()
        ).catch(reject)
      }
    })
  })
}

// app.get('/spreadsheet/compare', (_req, res) => {
//   listWeekdays().then((result) => {
//     res.header("Access-Control-Allow-Origin", '*')
//     result.filter((r) => r.eventId !== "").map((r) => {
//       liveBroadcast(r.eventId).then((evt) => {
//         console.log("Spreadsheet")
//         if (r.eventName === evt?.title) {
//           console.log("Title matches")
//         }
//         if (r.description === evt?.description) {
//           console.log("Description matches")
//         }
//         if (r.scheduledStartTime.getTime() === evt?.scheduledStartTime) {
//           console.log("Start time matches")
//         }
//         evt
//       })
//     })
//     res.json(result)
//   })
// })

function compare<T>(name: string, a: T, b: T): boolean {
  if (a !== b) {
    console.log(`${name}s do not match`)
    return false
  }
  return true
}

function validateSchedule(event: Event, eventStore: EventStore): Promise<void> {
  const eventId = event.eventId
  if (eventId) {
    return youtubeClient.liveBroadcast(eventId).then((youtubeEvent) => {
      if (!youtubeEvent) {
        console.log("Youtube event not found")
      } else {
        if (!(
          compare("Title", event.eventName, youtubeEvent.title) &&
          compare("Description", event.description, youtubeEvent.description) &&
          compare("Start time", event.scheduledStartTime.getTime(), youtubeEvent.scheduledStartTime)
        )) {
          console.log("Updating youtube event")
          youtubeClient.updateLiveBroadcast(
            eventId,
            event.eventName,
            event.description,
            event.scheduledStartTime
          )
        }
      }
    }).catch(() => {
      console.error("Error fetching event from youtube")
    }).then(() => {
      if (event.automated) {
        return eventStore.getEvent(eventId).then((evt) => {
          if (evt.scheduledStartTime.getTime() !== event.scheduledStartTime.getTime()) {
            console.log("Scheduled start time does not match sheet, updating event sheet")
            return eventStore.setScheduledStartTime(eventId, event.scheduledStartTime).then(
              returnVoid
            )
          } else {
            return
          }
        }).catch(() => {
          console.error(`Could not find sheet for ${event.eventId}`)
          return
        })
      } else {
        return
      }
    })
  } else {
    return Promise.resolve()
  }
}

export function validateEvents(
  scheduleStore: ScheduleStore,
  eventStore: EventStore
): Promise<void> {
  return scheduleStore.getSchedules().then((schedules) => {
    return Promise.all(schedules.map((schedule) => {
      return scheduleStore.listEvents(schedule, okay).then((schedules) => {
        schedules.map((d) => {
          console.log(`Validating event ${d.eventName}`)
          return validateSchedule(d, eventStore)
        })
      })
    }))
  }).then(returnVoid)
}