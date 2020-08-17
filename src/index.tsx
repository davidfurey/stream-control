import React, { Component } from 'react';
import * as ReactDOM from "react-dom";

export class Parent extends Component<{}, {}> {
  state = {}

  constructor(props: {}) {
    super(props)
  }

  render(): JSX.Element {
    return (
      <h1>Hello world</h1>
    )
  }
}

ReactDOM.render(
  <Parent />,
  document.getElementById("root")
);
