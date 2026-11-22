const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','H'];
const WHITE_PC = new Set([0,2,4,5,7,9,11]);
const KEYBOARD_MAP = {
  a:60,w:61,s:62,e:63,d:64,f:65,t:66,g:67,y:68,h:69,u:70,j:71,k:72,o:73,l:74,p:75
};

const builtInSongs = [
  {id:'river', title:'River Flows in You', artist:'Yiruma', genre:'Pop', cover:'🌙', bpm:92, notes:[60,64,67,69,67,64,62,60,64,67,71,69,67,64,60]},
  {id:'elise', title:'Für Elise', artist:'L. v. Beethoven', genre:'Klassik', cover:'◒', bpm:80, notes:[64,63,64,63,64,59,62,60,57,40,52,57,59,64,63,64]},
  {id:'christmas', title:'Merry Christmas', artist:'Traditional', genre:'Pop', cover:'✦', bpm:88, notes:[67,67,69,67,72,71,67,67,69,67,74,72,67,67,79,76]},
  {id:'hallelujah', title:'Hallelujah', artist:'Leonard Cohen', genre:'Pop', cover:'✧', bpm:78, notes:[67,67,69,69,69,67,64,62,64,67,67,64,62,60]},
  {id:'comptine', title:"Comptine d'un autre été", artist:'Yann Tiersen', genre:'Film', cover:'☼', bpm:74, notes:[64,67,71,69,67,64,62,64,67,71,72,71,67,64]},
  {id:'interstellar', title:'Interstellar', artist:'Hans Zimmer', genre:'Film', cover:'✺', bpm:72, notes:[48,55,60,55,48,55,62,55,50,57,62,57,50,57,64]}
];

const state = {
  currentIndex: 0,
  currentTrack: null,
  notes: [],
  playing: false,
  mode: 'falling',
  audioSource: 'demo',
  elapsed: 0,
  transportStart: 0,
  transportBase: 0,
  raf: 0,
  previousElapsed: 0,
  nextTriggerIndex: 0,
  fileHighlightIndex: 0,
  tempo: 1,
  volume: 0.75,
  loop: false,
  loopA: 0,
  loopB: 8,
  showNotes: true,
  aiHelp: true,
  hard: false,
  hardNotes: new Set(),
  hits: 0,
  misses: 0,
  reactionTotalMs: 0,
  practiceIndex: 0,
  practiceRunning: false,
  practiceTargetAt: 0,
  practiceSessionStart: 0,
  earTarget: null,
  earSessionActive: false,
  customSongs: [],
  favorites: [],
  activeLibraryTab: 'songs',
  activeGenre: 'Alle',
  pendingFile: null,
  objectUrl: null,
  db: null,
  startedAt: 0,
  totalPracticeMs: 0,
  theme: localStorage.getItem('pf-theme') || 'dark'
};

let audioCtx = null;
let masterGain = null;
const audioPlayer = $('#audioPlayer');

