import { EventStore, RunningEvent, Step } from "./events"
import { process as processCommand } from './command_processor';

export class EventRunner {
  store: EventStore
  eventId: string
  event: RunningEvent
  running: boolean
  timeouts: {
    [stepId: string]: NodeJS.Timeout;
  } = {}

  constructor(store: EventStore, eventId: string) {
    this.store = store
    this.eventId = eventId
    this.running = false
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
              console.log("Failure encountered - stopping")
              this.stopEvent()
              const endTime = new Date()
              this.event.steps[step.id - 1].endTime = endTime
              this.event.steps[step.id - 1].endState = "Success"
              this.event.steps[step.id - 1].message = JSON.stringify(err)
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
        this.eventLoop()
      }
    }, 1000)
  }

  start(): void {
    this.store.getEvent(this.eventId).then((evt) => {
      this.event = evt
      this.running = true
      this.eventLoop()
    })
  }

  stopEvent(): void {
    this.running = false
    Object.values(this.timeouts).forEach((timeout) => {
      clearTimeout(timeout)
    })
  }
}
