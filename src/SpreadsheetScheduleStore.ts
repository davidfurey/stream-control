import { Event, EventFilter, isLivecycle, Lifecycle } from "./schedules";
import { dateFromSerial } from "./spreadsheet"
import { google, Common } from 'googleapis'
import { duration } from 'moment';
import { ScheduleStore } from "./schedules";
import { withSpreadsheets } from "./google-oauth";
import { isPrivacyStatus, PrivacyStatus } from "./YoutubeClient";

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value
  } if (typeof value === "number") {
    return value.toString()
  } if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return ""
}

function asDate(value: unknown): Date {
  return typeof value === "number" ? dateFromSerial(value) : new Date(0)
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0
}

function asPrivacyStatus(value: string): PrivacyStatus {
  return isPrivacyStatus(value) ? value : "private"
}

function asLifecycle(value: string): Lifecycle {
  return isLivecycle(value) ? value : "Okay"
}

function eventFromRow(offset: number): (row: unknown[], index: number) => Event {
  return (row: unknown[], index: number): Event => ({
    rowNumber: index + 1,
    eventName: asString(row[offset + 0]),
    thumbnail: asString(row[offset + 1]),
    description: asString(row[offset + 2]),
    scheduledStartTime: asDate(row[offset + 3]),
    automated: asString(row[offset + 5]).toLowerCase() === "yes",
    privacyStatus: asPrivacyStatus(asString(row[offset + 6])),
    maxLength: duration(asNumber(row[offset + 7]) * 24 * 60 * 60 * 1000),
    template: asString(row[offset + 8]),
    streamId: asString(row[offset + 9]),
    eventId: asString(row[offset + 10]) === "" ? undefined : asString(row[offset + 10]),
    scheduledCreationTime: asDate(row[offset + 11]),
    firstEventTime: asDate(row[offset + 12]),
    lastestEndTime: asDate(row[offset + 13]),
    lifecycle: asLifecycle(asString(row[offset + 15])),
    custom: row.slice(0, offset).map((s) => asString(s)),
    offset
  })
}

function standardFieldsStart(row: unknown[]): number {
  const candidate = row.indexOf("Event Name")
  if (candidate === -1) {
    console.log('Header row invalid.');
    console.log(row)
    throw "Header row invalid"
  }
  return candidate
}

const columnIndexToA1Notation = (index: number): string => {
  const alphabet = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
  const quotient = Math.floor(index / 26)
  if (quotient > 0) {
    return columnIndexToA1Notation(quotient - 1) + alphabet[index % 26]
  } else {
    return alphabet[index % 26]
  }
}

export class SpreadsheetScheduleStore extends ScheduleStore {

  spreadsheetId: string

  constructor(spreadsheetId: string) {
    super()
    this.spreadsheetId = spreadsheetId
  }

  getSchedules(): Promise<string[]> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        ranges: [],
        includeGridData: false,
      }).then((response) => {
        const sheetTitles = response.data.sheets?.flatMap((sheet) =>
          sheet.properties?.title ? [sheet.properties?.title] : []
        ) || []
        return sheetTitles.filter((title) => title.startsWith("schedule/")).map((title) => title.substring(9))
      })
    })
  }

  setYoutubeId(
    scheduleName: string,
    row: number,
    youTubeId: string,
    offset: number
  ): Promise<string> {
    const column = columnIndexToA1Notation(offset + 10)
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `schedule/${scheduleName}!${column}${row+1}`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `schedule/${scheduleName}!${column}${row+1}`,
          values: [ [ youTubeId ] ],
        }
      }).then((response) => response.statusText)
    })
  }

  listEvents(scheduleName: string, filter?: EventFilter): Promise<Event[]> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `schedule/${scheduleName}!A1:Z`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      }).then((res) => {
        const rows = res.data.values;
        if (rows?.length && rows?.length > 1) {
          const offset = standardFieldsStart(rows[0])
          const events = rows.slice(1).map(eventFromRow(offset))

          if (filter) {
            return events.filter(filter)
          } else {
            return events
          }
        } else {
          console.log('No data found.');
          throw "No data found"
        }
      });
    })
  }
}