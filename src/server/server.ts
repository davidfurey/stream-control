import path from 'path';
import express from 'express';
import compression from 'compression';
import * as http from 'http';
import * as net from 'net';
import fs from 'fs'
import url from 'url'

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

server.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log(`Server listening on port ${port}!`);
  } else {
    console.log(`Webpack dev server is listening on port ${port}`);
  }
});
