'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const scripts = ['js/utils.js', 'js/env.js', 'js/bike.js', 'js/pelican.js', 'js/main.js'];

let ok = true;

for (const file of scripts) {
  const full = path.join(root, file);
  try {
    execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    console.log('syntax ok  :', file);
  } catch (error) {
    ok = false;
    console.error('syntax FAIL:', file);
    console.error(String(error.stderr || error));
  }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

for (const ref of references) {
  if (/^https?:|^data:/.test(ref)) {
    console.log('remote ref :', ref);
    continue;
  }
  if (!fs.existsSync(path.join(root, ref))) {
    ok = false;
    console.error('referenced file missing on disk:', ref);
  } else {
    console.log('asset ok   :', ref);
  }
}

const three = fs.readFileSync(path.join(root, 'lib/three.min.js'), 'utf8');
if (!three.includes('"128"') && !/REVISION\s*=\s*["']128["']/.test(three)) {
  ok = false;
  console.error('lib/three.min.js does not look like r128');
} else {
  console.log('three r128 : ok');
}

if (!ok) process.exit(1);
console.log('all checks passed');
