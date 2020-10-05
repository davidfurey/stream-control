import OBSWebSocket from 'obs-websocket-js';

const obs = new OBSWebSocket();

//obs.connect({ address: 'localhost:4444' });

function connected(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((obs as any)._connected) {
    return Promise.resolve()
  } else {
    return obs.connect({ address: 'localhost:4444' });
  }
}


export function setScene(scene: string): Promise<void> {
  return connected().then(() => obs.send('SetCurrentScene', { "scene-name": scene }))
}

export function startStreaming(): Promise<void> {
  return connected().then(() => obs.send('StartStreaming', {}))
}

export function stopStreaming(): Promise<void> {
  return connected().then(() => obs.send('StopStreaming'))
}

export function setSceneCollection(collection: string): Promise<void> {
  return connected().then(() => obs.send('SetCurrentSceneCollection', { "sc-name": collection }))
}