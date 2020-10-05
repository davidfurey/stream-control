import fs from 'fs'
import readline from 'readline'
import { google, Common, Auth } from 'googleapis'
import { Credentials } from 'google-auth-library';
import 'array-flat-polyfill';
import { Readable, ReadableOptions } from "stream";

// todo:
// - connect Youtube to my channel for testing
// - control OBS
//  - correct scene colleciton
//  - correct scene
//  - streaming on/off
// - background process
// - transition broadcast to streaming
// - transition broadcast to stop streaming

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

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json

const SCOPES = [
  'https://www.googleapis.com/auth/youtube'
];

const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';

const TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token: Credentials): void {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
}

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

function isLivecycleStatus(s: string): s is LifecycleStatus {
  return (ALL_LIFECYCLE_STATUSES as ReadonlyArray<string>).includes(s)
}

function isPrivacyStatus(s: string): s is PrivacyStatus {
  return (ALL_PRIVACY_STATUSES as ReadonlyArray<string>).includes(s)
}

function isStreamStatus(s: string): s is StreamStatus {
  return (ALL_STREAM_STATUSES as ReadonlyArray<string>).includes(s)
}

function isHealthStatus(s: string): s is HealthStatus {
  return (ALL_HEALTH_STATUSES as ReadonlyArray<string>).includes(s)
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(
  oauth2Client: Common.OAuth2Client
): Promise<Common.OAuth2Client> {
  const authUrl = oauth2Client.generateAuthUrl({
    // eslint-disable-next-line @typescript-eslint/camelcase
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise<Common.OAuth2Client>((resolve, reject) => {
    rl.question('Enter the code from that page here: ', function(code) {
      rl.close();
      oauth2Client.getToken(code, function(err, token) {
        if (err) {
          reject(err);
          return;
        }
        if (token === null || token === undefined) {
          reject('Error while trying to retrieve access token, credentials are null');
          return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        resolve(oauth2Client);
      });
    });
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize<T>(
  credentials: { installed: { client_secret: string; client_id: string; redirect_uris: string[]}},
  callback: (client: Common.OAuth2Client) => Promise<T>
): Promise<T> {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const oauth2Client = new Auth.OAuth2Client(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  return new Promise((resolve, reject) => {
    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        getNewToken(oauth2Client).then(callback).then(resolve).catch(reject);
      } else {
        oauth2Client.credentials = JSON.parse(token.toString("utf-8"));
        callback(oauth2Client).then(resolve).catch(reject);
      }
    })
  });
}

function withAuth<T>(fn: (auth: Common.OAuth2Client) => Promise<T>): () => Promise<T> {
  // Load client secrets from a local file.
  return (): Promise<T> => new Promise<T>((resolve, reject) => {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        reject('Error loading client secret file: ' + err);
        return;
      }
      // Authorize a client with the loaded credentials, then call the YouTube API.
      authorize(JSON.parse(content.toString("utf-8")), fn).then(resolve).catch(reject);
    });
  })
}

export const liveBroadcasts: () => Promise<LiveBroadcast[]> =
  withAuth((auth: Common.OAuth2Client) =>
  google.youtube('v3').liveBroadcasts.list({
    part: ['id', 'snippet', 'contentDetails', 'status'],
    auth: auth,
    broadcastStatus: "all",
    maxResults: 20,
  }).then((response) => {
    const data = response.data.items;
    console.log(`total: ${response.data.pageInfo?.totalResults}`)
    console.log(`items: ${response.data.items?.length}`)
    return (data?.flatMap((item) => {
      console.log("COUNT")
      //item.contentDetails?.boundStreamId
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
        console.log("GOOD")
        console.log(JSON.stringify(item))
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
      console.log(JSON.stringify(response))
      return videoId
    }).catch((error) => {
      console.log(JSON.stringify(error))
      return Promise.resolve("error")
    })
  }
  return Promise.resolve("error")
}

export function createLiveBroadcast(
  title: string,
  description: string,
  thumbnail: { mimeType: "image/jpeg" | "image/png"; data: Buffer},
  scheduledStartTime: Date,
  streamId: string,
  privacyStatus?: "public" | "private"
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
        privacyStatus: "private" || privacyStatus || "private",
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

export function updateLiveBroadcast(
  id: string,
  title: string,
  description: string,
  scheduledStartTime: Date
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
      }
    },
    auth: auth,
  }).then((response) => {
    return response.status.toString()
  })
)()
}

export function updateBroadcastStatus(id: string, status: "live" | "testing" | "complete"): Promise<string> {
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

export function liveStream(id: string): Promise<LiveStream[]> {
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

export const liveStreams: () => Promise<LiveStream[]> =
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

export function liveBroadcast(
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
        console.log(data)
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