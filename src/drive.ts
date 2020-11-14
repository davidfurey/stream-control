import { google, Common } from 'googleapis'
import { withDrive } from "./google-oauth";
import path from 'path'

function directoryId(parent: string, name: string): Promise<string | null> {
  return withDrive((auth: Common.OAuth2Client) => {
    const drive = google.drive({ version: 'v3', auth})
    return drive.files.list({
      "corpus": "user",
      "q": `name contains '${name}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder'`
    }).then((response) => {
      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id || null
      }
      return null
    })
  })
}

function file(id: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    withDrive((auth: Common.OAuth2Client) => {
      const drive = google.drive({ version: 'v3', auth})
      return drive.files.get({
        fileId: id,
        alt: "media"
      }, { responseType: "stream" }).then((response) => {
        const buf: Buffer[] = [];
        response.data.on("data", (e) => buf.push(e));
        response.data.on("end", () => {
          resolve(Buffer.concat(buf))
        });
      }).catch((e) => reject(e))
    })
  })
}

function fileId(parent: string, name: string): Promise<string> {
  return withDrive((auth: Common.OAuth2Client) => {
    const drive = google.drive({ version: 'v3', auth})
    return drive.files.list({
      "corpus": "user",
      "q": `name = '${name}' and '${parent}' in parents`
    }).then((response) => {
      if (response.data.files && response.data.files.length > 0 &&
        response.data.files[0].id) {
        return response.data.files[0].id
      }
      throw `File ${name} not found`
    })
  })
}

function findDirectory(dir: string): Promise<string> {
  if (dir !== '/' && dir !== '.') {
    return findDirectory(path.dirname(dir)).then((parent) => {
      return directoryId(parent, path.basename(dir)).then((dirId) => {
        if (dirId) {
          return dirId
        }
        throw `Directory ${dir} not found`
      })
    })
  } else {
    return Promise.resolve('root')
  }
}

export function fileByPath(filePath: string): Promise<Buffer> {
  const folder = path.dirname(filePath)
  return findDirectory(folder).then((pathId) => {
    if (pathId) {
      return fileId(pathId, path.basename(filePath)).then((f) => file(f))
    }
    throw `File ${filePath} not found`
  }).catch(() => {
    throw `File ${filePath} not found`
  })
}