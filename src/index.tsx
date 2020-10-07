import React, { Component } from 'react';
import * as ReactDOM from "react-dom";
import { LiveBroadcast, LiveStream } from './YoutubeClient';
import './style.css';
import { Container, Row, Col, ListGroup } from 'react-bootstrap';
import { YoutubeStatusListItem } from './components/YoutubeStatus';
import { BroadcastControl } from './components/BroadcastControl';

interface ParentState {
  broadcasts: LiveBroadcast[];
  streams: LiveStream[];
  upcoming: LiveBroadcast | null;
}
export class Parent extends Component<{}, ParentState> {
  state = {
    broadcasts: [],
    streams: [],
    upcoming: null
  }

  constructor(props: {}) {
    super(props)
    fetch('youtube/upcoming').then((response) => {
      if (response.status >= 200 || response.status < 300) {
        response.json().then((body) => {
          const parsed: LiveBroadcast[] = body.broadcasts
          this.setState((prev => {
            return {
              ...prev,
              upcoming: parsed[0]
            }
          })
        )})
      } else {
        throw new Error('Failed to fetch broadcasts');
      }
    }).catch((e) => {
      throw new Error(`Failed to fetch broadcasts. Exception: ${e}`);
    })
    fetch('youtube/streams').then((response) => {
      if (response.status >= 200 || response.status < 300) {
        response.json().then((body) =>
          this.setState((prev => {
            return {
              ...prev,
              streams: body.streams
            }
          })
        ))
      } else {
        throw new Error('Failed to fetch streams');
      }
    }).catch((e) => {
      throw new Error(`Failed to fetch streams. Exception: ${e}`);
    })

    setInterval(() => {
      fetch('youtube/upcoming').then((response) => {
        if (response.status >= 200 || response.status < 300) {
          response.json().then((body) => {
            const parsed: LiveBroadcast[] = body.broadcasts
            this.setState((prev => {
              return {
                ...prev,
                upcoming: parsed[0]
              }
            })
          )})
        } else {
          throw new Error('Failed to fetch broadcasts');
        }
      }).catch((e) => {
        throw new Error(`Failed to fetch broadcasts. Exception: ${e}`);
      })
      fetch('youtube/streams').then((response) => {
        if (response.status >= 200 || response.status < 300) {
          response.json().then((body) =>
            this.setState((prev => {
              return {
                ...prev,
                streams: body.streams
              }
            })
          ))
        } else {
          throw new Error('Failed to fetch streams');
        }
      }).catch((e) => {
        throw new Error(`Failed to fetch streams. Exception: ${e}`);
      })
    }, 1000);
  }

  render(): JSX.Element {
    const upcoming = this.state.upcoming
    const stream = this.state.streams[0]
    return (
      <Container className="mt-4">
        <Row>
          <Col>
            <h3>Next broadcast</h3>
            { upcoming && stream ?
              <ListGroup className="mb-4">
                <YoutubeStatusListItem broadcast={upcoming} stream={stream} />
                <ListGroup.Item>
                  <BroadcastControl broadcast={upcoming} stream={stream} />
                </ListGroup.Item>
              </ListGroup>:
              "No upcoming broadcasts"
            }
          </Col>
        </Row>
      </Container>
    )
  }
}

ReactDOM.render(
  <Parent />,
  document.getElementById("root")
);
