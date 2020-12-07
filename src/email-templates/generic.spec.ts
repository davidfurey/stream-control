import { startingEvent } from "./generic";
import ReactDOMServer from 'react-dom/server';

const exampleRunningEvent = {
  eventId: "123456-evt_id",
  streamId: "abcdef-stream_id",
  scheduledStartTime: new Date(2000, 1, 1, 12, 0, 0),
  steps: [],
  running: true
}

describe('Email test suite', () => {
  it('Starting event email should render to HTML', () => {
    expect(
      ReactDOMServer.renderToString(startingEvent("Test Event", exampleRunningEvent))
    ).toEqual("<h1 data-reactroot=\"\">Event starting</h1><p data-reactroot=\"\">Preparing to stream event <!-- -->Test Event<!-- -->, which is due to broadcast at <!-- -->2000-02-01T12:00:00.000Z</p><h2 data-reactroot=\"\">Running order</h2><table data-reactroot=\"\"><tr><th>Time</th><th>Action</th><th>Parameter</th></tr></table>")
  });
});