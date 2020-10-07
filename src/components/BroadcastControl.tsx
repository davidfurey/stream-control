import React, { Component } from 'react';
import { isYoutubeErrorResponse, LiveBroadcast } from '../YoutubeClient';

export interface BroadcastControlProps {
  broadcast: LiveBroadcast;
}

function setStatus(broadcastId: string, status: "testing" | "complete" | "live"): void {
  fetch(`youtube/${broadcastId}/${status}`, {
    method: 'POST'
  }).then((response) => {
    if (response.status === 200) {
      console.log(`Set ${broadcastId} to ${status}`)
    } else {
      response.json().then((json) => {
        if (isYoutubeErrorResponse(json)) {
          window.alert(`Failed to set broadcast to ${status}: ${json.errors[0].message}`)
        } else {
          window.alert(`Failed to set broadcast to ${status}`)
          console.error(json)
        }
      })
    }
  }).catch((e) => {
    window.alert(`Failed to set broadcast to ${status}`)
    console.error(e)
  })
}

export class BroadcastControl extends Component<BroadcastControlProps, {}> {
  state = {}

  render(): JSX.Element {
    switch (this.props.broadcast.status) {
      case "ready": return <button className="btn btn-primary" onClick={(): void => setStatus(this.props.broadcast.id, "testing")}>Prepare</button>
      case "live": return <button className="btn btn-warning" onClick={(): void => setStatus(this.props.broadcast.id, "complete")}>Stop</button>
      case "liveStarting": return <button className="btn btn-danger" disabled>Starting</button>
      case "testing": return <button className="btn btn-danger" onClick={(): void => setStatus(this.props.broadcast.id, "live")}>Start</button>
      case "testStarting": return <button className="btn btn-secondary" disabled>Test starting</button>
      case "complete": return <button className="btn btn-secondary" disabled>Complete</button>
      default: return <button className="btn btn-secondary" disabled>Broadcast not ready</button>
    }
  }
}