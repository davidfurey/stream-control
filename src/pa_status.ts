import fetch from 'node-fetch'

interface PaStatus {
  pa: "on" | "off";
}

export function paState(): Promise<"on" | "off"> {
  return fetch('http://stream-control:5000/status').then((response) => {
    if (response.status >= 200 || response.status < 300) {
      return response.json().then((body) => {
        const parsed: PaStatus = body
        return parsed.pa
      })
    }
    throw new Error('Failed to fetch pa status');
  })
}