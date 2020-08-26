import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap'
import { LiveStream, StreamStatus, HealthStatus } from '../youtube'
import { Variant } from 'react-bootstrap/esm/types';

function StreamStatusBadge(props: {
  status: StreamStatus;
}): JSX.Element {
  const variantForStatus: { [P in StreamStatus]: Variant } = {
    active: 'primary',
    created: 'warn',
    error: 'danger',
    inactive: 'secondary',
    ready: 'success',
  }

  return <Badge className="mr-1" variant={variantForStatus[props.status]}>{ props.status }</Badge>
}

function HealthStatusBadge(props: {
  status: HealthStatus;
}): JSX.Element {
  const variantForStatus: { [P in HealthStatus]: Variant } = {
    good: 'success',
    ok: 'warn',
    bad: 'danger',
    noData: 'secondary'
  }

  const labelForStatus: { [P in HealthStatus]: string } = {
    good: 'Good',
    ok: 'OK',
    bad: 'Bad',
    noData: 'No data'
  }

  return <Badge className="mr-1" variant={variantForStatus[props.status]}>{ labelForStatus[props.status] }</Badge>
}

function StreamListItem(props: {
  stream: LiveStream;
 }): JSX.Element {
  return <ListGroup.Item>
    <div className="d-flex w-100 justify-content-between align-items-center">
      { props.stream.title }
      <span>
        <StreamStatusBadge status={props.stream.status} />
        <HealthStatusBadge status={props.stream.healthStatus} />
      </span>
    </div>
  </ListGroup.Item>
}

export function StreamList(
  props: {
    streams: LiveStream[];
  }
): JSX.Element {
  return <ListGroup>
    {props.streams.map((stream) =>
      <StreamListItem
        key={stream.id}
        stream={stream}
      />
    )}
  </ListGroup>
}