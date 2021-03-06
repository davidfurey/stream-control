import { StatusStore, ReportedStatus } from "./status";
import { serialFromDate, dateFromSerial } from "./spreadsheet";
import { Common, google } from "googleapis";
import { withSpreadsheets } from "./google-oauth";

function returnVoid(): void {
  // return void
}

export class SpreadsheetStatusStore extends StatusStore {

  spreadsheetId: string

  constructor(spreadsheetId: string) {
    super()
    this.spreadsheetId = spreadsheetId
  }

  ranMonitoringTask: Date | null = null

  private setCell(ref: string, value: number): Promise<void> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `status!${ref}`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `status!${ref}`,
          values: [ [ value ] ],
        }
      }).then(returnVoid)
    })
  }

  get(): Promise<ReportedStatus> {
    return withSpreadsheets((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `status!B1:8`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      }).then((res) => {
        const rows = res.data.values;
        if (rows?.length && rows?.length === 8) {
          return {
            runningEvents: rows[0][0],
            scheduledEvents: rows[1][0],
            upcomingYoutubeEvents: rows[2][0],
            lastValidatedEvents: dateFromSerial(rows[3][0]),
            lastCheckedForIminentEvents: dateFromSerial(rows[4][0]),
            lastRanMonitoringTask: dateFromSerial(rows[5][0]),
            lastRanCleanupTask: dateFromSerial(rows[6][0]),
            appStartTime: dateFromSerial(rows[7][0])
          }
        } else {
          console.log('No data found.');
          throw "No data found"
        }
      });
    })
  }
  reportRunningEventsCount(count: number): Promise<void> {
    return this.setCell("B1", count)
  }
  reportScheduledEventsCount(count: number): Promise<void> {
    return this.setCell("B2", count)
  }
  reportUpcomingYoutubeEventsCount(count: number): Promise<void> {
    return this.setCell("B3", count)
  }
  reportValidatedEvents(date: Date): Promise<void> {
    return this.setCell("B4", serialFromDate(date))
  }
  reportCheckedForIminentEvents(date: Date): Promise<void> {
    return this.setCell("B5", serialFromDate(date))
  }
  reportRanMonitoringTask(date: Date): Promise<void> {
    this.ranMonitoringTask = date
    return this.setCell("B6", serialFromDate(date))
  }
  reportRanCleanupTask(date: Date): Promise<void> {
    return this.setCell("B7", serialFromDate(date))
  }
  reportAppStarted(date: Date): Promise<void> {
    return this.setCell("B8", serialFromDate(date))
  }
}