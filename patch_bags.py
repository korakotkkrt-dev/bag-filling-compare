import re
p = 'C:/Users/DELL/bag_anim/app.js'
t = open(p, encoding='utf-8').read()
new_mod = open('C:/Users/DELL/bag_anim/bags_new.js', encoding='utf-8').read()


def rep(old, new, count=1):
    global t
    assert old in t, old[:70]
    t = t.replace(old, new, count)


# 1. replace old wingedLying (comment + function) with the new module
a = t.index('  // winged bag lying on the ground (real drawing)')
b = t.index('  function sprite(')
t = t[:a] + new_mod + '\n' + t[b:]

# shellFabric respects the current x-ray state
rep("function shellFabric(kind, rx, ry, extra) { var m = fabricMat(kind, rx, ry, extra); XR.mats.push(m); return m; }",
    "function shellFabric(kind, rx, ry, extra) { var m = fabricMat(kind, rx, ry, extra); XR.mats.push(m); if (XR.on) { m.transparent = true; m.opacity = 0.38; m.depthWrite = false; } return m; }")

# 2. scenario A
rep("var root = newRoot(ox, oz), tan = mat(CL.tan), shellMat = mat(0xf5efe0, { transparent: true, opacity: 0.35, depthWrite: false });",
    "var root = newRoot(ox, oz), tan = fabricMat('ggs', 0.7, 1.5);")
a = t.index("    var pocket = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 1), shellMat);")
b = t.index("    var seamMat = mat(0x6b5428);")
pocket_new = '''    var pocket = new THREE.Group(); bag.add(pocket);
    var pFront = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.45, 24, 14), shellFabric('ggs', 1.5, 0.9, { map: logoTexture() }));
    var pBack = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.45, 24, 14), shellFabric('ggs', 1.5, 0.9));
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
'''
t = t[:a] + pocket_new + t[b:]
rep("var seamMat = mat(0x6b5428);", "var seamMat = mat(0xd5d5d8);")
rep("new THREE.LineDashedMaterial({ color: 0x3a2c10, dashSize: 0.03, gapSize: 0.02 })", "new THREE.LineDashedMaterial({ color: 0xf0f0f0, dashSize: 0.03, gapSize: 0.02 })")
rep("flap.add(new THREE.Mesh(new THREE.ShapeGeometry(fs), mat(CL.tanl, { transparent: true, opacity: 0.8 })));", "flap.add(new THREE.Mesh(new THREE.ShapeGeometry(fs), fabricMat('ggs', 2, 2)));")
rep("new THREE.LineBasicMaterial({ color: 0x8a6b30 })));\n    function flapCorner", "new THREE.LineBasicMaterial({ color: 0xe8e8e8 })));\n    function flapCorner")
rep("pocket.scale.z = thick * (1 + 0.18 * s);", "setPocket(thick * (1 + 0.18 * s));")

# 3. scenario B
rep("var root = newRoot(ox, oz), shellMat = mat(0xf5efe0, { transparent: true, opacity: 0.35, depthWrite: false });\n    var col = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.75, 20, 1, true), shellMat); col.position.y = 0.375; root.add(col);",
    "var root = newRoot(ox, oz);\n    var col = new THREE.Mesh(bagTubeGeo(0.75, 3), shellFabric('bunker', 2, 2)); root.add(col);\n    var cap = new THREE.Mesh(new THREE.CircleGeometry(1, 36), shellFabric('bunker', 1, 1)); cap.rotation.x = -Math.PI / 2; cap.position.y = 0.002; root.add(cap);\n    var rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 48), mat(0x3d4f35)); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.75; root.add(rim);")
