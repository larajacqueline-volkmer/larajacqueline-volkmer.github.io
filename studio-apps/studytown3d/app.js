
/* global THREE, CONFIG */

(function(){
  'use strict';

  // ---------- DOM ----------
  const root = document.getElementById('app');
  const panel = document.getElementById('panel');
  const pTitle = document.getElementById('pTitle');
  const pStatus = document.getElementById('pStatus');
  const pNotes  = document.getElementById('pNotes');
  const pChecks = document.getElementById('pChecks');
  const pCheckInput = document.getElementById('pCheckInput');
  const pCheckAdd   = document.getElementById('pCheckAdd');
  const pSave  = document.getElementById('pSave');
  const pClose = document.getElementById('pClose');

  const resAddBtns = Array.from(document.querySelectorAll('.resAdd'));
  const resLists = {
    scripts: document.getElementById('resScripts'),
    exams:   document.getElementById('resExams'),
    videos:  document.getElementById('resVideos'),
    tests:   document.getElementById('resTests'),
    memos:   document.getElementById('resMemos'),
  };
  const resInputs = {
    scripts: document.getElementById('resScriptsInput'),
    exams:   document.getElementById('resExamsInput'),
    videos:  document.getElementById('resVideosInput'),
    tests:   document.getElementById('resTestsInput'),
    memos:   document.getElementById('resMemosInput'),
  };

  const avatarSelect = document.getElementById('avatarSelect');
  const gridToggle = document.getElementById('gridToggle');
  const resetBtn = document.getElementById('resetBtn');
  const homeBtn  = document.getElementById('homeBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  // ---------- Renderer / Scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(root.clientWidth, root.clientHeight);
  renderer.setClearColor(0x0d1530, 1);
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, root.clientWidth/root.clientHeight, 0.1, 2000);

  function setCamera(pos){
    camera.position.set(pos.x, pos.y, pos.z);
    controls.target.set(0, 0, 0);
    controls.update();
  }


  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  setCamera(CONFIG.CAMERA_START);
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.CONTROLS.damping;
  controls.maxPolarAngle = CONFIG.CONTROLS.maxPolar;
  controls.minDistance = CONFIG.CONTROLS.minDistance;
  controls.maxDistance = CONFIG.CONTROLS.maxDistance;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, .6));
  const dir = new THREE.DirectionalLight(0xffffff, .9);
  dir.position.set(170, 220, 140);
  scene.add(dir);

  // Grid helper (toggle)
  const grid = new THREE.GridHelper(800, 80, 0x334, 0x223);
  grid.visible = false;
  scene.add(grid);
  gridToggle.addEventListener('change', () => grid.visible = gridToggle.checked);

  // ---------- Ground + Roads ----------
  const city = new THREE.Group();
  scene.add(city);

  // Central Plaza
  const ring = CONFIG.RING;
  const sidewalk = ring.sidewalk;
  const roadW = ring.road;
  const halfW = ring.width/2;
  const halfH = ring.height/2;

  const plazaW = ring.width - 2*(roadW + sidewalk);
  const plazaH = ring.height - 2*(roadW + sidewalk);

  const groundMat = new THREE.MeshStandardMaterial({ color:0x1a203e, roughness:.9, metalness:.1 });
  const plazaMat = new THREE.MeshStandardMaterial({ color:0x262f5f, roughness:.85 });
  const roadMat  = new THREE.MeshStandardMaterial({ color:0x141824, roughness:.95 });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(ring.width+160, ring.height+160), groundMat);
  ground.rotation.x = -Math.PI/2; city.add(ground);

  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(plazaW, plazaH), plazaMat);
  plaza.rotation.x = -Math.PI/2; plaza.position.y = .05; city.add(plaza);

  // Roads (top, bottom, left, right)
  function mkRoad(w,h,x,z){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), roadMat);
    m.rotation.x = -Math.PI/2; m.position.set(x, .03, z); city.add(m);
  }
  // horizontal
  mkRoad(ring.width, roadW, 0,  halfH - (roadW/2 + sidewalk));
  mkRoad(ring.width, roadW, 0, -halfH + (roadW/2 + sidewalk));
  // vertical
  mkRoad(roadW, ring.height,  halfW - (roadW/2 + sidewalk), 0);
  mkRoad(roadW, ring.height, -halfW + (roadW/2 + sidewalk), 0);

  // Sidewalks
  const walkMat = new THREE.MeshStandardMaterial({ color:0xcdbd7b, roughness:.95 });
  function mkWalk(w,h,x,z){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), walkMat);
    m.rotation.x = -Math.PI/2; m.position.set(x, .04, z); city.add(m);
  }
  // Outer ring
  mkWalk(ring.width, sidewalk, 0,  halfH - sidewalk/2);
  mkWalk(ring.width, sidewalk, 0, -halfH + sidewalk/2);
  mkWalk(sidewalk, ring.height,  halfW - sidewalk/2, 0);
  mkWalk(sidewalk, ring.height, -halfW + sidewalk/2, 0);
  // Inner ring
  mkWalk(ring.width - 2*(sidewalk+roadW), sidewalk, 0,  halfH - roadW - sidewalk - sidewalk/2);
  mkWalk(ring.width - 2*(sidewalk+roadW), sidewalk, 0, -halfH + roadW + sidewalk + sidewalk/2);
  mkWalk(sidewalk, ring.height - 2*(sidewalk+roadW),
         halfW - roadW - sidewalk - sidewalk/2, 0);
  mkWalk(sidewalk, ring.height - 2*(sidewalk+roadW),
         -halfW + roadW + sidewalk + sidewalk/2, 0);

  // Zebra crossings (simple stripes at middle of each side)
  const stripeMat = new THREE.MeshBasicMaterial({ color:0xffffff });
  function zebra(x1,z1,w,h,n){
    const gap = w/(n*2);
    for(let i=0;i<n;i++){
      const s = new THREE.Mesh(new THREE.PlaneGeometry(gap, h), stripeMat);
      s.rotation.x = -Math.PI/2;
      s.position.set(x1 - w/2 + gap*(2*i+1), .051, z1);
      city.add(s);
    }
  }
  zebra(0,  halfH - (roadW + sidewalk), ring.width*.6, roadW*.5, 10); // top
  zebra(0, -halfH + (roadW + sidewalk), ring.width*.6, roadW*.5, 10); // bottom
  zebra( halfW - (roadW + sidewalk), 0, ring.height*.6, roadW*.5, 8);
  zebra(-halfW + (roadW + sidewalk), 0, ring.height*.6, roadW*.5, 8);

  // Color distribution for 34 buildings
  const palette = {
    pink:   new THREE.Color(CONFIG.COLORS.pink),
    purple: new THREE.Color(CONFIG.COLORS.purple),
    blue:   new THREE.Color(CONFIG.COLORS.blue),
    gold:   new THREE.Color(CONFIG.COLORS.gold),
  };
  const distribution = [
    ...Array(2).fill('pink'),
    ...Array(16).fill('purple'),
    ...Array(15).fill('blue'),
    'gold'
  ];

  // ---------- Modules loading ----------
  async function loadModules(){
    try {
      const res = await fetch('data/modules.json');
      if(!res.ok) throw new Error('HTTP '+res.status);
      const js = await res.json();
      return js;
    } catch(err){
      console.warn('Falle auf CONFIG.MODULES_FALLBACK zurück (Dateizugriff / CORS):', err);
      return CONFIG.MODULES_FALLBACK;
    }
  }

  // ---------- Label canvas texture ----------
  function makeLabelTexture(text, bgColor){
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 42px system-ui,Segoe UI,Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = c.width - 40;
    wrapText(ctx, text, c.width/2, c.height/2, maxWidth, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8; tex.needsUpdate = true;
    return tex;
  }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = text.split(' ');
    let line='', lines=[], testLine='';
    for(let n=0;n<words.length;n++){
      testLine = line + words[n] + ' ';
      if(ctx.measureText(testLine).width > maxWidth && n>0){
        lines.push(line); line = words[n] + ' ';
      } else line = testLine;
    }
    lines.push(line);
    const totalH = lines.length * lineHeight;
    y = y - totalH/2 + lineHeight/2;
    for(let l of lines){
      ctx.fillText(l.trim(), x, y); y += lineHeight;
    }
  }

  // ---------- Building factory ----------
  function makeBuilding(name, colorKey){
    const b = CONFIG.BUILDING;
    const h = b.minH + Math.random()*(b.maxH-b.minH);
    const geom = new THREE.BoxGeometry(b.w, h, b.d);
    const baseMat = new THREE.MeshStandardMaterial({
      color: palette[colorKey], roughness:.65, metalness: colorKey === 'gold' ? .45 : .15,
      emissive: colorKey === 'gold' ? new THREE.Color(palette.gold).multiplyScalar(0.1) : new THREE.Color(0x000000)
    });
    // Materials: px, nx, py, ny, pz, nz; We'll map top (py) with label
    const mats = [
      baseMat, baseMat,
      new THREE.MeshBasicMaterial({ map: makeLabelTexture(name) }), // top
      baseMat,
      baseMat, baseMat
    ];
    const mesh = new THREE.Mesh(geom, mats);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { label: name, colorKey, radius: Math.max(b.w,b.d)*0.62, h };
    return mesh;
  }

  // ---------- Houses placement along ring ----------
  function ringPositions(){
    const perSide = [9,8,9,8]; // top, right, bottom, left
    const positions = [];
    const margin = CONFIG.BUILDING.w * 0.5 + 2;
    const innerHalfW = halfW - sidewalk - roadW - sidewalk - margin;
    const innerHalfH = halfH - sidewalk - roadW - sidewalk - margin;
    // top (left->right)
    for(let i=0;i<perSide[0];i++){
      const x = -innerHalfW + i*( (innerHalfW*2) / (perSide[0]-1) );
      positions.push({x, z: innerHalfH, side: 'top'});
    }
    // right (top->bottom)
    for(let i=0;i<perSide[1];i++){
      const z = innerHalfH - i*( (innerHalfH*2) / (perSide[1]-1) );
      positions.push({x: innerHalfW, z, side: 'right'});
    }
    // bottom (left->right)
    for(let i=0;i<perSide[2];i++){
      const x = -innerHalfW + i*( (innerHalfW*2) / (perSide[2]-1) );
      positions.push({x, z: -innerHalfH, side: 'bottom'});
    }
    // left (bottom->top)
    for(let i=0;i<perSide[3];i++){
      const z = -innerHalfH + i*( (innerHalfH*2) / (perSide[3]-1) );
      positions.push({x: -innerHalfW, z, side: 'left'});
    }
    return positions;
  }

  // ---------- Avatar ----------
  const loader = new THREE.TextureLoader();
  const avatarSpriteMat = new THREE.SpriteMaterial({ color: 0xffffff });
  const avatar = new THREE.Sprite(avatarSpriteMat);
  avatar.position.set(0, 6, -halfH + roadW + sidewalk + 4);
  avatar.scale.set(10, 10, 1);
  scene.add(avatar);

  function setAvatarSprite(key){
    const url = CONFIG.AVATARS[key] || CONFIG.AVATARS.robot;
    loader.load(url, (tex)=>{
      tex.flipY = false;
      avatarSpriteMat.map = tex;
      avatarSpriteMat.needsUpdate = true;
    }, undefined, ()=>{
      // fallback: generate simple circle texture
      const c = document.createElement('canvas'); c.width = 128; c.height=128;
      const ctx=c.getContext('2d'); ctx.fillStyle='#5cf'; ctx.beginPath(); ctx.arc(64,64,50,0,Math.PI*2); ctx.fill();
      avatarSpriteMat.map = new THREE.CanvasTexture(c);
      avatarSpriteMat.needsUpdate = true;
    });
  }
  setAvatarSprite(avatarSelect.value);
  avatarSelect.addEventListener('change', ()=>{
    setAvatarSprite(avatarSelect.value);
    saveSession();
  });

  const keys = {};
  window.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea,select')) return;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
  });
  window.addEventListener('blur', () => Object.keys(keys).forEach(key => keys[key] = false));
  window.addEventListener('keyup',   (e)=> keys[e.code] = false);

  const speed = 45; // world units per second
  const avatarRadius = 6;

  function updateAvatar(dt){
    let vx=0, vz=0;
    if(keys['KeyW'] || keys['ArrowUp'])    vz -= 1;
    if(keys['KeyS'] || keys['ArrowDown'])  vz += 1;
    if(keys['KeyA'] || keys['ArrowLeft'])  vx -= 1;
    if(keys['KeyD'] || keys['ArrowRight']) vx += 1;
    if(vx || vz){
      const len = Math.hypot(vx, vz) || 1;
      vx/=len; vz/=len;
      avatar.position.x += vx*speed*dt;
      avatar.position.z += vz*speed*dt;
      // keep inside ring roads
      clampToRoadBand(avatar.position);
      // collisions with buildings
      for(const h of buildings){
        const dx = avatar.position.x - h.mesh.position.x;
        const dz = avatar.position.z - h.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = h.mesh.userData.radius + avatarRadius;
        if(dist < minDist){
          const push = (minDist - dist) + 0.001;
          const nx = dx / (dist||1), nz = dz / (dist||1);
          avatar.position.x += nx * push;
          avatar.position.z += nz * push;
        }
      }
    }
  }
  function clampToRoadBand(v){
    // Outer bounds
    const outX = halfW - sidewalk/2;
    const outZ = halfH - sidewalk/2;
    v.x = Math.max(-outX, Math.min(outX, v.x));
    v.z = Math.max(-outZ, Math.min(outZ, v.z));
    // Inner bounds (not entering plaza area)
    const inX = halfW - (sidewalk + roadW + sidewalk + 1);
    const inZ = halfH - (sidewalk + roadW + sidewalk + 1);
    if(Math.abs(v.x) < inX && Math.abs(v.z) < inZ){
      // snap back to nearest road edge
      if(Math.abs(inX - Math.abs(v.x)) < Math.abs(inZ - Math.abs(v.z))){
        v.x = Math.sign(v.x) * inX;
      } else {
        v.z = Math.sign(v.z) * inZ;
      }
    }
  }

  // ---------- Raycaster for clicks ----------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let selectedHouse = null;

  function onClick(ev){
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(buildings.map(b=>b.mesh), true);
    if(hits.length){
      const mesh = hits[0].object;
      const house = buildings.find(b=> b.mesh === mesh || b.mesh.children.includes(mesh) || b.mesh === mesh.parent);
      if(house) focusHouse(house);
    }
  }
  renderer.domElement.addEventListener('click', onClick);

  // ---------- Smooth camera tween ----------
  let tween = null;
  function smoothCameraTo(pos, look, ms=900){
    const start = {x: camera.position.x, y: camera.position.y, z: camera.position.z,
                   tx: controls.target.x, ty: controls.target.y, tz: controls.target.z};
    const end = {x: pos.x, y: pos.y, z: pos.z, tx: look.x, ty: look.y, tz: look.z};
    const t0 = performance.now();
    tween = function(now){
      const t = Math.min(1, (now - t0)/ms);
      const s = easeOutCubic(t);
      camera.position.set(
        lerp(start.x, end.x, s),
        lerp(start.y, end.y, s),
        lerp(start.z, end.z, s)
      );
      controls.target.set(
        lerp(start.tx, end.tx, s),
        lerp(start.ty, end.ty, s),
        lerp(start.tz, end.tz, s)
      );
      if(t>=1) tween=null;
    };
  }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }

  function focusHouse(house){
    selectedHouse = house;
    const look = house.mesh.position.clone();
    const offset = new THREE.Vector3(0, house.mesh.userData.h*1.2 + 60, 90);
    const pos = look.clone().add(offset);
    smoothCameraTo(pos, look, 850);
    openPanel(house);
  }

  function openPanel(house){
    const name = house.name;
    const data = ensureModuleData(name);
    pTitle.textContent = name;
    pStatus.value = data.status || 'todo';
    pNotes.value  = data.notes || '';
    // checklist
    pChecks.innerHTML = '';
    (data.checklist||[]).forEach(item => addChecklistItem(item.text, !!item.done));
    // resources
    for(const k of Object.keys(resLists)){
      resLists[k].innerHTML = '';
      (data.resources?.[k] || []).forEach(v => addResItem(k, v));
    }

    panel.classList.add('open');
  }

  function closePanel(){
    panel.classList.remove('open');
  }
  pClose.addEventListener('click', closePanel);

  function addChecklistItem(text, done=false){
    const li = document.createElement('li');
    const left = document.createElement('span');
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = done;
    left.prepend(cb);
    const label = document.createElement('span'); label.textContent = text;
    left.appendChild(label);
    li.appendChild(left);
    const del = document.createElement('button'); del.textContent='✕'; del.className='btn';
    del.addEventListener('click', ()=> li.remove());
    li.dataset.text = text;
    pChecks.appendChild(li);
  }
  pCheckAdd.addEventListener('click', ()=>{
    const t = pCheckInput.value.trim();
    if(!t) return;
    addChecklistItem(t, false);
    pCheckInput.value = '';
  });

  function addResItem(cat, text){
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = text;
    const del = document.createElement('button'); del.textContent='✕'; del.className='btn';
    del.addEventListener('click', ()=> li.remove());
    li.appendChild(span); li.appendChild(del);
    resLists[cat].appendChild(li);
  }
  resAddBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cat = btn.dataset.cat;
      const v = resInputs[cat].value.trim();
      if(!v) return;
      addResItem(cat, v);
      resInputs[cat].value='';
    });
  });

  // ---------- Persistence ----------
  const STORAGE_KEY = 'ljv-studyTown3D:v2';
  function loadSession(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { modules:{}, avatar: avatarSelect.value };
    }catch(e){ console.warn('localStorage parse', e); return { modules:{}, avatar: avatarSelect.value }; }
  }
  function saveSession(){
    const state = session;
    state.avatar = avatarSelect.value;
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('localStorage save', e); }
  }
  function ensureModuleData(name){
    session.modules[name] = session.modules[name] || {
      status:'todo', notes:'', checklist:[], resources:{ scripts:[], exams:[], videos:[], tests:[], memos:[] }
    };
    return session.modules[name];
  }
  function gatherPanelData(){
    const name = pTitle.textContent;
    const d = ensureModuleData(name);
    d.status = pStatus.value;
    d.notes  = pNotes.value;
    d.checklist = Array.from(pChecks.children).map(li => ({
      text: li.dataset.text || li.querySelector('span span')?.textContent || '',
      done: li.querySelector('input[type="checkbox"]')?.checked || false
    }));
    for(const k of Object.keys(resLists)){
      d.resources[k] = Array.from(resLists[k].children).map(li => (li.querySelector('span')?.textContent || ''));
    }
    session.modules[name] = d;
    saveSession();
  }
  pSave.addEventListener('click', ()=>{
    gatherPanelData();
    closePanel();
  });

  // Export / Import
  exportBtn.addEventListener('click', ()=>{
    const out = {
      version: 1,
      exportedAt: new Date().toISOString(),
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      avatar: avatarSelect.value,
      modules: session.modules
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'StudyTown3D_session.json'; a.click();
    URL.revokeObjectURL(url);
  });
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', ()=>{
    const file = importFile.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        if (!data || typeof data.modules !== 'object' || !data.modules || Array.isArray(data.modules)) throw new Error('Modulliste fehlt');
        for (const value of Object.values(data.modules)) {
          if (!value || !['todo','enrolled','passed'].includes(value.status) || typeof value.notes !== 'string'
            || !Array.isArray(value.checklist) || !value.resources) throw new Error('Ungültige Moduldaten');
        }
        session.modules = data.modules;
        if(data.avatar){ avatarSelect.value = data.avatar; setAvatarSprite(data.avatar); }
        saveSession();
        // If a house is open, refresh its view
        if(selectedHouse) openPanel(selectedHouse);
        alert('Import erfolgreich.');
      }catch(e){ alert('Ungültige Datei: ' + e.message); }
    };
    reader.readAsText(file);
  });

  // Reset / Home
  resetBtn.addEventListener('click', ()=>{
    smoothCameraTo(CONFIG.CAMERA_START, new THREE.Vector3(0,0,0), 650);
  });
  homeBtn.addEventListener('click', ()=>{
    smoothCameraTo(CONFIG.CAMERA_HOME, new THREE.Vector3(0,0,0), 800);
  });

  // ---------- Build everything ----------
  const buildings = [];
  let session = loadSession();
  if(session.avatar && session.avatar !== avatarSelect.value){
    avatarSelect.value = session.avatar;
    setAvatarSprite(session.avatar);
  }

  loadModules().then(list => {
    // ensure 34 buildings
    if(list.length !== 34){
      console.warn('Module sind nicht exakt 34. Gefunden:', list.length);
    }
    const positions = ringPositions();
    const colorOrder = distribution.slice(0); // copy
    // shuffle distribution a bit for variety (but keep counts)
    colorOrder.sort(()=> Math.random()-.5);
    for(let i=0;i<positions.length;i++){
      const mod = list[i % list.length];
      const colorKey = colorOrder[i % colorOrder.length];
      const mesh = makeBuilding(mod.name, colorKey);
      mesh.position.set(positions[i].x, mesh.geometry.parameters.height/2, positions[i].z);
      city.add(mesh);
      const house = { mesh, name: mod.name, status: mod.status };
      buildings.push(house);
      const option = document.createElement('option');
      option.value = String(i); option.textContent = mod.name;
      document.getElementById('moduleSelect').appendChild(option);
      // small deco trees / cars nearby
      addDeco(positions[i]);
    }
  });

  // Deco: simple cones (trees) or boxes (cars)
  function addDeco(pos){
    if(Math.random() < .55){
      const tree = new THREE.Mesh(new THREE.ConeGeometry(2.2, 6, 8), new THREE.MeshStandardMaterial({ color:0x2db06f, roughness:.9 }));
      tree.position.set(pos.x + (Math.random()>.5?8:-8), 3, pos.z + (Math.random()>.5?8:-8));
      city.add(tree);
    }else{
      const car = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 6), new THREE.MeshStandardMaterial({ color:0xff4444, metalness:.3, roughness:.6 }));
      car.position.set(pos.x + (Math.random()>.5?10:-10), 1, pos.z + (Math.random()>.5?10:-10));
      city.add(car);
    }
  }

  document.getElementById('moduleSelect').addEventListener('change', event => {
    const house = buildings[Number(event.target.value)];
    if (house) focusHouse(house);
  });
  // ---------- Animate ----------
  let last = performance.now();
  function animate(now){
    const dt = Math.min(0.033, (now - last)/1000); last = now;
    controls.update();
    updateAvatar(dt);
    if(tween) tween(now);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  window.addEventListener('resize', ()=>{
    renderer.setSize(root.clientWidth, root.clientHeight);
    camera.aspect = root.clientWidth/root.clientHeight; camera.updateProjectionMatrix();
  });

})();