(function () {
  'use strict';

  var PC = window.PC;
  var C = PC.COLORS;
  var PIVOT = new THREE.Vector3(-0.36, 1.44, 0);

  function materials() {
    return {
      body: PC.std(C.pelican, { roughness: 0.85, metalness: 0.02 }),
      wingTip: PC.std(C.wingTip, { roughness: 0.9 }),
      beak: PC.std(C.beak, { roughness: 0.55 }),
      beakDark: PC.std(0xd97f33, { roughness: 0.6 }),
      pouch: PC.std(C.pouch, { roughness: 0.65 }),
      legs: PC.std(C.legs, { roughness: 0.6 }),
      capRed: PC.std(C.capRed, { roughness: 0.7 }),
      capWhite: PC.std(C.capWhite, { roughness: 0.75 }),
      glasses: PC.std(C.glasses, { roughness: 0.18, metalness: 0.25 }),
      frame: PC.std(C.frameBlack, { roughness: 0.35, metalness: 0.4 })
    };
  }

  function buildFoot(parentPedal, material) {
    var foot = new THREE.Group();
    foot.position.set(0.01, 0.032, 0);

    var pad = PC.make(new THREE.SphereGeometry(1, 14, 10), material, { scale: [0.075, 0.03, 0.06] });
    pad.position.x = -0.012;
    foot.add(pad);

    for (var i = 0; i < 3; i++) {
      var toe = PC.make(new THREE.SphereGeometry(1, 10, 8), material, { scale: [0.045, 0.018, 0.02] });
      toe.position.set(0.055, -0.006, (i - 1) * 0.028);
      toe.rotation.y = (i - 1) * 0.32;
      foot.add(toe);
    }

    parentPedal.add(foot);
    return foot;
  }

  PC.buildPelican = function (bike) {
    var mats = materials();
    var root = new THREE.Group();

    var torso = new THREE.Group();
    torso.position.copy(PIVOT);
    var inner = new THREE.Group();
    inner.position.copy(PIVOT).multiplyScalar(-1);
    torso.add(inner);
    root.add(torso);

    inner.add(PC.make(new THREE.SphereGeometry(1, 28, 20), mats.body, { pos: [-0.36, 1.44, 0], scale: [0.44, 0.36, 0.33] }));
    inner.add(PC.make(new THREE.SphereGeometry(1, 20, 14), mats.body, { pos: [-0.24, 1.48, 0], scale: [0.27, 0.27, 0.26] }));

    var tail = new THREE.Group();
    tail.position.set(-0.70, 1.46, 0);
    tail.rotation.z = -0.28;
    [
      { p: [-0.105, 0.035, 0], s: [0.21, 0.042, 0.095], ry: 0 },
      { p: [-0.085, 0.0, 0.075], s: [0.18, 0.036, 0.082], ry: 0.3 },
      { p: [-0.085, 0.0, -0.075], s: [0.18, 0.036, 0.082], ry: -0.3 }
    ].forEach(function (feather, index) {
      var mesh = PC.make(new THREE.SphereGeometry(1, 12, 8), mats.body, { pos: feather.p, scale: feather.s });
      mesh.rotation.z = index === 0 ? 0 : 0.12;
      mesh.rotation.y = feather.ry;
      tail.add(mesh);
    });
    inner.add(tail);

    var neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.28, 1.62, 0),
      new THREE.Vector3(-0.14, 1.74, 0),
      new THREE.Vector3(0.0, 1.80, 0),
      new THREE.Vector3(0.08, 1.86, 0)
    ]);
    inner.add(PC.make(new THREE.TubeGeometry(neckCurve, 24, 0.098, 12), mats.body, {}));
    inner.add(PC.make(new THREE.SphereGeometry(0.122, 16, 12), mats.body, { pos: [-0.28, 1.62, 0] }));
    inner.add(PC.make(new THREE.SphereGeometry(0.106, 16, 12), mats.body, { pos: [0.08, 1.865, 0] }));

    var head = new THREE.Group();
    head.position.set(0.09, 1.88, 0);
    inner.add(head);

    head.add(PC.make(new THREE.SphereGeometry(0.135, 22, 16), mats.body, { pos: [0.06, 0.07, 0] }));

    var bill = PC.tubeBetween([0.155, 0.06, 0], [0.60, -0.035, 0], 0.072, mats.beak, 14, 0.02);
    bill.scale.set(0.85, 1, 1.5);
    head.add(bill);
    head.add(PC.make(new THREE.SphereGeometry(0.02, 10, 8), mats.beakDark, { pos: [0.615, -0.045, 0] }));

    var pouch = PC.make(new THREE.SphereGeometry(1, 20, 14), mats.pouch, { pos: [0.29, -0.11, 0], scale: [0.215, 0.12, 0.10] });
    pouch.rotation.z = -0.08;
    head.add(pouch);
    head.add(PC.make(new THREE.SphereGeometry(1, 16, 12), mats.pouch, { pos: [0.12, -0.04, 0], scale: [0.105, 0.095, 0.078] }));

    function buildLens(side) {
      var lens = new THREE.Group();
      lens.add(PC.make(new THREE.TorusGeometry(0.055, 0.009, 8, 22), mats.frame, { scale: [1, 0.8, 1] }));
      lens.add(PC.make(new THREE.SphereGeometry(1, 18, 12), mats.glasses, { scale: [0.065, 0.052, 0.016], cast: false }));
      lens.position.set(0.125, 0.035, 0.112 * side);
      lens.rotation.y = -0.6 * side;
      lens.rotation.x = 0.12;
      lens.rotation.z = 0.05;
      return lens;
    }
    head.add(buildLens(1), buildLens(-1));
    head.add(PC.make(new THREE.BoxGeometry(0.02, 0.012, 0.12), mats.frame, { pos: [0.178, 0.058, 0] }));
    head.add(PC.tubeBetween([0.13, 0.045, 0.132], [0.02, 0.035, 0.114], 0.0065, mats.frame, 8));
    head.add(PC.tubeBetween([0.13, 0.045, -0.132], [0.02, 0.035, -0.114], 0.0065, mats.frame, 8));

    var cap = new THREE.Group();
    cap.position.set(0.06, 0.07, 0);
    cap.rotation.z = 0.10;
    for (var i = 0; i < 8; i++) {
      var panel = PC.make(new THREE.SphereGeometry(0.152, 10, 6, (i * Math.PI) / 4, Math.PI / 4, 0, 1.55), i % 2 === 0 ? mats.capRed : mats.capWhite, {});
      cap.add(panel);
    }
    cap.add(PC.make(new THREE.SphereGeometry(0.02, 10, 8), mats.capRed, { pos: [0, 0.15, 0] }));
    cap.add(PC.make(new THREE.CylinderGeometry(0.125, 0.152, 0.014, 18, 1, false, 0, Math.PI), mats.capRed, { pos: [0.05, 0.03, 0], rot: [0, 0, -0.32] }));
    head.add(cap);

    function marker(x, y, z) {
      var object = new THREE.Object3D();
      object.position.set(x, y, z);
      inner.add(object);
      return object;
    }
    var shoulderR = marker(-0.22, 1.54, 0.28);
    var shoulderL = marker(-0.22, 1.54, -0.28);
    var hipR = marker(-0.33, 1.06, 0.10);
    var hipL = marker(-0.33, 1.06, -0.10);

    function buildWing(target) {
      var upper = PC.unitEllipsoid(0.085, 0.055, mats.body);
      var fore = PC.unitEllipsoid(0.095, 0.05, mats.body);
      var ball = PC.make(new THREE.SphereGeometry(0.075, 14, 10), mats.body, { scale: [1, 0.8, 0.9] });
      var hand = PC.make(new THREE.SphereGeometry(1, 14, 10), mats.body, { scale: [0.062, 0.036, 0.05] });
      hand.position.set(target[0], target[1], target[2]);
      root.add(upper, fore, ball, hand);

      [
        [0.028, 0.035, 0.02],
        [-0.005, 0.028, -0.012],
        [-0.03, 0.015, -0.03]
      ].forEach(function (offset, index) {
        var tip = PC.make(new THREE.SphereGeometry(1, 10, 8), mats.wingTip, { scale: [0.07, 0.016, 0.026] });
        tip.position.set(target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]);
        tip.rotation.z = 0.5 + index * 0.25;
        tip.rotation.y = (index - 1) * 0.3;
        root.add(tip);
      });

      return { upper: upper, fore: fore, ball: ball };
    }

    var wingR = buildWing(bike.grips[0]);
    var wingL = buildWing(bike.grips[1]);

    function buildLeg() {
      var thigh = PC.unitCylinder(0.048, 0.038, mats.legs);
      var shin = PC.unitCylinder(0.034, 0.026, mats.legs);
      var knee = PC.make(new THREE.SphereGeometry(0.046, 12, 10), mats.legs, {});
      var ankle = PC.make(new THREE.SphereGeometry(0.032, 12, 10), mats.legs, {});
      root.add(thigh, shin, knee, ankle);
      return { thigh: thigh, shin: shin, knee: knee, ankle: ankle };
    }

    var legR = buildLeg();
    var legL = buildLeg();
    buildFoot(bike.pedalR, mats.legs);
    buildFoot(bike.pedalL, mats.legs);

    var tmp = new THREE.Vector3();

    function updateWing(wing, shoulderMarker) {
      shoulderMarker.getWorldPosition(tmp);
      var solution = PC.twoBone2D(tmp.x, tmp.y, wing.target.x, wing.target.y, 0.37, 0.48, -1);
      PC.placeLimb(wing.upper, tmp.x, tmp.y, tmp.z, solution.kx, solution.ky, tmp.z);
      PC.placeLimb(wing.fore, solution.kx, solution.ky, tmp.z, solution.ex, solution.ey, wing.target.z);
      wing.ball.position.set(tmp.x, tmp.y, tmp.z);
    }

    function updateLeg(leg, hipMarker, pedal) {
      hipMarker.getWorldPosition(tmp);
      var ankleX = pedal.x + 0.005;
      var ankleY = pedal.y + 0.06;
      var solution = PC.twoBone2D(tmp.x, tmp.y, ankleX, ankleY, 0.42, 0.52, 1);
      PC.placeLimb(leg.thigh, tmp.x, tmp.y, tmp.z, solution.kx, solution.ky, tmp.z);
      PC.placeLimb(leg.shin, solution.kx, solution.ky, tmp.z, solution.ex, solution.ey, pedal.z);
      leg.knee.position.set(solution.kx, solution.ky, tmp.z);
      leg.ankle.position.set(solution.ex, solution.ey, pedal.z);
    }

    wingR.target = new THREE.Vector3(bike.grips[0][0], bike.grips[0][1], bike.grips[0][2]);
    wingL.target = new THREE.Vector3(bike.grips[1][0], bike.grips[1][1], bike.grips[1][2]);

    function update(options) {
      var speed = options.s;
      var bob = Math.sin(options.crankAngle) * 0.018 * speed + Math.sin(options.time * 1.7) * 0.005 * (1 - speed);
      torso.position.y = PIVOT.y + bob;
      torso.rotation.z = -0.05 + Math.sin(options.crankAngle) * 0.022 * speed;

      head.rotation.z = Math.sin(options.crankAngle + 0.6) * 0.03 * speed + Math.sin(options.time * 0.8) * 0.015;
      head.rotation.y = Math.sin(options.time * 0.9) * 0.05 + Math.sin(options.crankAngle) * 0.025 * speed;
      tail.rotation.y = Math.sin(options.crankAngle * 0.5) * 0.08 * speed;

      torso.updateMatrixWorld(true);

      updateWing(wingR, shoulderR);
      updateWing(wingL, shoulderL);
      updateLeg(legR, hipR, options.pedalR);
      updateLeg(legL, hipL, options.pedalL);
    }

    return { root: root, update: update };
  };
})();
