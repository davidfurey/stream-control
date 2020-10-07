import React, { Component } from 'react';
import { LiveBroadcast, LiveStream } from '../YoutubeClient';

export interface BroadcastControlProps {
  broadcast: LiveBroadcast;
  stream: LiveStream;
}

function setStatus(broadcastId: string, status: "testing" | "complete" | "live"): void {
  fetch(`youtube/${broadcastId}/${status}`, {
    method: 'POST'
  }).then((response) => {
    if (response.status === 200) {
      console.log(`Set ${broadcastId} to ${status}`)
    } else {
      window.alert(`Failed to set broadcast to ${status}`)
      response.text().then((r)=> console.error(r))
    }
  }).catch((e) => {
    window.alert(`Failed to set broadcast to ${status}`)
    console.error(e)
  })
}

export class BroadcastControl extends Component<BroadcastControlProps, {}> {
  state = {}

  render(): JSX.Element {
    this.props.stream.status

    if (this.props.stream.status === "active" || this.props.broadcast.status === "live") {
      switch (this.props.broadcast.status) {
        case "ready": return <button className="btn btn-primary" onClick={(): void => setStatus(this.props.broadcast.id, "testing")}>Prepare</button>
        case "live": return <button className="btn btn-warning" onClick={(): void => setStatus(this.props.broadcast.id, "complete")}>Stop</button>
        case "liveStarting": return <button className="btn btn-danger" disabled>Starting</button>
        case "testing": return <button className="btn btn-danger" onClick={(): void => setStatus(this.props.broadcast.id, "live")}>Start</button>
        case "testStarting": return <button className="btn btn-secondary" disabled>Test starting</button>
        case "complete": return <button className="btn btn-secondary" disabled>Complete</button>
        default: return <button className="btn btn-secondary" disabled>Broadcast not ready</button>
      }
    } else {
      return <button className="btn btn-secondary" disabled>Stream not ready</button>
    }
  }
}