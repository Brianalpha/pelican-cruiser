(function () {
  'use strict';

  var PC = window.PC;

  var container = document.getElementById('scene-root');
  var slider = document.getElementById('speedSlider');
  var speedOut = document.getElementById('speedOut');
  var btnPause = document.getElementById('btnPause');
  var btnOrbit = document.getElementById('btnOrbit');
  var btnReset = document.getElementById('btnReset');

  var errorLog = [];
  window.addEventListener('error', function (event) {
    if (errorLog.length < 50) errorLog.push(String(event.message || event));
  });

  function fail(message) {
    var loading = document.getElementById('loading');
    var text = document.getElementById('loadingText');
    if (loading) {
      loading.classList.add('failed');
      if (text) text.textContent = message;
    }
  }

  if (typeof THREE === 'undefined') {
    fail('三维引擎加载失败：请确认 lib/three.min.js 与 lib/OrbitControls.js 可访问。');
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (error) {
    fail('无法初始化 WebGL，请使用支持 WebGL 的现代浏览器。');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  container.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PC.COLORS.fog, 16, 42);
  scene.background = PC.makeSkyTexture();

  var HOME_POS = new THREE.Vector3(2.95, 2.0, 4.15);
  var HOME_TARGET = new THREE.Vector3(0.05, 1.08, 0);

  var camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 130);
  camera.position.copy(HOME_POS);
  camera.lookAt(HOME_TARGET);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.85;
  controls.enablePan = false;
  controls.minDistance = 2.0;
  controls.maxDistance = 13;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI * 0.485;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.15;
  controls.update();

  var env = PC.buildEnvironment(scene);
  var bike = PC.buildBike();
  scene.add(bike.group);
  var pelican = PC.buildPelican(bike);
  scene.add(pelican.root);

  var state = {
    time: 0,
    crankAngle: 0,
    wheelAngle: 0,
    speed: 0,
    target: slider.value / 100,
    paused: false,
    frame: 0
  };

  function kmh(speed) {
    return Math.round(speed * 34);
  }

  function refreshSpeedOut() {
    speedOut.textContent = kmh(state.paused ? 0 : state.target) + ' km/h';
  }

  function setPaused(paused) {
    state.paused = paused;
    btnPause.textContent = paused ? '继续' : '暂停';
    btnPause.classList.toggle('active', paused);
    btnPause.setAttribute('aria-pressed', String(paused));
    refreshSpeedOut();
  }

  function setAutoOrbit(on) {
    controls.autoRotate = on;
    btnOrbit.classList.toggle('active', on);
    btnOrbit.setAttribute('aria-pressed', String(on));
  }

  var camTween = null;

  function resetView() {
    camTween = {
      t: 0,
      fromPos: camera.position.clone(),
      toPos: HOME_POS.clone(),
      fromTarget: controls.target.clone(),
      toTarget: HOME_TARGET.clone(),
      restoreOrbit: controls.autoRotate
    };
    controls.autoRotate = false;
  }

  slider.addEventListener('input', function () {
    state.target = slider.value / 100;
    if (state.paused && state.target > 0) setPaused(false);
    refreshSpeedOut();
  });

  btnPause.addEventListener('click', function () {
    setPaused(!state.paused);
  });

  btnOrbit.addEventListener('click', function () {
    setAutoOrbit(!controls.autoRotate);
  });

  btnReset.addEventListener('click', resetView);

  controls.addEventListener('start', function () {
    if (controls.autoRotate) setAutoOrbit(false);
    camTween = null;
  });

  window.addEventListener('keydown', function (event) {
    if (event.code === 'Space') {
      event.preventDefault();
      setPaused(!state.paused);
    } else if (event.code === 'KeyR') {
      resetView();
    }
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function updateTween(dt) {
    if (!camTween) return;
    camTween.t = Math.min(1, camTween.t + dt / 0.75);
    var k = easeInOutCubic(camTween.t);
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, k);
    if (camTween.t >= 1) {
      if (camTween.restoreOrbit) setAutoOrbit(true);
      camTween = null;
    }
  }

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    state.time += dt;
    state.frame++;

    var targetSpeed = state.paused ? 0 : state.target;
    var rate = targetSpeed > state.speed ? 2.0 : 2.6;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * rate);
    if (state.speed < 0.0005) state.speed = 0;
    var speed = state.speed;

    state.crankAngle = (state.crankAngle - 1.5 * speed * Math.PI * 2 * dt) % (Math.PI * 4);
    var wheelRev = 3.9 * speed;
    state.wheelAngle = (state.wheelAngle - wheelRev * Math.PI * 2 * dt) % (Math.PI * 2);

    var groundSpeed = wheelRev * Math.PI * 2 * PC.BIKE.wheelR;

    var pedals = bike.update(state.crankAngle, state.wheelAngle);

    pelican.update({
      crankAngle: state.crankAngle,
      s: speed,
      time: state.time,
      pedalR: pedals.pedalR,
      pedalL: pedals.pedalL
    });

    env.update(dt, groundSpeed, speed);
    updateTween(dt);
    controls.update();
    renderer.render(scene, camera);

    if (state.frame === 2) document.body.classList.add('ready');
  }

  refreshSpeedOut();
  animate();

  window.PC_APP = {
    state: function () {
      return {
        speed: Number(state.speed.toFixed(4)),
        target: state.target,
        paused: state.paused,
        kmh: kmh(state.speed),
        frames: state.frame,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        errors: errorLog.slice()
      };
    },
    setSpeed: function (value) {
      slider.value = String(value);
      slider.dispatchEvent(new Event('input'));
    },
    setPaused: setPaused,
    internals: function () {
      return { renderer: renderer, scene: scene, camera: camera, controls: controls, state: state };
    }
  };
})();
