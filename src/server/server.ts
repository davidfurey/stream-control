import path from 'path';
import express from 'express';
import compression from 'compression';
import * as http from 'http';
import { liveBroadcasts, liveStreams, createLiveBroadcast, liveBroadcast } from '../youtube'
import { listWeekdays } from '../spreadsheet'
import fs from 'fs'
import { createEvents } from './create-events';

const port = 3040;

const app = express();

const server = http.createServer(app);

app.use(compression());

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
  liveStreams().then((streams) => {
    res.header("Access-Control-Allow-Origin", '*')
    res.json({
      streams: streams
    })
  })
})

app.get('/youtube/broadcasts', (_req, res) => {
  liveBroadcasts().then((events) => {
    res.header("Access-Control-Allow-Origin", '*')
    res.json({
      broadcasts: events.filter((v) =>
        v.privacyStatus === "public" || v.privacyStatus !== null
        // && Math.abs(v.scheduledStartTime - Date.now()) < (24 * 60 * 60 * 1000)
      )
    })
  })
})

app.get('/spreadsheet/weekdays', (_req, res) => {
  listWeekdays().then((result) => {
    res.header("Access-Control-Allow-Origin", '*')
    res.json(result)
  })
})

app.get('/spreadsheet/compare', (_req, res) => {
  listWeekdays().then((result) => {
    res.header("Access-Control-Allow-Origin", '*')
    result.filter((r) => r.eventId !== "").map((r) => {
      liveBroadcast(r.eventId).then((evt) => {
        console.log("Spreadsheet")
        if (r.eventName === evt?.title) {
          console.log("Title matches")
        }
        if (r.description === evt?.description) {
          console.log("Description matches")
        }
        if (r.scheduledStartTime.getTime() === evt?.scheduledStartTime) {
          console.log("Start time matches")
        }
        evt
      })
    })
    res.json(result)
  })
})

app.post('/youtube/create', (_req, res) => {
  fs.readFile('/home/david/Downloads/0_Welcome.jpg', function(err, data) {
    if (err) {
      res.send("Error reading thumbnail")
    } else {
      createLiveBroadcast(
        "Test Stream 2",
        "Test description 2",
        {
          mimeType: "image/jpeg",
          data: data
        },
        new Date()
      ).then((r) => res.send(`response is ${r}`))
    }
  })
})

app.post('/general/create-events', (_req, res) => {
  createEvents()
  res.send("ACCEPTED")
})

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log(`Server listening on port ${port}!`);
  } else {
    console.log(`Webpack dev server is listening on port ${port}`);
  }
});
