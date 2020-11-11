import { EventStore, RunningEvent, Step, EndState } from "./events";
import { dateFromSerial, serialFromDate } from "./spreadsheet"
import { withAuth } from './google-oauth'
import { google, Common } from 'googleapis'
import { duration } from 'moment';

function returnVoid(): void {
  // function which returns void
}

export class SpreadsheetEventStore extends EventStore {
  setScheduledStartTime(eventId: string, scheduledStartTime: Date): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: '***REMOVED***',
        range: `event/${eventId}!B2`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `event/${eventId}!B2`,
          values: [ [ serialFromDate(scheduledStartTime) ] ],
        }
      }).then((response) => response.statusText)
    })()
  }
  createEvent(
    eventId: string,
    streamId: string,
    scheduledStartTime: Date,
    eventName: string,
    template: string
  ): Promise<void> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.get({
        spreadsheetId: '***REMOVED***',
        ranges: [],
        includeGridData: false
      }).then((response) => {
        const templateSheet = response.data.sheets?.find((sheet) => sheet.properties?.title === `template/${template}`)
        const templateId = templateSheet?.properties?.sheetId
        const sheetCount = response.data.sheets?.length
        if (typeof templateId !== "number") {
          throw `Template ${template} not found`
        }
        if (typeof sheetCount !== "number") {
          throw "Request did not return number of sheets"
        }
        return sheets.spreadsheets.batchUpdate({
          spreadsheetId: '***REMOVED***',
          requestBody: {
            requests: [
              {
                duplicateSheet: {
                  sourceSheetId: templateId,
                  insertSheetIndex: sheetCount,
                  newSheetName: `event/${eventId}`
                }
              }
            ],
            includeSpreadsheetInResponse: false
          }
        })
      }).then(() => {
        return sheets.spreadsheets.values.update({
          spreadsheetId: '***REMOVED***',
          range: `event/${eventId}!B1:B4`,
          valueInputOption: 'RAW',
          requestBody: {
            range: `event/${eventId}!B1:B4`,
            values: [
              [ eventName ],
              [ serialFromDate(scheduledStartTime) ],
              [ eventId],
              [streamId]
            ],
          }
        })
      }).then(returnVoid)
    })()
  }

  getEvent(eventId: string): Promise<RunningEvent> {
    return this.getSteps(eventId).then((steps) =>
      this.getMetadata(eventId).then((metadata) => {
        const event = {
          eventId,
          streamId: metadata.streamId,
          scheduledStartTime: metadata.scheduledStartTime,
          steps,
          running: false
        }
        return event
      })
    )
  }

  private stepsOffset = 7

  setStepStartTime(eventId: string, stepId: number, startTime: Date): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: '***REMOVED***',
        range: `event/${eventId}!E${stepId+this.stepsOffset}`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `event/${eventId}!E${stepId+this.stepsOffset}`,
          values: [ [ serialFromDate(startTime) ] ],
        }
      }).then((response) => response.statusText)
    })()
  }

  stepComplete(
    eventId: string,
    stepId: number,
    endTime: Date,
    state: EndState,
    message: string
  ): Promise<string> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.update({
        spreadsheetId: '***REMOVED***',
        range: `event/${eventId}!F${stepId+this.stepsOffset}:H${stepId+this.stepsOffset}`,
        valueInputOption: 'RAW',
        requestBody: {
          range: `event/${eventId}!F${stepId+this.stepsOffset}:H${stepId+this.stepsOffset}`,
          values: [ [ serialFromDate(endTime), state, message ] ],
        }
      }).then((response) => response.statusText)
    })()
  }

  private getSteps(eventId: string): Promise<Step[]> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.get({
        spreadsheetId: '***REMOVED***',
        range: `event/${eventId}!A${this.stepsOffset + 1}:J`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      }).then((res) => {
        const rows = res.data.values;
        if (rows?.length && rows?.length > 0) {
          return rows.map((row, index) => {
            return {
              id: index + 1,
              referenceTime: row[0],
              offset: duration(row[1] * 24 * 60 * 60 * 1000),
              action: row[2],
              parameter1: row[3],
              startTime: typeof row[4] === "number" ? dateFromSerial(row[4]) : undefined,
              endTime: typeof row[5] === "number" ? dateFromSerial(row[5]) : undefined,
              endState: row[6],
              message: row[7]
            }
          });
        }
        console.log('No data found.');
        throw "No data found"
      });
    })()
  }


  private getMetadata(eventId: string): Promise<{
    name: string;
    scheduledStartTime: Date;
    streamId: string;
  }> {
    return withAuth((auth: Common.OAuth2Client) => {
      const sheets = google.sheets({version: 'v4', auth});
      return sheets.spreadsheets.values.get({
        spreadsheetId: '***REMOVED***',
        range: `event/${eventId}!B1:B4`,
        valueRenderOption: 'UNFORMATTED_VALUE'
      }).then((res) => {
        const rows = res.data.values;
        if (rows?.length && rows?.length === 4) {
          return {
            name: rows[0][0],
            scheduledStartTime: dateFromSerial(rows[1][0]),
            streamId: rows[3][0],
          }
        }
        console.log('No data found.');
        throw "No data found"
      });
    })()
  }
}