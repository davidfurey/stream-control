import { paState } from "../pa_status"
import { DataStores } from "../scheduled_tasks"

interface HealthCheck {
  name: string;
  check: () => boolean;
  start?: () => void;
  stop?: () => void;
}

function createMonitoringHealthcheck(stores: DataStores): HealthCheck {
  return {
    name: "monitoringTask",
    check: (): boolean => {
      const ranMonitoringTask = stores.status.ranMonitoringTask
      return ranMonitoringTask ?
        new Date().getMilliseconds() - ranMonitoringTask.getMilliseconds() < (11 * 60 * 1000) :
        false
    }
  }
}

function createEmailHealthcheck(stores: DataStores): HealthCheck {
  return {
    name: "recentlyUnhandledEmail",
    check: (): boolean => (new Date().getTime() - stores.lastUnhandledEmail) > 600000
  }
}

const createPaHealthcheck: () => HealthCheck = () => {
  let lastSuccess = 0
  let timeout: NodeJS.Timeout | null = null

  function checkPa(): void {
    paState().then(() => {
      lastSuccess = new Date().getMilliseconds()
    }).catch((e) => {
      console.error("Failed to fetch pa status")
      console.error(e)
    })
  }

  function start(): void {
    timeout = setInterval(checkPa, 60000)
  }

  function stop(): void {
    timeout ? clearInterval(timeout) : null
  }

  return {
    name: "paConnection",
    check: (): boolean => new Date().getMilliseconds() - lastSuccess < 70000,
    start,
    stop
  }
}

export function createHealthchecks(stores: DataStores): HealthCheck[] {
  const healthchecks = [
    createMonitoringHealthcheck(stores),
    createEmailHealthcheck(stores),
    createPaHealthcheck()
  ]
  healthchecks.forEach((h) => {
    if (h.start) {
      h.start()
    }
  })
  return healthchecks
}