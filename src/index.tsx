import React, { Component } from 'react';
import * as ReactDOM from "react-dom";
import { LiveBroadcast } from './YoutubeClient';
import './style.css';
import { Container, Row, Col, ListGroup } from 'react-bootstrap';
import { YoutubeStatusListItem } from './components/YoutubeStatus';
import { BroadcastControl } from './components/BroadcastControl';

interface ParentState {
  upcoming: LiveBroadcast | null;
}
export class Parent extends Component<{}, ParentState> {
  state = {
    upcoming: null
  }

  private fetchUpcoming: () => void = () => {
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
  }

  constructor(props: {}) {
    super(props)
    this.fetchUpcoming()
    setInterval(this.fetchUpcoming, 2000);
  }

  render(): JSX.Element {
    const upcoming = this.state.upcoming
    return (
      <Container className="mt-4">
        <Row>
          <Col>
            { upcoming ?
              <ListGroup className="mb-4">
                <YoutubeStatusListItem broadcast={upcoming} />
                <ListGroup.Item>
                  <BroadcastControl broadcast={upcoming} />
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
