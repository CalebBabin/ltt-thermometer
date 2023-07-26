import { useContext, useEffect, useRef } from "react";
import { Container, Stage } from "react-pixi-fiber";
import { ConnectionContext } from "./connectionContext";

export default function Renderer({ children }) {
	const context = useContext(ConnectionContext);

	const canvasRef = useRef();
	const containerRef = useRef();


	useEffect(() => {
		const canvas = canvasRef.current._canvas.current;
		const container = containerRef.current;
		container.sortChildren()

		const onValidUpdate = (data) => {
			if (data.listOrder) {
				window.requestAnimationFrame(() => {
					try {
						container.sortChildren();
					} catch (e) { }
				});
				container.sortChildren();
			}
		}
		context.stateManager.on('updateValidated', onValidUpdate);

		let width = 0;
		let height = 0;

		const onResize = () => {
			const canvas = canvasRef.current._canvas.current;

			width = canvas.clientWidth;// * window.devicePixelRatio;
			height = canvas.clientHeight;// * window.devicePixelRatio;

			const app = canvasRef.current._app.current;

			app.renderer.resize(width, height);

			updateTransform();
		}

		window.addEventListener('resize', onResize);


		const position = { x: 0, y: 0 };
		const mouseStart = { x: 0, y: 0 };
		const lastMousePosition = { x: 0, y: 0 };
		const contentStart = { x: 0, y: 0 };
		let isDragging = false;

		const handleMouseDown = (e) => {
			// check if middle click
			if (e.button !== 1) return;

			mouseStart.x = e.clientX;
			mouseStart.y = e.clientY;

			contentStart.x = position.x;
			contentStart.y = position.y;

			isDragging = true;
		}

		const handleMouseUp = (e) => {
			if (e.button !== 1) return;
			if (isDragging) {
				isDragging = false;
				e.preventDefault();
			}
		}

		const handleMouseMove = (e) => {
			// translate mouse position to canvas position, then to content position
			lastMousePosition.x = e.clientX;
			lastMousePosition.y = e.clientY;

			lastMousePosition.x -= canvas.offsetLeft;
			lastMousePosition.y -= canvas.offsetTop;

			lastMousePosition.x /= window.viewScale;
			lastMousePosition.y /= window.viewScale;

			lastMousePosition.x -= position.x;
			lastMousePosition.y -= position.y;


			if (isDragging) {
				position.x = contentStart.x + (e.clientX - mouseStart.x);
				position.y = contentStart.y + (e.clientY - mouseStart.y);
				updateTransform();
			}
		}

		const handleContextMenu = (e) => {
			if (isDragging) {
				e.preventDefault();
				isDragging = false;
			}
		}

		const blurListener = () => {
			isDragging = false;
		}

		canvas.addEventListener('mousedown', handleMouseDown);
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
		window.addEventListener('contextmenu', handleContextMenu);
		window.addEventListener('blur', blurListener);

		const scrollListener = (e) => {
			if (e.ctrlKey) {
				const delta = e.deltaY;
				const oldScale = window.viewScale;
				window.viewScale -= (delta / 500) * window.viewScale;

				//pan the view so we're zooming on the mouse position rather than the center of the screen
				const rect = canvas.getBoundingClientRect();
				const x = (e.clientX - rect.left - rect.width / 2 - position.x) / oldScale;
				const y = (e.clientY - rect.top - rect.height / 2 - position.y) / oldScale;

				position.x -= x * (window.viewScale - oldScale);
				position.y -= y * (window.viewScale - oldScale);

			} else {
				let moveScale = 1 / window.viewScale;
				if (moveScale < 0.1) moveScale = 0.1;
				if (moveScale > 1) moveScale = (moveScale - 1) * 0.01 + 1;
				if (e.shiftKey) {
					position.y -= e.deltaX * moveScale;
					position.x -= e.deltaY * moveScale;
				} else {
					position.x -= e.deltaX * moveScale;
					position.y -= e.deltaY * moveScale;
				}
			}
			updateTransform();
			e.preventDefault();
		}

		canvas.addEventListener('wheel', scrollListener);

		const updateTransform = () => {
			container.position.set(
				position.x + width / 2,
				position.y + height / 2
			);
			container.scale.set(window.viewScale);
			window.dispatchEvent(new CustomEvent('viewTransformUpdated', { detail: { position, scale: window.viewScale } }));
		}

		/**
		 * convert mouse position to be relative to the center of the canvas, plus the current position of the content
		 * @param {*} event 
		 */
		const otherMouseHandler = (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = (e.clientX - rect.left - rect.width / 2 - position.x) / window.viewScale;
			const y = (e.clientY - rect.top - rect.height / 2 - position.y) / window.viewScale;

			context.connection.mouseUpdate(x, y);
		}

		canvas.addEventListener('mousemove', otherMouseHandler);

		window.viewScale = 1.1;
		updateTransform();
		window.viewScale = 1;
		window.requestAnimationFrame(updateTransform);

		// pan to objects when they are created
		const listenForNewObjects = (e) => {
			const object = e.detail.object;
			position.x = -object.x;
			position.y = -object.y;
			window.viewScale = 1.1;
			updateTransform();
		}

		onResize();
		return () => {
			canvas.removeEventListener('mousedown', handleMouseDown);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('contextmenu', handleContextMenu);
			canvas.removeEventListener('wheel', scrollListener);
			canvas.removeEventListener('mousemove', otherMouseHandler);
			window.removeEventListener('blur', blurListener);
			window.removeEventListener('resize', onResize);
			context.stateManager.off('updateValidated', onValidUpdate);
		}
	}, [canvasRef, containerRef]);

	useEffect(() => {
		if (containerRef) containerRef.current.sortChildren();
	}, [children]);

	return <>
		<Stage
			className="w-full h-full absolute inset-0"
			ref={canvasRef}
			options={{
				antialias: true,
				backgroundAlpha: 0,
			}}
		>
			<Container
				ref={containerRef}
				sortableChildren={true}
			>
				{children}
			</Container>
		</Stage>
	</>
}