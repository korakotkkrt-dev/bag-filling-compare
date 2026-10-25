p = 'C:/Users/DELL/bag_anim/app.js'
t = open(p, encoding='utf-8').read()


def rep(old, new):
    global t
    assert old in t, old[:70]
    t = t.replace(old, new, 1)


rep("var wingMat = fabricMat('bunker', 2, 3, { color: new THREE.Color(2.1, 2.25, 1.8) }), wings = [];\n    [-1, 1].forEach(function (s) { var w = new THREE.Mesh(new THREE.BoxGeometry(NEW.wing, 0.75, 0.006), wingMat); wings.push({ m: w, s: s }); root.add(w); });",
    "var wingMat = shellFabric('bunker', 2, 3, { color: new THREE.Color(2.1, 2.25, 1.8) }), wings = [];\n    [-1, 1].forEach(function (s) { var pv = new THREE.Group(), w = new THREE.Mesh(new THREE.BoxGeometry(NEW.wing, 0.75, 0.006), wingMat); w.position.x = s * NEW.wing / 2; pv.add(w); pv.rotation.y = s * 1.0; wings.push({ m: pv, s: s }); root.add(pv); });")
rep("w.m.position.set(w.s * (rx + NEW.wing / 2 - 0.01), 0.375, 0); w.m.rotation.y = w.s * (si === 0 ? ease(u) * 0.0 : 0);", "w.m.position.set(w.s * rx, 0.375, 0);")
rep("return { root: root, update: update, view: { c: v3(0.0, 0.65, 0), d: 5.2 }, steps: N_STEPS };",
    "return { root: root, update: update, view: { c: v3(0.0, 0.65, 0), d: 5.2 }, steps: N_STEPS, stepView: function (si) { return si < 3 ? { pos: [0.9, 1.0, 3.3], tgt: [0.1, 0.55, 0] } : { pos: [1.3, 1.7, 3.2], tgt: [0, 0.1, 0] }; } };")
rep("var cache = {}, cur = null, curTab = null,", "var lastSi = -1, cache = {}, cur = null, curTab = null,")
rep("      var loc = locate(cur, T);\n", "      var loc = locate(cur, T);\n      if (cur.stepView && loc.si !== lastSi) { var sv = cur.stepView(loc.si); camera.position.set(sv.pos[0], sv.pos[1], sv.pos[2]); controls.target.set(sv.tgt[0], sv.tgt[1], sv.tgt[2]); controls.update(); }\n      lastSi = loc.si;\n")
rep("cur = cache[id]; scene.add(cur.root);", "cur = cache[id]; lastSi = -1; scene.add(cur.root);")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('ok')
