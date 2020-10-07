const ALL_LIFECYCLE_STATUSES = <const> [
  "complete",
  "created",
  "live",
  "liveStarting",
  "ready",
  "revoked",
  "testStarting",
  "testing"];

export type LifecycleStatus = typeof ALL_LIFECYCLE_STATUSES[number]

const ALL_PRIVACY_STATUSES = <const> [
  "private",
  "public",
  "unlisted"];

export type PrivacyStatus = typeof ALL_PRIVACY_STATUSES[number]

export interface LiveBroadcast {
  id: string;
  scheduledStartTime: number;
  title: string;
  description: string;
  status: LifecycleStatus;
  privacyStatus: PrivacyStatus;
  boundStreamId: string | null;
}

const ALL_STREAM_STATUSES = <const> [
  "active",
  "created",
  "error",
  "inactive",
  "ready"];

export type StreamStatus = typeof ALL_STREAM_STATUSES[number]

export interface LiveStream {
  status: StreamStatus;
  title: string;
  id: string;
  healthStatus: HealthStatus;
}

const ALL_HEALTH_STATUSES = <const> [
  "good",
  "ok",
  "bad",
  "noData"];

export type HealthStatus = typeof ALL_HEALTH_STATUSES[number]

export function isLivecycleStatus(s: string): s is LifecycleStatus {
  return (ALL_LIFECYCLE_STATUSES as ReadonlyArray<string>).includes(s)
}

export function isPrivacyStatus(s: string): s is PrivacyStatus {
  return (ALL_PRIVACY_STATUSES as ReadonlyArray<string>).includes(s)
}

export function isStreamStatus(s: string): s is StreamStatus {
  return (ALL_STREAM_STATUSES as ReadonlyArray<string>).includes(s)
}

export function isHealthStatus(s: string): s is HealthStatus {
  return (ALL_HEALTH_STATUSES as ReadonlyArray<string>).includes(s)
}

export abstract class YoutubeClient {
  abstract liveBroadcasts: () => Promise<LiveBroadcast[]>
  abstract createLiveBroadcast(
    title: string,
    description: string,
    thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer},
    scheduledStartTime: Date,
    streamId: string,
    privacyStatus?: "public" | "private"
  ): Promise<string>

  abstract updateLiveBroadcast(
    id: string,
    title: string,
    description: string,
    scheduledStartTime: Date
  ): Promise<string>

  abstract updateBroadcastStatus(id: string, status: "live" | "testing" | "complete"): Promise<string>
  abstract liveStream(id: string): Promise<LiveStream[]>
  abstract liveStreams: () => Promise<LiveStream[]>
  abstract liveBroadcast(
    id: string
  ): Promise<LiveBroadcast | null>
}