function allLibrarySongs() {
  return [...builtInSongs, ...state.customSongs];
}
function currentSong() {
  return state.currentTrack || allLibrarySongs()[state.currentIndex] || builtInSongs[0];
}
function durationOf(song = currentSong()) {
  if (state.audioSource === 'file' && Number.isFinite(audioPlayer.duration) && audioPlayer.duration > 0) return audioPlayer.duration;
  const last = state.notes[state.notes.length - 1];
  const noteEnd = last ? last.t + last.d : 8;
  return Math.max(8, noteEnd + 0.8);
}
function midiToName(m) {
  const octave = Math.floor(m / 12) - 1;
  return `${NOTE_NAMES[m % 12]}${octave}`;
}
function plainNote(m) { return NOTE_NAMES[m % 12]; }
function formatTime(sec) {
  if (!Number.isFinite(sec)) sec = 0;
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2,'0')}`;
}
function slug(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'') || 'pianoflow-song';
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1800);
}
function setTheme(theme) {
  state.theme = theme;
  document.body.classList.toggle('light', theme === 'light');
  localStorage.setItem('pf-theme', theme);
}

function initAudio() {
  if (audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('Web Audio API wird von diesem Browser nicht unterstützt.');
  audioCtx = new AC();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = state.volume;
  masterGain.connect(audioCtx.destination);
}

function pianoTone(midi, velocity = 0.82, seconds = 0.85) {
  try {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const out = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4600, now);
    filter.Q.value = 0.7;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(Math.max(0.06, 0.30 * velocity), now + 0.012);
    out.gain.exponentialRampToValueAtTime(Math.max(0.018, 0.12 * velocity), now + 0.18);
    out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    out.connect(filter).connect(masterGain);
    const f0 = 440 * Math.pow(2, (midi - 69) / 12);
    const partials = [
      [1, 0.95, 'triangle'], [2, 0.20, 'sine'], [3, 0.095, 'sine'], [4, 0.035, 'sine'], [5, 0.016, 'sine']
    ];
    for (const [ratio, amp, type] of partials) {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0 * ratio, now);
      g.gain.value = amp;
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + seconds + 0.08);
    }
    // Small hammer transient.
    const noise = audioCtx.createBufferSource();
    const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.018), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buffer;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.025 * velocity, now + 0.001);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    noise.connect(ng).connect(filter);
    noise.start(now);
  } catch (err) {
    toast(err.message || 'Audio konnte nicht gestartet werden.');
  }
}

function buildNotesFromSong(song) {
  const step = 60 / song.bpm * 0.75;
  return song.notes.map((m, i) => ({
    m,
    t: +(i * step).toFixed(3),
    d: +(step * (i % 4 === 0 ? 0.95 : 0.72)).toFixed(3)
  }));
}

function buildPiano() {
  const piano = $('#piano');
  piano.innerHTML = '';
  const start = 48, end = 72;
  const whiteMidi = [];
  for (let m = start; m <= end; m++) if (WHITE_PC.has(m % 12)) whiteMidi.push(m);
  whiteMidi.forEach(m => {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'white-key';
    key.dataset.m = String(m);
    key.textContent = plainNote(m);
    key.title = `${midiToName(m)} · Tastatur: ${Object.entries(KEYBOARD_MAP).find(([,v]) => v === m)?.[0]?.toUpperCase() || '—'}`;
    key.addEventListener('pointerdown', e => { e.preventDefault(); userNote(m, key); });
    piano.appendChild(key);
  });
  const blackPositions = [49,51,54,56,58,61,63,66,68,70];
  const whiteCount = whiteMidi.length;
  const whiteIndex = m => whiteMidi.findIndex(x => x > m);
  blackPositions.forEach(m => {
    const rightWhite = whiteIndex(m);
    if (rightWhite < 1) return;
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'black-key';
    key.dataset.m = String(m);
    key.textContent = plainNote(m);
    key.style.left = `${rightWhite * (100 / whiteCount)}%`;
    key.title = `${midiToName(m)}`;
    key.addEventListener('pointerdown', e => { e.preventDefault(); userNote(m, key); });
    piano.appendChild(key);
  });
  drawLaneGrid(whiteCount);
}
function drawLaneGrid(count) {
  const grid = $('#laneGrid');
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) grid.appendChild(document.createElement('span'));
}
function highlightKey(m, className = 'active', duration = 200) {
  const key = $(`.white-key[data-m="${m}"]`) || $(`.black-key[data-m="${m}"]`);
  if (!key) return;
  key.classList.add(className);
  setTimeout(() => key.classList.remove(className), duration);
}
function setPersistentTarget(m) {
  $$('.white-key.target, .black-key.target').forEach(k => k.classList.remove('target'));
  if (!state.aiHelp || !Number.isFinite(m)) return;
  const key = $(`.white-key[data-m="${m}"]`) || $(`.black-key[data-m="${m}"]`);
  if (key) key.classList.add('target');
}

function setTrack(song, notes, source = 'demo', file = null) {
  stopAllAudio(false);
  state.currentTrack = song;
  state.notes = notes || [];
  state.audioSource = source;
  state.pendingFile = file;
  state.elapsed = 0;
  state.previousElapsed = 0;
  state.nextTriggerIndex = 0;
  state.fileHighlightIndex = 0;
  state.practiceIndex = 0;
  state.practiceRunning = false;
  state.practiceSessionStart = 0;
  state.startedAt = 0;
  state.hardNotes.clear();
  $('#songTitle').textContent = song.title;
  $('#songMeta').textContent = `${song.artist}${source === 'file' ? ' · Eigene Datei' : ' · Demo'}`;
  $('#trackCover').textContent = song.cover || '♫';
  $('#seek').value = 0;
  $('#seek').max = String(durationOf(song));
  $('#time').textContent = `0:00 / ${formatTime(durationOf(song))}`;
  audioPlayer.pause();
  audioPlayer.onloadedmetadata = null;
  if (state.objectUrl) { URL.revokeObjectURL(state.objectUrl); state.objectUrl = null; }
  if (source === 'file' && file) {
    state.objectUrl = URL.createObjectURL(file);
    audioPlayer.src = state.objectUrl;
    audioPlayer.playbackRate = state.tempo;
    audioPlayer.onloadedmetadata = () => { updateTimeUI(); };
  } else {
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
  }
  renderSongs();
  renderEditor();
  renderStats();
  drawNotes(0);
  updateNextLabel();
}

function selectBuiltIn(index) {
  const song = builtInSongs[index];
  if (!song) return;
  state.currentIndex = index;
  state.activeLibraryTab = 'songs';
  setTrack(song, buildNotesFromSong(song), 'demo');
  toast(`${song.title} geladen`);
}
async function selectCustomSong(id) {
  const song = state.customSongs.find(s => s.id === id);
  if (!song) return false;
  const blob = await loadCustomBlob(id);
  if (!blob) {
    toast('Die lokale Audiodatei wurde nicht gefunden. Bitte erneut laden.');
    return false;
  }
  setTrack(song, song.notes || [], 'file', blob);
  state.activeLibraryTab = 'own';
  renderSongs();
  toast(`${song.title} geladen`);
  return true;
}

function renderSongs() {
  const q = ($('#search')?.value || '').trim().toLowerCase();
  const target = $('#songList');
  if (!target) return;
  let list = [];
  if (state.activeLibraryTab === 'songs') list = builtInSongs.map((s,i) => ({song:s, key:`b:${i}`}));
  if (state.activeLibraryTab === 'own') list = state.customSongs.map(s => ({song:s, key:`c:${s.id}`}));
  if (state.activeLibraryTab === 'fav') {
    list = allLibrarySongs().filter(s => state.favorites.includes(s.id)).map(s => ({song:s, key:`f:${s.id}`}));
  }
  if (q) list = list.filter(({song}) => `${song.title} ${song.artist}`.toLowerCase().includes(q));
  if (state.activeGenre !== 'Alle') list = list.filter(({song}) => song.genre === state.activeGenre);
  target.innerHTML = list.length ? list.map(({song,key}) => {
    const selected = currentSong()?.id === song.id;
    const fav = state.favorites.includes(song.id);
    return `<div class="song-item ${selected ? 'selected' : ''}" data-key="${key}">
      <div class="song-cover">${song.cover || '♫'}</div>
      <div class="song-copy"><b>${escapeHtml(song.title)}</b><small>${escapeHtml(song.artist)}${song.bpm ? ` · ${song.bpm} BPM` : ''}</small></div>
      <button class="song-fav" type="button" data-fav="${escapeAttr(song.id)}" aria-label="Favorit">${fav ? '★' : '☆'}</button>
      <button class="song-play" type="button" aria-label="Song abspielen">▶</button>
    </div>`;
  }).join('') : `<div style="padding:18px;color:#7b87a1;font-size:11px">${state.activeLibraryTab === 'own' ? 'Noch keine eigenen Songs.' : 'Keine Songs gefunden.'}</div>`;

  $$('.song-item', target).forEach(row => {
    const key = row.dataset.key;
    row.querySelector('.song-play')?.addEventListener('click', e => { e.stopPropagation(); playLibraryKey(key); });
    row.querySelector('.song-fav')?.addEventListener('click', e => {
      e.stopPropagation(); toggleFavorite(e.currentTarget.dataset.fav);
    });
    row.addEventListener('click', () => playLibraryKey(key));
  });
}
async function playLibraryKey(key) {
  let ready = true;
  if (key.startsWith('b:')) selectBuiltIn(Number(key.slice(2)));
  else if (key.startsWith('c:')) ready = await selectCustomSong(key.slice(2));
  else if (key.startsWith('f:')) {
    const id = key.slice(2);
    const b = builtInSongs.findIndex(s => s.id === id);
    if (b >= 0) selectBuiltIn(b); else ready = await selectCustomSong(id);
  }
  if (ready) togglePlay(true);
}
function toggleFavorite(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) state.favorites.splice(i,1); else state.favorites.push(id);
  localStorage.setItem('pf-favorites', JSON.stringify(state.favorites));
  renderSongs();
}
function escapeHtml(s) { return String(s).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function escapeAttr(s) { return String(s).replace(/[^\w-]/g,''); }

function stopAllAudio(resetClock = true) {
  state.playing = false;
  if(state.practiceRunning) finishPracticeTimer();
  state.practiceRunning = false;
  cancelAnimationFrame(state.raf);
  audioPlayer.pause();
  $('#playBtn').textContent = '▶';
  if (resetClock) {
    state.elapsed = 0;
    state.previousElapsed = 0;
    state.nextTriggerIndex = 0;
  }
}

function togglePlay(forcePlay = null) {
  if (state.mode === 'practice') {
    if (forcePlay === false) return stopAllAudio(false);
    if (!state.practiceRunning) return startPractice();
    state.practiceRunning = false;
    finishPracticeTimer();
    $('#playBtn').textContent = '▶';
    toast('Übung pausiert');
    return;
  }
  const wantPlay = forcePlay === null ? !state.playing : forcePlay;
  if (!wantPlay) {
    if (state.audioSource === 'file') audioPlayer.pause();
    state.playing = false;
    $('#playBtn').textContent = '▶';
    return;
  }
  try {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
  state.playing = true;
  state.transportStart = performance.now();
  state.transportBase = state.audioSource === 'file' ? audioPlayer.currentTime : state.elapsed;
  state.previousElapsed = state.elapsed;
  state.nextTriggerIndex = state.notes.findIndex(n => n.t >= state.elapsed - 0.001);
  state.fileHighlightIndex = state.notes.findIndex(n => n.t >= state.elapsed - 0.001);
  if (state.nextTriggerIndex < 0) state.nextTriggerIndex = 0;
  $('#playBtn').textContent = 'Ⅱ';
  if (state.audioSource === 'file') {
    audioPlayer.playbackRate = state.tempo;
    audioPlayer.play().catch(() => toast('Klicke erneut auf Play, um Audio zu starten.'));
  }
  cancelAnimationFrame(state.raf);
  state.raf = requestAnimationFrame(tick);
  toast('Wiedergabe gestartet');
}

function currentElapsed(now = performance.now()) {
  if (state.audioSource === 'file') return Math.max(0, audioPlayer.currentTime || 0);
  return state.transportBase + ((now - state.transportStart) / 1000) * state.tempo;
}

function triggerDemoNotes(from, to) {
  if (!state.notes.length || state.audioSource !== 'demo') return;
  while (state.nextTriggerIndex < state.notes.length) {
    const n = state.notes[state.nextTriggerIndex];
    if (n.t > to + 0.002) break;
    if (n.t >= from - 0.002) {
      pianoTone(n.m, 0.76, Math.max(0.32, n.d / Math.max(0.5, state.tempo)));
      highlightKey(n.m, 'active', 190);
      if (state.aiHelp) setPersistentTarget(n.m);
    }
    state.nextTriggerIndex++;
  }
}

function tick(now) {
  if (!state.playing) return;
  const nextElapsed = currentElapsed(now);
  const prev = state.elapsed;
  state.elapsed = nextElapsed;
  if (state.audioSource === 'demo') triggerDemoNotes(prev, state.elapsed);
  if (state.loop && state.elapsed >= Math.max(state.loopA + 0.5, Math.min(state.loopB, durationOf() - 0.05))) {
    seekTo(state.loopA);
    state.playing = true;
    state.transportStart = now;
    state.transportBase = state.loopA;
    state.nextTriggerIndex = state.notes.findIndex(n => n.t >= state.loopA);
    if (state.nextTriggerIndex < 0) state.nextTriggerIndex = 0;
  }
  if (!state.loop && state.elapsed >= durationOf() - 0.02) {
    stopAllAudio(false);
    state.elapsed = durationOf();
    updateTimeUI();
    drawNotes(state.elapsed);
    toast('Song beendet');
    return;
  }
  updateTimeUI();
  drawNotes(state.elapsed);
  updateNextLabel();
  renderStats(false);
  state.previousElapsed = state.elapsed;
  state.raf = requestAnimationFrame(tick);
}

function updateTimeUI() {
  const d = durationOf();
  $('#seek').max = String(d);
  $('#seek').value = String(Math.min(d, state.elapsed));
  $('#time').textContent = `${formatTime(state.elapsed)} / ${formatTime(d)}`;
}
function seekTo(value) {
  const d = durationOf();
  state.elapsed = Math.max(0, Math.min(Number(value) || 0, d));
  state.previousElapsed = state.elapsed;
  if (state.audioSource === 'file' && audioPlayer.src) { audioPlayer.currentTime = state.elapsed; state.fileHighlightIndex = state.notes.findIndex(n=>n.t>=state.elapsed); if(state.fileHighlightIndex<0)state.fileHighlightIndex=state.notes.length; }
  if (state.audioSource === 'demo') {
    state.transportBase = state.elapsed;
    state.transportStart = performance.now();
    state.nextTriggerIndex = state.notes.findIndex(n => n.t >= state.elapsed);
    if (state.nextTriggerIndex < 0) state.nextTriggerIndex = state.notes.length;
  }
  updateTimeUI();
  drawNotes(state.elapsed);
  updateNextLabel();
}

function updateNextLabel() {
  let n = state.notes.find(x => x.t >= state.elapsed - 0.05);
  if (state.mode === 'practice' && state.notes[state.practiceIndex]) n = state.notes[state.practiceIndex];
  $('#nextNoteLabel').textContent = n ? `Nächste Taste · ${plainNote(n.m)}` : 'Bereit · Piano spielen';
  if (state.mode !== 'practice' && n && state.aiHelp) setPersistentTarget(n.m);
  if (state.mode !== 'practice' && (!n || !state.aiHelp)) $$('.white-key.target, .black-key.target').forEach(k => k.classList.remove('target'));
}

function drawNotes(playhead = state.elapsed) {
  const c = $('#noteCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const rect = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (c.width !== width || c.height !== height) { c.width = width; c.height = height; }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,rect.width,rect.height);
  if (!state.showNotes && state.mode !== 'practice') return;
  const w = rect.width, h = rect.height;
  const pianoH = window.innerWidth <= 620 ? 116 : 133;
  const hitY = h - pianoH - 3;
  const lookAhead = 5.0;
  const startMidi = 48, endMidi = 72;
  for (const n of state.notes) {
    if (state.mode !== 'practice' && (n.t - playhead < -0.8 || n.t - playhead > lookAhead)) continue;
    if (state.mode === 'practice' && state.notes[state.practiceIndex] !== n) continue;
    const dt = n.t - playhead;
    const y = state.mode === 'practice' ? hitY - 58 : hitY - (dt / lookAhead) * (hitY - 20);
    const hh = Math.max(20, (n.d / lookAhead) * (hitY - 20));
    const x = (n.m - startMidi) / (endMidi - startMidi) * w;
    const keyW = w / 16.5;
    const isBlack = [1,3,6,8,10].includes(n.m % 12);
    const ww = isBlack ? Math.max(14, keyW * 0.7) : Math.max(18, keyW * 0.86);
    const gradient = ctx.createLinearGradient(0,y,0,y+hh);
    const pink = state.hard && (state.hardNotes.has(n) || n._difficult);
    gradient.addColorStop(0, pink ? '#ff91de' : '#5be8ff');
    gradient.addColorStop(1, pink ? '#ff42be' : '#20caff');
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 18;
    ctx.shadowColor = pink ? '#ff46be' : '#18dcff';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x-ww/2,y,ww,hh,8); else { ctx.rect(x-ww/2,y,ww,hh); }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function beginPracticeTimer(){ if(!state.practiceSessionStart) state.practiceSessionStart=performance.now(); }
function finishPracticeTimer(){ if(state.practiceSessionStart){ state.totalPracticeMs += performance.now()-state.practiceSessionStart; state.practiceSessionStart=0; } }
function startPractice() {
  state.mode = 'practice';
  if (!state.notes.length) { toast('Dieser Song hat noch keine Noten.'); return; }
  state.practiceRunning = true;
  state.playing = false;
  beginPracticeTimer();
  state.practiceIndex = Math.min(state.practiceIndex, state.notes.length - 1);
  state.practiceTargetAt = performance.now();
  $('#playBtn').textContent = 'Ⅱ';
  const target = state.notes[state.practiceIndex];
  pianoTone(target.m, 0.55, 0.55);
  setPersistentTarget(target.m);
  $('#nextNoteLabel').textContent = `Spiele jetzt · ${plainNote(target.m)}`;
  toast(`Übung: ${plainNote(target.m)} spielen`);
  drawNotes(state.elapsed);
}
function evaluatePracticeInput(m) {
  if (!state.practiceRunning) return false;
  const target = state.notes[state.practiceIndex];
  if (!target) return false;
  if (m === target.m) {
    const reaction = performance.now() - state.practiceTargetAt;
    state.hits++;
    state.reactionTotalMs += reaction;
    state.practiceIndex++;
    state.hardNotes.delete(target);
    toast(`✓ Treffer · ${plainNote(m)}`);
    if (state.practiceIndex >= state.notes.length) {
      state.practiceRunning = false;
      finishPracticeTimer();
      $('#playBtn').textContent = '▶';
      $$('.white-key.target, .black-key.target').forEach(k => k.classList.remove('target'));
      toast('Übung abgeschlossen');
    } else {
      const next = state.notes[state.practiceIndex];
      state.practiceTargetAt = performance.now();
      pianoTone(next.m, 0.42, 0.45);
      setPersistentTarget(next.m);
    }
    renderStats();
    drawNotes(state.elapsed);
    return true;
  }
  state.misses++;
  target._difficult = true;
  state.hardNotes.add(target);
  toast(`Noch einmal · ${plainNote(target.m)} erwartet`);
  renderStats();
  return true;
}

function userNote(m, el = null) {
  pianoTone(m, 0.95, 0.82);
  if (el) highlightKey(m, 'active', 180); else highlightKey(m, 'active', 180);
  if (state.mode === 'practice') {
    evaluatePracticeInput(m);
    return;
  }
  if (state.mode === 'ear' && state.earSessionActive) {
    evaluateEarInput(m);
    return;
  }
  toast(`${midiToName(m)} gespielt`);
}

function renderStats(save = true) {
  const total = state.hits + state.misses;
  const acc = total ? Math.round(state.hits / total * 100) : 0;
  $('#accuracyBig').textContent = `${acc}%`;
  $('#hits').textContent = String(state.hits);
  $('#misses').textContent = String(state.misses);
  $('#reaction').textContent = state.hits ? `${Math.max(0.1, state.reactionTotalMs / state.hits / 1000).toFixed(1)} s` : '—';
  $('#practiceTime').textContent = `${Math.max(0, Math.round(state.totalPracticeMs / 60000))} min`;
  if (save) saveSettings();
}

function renderEditor() {
  const tbody = $('#noteTable');
  tbody.innerHTML = state.notes.slice(0, 60).map((n,i) => `<tr>
    <td>${i+1}</td>
    <td><select class="note-midi" data-i="${i}" aria-label="Note"><option value="${n.m}">${midiToName(n.m)}</option></select></td>
    <td><input class="note-time" data-i="${i}" type="number" min="0" step="0.01" value="${n.t.toFixed(2)}"></td>
    <td><input class="note-duration" data-i="${i}" type="number" min="0.05" step="0.01" value="${n.d.toFixed(2)}"></td>
    <td><button type="button" class="delete-note" data-i="${i}" title="Note löschen">×</button></td>
  </tr>`).join('');
  $$('.note-midi', tbody).forEach(sel => {
    const i = +sel.dataset.i;
    sel.innerHTML = Array.from({length:49},(_,j)=>j+36).map(m => `<option value="${m}" ${m===state.notes[i].m?'selected':''}>${midiToName(m)}</option>`).join('');
    sel.addEventListener('change', e => { state.notes[i].m = +e.target.value; renderEditor(); drawNotes(); });
  });
  $$('.note-time', tbody).forEach(inp => inp.addEventListener('change', e => { state.notes[+e.target.dataset.i].t = Math.max(0,+e.target.value || 0); sortNotes(); }));
  $$('.note-duration', tbody).forEach(inp => inp.addEventListener('change', e => { state.notes[+e.target.dataset.i].d = Math.max(0.05,+e.target.value || 0.05); renderEditor(); }));
  $$('.delete-note', tbody).forEach(b => b.addEventListener('click', () => { state.notes.splice(+b.dataset.i,1); renderEditor(); drawNotes(); toast('Note gelöscht'); }));
}
function sortNotes() { state.notes.sort((a,b)=>a.t-b.t); renderEditor(); drawNotes(); }
function addNote() {
  const last = state.notes[state.notes.length - 1];
  state.notes.push({m:60,t:+((last ? last.t + Math.max(last.d,0.5) : 0)).toFixed(2),d:0.5});
  sortNotes();
  toast('C4 hinzugefügt');
}
function clearNotes() {
  if (!state.notes.length || !confirm('Aktuelle Sequenz wirklich leeren?')) return;
  state.notes = [];
  renderEditor();
  drawNotes();
  toast('Sequenz geleert');
}

function exportJSON() {
  const song = currentSong();
  const payload = {name:song.title, artist:song.artist, bpm:song.bpm || null, notes:state.notes};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), `${slug(song.title)}.json`);
  toast('JSON exportiert');
}

function writeVLQ(n) {
  n = Math.max(0, Math.floor(n));
  let buffer = n & 0x7F;
  const bytes=[];
  while ((n >>= 7)) { buffer <<= 8; buffer |= ((n & 0x7F) | 0x80); }
  while (true) { bytes.push(buffer & 0xFF); if (buffer & 0x80) buffer >>= 8; else break; }
  return bytes;
}
function exportMIDI() {
  const ppq = 480;
  const tempoBpm = Math.max(30, Math.min(240, currentSong().bpm || 100));
  const ticksPerSecond = (tempoBpm / 60) * ppq;
  const events=[];
  for (const n of state.notes) {
    const on = Math.max(0, Math.round(n.t * ticksPerSecond));
    const off = Math.max(on + 1, Math.round((n.t+n.d) * ticksPerSecond));
    events.push({tick:on, bytes:[0x90,n.m,96]},{tick:off, bytes:[0x80,n.m,0]});
  }
  events.sort((a,b)=>a.tick-b.tick || a.bytes[0]-b.bytes[0]);
  let last=0; const track=[];
  for (const ev of events) { track.push(...writeVLQ(Math.max(0,ev.tick-last)),...ev.bytes); last=ev.tick; }
  const mpqn = Math.round(60000000/tempoBpm);
  track.push(0,0xFF,0x51,3,(mpqn>>16)&255,(mpqn>>8)&255,mpqn&255,0,0xFF,0x2F,0);
  const header=[0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,1,0xE0];
  const len=track.length; const bytes=[...header,0x4d,0x54,0x72,0x6b,(len>>24)&255,(len>>16)&255,(len>>8)&255,len&255,...track];
  downloadBlob(new Blob([new Uint8Array(bytes)],{type:'audio/midi'}), `${slug(currentSong().title)}.mid`);
  toast('MIDI exportiert');
}
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}

async function prepareAudioFile(file) {
  if (!file || !file.type.startsWith('audio/')) { toast('Bitte eine Audiodatei auswählen.'); return; }
  state.pendingFile = file;
  $('#fileStatus').textContent = `Bereit: ${file.name} · ${Math.max(0.1,file.size/1024/1024).toFixed(1)} MB`;
  $('#analyseBtn').disabled = false;
  $('#useFileBtn').disabled = false;
  const object = URL.createObjectURL(file);
  audioPlayer.src = object;
  audioPlayer.onloadedmetadata = () => {
    $('#fileStatus').textContent = `${file.name} · ${formatTime(audioPlayer.duration)} · bereit`;
    URL.revokeObjectURL(object);
  };
  toast('Audio-Datei geladen');
}
async function useFileAsTrack() {
  if (!state.pendingFile) return;
  const title = state.pendingFile.name.replace(/\.[^.]+$/,'');
  const custom = {id:`file-${Date.now()}`,title,artist:'Eigene Datei',genre:'Eigene Daten',cover:'♫',bpm:null,notes:[]};
  state.customSongs.unshift(custom);
  persistCustomMeta();
  await saveCustomBlob(custom.id, state.pendingFile, custom);
  setTrack(custom, [], 'file', state.pendingFile);
  state.activeLibraryTab='own';
  renderSongs();
  toast('Eigene Datei als Song geladen');
}

function createPitchWorker() {
  const source = `
    function detectPitches(data, sampleRate) {
      const targetRate = 11025;
      const ratio = Math.max(1, Math.floor(sampleRate / targetRate));
      const dsRate = sampleRate / ratio;
      const n = Math.floor(data.length / ratio);
      const ds = new Float32Array(n);
      for (let i = 0; i < n; i++) ds[i] = data[i * ratio] || 0;
      const frame = 640;
      const hop = 640;
      const minHz = 55;
      const maxHz = 1047;
      const minTau = Math.max(2, Math.floor(dsRate / maxHz));
      const maxTau = Math.min(Math.floor(dsRate / minHz), Math.floor(frame / 2));
      const result = [];
      let previousMidi = null;
      let previousTime = 0;
      for (let start = 0; start + frame < ds.length; start += hop) {
        if (start % (hop * 12) === 0) postMessage({type:'progress', value:Math.min(99, Math.round(start / Math.max(1, ds.length-frame) * 100))});
        let energy = 0;
        for (let i = 0; i < frame; i++) { const v = ds[start+i] || 0; energy += v*v; }
        const rms = Math.sqrt(energy / frame);
        if (rms < 0.012) { previousMidi = null; continue; }
        let bestTau = -1, bestCorr = 0;
        for (let tau = minTau; tau <= maxTau; tau++) {
          let sum1 = 0, sum2 = 0, corr = 0;
          const limit = frame - tau;
          for (let i = 0; i < limit; i++) {
            const a = ds[start+i] || 0, b = ds[start+i+tau] || 0;
            corr += a*b; sum1 += a*a; sum2 += b*b;
          }
          const normalized = corr / (Math.sqrt(sum1*sum2) + 1e-8);
          if (normalized > bestCorr) { bestCorr = normalized; bestTau = tau; }
        }
        if (bestTau < 0 || bestCorr < 0.34) { previousMidi = null; continue; }
        const hz = dsRate / bestTau;
        if (!Number.isFinite(hz) || hz < minHz || hz > maxHz) { previousMidi = null; continue; }
        const midi = Math.round(69 + 12 * Math.log2(hz/440));
        if (midi < 36 || midi > 84) { previousMidi = null; continue; }
        const t = +(start / dsRate).toFixed(3);
        const previous = result[result.length-1];
        if (previous && midi === previousMidi && t - previousTime <= 0.14) {
          previous.d = +Math.min(0.9, previous.d + hop/dsRate).toFixed(3);
        } else {
          result.push({m:midi,t,d:+(hop/dsRate).toFixed(3)});
        }
        previousMidi = midi;
        previousTime = t;
      }
      postMessage({type:'done', notes:result.slice(0,360)});
    }
    onmessage = (e) => { try { detectPitches(new Float32Array(e.data.buffer), e.data.sampleRate); } catch (err) { postMessage({type:'error', message:String(err && err.message || err)}); } };
  `;
  const blob = new Blob([source], {type:'text/javascript'});
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  worker.addEventListener('error', () => URL.revokeObjectURL(url), {once:true});
  return {worker,url};
}

async function analyseAudio() {
  const file = state.pendingFile;
  if (!file) return;
  $('#analyseBtn').disabled = true;
  $('#useFileBtn').disabled = true;
  $('#fileStatus').textContent = 'Audio wird lokal analysiert …';
  let workerPack = null;
  try {
    initAudio();
    const bytes = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(bytes.slice(0));
    const maxDur = Math.min(decoded.duration, 60);
    const sr = decoded.sampleRate;
    const length = Math.floor(maxDur * sr);
    const mono = new Float32Array(length);
    for (let ch=0; ch<decoded.numberOfChannels; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i=0; i<length; i++) mono[i] += data[i] / decoded.numberOfChannels;
    }
    workerPack = createPitchWorker();
    const {worker} = workerPack;
    const detected = await new Promise((resolve,reject)=>{
      worker.onmessage = e => {
        if (e.data.type === 'progress') $('#fileStatus').textContent = `Analyse läuft … ${e.data.value}%`;
        else if (e.data.type === 'done') resolve(e.data.notes || []);
        else if (e.data.type === 'error') reject(new Error(e.data.message));
      };
      worker.onerror = e => reject(new Error(e.message || 'Pitch-Worker konnte nicht gestartet werden.'));
      worker.postMessage({buffer:mono.buffer,sampleRate:sr},{transfer:[mono.buffer]});
    });
    workerPack.worker.terminate();
    URL.revokeObjectURL(workerPack.url);
    workerPack = null;
    if (detected.length < 2) throw new Error('Es wurden zu wenige eindeutige Klaviertöne erkannt.');
    state.notes = detected;
    const title = file.name.replace(/\.[^.]+$/,'');
    const existing = state.customSongs.find(s => s.title === title);
    const custom = existing || {id:`file-${Date.now()}`,title,artist:'Eigene Datei',genre:'Eigene Daten',cover:'♫',bpm:null,notes:[]};
    custom.notes = state.notes;
    custom.bpm = estimateBpm(state.notes);
    state.customSongs = state.customSongs.filter(s=>s.id!==custom.id && s.title!==title);
    state.customSongs.unshift(custom);
    persistCustomMeta();
    await saveCustomBlob(custom.id,file,custom);
    setTrack(custom,state.notes,'file',file);
    $('#fileStatus').textContent = `${file.name} · ${formatTime(decoded.duration)} · ${detected.length} Noten erkannt`;
    state.activeLibraryTab='own';
    $$('.tab').forEach((tab,index)=>tab.classList.toggle('active',index===1));
    renderSongs(); renderEditor(); drawNotes();
    toast(`${detected.length} Noten erkannt`);
  } catch(err) {
    if (workerPack) { workerPack.worker.terminate(); URL.revokeObjectURL(workerPack.url); }
    $('#fileStatus').textContent=`Analyse fehlgeschlagen: ${err.message}`;
    toast('Analyse konnte nicht abgeschlossen werden');
  } finally {
    $('#analyseBtn').disabled = false;
    $('#useFileBtn').disabled = false;
  }
}
function yinPitch(data,offset,frameSize,sr){
  const minTau=Math.max(2,Math.floor(sr/1047));
  const maxTau=Math.min(Math.floor(sr/55),Math.floor(frameSize/2));
  let bestTau=-1,bestCorr=0;
  for(let tau=minTau;tau<=maxTau;tau++){
    let a2=0,b2=0,c=0;
    const limit=frameSize-tau;
    for(let i=0;i<limit;i++){const a=data[offset+i]||0,b=data[offset+i+tau]||0;c+=a*b;a2+=a*a;b2+=b*b;}
    const corr=c/(Math.sqrt(a2*b2)+1e-8);
    if(corr>bestCorr){bestCorr=corr;bestTau=tau;}
  }
  return bestTau>0&&bestCorr>=0.34?sr/bestTau:0;
}
function estimateBpm(ns){
  if(ns.length<4) return null;
  const gaps=[]; for(let i=1;i<Math.min(ns.length,80);i++){const g=ns[i].t-ns[i-1].t;if(g>0.15&&g<1.5)gaps.push(g);}
  if(!gaps.length)return null; const avg=gaps.reduce((a,b)=>a+b,0)/gaps.length; return Math.round(Math.max(40,Math.min(180,60/avg)));
}

function startEarTraining() {
  state.mode='ear'; state.earSessionActive=true;
  state.earTarget = 48 + Math.floor(Math.random()*25);
  const note=state.earTarget;
  pianoTone(note,0.8,0.9);
  $$('.white-key.target, .black-key.target').forEach(k=>k.classList.remove('target'));
  $('#nextNoteLabel').textContent='Gehörtraining · Welcher Ton?';
  openModal('earModal');
}
function evaluateEarInput(m) {
  if (!state.earSessionActive) return;
  if (m % 12 === state.earTarget % 12) {
    state.hits++; toast(`✓ Richtig · ${midiToName(m)}`);
    state.earSessionActive=false; renderStats();
    setTimeout(()=>{ if(state.mode==='ear' && !document.hidden) startEarTraining(); }, 500);
  } else {
    state.misses++; renderStats(); toast('Nicht ganz · noch einmal hören');
  }
}

function openModal(id) { $(`#${id}`)?.classList.add('open'); }
function closeModals() { $$('.modal.open').forEach(m=>m.classList.remove('open')); }
function openSettings() {
  const html=`<div class="setting-line"><span>Darstellung</span><select id="modalTheme"><option value="dark">Dark</option><option value="light">Light</option></select></div>
  <div class="setting-line"><span>Audio beim Start</span><label class="switch"><input id="modalAutoSound" type="checkbox"><span></span></label></div>
  <div class="setting-line"><span>Statistik zurücksetzen</span><button id="resetStats" class="mini-btn">Zurücksetzen</button></div>`;
  $('#settingsContent').innerHTML=html;
  $('#modalTheme').value=state.theme;
  $('#modalAutoSound').checked=localStorage.getItem('pf-auto-sound')==='1';
  $('#modalTheme').onchange=e=>setTheme(e.target.value);
  $('#modalAutoSound').onchange=e=>localStorage.setItem('pf-auto-sound',e.target.checked?'1':'0');
  $('#resetStats').onclick=()=>{state.hits=0;state.misses=0;state.reactionTotalMs=0;state.totalPracticeMs=0;renderStats();toast('Statistik zurückgesetzt');};
  openModal('settingsModal');
}

