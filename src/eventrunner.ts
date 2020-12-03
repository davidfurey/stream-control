import { EventStore, RunningEvent, Step } from "./events"
import { process as processCommand, stopYoutubeLiveBroadcast } from './command_processor';
import { send as sendEmail } from './email'

export class EventRunner {
  name: string
  store: EventStore
  eventId: string
  event: RunningEvent
  running: boolean
  firstEventTime: Date
  lastEventTime: Date
  timeouts: {
    [stepId: string]: NodeJS.Timeout;
  } = {}

  constructor(
    name: string,
    firstEventTime: Date,
    lastEventTime: Date,
    store: EventStore,
    eventId: string,
  ) {
    this.name = name
    this.store = store
    this.eventId = eventId
    this.running = false
    this.firstEventTime = firstEventTime
    this.lastEventTime = lastEventTime
  }

  private triggerTime(
    event: RunningEvent,
    step: Step,
    previous?: Step
  ): number | undefined {
    if (step.referenceTime === "Scheduled Start Time") {
      return event.scheduledStartTime.getTime() + step.offset.asMilliseconds()
    } else if (
      step.referenceTime === "Relative" &&
      previous &&
      previous.endState === "Success" &&
      previous.endTime) {
      return previous.endTime.getTime() + step.offset.asMilliseconds()
    } else {
      return undefined
    }
  }

  private scheduleEventSteps(event: RunningEvent): void {
    return event.steps.forEach((step, index, all) => {
      const stepTriggerTime = this.triggerTime(event, step, all[index - 1])
      if (step.startTime === undefined && stepTriggerTime && !this.timeouts[step.id]) {
        const delay = stepTriggerTime - new Date().getTime()
        console.log(`Scheduling ${step.action} to run in ${delay}ms`)
        const timeout: NodeJS.Timeout = setTimeout(
          () => {
            const startTime = new Date()
            this.event.steps[step.id - 1].startTime = startTime
            this.store.setStepStartTime(event.eventId, step.id, startTime)
            processCommand(step.action, step.parameter1).then((res) => {
              const endTime = new Date()
              this.event.steps[step.id - 1].endTime = endTime
              this.event.steps[step.id - 1].endState = "Success"
              this.event.steps[step.id - 1].message = res
              return this.store.stepComplete(event.eventId, step.id, endTime, "Success", res)
            }, (err) => {
              console.error("Failure encountered - stopping")
              this.stopEvent()
              const endTime = new Date()
              this.event.steps[step.id - 1].endTime = endTime
              this.event.steps[step.id - 1].endState = "Success"
              this.event.steps[step.id - 1].message = JSON.stringify(err)
              sendEmail(
                "Event error", `Failure encountered during event "${this.name}"\n` +
                `${this.event.steps[step.id - 1].action} (${this.event.steps[step.id - 1].parameter1}) returned error ${JSON.stringify(err)}`
              )
              return this.store.stepComplete(event.eventId, step.id, endTime, "Failure", JSON.stringify(err))
            })
          },
          delay > 0 ? delay : 0
        )
        this.timeouts[step.id] = timeout
      }
    })
  }

  private eventLoop(): void {
    this.scheduleEventSteps(this.event)
    setTimeout(() => {
      if (this.running) {
        if (this.isSuccess()) {
          this.stopEvent()
        } else {
          this.eventLoop()
        }
      }
    }, 1000)
  }

  isSuccess(): boolean {
    return this.event.steps.every((step) => step.endState === "Success")
  }

  start(): void {
    this.store.getEvent(this.eventId).then((evt) => {
      sendEmail("Event preparing", `Starting event loop for "${this.name}". `)
      this.event = evt
      this.running = true
      this.eventLoop()
    })
  }

  stopEvent(stopYoutube = false): void {
    if (stopYoutube) {
      console.log(`Stopping youtube event ${this.eventId}`)
      stopYoutubeLiveBroadcast(this.eventId)
    }
    this.running = false
    Object.values(this.timeouts).forEach((timeout) => {
      clearTimeout(timeout)
    })
  }
}
