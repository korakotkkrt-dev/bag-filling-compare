  // ===== realistic bag fabrics and geometry (inserted into app.js) =====
  var XR = { on: false, mats: [] };      // x-ray toggle: shells become see-through to show the sand inside
  function setXray(on) {
    XR.on = on;
    XR.mats.forEach(function (m) { m.transparent = on; m.opacity = on ? 0.38 : 1; m.depthWrite = !on; m.needsUpdate = true; });
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
    x.fillStyle = '#3f5238'; x.fillRect(0, 0, s, s); var tp = s / 24, i, j;
    for (i = 0; i < 24; i++) for (j = 0; j < 24; j++) {
      var over = (i + j) % 2 === 0, k = 0.78 + Math.random() * 0.34; x.fillStyle = shade(over ? '#566d49' : '#34462f', k);
      if (over) x.fillRect(i * tp + 0.4, j * tp, tp - 0.8, tp); else x.fillRect(i * tp, j * tp + 0.4, tp, tp - 0.8);
    }
    for (i = 0; i < 900; i++) { x.fillStyle = 'rgba(' + (90 + Math.random() * 60 | 0) + ',' + (84 + Math.random() * 50 | 0) + ',60,' + (Math.random() * 0.16) + ')'; x.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 2 + Math.random() * 4); }
  }, 256);
  var feltDark = canvasOf(function (x, s) {
    x.fillStyle = '#3b3a37'; x.fillRect(0, 0, s, s); var i;
    for (i = 0; i < 7000; i++) { var v = 40 + Math.random() * 40 | 0; x.strokeStyle = 'rgba(' + v + ',' + v + ',' + (v - 2) + ',0.45)'; x.lineWidth = 0.7; x.beginPath(); var px = Math.random() * s, py = Math.random() * s, a = Math.random() * 6.28; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5); x.stroke(); }
    for (i = 0; i < 500; i++) { x.fillStyle = 'rgba(120,112,98,' + (Math.random() * 0.12) + ')'; x.fillRect(Math.random() * s, Math.random() * s, 3, 3); }
  }, 256);
  function fabricMap(kind, rx, ry) {
    if (kind === 'ggs') return imgTex(ggsImg, rx, ry);
    var t = new THREE.CanvasTexture(kind === 'bunker' ? wovenGreen : feltDark); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    return t;
  }
  var FABRIC = { ggs: { rough: 0.9, bump: 0.6 }, bunker: { rough: 0.55, bump: 0.8 }, flex: { rough: 1.0, bump: 0.9 } };
  function fabricMat(kind, rx, ry, extra) {
    var f = FABRIC[kind];
    return new THREE.MeshStandardMaterial(Object.assign({ map: fabricMap(kind, rx, ry), bumpMap: fabricMap(kind, rx, ry), bumpScale: f.bump, roughness: f.rough, metalness: 0, side: THREE.DoubleSide }, extra || {}));
  }
  function shellFabric(kind, rx, ry, extra) { var m = fabricMat(kind, rx, ry, extra); XR.mats.push(m); return m; }

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
    var body = new THREE.Mesh(pillowGeo2(0.75, 0.45, 0.16, { n: 3.0, taper: 0.05, lump: 0.004, seed: 2 }), fabricMat('ggs', 1.5, 1, { map: logoTexture() })); body.position.y = 0.006; g.add(body);
    var sheet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.006, 0.75), fabricMat('ggs', 3, 1.5)); sheet.position.set(0, 0.003, 0.15); g.add(sheet);
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
    var body = new THREE.Mesh(pillowGeo2(L, 0.31, 0.13, { n: 2.6, taper: 0.1, lump: 0.007, seed: 5, neck: 0.3 }), fabricMat('bunker', 1.8, 1)); body.position.set(ox, 0.002, 0); g.add(body);
    var cord = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0065, 8, 22), mat(0xd9c9a0)); cord.rotation.y = Math.PI / 2; cord.position.set(ox + L / 2 * 0.80, 0.034, 0); g.add(cord);
    var tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 14, 1, true), fabricMat('bunker', 0.5, 0.5)); tail.rotation.z = -Math.PI / 2; tail.scale.set(1, 1, 0.5); tail.position.set(ox + L / 2 + 0.045, 0.026, 0); g.add(tail);
    var seam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.26), mat(0x232c1f)); seam.position.set(ox - L / 2 * 0.94, 0.012, 0); g.add(seam);
    return g;
  }
  // Flex MSE GTX bag lying: dark needle-punched nonwoven, green stitched ends, folded closure flap
  function flexLying() {
    var g = new THREE.Group(), L = 0.76;
    var body = new THREE.Mesh(pillowGeo2(L, 0.30, 0.14, { n: 3.3, taper: 0.07, lump: 0.0035, seed: 9 }), fabricMat('flex', 2, 1)); body.position.y = 0.002; g.add(body);
    [-1, 1].forEach(function (s) { var st = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.003, 0.27), mat(0x45b05a)); st.position.set(s * L / 2 * 0.955, 0.0, 0); st.position.y = 0.012; g.add(st); });
    var fold = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.255), fabricMat('flex', 0.5, 0.5)); fold.position.set(L / 2 + 0.035, 0.005, 0); g.add(fold);
    return g;
  }
