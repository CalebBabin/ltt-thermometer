import { WebSocketServer } from "ws";
import { v1 as uuidv1 } from 'uuid';
import ObjectModel from "./schemas/object.js";


const sockets = [];

async function authenticate(item, key) {
	console.log("authenticating", key);

	if (key === process.env.ADMIN_PASSWORD) {
		item.authenticated = true;
	} else {
		item.socket.send(JSON.stringify({
			event: "auth-failed",
			data: {
				message: "invalid key"
			},
			error: "invalid key"
		}));
	}
}

function connection(socket) {
	const item = {
		socket,
		lastMessage: Date.now(),
		id: uuidv1(),
	}
	sockets.push(item);

	item.lastMessage = Date.now();

	function sendError(errorType, message) {
		item.socket.send(JSON.stringify({
			event: errorType,
			data: {
				message,
			},
			error: message,
		}));
	}
	function sendMessage(event, data) {
		item.socket.send(JSON.stringify({
			event,
			data,
		}));
	}

	sendMessage("load", {
		objects: objects,
	});

	item.socket.on('message', async function (message) {
		item.lastMessage = Date.now();
		const { event, data } = JSON.parse(message);

		// pass ID back to client so it can use promises to wait for responses

		switch (event) {
			case 'ping':
				sendMessage("pong", { time: Date.now() });
			case 'authenticate':
				if (data.key) {
					authenticate(item, data.key);
					return;
				}
				break;
			case 'check-in':
				break;
			default:
				receive_message({ event, data }, item);
				break;
		}
	});

	item.socket.send(JSON.stringify({
		event: "connected",
		data: {
			message: "connected!",
			id: item.id,
		},
	}));
}


const checkInInterval = 10000;
setInterval(() => { // remove and ping old websockets
	const now = Date.now();
	for (let index = sockets.length - 1; index >= 0; index--) {
		const item = sockets[index];
		if (now - item.lastMessage > checkInInterval * 4) {
			console.log("A user disconnected");
			item.socket.send('Check in expired');
			item.socket.terminate();
			sockets.splice(index, 1);
		} else if (now - item.lastMessage > checkInInterval) {
			item.socket.send('{"event":"check-in","data":{"message":"checking in"}}');
		}
	}
}, checkInInterval);

export default function socketServer(server) {
	const socketServer = new WebSocketServer({ server });

	socketServer.on('connection', connection);
}



const callbacks = {};
const objects = {};
ObjectModel.findAll().then((data) => {
	for (let index = 0; index < data.length; index++) {
		const object = data[index];
		objects[object._id] = object;
	}
});

let changes = {}; // save changes to db every 10 seconds to reduce db load
setInterval(checkChanges.bind(this), 10000);

async function checkChanges() {
	if (Object.keys(changes).length > 0) {
		for (const key in changes) {
			const change = changes[key];
			change.changed("properties", true);
			await change.save();
		}
		changes = {}
	}
}

function dispatch(event, data) {
	if (event === "broadcast") {
		for (let index = 0; index < sockets.length; index++) {
			const item = sockets[index];
			item.socket.send(JSON.stringify(data));
		}
		return;
	}
	const callbacks_to_call = callbacks[event];
	if (callbacks_to_call) {
		for (let index = 0; index < callbacks_to_call.length; index++) {
			callbacks_to_call[index](data);
		}
	}
}

async function receive_message(e, client) {
	//if (client.restricted && e.event !== "load") return;

	console.log(e);
	if (e.event === "load") {
		client.socket.send(JSON.stringify({
			event: "load",
			data: {
				objects: objects,
			},
		}));
	}

	if (e.event === "update") {
		for (const key in e.data) {
			if (key === 'name' || key === 'value') {
				if (key === 'value') {
					if (!objects[e.data._id].value) objects[e.data._id].value = {};
					for (const propKey in e.data[key]) {
						objects[e.data._id][key][propKey] = e.data[key][propKey];
					}
				} else {
					objects[e.data._id][key] = e.data[key];
				}
			}
		}
		changes[e.data._id] = objects[e.data._id];
		dispatch("broadcast", { event: 'update', data: { ...e.data, lastUpdate: e.data.lastUpdate } });
	}

	if (e.event === "create") {
		if (e.data.hasOwnProperty("_id")) delete e.data._id;
		const object = new ObjectModel({
			...e.data,
		});
		await object.save();
		objects[object._id] = object;
		dispatch("broadcast", { event: 'update', data: object });
	}

	if (e.event === "delete") {
		if (objects[e.data._id]) {
			await objects[e.data._id].destroy();
			delete objects[e.data._id];

			if (changes[e.data._id]) delete changes[e.data._id];
		}
		dispatch("broadcast", { event: 'delete', data: e.data._id });
	}
}