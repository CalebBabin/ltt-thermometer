import React, { useEffect, useState } from 'react';
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
	goal: ({ object, startDate, endDate, minMaxDiff }) => {
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

		return <div className='my-4 mr-14 px-2 absolute overflow-visible whitespace-pre' style={{
			bottom: (
				(data.value.date - startDate) / minMaxDiff
			) * 100 + '%',
			right: '50%',
		}}>
			<div className='absolute right-0'>
				<small className='opacity-50'>{months[d.getMonth()]} {d.getDate()}, {d.getFullYear()}</small>
				&nbsp;
				<span className={data.value.completed ? 'line-through opacity-70' : ''}>
					{data.name}
				</span>
				&nbsp;-
				{data.value.completed && <FaCheckCircle className='inline ml-1 text-green-500 text-xl' />}
			</div>
		</div>
	}
}


function Thermometer({ startDate, endDate, minMaxDiff }) {
	const [time, setTime] = useState(Date.now());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(Date.now());
		}, 1000);
		return () => {
			clearInterval(interval);
		}
	}, []);

	return <div className='w-24 -ml-12 h-full bg-black absolute top-0 left-[50%]'>
		<div className='w-full bg-red-400 absolute bottom-0' style={{
			height: (
				(time - startDate) / minMaxDiff
			) * 100 + '%',
		}} />
	</div>;
}


class Scene extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			startDate: 0,
			endDate: 999999999,
		}
		this.checkForMetadata();
	}

	checkForMetadata() {
		for (const key in this.props.objects) {
			const object = this.props.objects[key];

			if (object.data.type === 'metadata') {
				if (!this.metadataListener && typeof window !== 'undefined') {
					this.metadataListener = function changeListener(new_data) {
						console.log(new_data);
						if (new_data.value.startDate) {
							this.setState({
								startDate: new_data.value.startDate,
							});
						}
						if (new_data.value.endDate) {
							this.setState({
								startDate: new_data.value.endDate,
							});
						}
					}
					object.listen(this.metadataListener);
					this.unbindListener = () => {
						object.removeListener(this.metadataListener);
					}

					this.setState({
						startDate: object.data.value.startDate,
						endDate: object.data.value.endDate,
					});
				}
				break;
			}
		}
	}

	componentDidUpdate() {
		this.checkForMetadata();
	}
	componentWillUnmount() {
		if (this.metadataListener) {
			this.unbindListener();
			delete this.unbindListener;
			delete this.metadataListener;
		}
	}
	static contextType = ConnectionContext;
	componentDidMount() {
		this.connection = this.context.connection;
		this.checkForMetadata();
	}

	render() {
		const minMaxDiff = this.state.endDate - this.state.startDate;
		const objects = [];
		for (const key in this.props.objects) {
			const object = this.props.objects[key];
			objects.push(object);
		}
		console.log(this.state);

		return (
			<div className='w-full h-full relative'>
				<Thermometer startDate={this.state.startDate} endDate={this.state.endDate} minMaxDiff={minMaxDiff} />

				{objects.map((object) => {
					if (renderers[object.data.type]) {
						const Element = renderers[object.data.type];
						return <Element
							object={object}
							startDate={this.state.startDate}
							endDate={this.state.endDate}
							minMaxDiff={minMaxDiff}
							key={object._id}
						/>
					} else {
						return <span key={object._id} />;
					}
				})}
			</div>
		);
	}
}

export default Scene;