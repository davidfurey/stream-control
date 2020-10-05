import moment from 'moment';
import React, { Component } from 'react';
import { Badge, ListGroup } from 'react-bootstrap';
import { LiveBroadcast, LiveStream, LifecycleStatus, StreamStatus, HealthStatus } from '../youtube';

export interface YoutubeStatusProps {
  broadcast: LiveBroadcast;
  stream: LiveStream;
}

function LifeCycleStatusBadge(props: { status: LifecycleStatus }): JSX.Element {
  switch(props.status) {
    case "complete": return <Badge variant="info">Broadcast Complete</Badge>
    case "created": return <Badge variant="danger">Broadcast Created</Badge>
    case "live": return <Badge variant="info">Broadcast live</Badge>
    case "liveStarting": return <Badge variant="info">Broadcast starting</Badge>
    case "ready": return <Badge variant="info">Broadcast ready</Badge>
    case "revoked": return <Badge variant="danger">Broadcast revoked</Badge>
    case "testStarting": return <Badge variant="info">Broadcast test starting</Badge>
    case "testing": return <Badge variant="info">Broadcast testing</Badge>
  }
}

function StreamStatusBadge(props: { status: StreamStatus; health: HealthStatus}): JSX.Element {
  switch(props.status) {
    case "active":
      switch(props.health) {
        case "good": return <Badge variant="success">Good signal</Badge>
        case "ok": return <Badge variant="warning">Ok signal</Badge>
        case "bad": return <Badge variant="danger">Bad signal</Badge>
        case "noData": return <Badge variant="secondary">No data</Badge>
      }
      break
    case "created": return <Badge variant="danger">Stream created</Badge>
    case "inactive": return <Badge variant="secondary">Stream inactive</Badge>
    case "error": return <Badge variant="danger">Stream error</Badge>
    case "ready": return <Badge variant="danger">Stream ready</Badge>
  }
}

export class YoutubeStatus extends Component<YoutubeStatusProps, {}> {
  state = {}

  render(): JSX.Element {
    const titleClass = this.props.broadcast.status === "live" ? "btn btn-danger" : "btn btn-primary"

    return (
      <div className="btn-toolbar mb-3" role="toolbar">
        <div className="btn-group btn-group-sm d-flex w-100" role="group" aria-label="First group">
          <div className={titleClass} style={{minWidth: "10em"}}>{ this.props.broadcast.title }</div>
          <button className="btn btn-secondary w-100">{
            moment(this.props.broadcast.scheduledStartTime).format('h:mm a on DD/MM/YYYY')
          }</button>
          <LifeCycleStatusButton status={this.props.broadcast.status} />
          <StreamStatusButton
            status={this.props.stream.status}
            health={this.props.stream.healthStatus}
          />
        </div>
        </div>
    )
  }
}

export function YoutubeStatusListItem(props: YoutubeStatusProps): JSX.Element {
  return <ListGroup.Item>
    <div className="d-flex w-100 justify-content-between align-items-center">
      { props.broadcast.title }
      <span>
        <LifeCycleStatusBadge status={props.broadcast.status} />
        <StreamStatusBadge
          status={props.stream.status}
          health={props.stream.healthStatus}
        />
      </span>
    </div>
    <small>{ moment(props.broadcast.scheduledStartTime).format('Do MMMM YYYY @ h:mm a') }</small>
  </ListGroup.Item>
}