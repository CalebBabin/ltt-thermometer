import checkForNewVersion from '@/util/checkVersion';
import { useEffect } from 'react';
import '@/styles/globals.css'
import { loadAllFonts } from "@/util/fontComposer";

let versionCheckInitiated = false;

export default function App({ Component, pageProps }) {

	useEffect(() => {
		loadAllFonts();
		if (!versionCheckInitiated) {
			versionCheckInitiated = true;
			setInterval(checkForNewVersion, 1000 * 60); // check every minute
		}
	}, [])

	return <Component {...pageProps} />
}