function saveSettings(){
  localStorage.setItem('pf-stats',JSON.stringify({hits:state.hits,misses:state.misses,reactionTotalMs:state.reactionTotalMs,totalPracticeMs:state.totalPracticeMs}));
}
function loadSettings(){
  try{
    const s=JSON.parse(localStorage.getItem('pf-stats')||'{}');
    Object.assign(state,{hits:+s.hits||0,misses:+s.misses||0,reactionTotalMs:+s.reactionTotalMs||0,totalPracticeMs:+s.totalPracticeMs||0});
    state.favorites=JSON.parse(localStorage.getItem('pf-favorites')||'[]');
  }catch{}
  setTheme(state.theme);
}

function dbOpen(){
  if(state.db) return Promise.resolve(state.db);
  return new Promise(resolve=>{
    if(!('indexedDB' in window)) return resolve(null);
    const req=indexedDB.open('PianoFlowAI',1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'id'});};
    req.onsuccess=()=>{state.db=req.result;resolve(state.db);};
    req.onerror=()=>resolve(null);
  });
}
async function saveCustomBlob(id,blob,meta){
  const db=await dbOpen();
  if(!db) return;
  await new Promise(res=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id,blob,meta});tx.oncomplete=res;tx.onerror=res;});
}
async function loadCustomBlob(id){
  const db=await dbOpen();
  if(!db)return null;
  return new Promise(res=>{const tx=db.transaction('files','readonly');const req=tx.objectStore('files').get(id);req.onsuccess=()=>res(req.result?.blob||null);req.onerror=()=>res(null);});
}

