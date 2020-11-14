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

process.on('unhandledRejection', (error) => {
  console.log(error);
});

const port = process.env.PORT || 3041;

const app = express();

const server = http.createServer(app);

app.use(compression());

const eventStore = new SpreadsheetEventStore()
const scheduleStore = new SpreadsheetScheduleStore()
const statusStore = new SpreadsheetStatusStore()

const youtubeClient = new CachedYoutubeClient()

statusStore.reportAppStarted(new Date())

scheduleTasks({
  events: eventStore,
  schedules: scheduleStore,
  status: statusStore
})

app.all('*', (request, response, next) => {
    const start = Date.now();

    response.once('finish', () => {
        const duration = Date.now() - start;
        console.log(`HTTP ${request.method} ${request.path} returned ${response.statusCode} in ${duration}ms`);
    });

    next();
});

app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/healthcheck', (_req, res) => res.send("Ok"));

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

app.post('/general/create-events', (_req, res) => {
  createEvents(scheduleStore, eventStore)
  res.send("ACCEPTED")
})

app.post('/general/validate-events', (_req, res) => {
  validateEvents(scheduleStore, eventStore)
  res.send("ACCEPTED")
})

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log(`Server listening on port ${port}!`);
  } else {
    console.log(`Webpack dev server is listening on port ${port}`);
  }
});
