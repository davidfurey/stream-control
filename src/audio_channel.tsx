import React, { useState, useEffect } from 'react';
import './style.css';
import { Button, ButtonGroup } from 'react-bootstrap';

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

  return <ButtonGroup vertical size="sm" className="mr-2">
    <Button variant="info" as="div" style={{pointerEvents: "none"}}>{ props.name }</Button>
    {props.muted ?
      <Button variant="secondary" onClick={(): void => { fade(1.0) }} style={{minWidth: "5.5em"}}>
        Unmute
      </Button> :
      <Button variant="secondary" onClick={(): void => { fade(0) }} style={{minWidth: "5.5em"}}>
        Mute
      </Button>
    }
    { props.muted ?
      <Button variant={"danger"} as="div" style={{pointerEvents: "none", opacity: flashing && props.flash ? "0.65" : "1"}}>Disabled</Button> :
      <Button variant="success" as="div" style={{pointerEvents: "none"}}>Active</Button>
    }
  </ButtonGroup>
}