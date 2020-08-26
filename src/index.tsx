import React, { Component } from 'react';
import * as ReactDOM from "react-dom";
import { LiveBroadcast, LiveStream } from './youtube';
import { BroadcastList } from './components/BroadcastList';
import { StreamList } from './components/StreamList';
import './style.css';
import { Container, Row, Col } from 'react-bootstrap';

interface ParentState {
  broadcasts: LiveBroadcast[];
  streams: LiveStream[];
}
export class Parent extends Component<{}, {}> {
  state = {
    broadcasts: [],
    streams: [],
  }

  constructor(props: {}) {
    super(props)
    fetch('http://localhost:3040/youtube/broadcasts').then((response) => {
      if (response.status >= 200 || response.status < 300) {
        response.json().then((body) =>
          this.setState((prev => {
            return {
              ...prev,
              broadcasts: body.broadcasts
            }
          })
        ))
      } else {
        throw new Error('Failed to fetch broadcasts');
      }
    }).catch((e) => {
      throw new Error(`Failed to fetch broadcasts. Exception: ${e}`);
    })
    fetch('http://localhost:3040/youtube/streams').then((response) => {
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
  }

  render(): JSX.Element {
    return (
      <Container className="mt-4">
        <Row>
          <Col sm="6">
            <h3>Upcoming broadcasts</h3>
            <BroadcastList broadcasts={this.state.broadcasts} />
            <h3>Stream keys</h3>
            <StreamList streams={this.state.streams} />
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
