import { YoutubeClientImpl } from "./youtube";
import { LiveBroadcast, LiveStream, YoutubeClient } from "./YoutubeClient";

export class CachedYoutubeClient extends YoutubeClient {
  underlying = new YoutubeClientImpl

  cachedLiveStreams: LiveStream[] | null = null
  cachedLiveBroadcasts: LiveBroadcast[] | null = null

  cacheDisabledUntil: Date = new Date(0)

  private cacheEnabled(): boolean {
    return this.cacheDisabledUntil < new Date()
  }

  private disableCache(): void {
    this.cacheDisabledUntil = new Date(new Date().getTime() + 30000)
    this.cachedLiveBroadcasts = null
    this.cachedLiveStreams = null
  }

  createLiveBroadcast(
    title: string,
    description: string,
    thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer; },
    scheduledStartTime: Date,
    streamId: string,
    privacyStatus?: "public" | "private"): Promise<string> {
    this.disableCache()
    return this.underlying.createLiveBroadcast(
      title,
      description,
      thumbnail,
      scheduledStartTime,
      streamId,privacyStatus
    )
  }

  updateLiveBroadcast(
    id: string,
    title: string,
    description: string,
    scheduledStartTime: Date
  ): Promise<string> {
    this.disableCache()
    return this.underlying.updateLiveBroadcast(id, title, description, scheduledStartTime)
  }

  updateBroadcastStatus(id: string, status: "live" | "testing" | "complete"): Promise<string> {
    this.disableCache()
    return this.underlying.updateBroadcastStatus(id, status)
  }

  liveBroadcasts: () => Promise<LiveBroadcast[]> = () => {
    if (this.cachedLiveBroadcasts) {
      console.log("Returning cached live broadcasts")
      return Promise.resolve(this.cachedLiveBroadcasts)
    } else {
      const result = this.underlying.liveBroadcasts()
      if (this.cacheEnabled()) {
        result.then((broadcasts) => { this.cachedLiveBroadcasts = broadcasts })
      }
      return result
    }
  }

  liveStream(id: string): Promise<LiveStream[]> {
    return this.underlying.liveStream(id)
  }

  liveStreams: () => Promise<LiveStream[]> = () => {
    if (this.cachedLiveStreams) {
      console.log("Returning cached live streams")
      return Promise.resolve(this.cachedLiveStreams)
    } else {
      const result = this.underlying.liveStreams()
      if (this.cacheEnabled()) {
        result.then((streams) => { this.cachedLiveStreams = streams })
      }
      return result
    }
  }

  liveBroadcast(id: string): Promise<LiveBroadcast | null> {
    return this.underlying.liveBroadcast(id)
  }
}