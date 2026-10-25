p = 'C:/Users/DELL/bag_anim/app.js'
t = open(p, encoding='utf-8').read()


def rep(old, new, count=1):
    global t
    assert old in t, old[:80]
    t = t.replace(old, new, count)


s = t.index("  function ScenarioNew(ox, oz) {")
u = t.index("    function update(si, u, t) {", s)
t = t[:u] + "    function updateCore(si, u, t) {" + t[u + len("    function update(si, u, t) {"):]

# single-bag showcase objects, created just before updateCore
showcase_objs = '''    var single = newBagLying(); single.scale.setScalar(2.2); single.rotation.y = -0.35; single.visible = false; root.add(single);
    var lbls = new THREE.Group(); lbls.visible = false; root.add(lbls);
    [['ปีกด้านหลัง (ฝั่งดิน) ยึดและเสริมแรง', -0.15, 0.55, -0.78, '#2f4f25'], ['กระเป๋า 2 ใบด้านหน้า ใส่ดินปลูกไม้เลื้อย', -0.55, 0.62, 0.78, '#8a2b00'], ['หางยาว ให้ใบถัดไปวางทับ', 0.95, 0.42, -0.1, '#444'], ['คอ มัดเชือก', 0.5, 0.5, 0.35, '#444'], ['ตัวถุง 0.75 x 0.35 ม. เท่ากระสอบบังเกอร์', -1.05, 0.9, 0.0, '#111']].forEach(function (l) {
      var sp = sprite(l[0], l[4], 2.6); sp.position.set(l[1], l[2], l[3]); lbls.add(sp);
    });
'''
rep("    function updateCore(si, u, t) {", showcase_objs + "    function updateCore(si, u, t) {")

wrapper = '''    function update(si, u, t) {
      if (si === 0) {
        col.visible = cap.visible = rim.visible = false; wings.forEach(function (w) { w.m.visible = false; }); pouchesUp.visible = false;
        sand.visible = false; lying.visible = false; wall.visible = false; shovel.g.visible = false; stream.visible = false; pile_.visible = false; p1.g.visible = p2.g.visible = false;
        single.visible = true; lbls.visible = true; return;
      }
      single.visible = false; lbls.visible = false; p1.g.visible = p2.g.visible = true;
      updateCore(si - 1, u, t);
    }
'''
rep("    return { root: root, update: update, view: { c: v3(0.0, 0.65, 0), d: 5.2 }, steps: N_STEPS,", wrapper + "    return { root: root, update: update, view: { c: v3(0.0, 0.65, 0), d: 5.2 }, steps: N_STEPS,")
rep("stepView: function (si) { return si < 3 ? { pos: [0.9, 1.0, 3.3], tgt: [0.1, 0.55, 0] } : { pos: [1.3, 1.7, 3.2], tgt: [0, 0.1, 0] }; } };",
    "stepView: function (si) { return si === 0 ? { pos: [0.4, 1.9, 3.4], tgt: [0.1, 0.1, 0] } : si < 4 ? { pos: [0.9, 1.0, 3.3], tgt: [0.1, 0.55, 0] } : { pos: [1.3, 1.7, 3.2], tgt: [0, 0.1, 0] }; } };")
rep("  var N_STEPS = [\n", "  var N_STEPS = [\n    { n: 'N0 กระสอบแบบใหม่ (ถุงเดี่ยว)', a: 'ขนาดเท่ากระสอบบังเกอร์ ปีกด้านหลังด้านเดียว กระเป๋าเล็ก 2 ใบด้านหน้า และปากหางยาว', b: 'ดูต่อเพื่อเห็นขั้นตอนกรอก มัดปาก และวางเรียงทับหาง', d: 8 },\n")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('ok')
