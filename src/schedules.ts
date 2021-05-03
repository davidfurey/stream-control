import { Duration } from 'moment';
import { PrivacyStatus } from './YoutubeClient';

const ALL_LIFECYCLE = <const> [
  "Creation overdue",
  "Okay",
  "Missed",
  "Past"];

export type Lifecycle = typeof ALL_LIFECYCLE[number]

export function isLivecycle(s: string): s is Lifecycle {
  return (ALL_LIFECYCLE as ReadonlyArray<string>).includes(s)
}


export type DayOfWeek =
  "Mon" |
  "Tue" |
  "Wed" |
  "Thu" |
  "Fri" |
  "Sat" |
  "Sun"

export interface Event {
  rowNumber: number;
  offset: number;
  custom: string[];
  eventName: string;
  thumbnail: string;
  description: string;
  scheduledStartTime: Date;
  automated: boolean;
  privacyStatus: PrivacyStatus;
  maxLength: Duration;
  template: string;
  streamId: string;
  eventId: string | undefined;
  scheduledCreationTime: Date;
  firstEventTime: Date;
  lastestEndTime: Date;
  lifecycle: Lifecycle;
}

export type EventFilter = (evt: Event) => boolean

export const creationOverdue = (event: Event): boolean => event.lifecycle === "Creation overdue"
export const okay = (event: Event): boolean => event.lifecycle === "Okay"
export const videoCreated = (event: Event): boolean => event.lifecycle === "Okay" && !!event.eventId
export const imminentAutomated = (event: Event): boolean =>
  Math.abs(event.firstEventTime.getTime() - new Date().getTime()) < 600000 && event.automated


export abstract class ScheduleStore {
  abstract getSchedules(): Promise<string[]>
  abstract listEvents(scheduleName: string, filter?: EventFilter): Promise<Event[]>
  abstract setYoutubeId(
    scheduleName: string,
    row: number,
    youTubeId: string,
    offset: number
  ): Promise<string>
}
