/* Bag filling comparison animation (three.js). Units: metres, Y up, camera looks from +Z. */
(function () {
  'use strict';
  var V3 = THREE.Vector3;
  var stageEl = document.getElementById('stage');
  var capTitle = document.getElementById('capTitle'), capL1 = document.getElementById('capL1'), capL2 = document.getElementById('capL2');
  var loadingEl = document.getElementById('loading');
  if (!window.THREE || !THREE.OrbitControls) { loadingEl.textContent = 'โหลดตัวแสดงผล 3 มิติไม่สำเร็จ'; return; }

  // ---------- helpers ----------
  function mat(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }, o || {})); }
  var CL = { tan: 0xc9a66b, tanl: 0xd9b87a, green: 0x4f6a45, flex: 0x4d4944, sand: 0xd8c08a, skin: 0xd9a47a, pants: 0x2f4056, shoe: 0x222222, wood: 0xb88a52, steel: 0x8c9199, blue: 0x3b6ea8, dark: 0x2a2a2a };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var ease = function (u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var lerpV = function (a, b, k) { return new V3(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k)); };
  var v3 = function (x, y, z) { return new V3(x, y, z); };
  var UP = new V3(0, 1, 0);

  function limb(r, color, seg) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg || 10), mat(color));
    return m;
  }
  function setLimb(m, a, b) {
    var d = b.clone().sub(a), L = d.length() || 1e-4;
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    m.scale.set(1, L, 1);
  }
  function ik(root, tgt, l1, l2, pole) {
    var d = tgt.clone().sub(root), D = d.length();
    var maxD = l1 + l2 - 1e-3;
    if (D > maxD) { d.setLength(maxD); D = maxD; }
    if (D < 0.05) { d.set(0, -0.05, 0); D = 0.05; }
    var dir = d.clone().normalize();
    var a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
    if (p.length() < 1e-4) p.set(0, 0, 1);
    p.normalize();
    return { joint: root.clone().addScaledVector(dir, a).addScaledVector(p, h), end: root.clone().add(d) };
  }

  function pillowGeo(L, W, T, n, steps) {
    steps = steps || 14; n = n || 3;
    var pos = [], idx = [], i, j;
    function add(y0flat) {
      var base = pos.length / 3;
      for (i = 0; i <= steps; i++) for (j = 0; j <= steps; j++) {
        var u = -1 + 2 * i / steps, v = -1 + 2 * j / steps;
        var hu = Math.pow(1 - Math.pow(Math.abs(u), n), 1 / n), hv = Math.pow(1 - Math.pow(Math.abs(v), n), 1 / n);
        pos.push(u * L / 2, y0flat ? 0 : T * hu * hv, v * W / 2);
      }
      for (i = 0; i < steps; i++) for (j = 0; j < steps; j++) {
        var a = base + i * (steps + 1) + j, b = a + (steps + 1), c = b + 1, d = a + 1;
        if (y0flat) { idx.push(a, b, c, a, c, d); } else { idx.push(a, c, b, a, d, c); }
      }
    }
    add(false); add(true);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  // ===== realistic bag fabrics and geometry (inserted into app.js) =====
  var XR = { on: true, mats: [] };      // x-ray toggle: shells become see-through to show the sand inside
  function setXray(on) {
    XR.on = on;
    XR.mats.forEach(function (m) { m.transparent = on; m.opacity = on ? 0.14 : 1; m.depthWrite = !on; m.needsUpdate = true; });
  }
  function shade(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * k))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  function imgTex(img, rx, ry) {
    var t = new THREE.Texture(img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 4;
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    if (img.complete && img.naturalWidth) t.needsUpdate = true; else img.addEventListener('load', function () { t.needsUpdate = true; });
    return t;
  }
  function canvasOf(draw, size) { var c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return c; }
  var ggsImg = new Image(); ggsImg.src = TEX_GGS;
  var logoImg = new Image(); logoImg.src = TEX_LOGO;
  var wovenGreen = canvasOf(function (x, s) {
    x.fillStyle = '#5c6e4c'; x.fillRect(0, 0, s, s); var tp = s / 24, i, j;
    for (i = 0; i < 24; i++) for (j = 0; j < 24; j++) {
      var over = (i + j) % 2 === 0, k = 0.78 + Math.random() * 0.34; x.fillStyle = shade(over ? '#6a7e57' : '#4a5a3d', k);
      if (over) x.fillRect(i * tp + 0.4, j * tp, tp - 0.8, tp); else x.fillRect(i * tp, j * tp + 0.4, tp, tp - 0.8);
    }
    for (i = 0; i < 900; i++) { x.fillStyle = 'rgba(' + (90 + Math.random() * 60 | 0) + ',' + (84 + Math.random() * 50 | 0) + ',60,' + (Math.random() * 0.16) + ')'; x.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 2 + Math.random() * 4); }
  }, 256);
  var feltDark = canvasOf(function (x, s) {
    x.fillStyle = '#4a4844'; x.fillRect(0, 0, s, s); var i;
    for (i = 0; i < 7000; i++) { var v = 40 + Math.random() * 40 | 0; x.strokeStyle = 'rgba(' + v + ',' + v + ',' + (v - 2) + ',0.45)'; x.lineWidth = 0.7; x.beginPath(); var px = Math.random() * s, py = Math.random() * s, a = Math.random() * 6.28; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5); x.stroke(); }
    for (i = 0; i < 500; i++) { x.fillStyle = 'rgba(120,112,98,' + (Math.random() * 0.12) + ')'; x.fillRect(Math.random() * s, Math.random() * s, 3, 3); }
  }, 256);
  function fabricMap(kind, rx, ry) {
    if (kind === 'ggs') return imgTex(ggsImg, rx, ry);
    var t = new THREE.CanvasTexture(kind === 'bunker' ? wovenGreen : feltDark); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  var FABRIC = { ggs: { rough: 0.9, bump: 0.6, gain: 2.6 }, bunker: { rough: 0.6, bump: 0.25, gain: 1.7 }, flex: { rough: 1.0, bump: 0.35, gain: 2.6 } };
  function fabricMat(kind, rx, ry, extra) {
    var f = FABRIC[kind];
    return new THREE.MeshStandardMaterial(Object.assign({ map: fabricMap(kind, rx, ry), bumpMap: fabricMap(kind, rx, ry), bumpScale: f.bump, color: new THREE.Color(f.gain, f.gain, f.gain), roughness: f.rough, metalness: 0, side: THREE.DoubleSide }, extra || {}));
  }
  function shellFabric(kind, rx, ry, extra) { var m = fabricMat(kind, rx, ry, extra); XR.mats.push(m); if (XR.on) { m.transparent = true; m.opacity = 0.14; m.depthWrite = false; } return m; }

  // pillow lying on the ground; u along length (x), v across (z). opts: n, taper (narrower ends), lump (mm-scale bumps), seed, neck (fraction of the +x end gathered)
  function pillowGeo2(L, W, T, o) {
    o = o || {};
    var n = o.n || 3, nu = o.nu || 44, nv = o.nv || 24, taper = o.taper || 0, amp = o.lump == null ? 0.005 : o.lump, seed = o.seed || 1, neck = o.neck || 0;
    var pos = [], uv = [], idx = [], i, j;
    function pt(u, v, flat) {
      var hu = Math.pow(1 - Math.pow(Math.abs(u), n), 1 / n), hv = Math.pow(1 - Math.pow(Math.abs(v), n), 1 / n);
      var nk = 0; if (neck > 0) { var s = (u - (1 - neck)) / neck; if (s > 0) { s = Math.min(1, s); nk = s * s * (3 - 2 * s); } }
      var ws = (1 - taper * u * u) * (1 - 0.72 * nk), hs = 1 - 0.55 * nk;
      var noise = amp * (Math.sin(5.1 * u + 2.3 * v + seed) + 0.6 * Math.sin(9.7 * u - 3.1 * v + seed * 2.1) + 0.4 * Math.sin(15.3 * u + 7.7 * v + seed * 0.7));
      var y = flat ? 0 : Math.max(0, T * hu * hv * hs + noise * hu * hv * 3);
      return [u * L / 2, y, v * W / 2 * ws];
    }
    function grid(flat) {
      var base = pos.length / 3;
      for (i = 0; i <= nu; i++) for (j = 0; j <= nv; j++) {
        var u = -1 + 2 * i / nu, v = -1 + 2 * j / nv, p = pt(u, v, flat);
        pos.push(p[0], p[1], p[2]); uv.push((u + 1) / 2, (v + 1) / 2);
      }
      for (i = 0; i < nu; i++) for (j = 0; j < nv; j++) {
        var a = base + i * (nv + 1) + j, b = a + (nv + 1), c = b + 1, d = a + 1;
        if (flat) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
      }
    }
    grid(false); grid(true);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // open bag tube (standing), radial wrinkles; unit radius, height h, bottom at y=0
  function bagTubeGeo(h, seed) {
    var g = new THREE.CylinderGeometry(1, 1, h, 44, 26, true); g.translate(0, h / 2, 0);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.sqrt(x * x + z * z);
      var k = 1 + 0.035 * Math.sin(7 * a + y * 9 + seed) + 0.025 * Math.sin(13 * a - y * 5 + seed * 1.7) + 0.02 * Math.sin(3 * a + y * 21 + seed * 0.4);
      var top = Math.max(0, (y - h * 0.9) / (h * 0.1)); k *= 1 + 0.05 * top * Math.sin(17 * a + seed);
      p.setX(i, x / r * k); p.setZ(i, z / r * k);
    }
    g.computeVertexNormals();
    return g;
  }
  function dashedLine(pts, color) {
    var geo = new THREE.BufferGeometry().setFromPoints(pts.map(function (q) { return new V3(q[0], q[1], q[2]); }));
    var l = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({ color: color, dashSize: 0.025, gapSize: 0.018 })); l.computeLineDistances(); return l;
  }
  var logoTexture = function () { var t = imgTex(logoImg, 1, 1); t.center.set(0.5, 0.5); t.rotation = Math.PI; return t; };

  // winged bag lying (real drawing): pillow over the soil part, flat sheet 1.50 x 0.75, V-shaped upper flap, printed seams and fold lines
  function wingedLying() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(pillowGeo2(0.75, 0.45, 0.16, { n: 3.0, taper: 0.05, lump: 0.004, seed: 2 }), fabricMat('ggs', 4, 3, { map: logoTexture() })); body.position.y = 0.006; g.add(body);
    var sheet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.006, 0.75), fabricMat('ggs', 6, 3)); sheet.position.set(0, 0.003, 0.15); g.add(sheet);
    var shp = new THREE.Shape(); shp.moveTo(-0.095, 0); shp.lineTo(0.095, 0); shp.lineTo(0.375, 0.3); shp.lineTo(-0.375, 0.3); shp.lineTo(-0.095, 0);
    var fl = new THREE.Mesh(new THREE.ShapeGeometry(shp), fabricMat('ggs', 2, 2)); fl.rotation.x = Math.PI / 2; fl.position.set(0, 0.0085, 0.225); g.add(fl);
    [-1, 1].forEach(function (s) {
      g.add(dashedLine([[s * 0.375, 0.0095, -0.225], [s * 0.375, 0.0095, 0.525]], 0xf2f2f2));
      g.add(dashedLine([[s * 0.35, 0.0095, -0.225], [s * 0.35, 0.0095, 0.525]], 0xf2f2f2));
      g.add(dashedLine([[s * 0.375, 0.0095, 0.525], [s * 0.095, 0.0095, 0.225]], 0xf2f2f2));
    });
    return g;
  }
  // bunker sandbag lying: woven green polypropylene, lumpy, gathered neck with tie cord and frilled tail, double-stitched sewn end
  function bunkerLying() {
    var g = new THREE.Group(), L = 0.58, ox = -0.04;
    var body = new THREE.Mesh(pillowGeo2(L, 0.31, 0.13, { n: 2.6, taper: 0.1, lump: 0.005, seed: 5, neck: 0.26 }), fabricMat('bunker', 7, 4)); body.position.set(ox, 0.002, 0); g.add(body);
    var cord = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0065, 8, 22), mat(0xd9c9a0)); cord.rotation.y = Math.PI / 2; cord.position.set(ox + L / 2 * 0.80, 0.034, 0); g.add(cord);
    var tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 14, 1, true), fabricMat('bunker', 2, 2)); tail.rotation.z = -Math.PI / 2; tail.scale.set(1, 1, 0.5); tail.position.set(ox + L / 2 + 0.045, 0.026, 0); g.add(tail);
    var seam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.26), mat(0x232c1f)); seam.position.set(ox - L / 2 * 0.94, 0.012, 0); g.add(seam);
    return g;
  }
  // Flex MSE GTX bag lying: dark needle-punched nonwoven, green stitched ends, folded closure flap
  function flexLying() {
    var g = new THREE.Group(), L = 0.76;
    var body = new THREE.Mesh(pillowGeo2(L, 0.30, 0.14, { n: 3.3, taper: 0.07, lump: 0.0035, seed: 9 }), fabricMat('flex', 4, 2)); body.position.y = 0.002; g.add(body);
    [-1, 1].forEach(function (s) { var st = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.003, 0.27), mat(0x45b05a)); st.position.set(s * L / 2 * 0.955, 0.0, 0); st.position.y = 0.012; g.add(st); });
    var fold = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.255), fabricMat('flex', 0.5, 0.5)); fold.position.set(L / 2 + 0.035, 0.005, 0); g.add(fold);
    return g;
  }

  function sprite(text, color, w, h) {
    var c = document.createElement('canvas'); c.width = 1100; c.height = 140;
    var x = c.getContext('2d'); x.font = 'bold 54px Tahoma, "Noto Sans Thai", sans-serif'; x.fillStyle = color || '#222'; x.textBaseline = 'middle';
    x.fillText(text, 10, 70);
    var t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    s.scale.set(w || 3, (w || 3) * 140 / 1100, 1); s.center.set(0, 0.5);
    return s;
  }

  // ---------- person rig ----------
  function Person(shirt) {
    var g = new THREE.Group();
    var legs = [0, 1].map(function () { return { u: limb(0.062, CL.pants, 8), l: limb(0.052, CL.pants, 8), s: new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), mat(CL.shoe)) }; });
    var arms = [0, 1].map(function () { return { u: limb(0.045, shirt, 8), l: limb(0.04, CL.skin, 8), h: new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(CL.skin)) }; });
    var torso = limb(0.15, shirt, 12), head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(CL.skin));
    var helm = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0xf2d21b));
    legs.forEach(function (l) { g.add(l.u, l.l, l.s); }); arms.forEach(function (a) { g.add(a.u, a.l, a.h); });
    g.add(torso, head, helm);
    this.g = g; this.legs = legs; this.arms = arms; this.torso = torso; this.head = head; this.helm = helm;
    this.bend = 0.2; this.crouch = 0; this.walk = null; this.hands = [null, null]; this.sway = 0;
  }
  Person.prototype.update = function (parent, t) {
    var g = this.g, hz = 0.92 - 0.40 * this.crouch, b = this.bend + 0.02 * Math.sin(t * 1.3 + this.sway);
    g.updateWorldMatrix(true, false);
    var hip = v3(0, hz, 0), sho = v3(0, hz + 0.52 * Math.cos(b), 0.52 * Math.sin(b));
    setLimb(this.torso, hip, sho);
    this.head.position.set(0, sho.y + 0.17, sho.z + 0.04 + 0.1 * Math.sin(b)); this.helm.position.copy(this.head.position).add(v3(0, 0.02, -0.005));
    var self = this, walk = this.walk;
    this.legs.forEach(function (lg, i) {
      var s = i ? 1 : -1, hp = v3(s * 0.09, hz, 0), ft = v3(s * 0.09, 0.04, 0);
      if (walk !== null) { var ph = walk + (i ? Math.PI : 0); ft.z = 0.24 * Math.sin(ph); ft.y = 0.04 + Math.max(0, Math.cos(ph)) * 0.09; }
      var r = ik(hp, ft, 0.46, 0.46, v3(0, 0, 1));
      setLimb(lg.u, hp, r.joint); setLimb(lg.l, r.joint, r.end); lg.s.position.copy(r.end).add(v3(0, -0.01, 0.06));
    });
    var tg = this.hands.map(function (h) { return h ? g.worldToLocal(parent.localToWorld(h.clone())) : null; });
    if (tg[0] && tg[1] && tg[0].x > tg[1].x) tg = [tg[1], tg[0]];
    this.arms.forEach(function (am, i) {
      var s = i ? 1 : -1, shd = v3(s * 0.2, sho.y - 0.04, sho.z);
      var tgt = tg[i] || v3(s * 0.25, hz - 0.05 + (walk !== null ? 0.02 : 0), sho.z + 0.03 + (walk !== null ? 0.12 * Math.sin(walk + (i ? 0 : Math.PI)) : 0));
      var r = ik(shd, tgt, 0.33, 0.31, v3(s * 0.7, -1, -0.3));
      setLimb(am.u, shd, r.joint); setLimb(am.l, r.joint, r.end); am.h.position.copy(r.end);
    });
  };

  // ---------- shovel ----------
  function Shovel() {
    var g = new THREE.Group();
    this.handle = limb(0.016, 0xa9824f, 6);
    this.blade = new THREE.Group(); var bm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.02), mat(CL.steel)); bm.position.y = 0.05; this.blade.add(bm);
    this.load = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(CL.sand)); this.load.scale.set(1, 0.5, 1); this.blade.add(this.load); this.load.position.set(0, 0.07, 0.04);
    g.add(this.handle, this.blade); this.g = g;
  }
  Shovel.prototype.set = function (grip, tip, loadAmt) {
    var end = grip.clone().lerp(tip, 0.85); setLimb(this.handle, grip, end);
    this.blade.position.copy(end); this.blade.quaternion.setFromUnitVectors(UP, tip.clone().sub(grip).normalize());
    this.load.visible = loadAmt > 0.02; this.load.scale.set(loadAmt, 0.5 * loadAmt, loadAmt);
  };
  function streamMesh() { var m = limb(0.018, CL.sand, 6); m.visible = false; return m; }
  function pile(x, z, r) { var m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(CL.sand, { flatShading: true })); m.scale.set(r, r * 0.55, r); m.position.set(x, 0, z); return m; }

  // shovel cycle: returns {grip,tip,load,pour}; pile at pilePos
  function shovelCycle(ph, pilePos, mouthGrip, mouthTip) {
    var restGrip = mouthGrip.clone().add(v3(0.1, -0.1, 0.0)), scoopGrip = pilePos.clone().add(v3(-0.1, 0.65, -0.55)), scoopTip = pilePos.clone().add(v3(0, 0.12, 0));
    var grip, tip, load = 0, pour = false;
    if (ph < 0.25) { var k = ease(ph / 0.25); grip = lerpV(restGrip, scoopGrip, k); tip = lerpV(mouthTip.clone().add(v3(0.1, -0.1, 0)), scoopTip, k); load = 0; if (ph > 0.2) load = (ph - 0.2) / 0.05; }
    else if (ph < 0.55) { var k2 = ease((ph - 0.25) / 0.3); grip = lerpV(scoopGrip, mouthGrip, k2); tip = lerpV(scoopTip, mouthTip, k2); load = 1; }
    else if (ph < 0.8) { var k3 = (ph - 0.55) / 0.25; grip = mouthGrip.clone().add(v3(0.05 * k3, 0.05 * k3, 0)); tip = mouthTip.clone().add(v3(0, -0.07 * k3, 0)); load = 1 - ease(k3); pour = k3 < 0.95; }
    else { var k4 = ease((ph - 0.8) / 0.2); grip = lerpV(mouthGrip.clone().add(v3(0.05, 0.05, 0)), restGrip, k4); tip = lerpV(mouthTip.clone().add(v3(0, -0.07, 0)), mouthTip.clone().add(v3(0.1, -0.1, 0)), k4); load = 0; }
    return { grip: grip, tip: tip, load: load, pour: pour };
  }

  // ---------- scenario factory helpers ----------
  function newRoot(ox, oz) { var g = new THREE.Group(); g.position.set(ox || 0, 0, oz || 0); return g; }
  function place(person, x, z, yaw) { person.g.position.set(x, 0, z); person.g.rotation.y = yaw; }

  // ================= A: winged bag =================
  function ScenarioA(ox, oz) {
    var root = newRoot(ox, oz), tan = fabricMat('ggs', 0.7, 1.5);
    // real drawing (flapped soilbag detail): sheet 1.50 x 0.75 m, side flaps 0.35 m each, seams 2.5 cm,
    // soil filling part 0.75 x 0.45 m at the bottom centre, upper flap = V-shaped region above it
    var bag = new THREE.Group(); root.add(bag);
    var pocket = new THREE.Group(); bag.add(pocket);
    var pFront = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.45, 24, 14), shellFabric('ggs', 3, 2, { map: logoTexture() }));
    var pBack = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.45, 24, 14), shellFabric('ggs', 3, 2));
    pFront.position.y = 0.225; pBack.position.y = 0.225; pocket.add(pFront, pBack);
    function setPocket(th) {
      [pFront, pBack].forEach(function (m, k) {
        var pp = m.geometry.attributes.position, sgn = k ? -1 : 1;
        for (var i = 0; i < pp.count; i++) {
          var uu = pp.getX(i) / 0.375, vv = pp.getY(i) / 0.225, hu = Math.pow(1 - Math.pow(Math.abs(uu), 2.4), 1 / 2.4), hv = Math.pow(1 - Math.pow(Math.abs(vv), 2.4), 1 / 2.4);
          pp.setZ(i, sgn * (0.004 + th / 2 * hu * hv));
        }
        pp.needsUpdate = true; m.geometry.computeVertexNormals();
      });
    }
    setPocket(0.02);
    var seamMat = mat(0xd5d5d8);
    [-1, 1].forEach(function (s) {
      var w = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.75, 0.012), tan); w.position.set(s * 0.5625, 0.375, 0); bag.add(w);
      var sm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.75, 0.016), seamMat); sm.position.set(s * 0.375, 0.375, 0); bag.add(sm);
      var sh = new THREE.Shape(); sh.moveTo(s * 0.375, 0.75); sh.lineTo(s * 0.375, 0.45); sh.lineTo(s * 0.095, 0.45); sh.lineTo(s * 0.375, 0.75);
      bag.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), tan));
    });
    var fl = [[-0.375, 0.75, 0], [-0.095, 0.45, 0], [0.375, 0.75, 0], [0.095, 0.45, 0], [-0.375, 0.45, 0], [0.375, 0.45, 0]];
    var foldGeo = new THREE.BufferGeometry().setFromPoints(fl.map(function (q) { return v3(q[0], q[1], 0.01); }));
    var fold = new THREE.LineSegments(foldGeo, new THREE.LineDashedMaterial({ color: 0xf0f0f0, dashSize: 0.03, gapSize: 0.02 })); fold.computeLineDistances(); bag.add(fold);
    // upper flap (V region): pivots on the soil-part top edge
    var flap = new THREE.Group(); flap.position.y = 0.45; bag.add(flap);
    var fs = new THREE.Shape(); fs.moveTo(-0.095, 0); fs.lineTo(0.095, 0); fs.lineTo(0.375, 0.3); fs.lineTo(-0.375, 0.3); fs.lineTo(-0.095, 0);
    flap.add(new THREE.Mesh(new THREE.ShapeGeometry(fs), fabricMat('ggs', 2, 2)));
    flap.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ShapeGeometry(fs)), new THREE.LineBasicMaterial({ color: 0xe8e8e8 })));
    function flapCorner(side, ang) { return v3(side * 0.375, 0.45 + 0.3 * Math.cos(ang), 0.3 * Math.sin(ang)); }
    // sand height-field
    var sg = new THREE.BoxGeometry(0.72, 1, 1, 24, 1, 1), sbase = sg.attributes.position.array.slice();
    var sand = new THREE.Mesh(sg, mat(CL.sand, { flatShading: true })); bag.add(sand);
    function setSand(fill, spread, thick) {
      var pa = sg.attributes.position.array;
      for (var i = 0; i < pa.length; i += 3) {
        var x = sbase[i], top = sbase[i + 1] > 0, h;
        if (!top) h = 0;
        else {
          var mound = fill * 0.45 * (0.25 + 2.4 * Math.exp(-Math.pow(x / 0.11, 2))), flat = fill * 0.45;
          h = Math.min(0.5, lerp(mound, flat, spread)); if (fill <= 0.001) h = 0;
        }
        pa[i + 1] = h; pa[i + 2] = sbase[i + 2] * thick;
      }
      sg.attributes.position.needsUpdate = true; sg.computeVertexNormals();
      sand.visible = fill > 0.001;
    }
    var p1 = new Person(0x2e8b57), p2 = new Person(0xe07b00); place(p1, 0, -0.68, 0); place(p2, 0.98, 0, -Math.PI / 2);
    root.add(p1.g, p2.g);
    var shovel = new Shovel(); root.add(shovel.g); var stream = streamMesh(); root.add(stream);
    var pl = v3(0.95, 0, 0.95); root.add(pile(pl.x, pl.z, 0.28));
    var mouthGrip = v3(1.12, 0.9, 0), mouthTip = v3(0.16, 0.98, 0);
    var rimL = v3(-0.375, 0.76, 0), rimR = v3(0.375, 0.76, 0);

    function update(si, u, t) {
      var ang = -0.6, cyc = null, fill = 0, spread = 0, s = 0, pressing = false;
      if (si === 0) { ang = -0.6 * ease(u); }
      else if (si === 1) { fill = 0.45 * u; spread = 0.15 * u; cyc = (u * 3) % 1; }
      else {
        fill = 0.45 + 0.52 * u; spread = 0.15 + 0.85 * ease(u);
        var cp = (u * 4) % 1;
        if (cp < 0.5) { pressing = true; s = 0.5 - 0.5 * Math.cos(cp / 0.5 * 4 * Math.PI); } else { cyc = (cp - 0.5) / 0.5; }
      }
      // the bag is pushed, squeezed and shaken when P2 kneads it; P1 holds the top corners so the bag sways between the hands
      bag.rotation.set(0.04 * Math.sin(t * 22) * s, 0, 0.16 * s); bag.position.set(-0.08 * s, 0.025 * Math.sin(t * 22) * s, 0); bag.scale.set(1 - 0.07 * s, 1 + 0.03 * s, 1); bag.updateMatrix();
      flap.rotation.x = ang;
      var thick = 0.02 + 0.13 * Math.min(1, fill / 0.97); setPocket(thick * (1 + 0.18 * s));
      setSand(fill, spread, thick * 0.8 * (1 + 0.18 * s));
      var rl = flapCorner(-1, ang), rr = flapCorner(1, ang);
      if (si === 0) { rl = lerpV(v3(-0.3, 0.55, -0.45), rl, ease(u)); rr = lerpV(v3(0.3, 0.55, -0.45), rr, ease(u)); }
      else { rl.applyMatrix4(bag.matrix); rr.applyMatrix4(bag.matrix); }
      p1.bend = 0.25 + 0.1 * s; p1.hands = [rl, rr]; p1.update(root, t);
      stream.visible = false;
      var topY = 0.45 * Math.max(0.1, fill) + 0.04;
      if (si === 0) {
        var k0 = ease(u); var g0 = lerpV(v3(1.15, 0.7, 0.5), mouthGrip, k0), t0 = lerpV(v3(1.0, 0.2, 0.7), mouthTip.clone().add(v3(0.1, -0.1, 0)), k0);
        shovel.set(g0, t0, 0.8); p2.hands = [g0, g0.clone().lerp(t0, 0.38)]; p2.bend = 0.3; p2.crouch = 0.05;
      } else if (pressing) {
        shovel.g.visible = false;
        p2.hands = [v3(lerp(0.52, 0.32, s), 0.36, 0.12).applyMatrix4(bag.matrix), v3(lerp(0.55, 0.36, s), 0.27, -0.12).applyMatrix4(bag.matrix)];
        p2.bend = 0.5; p2.crouch = 0.2;
      } else {
        shovel.g.visible = true; p2.crouch = 0.1; p2.bend = 0.35;
        var c = shovelCycle(cyc, pl, mouthGrip, mouthTip); shovel.set(c.grip, c.tip, c.load); p2.hands = [c.grip, c.grip.clone().lerp(c.tip, 0.38)];
        if (c.pour) { stream.visible = true; setLimb(stream, c.tip.clone(), v3(0, Math.max(topY, 0.3), 0)); }
      }
      p2.update(root, t);
    }
    return { root: root, update: update, view: { c: v3(0.3, 0.6, 0), d: 3.6 }, steps: A_STEPS };
  }
  var A_STEPS = [
    { n: 'A1 กางปีกบน (Upper flap) ให้อ้า', a: 'คนที่ 1 ยืนด้านหลัง จับมุมบนของปีกบนสองข้างให้เอนหลังเปิดปากกรวย', b: 'ปีกบนเป็นรูปตัววี กว้างบน 0.75 ม. คอแคบ ~0.19 ม. ผ้าอ่อน ปล่อยมือแล้วปากหุบ', d: 6 },
    { n: 'A2 ตักทรายลงปากกรวย ผ่านคอแคบ', a: 'ทรายลอดคอแคบลงถุงเป็นกองตั้งตรงกลาง', b: 'ด้านข้างของถุง (กว้าง 0.75 ม.) ยังว่าง', d: 12 },
    { n: 'A3 ขย้ำถุงให้ทรายไหลลงข้างๆ แล้วตักเพิ่ม', a: 'คนที่ 2 วางพลั่วแล้วขย้ำถุงให้ทรายไหลไปด้านข้าง ถุงขยับตามแรงบีบ คนที่ 1 จับปากไว้ตลอด', b: 'ทำซ้ำจนเต็มความกว้าง 0.75 ม. ได้ 1 ใบ ทราย ~55 ลิตร หนัก ~78–80 กก. ยกต่อต้องใช้ 2 คน', d: 18 }
  ];

  // ================= B: bunker bag =================
  function ScenarioB(ox, oz) {
    var root = newRoot(ox, oz);
    var col = new THREE.Mesh(bagTubeGeo(0.75, 3), shellFabric('bunker', 6, 5)); root.add(col);
    var cap = new THREE.Mesh(new THREE.CircleGeometry(1, 36), shellFabric('bunker', 3, 3)); cap.rotation.x = -Math.PI / 2; cap.position.y = 0.002; root.add(cap);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 48), mat(0x3d4f35)); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.75; root.add(rim);
    var sand = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), mat(CL.sand)); root.add(sand);
    var lying = bunkerLying(); root.add(lying); lying.rotation.y = Math.PI / 2;
    var p1 = new Person(0x2e8b57), p2 = new Person(0xe07b00); place(p1, 0, -0.62, 0); place(p2, 0.98, 0, -Math.PI / 2); root.add(p1.g, p2.g);
    var shovel = new Shovel(); root.add(shovel.g); var stream = streamMesh(); root.add(stream);
    var pl = v3(0.95, 0, 0.95); root.add(pile(pl.x, pl.z, 0.28));
    var mouthGrip = v3(1.1, 0.88, 0), mouthTip = v3(0.16, 0.95, 0);
    function update(si, u, t) {
      var open = si === 0 ? ease(u) : 1, level = 0, cyc = null, lay = 0;
      if (si === 1) { level = 0.25 * u; cyc = (u * 3) % 1; }
      else if (si === 2) { level = 0.25 + 0.25 * u; cyc = (u * 3) % 1; }
      else if (si === 3) { level = 0.5; lay = ease((u - 0.35) / 0.4); }
      var rx = lerp(0.175, 0.155, open), ry = lerp(0.012, 0.10, open);
      col.scale.set(rx, 1, ry); col.visible = lay < 0.5; cap.scale.set(rx, ry, 1); rim.scale.set(rx, ry, 1); cap.visible = rim.visible = col.visible; sand.visible = level > 0.005 && lay < 0.5;
      sand.scale.set(rx * 0.93, Math.max(0.001, level), ry * 0.9); sand.position.y = level / 2;
      lying.visible = lay >= 0.5;
      var rl = v3(-0.16, 0.76, 0), rr = v3(0.16, 0.76, 0);
      if (si === 0) { rl = lerpV(v3(-0.3, 0.55, -0.45), rl, ease(u)); rr = lerpV(v3(0.3, 0.55, -0.45), rr, ease(u)); }
      p1.bend = 0.25; p1.crouch = 0.05; p1.hands = [rl, rr];
      stream.visible = false;
      if (si === 3) {
        var k = ease(u);
        p1.crouch = 0.85 * k; p1.bend = 0.25 + 0.55 * k; p1.hands = [lerpV(rl, v3(-0.1, 0.12, 0.1), k), lerpV(rr, v3(0.1, 0.12, -0.1), k)];
        shovel.g.visible = false; p2.hands = [null, null]; p2.crouch = 0; p2.bend = 0.15;
      } else {
        shovel.g.visible = true; p2.crouch = 0.1; p2.bend = 0.35;
        var c;
        if (si === 0) { var k0 = ease(u); c = { grip: lerpV(v3(1.15, 0.7, 0.5), mouthGrip, k0), tip: lerpV(v3(1.0, 0.2, 0.7), mouthTip.clone().add(v3(0.1, -0.1, 0)), k0), load: 0.8, pour: false }; }
        else c = shovelCycle(cyc, pl, mouthGrip, mouthTip);
        shovel.set(c.grip, c.tip, c.load); p2.hands = [c.grip, c.grip.clone().lerp(c.tip, 0.38)];
        if (c.pour) { stream.visible = true; setLimb(stream, c.tip, v3(0, Math.max(0.1, level) + 0.02, 0)); }
      }
      p1.update(root, t); p2.update(root, t);
    }
    return { root: root, update: update, view: { c: v3(0.3, 0.7, 0), d: 4.2 }, steps: B_STEPS };
  }
  var B_STEPS = [
    { n: 'B1 ตั้งกระสอบ ปากกว้าง', a: 'ปากกว้าง 0.35 ม. กางค้างได้ ตั้งตรงได้', b: 'คนหนึ่งถือปาก อีกคนตัก', d: 6 },
    { n: 'B2 ตักทรายใส่ปากกว้าง', a: 'ทรายลงตรงกลางปากได้เลย ไม่ต้องดันข้าง', b: 'ทรายกระจายเต็มหน้าตัดเอง', d: 10 },
    { n: 'B3 กรอกประมาณ 2 ใน 3 ของถุง', a: 'ทุกใบสูงเท่ากัน ขนาดสม่ำเสมอ', b: 'ทราย ~17 ลิตร หนัก ~15–24 กก.', d: 10 },
    { n: 'B4 พับปาก ผูก แล้ววางนอน', a: 'ได้ 1 ใบ หนัก ~15–24 กก.', b: 'คนเดียวยกได้', d: 8 }
  ];

  // ================= C: Flex MSE jig =================
  function ScenarioC(ox, oz) {
    var root = newRoot(ox, oz), wood = mat(CL.wood);
    var jig = new THREE.Group(), top = 0.8, w = 1.46, d = 0.62;
    function bx(x, y, z, sx, sy, sz, m) { var b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m || wood); b.position.set(x, y, z); jig.add(b); }
    bx(0, top + 0.02, -d / 2 + 0.035, w, 0.04, 0.07); bx(0, top + 0.02, d / 2 - 0.035, w, 0.04, 0.07); bx(-w / 2 + 0.05, top + 0.02, 0, 0.1, 0.04, d); bx(w / 2 - 0.05, top + 0.02, 0, 0.1, 0.04, d);
    [-1, 1].forEach(function (s) { bx(s * 0.21, top + 0.02, 0, 0.11, 0.04, d); }); bx(0, top + 0.02, 0, w, 0.04, 0.07);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) { bx(s[0] * (w / 2 - 0.05), top / 2, s[1] * (d / 2 - 0.05), 0.06, top, 0.06); });
    root.add(jig);
    var bags = [];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) {
      var bg = new THREE.Group(), x = -0.42 + i * 0.42, z = -0.12 + j * 0.24; bg.position.set(x, 0, z);
      var cyl = new THREE.Mesh(bagTubeGeo(0.77, i * 2 + j + 1), shellFabric('flex', 4, 4)); cyl.position.y = 0.03;
      var bcap = new THREE.Mesh(new THREE.CircleGeometry(1, 28), shellFabric('flex', 1, 1)); bcap.rotation.x = -Math.PI / 2; bcap.position.y = 0.032;
      var snd = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16), mat(CL.sand)); bg.add(cyl, bcap, snd); root.add(bg); jig.add(bg); bags.push({ g: bg, cyl: cyl, cap: bcap, snd: snd });
    }
    var heap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(CL.sand, { flatShading: true })); heap.position.y = top + 0.04; root.add(heap);
    // skid steer
    var ss = new THREE.Group(); ss.position.set(0, 0, -2.6); ss.rotation.y = 0;
    function sb(x, y, z, sx, sy, sz, c, o) { var b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c, o)); b.position.set(x, y, z); ss.add(b); return b; }
    sb(0, 0.45, -0.1, 1.1, 0.55, 1.5, 0xe8a21a); sb(0, 1.15, -0.2, 0.9, 0.85, 0.9, 0x90b4c8, { transparent: true, opacity: 0.5 });
    [[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.45], [0.62, 0.45]].forEach(function (p) { var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14), mat(CL.dark)); wh.rotation.z = Math.PI / 2; wh.position.set(p[0], 0.22, p[1]); ss.add(wh); });
    var bucket = new THREE.Group(); bucket.position.set(0, 0.85, 0.85); ss.add(bucket);
    [[0, -0.1, 0, 1.2, 0.05, 0.5], [-0.6, 0.05, 0, 0.05, 0.35, 0.5], [0.6, 0.05, 0, 0.05, 0.35, 0.5], [0, 0.05, 0.25, 1.2, 0.35, 0.05]].forEach(function (a) { var b = new THREE.Mesh(new THREE.BoxGeometry(a[3], a[4], a[5]), mat(0xe8a21a)); b.position.set(a[0], a[1], a[2]); bucket.add(b); });
    var arms = [-0.5, 0.5].map(function (x) { var a = limb(0.04, 0xe8a21a, 6); ss.add(a); return { m: a, x: x }; });
    root.add(ss);
    var palletG = new THREE.Group(); palletG.position.set(0, 0, 0); root.add(palletG);
    var pb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.9), wood); pb.position.y = 0.06; palletG.add(pb);
    var pbags = []; for (var k = 0; k < 4; k++) for (var r = 0; r < 3; r++) { var m = flexLying(); m.position.set(0, 0.12 + k * 0.125, -0.31 + r * 0.31); palletG.add(m); pbags.push(m); }
    var p1 = new Person(0x2e8b57), p2 = new Person(0xe07b00); place(p1, -1.05, 0, Math.PI / 2); place(p2, 1.05, 0, -Math.PI / 2); root.add(p1.g, p2.g);
    function update(si, u, t) {
      var open = si === 0 ? ease(u) : 1, fill = 0, heapS = 0, tilt = 0, sweep = 0, tamp = 0;
      if (si === 1) { fill = 0.55 * ease(u); tilt = ease(u / 0.6) * 0.9; heapS = ease(u); }
      else if (si === 2) { fill = 0.55 + 0.45 * ease(u); heapS = 1 - ease(u / 0.9); sweep = 1; tamp = u > 0.85 ? 1 : 0; tilt = 0.9 * (1 - ease(u / 0.3)); }
      else if (si === 3) { fill = 1; }
      jig.visible = si !== 3; heap.visible = heapS > 0.02; palletG.visible = si === 3;
      bags.forEach(function (b, n) { b.cyl.scale.set(0.15, 1, lerp(0.012, 0.075, open)); b.cap.scale.set(0.15, lerp(0.012, 0.075, open), 1); b.snd.visible = fill > 0.01; var lv = Math.max(0.001, 0.77 * fill * (tamp ? 0.97 : 1)); b.snd.scale.set(0.14, lv, 0.068 * open); b.snd.position.y = 0.03 + lv / 2; });
      heap.scale.set(0.62 * heapS + 0.01, 0.3 * heapS + 0.01, 0.3 * heapS + 0.01);
      bucket.rotation.x = tilt * 0.9; ss.position.z = -2.6; setLimb(arms[0].m, v3(-0.5, 1.0, -0.4), v3(-0.5, 0.85, 0.85)); setLimb(arms[1].m, v3(0.5, 1.0, -0.4), v3(0.5, 0.85, 0.85));
      p1.walk = null; p2.walk = null;
      if (si === 3) {
        pbags.forEach(function (m, n) { var k = clamp(u * 1.4 - n / pbags.length * 0.9, 0, 1); m.scale.setScalar(Math.max(0.001, ease(k))); });
        p1.bend = 0.4; p1.hands = [v3(-0.3, 0.9, 0.2), v3(-0.2, 0.85, -0.2)]; p2.bend = 0.1; p2.hands = [null, null];
      } else if (si === 2) {
        var sw = Math.sin(t * 5), hy = 0.9 - (tamp ? 0.06 * (0.5 + 0.5 * Math.sin(t * 8)) : 0);
        p1.bend = 0.5; p2.bend = 0.5; p1.hands = [v3(-0.55 + 0.4 * sw, hy, -0.12), v3(-0.45 + 0.4 * sw, hy, 0.12)]; p2.hands = [v3(0.55 - 0.4 * sw, hy, 0.12), v3(0.45 - 0.4 * sw, hy, -0.12)];
      } else {
        p1.bend = 0.2; p2.bend = 0.2; p1.hands = [v3(-0.72, 0.88, -0.1), v3(-0.72, 0.88, 0.2)]; p2.hands = [v3(0.72, 0.88, -0.1), v3(0.72, 0.88, 0.2)];
      }
      p1.update(root, t); p2.update(root, t);
    }
    return { root: root, update: update, view: { c: v3(0, 0.8, -0.8), d: 5.4 }, steps: C_STEPS };
  }
  var C_STEPS = [
    { n: 'C1 วางแม่แบบ (jig) แขวนถุงเปล่า', a: 'แม่แบบมีช่องเท่าปากถุง (ในคลิป 18 ช่อง)', b: 'ทุกถุงแขวนปากเปิดพร้อมกรอก', d: 6 },
    { n: 'C2 รถตักเทดิน/ทรายลงบนแม่แบบ', a: 'เทกองเดียวลงหลายช่องพร้อมกัน', b: 'ในคลิป ทำได้ถึง 600 ใบต่อวัน', d: 10 },
    { n: 'C3 กวาดเข้าช่อง กรอกเต็มปากถุง', a: 'กรอกเต็มปากแล้วกระทุ้งให้ทรายแน่นทุกใบ', b: 'ปริมาตรเท่ากัน ขั้นต่ำ 32 ลิตร', d: 12 },
    { n: 'C4 ผูกปาก เรียงบนพาเลต', a: 'ใบละ ~45–46 กก. (ทรายหลวมแห้ง)', b: 'พาเลตละ 42 ใบ ขนด้วยรถ', d: 8 }
  ];

  // ================= compare (all three) =================
  function ScenarioCompare() {
    var root = newRoot(0, 0), a = ScenarioA(-6.0, 0), b = ScenarioB(-0.2, 0), c = ScenarioC(5.2, 0);
    root.add(a.root, b.root, c.root);
    var la = sprite('กระสอบมีปีก', '#8a5a14', 3.2); la.position.set(-6.7, 2.25, 0); root.add(la);
    var lb = sprite('กระสอบบังเกอร์', '#2f4f25', 3.2); lb.position.set(-0.9, 2.25, 0); root.add(lb);
    var lc = sprite('Flex MSE', '#444', 3.2); lc.position.set(4.5, 2.25, 0); root.add(lc);
    var steps = [
      { n: 'ขั้นที่ 1 เตรียมกระสอบ/ปาก', a: 'มีปีก: ปากกรวยผ้าอ่อน ต้องมีคนจับ | บังเกอร์: ปากกว้างกางค้างได้ | Flex: แขวนในแม่แบบ', b: 'ภาพจำลองไม่ใช่เวลาจริง ทั้งสามแบบเดินตามขั้นเดียวกัน', d: 6 },
      { n: 'ขั้นที่ 2 ตักทรายลง', a: 'มีปีก: ทรายผ่านคอแคบ กองกลาง | บังเกอร์: ลงเต็มหน้าตัด | Flex: เทกองเดียวลงหลายช่อง', b: 'รูปทรงปากกำหนดว่าทรายกระจายเองหรือต้องดัน', d: 11 },
      { n: 'ขั้นที่ 3 ทำให้เต็มทั่วถุง', a: 'มีปีก: ต้องบีบ/ดันทรายออกข้าง ใช้ 2 คน | บังเกอร์: กรอก 2/3 | Flex: กวาดเข้าช่อง กระทุ้ง', b: 'กระสอบมีปีกเป็นขั้นที่ใช้แรงและเวลามากที่สุด', d: 14 },
      { n: 'ขั้นที่ 4 ปิดปากกระสอบ', a: 'มีปีก ~78–80 กก. ยก 2 คน | บังเกอร์ ~15–24 กก. ยก 1 คน | Flex ~45–46 กก. ยก 2 คน', b: 'น้ำหนักและความสม่ำเสมอของขนาดต่างกันชัดเจน', d: 7 }
    ];
    function update(si, u, t) {
      // sub-scenarios use their own step lengths, map this step index/u onto theirs
      a.update(Math.min(si, 2), si > 2 ? 1 : u, t); b.update(si, u, t); c.update(si, u, t);
    }
    return { root: root, update: update, view: { c: v3(-0.2, 0.9, 0), d: 10 }, steps: steps };
  }

  // ================= sizes (static) =================
  function ScenarioSizes() {
    var root = newRoot(0, 0);
    var pe = new Person(0xe07b00); place(pe, -2.3, 0.2, 0); pe.bend = 0; pe.crouch = 0; root.add(pe.g); pe.update(root, 0);
    var wb = wingedLying(); root.add(wb);
    var bb = bunkerLying(); bb.position.set(2.4, 0, 0); root.add(bb);
    var fb = flexLying(); fb.position.set(4.7, 0, 0); root.add(fb);
    function lab(name, w, x, color, wc) { var s = sprite(name, color, 2.6); s.position.set(x - 0.9, 1.5, 0.3); root.add(s); var s2 = sprite(w, wc, 2.6); s2.position.set(x - 0.9, 1.2, 0.3); root.add(s2); }
    lab('กระสอบมีปีก (GGS)', 'ทราย ~55.6 ลิตร · ~78–80 กก.', 0, '#8a5a14', '#cc0000');
    lab('กระสอบบังเกอร์', 'ทราย ~11–17 ลิตร · ~15–24 กก.', 2.4, '#2f4f25', '#008800');
    lab('Flex MSE', 'ทราย ≥32 ลิตร · ~45–46 กก.', 4.7, '#444', '#cc6600');
    var sizes = { n: 'ขนาดหลังกรอก เทียบกับคนสูง 1.70 ม.', a: 'กระสอบมีปีกใหญ่ที่สุด ผ้าแบนก่อนกรอก 1.50 x 0.75 ม. ส่วนบรรจุ 0.75 x 0.45 ม.', b: 'ขนาดหลังกรอกเป็นค่าประมาณจากแบบ ป้ายสินค้า และคลิป ไม่ใช่การวัดจริง', d: 10 };
    function update() { }
    return { root: root, update: update, view: { c: v3(1.3, 0.8, 0), d: 5.6 }, steps: [sizes], still: true };
  }

  // ================= wheelbarrow carrying =================
  function barrow() {
    var g = new THREE.Group(), steel = mat(CL.blue), dark = mat(CL.dark);
    function bx(x, y, z, sx, sy, sz) { var b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), steel); b.position.set(x, y, z); g.add(b); }
    bx(0, 0.372, 0.33, 0.62, 0.025, 0.95); bx(-0.31, 0.47, 0.33, 0.025, 0.22, 0.95); bx(0.31, 0.47, 0.33, 0.025, 0.22, 0.95); bx(0, 0.47, 0.8, 0.62, 0.22, 0.025); bx(0, 0.42, -0.15, 0.62, 0.12, 0.025);
    [-0.26, 0.26].forEach(function (s) { var h = limb(0.017, CL.dark, 6); setLimb(h, v3(s, 0.5, -0.15), v3(s, 0.84, -0.75)); g.add(h); var h2 = limb(0.017, CL.dark, 6); setLimb(h2, v3(s, 0.3, 0.55), v3(s, 0.5, -0.15)); g.add(h2); var lg = limb(0.015, CL.dark, 6); setLimb(lg, v3(s, 0.5, -0.15), v3(s, 0, -0.15)); g.add(lg); });
    var wheel = new THREE.Group(); var wm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 16), mat(0x111111)); wm.rotation.z = Math.PI / 2; wheel.add(wm); var sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.04), mat(0x888888)); wheel.add(sp); wheel.position.set(0, 0.2, 0.88); g.add(wheel);
    g.userData.wheel = wheel; return g;
  }
  function loadBags(kind) {
    var g = new THREE.Group();
    function add(geo, color, x, y, z, ry) { var m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); }
    if (kind === 'A') { for (var l = 0; l < 2; l++) { var wbg = wingedLying(); wbg.position.set(0, 0.385 + l * 0.2, 0.33); wbg.rotation.y = Math.PI / 2; wbg.scale.set(0.7, 1, 0.7); g.add(wbg); } }
    else if (kind === 'B') { var layer = 0; [2, 2, 2, 1].forEach(function (n) { for (var k = 0; k < n; k++) { var bb_ = bunkerLying(); bb_.position.set(n === 2 ? (k ? 0.15 : -0.15) : 0, 0.385 + layer * 0.13, 0.33); bb_.rotation.y = Math.PI / 2; g.add(bb_); } layer++; }); }
    else { for (var l2 = 0; l2 < 2; l2++) for (var k2 = 0; k2 < 2; k2++) { var fb_ = flexLying(); fb_.position.set(k2 ? 0.16 : -0.16, 0.385 + l2 * 0.14, 0.33); fb_.rotation.y = Math.PI / 2; g.add(fb_); } }
    return g;
  }
  function ScenarioBarrow() {
    var root = newRoot(0, 0), lanes = [{ k: 'A', z: -2.6, c: 0x2e8b57, t: 'A กระสอบมีปีก 2 ใบ ~156–160 กก.' }, { k: 'B', z: 0, c: 0x2e8b57, t: 'B กระสอบบังเกอร์ 7 ใบ ~167 กก.' }, { k: 'C', z: 2.6, c: 0x2e8b57, t: 'C Flex MSE 4 ใบ ~179–184 กก.' }], items = [];
    lanes.forEach(function (ln) {
      var p = new Person(ln.c), bw = barrow(), ld = loadBags(ln.k); bw.add(ld); var grp = new THREE.Group(); grp.add(bw); root.add(grp, p.g);
      var s = sprite(ln.t, '#222', 3.4); s.position.set(-4.6, ln.k === 'A' ? 2.75 : ln.k === 'B' ? 2.2 : 1.65, ln.z); root.add(s);
      items.push({ p: p, grp: grp, z: ln.z });
    });
    function update(si, u, t) {
      var cyc = (t * 0.12) % 1, tri = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2, dir = cyc < 0.5 ? 1 : -1, x = -3.4 + 6.8 * ease(tri), dist = x;
      items.forEach(function (it) {
        // person behind barrow: barrow front faces +z local; rotate so front faces travel direction (+x)
        var yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2, sx = dir;
        it.grp.position.set(x + sx * 1.15 * 0.0, 0, it.z); it.grp.rotation.y = yaw;
        // person stands 1.15 m behind the barrow origin, grips at (+-0.26, 0.84, -0.75) in barrow-local
        var px = x - sx * 1.15, ph = dist * 5.5;
        place(it.p, px, it.z, yaw); it.p.bend = 0.6; it.p.crouch = 0.05; it.p.walk = (cyc > 0.01 && cyc < 0.99 && Math.abs(Math.cos(cyc * Math.PI * 2)) < 0.995) ? ph : null;
        var wl = it.grp.localToWorld(v3(-0.26, 0.84, -0.75)), wr = it.grp.localToWorld(v3(0.26, 0.84, -0.75));
        it.p.hands = [root.worldToLocal(wl), root.worldToLocal(wr)]; it.p.update(root, t);
        var wh = it.grp.children[0].userData.wheel; if (wh) wh.rotation.x = -sx * ph * 0.9;
      });
    }
    return { root: root, update: update, view: { c: v3(0, 0.8, 0), d: 8.5 }, steps: [{ n: 'ขนด้วยรถเข็น ทรายรวมใกล้เคียงกัน (~160-185 กก.)', a: 'A มีปีก 2 ใบซ้อนกัน สูงและหนักหน้า | B บังเกอร์ 7 ใบ วางเตี้ย | C Flex 4 ใบ', b: 'ภาพจำลองไม่ใช่เวลาจริง ไม่ได้แสดงจำนวนเที่ยว', d: 40 }], loop: true };
  }

  // ================= slope carrying =================
  function ScenarioSlope() {
    var root = newRoot(0, 0), ang = 25 * Math.PI / 180, run = 11, h = run * Math.tan(ang);
    var shape = new THREE.Shape(); shape.moveTo(-1, 0); shape.lineTo(run, 0); shape.lineTo(run, h); shape.lineTo(-1, 0);
    var ramp = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 8.4, bevelEnabled: false }), mat(0x9bb06f)); ramp.position.z = -4.2; root.add(ramp);
    var lanes = [{ k: 'A', z: -2.5, t: 'A มีปีก ~78–80 กก. ต้อง 2 คนต่อใบ' }, { k: 'B', z: 0.1, t: 'B บังเกอร์ ~15–24 กก. 1 คนต่อใบ' }, { k: 'C', z: 2.7, t: 'C Flex ~45 กก. 1-2 คน' }], items = [];
    function bagMesh(k) {
      if (k === 'A') { var wg = wingedLying(); wg.scale.set(0.75, 1, 0.75); return wg; }
      if (k === 'B') return bunkerLying();
      return flexLying();
    }
    lanes.forEach(function (ln) {
      var n = ln.k === 'A' ? 2 : 1, ps = []; for (var i = 0; i < n; i++) { var p = new Person(i ? 0xe07b00 : 0x2e8b57); ps.push(p); root.add(p.g); }
      var bag = bagMesh(ln.k); root.add(bag);
      var s = sprite(ln.t, '#222', 3.4); s.position.set(-1.6, 4.9 - (ln.k === 'A' ? 0 : ln.k === 'B' ? 0.4 : 0.8), 0); root.add(s);
      items.push({ ps: ps, bag: bag, z: ln.z, k: ln.k });
    });
    function update(si, u, t) {
      var cyc = (t * 0.07) % 1, x = 1.5 + 4.5 * cyc, walkPh = x * 4.2;
      items.forEach(function (it) {
        var y = x * Math.tan(ang), yaw = Math.PI / 2, n = it.ps.length;
        var bagC = v3(x + 0.55, y + 0.85 - 0.08, it.z);
        it.bag.position.copy(bagC).add(v3(0, -0.1, 0)); it.bag.rotation.set(0, it.k === 'B' || it.k === 'C' ? Math.PI / 2 : 0, 0); it.bag.rotation.z = ang;
        it.ps.forEach(function (p, i) {
          var dz = n === 1 ? 0 : (i ? 0.62 : -0.62);
          p.g.position.set(x, y, it.z + dz); p.g.rotation.y = yaw; p.bend = 0.3; p.crouch = 0.1; p.walk = walkPh;
          var side = n === 1 ? 0.15 : 0.3;
          p.hands = [bagC.clone().add(v3(0.05, 0, n === 1 ? -side : -(i ? 0.18 : -0.18) * 0 + (i ? 0.2 : -0.2))), bagC.clone().add(v3(-0.1, 0, n === 1 ? side : (i ? 0.2 : -0.2)))];
          p.update(root, t);
        });
      });
    }
    return { root: root, update: update, view: { c: v3(3.6, 2, 0), d: 9 }, steps: [{ n: 'ขนขึ้นสโลป 25 องศา (ตัวอย่าง) ต้องยกทีละใบ', a: 'A มีปีก ~78–80 กก. ต้อง 2 คน | B บังเกอร์ ~15–24 กก. 1 คน | C Flex ~45 กก. 1-2 คน', b: 'สโลปจริงต้องวัดมุมหน้างานอีกครั้ง', d: 40 }], loop: true };
  }

  // ---------- renderer / app ----------
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stageEl.appendChild(renderer.domElement);
  var scene = new THREE.Scene(); scene.background = new THREE.Color(0xdbe7f1);
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  var controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b09c, 1.0));
  var sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(4, 8, 6); scene.add(sun);
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0xdcd8cc, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; scene.add(ground);
  var grid = new THREE.GridHelper(40, 40, 0xb8b4a8, 0xcbc7ba); grid.position.y = 0; scene.add(grid);

  var tabs = [
    { id: 'sizes', t: 'ขนาด', f: ScenarioSizes }, { id: 'a', t: 'กระสอบมีปีก', f: function () { return ScenarioA(0, 0); } },
    { id: 'b', t: 'กระสอบบังเกอร์', f: function () { return ScenarioB(0, 0); } }, { id: 'c', t: 'Flex MSE', f: function () { return ScenarioC(0, 0); } },
    { id: 'cmp', t: 'เทียบ 3 แบบ', f: ScenarioCompare }, { id: 'bar', t: 'ขนรถเข็น', f: ScenarioBarrow }, { id: 'slope', t: 'ขนขึ้นสโลป', f: ScenarioSlope }
  ];
  var cache = {}, cur = null, curTab = null, T = 0, playing = true, speed = 1, loopOn = true, total = 1, clock = 0;
  var tabsEl = document.getElementById('tabs'), stepsEl = document.getElementById('steps'), slider = document.getElementById('slider'), playBtn = document.getElementById('play');
  function totalOf(sc) { return sc.steps.reduce(function (a, s) { return a + s.d; }, 0); }
  function locate(sc, tt) { var acc = 0; for (var i = 0; i < sc.steps.length; i++) { var d = sc.steps[i].d; if (tt < acc + d || i === sc.steps.length - 1) return { si: i, u: clamp((tt - acc) / d, 0, 1), start: acc }; acc += d; } }
  function view(v) {
    var c = cur.view.c, d = cur.view.d;
    if (v === 'front') { camera.position.set(c.x, c.y + 0.9, c.z + d); }
    else if (v === 'obl') { camera.position.set(c.x + d * 0.62, c.y + d * 0.42, c.z + d * 0.7); }
    else if (v === 'top') { camera.position.set(c.x, c.y + d * 1.05, c.z + 0.05); }
    else if (v === 'side') { camera.position.set(c.x + d, c.y + 0.9, c.z + 0.1); }
    controls.target.copy(c); controls.update();
  }
  function select(id) {
    if (cur) scene.remove(cur.root);
    curTab = tabs.filter(function (t) { return t.id === id; })[0];
    if (!cache[id]) cache[id] = curTab.f();
    cur = cache[id]; scene.add(cur.root); total = totalOf(cur); T = 0; playing = !cur.still;
    Array.prototype.forEach.call(tabsEl.children, function (b) { b.classList.toggle('on', b.dataset.id === id); });
    stepsEl.innerHTML = '';
    if (cur.steps.length > 1) cur.steps.forEach(function (s, i) { var b = document.createElement('button'); b.textContent = (i + 1); b.title = s.n; b.onclick = function () { T = locate(cur, 0).start; var acc = 0; for (var k = 0; k < i; k++) acc += cur.steps[k].d; T = acc; playing = true; }; b.dataset.i = i; stepsEl.appendChild(b); });
    stepsEl.style.display = cur.steps.length > 1 ? 'flex' : 'none';
    document.getElementById('ctrl').style.display = cur.still ? 'none' : 'flex'; document.getElementById('info').style.display = id === 'sizes' ? 'block' : 'none';
    view('front'); if (id === 'bar' || id === 'slope') view('obl');
    if (id === 'slope') { camera.position.set(8.2, 5.2, 8.2); controls.target.set(3.4, 2.1, 0); controls.update(); }
    if (id === 'bar') { camera.position.set(0.5, 3.6, 9.2); controls.target.set(0, 0.8, 0); controls.update(); }
  }
  tabs.forEach(function (t) { var b = document.createElement('button'); b.textContent = t.t; b.dataset.id = t.id; b.onclick = function () { select(t.id); }; tabsEl.appendChild(b); });
  document.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { view(b.dataset.view); }; });
  playBtn.onclick = function () { playing = !playing; if (playing && T >= total - 0.01) T = 0; };
  document.getElementById('xray').onclick = function () { setXray(!XR.on); this.classList.toggle('on', XR.on); };
  document.getElementById('restart').onclick = function () { T = 0; playing = true; };
  document.getElementById('speed').onchange = function (e) { speed = parseFloat(e.target.value); };
  document.getElementById('loop').onchange = function (e) { loopOn = e.target.checked; };
  slider.oninput = function () { T = parseFloat(slider.value) / 1000 * total; playing = false; };

  function resize() {
    var w = stageEl.clientWidth, h = stageEl.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  var last = performance.now();
  function draw(dt) {
    clock += dt;
    if (cur) {
      if (playing && !cur.still) { T += dt * speed; if (T >= total) { if (cur.loop || loopOn) T = T % total; else { T = total; playing = false; } } }
      var loc = locate(cur, T);
      cur.update(loc.si, loc.u, clock);
      var s = cur.steps[loc.si]; capTitle.textContent = s.n; capL1.textContent = s.a; capL2.textContent = s.b;
      slider.value = Math.round(T / total * 1000); playBtn.textContent = playing ? 'หยุด' : 'เล่น';
      Array.prototype.forEach.call(stepsEl.children, function (b) { b.classList.toggle('on', +b.dataset.i === loc.si); });
    }
    controls.update(); renderer.render(scene, camera);
  }
  function frame(now) { var dt = Math.min(0.1, (now - last) / 1000); last = now; draw(dt); requestAnimationFrame(frame); }
  loadingEl.hidden = true;
  select('a');
  requestAnimationFrame(frame);
  window.__bag = { select: select, state: function () { return { T: T, total: total, tab: curTab && curTab.id }; }, setT: function (x) { T = x; playing = false; }, view: view, draw: draw, cam: function (a, b, c, x, y, z) { camera.position.set(a, b, c); controls.target.set(x, y, z); controls.update(); } };
})();
