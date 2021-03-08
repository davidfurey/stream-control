import fetch from 'node-fetch'

const apiBase = 'http://localhost:3040/api'

function success(status: number): boolean {
  return status >= 200 && status < 300
}

const headers = {
  'Content-Type': 'application/json'
}

export function loadEvent(id: string): Promise<string> {
  return fetch(`${apiBase}/events/${id}/load`, { method: 'POST'})
    .then(res => {
      if (success(res.status)) {
        return `Loaded event ${id}`
      } else {
        throw(`Error loading event ${id}`)
      }
    })
}

export function transition(displayId: string, componentId: string): Promise<string> {
  return fetch(`${apiBase}/displays/${displayId}/load`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inComponentId: componentId,
      transistionDuration: 500,
      transition: "default"
    })
  })
  .then(res => {
    if (success(res.status)) {
      return `Transitioned ${componentId} on display ${displayId}`
    } else {
      throw(`Error transistioning component ${componentId} on display ${displayId}`)
    }
  })
}

export function setParameter(eventId: string, name: string, value: string): Promise<string> {
  return fetch(`${apiBase}/events/${eventId}/parameters/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      value
    })
  })
  .then(res => {
    if (success(res.status)) {
      return `Set ${name} to ${value} for ${eventId}`
    } else {
      throw(`Error setting ${name} to ${value} for ${eventId}`)
    }
  })
}

export function eventByName(name: string): Promise<string> {
  return fetch(`${apiBase}/events?q=name:${encodeURIComponent(name)}`)
    .then(res => {
      if (success(res.status)) {
        return res.json().then((json) => {
          if (Array.isArray(json) && json.length === 1 && json[0].id) {
            return json[0].id
          } else {
            throw(`Error finding event named ${name}`)
          }
        })
      } else {
        throw(`Error finding event named ${name}`)
      }
    })
}

export function displayByName(name: string): Promise<string> {
  return fetch(`${apiBase}/displays?q=name:${encodeURIComponent(name)}`)
    .then(res => {
      if (success(res.status)) {
        return res.json().then((json) => {
          if (Array.isArray(json) && json.length === 1 && json[0].id) {
            return json[0].id
          } else {
            throw(`Error finding display named ${name}`)
          }
        })
      } else {
        throw(`Error finding display named ${name}`)
      }
    })
}

export function componentByName(eventId: string, name: string): Promise<string> {
  return fetch(`${apiBase}/events/${eventId}/components?q=name:${encodeURIComponent(name)}`)
    .then(res => {
      if (success(res.status)) {
        return res.json().then((json) => {
          if (Array.isArray(json) && json.length === 1 && json[0].id) {
            return json[0].id
          } else {
            throw(`Error finding component named ${name} in event ${eventId}`)
          }
        })
      } else {
        throw(`Error finding component named ${name} in event ${eventId}`)
      }
    })
}