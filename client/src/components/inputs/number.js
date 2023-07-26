
export function NumberInput(props) {
	return <input
		{...props}
		type="number"
		className={props.className + ' bg-slate-700 border border-slate-500 rounded text-white inline w-16 px-1'}
	/>
}