import {OSCClient, OSCType} from 'ts-osc';
import fs from 'fs'

const CONFIG_DIR = process.env.CONFIG_DIR || '/etc/stream-control/';

interface MixerConfig {
  channels: MixerChannel[];
  port: number;
  host: string;
}

export interface MixerChannel {
  name: string;
  id: string;
  volumeAddress: string;
  volume: number;
  warn: boolean;
}

let client: OSCClient | null = null

const desiredState: Record<string, number> = {}
let timeout: NodeJS.Timeout | null = null;

let mixerState: MixerChannel[] = []

function sendVolume(channel: MixerChannel, volume: number): void {
  if (client) {
    try {
      client.send(channel.volumeAddress, OSCType.Float, volume);
      channel.volume = volume;
    } catch(err) {
      console.error("Exception while setting volume")
      console.error(err)
    }
  } else {
    console.error("Client not initialised")
  }
}

function doFade(): void {
  timeout = setInterval(() => {
    const continueFading = mixerState.reduce((isFadingInProgress, channel) => {
      const currentVolume = channel.volume
      const desiredVolume = desiredState[channel.id] || 0
      if (currentVolume === desiredVolume) {
        return isFadingInProgress
      } else {
        const delta = currentVolume < desiredVolume ? 0.02 : -0.02
        const newVolume = Math.abs(desiredVolume - currentVolume) < 0.02 ?
          desiredVolume : currentVolume + delta
        sendVolume(channel, newVolume)
        return true
      }
    }, false)
    if (!continueFading && timeout) {
      clearInterval(timeout)
      timeout = null
    }
  }, 10)
}

function setVolume(channel: MixerChannel, volume: number): void {
  desiredState[channel.id] = volume;
  sendVolume(channel, volume)
}

export function fadeVolume(unitId: string, volume: number): void {
  desiredState[unitId] = volume
  if (timeout === null) {
    doFade()
  }
}

export function init(): void {
  fs.promises.readFile(`${CONFIG_DIR}mixer.json`, 'utf8').then((data) => {
    const config = JSON.parse(data) as MixerConfig
    client = new OSCClient(config.host, config.port);
    mixerState = JSON.parse(JSON.stringify(config.channels));
    mixerState.forEach((c) => {
      setVolume(c, c.volume)
    })
  }).catch((error) => { console.log("Error parsing mixer config"); console.log(error) })
}

export function reset(): void {
  init()
}

export function status(): { channels: MixerChannel[] } {
  return {
    channels: mixerState
  }
}