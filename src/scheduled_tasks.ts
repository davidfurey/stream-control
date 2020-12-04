import schedule from 'node-schedule';
import { send as sendEmail } from './email';
import { createEvents, promiseSequence, validateEvents } from './server/create-events';
import { EventRunner } from './eventrunner';
import { EventStore } from './events';
import { imminentAutomated, ScheduleStore } from './schedules';
import { StatusStore } from './status';
import { overrunEvent, scheduledTaskMissed } from './email-templates/generic';
import { Duration, duration } from 'moment';

const eventRunners: {
  [eventId: string]: EventRunner;
} = {}

interface DataStores {
  events: EventStore;
  schedules: ScheduleStore;
  status: StatusStore;
}

function createAndValidateEvents(stores: DataStores) {
  return (): void => {
    console.log("Checking for events that should be created")
    createEvents(stores.schedules, stores.events).then(() => {
      console.log("Validating upcoming events")
      return validateEvents(stores.schedules, stores.events)
    }).then(() => stores.status.reportValidatedEvents(new Date()))
  }
}


function startIminentEvents(stores: DataStores) {
  return (): void => {
    console.log("Check for iminent events")
    stores.schedules.getSchedules().then((schedules) => {
      return Promise.all(schedules.map((schedule) => {
        return stores.schedules.listEvents(schedule, imminentAutomated).then((events) => {
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
      console.log("Check for concluded events")
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


function checkDuration(name: string, eventTime: Date, duration: Duration): void {
  if ((new Date().getTime() - eventTime.getTime()) > duration.asMilliseconds() * 1.1) {
    console.error(`${name} is overdue`)
    sendEmail(
      "Scheduler error",
      scheduledTaskMissed(name, duration.humanize(), eventTime)
    )
  }
}

function monitoringJob(stores: DataStores) {
  return (): void => {
    stores.status.get().then((status) => {
      console.log("Checking scheduled tasks have run")
      checkDuration("iminent events check", status.lastCheckedForIminentEvents, duration(5, "minutes"))
      checkDuration("cleanup", status.lastCheckedForIminentEvents, duration(1, "day"))
      checkDuration("validate events", status.lastCheckedForIminentEvents, duration(1, "hour"))
    })
    console.log("Checking for over running events")
    Object.values(eventRunners).forEach((eventRunner) => {
      if (eventRunner.running &&
        new Date().getTime() > eventRunner.lastEventTime.getTime()) {
        console.error(`Event ${eventRunner.name} due to finish at ${eventRunner.lastEventTime} still running at ${new Date()}. Stopping now.`)
        sendEmail(
          "Overrunning event",
          overrunEvent(eventRunner)
        )
        eventRunner.stopEvent(true)
      }
    })
    stores.status.reportRanMonitoringTask(new Date())
  }
}

function cleanupSpreadsheet(stores: DataStores) {
  return (): void => {
    console.log("Cleaning up spreadsheet")
    const now = new Date().getTime()
    stores.events.getEvents().then((events) => {
      const requests = events.map((eventId) => {
        return (): Promise<void> => stores.events.getMetadata(eventId).then((metadata) => {
          if ((now - metadata.scheduledStartTime.getTime()) > duration(7, "days").asMilliseconds()) {
            console.log(`Event ${metadata.name} (${eventId}), is older than 7 days, deleting log`)
            return stores.events.deleteEvent(eventId)
          }
          return Promise.resolve()
        })
      })
      promiseSequence(requests)
    })
    stores.status.reportRanCleanupTask(new Date())
  }
}

export function scheduleTasks(stores: DataStores): void {
  console.log("Scheduling regular tasks")
  schedule.scheduleJob('0 * * * *',  createAndValidateEvents(stores))
  schedule.scheduleJob('*/5 * * * *',  startIminentEvents(stores))
  schedule.scheduleJob('*/10 * * * *', monitoringJob(stores))
  schedule.scheduleJob('7 2 * * *', cleanupSpreadsheet(stores))
}
