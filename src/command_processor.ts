import { setScene, startStreaming, stopStreaming, setSceneCollection, isObsError } from "./obs"
import * as Camera from './camera_control'
import { YoutubeClientImpl } from './youtube'
import { paState } from './pa_status'
import * as Gato from "./gato"
import * as Mixer from "./mixer"

const youtubeClient = new YoutubeClientImpl()

function poll(
  fn: () => Promise<string | null>,
  resolve: (s: string) => void,
  reject: (s: unknown) => void,
  maxAttempts: number,
): void {
  fn().then((result) => {
    if (result) {
      resolve(result)
    } else {
      if (maxAttempts > 0) {
        setTimeout(() => poll(fn, resolve, reject, maxAttempts - 1), 1000)
      } else {
        reject("Timeout")
      }
    }
  }).catch((e) => {
    console.warn(`Error (${e} while polling, retrying anyway`)
    if (maxAttempts > 0) {
      setTimeout(() => poll(fn, resolve, reject, maxAttempts - 1), 1000)
    } else {
      reject("Timeout")
    }
  })
}

function waitForLiveStreamReady(boundStreamId: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    poll(() => {
      return youtubeClient.liveStream(boundStreamId).then((streams) => {
        if (streams[0].status === "active") {
          return `Stream ${boundStreamId}is now active`
        } else {
          return null
        }
      })
    }, resolve, (err) => reject(`Error waiting for streamd ${boundStreamId}: ${JSON.stringify(err)}`), 60)
  })
}

function waitForLiveBroadcastTesting(eventId: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    poll(() => {
      return youtubeClient.liveBroadcast(eventId).then((broadcast) => {
        if (broadcast?.status === "testing") {
          return `Broadcast is now testing`
        } else {
          return null
        }
      })
    }, resolve, (err) => reject(`Error waiting for live broadcast ${eventId} testing: ${JSON.stringify(err)}`), 60)
  })
}

function waitForPA(requiredState: "on" | "off"): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    poll(() => {
      return paState().then((actualState) => {
        if (actualState === requiredState) {
          return `PA is now ${actualState}`
        } else {
          return null
        }
      })
    }, resolve, (err) => reject(`Error waiting for PA ${requiredState}: ${JSON.stringify(err)}`), 7200) // todo: don't go beyond event max time
  })
}

function waitForPAOn(_: string): Promise<string> {
  return waitForPA("on") // todo: add parameter for max time to wait?
}

function waitForPAOff(_: string): Promise<string> {
  return waitForPA("off")
}

function cameraOn(camera: string): Promise<string> {
  return Camera.cameraOn(camera)
}

function cameraOff(camera: string): Promise<string> {
  return Camera.cameraOff(camera)
}

function startYoutubeTestBroadcast(eventId: string): Promise<string> {
  return youtubeClient.updateBroadcastStatus(eventId, "testing")
}

function startYoutubeLiveBroadcast(eventId: string): Promise<string> {
  return youtubeClient.updateBroadcastStatus(eventId, "live")
}

export function stopYoutubeLiveBroadcast(eventId: string): Promise<string> {
  return youtubeClient.updateBroadcastStatus(eventId, "complete")
}

function getParameters(input: string, names: string[]): string[] {
  const params = input.split(",")
  if (params.length === names.length) {
    return params.map((p) => decodeURIComponent(p))
  }
  throw(`Parameter must be ${names.map((s) => `<${s}>`).join(",")}`)
}

export function addToPlaylist(parameters: string): Promise<string> {
  try {
    const [eventId, playlistId] = getParameters(parameters, ["eventId", "playlistId"])
    return youtubeClient.addToPlaylist(eventId, playlistId)
  } catch(err) {
    return Promise.reject(err)
  }
}

function startOBSStream(_: string): Promise<string> {
  try {
    return startStreaming().then(() => `Started OBS streaming`).catch((err) => {
      if (isObsError(err) && err.error === "streaming already active") {
        return startStreaming().then(() => `OBS already streaming`)
      } else {
        throw err
      }
    })
  } catch(err) {
    return Promise.reject(err)
  }
}

function stopOBSStream(_: string): Promise<string> {
  return stopStreaming().then(() => `Stopped OBS streaming`)
}

function loadSceneCollection(collection: string): Promise<string> {
  console.log("Loading scene collection")
  return setSceneCollection(collection).then(() => `Set scene collection to ${collection}`)
}

function loadScene(scene: string): Promise<string> {
  return setScene(scene).then(() => `Set scene to ${scene}`)
}

function loadGatoEvent(eventName: string): Promise<string> {
  return Gato.eventByName(eventName).then((eventId) =>
    Gato.loadEvent(eventId)
  )
}

function componentOnPictureBox(componentName: string): Promise<string> {
  try {
    return Gato.displayByName("Picture Box").then((displayId) =>
      Gato.componentByName("current", componentName).then((componentId) =>
        Gato.transition(displayId, componentId)
      )
    )
  } catch(err) {
    return Promise.reject(err)
  }
}

function setGatoParameter(parameters: string): Promise<string> {
  try {
    const [name, value] = getParameters(parameters, ["name", "value"])
    return Gato.setParameter("current", name, value)
  } catch(err) {
    return Promise.reject(err)
  }
}

function resetMixer(_: string): Promise<string> {
  Mixer.reset()
  return Promise.resolve("Mixer reset")
}

const commands: { [command: string]: (s: string) => Promise<string> } = {
  "Wait for PA on": waitForPAOn,
  "Wait for PA off": waitForPAOff,
  "Wait for LiveStream ready": waitForLiveStreamReady,
  "Camera on": cameraOn,
  "Camera off": cameraOff,
  "Start LiveBroadcast": startYoutubeLiveBroadcast,
  "Preview LiveBroadcast": startYoutubeTestBroadcast,
  "Wait for LiveBroadcast ready": waitForLiveBroadcastTesting,
  "Stop LiveBroadcast": stopYoutubeLiveBroadcast,
  "Add to playlist": addToPlaylist,
  "Start OBS streaming": startOBSStream,
  "Stop OBS streaming": stopOBSStream,
  "Load scene collection": loadSceneCollection,
  "Select scene": loadScene,
  "Load Gato event": loadGatoEvent,
  "Component on Picture box": componentOnPictureBox,
  "Set Gato parameter": setGatoParameter,
  "Reset mixer": resetMixer,
}

export function process(command: string, arg1: string): Promise<string> {
  console.log(`Running ${command}`)
  if (commands[command]) {
    return commands[command](arg1)
  } else {
    return Promise.resolve(`Command ${command} not implemented`)
  }
}