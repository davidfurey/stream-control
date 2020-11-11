import fs from 'fs'
import readline from 'readline'
import { Common, Auth } from 'googleapis'
import { Credentials } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/youtube'
];

const CONFIG_DIR = process.env.CONFIG_DIR || '/etc/stream-control/';

const TOKEN_PATH = CONFIG_DIR + 'token.json';

const CLIENT_SECRET_PATH = CONFIG_DIR + 'client_secret.json'

function storeToken(token: Credentials): void {
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
}

export function getNewToken(
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

export function authorize<T>(
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

export function withAuth<T>(fn: (auth: Common.OAuth2Client) => Promise<T>): () => Promise<T> {
  // Load client secrets from a local file.
  return (): Promise<T> => new Promise<T>((resolve, reject) => {
    fs.readFile(CLIENT_SECRET_PATH, function processClientSecrets(err, content) {
      if (err) {
        reject('Error loading client secret file: ' + err);
        return;
      }
      authorize(JSON.parse(content.toString("utf-8")), fn).then(resolve).catch(reject);
    });
  })
}

type ClientSecret = {
  installed: {
    client_secret: string;
    client_id: string;
    redirect_uris: string[];
  }
}

export function requestAuthorization(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(CLIENT_SECRET_PATH, function processClientSecrets(err, content) {
      if (err) {
        reject('Error loading client secret file: ' + err);
        return;
      }
      const credentials: ClientSecret = JSON.parse(content.toString("utf-8"))
      const clientSecret = credentials.installed.client_secret;
      const clientId = credentials.installed.client_id;
      const redirectUrl = credentials.installed.redirect_uris[0];
      const oauth2Client = new Auth.OAuth2Client(clientId, clientSecret, redirectUrl);
      fs.readFile(TOKEN_PATH, function(err) {
        if (err) {
          getNewToken(oauth2Client).then(() => resolve("Got token")).catch(reject);
        } else {
          resolve("Already have token")
        }
      })
    });
  })
}