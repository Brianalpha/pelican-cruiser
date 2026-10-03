'use strict';

const fs = require('fs');
const path = require('path');

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9222';
const PAGE_URL = process.env.PAGE_URL || 'http://127.0.0.1:8734/';
const SHOT_DIR = process.env.SHOT_DIR || path.join(require('os').tmpdir(), 'pelican-shots');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const openTimer = setTimeout(() => reject(new Error('WebSocket open timeout')), 5000);
    let nextId = 1;
    const pending = new Map();
    const events = [];

    ws.onopen = () => {
      clearTimeout(openTimer);
      resolve({
        send(method, params, timeoutMs = 15000) {
          return new Promise((res, rej) => {
            const id = nextId++;
            const timer = setTimeout(() => { pending.delete(id); rej(new Error('CDP timeout: ' + method)); }, timeoutMs);
            pending.set(id, {
              res: (value) => { clearTimeout(timer); res(value); },
              rej: (error) => { clearTimeout(timer); rej(error); }
            });
            ws.send(JSON.stringify({ id, method, params: params || {} }));
          });
        },
        events,
        close() { ws.close(); }
      });
    };
    ws.onmessage = (message) => {
      const data = JSON.parse(typeof message.data === 'string' ? message.data : message.data.toString());
      if (data.id && pending.has(data.id)) {
        const entry = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) entry.rej(new Error(data.error.message));
        else entry.res(data.result);
      } else if (data.method) {
        events.push(data);
      }
    };
    ws.onerror = (error) => reject(new Error('WebSocket error: ' + (error.message || 'unknown')));
  });
}

