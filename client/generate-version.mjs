/**
 * put the hash of the current commit in the version file
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const versionFile = path.join(process.cwd(), 'public/version.json');
let version;

try {
	version = execSync('git rev-parse HEAD').toString().trim();
	fs.writeFileSync(versionFile, JSON.stringify({ version }));
} catch (e) {
	console.error(e);
	fs.writeFileSync(versionFile, JSON.stringify({ version: 'unknown' }));
}

try {
	const versionModule = path.join(process.cwd(), 'src/cachedVersion.js');
	const versionModuleContent = `export default '${version}';`;
	fs.writeFileSync(versionModule, versionModuleContent);
} catch (e) {
	console.error(e);
	fs.writeFileSync(versionModule, `export default 'unknown';`);
}