import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const functionFiles = [
  'netlify/functions/get-report.js',
  'netlify/functions/report-status.js',
  'netlify/functions/save-report.js',
];
for (const file of functionFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(file + ': ' + (result.stderr || result.stdout));
}

const html = readFileSync('public/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(code => code.trim());
for (let index = 0; index < scripts.length; index += 1) new vm.Script(scripts[index], { filename: 'public/index.html:inline-' + (index + 1) });

if (html.includes('Cops@2026!')) throw new Error('A hard-coded upload password is present in public HTML.');
for (const endpoint of ['save-report', 'get-report', 'report-status']) {
  if (!html.includes('/.netlify/functions/' + endpoint)) throw new Error('Frontend is not wired to ' + endpoint + '.');
}
console.log('Dashboard source verification passed.');
