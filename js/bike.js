(function () {
  'use strict';

  var PC = window.PC;
  var C = PC.COLORS;

  var BIKE = {
    wheelR: 0.62,
    tireTube: 0.052,
    rearHub: [-0.66, 0.62, 0],
    frontHub: [0.66, 0.62, 0],
    bb: [0, 0.34, 0],
    crankR: 0.17,
    pedalZ: 0.115,
    crankZ: 0.075,
    grips: [[0.45, 1.07, 0.29], [0.45, 1.07, -0.29]]
  };
  PC.BIKE = BIKE;

  function materials() {
    return {
      frame: PC.std(C.mint, { roughness: 0.32, metalness: 0.22 }),
      fender: PC.std(C.mintLight, { roughness: 0.3, metalness: 0.25 }),
      chrome: PC.std(C.chrome, { roughness: 0.28, metalness: 0.85 }),
      steel: PC.std(C.steel, { roughness: 0.45, metalness: 0.75 }),
      tire: PC.std(C.tire, { roughness: 0.95, metalness: 0 }),
      rim: PC.std(C.rim, { roughness: 0.3, metalness: 0.8 }),
      leather: PC.std(C.leather, { roughness: 0.75, metalness: 0.05 }),
      leatherDark: PC.std(C.leatherDark, { roughness: 0.8 }),
      bell: PC.std(C.bell, { roughness: 0.25, metalness: 0.9 }),
      amber: PC.std(C.amber, { roughness: 0.4, emissive: 0x7a3a12 })
    };
  }

  function buildWheel(mats, hub, fenderRotation, fenderArc) {
    var group = new THREE.Group();
    group.position.fromArray(hub);

    var spin = new THREE.Group();
    group.add(spin);

    var tire = PC.make(new THREE.TorusGeometry(BIKE.wheelR - BIKE.tireTube, BIKE.tireTube, 14, 44), mats.tire, {});
    tire.name = 'wheel-tire';
    spin.add(tire);
    spin.add(PC.make(new THREE.TorusGeometry(0.505, 0.02, 10, 40), mats.rim, { cast: false }));
    spin.add(PC.make(new THREE.CylinderGeometry(0.038, 0.038, 0.1, 12), mats.chrome, { rot: [Math.PI / 2, 0, 0], cast: false }));

    var spokeGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.467, 6);
    for (var i = 0; i < 16; i++) {
      var angle = (i / 16) * Math.PI * 2;
      var spoke = new THREE.Mesh(spokeGeometry, mats.chrome);
      spoke.position.set(Math.cos(angle) * 0.2715, Math.sin(angle) * 0.2715, i % 2 === 0 ? 0.012 : -0.012);
      spoke.rotation.z = angle - Math.PI / 2;
      spin.add(spoke);
    }

    var fender = PC.make(new THREE.TorusGeometry(0.685, 0.028, 8, 36, fenderArc), mats.fender, {});
    fender.rotation.z = fenderRotation;
    group.add(fender);

    return { group: group, spin: spin };
  }

  function chainRun(mats, from, to) {
    var dx = to[0] - from[0];
    var dy = to[1] - from[1];
    var length = Math.sqrt(dx * dx + dy * dy);
    var mesh = PC.make(new THREE.BoxGeometry(length, 0.014, 0.022), mats.steel, {});
    mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0.065);
    mesh.rotation.z = Math.atan2(dy, dx);
    return mesh;
  }

  PC.buildBike = function () {
    var mats = materials();
    var group = new THREE.Group();

    var wheelFront = buildWheel(mats, BIKE.frontHub, 0.42, 2.3);
    var wheelRear = buildWheel(mats, BIKE.rearHub, 0.48, 2.35);
    group.add(wheelFront.group, wheelRear.group);

    var seatTop = [-0.335, 0.99, 0];
    var headTop = [0.505, 1.02, 0];
    var headBottom = [0.555, 0.74, 0];

    group.add(PC.tubeBetween(BIKE.bb, seatTop, 0.034, mats.frame));
    group.add(PC.tubeBetween(BIKE.bb, headBottom, 0.036, mats.frame));
    group.add(PC.tubeBetween(seatTop, headTop, 0.032, mats.frame));
    group.add(PC.tubeBetween(headBottom, headTop, 0.046, mats.steel));
    group.add(PC.tubeBetween([-0.335, 0.98, 0.032], BIKE.rearHub, 0.02, mats.frame));
    group.add(PC.tubeBetween([-0.335, 0.98, -0.032], BIKE.rearHub, 0.02, mats.frame));
    group.add(PC.tubeBetween([BIKE.bb[0], BIKE.bb[1], 0.05], BIKE.rearHub, 0.02, mats.frame));
    group.add(PC.tubeBetween([BIKE.bb[0], BIKE.bb[1], -0.05], BIKE.rearHub, 0.02, mats.frame));

    group.add(PC.tubeBetween([0.555, 0.75, 0.055], BIKE.frontHub, 0.02, mats.frame));
    group.add(PC.tubeBetween([0.555, 0.75, -0.055], BIKE.frontHub, 0.02, mats.frame));
    group.add(PC.tubeBetween([0.555, 0.76, 0.065], [0.555, 0.76, -0.065], 0.028, mats.frame));

    group.add(PC.tubeBetween(seatTop, [-0.355, 1.045, 0], 0.022, mats.chrome));

    var saddle = new THREE.Group();
    saddle.position.set(-0.36, 1.065, 0);
    var seatMain = PC.make(new THREE.SphereGeometry(1, 20, 14), mats.leather, { scale: [0.155, 0.042, 0.115] });
    seatMain.position.set(-0.015, 0, 0);
    var seatNose = PC.make(new THREE.SphereGeometry(1, 16, 12), mats.leather, { scale: [0.095, 0.036, 0.055] });
    seatNose.position.set(0.115, -0.004, 0);
    saddle.add(seatMain, seatNose);
    group.add(saddle);

    group.add(PC.tubeBetween([-0.44, 0.99, 0.055], [-0.44, 1.045, 0.045], 0.012, mats.chrome));
    group.add(PC.tubeBetween([-0.44, 0.99, -0.055], [-0.44, 1.045, -0.045], 0.012, mats.chrome));

    group.add(PC.make(new THREE.CylinderGeometry(0.048, 0.048, 0.16, 14), mats.steel, { pos: BIKE.bb, rot: [Math.PI / 2, 0, 0] }));

    group.add(PC.make(new THREE.TorusGeometry(0.115, 0.013, 8, 26), mats.chrome, { pos: [0, 0.34, 0.065] }));
    group.add(PC.make(new THREE.TorusGeometry(0.05, 0.012, 8, 20), mats.chrome, { pos: [-0.66, 0.62, 0.065] }));
    group.add(chainRun(mats, [0, 0.455], [-0.66, 0.67]));
    group.add(chainRun(mats, [0, 0.225], [-0.66, 0.57]));

    var armR = PC.make(new THREE.BoxGeometry(0.034, 0.19, 0.017), mats.chrome, {});
    armR.position.z = BIKE.crankZ;
    var armL = PC.make(new THREE.BoxGeometry(0.034, 0.19, 0.017), mats.chrome, {});
    armL.position.z = -BIKE.crankZ;
    group.add(armR, armL);

    function makePedal(z) {
      var pedal = new THREE.Group();
      pedal.add(PC.make(new THREE.BoxGeometry(0.108, 0.016, 0.08), mats.tire, {}));
      pedal.add(PC.make(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), mats.chrome, { rot: [Math.PI / 2, 0, 0], pos: [0, -0.008, 0] }));
      pedal.add(PC.make(new THREE.BoxGeometry(0.02, 0.03, 0.09), mats.amber, { pos: [-0.052, 0, 0] }));
      pedal.position.z = z;
      return pedal;
    }

    var pedalR = makePedal(BIKE.pedalZ);
    var pedalL = makePedal(-BIKE.pedalZ);
    group.add(pedalR, pedalL);

    var barCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.44, 1.045, -0.30),
      new THREE.Vector3(0.505, 1.05, -0.255),
      new THREE.Vector3(0.555, 1.058, -0.13),
      new THREE.Vector3(0.505, 1.062, 0),
      new THREE.Vector3(0.555, 1.058, 0.13),
      new THREE.Vector3(0.505, 1.05, 0.255),
      new THREE.Vector3(0.44, 1.045, 0.30)
    ]);
    group.add(PC.make(new THREE.TubeGeometry(barCurve, 48, 0.024, 10), mats.chrome, {}));
    group.add(PC.tubeBetween([0.505, 1.02, 0], [0.505, 1.055, 0], 0.026, mats.chrome));
    group.add(PC.tubeBetween([0.472, 1.047, -0.247], [0.428, 1.045, -0.335], 0.034, mats.leather));
    group.add(PC.tubeBetween([0.472, 1.047, 0.247], [0.428, 1.045, 0.335], 0.034, mats.leather));

    group.add(PC.make(new THREE.SphereGeometry(0.034, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mats.bell, { pos: [0.53, 1.085, 0.075] }));
    group.add(PC.make(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), mats.chrome, { pos: [0.545, 1.075, 0.115], rot: [0.5, 0, 0.4] }));

    function update(crankAngle, wheelAngle) {
      wheelFront.spin.rotation.z = wheelAngle;
      wheelRear.spin.rotation.z = wheelAngle;

      var cosA = Math.cos(crankAngle);
      var sinA = Math.sin(crankAngle);

      armR.position.set(cosA * 0.085, 0.34 + sinA * 0.085, BIKE.crankZ);
      armR.rotation.z = crankAngle - Math.PI / 2;
      armL.position.set(-cosA * 0.085, 0.34 - sinA * 0.085, -BIKE.crankZ);
      armL.rotation.z = crankAngle + Math.PI / 2;

      var pedalRight = { x: cosA * BIKE.crankR, y: 0.34 + sinA * BIKE.crankR, z: BIKE.pedalZ };
      var pedalLeft = { x: -cosA * BIKE.crankR, y: 0.34 - sinA * BIKE.crankR, z: -BIKE.pedalZ };

      pedalR.position.set(pedalRight.x, pedalRight.y, BIKE.pedalZ);
      pedalL.position.set(pedalLeft.x, pedalLeft.y, -BIKE.pedalZ);

      return { pedalR: pedalRight, pedalL: pedalLeft };
    }

    return {
      group: group,
      update: update,
      pedalR: pedalR,
      pedalL: pedalL,
      grips: BIKE.grips
    };
  };
})();
