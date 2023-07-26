import React, { useEffect, useState } from 'react';
import { ConnectionContext } from './connectionContext';
import { FaCheckCircle } from 'react-icons/fa';

const renderers = {
	goal: ({ object, minDate, maxDate, minMaxDiff }) => {
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

		return <div className='my-4 px-2 absolute overflow-visible whitespace-pre' style={{
			top: (
				(data.value.date - minDate) / minMaxDiff
			) * 100 + '%',
			right: '50%',
		}}>
			<div className='absolute right-0'>
				<small className='opacity-50'>{new Date(data.value.date).toLocaleString()}</small>
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


class Scene extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			minDate: Date.now() - 1000 * 60 * 60 * 24 * 1,
			maxDate: Date.now(),
		}
	}
	static contextType = ConnectionContext;
	componentDidMount() {
		this.connection = this.context.connection;
	}
	render() {
		const minMaxDiff = this.state.maxDate - this.state.minDate;
		const objects = [];
		for (const key in this.props.objects) {
			const object = this.props.objects[key];
			objects.push(object);
			console.log(object);
		}
		return (
			<div className='w-full h-full relative'>
				{objects.map((object) => {
					if (renderers[object.data.type]) {
						const Element = renderers[object.data.type];
						return <Element
							object={object}
							minDate={this.state.minDate}
							maxDate={this.state.maxDate}
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