async function getPageTarget() {
  const response = await fetch(CDP + '/json/list');
  const targets = await response.json();
  return targets.find((target) => target.type === 'page') || null;
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const target = await getPageTarget();
  if (!target) throw new Error('no page target found in Chrome');

  const client = await connect(target.webSocketDebuggerUrl);
  const failures = [];

  function check(name, condition, detail) {
    if (condition) {
      console.log('PASS  ' + name);
    } else {
      failures.push(name + (detail ? ' -> ' + detail : ''));
      console.log('FAIL  ' + name + (detail ? ' -> ' + detail : ''));
    }
  }

  async function evaluate(expression) {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error('page exception: ' + JSON.stringify(result.exceptionDetails.exception && result.exceptionDetails.exception.description || result.exceptionDetails.text));
    }
    return result.result ? result.result.value : undefined;
  }

  async function shot(name) {
    const result = await client.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(SHOT_DIR, name + '.png');
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    return file;
  }

  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Log.enable');
  await client.send('Page.bringToFront');
  try {
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  } catch (error) {
    console.log('focus emulation unavailable:', error.message);
  }

  await client.send('Page.navigate', { url: PAGE_URL });
  await sleep(3500);

  const pageErrors = [];
  for (const event of client.events) {
    if (event.method === 'Runtime.exceptionThrown') {
      pageErrors.push(JSON.stringify(event.params.exceptionDetails));
    }
    if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') {
      pageErrors.push(event.params.entry.text);
    }
  }
  check('no page/console errors on load', pageErrors.length === 0, pageErrors.join(' | '));
  const errorScanStart = client.events.length;

  const initial = await evaluate('window.PC_APP ? PC_APP.state() : null');
  check('PC_APP available', !!initial);
  check('rendering frames', initial && initial.frames > 5, initial && 'frames=' + initial.frames);
  check('draw calls > 0', initial && initial.drawCalls > 0, initial && 'drawCalls=' + initial.drawCalls);
  check('no runtime errors array', initial && initial.errors.length === 0, initial && initial.errors.join(' | '));
  console.log('initial state:', JSON.stringify(initial));

  const wheelContact = await evaluate(`(function () {
    var minY = Infinity;
    var vector = new THREE.Vector3();
    PC_APP.internals().scene.traverse(function (object) {
      if (object.name === 'wheel-tire') {
        var position = object.geometry.attributes.position;
        for (var i = 0; i < position.count; i++) {
          vector.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
          if (vector.y < minY) minY = vector.y;
        }
      }
    });
    return Number(minY.toFixed(4));
  })()`);
  check('tires touch ground without sinking', wheelContact > -0.006 && wheelContact < 0.02, 'tire minY=' + wheelContact);

  await shot('01-initial');

  await evaluate('PC_APP.setSpeed(100)');
  await sleep(2600);
  const fast = await evaluate('PC_APP.state()');
  check('speed ramps to full', fast.speed > 0.9, 'speed=' + fast.speed);
  check('kmh readout near max', fast.kmh >= 30, 'kmh=' + fast.kmh);
  const hudText = await evaluate("document.getElementById('speedOut').textContent");
  check('HUD speed text updates', /34\s*km\/h/.test(hudText), 'hud=' + hudText);
  await shot('02-full-speed');

  const beforeOrbit = await evaluate('PC_APP.internals().camera.position.toArray().map(n => +n.toFixed(3))');
  const viewport = await evaluate('({ w: window.innerWidth, h: window.innerHeight })');
  const dragX = Math.round(viewport.w / 2);
  const dragY = Math.round(viewport.h * 0.48);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragX, y: dragY, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 12; i++) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragX + i * 28, y: dragY - i * 5, button: 'left', buttons: 1 });
    await sleep(16);
  }
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragX + 336, y: dragY - 60, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(900);
  const afterOrbit = await evaluate('PC_APP.internals().camera.position.toArray().map(n => +n.toFixed(3))');
  const moved = beforeOrbit.some((value, index) => Math.abs(value - afterOrbit[index]) > 0.05);
  check('drag rotates camera', moved, JSON.stringify(beforeOrbit) + ' -> ' + JSON.stringify(afterOrbit));
  const orbitOff = await evaluate("!PC_APP.internals().controls.autoRotate && !document.getElementById('btnOrbit').classList.contains('active')");
  check('user drag disables auto orbit', orbitOff === true);
  await shot('03-after-drag');

  await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: dragX, y: dragY, deltaX: 0, deltaY: -360 });
  await sleep(900);
  const zoomIn = await evaluate('PC_APP.internals().camera.position.distanceTo(PC_APP.internals().controls.target)');
  await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: dragX, y: dragY, deltaX: 0, deltaY: 1200 });
  await sleep(900);
  const zoomOut = await evaluate('PC_APP.internals().camera.position.distanceTo(PC_APP.internals().controls.target)');
  check('wheel zoom in shortens distance', zoomIn < Math.hypot(beforeOrbit[0], beforeOrbit[1] - 1.12, beforeOrbit[2]), 'zoomIn=' + zoomIn.toFixed(3));
  check('wheel zoom out extends distance', zoomOut > zoomIn, 'zoomOut=' + zoomOut.toFixed(3));
  await shot('04-after-zoom');

  await evaluate("document.getElementById('btnPause').click()");
  await sleep(200);
  const pausedState = await evaluate('PC_APP.state()');
  check('pause button sets paused', pausedState.paused === true);
  await sleep(2200);
  const stopped = await evaluate('PC_APP.state()');
  check('speed decays to zero', stopped.speed < 0.02, 'speed=' + stopped.speed);
  const pauseLabel = await evaluate("document.getElementById('btnPause').textContent");
  check('pause button label switches', pauseLabel.indexOf('继续') !== -1, 'label=' + pauseLabel);
  await shot('05-paused');

  await evaluate("document.getElementById('btnPause').click()");
  await sleep(2000);
  const resumed = await evaluate('PC_APP.state()');
  check('resume restores speed', resumed.speed > 0.6, 'speed=' + resumed.speed);

  const orbitBefore = await evaluate('PC_APP.internals().controls.autoRotate');
  await evaluate("document.getElementById('btnOrbit').click()");
  await sleep(150);
  const orbitAfter = await evaluate("({ rot: PC_APP.internals().controls.autoRotate, cls: document.getElementById('btnOrbit').classList.contains('active') })");
  check('auto orbit button flips state', orbitAfter.rot === !orbitBefore && orbitAfter.cls === !orbitBefore, JSON.stringify({ before: orbitBefore, after: orbitAfter }));
  await evaluate('PC_APP.internals().controls.autoRotate = false');

  await evaluate("document.getElementById('btnReset').click()");
  await sleep(1400);
  const home = await evaluate('PC_APP.internals().camera.position.toArray().map(n => +n.toFixed(2))');
  const nearHome = Math.abs(home[0] - 2.95) < 0.6 && Math.abs(home[1] - 2.0) < 0.6 && Math.abs(home[2] - 4.15) < 0.6;
  check('reset view returns home', nearHome, JSON.stringify(home));
  await shot('06-reset-home');

  await evaluate('PC_APP.setSpeed(35)');
  await sleep(2000);
  await shot('07-cruise-35');

  await evaluate('(function(){var i=PC_APP.internals();i.controls.autoRotate=false;i.camera.position.set(1.5,1.95,1.35);i.controls.target.set(0.18,1.85,0);i.controls.update();})()');
  await sleep(400);
  await shot('08-closeup-head');

  await evaluate('(function(){var i=PC_APP.internals();i.camera.position.set(4.1,1.5,0.15);i.controls.target.set(0,1.1,0);i.controls.update();})()');
  await sleep(400);
  await shot('09-front-view');

  const finalState = await evaluate('PC_APP.state()');
  check('no runtime errors at end', finalState.errors.length === 0, finalState.errors.join(' | '));
  console.log('final state:', JSON.stringify(finalState));

  const lateErrors = client.events.slice(errorScanStart).filter((event) =>
    event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Log.entryAdded' && event.params.entry.level === 'error')
  );
  check('no late console errors', lateErrors.length === 0, JSON.stringify(lateErrors.slice(0, 3)));

  console.log('screenshots:', SHOT_DIR);
  client.close();

  if (failures.length) {
    console.error('\nFAILURES:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  console.log('\nALL BROWSER CHECKS PASSED');
}

main().catch((error) => {
  console.error('browser test crashed:', error);
  process.exit(1);
});
