from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO
from pathlib import Path
import json,shutil
apps=['pianoflow','chess-strategic','portal-run','memoria','vocara','mindmap']
def use(page,app):
 tap=lambda selector:page.locator(selector).first.tap(timeout=3000)
 if app=='portal-run':
  tap('#start');page.wait_for_function("document.querySelector('#overlay').style.display==='none'");page.wait_for_function("Number(document.querySelector('#score').textContent.replace(/[^0-9]/g,''))>0");tap('#leftZone')
 if app=='chess-strategic':
  tap('#modeFree');tap('#d2');tap('[data-square=e2]');tap('[data-square=e4]');assert page.locator('[data-square=e4] .pc').count()==1;tap('#undo');assert page.locator('[data-square=e2] .pc').count()==1
 if app=='pianoflow':
  tap('#playBtn');page.wait_for_function("Number(document.querySelector('#seek').value)>0");tap('#playBtn');assert page.locator('#playBtn').inner_text()=='▶'
 if app=='memoria':
  page.goto(page.url.rsplit('/',1)[0]+'/learn.html');tap('#start-session');tap('#show-answer');assert page.locator('#learn-answer').is_visible();tap('[data-grade=good]');assert int(page.locator('#user-xp-current').inner_text())>=4
 if app=='vocara':
  page.goto(page.url.rsplit('/',1)[0]+'/add.html');page.locator('#word-de').fill('Mond');page.locator('#word-foreign').fill('moon');tap('button[type=submit]');assert page.evaluate("JSON.parse(localStorage.getItem('ljv-studio-vicara-v4')).some(w=>w.foreign==='moon')");page.goto(page.url.replace('add.html','index.html'));tap('.vocab-card');assert page.locator('.vocab-card.flipped').count()
 if app=='mindmap':
  tap('#newNode');page.locator('#nodeTitle').fill('Entwurf');tap('#editor button');page.reload();assert page.locator('#nodeTitle').input_value()=='Entwurf';tap('#newNode');tap('#undo');assert page.evaluate("JSON.parse(localStorage.getItem('ljv-studio-map-v1')).nodes.length")==2
with sync_playwright() as pw:
 br=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox'])
 failures=[]
 for a in apps:
  ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=ctx.new_page();p.set_default_timeout(4500);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda dialog:dialog.accept());url='http://127.0.0.1:8193/'+a+'/index.html'
  try:
   p.goto(url);p.wait_for_function("!!navigator.serviceWorker.controller",timeout=12000);p.wait_for_function("!!navigator.serviceWorker.controller")
   m=p.evaluate("async()=>await (await fetch(document.querySelector('link[rel=manifest]').href)).json()")
   for icon in m['icons']:
    im=Image.open(BytesIO(ctx.request.get(url.rsplit('/',1)[0]+'/'+icon['src']).body()));assert im.size==(int(icon['sizes'].split('x')[0]),)*2
   p.evaluate('window.scrollTo(0,0)');ctx.set_offline(True);p.reload();use(p,a);assert not errors,errors
   ctx.set_offline(False); p.goto(url);p.set_viewport_size({'width':1080,'height':760});p.wait_for_timeout(300)
   if a=='portal-run':p.locator('#start').click();p.wait_for_timeout(600)
   f=Path('studio-apps',a,'preview.webp');im=Image.open(BytesIO(p.screenshot()));im.thumbnail((840,580));im.convert('RGB').save(f,'WEBP',quality=78)
   print(a,'PASS',flush=True)
  except Exception as e:failures.append(a);print(a,'FAIL',str(e)[:1100],'page errors',errors,flush=True)
  ctx.close()
 br.close()
 if failures: raise SystemExit('Failed: '+', '.join(failures))
