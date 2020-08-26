import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap'
import moment from 'moment';
import { LiveBroadcast } from '../youtube'

function BroadcastListItem(props: {
  broadcast: LiveBroadcast;
 }): JSX.Element {
  return <ListGroup.Item>
    <div className="d-flex w-100 justify-content-between align-items-center">
      { props.broadcast.title }
      <Badge variant="primary">{ props.broadcast.status }</Badge>
    </div>
    <small>{ moment(props.broadcast.scheduledStartTime).format('Do MMMM YYYY @ h:mm a') }</small>
  </ListGroup.Item>
}

export function BroadcastList(
  props: {
    broadcasts: LiveBroadcast[];
  }
): JSX.Element {
  return <ListGroup className="mb-4">
    {props.broadcasts.map((broadcast) =>
      <BroadcastListItem
        key={broadcast.id}
        broadcast={broadcast}
      />
    )}
  </ListGroup>
}