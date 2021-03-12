import { Event, EventFilter } from "./schedules";
import { dateFromSerial } from "./spreadsheet"
import { google, Common } from 'googleapis'
import { duration } from 'moment';
import { ScheduleStore } from "./schedules";
import { withSpreadsheets } from "./google-oauth";

const headingsV1 = [
  "Event Name",
  "Thumbnail",
  "Description",
  "Scheduled Start Time",
  "Day of week",
  "Automated",
  "PrivacyStatus",
  "Max Length",
  "Template",
  "Stream ID",
  "Event ID",
  "Scheduled creation Time",
  "First Event Time",
  "Lastest end time",
  "Scheduled Active",
  "Lifecycle"
]

const headingsV2 = [
  "Custom 1",
  "Custom 2",
  "Custom 3",
  "Custom 4",
  "Event Name",
  "Thumbnail",
  "Description",
  "Scheduled Start Time",
  "Day of week",
  "Automated",
  "PrivacyStatus",
  "Max Length",
  "Template",
  "Stream ID",
  "Event ID",
  "Scheduled creation Time",
  "First Event Time",
  "Lastest end time",
  "Scheduled Active",
  "Lifecycle"
]

function eventFromV2(row: any[], index: number): Event {
  return {
    rowNumber: index + 1,
    custom1: row[0],
    custom2: row[1],
    custom3: row[2],
    custom4: row[3],
    eventName: row[4],
    thumbnail: row[5],
    description: row[6],
    scheduledStartTime: dateFromSerial(row[7]),
    dayOfWeek: row[8],
    automated: row[9].toLowerCase() === "yes",
    privacyStatus: row[10],
    maxLength: duration(row[11] * 24 * 60 * 60 * 1000),
    template: row[12],
    streamId: row[13],
    eventId: row[14] === "" ? undefined : row[14],
    scheduledCreationTime: dateFromSerial(row[15]),
    firstEventTime: dateFromSerial(row[16]),
    lastestEndTime: dateFromSerial(row[17]),
    scheduledActive: row[18],
    lifecycle: row[19]
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eventFromV1(row: any[], index: number): Event {
  return eventFromV2(["", "", "", ""].concat(row), index)
}

function isV1(row: any[]): boolean {
  return headingsV1.every((x, i) => row[i] === x)
}

function isV2(row: any[]): boolean {
  return headingsV2.every((x, i) => row[i] === x)
}

export class SpreadsheetScheduleStore extends ScheduleStore {

  getSchedules(): Promise<string[]> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.get({
        spreadsheetId: '***REMOVED***',
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

  setYoutubeId(scheduleName: string, row: number, youTubeId: string): Promise<string> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: '***REMOVED***',
        range: `schedule/${scheduleName}!K${row+1}`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `schedule/${scheduleName}!K${row+1}`,
          values: [ [ youTubeId ] ],
        }
      }).then((response) => response.statusText)
    })
  }

  listEvents(scheduleName: string, filter?: EventFilter): Promise<Event[]> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.get({
        spreadsheetId: '***REMOVED***',
        range: `schedule/${scheduleName}!A1:T`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      }).then((res) => {
        const rows = res.data.values;
        if (rows?.length && rows?.length > 1) {
          if (!isV1(rows[0]) && !isV2(rows[0])) {
            console.log('Header row invalid.');
            console.log(rows[0])
            throw "Header row invalid"
          }
          const events = isV2(rows[0]) ?
            rows.slice(1).map(eventFromV2) :
            rows.slice(1).map(eventFromV1)

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