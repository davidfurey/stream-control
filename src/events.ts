
import { Duration } from 'moment';

export type EndState = "Success" | "Failure" | ""

export interface Step {
  id: number;
  referenceTime: "Scheduled Start Time" | "Relative";
  offset: Duration;
  action: string;
  parameter1: string;
  startTime: Date | undefined;
  endTime: Date | undefined;
  endState: EndState;
  message: string;
  // status: "Running" | "Finished" | "Ready" | "Not ready";
}

export interface RunningEvent {
  eventId: string;
  streamId: string;
  scheduledStartTime: Date;
  steps: Step[];
  running: boolean;
  stepsOffset: number;
}

export interface EventMetadata {
  name: string;
  scheduledStartTime: Date;
  streamId: string;
}

export abstract class EventStore {
  abstract getEvent(eventId: string): Promise<RunningEvent>
  abstract deleteEvent(eventId: string): Promise<void>
  abstract setStepStartTime(
    eventId: string,
    stepId: number,
    startTime: Date,
    stepsOffset: number
  ): Promise<string>
  abstract setScheduledStartTime(eventId: string, scheduledStartTime: Date): Promise<string>
  abstract stepComplete(
    eventId: string,
    stepId: number,
    endTime: Date,
    state: EndState,
    message: string,
    stepsOffset: number
  ): Promise<string>
  abstract createEvent(
    eventId: string,
    streamId: string,
    scheduledStartTime: Date,
    eventName: string,
    custom: string[],
    template: string
  ): Promise<void>
  abstract getMetadata(eventId: string): Promise<EventMetadata>
  abstract getEvents(): Promise<string[]>
}
