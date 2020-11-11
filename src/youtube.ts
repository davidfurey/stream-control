import { google, Common } from 'googleapis'
import 'array-flat-polyfill';
import { Readable, ReadableOptions } from "stream";
import {
  LiveBroadcast,
  isLivecycleStatus,
  isPrivacyStatus,
  LiveStream,
  isStreamStatus,
  isHealthStatus,
  YoutubeClient,
  PrivacyStatus
} from './YoutubeClient';
import { withAuth } from './google-oauth';

export class BufferStream extends Readable {
  _object: Buffer | null;
  constructor(object: Buffer, options: ReadableOptions = {}) {
    super(options);
    this._object = object;
  }
  _read = (): void => {
    this.push(this._object);
    this._object = null;
  };
}

function addThumbnail(
  videoId: string,
  auth: Common.OAuth2Client,
  thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer}
): Promise<string> {
  if (videoId) {
    return google.youtube('v3').thumbnails.set({
      videoId,
      media: {
        mimeType: thumbnail.mimeType,
        body: new BufferStream(thumbnail.data)
      },
      auth: auth
    }).then((response) => {
      if (response.status < 200 || response.status >= 300) {
        console.error(JSON.stringify(response))
      }
      return videoId
    }).catch((error) => {
      console.error(JSON.stringify(error))
      return Promise.resolve("error")
    })
  }
  return Promise.resolve("error")
}

export class YoutubeClientImpl extends YoutubeClient {
  liveBroadcasts: () => Promise<LiveBroadcast[]> = withAuth((auth: Common.OAuth2Client) =>
    google.youtube('v3').liveBroadcasts.list({
      part: ['id', 'snippet', 'contentDetails', 'status'],
      auth: auth,
      broadcastStatus: "all",
      maxResults: 20,
    }).then((response) => {
      const data = response.data.items;
      return (data?.flatMap((item) => {
        const id = item.id
        const scheduledStartTime = item.snippet?.scheduledStartTime
        const title = item.snippet?.title
        const description = item.snippet?.description
        const lifeCycleStatus = item.status?.lifeCycleStatus
        const privacyStatus = item.status?.privacyStatus
        const boundStreamId = item.contentDetails?.boundStreamId
        if (id &&
          scheduledStartTime &&
          title &&
          lifeCycleStatus &&
          isLivecycleStatus(lifeCycleStatus) &&
          privacyStatus &&
          isPrivacyStatus(privacyStatus)
        ) {
          const r: LiveBroadcast = {
            id,
            scheduledStartTime: Date.parse(scheduledStartTime),
            title,
            description: description || "",
            status: lifeCycleStatus,
            privacyStatus,
            boundStreamId: boundStreamId || null,
          }
          return [r];
        } else {
          return []
        }
      }) || []).sort((a, b) => a.scheduledStartTime < b.scheduledStartTime ? -1 : 1)
    })
  )

