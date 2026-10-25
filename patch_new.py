p = 'C:/Users/DELL/bag_anim/app.js'
t = open(p, encoding='utf-8').read()
mod = open('C:/Users/DELL/bag_anim/scen_new.js', encoding='utf-8').read()
marker = '  // ---------- renderer / app ----------'
assert marker in t and 'ScenarioNew' not in t
t = t.replace(marker, mod + '\n' + marker, 1)
old = "{ id: 'cmp', t: 'เทียบ 3 แบบ', f: ScenarioCompare }"
assert old in t
t = t.replace(old, old + ", { id: 'new', t: 'กระสอบแบบใหม่ (ข้อเสนอ)', f: function () { return ScenarioNew(0, 0); } }", 1)
old2 = "document.getElementById('info').style.display = id === 'sizes' ? 'block' : 'none';"
assert old2 in t
t = t.replace(old2, old2 + " document.getElementById('info2').style.display = id === 'new' ? 'block' : 'none';", 1)
open(p, 'w', encoding='utf-8', newline='\n').write(t)

p = 'C:/Users/DELL/bag_anim/template.html'
t = open(p, encoding='utf-8').read()
info2 = '''<div id="info2" style="display:none;margin:10px 16px 0;flex-shrink:0;overflow-x:auto"><table class="cmp">
<tr><th></th><th>กระสอบบังเกอร์ (เดิม)</th><th>กระสอบแบบใหม่ (ข้อเสนอ)</th></tr>
<tr><td>ผ้าส่วนตัวถุง</td><td>0.75 x 0.35 ม.</td><td>0.75 x 0.35 ม. (เท่าเดิม)</td></tr>
<tr><td>ส่วนที่เพิ่ม</td><td>-</td><td>ปีกข้าง 2 ข้างตามแนวตะเข็บยาว กว้างข้างละ ~0.20 ม. และปากยาวเพิ่ม ~0.30–0.35 ม.</td></tr>
<tr><td>การกรอก</td><td>ตั้งถุง ปากกว้าง กรอก 1–2 คน</td><td>เหมือนเดิมทุกอย่าง ไม่ต้องดันทรายออกข้าง</td></tr>
<tr><td>ปริมาณกรอก</td><td>~2/3 ถุง</td><td>~ครึ่งถุง (ทราย ~11–17 ลิตร)</td></tr>
<tr><td>การปิดปาก</td><td>มัดเชือกที่คอ หางสั้น</td><td>มัดเชือกที่คอ หางยาว ให้ถุงใบถัดไปวางทับ</td></tr>
<tr><td>น้ำหนักต่อใบ</td><td>~15–24 กก.</td><td>~15–24 กก. (เท่ากระสอบบังเกอร์)</td></tr>
<tr><td>หน้าที่ของปีก</td><td>-</td><td>ยึดชั้นและเสริมแรง ปีกวางราบรองใต้ชั้นถัดไป</td></tr>
</table>
<p style="font-size:12px;color:var(--muted);margin:6px 0 0">ขนาดปีกและหางเป็นค่าสมมติเริ่มต้นเพื่อออกแบบ ยังไม่ได้ทดสอบกำลังยึดหรือการเสริมแรง</p></div>
'''
marker2 = '<div id="info" '
assert marker2 in t
t = t.replace(marker2, info2 + marker2, 1)
open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('patched')
