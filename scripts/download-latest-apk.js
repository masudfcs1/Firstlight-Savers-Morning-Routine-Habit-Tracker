/* eslint-env node */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const { execSync } = require('child_process');

async function main() {
  console.log('Querying EAS for latest Android build...');
  const output = execSync('npx --yes eas-cli build:list --platform android --limit 1 --json', { encoding: 'utf8' });
  const jsonStart = output.indexOf('[');
  if (jsonStart === -1) throw new Error('Could not parse EAS output: ' + output);
  const builds = JSON.parse(output.slice(jsonStart));
  if (!builds.length) throw new Error('No builds found on EAS.');
  const build = builds[0];
  const url = build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl;
  if (!url) throw new Error(`Build does not have an artifact URL yet (status: ${build.status})`);
  
  console.log(`Found build ${build.id} (${build.status})`);
  console.log(`Downloading APK from: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  
  const destDir = path.join(__dirname, '..', 'releases');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, 'FirstLight-SAVERS-release.apk');
  const fileStream = fs.createWriteStream(dest);
  await pipeline(Readable.fromWeb(res.body), fileStream);
  console.log(`Successfully downloaded APK to: ${dest} (${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(console.error);
