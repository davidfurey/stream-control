import { Event, EventFilter } from "./schedules";
import { dateFromSerial, withAuth } from "./spreadsheet"
import { google, Common } from 'googleapis'
import { duration } from 'moment';
import { ScheduleStore } from "./schedules";


export class SpreadsheetScheduleStore extends ScheduleStore {

  getSchedules(): Promise<string[]> {
    return withAuth((auth: Common.OAuth2Client) => {
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
    })()
  }

  setYoutubeId(scheduleName: string, row: number, youTubeId: string): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: '***REMOVED***',
        range: `schedule/${scheduleName}!J${row+1}`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `schedule/${scheduleName}!J${row+1}`,
          values: [ [ youTubeId ] ],
        }
      }).then((response) => response.statusText)
    })()
  }

  listEvents(scheduleName: string, filter?: EventFilter): Promise<Event[]> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.get({
        spreadsheetId: '***REMOVED***',
        range: `schedule/${scheduleName}!A2:O`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      }).then((res) => {
        const rows = res.data.values;
        if (rows?.length && rows?.length > 0) {
          const events = rows.map((row, index) => {
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
              streamId: row[8],
              eventId: row[9] === "" ? undefined : row[9],
              scheduledCreationTime: dateFromSerial(row[10]),
              firstEventTime: dateFromSerial(row[11]),
              lastestEndTime: dateFromSerial(row[12]),
              scheduledActive: row[13],
              lifecycle: row[14]
            }
          });
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
    })()
  }
}