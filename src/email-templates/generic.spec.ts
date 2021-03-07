import { applicationStart, overrunEvent, scheduledTaskMissed, startingEvent, stepFailure } from "./generic";

import ReactDOMServer from 'react-dom/server';
import { RunningEvent } from "../events";
import { duration } from 'moment';
import { EventRunner } from "../eventrunner";

const exampleRunningEvent: RunningEvent = {
  eventId: "123456-evt_id",
  streamId: "abcdef-stream_id",
  scheduledStartTime: new Date(2000, 11, 31, 12, 0, 0),
  steps: [],
  running: true
}

const exampleWithSteps: RunningEvent = {
  ...exampleRunningEvent,
  steps: [
    {
      id: 0,
      referenceTime: "Scheduled Start Time",
      offset: duration(0),
      action: "Some action",
      parameter1: "Some param",
      startTime: undefined,
      endTime: undefined,
      endState: "Failure",
      message: "Some message"
    },
    {
      id: 1,
      referenceTime: "Relative",
      offset: duration(0),
      action: "Some action",
      parameter1: "Some param",
      startTime: undefined,
      endTime: undefined,
      endState: "Failure",
      message: "Some message"
    }
  ]
}

describe('Email test suite', () => {
  it('Starting event email should render to HTML', () => {
    expect(
      ReactDOMServer.renderToString(startingEvent("Test Event", exampleRunningEvent))
    ).toEqual("<h1 data-reactroot=\"\">Event starting</h1><p data-reactroot=\"\">Preparing to stream event <!-- -->Test Event<!-- -->, which is due to broadcast at <!-- -->2000-12-31T12:00:00.000Z</p><h2 data-reactroot=\"\">Running order</h2><table data-reactroot=\"\"><tr><th>Time</th><th>Action</th><th>Parameter</th></tr></table>")
  });

  it('Application start email should render to HTML', () => {
    expect(
      ReactDOMServer.renderToString(applicationStart())
    ).toEqual("<h1 data-reactroot=\"\">Stream automation</h1><p data-reactroot=\"\">Application starting</p>")
  });

  it('Scheduled task missed email should render to HTML', () => {
    expect(
      ReactDOMServer.renderToString(scheduledTaskMissed("Test job", "foo", new Date(2000, 11, 31, 12, 0, 0)))
    ).toEqual("<h1 data-reactroot=\"\">Scheduled task missed</h1><p data-reactroot=\"\">Should run task <!-- -->Test job<!-- --> every <!-- -->foo<!-- -->, but last check was at <!-- -->31/12/2000, 12:00:00<!-- -->`</p>")
  });

  it('Step failure email should render to HTML', () => {
    expect(
      ReactDOMServer.renderToString(stepFailure("Event name", exampleWithSteps, 1, "Some error"))
    ).toEqual("<h1 data-reactroot=\"\">Event error</h1><p data-reactroot=\"\">An error occured while streaming <!-- -->Event name</p><pre data-reactroot=\"\">Some error</pre><h2 data-reactroot=\"\">Running order</h2><table data-reactroot=\"\"><tr><th>Scheduled Time</th><th>Start Time</th><th>End Time</th><th>Action</th><th>Parameter</th><th>Result</th></tr><tr style=\"background-color:red\"><td>2000-12-31T12:00:00.000Z</td><td></td><td></td><td>Some action</td><td>Some param</td><td>Some message</td></tr><tr style=\"background-color:default\"><td>+P0D</td><td></td><td></td><td>Some action</td><td>Some param</td><td>Some message</td></tr></table>")
  });

  it('Overrun event email should render to HTML', () => {
    expect(
      ReactDOMServer.renderToString(overrunEvent("Event name", new Date(2000, 11, 31, 12, 0, 0), exampleWithSteps, new Date(2000, 12, 1, 12, 0, 0)))
    ).toEqual("<h1 data-reactroot=\"\">Event overrun</h1><p data-reactroot=\"\">Event name<!-- --> has overrun.  It was due to finish by <!-- -->2000-12-31T12:00:00.000Z<!-- -->but is was still running at <!-- -->2001-01-01T12:00:00.000Z<!-- -->. Youtube event has been stopped but cameras may still be on.</p><h2 data-reactroot=\"\">Running order</h2><table data-reactroot=\"\"><tr><th>Scheduled Time</th><th>Start Time</th><th>End Time</th><th>Action</th><th>Parameter</th><th>Result</th></tr><tr><td>2000-12-31T12:00:00.000Z</td><td></td><td></td><td>Some action</td><td>Some param</td><td>Some message</td></tr><tr><td>+P0D</td><td></td><td></td><td>Some action</td><td>Some param</td><td>Some message</td></tr></table>")
  });
});
