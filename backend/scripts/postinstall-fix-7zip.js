/* eslint-disable no-console */

// Ensures the bundled 7zip-bin executable has the exec bit.
// Some environments (e.g., certain file syncs / umask / packaging) can strip it,
// causing spawn EACCES at runtime.

const fs = require('fs');

function chmodIfExists(filePath) {
	try {
		if (fs.existsSync(filePath)) {
			fs.chmodSync(filePath, 0o755);
			console.log(`[postinstall] chmod 755: ${filePath}`);
		}
	} catch (e) {
		console.warn(`[postinstall] failed chmod for ${filePath}:`, e?.message || e);
	}
}

function main() {
	let path7za;
	try {
		({ path7za } = require('7zip-bin'));
	} catch (e) {
		console.warn('[postinstall] 7zip-bin not found; skipping');
		return;
	}

	if (typeof path7za === 'string' && path7za.length > 0) {
		chmodIfExists(path7za);
	}
}

main();
