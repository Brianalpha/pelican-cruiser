(function () {
  'use strict';

  var PC = (window.PC = window.PC || {});
  var UP = new THREE.Vector3(0, 1, 0);
  var _dir = new THREE.Vector3();

  PC.COLORS = {
    mint: 0x55c99c,
    mintLight: 0x74d5ae,
    mintDark: 0x46ab84,
    tire: 0x3a3d44,
    rim: 0xc9cfd8,
    chrome: 0xb6bcc6,
    steel: 0x8d939c,
    leather: 0x8a5a33,
    leatherDark: 0x6d4426,
    bell: 0xe8b64c,
    amber: 0xff9d5c,
    pelican: 0xf7f3e8,
    wingTip: 0xcdd6dc,
    beak: 0xee9c4a,
    pouch: 0xffc182,
    legs: 0xee9c4a,
    capRed: 0xe2504c,
    capWhite: 0xf6f2e7,
    glasses: 0x22252c,
    frameBlack: 0x2e323a,
    ground: 0xf0e7d5,
    fog: 0xf5ead2,
    dash: 0xc3b092,
    pebble: 0xe0d3ba,
    bush: 0x9dc295,
    bushDark: 0x86af7f,
    trunk: 0x9c7350,
    cloud: 0xffffff
  };

  PC.std = function (color, options) {
    var material = new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.62, metalness: 0.08 }, options || {}));
    material.color.convertSRGBToLinear();
    return material;
  };

  PC.basic = function (color, options) {
    return new THREE.MeshBasicMaterial(Object.assign({ color: color }, options || {}));
  };

  PC.make = function (geometry, material, options) {
    options = options || {};
    var mesh = new THREE.Mesh(geometry, material);
    if (options.pos) mesh.position.fromArray(options.pos);
    if (options.rot) mesh.rotation.fromArray(options.rot);
    if (options.scale) mesh.scale.fromArray(options.scale);
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = !!options.receive;
    return mesh;
  };

  PC.tubeBetween = function (a, b, rStart, material, segments, rEnd) {
    var start = new THREE.Vector3().fromArray(a);
    var end = new THREE.Vector3().fromArray(b);
    var dir = new THREE.Vector3().subVectors(end, start);
    var length = dir.length();
    var geometry = new THREE.CylinderGeometry(rEnd === undefined ? rStart : rEnd, rStart, length, segments || 12);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.copy(start).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
    return mesh;
  };

  PC.makeLimb = function (geometry, material) {
    var mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  };

  PC.unitCylinder = function (radiusTop, radiusBottom, material, segments) {
    return PC.makeLimb(new THREE.CylinderGeometry(radiusTop, radiusBottom, 1, segments || 10), material);
  };

  PC.unitEllipsoid = function (rx, rz, material) {
    var geometry = new THREE.SphereGeometry(1, 14, 10);
    geometry.scale(rx, 0.5, rz);
    return PC.makeLimb(geometry, material);
  };

  PC.placeLimb = function (mesh, ax, ay, az, bx, by, bz) {
    var dx = bx - ax;
    var dy = by - ay;
    var dz = bz - az;
    var length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    mesh.position.set(ax + dx / 2, ay + dy / 2, az + dz / 2);
    _dir.set(dx / length, dy / length, dz / length);
    mesh.quaternion.setFromUnitVectors(UP, _dir);
    mesh.scale.set(1, length, 1);
    return length;
  };

  PC.twoBone2D = function (hx, hy, tx, ty, l1, l2, bend) {
    var dx = tx - hx;
    var dy = ty - hy;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    var clamped = THREE.MathUtils.clamp(dist, Math.abs(l1 - l2) * 1.02 + 1e-4, (l1 + l2) * 0.995);
    var ex = hx + (dx / dist) * clamped;
    var ey = hy + (dy / dist) * clamped;
    var cosA = (l1 * l1 + clamped * clamped - l2 * l2) / (2 * l1 * clamped);
    var angle = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
    var base = Math.atan2(ey - hy, ex - hx);
    var limb = base + bend * angle;
    return {
      kx: hx + Math.cos(limb) * l1,
      ky: hy + Math.sin(limb) * l1,
      ex: ex,
      ey: ey
    };
  };
})();
