import React, { useContext, useEffect, useState } from 'react';
import { ConnectionContext } from './connectionContext';
import { FaCheckCircle } from 'react-icons/fa';

const months = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'June',
	'July',
	'Aug',
	'Sept',
	'Oct',
	'Nov',
	'Dec',
]

const renderers = {
	goal: ({ object, metadata }) => {
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

		const d = new Date(data.value.date);
		const style = {
			bottom: (
				(data.value.date - metadata?.startDate) / (metadata?.endDate - metadata?.startDate)
			) * 100 + '%',
		}
		if (data.value.flipped) {
			style.left = '110%';
		} else {
			style.right = '110%';
		}

		return <div
			className='my-4 px-2 absolute overflow-visible whitespace-pre cursor-pointer transition-all duration-300'
			style={style}
			onClick={() => {
				window.dispatchEvent(new CustomEvent('select-' + object._id));
			}}
		>
			<div className={'absolute flex items-center gap-1 ' + (data.value.flipped ? 'left-0 flex-row-reverse' : 'right-0')}>
				<small className='opacity-50'>{months[d.getMonth()]} {d.getDate()}, {d.getFullYear()}</small>
				<span className={data.value.completed ? 'opacity-50' : ''}>
					{data.name}
				</span>
				{data.value.completed && <FaCheckCircle className='inline text-green-500 text-xl' />}
				<span className='opacity-50'>&#8212;</span>
			</div>
		</div>
	}
}

const bigTick = 'w-full h-px bg-white opacity-50';
const smallTick = 'w-1/4 h-px bg-white opacity-20';

function Thermometer({ children, metadata }) {
	const [time, setTime] = useState(Date.now());
	const [tickMarks, setTickMarks] = useState([]);
	const [heat, setHeat] = useState(0);
	const context = useContext(ConnectionContext);

	const { minHeat, maxHeat } = metadata;
	const startDate = new Date(metadata.startDate);
	const endDate = new Date(metadata.endDate);
	const minMaxDiff = metadata.endDate - metadata.startDate;

	useEffect(() => {
		function stateListener(state) {
			let running_heat = 0;
			let max_heat = 0;
			for (let i = 0; i < state.length; i++) {
				const object = state[i];
				if (object.type !== 'goal') continue;
				if (object.value.completed) {
					running_heat += object.value.weight || 1;
				}
				max_heat += object.value.weight || 1;
			}
			setHeat(running_heat / max_heat);
		}

		context.stateManager.on('state-update', stateListener);
		context.stateManager.emit('object-updated', null);
		return () => {
			context.stateManager.off('state-update', stateListener);
		}
	}, [context]);

	useEffect(() => {
		const ticks = [];
		const tickCount = 10;
		for (let i = 0; i < tickCount; i++) {
			const tickTime = startDate.getTime() + (minMaxDiff - (minMaxDiff) * (i / tickCount));
			const tickDate = new Date(tickTime);
			ticks.push(<div key={i} className='flex flex-col justify-around items-center w-full h-full'>
				<div className={bigTick} />
				<div className={smallTick} />
				<div>
					<small className='opacity-50'>{months[tickDate.getMonth()]} {tickDate.getDate()}</small>
				</div>
				<div className={smallTick} />
			</div>)
		}
		setTickMarks(ticks);
	}, [metadata]);

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(Date.now());
		}, 1000);
		return () => {
			clearInterval(interval);
		}
	}, []);

	const backgroundColor = 'color-mix(in xyz, #ff4422 ' + (heat * 100) + '%, #dd2288)';

	return <div style={{
		borderRadius: '5rem',
		height: 'calc(100% - 20rem)',
	}} className='w-24 -ml-12 bg-slate-900 absolute top-[10%] left-[50%]'>
		<div className='w-48 h-48 text-2xl sm:text-4xl lg:text-7xl transition-all duration-1000 flex justify-center text-center items-center absolute top-[100%] left-[50%] -mt-16 -ml-[100%] rounded-full' style={{
			background: backgroundColor,
		}}>
			{(heat * (maxHeat - minHeat) + minHeat).toFixed(1)}°
		</div>
		<div className='absolute inset-0 overflow-hidden rounded-t-[5rem]'>
			<div className='w-full absolute bottom-0 transition-all duration-1000' style={{
				height: heat * 100 + '%',
				background: backgroundColor,
			}} />
		</div>
		<div className='z-10 absolute inset-4 items-center flex flex-col justify-between rounded-t-[5rem] overflow-hidden'>
			{tickMarks}
		</div>
		<div className='absolute w-full top-12 bottom-12'>
			{children}
		</div>
		<div className='absolute inset-0 z-10 overflow-hidden rounded-t-[5rem]'>
			<div className='w-full backdrop-invert h-1 rounded-lg absolute bottom-0' style={{
				bottom: (
					(time - startDate) / minMaxDiff
				) * 100 + '%',
			}} />
		</div>
	</div>;
}


class Scene extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			metadata: {},
		}
		this.checkForMetadata({ data: {} });
	}

	checkForMetadata(event) {
		if (!event?.value) return;
		const data = event.value;
		this.setState({ metadata: data });
	}

	componentWillUnmount() {
		if (this.metadataListener) {
			this.stateManager.off('globalUpdate-metadata', this.metadataListener);
		}
	}
	static contextType = ConnectionContext;
	componentDidMount() {
		this.connection = this.context.connection;
		this.stateManager = this.context.stateManager;
		this.metadataListener = this.checkForMetadata.bind(this);
		this.stateManager.on('globalUpdate-metadata', this.metadataListener);
	}

	render() {
		const minMaxDiff = this.state.endDate - this.state.startDate;
		const objects = [];
		for (const key in this.props.objects) {
			const object = this.props.objects[key];
			objects.push(object);
		}

		return (
			<div className='w-full h-full relative'>
				<Thermometer metadata={this.state.metadata}>
					{objects.map((object) => {
						if (renderers[object.data.type]) {
							const Element = renderers[object.data.type];
							return <Element
								object={object}
								key={object._id}
								metadata={this.state.metadata}
							/>
						} else {
							return <span key={object._id} />;
						}
					})}
				</Thermometer>
			</div>
		);
	}
}

export default Scene;