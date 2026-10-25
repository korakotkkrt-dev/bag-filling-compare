# builds art.html (claude.ai artifact version) from template.html + libs.js + app.js
import re
t=open('template.html',encoding='utf-8').read()
libs=open('libs.js',encoding='utf-8').read(); app=open('tex_data.js',encoding='utf-8').read()+open('app.js',encoding='utf-8').read()
style=re.search(r'<style>(.*?)</style>',t,re.S).group(1)
body=t[t.index('<body>')+6:t.index('</body>')].replace('<script>/*LIBS*/</script>','').replace('<script>/*APP*/</script>','')
style=style.replace("@media (prefers-color-scheme:dark){:root{--bg:#16181a;--surface:#1e2124;--fg:#e8e5dc;--muted:#9b978b;--line:#343833;--accent:#6fbf93;--accent-fg:#10231a;--warn:#e0b070;--warn-bg:#2b2417}}","@media (prefers-color-scheme:dark){:root:not([data-theme=\"light\"]){--bg:#16181a;--surface:#1e2124;--fg:#e8e5dc;--muted:#9b978b;--line:#343833;--accent:#6fbf93;--accent-fg:#10231a;--warn:#e0b070;--warn-bg:#2b2417;color-scheme:dark}}\n:root[data-theme=\"dark\"]{--bg:#16181a;--surface:#1e2124;--fg:#e8e5dc;--muted:#9b978b;--line:#343833;--accent:#6fbf93;--accent-fg:#10231a;--warn:#e0b070;--warn-bg:#2b2417;color-scheme:dark}")
style=style.replace("html,body{margin:0;height:100%}","").replace("body{background:var(--bg);","body{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));background:var(--bg);")
style=style.replace("header{padding:12px 16px 6px}","header{padding:12px 0 6px}").replace("padding:6px 16px;","padding:6px 0;").replace("margin:0 16px;border:1px solid var(--line);border-radius:12px;overflow:hidden}","margin:0;border:1px solid var(--line);border-radius:12px;overflow:hidden}")
style=style.replace("margin:10px 16px 0;padding:10px 12px","margin:10px 0 0;padding:10px 12px").replace("padding:10px 16px}","padding:10px 0}").replace(".note{margin:0 16px 14px;",".note{margin:0 0 14px;").replace("footer{padding:0 16px 18px;","footer{padding:0 0 18px;")
body=body.replace('margin:10px 16px 0;flex-shrink:0','margin:10px 0 0;flex-shrink:0')
head='<title>เทียบกรอกกระสอบทราย</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="description" content="อนิเมชั่น 3 มิติเทียบการกรอกกระสอบมีปีก กระสอบบังเกอร์ และ Flex MSE">\n<style>'+style+'</style>\n'
open('art.html','w',encoding='utf-8').write(head+body+'\n<script>'+libs+'</script>\n<script>'+app+'</script>\n'); print('art ok')
