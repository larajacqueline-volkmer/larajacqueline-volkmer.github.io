
/* Vicara main script - localStorage based */
const STORAGE_KEY = "ljv-studio-vicara-v4";

const DEFAULT_LANGS = [
  "Englisch","Koreanisch","Niederländisch","Öcher Platt",
  "Abkürzung","Studium","Codex der Shortcuts","Nerd Wissen","Coding-Tricks","Tech-Notizen"
];

// Seed only when empty
function seedIfEmpty(){
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if(existing.length>0) return;
  const seed = [
    {de:"Hallo", foreign:"annyeonghaseyo 안녕하세요", lang:"Koreanisch", difficulty:"Leicht"},
    {de:"Guten Tag", foreign:"annyeong 안녕", lang:"Koreanisch", difficulty:"Leicht"},
    {de:"Bitte", foreign:"jebal 제발", lang:"Koreanisch", difficulty:"Mittel"},
    {de:"Danke", foreign:"gomawo 고마워", lang:"Koreanisch", difficulty:"Leicht"},
    {de:"Ja", foreign:"ne 네", lang:"Koreanisch", difficulty:"Leicht"},
    {de:"Nein", foreign:"aniyo 아니요", lang:"Koreanisch", difficulty:"Leicht"},
    {de:"Entschuldigung", foreign:"mianhae 미안해", lang:"Koreanisch", difficulty:"Mittel"},
    {de:"Tschüss", foreign:"annyeong 안녕", lang:"Koreanisch", difficulty:"Leicht"},
    {de:"Wie geht's?", foreign:"eotteohke jinae? 어떻게 지내?", lang:"Koreanisch", difficulty:"Mittel"},
  ].map((w,i)=>({id:Date.now()+i, ...w, stats:{right:0,wrong:0}}));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
}
seedIfEmpty();

