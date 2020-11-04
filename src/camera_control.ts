import fetch from 'node-fetch'

interface CameraDetails {
  hostname: string;
}

const cameras: { [camera: string]: CameraDetails } = {
  "left pillar": {
    hostname: "controller-3",
  },
  "right pillar": {
    hostname: "controller-1",
  },
  "font pillar": {
    hostname: "controller-4",
  },
  "organ loft": {
    hostname: "controller-2"
  }
}

export function cameraOn(camera: string): Promise<string> {
  const cameraData = cameras[camera.toLowerCase()]
  if (cameraData) {
    return fetch(`http://${cameraData.hostname}:3040/api/camera/power/on`, { method: 'POST' })
      .then(res => {
        if (res.status >= 200 && res.status < 300) {
          return `Camera ${camera} is on`
        } else {
          throw(`Error turning camera ${camera} on. Status = ${res.status}`)
        }
      })
  } else {
    return Promise.reject(`Camera ${camera} not recognised`)
  }
}

export function cameraOff(camera: string): Promise<string> {
  const cameraData = cameras[camera.toLowerCase()]
  if (cameraData) {
    return fetch(`http://${cameraData.hostname}:3040/api/camera/power/off`, { method: 'POST' })
      .then(res => {
        if (res.status >= 200 && res.status < 300) {
          return `Camera ${camera} is off`
        } else {
          throw(`Error turning camera ${camera} off. Status = ${res.status}`)
        }
      })
  } else {
    return Promise.reject(`Camera ${camera} not recognised`)
  }
}