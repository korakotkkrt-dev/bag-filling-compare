p = 'C:/Users/DELL/bag_anim/app.js'
t = open(p, encoding='utf-8').read()


def rep(old, new, count=1):
    global t
    assert old in t, old[:80]
    t = t.replace(old, new, count)


# 1. one wing only (back side) + two kangaroo pouches on the front side
a = t.index("    var wingMat = fabricMat('bunker', 3, 1, { color: new THREE.Color(2.1, 2.25, 1.8) });")
b = t.index("    var seam = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.26), mat(0x232c1f));", a)
new_block = '''    var wingMat = fabricMat('bunker', 3, 1, { color: new THREE.Color(2.1, 2.25, 1.8) });
    [-1].forEach(function (s) {
      var w = new THREE.Mesh(new THREE.BoxGeometry(L * 0.96, 0.005, NEW.wing), wingMat); w.position.set(ox - 0.01, 0.0035, s * (NEW.W / 2 * 0.92 + NEW.wing / 2 - 0.01)); g.add(w);
      g.add(dashedLine([[ox - L / 2 * 0.95, 0.007, s * NEW.W / 2 * 0.9], [ox + L / 2 * 0.95, 0.007, s * NEW.W / 2 * 0.9]], 0xf2f2f2));
    });
    [-0.14, 0.14].forEach(function (dx) { var pk = pouchKangaroo(); pk.position.set(ox + dx, 0, NEW.W / 2 + 0.045); g.add(pk); });
'''
t = t[:a] + new_block + t[b:]

# pouch builder before newBagLying
rep("  function newBagLying() {", '''  // small kangaroo-style soil pocket (sewn on the front long side) holding a creeper such as golden button
  function pouchKangaroo() {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(pillowGeo2(0.20, 0.13, 0.075, { n: 2.4, lump: 0.003, seed: 3, nu: 20, nv: 12 }), fabricMat('bunker', 2, 1.5)));
    var soil = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5a4332, { flatShading: true })); soil.scale.set(0.085, 0.03, 0.05); soil.position.y = 0.062; g.add(soil);
    for (var i = 0; i < 8; i++) {
      var lf = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.075, 5), mat(0x58a948)), a = i / 8 * 6.28;
      lf.position.set(Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.03); lf.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8); g.add(lf);
    }
    var vine = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.15, 5), mat(0x3f8d3a)); vine.position.set(0.02, 0.06, 0.085); vine.rotation.x = 1.1; g.add(vine);
    return g;
  }
  function newBagLying() {''')

# 2. upright bag: single wing + two pouches that follow the bag front
rep("[-1, 1].forEach(function (s) { var pv = new THREE.Group(), w = new THREE.Mesh(new THREE.BoxGeometry(NEW.wing, 0.75, 0.006), wingMat);", "[1].forEach(function (s) { var pv = new THREE.Group(), w = new THREE.Mesh(new THREE.BoxGeometry(NEW.wing, 0.75, 0.006), wingMat);")
rep("    var sand = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), mat(CL.sand)); root.add(sand);\n    var lying = newBagLying();",
    "    var pouchesUp = new THREE.Group(); [-0.085, 0.085].forEach(function (dx) { var pk = pouchKangaroo(); pk.rotation.x = Math.PI / 2; pk.position.set(dx, 0.2, 0); pouchesUp.add(pk); }); root.add(pouchesUp);\n    var sand = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), mat(CL.sand)); root.add(sand);\n    var lying = newBagLying();")
rep("w.m.position.set(w.s * rx, 0.375, 0); });", "w.m.position.set(w.s * rx, 0.375, 0); });\n      pouchesUp.visible = upright; pouchesUp.position.z = ry * 0.9;")

# 3. texts
rep("a: 'ถุงมีปีกสองข้างตามแนวตะเข็บยาว ตั้งกรอกแบบเดียวกับกระสอบบังเกอร์ ปากกว้างกางค้างได้'", "a: 'ถุงมีปีกด้านหลังด้านเดียว และกระเป๋าเล็ก 2 ใบด้านหน้า ตั้งกรอกแบบเดียวกับกระสอบบังเกอร์ ปากกว้างกางค้างได้'")
rep("ปีกข้างวางราบรองใต้ชั้นถัดไปช่วยยึดและเสริมแรง'", "ปีกด้านหลังวางราบรองใต้ชั้นถัดไปช่วยยึดและเสริมแรง'")
rep("b: 'ภาพจำลองแนวคิด ยังไม่ได้ทดสอบกำลังยึดและการเสริมแรง ต้องตรวจกับวิศวกรผู้ออกแบบ', d: 16", "b: 'กระเป๋า 2 ใบด้านหน้ากรอกดินปลูกไม้เลื้อย (เช่น กระดุมทอง) ให้คลุมกระสอบหลังก่อสร้าง ภาพจำลองแนวคิด ยังไม่ได้ทดสอบกำลังยึดและการเสริมแรง', d: 16")
open(p, 'w', encoding='utf-8', newline='\n').write(t)

p = 'C:/Users/DELL/bag_anim/template.html'
t = open(p, encoding='utf-8').read()
rep("<td>ปีกข้าง 2 ข้างตามแนวตะเข็บยาว กว้างข้างละ ~0.20 ม. และปากยาวเพิ่ม ~0.30–0.35 ม.</td>", "<td>ปีกด้านหลัง (ฝั่งดิน) ด้านเดียว กว้าง ~0.20 ม. ปากยาวเพิ่ม ~0.30–0.35 ม. และกระเป๋าเล็ก 2 ใบติดกันที่ด้านหน้า (ฝั่งผิวหน้า)</td>")
rep("<tr><td>หน้าที่ของปีก</td><td>-</td><td>ยึดชั้นและเสริมแรง ปีกวางราบรองใต้ชั้นถัดไป</td></tr>", "<tr><td>หน้าที่ของปีก</td><td>-</td><td>ปีกด้านหลังยึดชั้นและเสริมแรง วางราบรองใต้ชั้นถัดไป</td></tr>\n<tr><td>กระเป๋าด้านหน้า</td><td>-</td><td>กระเป๋าเล็ก 2 ใบ ใส่ดินและปลูกไม้เลื้อย (เช่น กระดุมทอง) ให้คลุมกระสอบหลังก่อสร้างเสร็จ</td></tr>")
rep("ขนาดปีกและหางเป็นค่าสมมติเริ่มต้น", "ขนาดปีก หาง และกระเป๋า (ใบละ ~0.20 x 0.13 ม.) เป็นค่าสมมติเริ่มต้น")
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('ok')
