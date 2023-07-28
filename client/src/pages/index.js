import { ConnectionContext } from '@/components/connectionContext';
import Metadata from '@/components/metadata';
import Scene from '@/components/scene';
import Connection from '@/lib/connection';
import { useEffect, useMemo, useState } from 'react';
import { StateManager } from '@/lib/stateManager';
import ErrorBoundary from '@/components/ErrorBoundry';

export default function Viewer() {
	const connection = useMemo(() => new Connection(), []);
	const stateManager = useMemo(() => new StateManager(connection), []);
	const [objects, setObjects] = useState({});

	useEffect(() => {
		document.body.classList.add('overflow-hidden');
		document.body.style.transition = 'opacity 0.5s';
		let objectsLength = 0;
		if (!connection.socket) {

			stateManager.callback = (newObjects, force = false) => {
				const newLength = Object.keys(newObjects).length;
				if (newLength !== objectsLength || force) {
					setObjects({ ...newObjects });
					objectsLength = newLength;
				}
			};

			connection.closing = false;

			const urlParams = new URLSearchParams(window.location.search);
			const key = urlParams.get('key');
			const host = process.env.NEXT_PUBLIC_OVERLAY_API.split('://')[1].split(':')[0];
			const protocol = (location.protocol === 'https:') ? 'wss' : 'ws';
			const port = (location.protocol === 'http:') ? 8080 : 443;
			console.log(host, location.host);

			connection.connect({
				key,
				host,
				protocol,
				port,
				restricted: true,
				isViewer: true,
			});

			const connectionListener = () => {
				document.body.style.opacity = 1;
			}
			connection.on('connected', connectionListener);
			const disconnectionListener = () => {
				document.body.style.opacity = 0;
			}
			connection.on('disconnected', disconnectionListener);

			const showListener = () => {
				document.body.style.opacity = 1;
			}
			connection.on('show-view', showListener);
			const hideListener = () => {
				document.body.style.opacity = 1;
			}
			connection.on('hide-view', hideListener);


			return () => {
				connection.off('connected', connectionListener);
				connection.off('disconnected', disconnectionListener);
				connection.off('show-view', showListener);
				connection.off('hide-view', hideListener);
			}
		}
	}, [])

	return (
		<ErrorBoundary>
			<ConnectionContext.Provider value={{ connection, stateManager }}>
				<Metadata title="Shot-o-meter!" />
				<div className='w-screen h-screen'>
					<Scene objects={objects} viewer={true} />
				</div>
			</ConnectionContext.Provider>
		</ErrorBoundary>
	)
}
