// main.js (Paket 3 Final Logic)
// Memoria Core Features:
// - XP / Level tracking
// - Deck storage (create, list, import, export)
// - Learn mode (spaced repetition style rating)
// - Quests (XP rewards)
// - Stats tracking
// - PDF viewer shell (UI hooks only; pdf.js rendering to integrate)
// - Settings (theme + accent colors)
// - Toast helper
//
// All data is stored in localStorage under keys:
//   memoria_profile     {xp,totalXp,level,nextXp,colorPrimary,colorAccent,theme,...}
//   memoria_decks       { [deckId]: {id,name,cards:[{q,a}], createdAt,...} }
//   memoria_schedule    learning sessions / stats
//   memoria_quests      [{id,title,xp,doneAt:null|timestamp}, ...]
//   memoria_pdf_state   bookmarks, last page etc
//
// KI hook for Zusammenfassen:
//   window.MEMORIA_SUMMARY_API(urlOrText) -> Promise<string>
//   Default: fallback local heuristic summary.

(function(){
  'use strict';

  // -------------- Utilities --------------

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function loadJSON(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    } catch(e){
      console.warn('loadJSON error', key, e);
      return fallback;
    }
  }

  function saveJSON(key, val){
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch(e){
      console.warn('saveJSON error', key, e);
    }
  }

  // Toast / Snackbar
  function showToast(msg, timeoutMs=2500){
    let t = $('#toast');
    if(!t){
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=>{
      t.classList.remove('show');
    }, timeoutMs);
  }


  // -------------- Profile / XP / Level --------------

  // XP curve, simple: every level -> nextXp = 100 * level
  function computeNextXp(level){
    return level * 100;
  }

  function ensureProfile(){
    let profile = loadJSON('memoria_profile', null);
    if(!profile){
      profile = {
        level: 1,
        xp: 0,        // xp in current level
        totalXp: 0,   // overall xp
        nextXp: computeNextXp(1),
        colorPrimary: '#9D2A83',
        colorAccent: '#66ccff',
        theme: 'neon', // neon | dark | light
        statsDays: {}  // daily stats, keyed by YYYY-MM-DD
      };
      saveJSON('memoria_profile', profile);
    }
    return profile;
  }

  function addXP(amount){
    const p = ensureProfile();
    p.xp += amount;
    p.totalXp += amount;

    // daily stats track time / xp
    const today = new Date().toISOString().slice(0,10);
    if(!p.statsDays[today]){
      p.statsDays[today] = {xp:0,cards:0,focusMin:0};
    }
    p.statsDays[today].xp += amount;

    // level up
    while(p.xp >= p.nextXp){
      p.xp -= p.nextXp;
      p.level += 1;
      p.nextXp = computeNextXp(p.level);
      showToast('Level Up! Du bist jetzt Level ' + p.level);
    }

    saveJSON('memoria_profile', p);
    renderProfileHeader();
    renderDashboard();
    renderStats();
  }

  function trackLearnedCard(){
    const p = ensureProfile();
    const today = new Date().toISOString().slice(0,10);
    if(!p.statsDays[today]){
      p.statsDays[today] = {xp:0,cards:0,focusMin:0};
    }
    p.statsDays[today].cards += 1;
    saveJSON('memoria_profile', p);
    renderStats();
  }

  function renderProfileHeader(){
    const p = ensureProfile();
    const lvlBadge = $('#user-level-badge');
    const xpFill = $('#user-xp-fill');
    const xpCur = $('#user-xp-current');
    const xpNext = $('#user-xp-next');
    const dashLvl = $('#dash-level');
    const dashXp = $('#dash-xp');

    if(lvlBadge) lvlBadge.textContent = 'Level ' + p.level;
    if(xpCur) xpCur.textContent = p.xp;
    if(xpNext) xpNext.textContent = p.nextXp;
    if(dashLvl) dashLvl.textContent = p.level;
    if(dashXp) dashXp.textContent = p.totalXp;

    if(xpFill){
      const pct = p.nextXp>0? (p.xp / p.nextXp)*100 : 0;
      xpFill.style.width = pct.toFixed(1) + '%';
    }
  }


  // -------------- Decks --------------

  // decks structure: {deckId:{id,name,cards:[{q,a,stats:{...}}],createdAt}}
  function ensureDecks(){
    let decks = loadJSON('memoria_decks', null);
    if(!decks){
      decks = {};
      // demo deck
      const did = 'demo';
      decks[did] = {
        id: did,
        name: 'Demo-Deck',
        cards: [
          {q:'Marktpsychologie?', a:'Untersucht Verhalten von Konsument:innen in Märkten.'},
          {q:'Werbepsychologie?', a:'Wie Werbung auf Wahrnehmung, Emotion, Handlung wirkt.'},
          {q:'UX?', a:'User Experience. Subjektives Nutzungserleben.'},
          {q:'Konsistenzprinzip?', a:'Menschen wollen konsistent handeln und denken.'},
        ],
        createdAt: Date.now()
      };
      saveJSON('memoria_decks', decks);
    }
    return decks;
  }

  function createDeck(name){
    const decks = ensureDecks();
    const id = 'deck_' + Date.now();
    decks[id] = {
        id,
        name: name || ('Neues Deck ' + Object.keys(decks).length),
        cards: [],
        createdAt: Date.now()
    };
    saveJSON('memoria_decks', decks);
    showToast('Deck erstellt');
    renderDeckList();
    refreshDeckSelect();
  }

  function exportAllDecks(){
    const decks = ensureDecks();
    const blob = new Blob([JSON.stringify(decks,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memoria_decks_export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Decks exportiert');
  }

  async function importDecksFromFile(file){
    if(!file) return;
    try {
      const txt = await file.text();
      const json = JSON.parse(txt);
      // merge
      const decks = ensureDecks();
      Object.keys(json).forEach(id => {
        decks[id] = json[id];
      });
      saveJSON('memoria_decks', decks);
      showToast('Import erfolgreich');
      renderDeckList();
      refreshDeckSelect();
    } catch(e){
      console.warn('import error', e);
      showToast('Import fehlgeschlagen');
    }
  }

  // Render deck list on decks.html
  function renderDeckList(){
    const wrap = $('#deck-list');
    if(!wrap) return;
    const decks = ensureDecks();
    wrap.innerHTML = '';
    Object.values(decks).forEach(deck => {
      const cardCount = deck.cards.length;
      const el = document.createElement('div');
      el.className = 'kard';
      el.style.marginBottom = '.75rem';
      el.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:.5rem;justify-content:space-between;">
          <div>
            <div class="label" style="margin-bottom:.2rem;">${escapeHTML(deck.name)}</div>
            <div class="section-sub">${cardCount} Karten</div>
          </div>
          <div class="row" style="flex-wrap:wrap;">
            <button class="btn ghost" data-act="learn" data-id="${deck.id}">Lernen</button>
            <button class="btn ghost" data-act="addcard" data-id="${deck.id}">+ Karte</button>
            <button class="btn ghost" data-act="deldeck" data-id="${deck.id}">Löschen</button>
          </div>
        </div>
      `;
      wrap.appendChild(el);
    });

    wrap.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-act]');
      if(!btn) return;
      const act = btn.getAttribute('data-act');
      const id = btn.getAttribute('data-id');
      if(act === 'deldeck'){
        deleteDeck(id);
      } else if(act === 'addcard'){
        addCardToDeckPrompt(id);
      } else if(act === 'learn'){
        // jump to learn page with deck selected
        localStorage.setItem('memoria_active_deck', id);
        location.href='learn.html';
      }
    }, {once:false});
  }

  function deleteDeck(id){
    const decks = ensureDecks();
    if(!decks[id]) return;
    delete decks[id];
    saveJSON('memoria_decks', decks);
    showToast('Deck gelöscht');
    renderDeckList();
    refreshDeckSelect();
  }

  function addCardToDeckPrompt(id){
    const q = prompt('Frage / Front:');
    const a = prompt('Antwort / Back:');
    if(!q || !a) return;
    const decks = ensureDecks();
    if(!decks[id]) return;
    decks[id].cards.push({
      q, a,
    });
    saveJSON('memoria_decks', decks);
    showToast('Karte gespeichert');
    renderDeckList();
    refreshDeckSelect();
  }

  function refreshDeckSelect(){
    const sel = $('#deck-select');
    if(!sel) return;
    const decks = ensureDecks();
    sel.innerHTML = '';
    Object.values(decks).forEach(deck => {
      const opt = document.createElement('option');
      opt.value = deck.id;
      opt.textContent = deck.name + ` (${deck.cards.length})`;
      sel.appendChild(opt);
    });

    // if we had memoria_active_deck remember it
    const lastDeck = localStorage.getItem('memoria_active_deck');
    if(lastDeck && decks[lastDeck]){
      sel.value = lastDeck;
    }
  }


  // -------------- Learn mode --------------

  let currentSession = {
    deckId: null,
    index: 0,
    order: [], // array of card indexes
    showAnswer: false,
  };

  function startSession(){
    const sel = $('#deck-select');
    if(!sel || !sel.value) {
      showToast('Kein Deck gewählt');
      return;
    }
    const deckId = sel.value;
    localStorage.setItem('memoria_active_deck', deckId);

    const decks = ensureDecks();
    const deck = decks[deckId];
    if(!deck || !deck.cards.length){
      showToast('Dieses Deck hat keine Karten');
      return;
    }

    currentSession.deckId = deckId;
    currentSession.index = 0;
    currentSession.order = shuffleArray(deck.cards.map((_,i)=>i));
    currentSession.showAnswer = false;

    updateLearnUI();
  }

  function endSession(){
    currentSession.deckId = null;
    currentSession.index = 0;
    currentSession.order = [];
    currentSession.showAnswer = false;
    updateLearnUI();
  }

  function showAnswerNow(){
    currentSession.showAnswer = true;
    updateLearnUI();
  }

  function gradeCard(grade){
    // grade impacts XP. Just simple mapping:
    // again=1 xp, hard=2, good=4, easy=6
    const xpMap={again:1,hard:2,good:4,easy:6};
    addXP(xpMap[grade] || 1);

    trackLearnedCard();

    // next card
    currentSession.index += 1;
    currentSession.showAnswer = false;

    updateLearnUI();
  }

  function updateLearnUI(){
    const qEl = $('#learn-question');
    const aEl = $('#learn-answer');
    const rowGrade = $('#grade-row');
    const progText = $('#session-count');
    const progPct = $('#session-progress');

    const decks = ensureDecks();

    if(!currentSession.deckId){
      // session ended or never started
      if(qEl) qEl.textContent = 'Keine aktive Session';
      if(aEl){ aEl.style.display='none'; }
      if(rowGrade){ rowGrade.hidden = true; }
      if(progText) progText.textContent = '0 / 0';
      if(progPct) progPct.textContent = '0 %';
      return;
    }

    const deck = decks[currentSession.deckId];
    const order = currentSession.order;
    const idx = currentSession.index;

    if(idx >= order.length){
      // Session fertig
      if(qEl) qEl.textContent = 'Session beendet 🎯';
      if(aEl){
        aEl.style.display = 'block';
        aEl.textContent = 'Nice.';
      }
      if(rowGrade){ rowGrade.hidden = true; }
      if(progText) progText.textContent = order.length + ' / ' + order.length;
      if(progPct) progPct.textContent = '100 %';
      return;
    }

    const cardIndex = order[idx];
    const card = deck.cards[cardIndex];

    if(qEl) qEl.textContent = card.q || '(ohne Frage)';
    if(aEl){
      if(currentSession.showAnswer){
        aEl.style.display = 'block';
        aEl.textContent = card.a || '(ohne Antwort)';
      } else {
        aEl.style.display = 'none';
      }
    }
    if(rowGrade){
      rowGrade.hidden = !currentSession.showAnswer;
    }

    // progress text
    if(progText){
      progText.textContent = (idx)+' / '+(order.length);
    }
    if(progPct){
      const pct = order.length>0 ? Math.round((idx/order.length)*100) : 0;
      progPct.textContent = pct + ' %';
    }
  }


  // -------------- Quests --------------

  function ensureQuests(){
    let quests = loadJSON('memoria_quests', null);
    if(!quests){
      quests = [];
      saveJSON('memoria_quests', quests);
    }
    return quests;
  }

  function addQuest(title, xp){
    const quests = ensureQuests();
    quests.push({
      id: 'q_'+Date.now(),
      title: title || 'Neue Quest',
      xp: xp||10,
      doneAt: null
    });
    saveJSON('memoria_quests', quests);
    renderQuests();
    showToast('Quest hinzugefügt');
  }

  function completeQuest(id){
    const quests = ensureQuests();
    const q = quests.find(q=>q.id===id);
    if(!q || q.doneAt) return;
    q.doneAt = Date.now();
    saveJSON('memoria_quests', quests);
    addXP(q.xp||10);
    renderQuests();
    showToast('Quest abgeschlossen +XP');
  }

  function renderQuests(){
    const wrap = $('#quest-list');
    if(!wrap) return;
    const quests = ensureQuests();
    wrap.innerHTML='';
    if(!quests.length){
      wrap.innerHTML='<div class="section-sub">Keine Quests</div>';
      return;
    }
    quests.forEach(q=>{
      const done = !!q.doneAt;
      const el = document.createElement('div');
      el.className='kard';
      el.style.marginBottom='.75rem';
      el.innerHTML=`
        <div style="display:flex;flex-wrap:wrap;gap:.5rem;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="label" style="margin-bottom:.2rem;">${escapeHTML(q.title)}</div>
            <div class="section-sub">${q.xp||10} XP</div>
            ${done ? '<div class="badge">Erledigt</div>' : ''}
          </div>
          <div class="row" style="flex-wrap:wrap;">
            ${done? '' : `<button class="btn ghost" data-qdone="${q.id}">Abschließen</button>`}
          </div>
        </div>
      `;
      wrap.appendChild(el);
    });

    wrap.addEventListener('click', e=>{
      const btn=e.target.closest('button[data-qdone]');
      if(!btn) return;
      completeQuest(btn.getAttribute('data-qdone'));
    }, {once:false});
  }


  // -------------- Stats --------------

  function calcTodayStats(){
    const p = ensureProfile();
    const today = new Date().toISOString().slice(0,10);
    const d = p.statsDays[today] || {xp:0,cards:0,focusMin:0};
    return d;
  }

  function renderStats(){
    const p = ensureProfile();
    const totalXpEl = $('#stat-xp');
    const cardsEl = $('#stat-today-cards');
    const focusEl = $('#stat-total-time');

    const todayStats = calcTodayStats();

    if(totalXpEl) totalXpEl.textContent = p.totalXp || 0;
    if(cardsEl) cardsEl.textContent = todayStats.cards || 0;
    if(focusEl) focusEl.textContent = todayStats.focusMin+" min";

    // small chart fallback: write JSON of last days to console
    // Real chart rendering can be done with Chart.js or Recharts later.
    const chartCanvas = $('#chart-sessions');
    if(chartCanvas){
      // Placeholder: not drawing. Could be extended with canvas 2d.
    }
  }


  // -------------- PDF tools (UI side only here) --------------

  // The actual rendering with pdf.js requires pdf.js library.
  // We expose hooks so UI doesn't break if pdf.js not yet wired.

  function pdfInit(){
    const openBtn = $('#pdf-open');
    const clearBtn = $('#pdf-clear');
    const prevBtn = $('#pdf-prev');
    const nextBtn = $('#pdf-next');
    const zoomInBtn = $('#pdf-zoom-in');
    const zoomOutBtn = $('#pdf-zoom-out');
    const findBtn = $('#pdf-find');
    const clearSearchBtn = $('#pdf-clear-search');
    const goBtn = $('#pdf-go');
    const summarizeBtn = $('#pdf-summarize');
    const ttsBtn = $('#pdf-tts');
    const ocrBtn = $('#pdf-ocr');
    const exportPageBtn = $('#pdf-export-page');
    const exportDocBtn = $('#pdf-export-doc');
    const exportHiBtn = $('#pdf-export-highlights');

    if(openBtn){
      openBtn.addEventListener('click', ()=>{
        showToast('PDF öffnen (Hook)');
      });
    }
    if(clearBtn){
      clearBtn.addEventListener('click', ()=>{
        showToast('PDF geschlossen');
      });
    }
    if(prevBtn){
      prevBtn.addEventListener('click', ()=>{
        showToast('Seite zurück');
      });
    }
    if(nextBtn){
      nextBtn.addEventListener('click', ()=>{
        showToast('Seite vor');
      });
    }
    if(zoomInBtn){
      zoomInBtn.addEventListener('click', ()=>{
        showToast('Zoom +');
      });
    }
    if(zoomOutBtn){
      zoomOutBtn.addEventListener('click', ()=>{
        showToast('Zoom -');
      });
    }
    if(findBtn){
      findBtn.addEventListener('click', ()=>{
        const term = $('#pdf-search')?.value||'';
        showToast('Suche: '+term);
      });
    }
    if(clearSearchBtn){
      clearSearchBtn.addEventListener('click', ()=>{
        showToast('Suche gelöscht');
      });
    }
    if(goBtn){
      goBtn.addEventListener('click', ()=>{
        const p = $('#pdf-jump')?.value||'';
        showToast('Gehe zu Seite '+p);
      });
    }
    if(summarizeBtn){
      summarizeBtn.addEventListener('click', async ()=>{
        const summaryBox = $('#pdf-summary');
        if(summaryBox){
          summaryBox.textContent = 'Zusammenfassen...';
        }
        const fakeText = 'Das ist ein Beispieltext der PDF.';
        const sum = await summarizeText(fakeText);
        if(summaryBox){
          summaryBox.textContent = sum;
        }
        showToast('Zusammenfassung erstellt');
      });
    }
    if(ttsBtn){
      ttsBtn.addEventListener('click', ()=>{
        showToast('Vorlesen (TTS Hook)');
      });
    }
    if(ocrBtn){
      ocrBtn.addEventListener('click', ()=>{
        showToast('OCR (Hook)');
      });
    }
    if(exportPageBtn){
      exportPageBtn.addEventListener('click', ()=>{
        showToast('Export Seite (Hook)');
      });
    }
    if(exportDocBtn){
      exportDocBtn.addEventListener('click', ()=>{
        showToast('Export Dokument (Hook)');
      });
    }
    if(exportHiBtn){
      exportHiBtn.addEventListener('click', ()=>{
        showToast('Export Markierungen (Hook)');
      });
    }
  }


  // -------------- KI Hook / Zusammenfassung --------------

  // Optionally override:
  // window.MEMORIA_SUMMARY_API = async function (rawText) { ... }

  async function summarizeText(raw){
    try {
      if(typeof window.MEMORIA_SUMMARY_API === 'function'){
        return await window.MEMORIA_SUMMARY_API(raw);
      }
    } catch(e){
      console.warn('External summary failed', e);
    }
    // fallback: naive local summary
    return localFallbackSummary(raw);
  }

  function localFallbackSummary(raw){
    // crude fallback:
    // - split into sentences
    // - take first ~3
    const sents = raw.split(/(?<=[.?!])\s+/).slice(0,3);
    return sents.join(' ');
  }


  // -------------- Settings (theme, colors) --------------

  function applyThemeSettings(){
    const p = ensureProfile();
    const rootEl = document.documentElement;
    if(p.theme){
      rootEl.setAttribute('data-theme', p.theme);
    }
    if(p.colorPrimary){
      rootEl.style.setProperty('--accent-pink', p.colorPrimary);
    }
    if(p.colorAccent){
      rootEl.style.setProperty('--accent-cyan', p.colorAccent);
    }
  }

  function initSettingsUI(){
    const primary = $('#color-primary');
    const accent = $('#color-accent');
    const themeSel = $('#theme-select');
    const saveBtn = $('#save-settings');
    const resetBtn = $('#reset-settings');

    const p = ensureProfile();

    if(primary) primary.value = p.colorPrimary || '#9D2A83';
    if(accent) accent.value = p.colorAccent || '#66ccff';
    if(themeSel) themeSel.value = p.theme || 'neon';

    if(saveBtn){
      saveBtn.addEventListener('click', ()=>{
        const pr = primary? primary.value : p.colorPrimary;
        const ac = accent? accent.value : p.colorAccent;
        const th = themeSel? themeSel.value : p.theme;
        p.colorPrimary = pr;
        p.colorAccent = ac;
        p.theme = th;
        saveJSON('memoria_profile', p);
        applyThemeSettings();
        showToast('Gespeichert');
      });
    }
    if(resetBtn){
      resetBtn.addEventListener('click', ()=>{
        p.colorPrimary = '#9D2A83';
        p.colorAccent = '#66ccff';
        p.theme = 'neon';
        saveJSON('memoria_profile', p);
        applyThemeSettings();
        if(primary) primary.value = p.colorPrimary;
        if(accent) accent.value = p.colorAccent;
        if(themeSel) themeSel.value = p.theme;
        showToast('Zurückgesetzt');
      });
    }
  }


  // -------------- Dashboard helper --------------

  function renderDashboard(){
    const decks = ensureDecks();
    // count due cards = all cards for now (could add spaced repetition later)
    let totalCards = 0;
    Object.values(decks).forEach(d => { totalCards += d.cards.length; });
    const dueEl = $('#due-cards-badge');
    if(dueEl) dueEl.textContent = totalCards+' Karten bereit';

    const tipEl = $('#tip-of-day');
    if(tipEl){
      const tips=[
        'Besser 10 echte Minuten Fokus als 1 Stunde Schuldgefühl.',
        'Lernen heißt erinnern. Erinnern heißt abrufen. Nicht abschreiben.',
        'Mach dir Notizen wie an dich selbst in 6 Monaten.',
        'Wenn du müde bist: Lies laut vor. Dein Gehirn wacht sofort auf.'
      ];
      tipEl.textContent = tips[(new Date().getDate()+tips.length)%tips.length];
    }
  }


  // -------------- Helpers --------------

  function shuffleArray(arr){
    const a = arr.slice();
    for(let i=a.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHTML(str){
    return (str||'').replace(/[&<>"']/g, function(m){
      switch(m){
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
      }
      return m;
    });
  }


  // -------------- Init per page --------------

  function initDeckPage(){
    const createBtn = $('#create-deck');
    if(createBtn){
      createBtn.addEventListener('click', ()=>{
        const name = $('#deck-name')?.value||'';
        createDeck(name.trim());
        $('#deck-name').value='';
      });
    }

    const importBtn = $('#import-deck');
    if(importBtn){
      importBtn.addEventListener('click', ()=>{
        const fileInput = $('#import-file');
        if(fileInput && fileInput.files && fileInput.files[0]){
          importDecksFromFile(fileInput.files[0]);
          fileInput.value='';
        } else {
          showToast('Keine Datei gewählt');
        }
      });
    }

    const exportBtn = $('#export-deck');
    if(exportBtn){
      exportBtn.addEventListener('click', ()=>{
        exportAllDecks();
      });
    }

    renderDeckList();
  }

  function initLearnPage(){
    const startBtn = $('#start-session');
    const endBtn = $('#end-session');
    const showAnsBtn = $('#show-answer');
    const gradeRow = $('#grade-row');

    if(startBtn){
      startBtn.addEventListener('click', startSession);
    }
    if(endBtn){
      endBtn.addEventListener('click', endSession);
    }
    if(showAnsBtn){
      showAnsBtn.addEventListener('click', showAnswerNow);
    }
    if(gradeRow){
      gradeRow.addEventListener('click', e=>{
        const b = e.target.closest('button[data-grade]');
        if(!b) return;
        const g = b.getAttribute('data-grade');
        gradeCard(g);
      }, {once:false});
    }

    refreshDeckSelect();
    updateLearnUI();
  }

  function initQuestsPage(){
    const addBtn = $('#add-quest');
    if(addBtn){
      addBtn.addEventListener('click', ()=>{
        const title = $('#quest-title')?.value||'';
        const xp = parseInt($('#quest-xp')?.value||'10',10)||10;
        addQuest(title.trim(), xp);
        if($('#quest-title')) $('#quest-title').value='';
        if($('#quest-xp')) $('#quest-xp').value='10';
      });
    }
    renderQuests();
  }

  function initStatsPage(){
    renderStats();
  }

  function initPdfPage(){
    pdfInit();
  }

  function initSettingsPage(){
    initSettingsUI();
  }


  // -------------- Global Init --------------

  function boot(){
    // apply user theme/colors first
    applyThemeSettings();

    // always render xp header if present
    renderProfileHeader();

    // per page
    const path = location.pathname.split('/').pop().toLowerCase();
    if(path.includes('index') || path===''){
      renderDashboard();
    }
    if(path.includes('decks')){
      initDeckPage();
    }
    if(path.includes('learn')){
      initLearnPage();
    }
    if(path.includes('quests')){
      initQuestsPage();
    }
    if(path.includes('stats')){
      initStatsPage();
    }
    if(path.includes('pdf')){
      initPdfPage();
    }
    if(path.includes('settings')){
      initSettingsPage();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);

})(); // end IIFE
