import Button from "./button";

const { useState } = require("react");

let buttonID = 0;

export default function Dropdown(props) {
	const [active, setActive] = useState(false);

	return <Button
		size={props.size}
		className={"relative " + props.className + ' ' + "dropdown-" + buttonID++}
		onClick={(e) => {
			if (e.target.className.includes("dropdown-" + (buttonID - 1))) {
				setActive(!active);
			}
		}}
	>
		{props.title}
		{active && <div className="absolute bg-gray-700 rounded shadow-md top-[110%] left-1/2 -translate-x-1/2">
			{props.children}
		</div>}
	</Button>
}