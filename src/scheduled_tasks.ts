import schedule from 'node-schedule';
import { send as sendEmail } from './email';
import { createEvents, validateEvents } from './server/create-events';
import { EventRunner } from './eventrunner';
import { EventStore } from './events';
import { ScheduleStore } from './schedules';
import { StatusStore } from './status';

const eventRunners: {
  [eventId: string]: EventRunner;
} = {}

interface DataStores {
  events: EventStore;
  schedules: ScheduleStore;
  status: StatusStore;
}

function hourlyJob(stores: DataStores) {
  return (): void => {
    console.log("Hourly job")
    createEvents(stores.schedules, stores.events).then(() => {
      return validateEvents(stores.schedules, stores.events)
    }).then(() => stores.status.reportValidatedEvents(new Date()))
  }
}


function fiveMinuteJob(stores: DataStores) {
  return (): void => {
    console.log("5 min job")
    stores.schedules.getSchedules().then((schedules) => {
      return Promise.all(schedules.map((schedule) => {
        return stores.schedules.listEvents(
          schedule,
          (evt) =>
            Math.abs(evt.firstEventTime.getTime() - new Date().getTime()) < 600000 &&
            evt.automated
        ).then((events) => {
          events.map((evt) => {
            if (evt.eventId && eventRunners[evt.eventId] === undefined) {
              console.log(`Starting event ${evt.eventId}`)
              eventRunners[evt.eventId] = new EventRunner(
                evt.eventName,
                evt.firstEventTime,
                evt.lastestEndTime,
                stores.events,
                evt.eventId
              )
              eventRunners[evt.eventId].start()
            }
          })
        })
      }))
    }).then(() => {
      Object.values(eventRunners).forEach((eventRunner) => {
        if (!eventRunner.running &&
          (new Date().getTime() - eventRunner.firstEventTime.getTime()) > 630000) {
          console.log(`Cleaning up concluded event ${eventRunner.eventId}`)
          delete eventRunners[eventRunner.eventId]
        }
      })
      stores.status.reportRunningEventsCount(Object.values(eventRunners).length)
      stores.status.reportCheckedForIminentEvents(new Date())
    })
  }
}

function tenMinuteJob(stores: DataStores) {
  return (): void => {
    console.log("10 minute job")
    const now = new Date()
    stores.status.get().then((status) => {
      if ((now.getTime() - status.lastCheckedForIminentEvents.getTime()) > (6 * 60 * 1000)) {
        sendEmail(
          "Scheduler error",
          `Should check for soon to start events every 5 minutes, but last check was at ${status.lastCheckedForIminentEvents}`
        )
      }
      if ((now.getTime() - status.lastRanCleanupTask.getTime()) > (25 * 60 * 60 * 1000)) {
        sendEmail(
          "Scheduler error",
          `Should run cleanup task once a day, but last run was at ${status.lastRanCleanupTask}`
        )
      }
      if ((now.getTime() - status.lastValidatedEvents.getTime()) > (65 * 60 * 1000)) {
        sendEmail(
          "Scheduler error",
          `Should validate events once an hour, but last run was at ${status.lastValidatedEvents}`
        )
      }
    })
    Object.values(eventRunners).forEach((eventRunner) => {
      if (eventRunner.running &&
        new Date().getTime() > eventRunner.lastEventTime.getTime()) {
        console.error(`Event ${eventRunner.name} due to finish at ${eventRunner.lastEventTime} still running at ${new Date()}. Stopping now.`)
        sendEmail(
          "Overrunning event",
          `Event ${eventRunner.name} due to finish at ${eventRunner.lastEventTime} still running at ${new Date()}. Stopping now.`
        )
        eventRunner.stopEvent(true)
      }
    })
    stores.status.reportRanMonitoringTask(new Date())
  }
}

function dailyJob(stores: DataStores) {
  return (): void => {
    console.log("Daily job")
    const now = new Date().getTime()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    stores.events.getEvents().then((events) => {
      events.map((eventId) => {
        stores.events.getMetadata(eventId).then((metadata) => {
          if ((now - metadata.scheduledStartTime.getTime()) > sevenDays) {
            console.log(`Event ${metadata.name} (${eventId}), is older than 6 days, deleting log`)
            //stores.events.deleteEvent(eventId)
          }
        })
      })
    })
    stores.status.reportRanCleanupTask(new Date())
  }
}

export function scheduleTasks(stores: DataStores): void {
  console.log("Scheduling regular tasks")
  schedule.scheduleJob('0 * * * *',  hourlyJob(stores))
  schedule.scheduleJob('*/5 * * * *',  fiveMinuteJob(stores))
  schedule.scheduleJob('*/10 * * * *', tenMinuteJob(stores))
  schedule.scheduleJob('7 2 * * *', dailyJob(stores))
}