function getWords(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
function setWords(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

/* ---------- Router-ish active nav ---------- */
function markActive(){
  const path = location.pathname.split("/").pop();
  const ids = {
    "index.html":"nav-test",
    "add.html":"nav-add",
    "list.html":"nav-list",
    "file.html":"nav-file"
  };
  const activeId = ids[path] || "nav-test";
  document.querySelectorAll(".nav-link").forEach(a=>a.classList.remove("active"));
  const el = document.getElementById(activeId); if(el) el.classList.add("active");
}

/* ---------- Populate language selects ---------- */
function populateSelect(selectEl, withAll=false){
  selectEl.innerHTML = "";
  if(withAll){
    const opt = document.createElement("option");
    opt.value="Alle"; opt.textContent="Alle";
    selectEl.appendChild(opt);
  }
  DEFAULT_LANGS.forEach(l=>{
    const o=document.createElement("option"); o.value=l; o.textContent=l;
    selectEl.appendChild(o);
  });
}

/* ---------- INDEX (Test) ---------- */
let currentIndex = -1;
let currentPool = [];

function buildPool(selected){
  const all = getWords();
  currentPool = (selected && selected!=="Alle") ? all.filter(w=>w.lang===selected) : all.slice();
  shuffle(currentPool);
  currentIndex = -1;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

function showNextCard(){
  if(currentPool.length===0){ renderCard({de:"— (keine Vokabeln)", foreign:"", lang:"", empty:true}); return; }
  currentIndex = (currentIndex+1) % currentPool.length;
  const w = currentPool[currentIndex];
  renderCard(w, /*front=*/true);
}

function renderCard(word, front=true){
  const card = document.querySelector(".vocab-card");
  if(!card) return;
  card.classList.remove("flipped");
  const inner = card.querySelector(".card-inner");
  inner.innerHTML = `
    <div class="card-face card-front">
      <div class="hint">Was bedeutet</div>
      <div class="lang-chip">${escapeHtml(word.lang||"")}</div>
      <h2 id="vocab-word" class="word">${escapeHtml(word.foreign||"—")}</h2>
    </div>
    <div class="card-face card-back">
      <div class="hint">Deutsch</div>
      <div class="lang-chip">${escapeHtml(word.lang||"")}</div>
      <h2 class="word">${escapeHtml(word.de||"—")}</h2>
    </div>
  `;
  if(!front) card.classList.add("flipped");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function handleRating(type){
  if(currentIndex<0 || !currentPool[currentIndex]) return;
  const w = currentPool[currentIndex];
  const all = getWords();
  const idx = all.findIndex(x=>x.id===w.id);
  if(idx>=0){
    if(type==="very-good" || type==="good") all[idx].stats.right++;
    else all[idx].stats.wrong++;
    setWords(all);
  }
  showNextCard();
}

function initIndex(){
  const langSel = document.getElementById("language-select");
  if(!langSel) return;
  populateSelect(langSel,true);
  buildPool(langSel.value);
  langSel.addEventListener("change", ()=>{ buildPool(langSel.value); showNextCard(); });

  // Buttons
  document.getElementById("next-card")?.addEventListener("click", showNextCard);
  document.querySelector(".vocab-card")?.addEventListener("click", ()=>{
    document.querySelector(".vocab-card")?.classList.toggle("flipped");
  });
  document.querySelectorAll(".rating-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> handleRating(btn.dataset.type));
  });
  showNextCard();
}

/* ---------- ADD (Form) ---------- */
function initAdd(){
  const form = document.getElementById("add-word-form");
  if(!form) return;
  const langSel = document.getElementById("language");
  populateSelect(langSel,false);
  const diffSel = document.getElementById("difficulty");
  ["Leicht","Mittel","Schwer"].forEach(d=>{
    const o=document.createElement("option"); o.value=d; o.textContent=d; diffSel.appendChild(o);
  });
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const de = document.getElementById("word-de").value.trim();
    const foreign = document.getElementById("word-foreign").value.trim();
    const lang = langSel.value;
    const difficulty = diffSel.value;
    if(!de || !foreign){ alert("Bitte beide Felder ausfüllen."); return; }
    const all = getWords();
    all.push({id:Date.now(), de, foreign, lang, difficulty, stats:{right:0,wrong:0}});
    setWords(all);
    form.reset();
    alert("Hinzugefügt!");
  });
}

/* ---------- LIST ---------- */
function renderList(){
  const container = document.getElementById("wordList");
  if(!container) return;
  const all = getWords();
  const filter = document.getElementById("listLangFilter").value;
  const query = (document.getElementById("searchInput").value||"").toLowerCase();
  const rows = all.filter(w => (filter==="Alle" || w.lang===filter))
                  .filter(w => (w.de+w.foreign).toLowerCase().includes(query));
  container.innerHTML = "";
  rows.forEach(w=>{
    const d=document.createElement("div");
    d.className="word-item";
    d.innerHTML = `
      <div>
        <div><strong>${escapeHtml(w.de)}</strong> — ${escapeHtml(w.foreign)}</div>
        <div class="tags">
          <span class="tag">${escapeHtml(w.lang)}</span>
          <span class="tag">${escapeHtml(w.difficulty||"")}</span>
          <span class="tag">R:${Number(w.stats?.right)||0}/F:${Number(w.stats?.wrong)||0}</span>
        </div>
      </div>
      <div>
        <button class="btn btn-ghost" data-edit="${Number(w.id)}">Bearbeiten</button>
        <button class="btn btn-ghost" data-del="${Number(w.id)}">Löschen</button>
      </div>
    `;
    container.appendChild(d);
  });
  container.querySelectorAll("[data-del]").forEach(b=>{
    b.addEventListener("click",()=>{
      const id=Number(b.dataset.del);
      const all = getWords().filter(x=>x.id!==id);
      setWords(all); renderList();
    });
  });
}
function initList(){
  const langSel = document.getElementById("listLangFilter");
  if(!langSel) return;
  populateSelect(langSel, true);
  langSel.addEventListener("change", renderList);
  document.getElementById("searchInput").addEventListener("input", renderList);
  document.getElementById("exportJsonBtn")?.addEventListener("click", ()=>{
    const blob = new Blob([localStorage.getItem(STORAGE_KEY)||"[]"], {type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vicara_words.json"; a.click();
  });
  document.getElementById("clearAllBtn")?.addEventListener("click", ()=>{
    if(confirm("Wirklich alle Vokabeln löschen?")){ setWords([]); renderList(); }
  });
  renderList();
}

/* ---------- FILE (Import/Export) ---------- */
function initFile(){
  const i = document.getElementById("importJsonBtn");
  if(!i) return;
  document.getElementById("importJsonBtn").addEventListener("click", ()=>{
    document.getElementById("importFileInput").click();
  });
  document.getElementById("importFileInput").addEventListener("change", (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const arr = JSON.parse(reader.result);
        if(Array.isArray(arr)){ setWords(arr); alert("Import ok"); }
        else alert("Ungültiges JSON");
      }catch(err){ alert("Fehler beim Import"); }
    };
    reader.readAsText(file);
  });
  document.getElementById("exportJsonBtn").addEventListener("click", ()=>{
    const blob = new Blob([localStorage.getItem(STORAGE_KEY)||"[]"], {type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vicara_words.json"; a.click();
  });
}

/* ---------- INIT ---------- */
function initApp(){
  markActive();
  initIndex();
  initAdd();
  initList();
  initFile();
}
document.addEventListener("DOMContentLoaded", initApp);
