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

		if (event === 'check-in') {
			return;
		}
		if (event === 'ping') {
			sendMessage("pong", { time: Date.now() });
		}
		if (event === 'authenticate') {
			if (data.key) {
				authenticate(item, data.key);
			}
		}

		if (event === "load") {
			item.socket.send(JSON.stringify({
				event: "load",
				data: {
					objects: objects,
				},
			}));
		}

		if (event === "update") {
			for (const key in data) {
				if (key === 'name' || key === 'value') {
					if (key === 'value') {
						if (!objects[data._id].value) objects[data._id].value = {};
						for (const propKey in data[key]) {
							objects[data._id][key][propKey] = data[key][propKey];
						}
					} else {
						objects[data._id][key] = data[key];
					}
				}
			}
			changes[data._id] = objects[data._id];
			dispatch("broadcast", { event: 'update', data: { ...data, lastUpdate: data.lastUpdate } });
		}

		if (event === "create") {
			if (data.hasOwnProperty("_id")) delete data._id;
			const object = new ObjectModel({
				...data,
			});
			await object.save();
			objects[object._id] = object;
			dispatch("broadcast", { event: 'update', data: object });
		}

		if (event === "delete") {
			if (objects[data._id]) {
				await objects[data._id].destroy();
				delete objects[data._id];

				if (changes[data._id]) delete changes[data._id];
			}
			dispatch("broadcast", { event: 'delete', data: data._id });
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
