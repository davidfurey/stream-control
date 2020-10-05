import fetch from 'node-fetch'

interface CameraDetails {
  hostname: string;
}

const cameras: { [camera: string]: CameraDetails } = {
  "Left Pillar": {
    hostname: "controller-3",
  },
  "Right Pillar": {
    hostname: "controller-1",
  },
  "Font Pillar": {
    hostname: "controller-4",
  },
  "Organ Loft": {
    hostname: "controller-2"
  }
}

export function cameraOn(camera: string): Promise<string> {
  const cameraData = cameras[camera]
  return Promise.resolve("Dummy success")
  if (cameraData) {
    return fetch(`http://${cameraData.hostname}/api/on`, { method: 'POST' })
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
  const cameraData = cameras[camera]
  return Promise.resolve("Dummy success")
  if (cameraData) {
    return fetch(`http://${cameraData.hostname}/api/off`, { method: 'POST' })
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