import path from 'path';
import express from 'express';
import compression from 'compression';
import * as http from 'http';
import { liveBroadcasts, liveStreams } from '../youtube'
import { SpreadsheetEventStore } from '../SpreadsheetEventStore'
import { createEvents, validateEvents } from './create-events';
import { setScene, startStreaming, stopStreaming, setSceneCollection } from '../obs';
import { EventRunner } from '../eventrunner'
import { SpreadsheetScheduleStore } from '../SpreadsheetScheduleStore';
import { SpreadsheetStatusStore } from '../SpreadsheetStatusStore';
import { scheduleTasks } from '../scheduled_tasks';

const port = 3040;

const app = express();

const server = http.createServer(app);

app.use(compression());

const eventStore = new SpreadsheetEventStore()
const scheduleStore = new SpreadsheetScheduleStore()
const statusStore = new SpreadsheetStatusStore()

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

// app.post('/youtube/create', (_req, res) => {
//   fs.readFile('/home/david/Downloads/0_Welcome.jpg', function(err, data) {
//     if (err) {
//       res.send("Error reading thumbnail")
//     } else {
//       createLiveBroadcast(
//         "Test Stream 2",
//         "Test description 2",
//         {
//           mimeType: "image/jpeg",
//           data: data
//         },
//         new Date()
//       ).then((r) => res.send(`response is ${r}`))
//     }
//   })
// })

// app.post('/youtube/live', (_req, res) => {
//   startYoutubeStreaming('5MWJsh2lSbw').then((r) => {
//     console.log(r)
//   })
//   res.send("OK")
// })

// process.on(
// 	"unhandledRejection",
// 	function handleWarning( reason, promise ) {
// 		console.log( reason );
//     console.log(promise)
// 	}
// );

app.post('/general/create-events', (_req, res) => {
  createEvents(scheduleStore, eventStore)
  res.send("ACCEPTED")
})

app.post('/general/validate-events', (_req, res) => {
  validateEvents(scheduleStore, eventStore)
  res.send("ACCEPTED")
})


app.post('/obs/set-scene', (_req, res) => {
  setScene("Centre")
  res.send("OK")
})

app.post('/obs/start-stream', (_req, res) => {
  startStreaming()
  res.send("OK")
})

app.post('/obs/stop-stream', (_req, res) => {
  stopStreaming()
  res.send("OK")
})

app.post('/obs/set-scene-collection', (_req, res) => {
  setSceneCollection("Wedding")
  res.send("OK")
})

app.post('/start-event', (_req, res) => {
  const runner = new EventRunner(eventStore, "1234")
  runner.start()
  res.send("OK")
})

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log(`Server listening on port ${port}!`);
  } else {
    console.log(`Webpack dev server is listening on port ${port}`);
  }
});