a = t.index("    var lying = new THREE.Group(); var lp = new THREE.Mesh(pillowGeo(0.52, 0.31, 0.13, 3), mat(CL.green));")
b = t.index("    var p1 = new Person(0x2e8b57), p2 = new Person(0xe07b00); place(p1, 0, -0.62, 0);")
t = t[:a] + "    var lying = bunkerLying(); root.add(lying); lying.rotation.y = Math.PI / 2;\n" + t[b:]
rep("col.scale.set(rx, 1, ry); col.visible = lay < 0.5;", "col.scale.set(rx, 1, ry); col.visible = lay < 0.5; cap.scale.set(rx, ry, 1); rim.scale.set(rx, ry, 1); cap.visible = rim.visible = col.visible;")

# 4. scenario C
rep("var shell = mat(0x6b665f, { transparent: true, opacity: 0.45, depthWrite: false }), bags = [];", "var bags = [];")
rep("var cyl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.77, 16, 1, true), shell); cyl.position.y = 0.415;",
    "var cyl = new THREE.Mesh(bagTubeGeo(0.77, i * 2 + j + 1), shellFabric('flex', 1.5, 2)); cyl.position.y = 0.03;\n      var bcap = new THREE.Mesh(new THREE.CircleGeometry(1, 28), shellFabric('flex', 1, 1)); bcap.rotation.x = -Math.PI / 2; bcap.position.y = 0.032;")
rep("bg.add(cyl, snd); root.add(bg); jig.add(bg); bags.push({ g: bg, cyl: cyl, snd: snd });", "bg.add(cyl, bcap, snd); root.add(bg); jig.add(bg); bags.push({ g: bg, cyl: cyl, cap: bcap, snd: snd });")
rep("b.cyl.scale.set(0.15, 1, lerp(0.012, 0.075, open));", "b.cyl.scale.set(0.15, 1, lerp(0.012, 0.075, open)); b.cap.scale.set(0.15, lerp(0.012, 0.075, open), 1);")
rep("var m = new THREE.Mesh(pillowGeo(0.76, 0.30, 0.14, 3.4), mat(CL.flex)); m.position.set(0, 0.12 + k * 0.125, -0.31 + r * 0.31);", "var m = flexLying(); m.position.set(0, 0.12 + k * 0.125, -0.31 + r * 0.31);")

# 5. sizes
a = t.index("    var bb = new THREE.Group(); var bp = new THREE.Mesh(pillowGeo(0.52, 0.31, 0.13, 3), mat(CL.green));")
b = t.index("    function lab(name, w, x, color, wc)")
t = t[:a] + "    var bb = bunkerLying(); bb.position.set(2.4, 0, 0); root.add(bb);\n    var fb = flexLying(); fb.position.set(4.7, 0, 0); root.add(fb);\n" + t[b:]

# 6. barrow loads B and C
a = t.index("    else if (kind === 'B') { var layer = 0;")
b = t.index("    return g;\n  }\n  function ScenarioBarrow")
load_new = '''    else if (kind === 'B') { var layer = 0; [2, 2, 2, 1].forEach(function (n) { for (var k = 0; k < n; k++) { var bb_ = bunkerLying(); bb_.position.set(n === 2 ? (k ? 0.15 : -0.15) : 0, 0.385 + layer * 0.13, 0.33); bb_.rotation.y = Math.PI / 2; g.add(bb_); } layer++; }); }
    else { for (var l2 = 0; l2 < 2; l2++) for (var k2 = 0; k2 < 2; k2++) { var fb_ = flexLying(); fb_.position.set(k2 ? 0.16 : -0.16, 0.385 + l2 * 0.14, 0.33); fb_.rotation.y = Math.PI / 2; g.add(fb_); } }
'''
t = t[:a] + load_new + t[b:]

# 7. slope bags
rep("if (k === 'B') return new THREE.Mesh(pillowGeo(0.52, 0.31, 0.13, 3), mat(CL.green));\n      return new THREE.Mesh(pillowGeo(0.76, 0.30, 0.14, 3.4), mat(CL.flex));", "if (k === 'B') return bunkerLying();\n      return flexLying();")

# 8. x-ray button
rep("document.getElementById('restart').onclick", "document.getElementById('xray').onclick = function () { setXray(!XR.on); this.classList.toggle('on', XR.on); };\n  document.getElementById('restart').onclick")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
