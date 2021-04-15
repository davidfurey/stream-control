import path from 'path';
import express from 'express';
import compression from 'compression';
import * as http from 'http';
import { SpreadsheetEventStore } from '../SpreadsheetEventStore'
import { createEvents, validateEvents } from './create-events';
import { SpreadsheetScheduleStore } from '../SpreadsheetScheduleStore';
import { SpreadsheetStatusStore } from '../SpreadsheetStatusStore';
import { CachedYoutubeClient } from '../CachedYoutubeClient';
import { isYoutubeErrorResponse } from '../YoutubeClient';
import { scheduleTasks } from '../scheduled_tasks';
import { send as sendEmail} from '../email';
import { applicationStart, genericError } from '../email-templates/generic';
import * as ScheduledTasks from '../scheduled_tasks'
import { createHealthchecks } from './healthchecks';

if (!Object.fromEntries) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  Object.fromEntries = function fromEntries(iterable: any): any {
    return [...iterable].reduce((obj, [key, val]) => {
      obj[key] = val
      return obj
    }, {})
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  /* eslint-enable @typescript-eslint/no-unsafe-return */
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}

const port = process.env.PORT || 3041;

const app = express();

const server = http.createServer(app);

app.use(compression());

const eventStore = new SpreadsheetEventStore()
const scheduleStore = new SpreadsheetScheduleStore()
const statusStore = new SpreadsheetStatusStore()
const youtubeClient = new CachedYoutubeClient()

statusStore.reportAppStarted(new Date())

const stores = {
  events: eventStore,
  schedules: scheduleStore,
  status: statusStore,
  lastUnhandledEmail: 0
}

function recentlyUnhandledEmail(): boolean {
  return (new Date().getTime() - stores.lastUnhandledEmail) > 600000
}

process.on('unhandledRejection', (error) => {
  console.error("Unhandled rejection")
  console.error(error)
  if (recentlyUnhandledEmail()) {
    stores.lastUnhandledEmail = new Date().getTime()
    sendEmail("Error - unhandled rejection", genericError("Unhandled rejection starting", JSON.stringify(error, undefined, "  ")))
  } else {
    console.error(`Skipping email because last email send too recently (${stores.lastUnhandledEmail})`)
  }
});

sendEmail("Starting stream automation", applicationStart())

scheduleTasks(stores)

app.all('*', (request, response, next) => {
    const start = Date.now();

    response.once('finish', () => {
        const duration = Date.now() - start;
        console.log(`HTTP ${request.method} ${request.path} returned ${response.statusCode} in ${duration}ms`);
    });

    next();
});

app.use(express.static(path.resolve(__dirname, 'public')));

const healthchecks = createHealthchecks(stores)

app.get('/healthcheck', (_req, res) => {
  const checks = Object.fromEntries(healthchecks.map((h) => [h.name, h.check()]))
  if (Object.values(checks).every((v) => v)) {
    res.send({
      result: "healthy",
      checks
    })
  } else {
    res.status(503).send({
      result: "unhealthy",
      checks
    })
  }
});

app.get('/youtube/streams', (_req, res) => {
  youtubeClient.liveStreams().then((streams) => {
    res.json({
      streams: streams
    })
  })
})

app.get('/youtube/broadcasts', (_req, res) => {
  youtubeClient.liveBroadcasts().then((events) => {
    res.json({
      broadcasts: events.filter((v) =>
        v.privacyStatus === "public" || v.privacyStatus !== null
        // && Math.abs(v.scheduledStartTime - Date.now()) < (24 * 60 * 60 * 1000)
      )
    })
  })
})

app.get('/youtube/upcoming', (_req, res) => {
  youtubeClient.liveBroadcasts().then((events) => {
    res.json({
      broadcasts: events.filter((v) =>
        v.status !== "revoked" && v.status !== "complete"
        // && Math.abs(v.scheduledStartTime - Date.now()) < (24 * 60 * 60 * 1000)
      )
    })
  })
})

app.post('/youtube/:eventId/:status(live|testing|complete)', (req, res) => {
  const eventId = req.params['eventId']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (req.params['status'] as any)
  youtubeClient.updateBroadcastStatus(eventId, status).then(() => {
    res.send("OK")
  }).catch((e) => {
    if (isYoutubeErrorResponse(e)) {
      res.status(e.code)
      res.json(e)
    } else {
      console.error(JSON.stringify(e))
      console.error(`Failed to set status of event ${eventId} to ${status} (${e})`)
      res.status(500).send(`Failed to set status of event ${eventId} to ${status} (${e})`)
    }
  })
})

app.post('/automation/create-events', (_req, res) => {
  createEvents(scheduleStore, eventStore)
  res.status(202).send("Accepted")
})

app.post('/automation/validate-events', (_req, res) => {
  validateEvents(scheduleStore, eventStore)
  res.status(202).send("Accepted")
})

app.post('/automation/start-events', (_req, res) => {
  ScheduledTasks.startIminentEvents(stores)
  res.status(202).send("Accepted")
})

app.post('/automation/cleanup', (_req, res) => {
  ScheduledTasks.cleanupSpreadsheet(stores)
  res.status(202).send("Accepted")
})

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log(`Server listening on port ${port}!`);
  } else {
    console.log(`Webpack dev server is listening on port ${port}`);
  }
});
