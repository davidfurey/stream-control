import React from "react";
import { EventRunner } from "../eventrunner";
import { RunningEvent } from "../events";

export function applicationStart(): JSX.Element {
  return <>
    <h1>Stream automation</h1>
    <p>Application starting</p>
  </>
}

export function scheduledTaskMissed(jobName: string, interval: string, lastRan: Date): JSX.Element {
  return <>
    <h1>Scheduled task missed</h1>
    <p>Should run task {jobName} every {interval},
    but last check was at {lastRan.toLocaleString()}`</p>
  </>
}

export function startingEvent(name: string, event: RunningEvent): JSX.Element {
  return <>
    <h1>Event starting</h1>
    <p>Preparing to stream event {name},
    which is due to broadcast at {event.scheduledStartTime.toISOString()}</p>
    <h2>Running order</h2>
    <table>
      <tr>
        <th>Time</th>
        <th>Action</th>
        <th>Parameter</th>
      </tr>
      { event.steps.map((step, i) =>
        <tr key={i}>
          <td>{
            step.referenceTime === "Relative" ? "+" + step.offset.toISOString() :
            (new Date(event.scheduledStartTime.getTime() +
              step.offset.asMilliseconds())).toISOString()
          }</td>
          <td>{step.action}</td>
          <td>{step.parameter1}</td>
        </tr>
      )}
    </table>
  </>
}

export function stepFailure(
  name: string,
  event: RunningEvent,
  stepId: number,
  error: string
): JSX.Element {
  return <>
    <h1>Event error</h1>
    <p>An error occured while streaming {name}</p>
    <pre>{error}</pre>
    <h2>Running order</h2>
    <table>
      <tr>
        <th>Scheduled Time</th>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Action</th>
        <th>Parameter</th>
        <th>Result</th>
      </tr>
      { event.steps.map((step, i) =>
        <tr key={i} style={{ backgroundColor: i === (stepId - 1) ? "red" : "default"}}>
          <td>{
            step.referenceTime === "Relative" ? "+" + step.offset.toISOString() :
            new Date(event.scheduledStartTime.getTime() +
              step.offset.asMilliseconds()).toISOString()
          }</td>
          <td>{step.startTime?.toLocaleTimeString()}</td>
          <td>{step.endTime?.toLocaleTimeString()}</td>
          <td>{step.action}</td>
          <td>{step.parameter1}</td>
          <td>{step.message}</td>
        </tr>
      )}
    </table>
  </>
}

export function overrunEvent(
  name: string,
  lastEventTime: Date,
  event: RunningEvent,
  now: Date = new Date()
): JSX.Element {
  return <>
    <h1>Event overrun</h1>
    <p>{name} has overrun.  It was due to finish by {lastEventTime.toISOString()}
    but is was still running at {now.toISOString()}. Youtube event has been stopped but
    cameras may still be on.</p>
    <h2>Running order</h2>
    <table>
      <tr>
        <th>Scheduled Time</th>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Action</th>
        <th>Parameter</th>
        <th>Result</th>
      </tr>
      { event.steps.map((step, i) =>
        <tr key={i}>
          <td>{
            step.referenceTime === "Relative" ? "+" + step.offset.toISOString() :
            new Date(event.scheduledStartTime.getTime() +
              step.offset.asMilliseconds()).toISOString()
          }</td>
          <td>{step.startTime}</td>
          <td>{step.endTime}</td>
          <td>{step.action}</td>
          <td>{step.parameter1}</td>
          <td>{step.message}</td>
        </tr>
      )}
    </table>
  </>
}

export function genericError(
  name: string,
  error: string,
): JSX.Element {
  return <>
    <h1>Error occured - {name}</h1>
    <code>{ error }</code>
  </>
}