function wireUI(){
  // Main transport.
  $('#playBtn').onclick=()=>togglePlay();
  $('#prevBtn').onclick=()=>{const idx=(state.currentIndex+builtInSongs.length-1)%builtInSongs.length;selectBuiltIn(idx);};
  $('#nextBtn').onclick=()=>{const idx=(state.currentIndex+1)%builtInSongs.length;selectBuiltIn(idx);};
  $('#seek').oninput=e=>seekTo(+e.target.value);
  $('#volume').oninput=e=>{state.volume=+e.target.value;try{initAudio();masterGain.gain.value=state.volume;}catch{}};
  $('#tempoSelect').onchange=e=>{state.tempo=+e.target.value;$('#tempoSlider').value=Math.round(state.tempo*100);$('#tempoLabel').textContent=`${Math.round(state.tempo*100)}%`;if(state.audioSource==='file')audioPlayer.playbackRate=state.tempo;toast(`Tempo ${Math.round(state.tempo*100)}%`);};
  $('#tempoSlider').oninput=e=>{state.tempo=Math.max(.25,+e.target.value/100);$('#tempoLabel').textContent=`${e.target.value}%`;$('#tempoSelect').value=String(state.tempo);if(state.audioSource==='file')audioPlayer.playbackRate=state.tempo;};
  $('#loopToggle').onclick=e=>{state.loop=!state.loop;e.currentTarget.classList.toggle('on',state.loop);$('#loopLabel').textContent=state.loop?'A – B aktiv':'A – B';state.loopA=state.elapsed;state.loopB=Math.min(durationOf(),state.loopA+8);toast(state.loop?`Loop ${formatTime(state.loopA)} – ${formatTime(state.loopB)}`:'Loop deaktiviert');};
  $('#hardToggle').onclick=e=>{state.hard=!state.hard;e.currentTarget.classList.toggle('on',state.hard);$('#hardLabel').textContent=state.hard?'Markiert':'Markieren';toast(state.hard?'Schwierige Stellen markiert':'Markierung aus');drawNotes();};
  $('#notesToggle').onclick=e=>{state.showNotes=!state.showNotes;e.currentTarget.classList.toggle('on',state.showNotes);drawNotes();};
  $('#aiToggle').onclick=e=>{state.aiHelp=!state.aiHelp;e.currentTarget.classList.toggle('on',state.aiHelp);$('#aiLabel').textContent=state.aiHelp?'Ein':'Aus';updateNextLabel();};

  // Quick start.
  $('#demoBtn').onclick=()=>{selectBuiltIn(0);togglePlay(true);};
  $('#uploadBtn').onclick=()=>$('#audioFile').click();
  $('#freeBtn').onclick=()=>{state.mode='free';state.practiceRunning=false;setPersistentTarget(NaN);toast('Freies Spielen · Piano bereit');};
  $('#audioFile').onchange=e=>prepareAudioFile(e.target.files[0]);
  $('#analyseBtn').onclick=analyseAudio;
  $('#useFileBtn').onclick=useFileAsTrack;
  const dz=$('#dropzone');
  dz.ondragover=e=>{e.preventDefault();dz.classList.add('dragging');};
  dz.ondragleave=()=>dz.classList.remove('dragging');
  dz.ondrop=e=>{e.preventDefault();dz.classList.remove('dragging');prepareAudioFile(e.dataTransfer.files[0]);};

  // Modes.
  $$('[data-mode]').forEach(btn=>btn.onclick=()=>{
    state.mode=btn.dataset.mode;
    $$('[data-mode]').forEach(x=>x.classList.remove('active-mode'));
    btn.classList.add('active-mode');
    if(state.mode==='practice'){stopAllAudio(false);state.practiceIndex=0;state.hardNotes.clear();toast('Übungsmodus · Play drücken');updateNextLabel();}
    else if(state.mode==='ear'){stopAllAudio(false);startEarTraining();}
    else if(state.mode==='editor')$('#editorPanel').scrollIntoView({behavior:'smooth',block:'center'});
    else toast(state.mode==='free'?'Freies Spielen · Piano bereit':'Falling Notes · direkt mitspielen');
  });

  // Navigation.
  $$('.main-nav .nav-item').forEach(btn=>btn.onclick=()=>{
    $$('.main-nav .nav-item').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
    const section=btn.dataset.section;
    const map={home:()=>window.scrollTo({top:0,behavior:'smooth'}),learn:()=>document.querySelector('[data-mode="practice"]').click(),songs:()=>$('#songsPanel').scrollIntoView({behavior:'smooth',block:'center'}),analysis:()=>$('#analysisPanel').scrollIntoView({behavior:'smooth',block:'center'}),editor:()=>$('#editorPanel').scrollIntoView({behavior:'smooth',block:'center'}),stats:()=>$('#statsPanel').scrollIntoView({behavior:'smooth',block:'center'})};
    map[section]?.();
  });

  // Library tabs.
  $$('.tab').forEach((tab,index)=>tab.onclick=()=>{
    $$('.tab').forEach(x=>x.classList.remove('active')); tab.classList.add('active');
    state.activeLibraryTab=['songs','own','fav'][index] || 'songs';
    state.activeGenre='Alle';
    $$('.filter').forEach(x=>x.classList.toggle('active', x.textContent==='Alle'));
    renderSongs();
  });
  $('#search').oninput=renderSongs;
  $$('.filter').forEach(btn=>btn.onclick=()=>{$$('.filter').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.activeGenre=btn.textContent;renderSongs();});

  // Editor.
  $('#addNoteBtn').onclick=addNote;
  $('#clearNotesBtn').onclick=clearNotes;
  $('#exportJsonBtn').onclick=exportJSON;
  $('#exportMidiBtn').onclick=exportMIDI;

  // Top actions.
  $('#themeBtn').onclick=()=>setTheme(state.theme==='dark'?'light':'dark');
  $('#settingsBtn').onclick=openSettings;
  $('#fullscreenBtn').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{toast('Vollbild wird von diesem Browser nicht unterstützt.')}};

  // Settings/ear modal.
  $$('.modal-close').forEach(b=>b.onclick=closeModals);
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));
  $$('#earButtons button').forEach(b=>b.addEventListener('click',()=>evaluateEarInput(+b.dataset.m)));

  // Computer keyboard.
  document.addEventListener('keydown',e=>{
    const tag=(e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='select'||tag==='textarea')return;
    if(e.key==='Escape'){closeModals();return;}
    if(e.code==='Space'){e.preventDefault();togglePlay();return;}
    const m=KEYBOARD_MAP[e.key.toLowerCase()];
    if(Number.isFinite(m)){e.preventDefault();userNote(m);}
  });
  window.addEventListener('resize',()=>{drawLaneGrid($$('.white-key').length);drawNotes();});
  audioPlayer.addEventListener('loadedmetadata',()=>{ updateTimeUI(); });
  audioPlayer.addEventListener('timeupdate',()=>{
    if(state.audioSource==='file'&&!audioPlayer.paused){
      const from=state.elapsed;
      state.elapsed=audioPlayer.currentTime;
      while(state.fileHighlightIndex<state.notes.length && state.notes[state.fileHighlightIndex].t<=state.elapsed+0.01){
        const n=state.notes[state.fileHighlightIndex];
        if(n.t>=from-0.02) highlightKey(n.m,'active',180);
        state.fileHighlightIndex++;
      }
      updateTimeUI();drawNotes(state.elapsed);updateNextLabel();
    }
  });
  audioPlayer.addEventListener('ended',()=>{if(state.loop){seekTo(state.loopA);togglePlay(true);}else{state.playing=false;$('#playBtn').textContent='▶';toast('Audio beendet');}});
}

function loadInitialState(){
  loadSettings();
  try{state.customSongs=JSON.parse(localStorage.getItem('pf-custom-meta')||'[]');}catch{state.customSongs=[];}
  // Filter stale metadata with missing ids.
  state.customSongs=state.customSongs.filter(s=>s && s.id);
}
function persistCustomMeta(){localStorage.setItem('pf-custom-meta',JSON.stringify(state.customSongs.map(s=>({...s,notes:s.notes||[]}))));}


loadInitialState();
state.currentIndex=0;
state.currentTrack=builtInSongs[0];
state.notes=buildNotesFromSong(builtInSongs[0]);
wireUI();
buildPiano();
setTrack(builtInSongs[0], buildNotesFromSong(builtInSongs[0]), 'demo');
renderSongs();
renderEditor();
renderStats(false);

audioPlayer.volume = 1;

// Keep custom song metadata in sync.
window.addEventListener('beforeunload',()=>{persistCustomMeta();saveSettings();});

// Pause practice when the app leaves the foreground.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.playing) togglePlay(false);
});