  createLiveBroadcast(
    title: string,
    description: string,
    thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer},
    scheduledStartTime: Date,
    streamId: string,
    privacyStatus?: PrivacyStatus
  ): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) =>
    google.youtube('v3').liveBroadcasts.insert({
      part: [
        "snippet",
        "status",
        "content_details"
      ],
      requestBody: {
        snippet: {
          title,
          description,
          scheduledStartTime: scheduledStartTime.toISOString(),
        },
        status: {
          privacyStatus: privacyStatus || "private",
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: false,
          enableAutoStop: false,
        }
      },
      auth: auth,
    }).then((response) => {
      return google.youtube('v3').liveBroadcasts.bind({
        part: [ "id" ],
        id: response.data.id || "",
        streamId: streamId,
        auth: auth,
      })
    }).then((response) => {
      google.youtube('v3').videos.update({
        part: [ "snippet", "status" ],
        requestBody: {
          id: response.data.id,
          snippet: {
            categoryId: "22", // People and Blogs
            title,
            description
          },
          status: {
            selfDeclaredMadeForKids: false
          }
        },
        auth
      })
      return addThumbnail(response.data.id || "", auth, thumbnail)
    })
  )()
  }

  updateLiveBroadcast(
    id: string,
    title: string,
    description: string,
    scheduledStartTime: Date,
    privacyStatus: PrivacyStatus
  ): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) =>
    google.youtube('v3').liveBroadcasts.update({
      part: [
        "snippet"
      ],
      requestBody: {
        id,
        snippet: {
          title,
          description,
          scheduledStartTime: scheduledStartTime.toISOString(),
        },
        status: {
          privacyStatus
        }
      },
      auth: auth,
    }).then((response) => {
      return response.status.toString()
    })
  )()
  }

  updateBroadcastStatus(id: string, status: "live" | "testing" | "complete"): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) =>
    google.youtube('v3').liveBroadcasts.transition({
      broadcastStatus: status,
      part: [ ],
      id,
      auth: auth,
    }).then((response) => {
      return response.status.toString()
    })
  )()
  }

  liveStream(id: string): Promise<LiveStream[]> {
    return withAuth((auth: Common.OAuth2Client) =>
    google.youtube('v3').liveStreams.list({
      "part": [
        "snippet,cdn,contentDetails,status"
      ],
      id: [id],
      auth: auth,
    }).then((response) => {
      const data = response.data.items;
      return data?.flatMap((item) => {
        //item.status?.healthStatus?.status
        item.status?.streamStatus
        if (
          item.id &&
          item.snippet?.title &&
          item.status?.streamStatus &&
          isStreamStatus(item.status?.streamStatus)
        ) {
          const r: LiveStream = {
            title: item.snippet?.title,
            status: item.status?.streamStatus,
            id: item.id,
            healthStatus: item.status?.healthStatus?.status && isHealthStatus(item.status?.healthStatus?.status) ? item.status?.healthStatus?.status : "noData"
          }
          return [r];
        } else {
          return []
        }
      }) || []
    })
  )()
  }

  liveStreams: () => Promise<LiveStream[]> =
    withAuth((auth: Common.OAuth2Client) =>
    google.youtube('v3').liveStreams.list({
      "part": [
        "snippet,cdn,contentDetails,status"
      ],
      "mine": true,
      auth: auth,
    }).then((response) => {
      const data = response.data.items;
      return data?.flatMap((item) => {
        //item.status?.healthStatus?.status
        item.status?.streamStatus
        if (
          item.id &&
          item.snippet?.title &&
          item.status?.streamStatus &&
          isStreamStatus(item.status?.streamStatus)
        ) {
          const r: LiveStream = {
            title: item.snippet?.title,
            status: item.status?.streamStatus,
            id: item.id,
            healthStatus: item.status?.healthStatus?.status && isHealthStatus(item.status?.healthStatus?.status) ? item.status?.healthStatus?.status : "noData"
          }
          return [r];
        } else {
          return []
        }
      }) || []
    })
  )

  liveBroadcast(
    id: string
  ): Promise<LiveBroadcast | null> {
    return withAuth((auth: Common.OAuth2Client) =>
      google.youtube('v3').liveBroadcasts.list({
        part: ['id', 'snippet', 'contentDetails', 'status'],
        id: [ id ],
        auth: auth
      }).then((response) => {
        const data = response.data.items;
        if (data && data.length === 1) {
          const item = data[0]
          const id = item.id
          const scheduledStartTime = item.snippet?.scheduledStartTime
          const title = item.snippet?.title
          const description = item.snippet?.description
          const lifeCycleStatus = item.status?.lifeCycleStatus
          const privacyStatus = item.status?.privacyStatus
          const boundStreamId = item.contentDetails?.boundStreamId
          if (id &&
            scheduledStartTime &&
            title &&
            description &&
            lifeCycleStatus &&
            isLivecycleStatus(lifeCycleStatus) &&
            privacyStatus &&
            isPrivacyStatus(privacyStatus)
          ) {
            const r: LiveBroadcast = {
              id,
              scheduledStartTime: Date.parse(scheduledStartTime),
              title,
              description,
              status: lifeCycleStatus,
              privacyStatus,
              boundStreamId: boundStreamId || null
            }
            return r;
          } else {
            return null
          }
        } else {
          return null
        }
      })
      )()
  }
}