export function InvisInput(props) {
	return <input {...props} className={props.className + ' bg-transparent'} />
}