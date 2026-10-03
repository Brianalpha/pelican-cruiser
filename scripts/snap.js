'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const name = args[0] || 'snap';
const [px, py, pz, tx, ty, tz] = args.slice(1, 7).map(Number);
const speed = args[7] !== undefined ? Number(args[7]) : 35;

const SHOT_DIR = path.join(require('os').tmpdir(), 'pelican-shots');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const target = targets.find((t) => t.type === 'page');
  if (!target) throw new Error('no page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  const send = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data.toString());
    if (data.id && pending.has(data.id)) {
      const entry = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) entry.reject(new Error(data.error.message));
      else entry.resolve(data.result);
    }
  };
  await new Promise((resolve) => { ws.onopen = resolve; });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };

  await evaluate('PC_APP.setSpeed(' + speed + ')');
  await evaluate(`(function(){var i=PC_APP.internals();i.controls.autoRotate=false;i.camera.position.set(${px},${py},${pz});i.controls.target.set(${tx},${ty},${tz});i.controls.update();})()`);
  await sleep(600);
  const data = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(SHOT_DIR, name + '.png');
  fs.writeFileSync(file, Buffer.from(data.data, 'base64'));
  console.log('saved', file);
  ws.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
