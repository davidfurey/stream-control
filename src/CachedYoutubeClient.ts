import { YoutubeClientImpl } from "./youtube";
import { LiveBroadcast, LiveStream, YoutubeClient } from "./YoutubeClient";


interface CachedItem<T> {
  value: T;
  expiry: Date;
}

class Cache {
  cacheDisabledUntil: Date = new Date(0)

  private enabled(): boolean {
    return this.cacheDisabledUntil < new Date()
  }

  disableForTimeout(): void {
    console.log("Disabling cache")
    this.cacheDisabledUntil = new Date(new Date().getTime() + 60000)
  }

  getOrSet<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.youtubeCache[key]
    console.log(cached)
    if (cached && this.enabled() && cached.expiry > new Date()) {
      console.log(`Returning cached value for ${key}`)
      return Promise.resolve(cached.value as T)
    } else {
      console.log("Using uncached version")
      const result = fn()
      result.then((v) => { this.youtubeCache[key] = {
        value: v,
        expiry: new Date(new Date().getTime() + 300000)
      }
      console.log(this.youtubeCache)
      })
      return result
    }
  }

  private youtubeCache: Record<string, CachedItem<unknown>> = {
  }
}

export class CachedYoutubeClient extends YoutubeClient {
  underlying = new YoutubeClientImpl
  cache = new Cache()

  createLiveBroadcast(
    title: string,
    description: string,
    thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer },
    scheduledStartTime: Date,
    streamId: string,
    privacyStatus?: "public" | "private"): Promise<string> {
    this.cache.disableForTimeout()
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
    this.cache.disableForTimeout()
    return this.underlying.updateLiveBroadcast(id, title, description, scheduledStartTime)
  }

  updateBroadcastStatus(id: string, status: "live" | "testing" | "complete"): Promise<string> {
    this.cache.disableForTimeout()
    return this.underlying.updateBroadcastStatus(id, status)
  }

  liveBroadcasts: () => Promise<LiveBroadcast[]> = () => {
    return this.cache.getOrSet('liveBroadcasts', this.underlying.liveBroadcasts)
  }

  liveStream(id: string): Promise<LiveStream[]> {
    return this.underlying.liveStream(id)
  }

  liveStreams: () => Promise<LiveStream[]> = () => {
    return this.cache.getOrSet('liveStreams', this.underlying.liveStreams)
  }

  liveBroadcast(id: string): Promise<LiveBroadcast | null> {
    return this.underlying.liveBroadcast(id)
  }
}