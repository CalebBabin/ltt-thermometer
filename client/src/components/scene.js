import React from 'react';
import { ConnectionContext } from './connectionContext';


class Scene extends React.Component {
	constructor(props) {
		super(props);
	}

	static contextType = ConnectionContext;

	componentDidMount() {
		this.connection = this.context.connection;
	}

	render() {
		const objects = [];
		for (const key in this.props.objects) {
			const object = this.props.objects[key];
			objects.push(object);
		}
		return (
			<div className='w-full h-full'>
				{objects.map((object) => {
					return (
						<li key={object._id} className='my-4 px-2'>
							{JSON.stringify(object.data)}
						</li>
					);
				})}
			</div>
		);
	}
}

export default Scene;