import Button from '@/components/elements/button';
import { ConnectionContext } from '@/components/connectionContext';
import { InvisInput } from '@/components/inputs/invis';
import { ListBox, ListItem } from '@/components/elements/list';
import Metadata from '@/components/metadata';
import Scene from '@/components/scene';
import Connection from '@/lib/connection';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { StateManager } from '@/lib/stateManager';
import ConnectionRequired from '@/components/ConnectionRequired';

export default function AdminPage() {
	const connection = useMemo(() => new Connection(), []);
	const stateManager = useMemo(() => new StateManager(connection), []);
	const [objects, setObjects] = useState({});
	const [selected, setSelected] = useState(null);

	const objectListRef = useRef();

	useEffect(() => {
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
			const key = localStorage.getItem('key');
			const host = process.env.NEXT_PUBLIC_OVERLAY_API.split('://')[1].split(':')[0];
			const protocol = (location.protocol === 'https:') ? 'wss' : 'ws';
			const port = (location.protocol === 'http:') ? 8080 : 443;

			console.log(host, location.host);

			connection.connect({
				key,
				host,
				protocol,
				port,
			});
		}


		const selectListener = (e) => {
			if (e.detail._id === selected) return;
			setSelected(e.detail._id);
		};
		window.addEventListener('SelectNewObject', selectListener);

		return () => {
			if (!location.host.startsWith('localhost')) connection.disconnect();
			window.removeEventListener('SelectNewObject', selectListener);
		}
	}, [])

	let selectedElement = null;
	if (selected) {
		let object = null;
		for (const key in objects) {
			if (objects[key]._id === selected) {
				object = objects[key];
				break;
			}
		}
		if (object) {
			// for (let i = 0; i < AvailableObjects.length; i++) {
			// 	if (AvailableObjects[i].defaultProperties.type === object.data.type) {
			// 		const Inspector = AvailableObjects[i].Inspector;
			// 		selectedElement = <Inspector object={object} key={object._id} />
			// 		break;
			// 	}
			// }
			if (!selectedElement) {
				selectedElement = <>
					<div>unknown type "{object.data.type}"</div>
				</>
			}
		} else {
			setSelected(null);
		}
	}

	useEffect(() => {
		// scroll to selected object
		if (selected && objectListRef.current) {
			const objectList = objectListRef.current;
			const selectedElement = objectList.querySelector(`[data-id="${selected}"]`);
			if (selectedElement) {
				selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}

	}, [selected, objectListRef])

	return (
		<ConnectionContext.Provider value={{ connection, stateManager, selected, setSelected }}>
			<Metadata title="Control - Thermometer" />

			<ConnectionRequired connection={connection}>
				<div className="w-screen h-screen flex flex-col md:flex-row">

					<div className='text-left w-full md:min-w-[250px] md:w-[250px] lg:min-w-[350px] lg:w-[350px] md:max-h-screen overflow-y-auto bg-gray-900 relative z-100 px-4'>
						<br />

						<h1 className='text-xl lg:text-3xl text-center my-2'>control</h1>
						<br />
						<ListBox
							containerClass="max-h-[30vh]"
							passRef={objectListRef}
							header={<div className='flex justify-between items-center'>
								objects
								<CreateButton connection={connection} />
							</div>}>
							{Object.keys(objects).map((key) => {
								const object = objects[key];
								return <ObjectItem key={key} object={object} selected={selected} setSelected={setSelected} />
							})}
						</ListBox>

						<br />

						{selectedElement}
					</div>

					<div className='overflow-hidden h-full w-full flex justify-center items-center bg-slate-800 relative'>


						<Scene
							objects={objects}
						/>
					</div>
				</div>
			</ConnectionRequired>
		</ConnectionContext.Provider>
	)
}

function ObjectItem({ object, selected, setSelected }) {
	const [data, setData] = useState(object.data);
	useEffect(() => {
		function changeListener(data) {
			setData({ ...data });
		}
		object.listen(changeListener);

		return () => {
			object.removeListener(changeListener);
		}
	}, []);

	return <ListItem uid={data._id} isSelected={selected === data._id} onClick={() => {
		setSelected(data._id);
	}}>
		<div className={'flex items-center justify-between gap-2'}>
			<InvisInput
				className='truncate'
				value={data.name}
				onChange={e => {
					object.update({
						name: e.target.value,
					});
				}} />
			<div className='mx-auto' />
			<div>
				<FaTrash
					className='cursor-pointer'
					onClick={() => {
						object.delete();
					}}
				/>
			</div>
		</div>
	</ListItem>
}

function CreateButton({ connection }) {
	return <div className='relative'>
		<Button size="small" onClick={() => {
			connection.send('create', {
				name: "New Goal",
				type: "goal",
				value: {
					date: Date.now(),
				},
			});
		}}>
			+create goal
		</Button>
	</div>
}


