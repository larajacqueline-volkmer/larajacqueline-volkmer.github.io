from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO
from pathlib import Path
import json,shutil
apps=['pianoflow','chess-strategic','portal-run','memoria','vocara','mindmap','studytown3d','focus-timer','vocabit']
def use(page,app):
 tap=lambda selector:page.locator(selector).first.tap(timeout=3000)
 if app=='vocabit':
  tap('#hintBtn')
  assert 'Tipp' in page.locator('#text').inner_text()
  answers={'language':'Sprache','ambition':'Ehrgeiz','knowledge':'Wissen','practice':'Übung','the gate':'Das Tor','communication':'Kommunikation'}
  page.locator('#germanText').fill(answers[page.locator('#word').inner_text()])
  tap('#quizForm button[type=submit]')
  assert int(page.locator('#xpValue').inner_text()) >= 10
  page.goto(page.url.replace('index.html','add.html'))
  page.locator('#germanText').fill('Mond')
  page.locator('#englishText').fill('moon')
  tap('#addForm button[type=submit]')
  page.reload()
  assert 'Mond' in page.locator('#vocabularyList').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 if app=='focus-timer':
  page.clock.install()
  tap('#soundBtn')
  page.locator('#customMinutes').fill('1')
  tap('#applyCustomBtn')
  tap('#startBtn')
  assert page.locator('#pauseBtn').is_enabled()
  page.clock.fast_forward(12000)
  tap('#pauseBtn')
  paused=page.locator('#time').inner_text()
  assert paused.startswith('00:') and paused != '00:00'
  page.clock.fast_forward(6000)
  assert page.locator('#time').inner_text()==paused
  tap('#startBtn')
  page.clock.fast_forward(65000)
  assert page.locator('#sessionsLabel').inner_text()=='Sitzungen: 1'
  tap('#resetBtn')
  assert page.locator('#time').inner_text()=='01:00'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
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
 if app=='studytown3d':
  page.wait_for_function("document.querySelector('#moduleSelect').options.length>5")
  page.locator('#moduleSelect').select_option('0')
  page.locator('#pNotes').fill('Browser-Test')
  page.locator('#pCheckInput').fill('Kapitel wiederholen')
  tap('#pCheckAdd');tap('#pSave');page.reload()
  page.wait_for_function("document.querySelector('#moduleSelect').options.length>5")
  page.locator('#moduleSelect').select_option('0')
  assert page.locator('#pNotes').input_value()=='Browser-Test'
  assert page.locator('#pChecks').inner_text().find('Kapitel wiederholen')>=0
  tap('#pClose')
 if app=='mindmap':
  tap('#newNode');page.locator('#nodeTitle').fill('Entwurf');tap('#editor button');page.reload();assert page.locator('#nodeTitle').input_value()=='Entwurf';tap('#newNode');tap('#undo');assert page.evaluate("JSON.parse(localStorage.getItem('ljv-studio-map-v1')).nodes.length")==2
with sync_playwright() as pw:
 br=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),args=['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 failures=[]
 for a in apps:
  ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);p=ctx.new_page();p.set_default_timeout(4500);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda dialog:dialog.accept());url='http://127.0.0.1:8193/'+a+'/index.html'
  try:
   p.goto(url);p.wait_for_function("!!navigator.serviceWorker.controller",timeout=12000);p.wait_for_function("!!navigator.serviceWorker.controller")
   m=p.evaluate("async()=>await (await fetch(document.querySelector('link[rel=manifest]').href)).json()")
   for icon in m['icons']:
    im=Image.open(BytesIO(ctx.request.get(url.rsplit('/',1)[0]+'/'+icon['src']).body()));assert im.size==(int(icon['sizes'].split('x')[0]),)*2
   
   if a=='studytown3d': p.wait_for_function("document.querySelector('#moduleSelect').options.length>5")
   p.evaluate('window.scrollTo(0,0)');ctx.set_offline(True);p.reload();use(p,a);assert not errors,errors
   ctx.set_offline(False); p.goto(url);p.set_viewport_size({'width':1080,'height':760});p.wait_for_timeout(300)
   if a=='portal-run':p.locator('#start').click();p.wait_for_timeout(600)
   f=Path('studio-apps',a,'preview.webp');im=Image.open(BytesIO(p.screenshot()));im.thumbnail((840,580));im.convert('RGB').save(f,'WEBP',quality=78)
   print(a,'PASS',flush=True)
  except Exception as e:failures.append(a);print(a,'FAIL',str(e)[:1100],'page errors',errors,flush=True)
  ctx.close()
 br.close()
 if failures: raise SystemExit('Failed: '+', '.join(failures))

