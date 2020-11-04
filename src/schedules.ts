import { Duration } from 'moment';
import { PrivacyStatus } from './YoutubeClient';

export type Lifecycle =
  "Creation overdue" | "Okay" | "Missed" | "Past"

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
  eventName: string;
  thumbnail: string;
  description: string;
  scheduledStartTime: Date;
  dayOfWeek: DayOfWeek;
  automated: boolean;
  privacyStatus: PrivacyStatus;
  maxLength: Duration;
  template: string;
  streamId: string;
  eventId: string | undefined;
  scheduledCreationTime: Date;
  firstEventTime: Date;
  lastestEndTime: Date;
  scheduledActive: boolean;
  lifecycle: Lifecycle;
}

export type EventFilter = (evt: Event) => boolean

export const creationOverdue = (event: Event): boolean => event.lifecycle === "Creation overdue"
export const okay = (event: Event): boolean => event.lifecycle === "Okay"


export abstract class ScheduleStore {
  abstract getSchedules(): Promise<string[]>
  abstract listEvents(scheduleName: string, filter?: EventFilter): Promise<Event[]>
  abstract setYoutubeId(scheduleName: string, row: number, youTubeId: string): Promise<string>
}
