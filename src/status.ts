export interface ReportedStatus {
  runningEvents: number;
  scheduledEvents: number;
  upcomingYoutubeEvents: number;
  lastValidatedEvents: Date;
  lastCheckedForIminentEvents: Date;
  lastRanMonitoringTask: Date;
  lastRanCleanupTask: Date;
  appStartTime: Date;
}

export abstract class StatusStore {
  abstract ranMonitoringTask: Date | null
  abstract reportRunningEventsCount(count: number): Promise<void>
  abstract reportScheduledEventsCount(count: number): Promise<void>
  abstract reportUpcomingYoutubeEventsCount(count: number): Promise<void>
  abstract reportValidatedEvents(date: Date): Promise<void>
  abstract reportCheckedForIminentEvents(date: Date): Promise<void>
  abstract reportRanMonitoringTask(date: Date): Promise<void>
  abstract reportRanCleanupTask(date: Date): Promise<void>
  abstract reportAppStarted(date: Date): Promise<void>
  abstract get(): Promise<ReportedStatus>
}