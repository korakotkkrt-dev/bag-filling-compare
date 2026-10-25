  // ================= N: proposed new bag (bunker-bag size + side wings + long tie tail overlapped by the next bag) =================
  var NEW = { L: 0.58, W: 0.31, T: 0.13, tail: 0.34, wing: 0.20 };
  function newBagLying() {
    var g = new THREE.Group(), L = NEW.L, ox = -0.04;
    var body = new THREE.Mesh(pillowGeo2(L, NEW.W, NEW.T, { n: 2.6, taper: 0.1, lump: 0.005, seed: 5, neck: 0.22 }), fabricMat('bunker', 7, 4)); body.position.set(ox, 0.002, 0); g.add(body);
    // long mouth tail: gathered neck, cord, then a flat strip that the next bag lies on
    var neckX = ox + L / 2 * 0.80;
    var cord = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0065, 8, 22), mat(0xd9c9a0)); cord.rotation.y = Math.PI / 2; cord.position.set(neckX, 0.034, 0); g.add(cord);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(NEW.tail, 0.008, 0.15), fabricMat('bunker', 2, 1)); tail.position.set(ox + L / 2 + NEW.tail / 2 - 0.02, 0.004, 0); g.add(tail);
    // side wings along both long edges (reinforcement / anchoring strips)
    var wingMat = fabricMat('bunker', 3, 1, { color: new THREE.Color(2.1, 2.25, 1.8) });
    [-1, 1].forEach(function (s) {
      var w = new THREE.Mesh(new THREE.BoxGeometry(L * 0.96, 0.005, NEW.wing), wingMat); w.position.set(ox - 0.01, 0.0035, s * (NEW.W / 2 * 0.92 + NEW.wing / 2 - 0.01)); g.add(w);
      g.add(dashedLine([[ox - L / 2 * 0.95, 0.007, s * NEW.W / 2 * 0.9], [ox + L / 2 * 0.95, 0.007, s * NEW.W / 2 * 0.9]], 0xf2f2f2));
    });
    var seam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.26), mat(0x232c1f)); seam.position.set(ox - L / 2 * 0.94, 0.012, 0); g.add(seam);
    return g;
  }

  function ScenarioNew(ox, oz) {
    var root = newRoot(ox, oz), H = 1.05;
    var col = new THREE.Mesh(bagTubeGeo(H, 7), shellFabric('bunker', 6, 6)); root.add(col);
    var cap = new THREE.Mesh(new THREE.CircleGeometry(1, 36), shellFabric('bunker', 3, 3)); cap.rotation.x = -Math.PI / 2; cap.position.y = 0.002; root.add(cap);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 48), mat(0x3d4f35)); rim.rotation.x = -Math.PI / 2; rim.position.y = H; root.add(rim);
    var wingMat = fabricMat('bunker', 2, 3, { color: new THREE.Color(2.1, 2.25, 1.8) }), wings = [];
    [-1, 1].forEach(function (s) { var w = new THREE.Mesh(new THREE.BoxGeometry(NEW.wing, 0.75, 0.006), wingMat); wings.push({ m: w, s: s }); root.add(w); });
    var sand = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), mat(CL.sand)); root.add(sand);
    var lying = newBagLying(); lying.rotation.y = Math.PI / 2; root.add(lying);
    // wall of overlapped bags (2 courses x 4): each bag lies on the tail of the previous one
    var wall = new THREE.Group(); root.add(wall); var wb = [];
    for (var i = 0; i < 8; i++) {
      var b = newBagLying(), c = i < 4 ? 0 : 1, k = i % 4; b.position.set(-1.3 + (c ? 0.295 : 0) + k * 0.59, c ? 0.134 : 0, 0.0); wall.add(b); wb.push({ g: b, x: b.position.x, y: b.position.y });
    }
    var p1 = new Person(0x2e8b57), p2 = new Person(0xe07b00); place(p1, 0, -0.62, 0); place(p2, 0.98, 0, -Math.PI / 2); root.add(p1.g, p2.g);
    var shovel = new Shovel(); root.add(shovel.g); var stream = streamMesh(); root.add(stream);
    var pl = v3(0.95, 0, 0.95); var pile_ = pile(pl.x, pl.z, 0.28); root.add(pile_);
    var mouthGrip = v3(1.1, 0.95, 0), mouthTip = v3(0.16, 1.02, 0);
    function update(si, u, t) {
      var open = si === 0 ? ease(u) : 1, level = 0, cyc = null, lay = 0;
      if (si === 1) { level = 0.47 * u; cyc = (u * 3) % 1; }
      else if (si === 2) { level = 0.47; lay = ease((u - 0.45) / 0.35); }
      else if (si === 3) { level = 0.47; lay = 1; }
      var rx = lerp(0.175, 0.155, open), ry = lerp(0.012, 0.10, open), upright = si < 3 && lay < 0.5;
      col.scale.set(rx, 1, ry); cap.scale.set(rx, ry, 1); rim.scale.set(rx, ry, 1); col.visible = cap.visible = rim.visible = upright;
      wings.forEach(function (w) { w.m.visible = upright; w.m.position.set(w.s * (rx + NEW.wing / 2 - 0.01), 0.375, 0); w.m.rotation.y = w.s * (si === 0 ? ease(u) * 0.0 : 0); });
      sand.visible = level > 0.005 && upright; sand.scale.set(rx * 0.93, Math.max(0.001, level), ry * 0.9); sand.position.y = level / 2;
      lying.visible = si === 2 && lay >= 0.5; wall.visible = si === 3; pile_.visible = si < 3;
      stream.visible = false;
      var rl = v3(-0.16, H - 0.06, 0), rr = v3(0.16, H - 0.06, 0);
      if (si === 0) { rl = lerpV(v3(-0.3, 0.55, -0.45), rl, ease(u)); rr = lerpV(v3(0.3, 0.55, -0.45), rr, ease(u)); }
      p1.walk = null; p1.bend = 0.25; p1.crouch = 0.05;
      if (si <= 1) {
        p1.hands = [rl, rr]; place(p1, 0, -0.62, 0); place(p2, 0.98, 0, -Math.PI / 2);
        shovel.g.visible = true; p2.crouch = 0.1; p2.bend = 0.35;
        var c;
        if (si === 0) { var k0 = ease(u); c = { grip: lerpV(v3(1.15, 0.7, 0.5), mouthGrip, k0), tip: lerpV(v3(1.0, 0.2, 0.7), mouthTip.clone().add(v3(0.1, -0.1, 0)), k0), load: 0.8, pour: false }; }
        else c = shovelCycle(cyc, pl, mouthGrip, mouthTip);
        shovel.set(c.grip, c.tip, c.load); p2.hands = [c.grip, c.grip.clone().lerp(c.tip, 0.38)];
        if (c.pour) { stream.visible = true; setLimb(stream, c.tip, v3(0, Math.max(0.1, level) + 0.02, 0)); }
      } else if (si === 2) {
        var kk = ease(u);
        place(p1, 0, -0.62, 0); place(p2, 0.98, 0, -Math.PI / 2);
        p1.crouch = 0.85 * kk; p1.bend = 0.25 + 0.55 * kk; p1.hands = [lerpV(rl, v3(-0.1, 0.14, 0.1), kk), lerpV(rr, v3(0.1, 0.14, -0.1), kk)];
        shovel.g.visible = false; p2.hands = [null, null]; p2.crouch = 0; p2.bend = 0.15;
      } else {
        shovel.g.visible = false; p2.hands = [null, null]; p2.crouch = 0; p2.bend = 0.1;
        var prog = u * 8.6, last = Math.min(7, Math.floor(prog)), cx = 0, cy = 0;
        wb.forEach(function (w, n) {
          var kdrop = clamp(prog - n, 0, 1); w.g.visible = prog > n - 0.001;
          var drop = (1 - ease(kdrop)) * 0.6; w.g.position.set(w.x, w.y + drop, 0);
          if (n === last) { cx = w.x; cy = w.y + drop; }
        });
        place(p1, cx - 0.2, -0.78, 0); p1.bend = 0.5; p1.crouch = 0.1;
        p1.hands = [v3(cx - 0.25, cy + 0.11, -0.12), v3(cx + 0.25, cy + 0.11, -0.12)];
        place(p2, -1.9, 0.7, Math.PI / 2 + 0.0); p2.hands = [null, null];
      }
      p1.update(root, t); p2.update(root, t);
    }
    return { root: root, update: update, view: { c: v3(0.0, 0.65, 0), d: 5.2 }, steps: N_STEPS };
  }
  var N_STEPS = [
    { n: 'N1 ตั้งถุง ปากกว้างเท่ากระสอบบังเกอร์', a: 'ถุงมีปีกสองข้างตามแนวตะเข็บยาว ตั้งกรอกแบบเดียวกับกระสอบบังเกอร์ ปากกว้างกางค้างได้', b: 'ผ้าส่วนปากยาวกว่าเดิม เผื่อไว้ใช้เป็นหางมัดปาก', d: 6 },
    { n: 'N2 กรอกทรายประมาณครึ่งถุง', a: 'ตักทรายลงปากกว้างโดยตรง ไม่ต้องดันทรายออกข้าง กรอกประมาณครึ่งถุงเหมือนกระสอบกันน้ำท่วม', b: 'ทรายต่อใบเท่ากระสอบบังเกอร์ ~11–17 ลิตร หนัก ~15–24 กก.', d: 11 },
    { n: 'N3 รวบปากมัดเชือก เหลือหางยาว', a: 'รวบคอถุงมัดด้วยเชือก ส่วนผ้าที่เหลือเป็นหางยาวประมาณ 0.30–0.35 ม.', b: 'วางถุงนอนให้หางยื่นไปด้านท้าย', d: 8 },
    { n: 'N4 วางถุงใบถัดไปทับหาง วางสลับชั้น', a: 'ใบถัดไปวางทับหางของใบก่อนหน้า น้ำหนักถุงกดหางไม่ให้ดึงหลุด ปีกข้างวางราบรองใต้ชั้นถัดไปช่วยยึดและเสริมแรง', b: 'ภาพจำลองแนวคิด ยังไม่ได้ทดสอบกำลังยึดและการเสริมแรง ต้องตรวจกับวิศวกรผู้ออกแบบ', d: 16 }
  ];
