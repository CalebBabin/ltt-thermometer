/**
 * Keeps track of objects received over the connection
 */
export class StateManager {
	constructor(connection, callback) {
		this.state = {};
		this.connection = connection;
		this.callback = callback;

		this.listeners = {};
		this.listenerId = 0;

		this.connection.on('load', (data) => {
			for (const key in data.objects) {
				if (Object.hasOwnProperty.call(data.objects, key)) {
					this.state[key] = new Item(data.objects[key], this.connection, this);
					this.emit('new', this.state[key]);


					if (global_types[data.objects[key].type]) {
						this.emit('globalUpdate-' + data.objects[key].type, {
							...data.objects[key]
						});
					}
				}
			}
			if (this.callback) this.callback(this.state, true);

		});

		this.connection.on('update', (data) => {
			if (!this.state[data._id]) {
				console.log('new item', data);
				this.state[data._id] = new Item(data, this.connection, this);
				this.emit('new', this.state[data._id]);
				if (this.callback) this.callback(this.state);
			} else {
				this.state[data._id].receiveUpdate(data);
			}

			if (global_types[this.state[data._id].data.type]) {
				this.emit('globalUpdate-' + data.type, {
					...this.state[data._id].data,
				});
			}
		});

		this.connection.on('delete', (data) => {
			if (!this.state[data]) return;
			this.state[data].disposing = true;
			this.emit('delete', this.state[data]);
			delete this.state[data];
			if (this.callback) this.callback(this.state);
		});
	}

	dispose() {
		for (const key in this.state) {
			if (Object.hasOwnProperty.call(this.state, key)) {
				const element = this.state[key];
				element.disposing = true;
			}
		}
	}

	on(event, callback) {
		if (!this.listeners[event]) this.listeners[event] = [];
		callback.id = this.listenerId++;
		this.listeners[event].push(callback);

		const split = event.split('-');
		if (split.length > 1 && split[0] === 'globalUpdate') {
			const type = split[1];
			if (!global_types[type]) console.warn('Unknown global type', type);
			for (const key in this.state) {
				if (Object.hasOwnProperty.call(this.state, key)) {
					const element = this.state[key];
					if (element.data.type === type) {
						callback({ ...element.data });
						break;
					}
				}
			}
		}
	}
	off(event, callback) {
		for (let i = 0; i < this.listeners[event].length; i++) {
			if (this.listeners[event][i].id === callback.id) {
				this.listeners[event].splice(i, 1);
				break;
			}
		}
	}
	emit(event, data) {
		if (!this.listeners[event]) return;
		for (let i = 0; i < this.listeners[event].length; i++) {
			this.listeners[event][i](data);
		}
	}
}

// "types" of objects of which only one can exist at a time
// used for global objects like metadata, or color configuration
const global_types = {
	metadata: true,
}

class Item {
	constructor(data, connection, stateManager) {
		this.connection = connection;
		this.stateManager = stateManager;
		this.data = data;

		//replaces lastUpdate with a timestamp for each key
		this.dataTimes = {};
		for (const key in this.data) {
			if (Object.hasOwnProperty.call(this.data, key)) {
				this.dataTimes[key] = 0;

				if (key === 'value') {
					for (const prop in this.data.value) {
						if (Object.hasOwnProperty.call(this.data.value, prop)) {
							this.dataTimes[prop] = 0;
						}
					}
				}
			}
		}
		if (!this.dataTimes.value) this.dataTimes.value = 0;

		this._id = data._id || data.id;
		this.id = data._id || data.id;
		this.lastUpdate = Date.now();

		this.listeners = [];
		this.listenerIndex = 0;
	}

	listen(listener) {
		listener.index = this.listenerIndex++;
		this.listeners.push(listener);
	}
	removeListener(listener) {
		this.listeners = this.listeners.filter((l) => l.index !== listener.index);
	}

	delete() {
		if (this.disposing) return;
		this.disposing = true;
		this.connection.send('delete', { _id: this._id });
	}

	update(data) {
		if (this.disposing) return;
		const timestamp = Date.now() + (window.serverClientTimeDiff ?? 0);
		if (data.hasOwnProperty('x')) data.x = Number(data.x);
		if (data.hasOwnProperty('y')) data.y = Number(data.y);
		this.receiveUpdate({ ...data, lastUpdate: timestamp });
		this.connection.send('update', { ...data, _id: this._id, lastUpdate: timestamp });
	}

	receiveUpdate(data) {
		if (this.disposing) return;
		const updatedData = {};
		for (const key in data) {
			if (Object.hasOwnProperty.call(data, key)) {
				const value = data[key];
				if (key === 'value') {
					if (!this.data.value) this.data.value = {};
					for (const propKey in value) {
						if (Object.hasOwnProperty.call(value, propKey)) {
							const propValue = value[propKey];
							// this.data.value[propKey] = propValue;
							if (!this.dataTimes[propKey] || data.lastUpdate >= this.dataTimes[propKey]) {
								this.data.value[propKey] = propValue;
								this.dataTimes[propKey] = data.lastUpdate;
								if (!updatedData.value) updatedData.value = {};
								updatedData.value[propKey] = propValue;
							}
						}
					}
				} else {
					if (!this.dataTimes[key] || data.lastUpdate >= this.dataTimes[key]) {
						this.data[key] = value;
						this.dataTimes[key] = data.lastUpdate;
						updatedData[key] = value;
					}
				}
			}
		}

		if (Object.keys(updatedData).length > 0) {
			this.stateManager.emit('updateValidated', { ...updatedData, _id: this._id });
		}

		for (let i = 0; i < this.listeners.length; i++) {
			const listener = this.listeners[i];
			listener(this.data);
		}

		if (global_types[this.data.type]) {
			this.stateManager.emit('globalUpdate-' + this.data.type, {
				...this.data,
			});
		}
		return true;
	}
}