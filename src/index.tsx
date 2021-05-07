import React, { useState, useEffect } from 'react';
import * as ReactDOM from "react-dom";
import { LiveBroadcast } from './YoutubeClient';
import './style.css';
import { Container, Row, Col, ListGroup, Button } from 'react-bootstrap';
import { YoutubeStatusListItem } from './components/YoutubeStatus';
import { BroadcastControl } from './components/BroadcastControl';
import { MixerChannel } from './mixer';
import { AudioChannel } from './audio_channel';

interface ParentState {
  upcoming: LiveBroadcast | null;
}

function Parent(_props: {}): JSX.Element {

  const [upcoming, setUpcoming] = useState<LiveBroadcast | null>(null)
  const [mixer, setMixer] = useState<MixerChannel[]>([])

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetch('youtube/upcoming').then((response) => {
        if (response.status >= 200 || response.status < 300) {
          response.json().then((body) => {
            const parsed: LiveBroadcast[] = body.broadcasts
            setUpcoming(parsed[0])
          })
        } else {
          throw new Error('Failed to fetch broadcasts');
        }
      }).catch((e) => {
        throw new Error(`Failed to fetch broadcasts. Exception: ${e}`);
      })

      fetch('mixer/status').then((response) => {
        if (response.status >= 200 || response.status < 300) {
          response.json().then((body) => {
            const parsed: MixerChannel[] = body.channels
            setMixer(parsed)
          })
        } else {
          throw new Error('Failed to fetch mixer status');
        }
      }).catch((e) => {
        throw new Error(`Failed to fetch mixer status. Exception: ${e}`);
      })
    }, 1000)
    return (): void => {
      clearInterval(intervalId)
    }
  }, [])

  return (
    <Container className="mt-2" fluid>
      <Row>
        <Col>
          <ListGroup>
            { upcoming ?
              <YoutubeStatusListItem broadcast={upcoming} /> :
              <ListGroup.Item>No upcoming broadcasts</ListGroup.Item>
            }
            { mixer.length > 0 ?
              <ListGroup.Item>
              { mixer.map((c) =>
                <AudioChannel
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  muted={c.volume === 0}
                  flash={c.warn}
                />
              )}
              </ListGroup.Item> :
              <ListGroup.Item>No mixer channels</ListGroup.Item>
            }
            </ListGroup>
        </Col>
      </Row>
    </Container>
  )
}

ReactDOM.render(
  <Parent />,
  document.getElementById("root")
);
