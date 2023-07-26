
export default function Button(props) {
	let padding = "px-2 py-1";
	if (props.size === "small") {
		padding = "px-1 py-0";
	}
	if (props.size === "large") {
		padding = "px-4 py-2";
	}

	return <button {...props} className={padding + " bg-blue-500 hover:bg-blue-400 rounded " + props.className}>
		{props.children}
	</button>
}