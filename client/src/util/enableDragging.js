
export function enableDragging(ref, object) {
	let isDragging = false;
	let lastX = 0;
	let lastY = 0;

	function onMouseDown(e) {
		if (e.button !== 0) return;
		isDragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
	}

	function onMouseMove(e) {
		if (!ref.current || ref.current.getAttribute('contentEditable') === "true") return;
		if (isDragging) {
			e.preventDefault();
			const deltaX = (e.clientX - lastX) / (window.viewScale || 1);
			const deltaY = (e.clientY - lastY) / (window.viewScale || 1);
			object.update({
				x: object.data.x + deltaX,
				y: object.data.y + deltaY,
			});
			lastX = e.clientX;
			lastY = e.clientY;
		}
	}

	function onMouseUp(e) {
		isDragging = false;
	}

	ref.current.addEventListener('mousedown', onMouseDown);
	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('mouseup', onMouseUp);

	return () => {
		if (ref.current) {
			ref.current.removeEventListener('mousedown', onMouseDown);
		}
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mouseup', onMouseUp);
	}
}