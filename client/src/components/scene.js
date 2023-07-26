import React from 'react';
import { ConnectionContext } from './connectionContext';


class Scene extends React.Component {
	constructor(props) {
		super(props);


		this.state = {
			renderStage: false,
		};
	}

	static contextType = ConnectionContext;

	componentDidMount() {
		this.setState({
			renderStage: true,
		});
		this.connection = this.context.connection;
	}

	render() {
		const objects = [];
		for (const key in this.props.objects) {
			const object = this.props.objects[key];
			objects.push(object);
		}
		return (
			<ul>
				{objects.map((object) => {
					return (
						<li key={object._id} className='my-4 px-2'>
							{JSON.stringify(object.data)}
						</li>
					);
				})}
			</ul>
		);
	}
}

export default Scene;