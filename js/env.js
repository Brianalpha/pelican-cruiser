(function () {
  'use strict';

  var PC = window.PC;
  var C = PC.COLORS;

  PC.makeSkyTexture = function () {
    var canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 512;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#9fcfe8');
    gradient.addColorStop(0.45, '#c6e3dd');
    gradient.addColorStop(0.72, '#e8ecd9');
    gradient.addColorStop(1, '#f5ead2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 512);
    var texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  };

  function buildLights(scene) {
    scene.add(new THREE.HemisphereLight(0xf4faff, 0xe8dcc2, 0.78));

    var key = new THREE.DirectionalLight(0xfff0d6, 1.25);
    key.position.set(4.5, 7.5, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -2;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 22;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.target.position.set(0, 0.9, 0);
    scene.add(key);
    scene.add(key.target);

    var fill = new THREE.DirectionalLight(0xd8e9ff, 0.42);
    fill.position.set(-5, 3.5, -3.5);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0xffe6bd, 0.28);
    rim.position.set(-1.5, 3, -6);
    scene.add(rim);
  }

  function buildGround(scene) {
    var ground = PC.make(
      new THREE.CircleGeometry(46, 64),
      PC.std(C.ground, { roughness: 1, metalness: 0 }),
      { rot: [-Math.PI / 2, 0, 0], receive: true, cast: false }
    );
    scene.add(ground);
  }

  function buildTrail(scene) {
    var dashes = [];
    var dashGeometry = new THREE.BoxGeometry(0.46, 0.012, 0.075);
    var dashMaterial = PC.std(C.dash, { roughness: 1 });
    [-1.35, 1.35].forEach(function (z) {
      for (var i = 0; i < 28; i++) {
        var dash = new THREE.Mesh(dashGeometry, dashMaterial);
        dash.position.set(-14.7 + i * 1.05, 0.006, z);
        dash.receiveShadow = true;
        scene.add(dash);
        dashes.push(dash);
      }
    });

    var pebbles = [];
    var pebbleGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    pebbleGeometry.scale(1, 0.45, 1);
    var pebbleMaterial = PC.std(C.pebble, { roughness: 1 });
    for (var j = 0; j < 30; j++) {
      var pebble = new THREE.Mesh(pebbleGeometry, pebbleMaterial);
      var side = Math.random() < 0.5 ? -1 : 1;
      pebble.position.set(-14 + Math.random() * 28, 0.012, side * (1.7 + Math.random() * 6.5));
      pebble.scale.setScalar(0.6 + Math.random() * 0.9);
      pebble.receiveShadow = true;
      scene.add(pebble);
      pebbles.push(pebble);
    }

    return { dashes: dashes, pebbles: pebbles };
  }

  function buildScenery(scene) {
    var trunkMaterial = PC.std(C.trunk, { roughness: 0.9 });
    var bushMaterials = [PC.std(C.bush, { roughness: 0.95, flatShading: true }), PC.std(C.bushDark, { roughness: 0.95, flatShading: true })];
    var puffGeometry = new THREE.SphereGeometry(1, 9, 7);
    var trunkGeometry = new THREE.CylinderGeometry(1, 1, 1, 7);
    var items = [];

    function makePlant(x, z, scale, isTree) {
      var group = new THREE.Group();
      var trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      var trunkH = isTree ? 1.35 : 0.42;
      var trunkR = isTree ? 0.06 : 0.032;
      trunk.scale.set(trunkR, trunkH, trunkR);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      group.add(trunk);

      var puffs = isTree ? 5 : 4;
      for (var i = 0; i < puffs; i++) {
        var puff = new THREE.Mesh(puffGeometry, bushMaterials[(i + (isTree ? 1 : 0)) % 2]);
        var angle = (i / puffs) * Math.PI * 2;
        var radius = isTree ? 0.3 : 0.22;
        var size = (isTree ? 0.5 : 0.34) * (0.85 + Math.random() * 0.4);
        puff.scale.set(size * 1.1, size, size * 1.1);
        puff.position.set(Math.cos(angle) * radius, trunkH + size * 0.62, Math.sin(angle) * radius * 0.75);
        puff.castShadow = true;
        group.add(puff);
      }
      var crown = new THREE.Mesh(puffGeometry, bushMaterials[0]);
      var crownSize = isTree ? 0.52 : 0.36;
      crown.scale.set(crownSize * 1.15, crownSize * 0.95, crownSize * 1.15);
      crown.position.y = trunkH + (isTree ? 0.78 : 0.5);
      crown.castShadow = true;
      group.add(crown);

      group.scale.setScalar(scale);
      group.position.set(x, 0, z);
      group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(group);
      items.push(group);
    }

    for (var i = 0; i < 7; i++) {
      var side = i % 2 === 0 ? 1 : -1;
      makePlant(-21 + i * 6 + Math.random() * 3, side * (3.8 + Math.random() * 5.5), 0.75 + Math.random() * 0.6, false);
    }
    makePlant(-16 + Math.random() * 4, 7.4, 1.05, true);
    makePlant(6 + Math.random() * 5, -7.8, 1.15, true);

    return items;
  }

  function buildClouds(scene) {
    var cloudMaterial = PC.basic(C.cloud, { transparent: true, opacity: 0.9 });
    var puffGeometry = new THREE.SphereGeometry(1, 10, 8);
    var clouds = [];
    for (var i = 0; i < 7; i++) {
      var group = new THREE.Group();
      var puffs = 4 + Math.floor(Math.random() * 3);
      for (var j = 0; j < puffs; j++) {
        var puff = new THREE.Mesh(puffGeometry, cloudMaterial);
        var size = 0.4 + Math.random() * 0.7;
        puff.position.set((j - puffs / 2) * 0.7 + Math.random() * 0.3, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.55);
        puff.scale.set(size * 1.5, size * 0.75, size * 1.1);
        group.add(puff);
      }
      group.scale.setScalar(0.5 + Math.random() * 0.55);
      group.position.set(-20 + Math.random() * 40, 5.2 + Math.random() * 2.2, -12 + Math.random() * 24);
      scene.add(group);
      clouds.push(group);
    }
    return clouds;
  }

  function buildStreaks(scene) {
    var geometries = [
      new THREE.BoxGeometry(1, 0.008, 0.01),
      new THREE.BoxGeometry(1, 0.012, 0.014),
      new THREE.BoxGeometry(1, 0.018, 0.02)
    ];
    var streaks = [];
    for (var i = 0; i < 44; i++) {
      var material = PC.basic(0xffffff, { transparent: true, opacity: 0, depthWrite: false });
      var streak = new THREE.Mesh(geometries[i % 3], material);
      streak.castShadow = false;
      streak.userData = {
        mul: 1.25 + Math.random() * 1.15,
        baseLen: 0.5 + Math.random() * 1.1,
        perOpacity: 0.35 + Math.random() * 0.6
      };
      streak.position.set(-4.8 + Math.random() * 10, 0.25 + Math.random() * 2.5, -2.5 + Math.random() * 5);
      streak.rotation.z = (Math.random() - 0.5) * 0.14;
      scene.add(streak);
      streaks.push(streak);
    }
    return streaks;
  }

  PC.buildEnvironment = function (scene) {
    buildLights(scene);
    buildGround(scene);
    var trail = buildTrail(scene);
    var scenery = buildScenery(scene);
    var clouds = buildClouds(scene);
    var streaks = buildStreaks(scene);

    function update(dt, groundSpeed, speed) {
      var i;
      var traveled = groundSpeed * dt;

      for (i = 0; i < trail.dashes.length; i++) {
        trail.dashes[i].position.x -= traveled;
        if (trail.dashes[i].position.x < -14.7) trail.dashes[i].position.x += 29.4;
      }

      for (i = 0; i < trail.pebbles.length; i++) {
        trail.pebbles[i].position.x -= traveled;
        if (trail.pebbles[i].position.x < -14.5) trail.pebbles[i].position.x += 29;
      }

      for (i = 0; i < scenery.length; i++) {
        scenery[i].position.x -= traveled;
        if (scenery[i].position.x < -22) scenery[i].position.x += 44;
      }

      var cloudDrift = (0.28 + groundSpeed * 0.012) * dt;
      for (i = 0; i < clouds.length; i++) {
        clouds[i].position.x -= cloudDrift;
        if (clouds[i].position.x < -22) clouds[i].position.x += 44;
      }

      var visibility = THREE.MathUtils.clamp(speed * 1.4, 0, 1);
      for (i = 0; i < streaks.length; i++) {
        var streak = streaks[i];
        var streakData = streak.userData;
        streak.position.x -= groundSpeed * streakData.mul * dt;
        if (streak.position.x < -4.9) {
          streak.position.x = 4.9 + Math.random() * 1.2;
          streak.position.y = 0.25 + Math.random() * 2.5;
          streak.position.z = -2.5 + Math.random() * 5;
        }
        streak.scale.x = streakData.baseLen * (0.55 + speed * 1.6);
        streak.material.opacity = visibility * streakData.perOpacity * 0.58;
      }
    }

    return { update: update };
  };
})();
