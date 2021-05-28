import React, { useState, useEffect } from 'react';
import './style.css';
import { Badge, Button, Card, ListGroup } from 'react-bootstrap';

export function AudioChannel(props: {
  name: string;
  id: string;
  muted: boolean;
  flash?: boolean;
}): JSX.Element {
  const [flashing, toggleFlashing] = useState<boolean>(true)

  useEffect(() => {
    if (props.flash) {
      const intervalId = setInterval(() => toggleFlashing((v) => !v), 500)
      return (): void => clearInterval(intervalId)
    } else {
      return (): void => undefined
    }
  }, [props.flash])

  function fade(volume: number): Promise<Response> {
    return fetch(`mixer/channels/${props.id}/volume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: volume,
      })
    })
  }

  return <Card style={{width: "7em"}} className="float-left mr-2 bg-secondary">
    <Card.Header className="col-form-label-sm px-1 py-1 bg-primary text-center">{ props.name }</Card.Header>
    <ListGroup variant="flush">
    <ListGroup.Item className="text-center border-0 pt-2 pb-0">
    { props.muted ?
      <Badge variant={"danger"} style={{opacity: flashing && props.flash ? "0.65" : "1"}}>Disabled</Badge> :
      <Badge variant="success">Active</Badge>
    }
    </ListGroup.Item>
    <ListGroup.Item className="text-center border-0 p-2">
    {props.muted ?
      <Button size="sm" variant="secondary" onClick={(): void => { fade(1.0) }} style={{minWidth: "5.5em"}}>
        Unmute
      </Button> :
      <Button size="sm" variant="secondary" onClick={(): void => { fade(0) }} style={{minWidth: "5.5em"}}>
        Mute
      </Button>
    }
    </ListGroup.Item>
    </ListGroup>
  </Card>
}