import fs from 'fs'
import readline from 'readline'
import { google, Common, Auth } from 'googleapis'
import { Credentials } from 'google-auth-library';
import 'array-flat-polyfill';

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

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

type PrivacyStatus = "private" |
  "public" |
  "unlisted"

export interface LiveBroadcast {
  id: string;
  scheduledStartTime: number;
  title: string;
  status: LifecycleStatus;
  privacyStatus: PrivacyStatus;
}

export type StreamStatus = "active" |
  "created" |
  "error" |
  "inactive" |
  "ready"

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
  return s === "private" ||
    s === "public" ||
    s === "unlisted"
}

function isStreamStatus(s: string): s is StreamStatus {
  return s === "active" ||
    s === "created" ||
    s === "error" ||
    s === "inactive" ||
    s === "ready"
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
    broadcastStatus: "upcoming"
  }).then((response) => {
    const data = response.data.items;
    console.log(JSON.stringify(response.data))
    return data?.flatMap((item) => {
      //item.contentDetails?.boundStreamId
      const id = item.id
      const scheduledStartTime = item.snippet?.scheduledStartTime
      const title = item.snippet?.title
      const lifeCycleStatus = item.status?.lifeCycleStatus
      const privacyStatus = item.status?.privacyStatus
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
          status: lifeCycleStatus,
          privacyStatus
        }
        return [r];
      } else {
        return []
      }
    }) || []
  })
)

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
    console.log(JSON.stringify(response.data))
    return data?.flatMap((item) => {
      //item.status?.healthStatus?.status
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