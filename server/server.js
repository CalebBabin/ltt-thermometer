import './env.js';
import './database.js';
import express from 'express';
import * as http from 'http';
import socketServer from './src/socketServer.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
});


const server = http.createServer(app);

// initiate the websocket server
socketServer(server);

server.listen(process.env.PORT || 8080, function listening() {
	console.log('Listening on %d', server.address().port);
});