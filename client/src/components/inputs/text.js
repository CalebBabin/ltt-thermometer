
export function TextInput(props) {
	return <input
		{...props}
		type="text"
		className={props.className + ' bg-slate-700 border border-slate-500 rounded text-white inline px-1'}
	/>
}