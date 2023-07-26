
export function ListItem(props) {
	const { children, onClick } = props;
	let classes = '';

	if (props.isSelected) {
		classes += ' bg-blue-400/50';
	} else {
		classes += ' hover:bg-white/10';
	}
	if (props.className) {
		classes += ' ' + props.className;
	}
	return (
		<div data-id={props.uid} className={'px-2 py-1 rounded min-h-[2em] ' + classes} {...{ onClick }}>
			{children}
		</div>
	)
}

export function ListBox(props) {
	const { header, children, containerClass } = props;

	return <div ref={props.passRef} className={'w-full bg-gray-800 rounded ' + props.className}>
		{header && <div className='p-1 text-center'>
			{header}
		</div>}
		<div className={'w-full bg-gray-700 overflow-y-auto rounded ' + containerClass}>
			{children}
		</div>
	</div>
}