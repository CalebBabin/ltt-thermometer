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
import { NumberInput } from '@/components/inputs/number';

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

		return <div className='bg-slate-700 rounded p-2 flex flex-col gap-2'>
			Editing goal: {data.name}
			<DateTimeLocalInput
				value={data.value.date}
				onChange={(e) => {
					console.log(e.target.value, new Date(e.target.value));
					object.update({
						value: {
							date: new Date(e.target.value).getTime(),
						},
					});
				}}
			/>

			<label>
				Weight:
				<NumberInput
					value={data.value.weight || 0}
					min={0}
					onChange={(e) => {
						object.update({
							value: {
								weight: Number(e.target.value),
							},
						});
					}}
				/>
			</label>
			<input type="range" min="0" max="10" step="0.05" value={data.value.weight || 0}
				onChange={(e) => { object.update({ value: { weight: Number(e.target.value) } }) }}
			/>

			<label>
				<input
					className='mr-1'
					type='checkbox'
					checked={data.value.flipped}
					onChange={(e) => {
						object.update({
							value: {
								flipped: e.target.checked,
							},
						});
					}}
				/>
				Flip
			</label>

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

	metadata: ({ object }) => {
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
			Start date:
			<DateTimeLocalInput
				value={data.value.startDate}
				onChange={(e) => {
					object.update({
						value: {
							startDate: new Date(e.target.value).getTime(),
						},
					});
				}
				} />
			<br />
			End date:
			<DateTimeLocalInput
				value={data.value.endDate}
				onChange={(e) => {
					object.update({
						value: {
							endDate: new Date(e.target.value).getTime(),
						},
					});
				}
				} />
		</div>
	},
}

function Editor(props) {
	const { objects, targetType, name, defaultProps } = props;
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

	const items = [];
	for (const key in objects) {
		const object = objects[key];
		if (object.data.type !== targetType) continue;
		items.push(object);
	}

	return <>
		<ListBox
			containerClass="max-h-[30vh]"
			passRef={objectListRef}
			header={<div className='flex justify-between items-center'>
				{name}
				{(!props.max || items.length < props.max) &&
					<CreateButton defaults={defaultProps} />
				}
			</div>}>
			{items.map((item) => {
				return <ObjectItem
					allowNameChange={props.allowNameChange}
					allowDelete={props.allowDelete}
					key={item.data._id}
					object={item}
					selected={selected}
					setSelected={setSelected}
				/>
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
			<Metadata title="Admin: Shot-o-meter" />

			<ConnectionRequired connection={connection}>
				<div className="w-screen h-screen flex flex-col md:flex-row">

					<div className='text-left w-full md:min-w-[250px] md:w-[250px] lg:min-w-[350px] lg:w-[350px] md:max-h-screen overflow-y-auto bg-gray-900 relative z-100 px-4'>
						<br />

						<h1 className='text-xl lg:text-3xl text-center my-2'>
							The Shot-O-Meter!
						</h1>
						<br />

						<Editor
							defaultProps={{
								name: "New Goal",
								type: "goal",
								value: {
									date: Date.now(),
									weight: 1,
								},
							}}
							objects={objects}
							targetType='goal'
							name="Goals"
						/>

						<br />
						<br />
						<br />
						<br />

						<Editor
							defaultProps={{
								name: "Global Config",
								type: "metadata",
								value: {
									startDate: Date.now(),
									endDate: Date.now() + 1000 * 60 * 60 * 24 * 7,
								},
							}}
							objects={objects}
							targetType='metadata'
							max={1}
							allowDelete={false}
							allowNameChange={false}
						/>
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

function ObjectItem({ object, selected, setSelected, allowNameChange = true, allowDelete = true }) {
	const [data, setData] = useState(object.data);
	useEffect(() => {
		if (typeof window === 'undefined') return;

		function changeListener(new_data) {
			setData({ ...new_data });
		}
		object.listen(changeListener);

		function selectListener(e) {
			setSelected(object._id);
		}
		window.addEventListener('select-' + object._id, selectListener);

		return () => {
			object.removeListener(changeListener);
			window.removeEventListener('select-' + object._id, selectListener);
		}
	}, [object]);

	return <ListItem uid={data._id} isSelected={selected === data._id} onClick={() => {
		setSelected(data._id);
	}}>
		<div className={'flex items-center justify-between gap-2 ' + (!allowNameChange ? 'cursor-pointer' : '')}>
			{allowNameChange ? <InvisInput
				className='truncate'
				value={data.name}
				onChange={e => {
					object.update({
						name: e.target.value,
					});
				}} /> : <div className='truncate'>{data.name}</div>}

			<div className='mx-auto' />
			<div className={allowDelete ? '' : 'hidden'}>
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


