import { useEffect, useState } from "react";

export default function ConnectionRequired({ connection, children }) {
	const [isConnected, setIsConnected] = useState(false);
	const [connecting, setConnecting] = useState(true);

	useEffect(() => {
		const connectionListener = () => {
			setIsConnected(true);
			setConnecting(false);
			console.log('connected');
		};
		const disconnectListener = () => {
			setIsConnected(false);
			console.log('disconnected');
		}
		connection.on('connected', connectionListener);
		connection.on('disconnected', disconnectListener);

		return () => {
			connection.off('connected', connectionListener);
			connection.off('disconnected', disconnectListener);
		}
	}, []);

	return <div className="w-full h-full relative">
		{children}
		<div className={"absolute inset-0 transition-all duration-1000 " + (isConnected ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
			<div style={{
				backdropFilter: isConnected ? 'none' : 'blur(8px)',
			}} className="absolute inset-0 bg-black/50 text-center flex justify-center items-center">
				{isConnected ? <>Connected!</> : (connecting ? <>
					Connecting to the server...
				</> : <>
					Connection lost...
					<br />
					<br />
					Try refreshing if the application takes too long to recover.
				</>)}
			</div>
		</div>
	</div>
}