
const defaultProps = {
	protocol: 'ws',
	host: 'localhost',
	port: 8080,
	pingFrequency: 60000,
}

class Connection {
	/**
	 * The gateway to communicating with the websocket server
	 */
	constructor() {
		this.socket = null;
		this.reconnectLength = 500;
		this.isOpen = false;

		this.handlers = {};
		this.handlerId = 0;

		this.authenticated = false;

		this.on('auth-success', (data) => {
			this.authenticated = true;
			console.log('Authenticated');

		});

		this.on('connected', (data) => {
			this.id = data.id;
		});
	}

	disconnect() {
		this.closing = true;
		this.socket.close();

		clearInterval(this.pingInterval);
		this.pingInterval = null;
	}

	/**
	 * Connects to the websocket server, authenticates, listens and sends messages
	 * @param {*} props
	 * @param {string} props.protocol "ws" or "wss"
	 * @param {string} props.host "localhost", "process.env.NEXT_PUBLIC_OVERLAY_API"
	 * @param {number} props.port 8080
	 * @param {string} props.key your api key
	 */
	connect(props) {
		this.props = Object.assign({}, defaultProps, props);

		if (this.socket) {
			throw new Error('Already connected');
		}
		const { protocol, host, port, key } = this.props;


		this.key = key;
		this.reAuth = true;

		this.isViewer = !!this.props.isViewer;

		const url = `${protocol}://${host}:${port}`;
		this.socket = new WebSocket(url);
		this.socket.onopen = this.onOpen.bind(this);
		this.socket.onclose = this.onClose.bind(this);
		this.socket.onmessage = this.messageListener.bind(this);
		this.socket.onerror = (e) => {
			if (this.socket.readyState === 3) this.onClose();
		}

		if (!this.pingInterval) {
			this.pingInterval = setInterval(() => {
				try {
					this.ping();
				} catch (e) { }
			}, this.props.pingFrequency);
		}
	}

	authenticate() {
		this.send('load', {});
		if (!this.props.restricted) {
			this.send('authenticate', { key: this.key });
		}
		this.ping();
	}

	ping() {
		this.lastPing = Date.now();
		this.send('ping', { time: Date.now() });
	}

	onOpen() {
		this.isOpen = true;
		this.closing = false;
		this.reconnectLength = 500;

		if (this.reAuth) {
			this.reAuth = false;
			this.authenticate();
		}
	}

	onClose() {
		if (this.reconnecting) return;
		this.isOpen = false;
		this.authenticated = false;
		if (!this.closing) {
			this.reAuth = true;
			if (this.socket && this.socket.readyState !== 3) this.socket.close();
			this.socket = null;
			console.log(`Reconnecting in ${this.reconnectLength / 1000} seconds`);
			this.reconnecting = true;
			this.reconnectTimeout = setTimeout(() => {
				this.reconnecting = false;
				this.connect(this.props);
			}, this.reconnectLength);

			if (!this.isViewer) this.reconnectLength = Math.min(this.reconnectLength * 2, 30000);
		}

		if (this.handlers.hasOwnProperty('disconnected')) {
			this.handlers.disconnected.forEach((handler) => {
				handler();
			});
		}
	}

	/**
	   * Handle messages from the server and call the appropriate listeners
	 * @param {*} event 
	 */
	messageListener(message) {
		this.lastMessage = Date.now();
		try {
			const { event, data } = JSON.parse(message.data);

			if (event === 'mouse' && data.id === this.id) return;

			if (event === 'pong') {
				this.lastPong = Date.now();
				this.lastPongDiff = this.lastPong - this.lastPing;
				this.serverClientTimeDiff = data.time - this.lastPong + this.lastPongDiff / 2;
				window.serverClientTimeDiff = this.serverClientTimeDiff;
			} else if (event === 'check-in') {
				this.send('check-in', { data: Date.now() });
			} else if (event === 'refresh') {
				window.location.reload();
			} else {
				if (this.handlers[event]) {
					for (let i = 0; i < this.handlers[event].length; i++) {
						this.handlers[event][i](data);
					}
				} else {
					console.log('Unhandled event: ' + event, data);
				}
			}
		} catch (e) {
			console.log(e);
			console.log(message.data);
		}
	}

	/**
	 * Listen for messages from the server
	 * @param {string} event
	 * @param {function} callback
	 */
	on(event, callback) {
		if (!this.handlers[event]) {
			this.handlers[event] = [];
		}
		callback.id = this.handlerId++;
		this.handlers[event].push(callback);
	}

	/**
	 * Remove a listener
	 * @param {string} event
	 * @param {function} callback
	 */
	off(event, callback) {
		if (!this.handlers[event]) {
			return;
		}
		for (let i = 0; i < this.handlers[event].length; i++) {
			if (this.handlers[event][i].id === callback.id) {
				this.handlers[event].splice(i, 1);
				break;
			}
		}
	}

	/**
	 * Send a message to the server
	 * @param {*} event 
	 * @param {*} data 
	 */
	send(event, data) {
		if (event === 'mouse' && !this.authenticated) return;

		this.socket.send(JSON.stringify({
			event,
			data,
		}));
	}

	/**
	 * Shorthand for updating elements
	 * @param {*} id 
	 * @param {*} newData 
	 */
	updateElement(id, newData) {
		this.send('update', {
			...newData,
			_id: id,
		});
	}

	/**
	 * Shorthand for updating properties
	 * @param {*} id
	 * @param {*} props
	 */
	updateProps(id, props) {
		this.send('update', {
			properties: props,
			_id: id,
		});
	}

	mouseUpdate(x, y) {
		try {
			this.send('mouse', { x, y });
		} catch (e) { console.error(e) };
	}
}

export default Connection;