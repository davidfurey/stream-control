import fs from 'fs'
import readline from 'readline'
import { google, Common, Auth } from 'googleapis'
import { Credentials } from 'google-auth-library';
import { Duration , duration } from 'moment';
import { tz } from 'moment-timezone';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';

const TOKEN_PATH = TOKEN_DIR + 'spreadsheet.json';


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

type DayOfWeek =
  "Mon" |
  "Tue" |
  "Wed" |
  "Thu" |
  "Fri" |
  "Sat" |
  "Sun"

type CreationState =
  "Creation overdue" | "okay"

interface Event {
  rowNumber: number;
  eventName: string;
  thumbnail: string;
  description: string;
  scheduledStartTime: Date;
  dayOfWeek: DayOfWeek;
  automated: boolean;
  maxLength: Duration;
  template: string;
  eventId: string;
  sheetId: string;
  scheduledCreationTime: Date;
  firstEventTime: Date;
  lastestEndTime: Date;
  scheduledActive: boolean;
  creationState: CreationState;
}

function dateFromSerial(serialNum: number): Date {
  const millis = Math.round((serialNum - 25569) * 86400 * 1000)
  const offset = tz.zone('Europe/London')?.utcOffset(millis) || 0;
  return new Date(millis + offset * 60 * 1000)
}

export const listWeekdays: () => Promise<Event[]> =
  withAuth((auth: Common.OAuth2Client) => {
    const sheets = google.sheets({version: 'v4', auth});
    return sheets.spreadsheets.values.get({
      spreadsheetId: '***REMOVED***',
      range: 'Weekday Mass!A2:O',
      valueRenderOption: 'UNFORMATTED_VALUE'
    }).then((res) => {
      const rows = res.data.values;
      if (rows?.length && rows?.length > 0) {
        return rows.map((row, index) => {
          return {
            rowNumber: index + 1,
            eventName: row[0],
            thumbnail: row[1],
            description: row[2],
            scheduledStartTime: dateFromSerial(row[3]),
            dayOfWeek: row[4],
            automated: row[5],
            maxLength: duration(row[6] * 24 * 60 * 60 * 1000),
            template: row[7],
            eventId: row[8],
            sheetId: row[9],
            scheduledCreationTime: dateFromSerial(row[10]),
            firstEventTime: dateFromSerial(row[11]),
            lastestEndTime: dateFromSerial(row[12]),
            scheduledActive: row[13],
            creationState: row[14]
          }
        });
      }
      console.log('No data found.');
      throw "No data found"
    });
  })

export function setYoutubeId(row: number, id: string): Promise<string> {
  console.log("Set youtube id")
  return withAuth((auth: Common.OAuth2Client) => {
    const sheets = google.sheets({version: 'v4', auth});
    return sheets.spreadsheets.values.update({
      spreadsheetId: '***REMOVED***',
      range: `Weekday Mass!I${row+1}`,
      valueInputOption: 'RAW',
      requestBody: {
        range: `Weekday Mass!I${row+1}`,
        values: [ [ id ] ],
      }
    }).then((response) => response.statusText)
  })()
}