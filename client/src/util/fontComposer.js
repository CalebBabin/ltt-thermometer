const fonts = {};

export const availableFonts = {
	'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
	'Roboto Mono': 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap',
	'Comic Neue': 'https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;500;700&display=swap',
	"Comic Sans MS": false,
	'Redressed': 'https://fonts.googleapis.com/css2?family=Redressed&display=swap',
}

export const loadAllFonts = () => {
	for (const fontFamily in availableFonts) {
		requestFont(fontFamily);
	}
}

export const requestFont = (fontFamily) => {
	if (fonts[fontFamily]) {
		fonts[fontFamily].count++;
		return;
	} else if (availableFonts[fontFamily]) {
		fonts[fontFamily] = {
			count: 1,
			link: document.createElement('link'),
		};
		fonts[fontFamily].link.href = availableFonts[fontFamily];
		fonts[fontFamily].link.rel = 'stylesheet';
		document.head.appendChild(fonts[fontFamily].link);

		if (availableFonts[fontFamily] === undefined) {
			console.warn(`Font ${fontFamily} is not available.`);
		}
	}
}

export const releaseFont = (fontFamily) => {
	if (fonts[fontFamily]) {
		fonts[fontFamily].count--;
		window.requestAnimationFrame(() => {
			if (fonts[fontFamily] && fonts[fontFamily].count <= 0) {
				document.head.removeChild(fonts[fontFamily].link);
				delete fonts[fontFamily];
			}
		})
	}
}