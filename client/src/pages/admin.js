import Button from '@/components/elements/button';
import { ConnectionContext } from '@/components/connectionContext';
import { InvisInput } from '@/components/inputs/invis';
import { ListBox, ListItem } from '@/components/elements/list';
import Metadata from '@/components/metadata';
import Scene from '@/components/scene';
import Connection from '@/lib/connection';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { StateManager } from '@/lib/stateManager';
import ConnectionRequired from '@/components/ConnectionRequired';

function DateTimeLocalInput(props) {
	const date = new Date(props.value);
	return <input
		type="datetime-local"
		className="text-black bg-white w-full"
		{...props}
		value={
			date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') + 'T' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0')
		}
	/>
}

const editors = {
	goal: ({ object }) => {
		const [data, setData] = useState(object.data);

		useEffect(() => {
			if (typeof window === 'undefined') return;

			function changeListener(new_data) {
				setData({ ...new_data });
			}
			object.listen(changeListener);
			return () => {
				object.removeListener(changeListener);
			}
		}, [object]);

		return <div>
			<DateTimeLocalInput
				value={data.value.date}
				onChange={(e) => {
					console.log(e.target.value, new Date(e.target.value));
					object.update({
						value: {
							date: new Date(e.target.value).getTime(),
						},
					});
				}} />

			<label>
				<input
					className='mr-1'
					type='checkbox'
					checked={data.value.completed}
					onChange={(e) => {
						object.update({
							value: {
								completed: e.target.checked,
							},
						});
					}}
				/>
				Completed
			</label>
		</div>
	},
}

function Editor({ objects, targetType, name }) {
	const [selected, setSelected] = useState(null);
	const objectListRef = useRef();

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
			if (editors[object.data.type]) {
				const Inspector = editors[object.data.type];
				selectedElement = <Inspector object={object} key={object._id} />
			} else {
				selectedElement = <>
					<div>unknown type "{object.data.type}"</div>
				</>
			}
		} else {
			setSelected(null);
		}
	}


	return <>
		<ListBox
			containerClass="max-h-[30vh]"
			passRef={objectListRef}
			header={<div className='flex justify-between items-center'>
				{name}
				<CreateButton defaults={{
					name: "New Goal",
					type: "goal",
					value: {
						date: Date.now(),
					},
				}} />
			</div>}>
			{Object.keys(objects).map((key) => {
				const object = objects[key];
				if (object.data.type !== targetType) return null;
				return <ObjectItem key={key} object={object} selected={selected} setSelected={setSelected} />
			})}
		</ListBox>

		<div className='mb-2' />

		{selectedElement}
	</>
}

export default function AdminPage() {
	const connection = useMemo(() => new Connection(), []);
	const stateManager = useMemo(() => new StateManager(connection), []);
	const [objects, setObjects] = useState({});


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


		return () => {
			if (!location.host.startsWith('localhost')) connection.disconnect();
		}
	}, [])


	return (
		<ConnectionContext.Provider value={{ connection, stateManager }}>
			<Metadata title="Control - Thermometer" />

			<ConnectionRequired connection={connection}>
				<div className="w-screen h-screen flex flex-col md:flex-row">

					<div className='text-left w-full md:min-w-[250px] md:w-[250px] lg:min-w-[350px] lg:w-[350px] md:max-h-screen overflow-y-auto bg-gray-900 relative z-100 px-4'>
						<br />

						<h1 className='text-xl lg:text-3xl text-center my-2'>control</h1>
						<br />

						<Editor objects={objects} targetType='goal' name="Goals" />

						<hr className='my-2' />
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
		if (typeof window === 'undefined') return;

		function changeListener(new_data) {
			setData({ ...new_data });
		}
		object.listen(changeListener);

		return () => {
			object.removeListener(changeListener);
		}
	}, [object]);

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

function CreateButton({ defaults }) {
	const connection = useContext(ConnectionContext).connection;

	return <div className='relative'>
		<Button size="small" onClick={() => {
			connection.send('create', defaults);
		}}>
			+ new
		</Button>
	</div>
}


