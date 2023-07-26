import version from "@/cachedVersion";

console.log("version", version);

function getRoundedMinutes(rounding = 1) {
	const date = new Date();
	date.setMinutes(Math.round(date.getMinutes() / rounding) * rounding);
	date.setSeconds(0);
	date.setMilliseconds(0);
	return date.getTime();
}

async function checkForNewVersion() {
	const res = await fetch("/version.json?date=" + getRoundedMinutes(1));
	const data = await res.json();
	if (data.version !== version) {
		console.log("version mismatch");
		location.reload();
		return true;
	} else {
		return false;
	}
}

export default checkForNewVersion;