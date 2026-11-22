(()=>{"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const P={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"},V={p:1,n:3,b:3,r:5,q:9,k:0},F="abcdefgh";
const START="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const S={board:[],turn:"w",castling:"KQkq",ep:"-",half:0,full:1,h:[],future:[],sel:null,flip:false,three:true,four:false,rot:0,show:true,sound:true,fav:JSON.parse(localStorage.ljvFav||"[]"),games:JSON.parse(localStorage.ljvGames||"[]"),mode:"ai",human:"w",depth:2,aiThinking:false,exercise:null};
const color=p=>p?(p===p.toUpperCase()?"w":"b"):null, enemy=c=>c==="w"?"b":"w", inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
function sq(r,c){return F[c]+(8-r)}
function fenObj(f){let a=f.split(/\s+/),b=a[0].split("/").map(x=>{let r=[];for(let c of x)/[1-8]/.test(c)?r.push(...Array(+c).fill(null)):r.push(c);return r});return{board:b,turn:a[1],castling:a[2],ep:a[3],half:+a[4],full:+a[5]}}
function FEN(){return S.board.map(r=>{let o="",n=0;for(let p of r){if(!p)n++;else{if(n)o+=n,n=0;o+=p}}return o+(n||"")}).join("/")+" "+S.turn+" "+(S.castling||"-")+" "+S.ep+" "+S.half+" "+S.full}
function clone(b){return b.map(r=>r.slice())} function snap(){return{board:clone(S.board),turn:S.turn,castling:S.castling,ep:S.ep,half:S.half,full:S.full}} function restore(x){Object.assign(S,{board:clone(x.board),turn:x.turn,castling:x.castling,ep:x.ep,half:x.half,full:x.full,sel:null})}
function king(b,c){let k=c==="w"?"K":"k";for(let r=0;r<8;r++)for(let q=0;q<8;q++)if(b[r][q]===k)return[r,q];return null}
function attack(b,r,c,by){let p=by==="w"?"P":"p",rr=by==="w"?r+1:r-1;for(let d of[-1,1])if(inside(rr,c+d)&&b[rr][c+d]===p)return true;p=by==="w"?"N":"n";for(let x of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])if(inside(r+x[0],c+x[1])&&b[r+x[0]][c+x[1]]===p)return true;p=by==="w"?"K":"k";for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&inside(r+dr,c+dc)&&b[r+dr][c+dc]===p)return true;for(let [dr,dc] of[[1,0],[-1,0],[0,1],[0,-1]]){let a=r+dr,d=c+dc;while(inside(a,d)){let z=b[a][d];if(z){if(color(z)===by&&"rq".includes(z.toLowerCase()))return true;break}a+=dr;d+=dc}}for(let[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){let a=r+dr,d=c+dc;while(inside(a,d)){let z=b[a][d];if(z){if(color(z)===by&&"bq".includes(z.toLowerCase()))return true;break}a+=dr;d+=dc}}return false}
function check(b,c){let k=king(b,c);return !k||attack(b,k[0],k[1],enemy(c))}
function pseudo(b,r,c,castle=true){let p=b[r][c],co=color(p),t=p?.toLowerCase(),o=[];if(!p)return o;const add=(a,d,e={})=>{if(!inside(a,d))return;let x=b[a][d];if(!x||color(x)!==co)o.push({from:[r,c],to:[a,d],piece:p,capture:!!x,...e})};if(t==="p"){let d=co==="w"?-1:1,st=co==="w"?6:1;if(inside(r+d,c)&&!b[r+d][c]){add(r+d,c);if(r===st&&!b[r+2*d][c])add(r+2*d,c,{double:true})}for(let dc of[-1,1]){let a=r+d,d2=c+dc;if(!inside(a,d2))continue;if(b[a][d2]&&color(b[a][d2])!==co)add(a,d2);if(sq(a,d2)===S.ep)add(a,d2,{enPassant:true,capture:true})}}else if(t==="n"){for(let x of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+x[0],c+x[1])}else if(t==="k"){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc);if(castle&&!check(b,co)){if(co==="w"&&r===7&&c===4){if(S.castling.includes("K")&&!b[7][5]&&!b[7][6]&&!attack(b,7,5,"b")&&!attack(b,7,6,"b"))add(7,6,{castle:"K"});if(S.castling.includes("Q")&&!b[7][1]&&!b[7][2]&&!b[7][3]&&!attack(b,7,3,"b")&&!attack(b,7,2,"b"))add(7,2,{castle:"Q"})}if(co==="b"&&r===0&&c===4){if(S.castling.includes("k")&&!b[0][5]&&!b[0][6]&&!attack(b,0,5,"w")&&!attack(b,0,6,"w"))add(0,6,{castle:"k"});if(S.castling.includes("q")&&!b[0][1]&&!b[0][2]&&!b[0][3]&&!attack(b,0,3,"w")&&!attack(b,0,2,"w"))add(0,2,{castle:"q"})}}}else{let ds=t==="b"?[[1,1],[1,-1],[-1,1],[-1,-1]]:t==="r"?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];for(let[dr,dc]of ds){let a=r+dr,d=c+dc;while(inside(a,d)){if(!b[a][d])add(a,d);else{if(color(b[a][d])!==co)add(a,d);break}a+=dr;d+=dc}}}return o}
function apply(b,m){let x=clone(b),[r,c]=m.from,[a,d]=m.to;x[a][d]=x[r][c];x[r][c]=null;if(m.enPassant)x[r][d]=null;if(m.castle==="K")x[7][5]=x[7][7],x[7][7]=null;if(m.castle==="Q")x[7][3]=x[7][0],x[7][0]=null;if(m.castle==="k")x[0][5]=x[0][7],x[0][7]=null;if(m.castle==="q")x[0][3]=x[0][0],x[0][0]=null;return x}
function legal(r,c){return pseudo(S.board,r,c).filter(m=>!check(apply(S.board,m),color(m.piece)))}
function all(co=S.turn){let o=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(color(S.board[r][c])===co)o.push(...legal(r,c));return o}
function cast(p,f,t){let x=S.castling;if(p==="K")x=x.replace(/[KQ]/g,"");if(p==="k")x=x.replace(/[kq]/g,"");if((f[0]===7&&f[1]===0)||(t[0]===7&&t[1]===0))x=x.replace("Q","");if((f[0]===7&&f[1]===7)||(t[0]===7&&t[1]===7))x=x.replace("K","");if((f[0]===0&&f[1]===0)||(t[0]===0&&t[1]===0))x=x.replace("q","");if((f[0]===0&&f[1]===7)||(t[0]===0&&t[1]===7))x=x.replace("k","");S.castling=x||"-"}
function san(m){if(m.castle)return m.castle.toUpperCase()==="K"?"O-O":"O-O-O";let t=m.piece.toUpperCase()==="P"?"":m.piece.toUpperCase(),s=t;if(!t&&(m.capture||m.enPassant))s+=F[m.from[1]];if(m.capture||m.enPassant)s+="x";return s+sq(...m.to)}
function play(m,promo="q",source="human"){let before=snap(),s= san(m),[r,c]=m.from,[a,d]=m.to,p=m.piece;S.h.push({before,m,s,promo});S.future=[];S.board=apply(S.board,m);cast(p,m.from,m.to);S.ep=m.double?sq((r+a)/2,c):"-";S.half=(p.toLowerCase()==="p"||m.capture)?0:S.half+1;if(S.turn==="b")S.full++;S.turn=enemy(S.turn);if(p.toLowerCase()==="p"&&(a===0||a===7))S.board[a][d]=color(p)==="w"?promo.toUpperCase():promo;if(m.capture||m.enPassant)fx("capture"); if(check(S.board,S.turn))fx("check"); render();if(source!=="ai"&&S.mode==="ai"&&S.turn!==S.human&&!gameOver())setTimeout(aiMove,180);if(S.mode==="exercise"&&source!=="ai")checkExercise(m)}
function choose(m){let p=prompt("Umwandlung: Dame, Turm, Läufer oder Springer","D");p=(p||"D").toUpperCase();let x={D:"q",T:"r",L:"b",S:"n"}[p]||"q";play(m,x)}
function click(r,c){let p=S.board[r][c];if(S.sel){let m=legal(...S.sel).find(x=>x.to[0]===r&&x.to[1]===c);if(m){if(m.piece.toLowerCase()==="p"&&(r===0||r===7))choose(m);else play(m);return}if(p&&color(p)===S.turn)S.sel=[r,c];else S.sel=null}else if(p&&color(p)===S.turn)S.sel=[r,c];renderBoard()}

let pieceUid=0;
function pieceSVG(p){
  const uid=++pieceUid, white=color(p)==="w", gid="mat"+uid, hi="hi"+uid;
  const body=white
    ? {a:"#ffffff",b:"#f4eafa",c:"#c9b8d8",d:"#8d789e",stroke:"#ffffffcc",glow:"#ffffff"}
    : {a:"#4a3157",b:"#24152f",c:"#0a0710",d:"#09050d",stroke:"#b36cff88",glow:"#ff2fd0"};
  const common=`fill="url(#${gid})" stroke="${body.stroke}" stroke-width="1.05" stroke-linejoin="round"`;
  let shape="";
  switch(p.toLowerCase()){
    case "p":
      shape=`<g ${common}>
        <ellipse cx="50" cy="103" rx="31" ry="8"/><path d="M25 99 Q31 89 38 84 L42 67 Q36 60 36 51 Q36 39 50 32 Q64 39 64 51 Q64 60 58 67 L62 84 Q69 89 75 99Z"/>
        <ellipse cx="50" cy="34" rx="13" ry="13"/><ellipse cx="50" cy="102" rx="27" ry="4" fill="#fff4"/>
      </g>`; break;
    case "r":
      shape=`<g ${common}>
        <path d="M21 100 Q27 88 34 82 L37 57 L30 48 L30 27 L38 27 L38 17 L47 17 L47 27 L53 27 L53 17 L62 17 L62 27 L70 27 L70 48 L63 57 L66 82 Q73 88 79 100Z"/>
        <path d="M18 101 Q50 91 82 101 L86 112 Q50 121 14 112Z"/>
        <path d="M33 48 H67 M36 58 H64" fill="none" stroke="#fff5" stroke-width="2"/>
      </g>`; break;
    case "n":
      shape=`<g ${common}>
        <path d="M24 103 Q31 91 39 83 Q43 76 39 68 Q29 60 29 47 Q29 29 44 18 L58 9 L74 16 L67 28 Q79 40 75 54 Q72 65 62 74 L65 84 Q74 90 81 102Z"/>
        <path d="M47 25 Q57 21 66 29 Q56 28 48 34 Q42 42 43 51 Q48 45 55 45 Q62 45 67 51" fill="none" stroke="#fff7" stroke-width="2"/>
        <circle cx="58" cy="29" r="3.2" fill="${white?"#6d6178":"#40eaff"}" stroke="none"/>
        <path d="M18 103 Q50 92 82 103 L86 112 Q50 121 14 112Z"/>
      </g>`; break;
    case "b":
      shape=`<g ${common}>
        <path d="M50 10 L61 25 L56 39 Q66 49 66 62 Q66 75 57 84 L71 98 Q50 105 29 98 L43 84 Q34 75 34 62 Q34 49 44 39 L39 25Z"/>
        <path d="M50 15 L43 37 L57 37Z" fill="${white?"#b9a8c7":"#7d3f9a"}" stroke="none"/>
        <path d="M49 19 L54 26 L47 35" fill="none" stroke="#fff8" stroke-width="2"/>
        <path d="M19 100 Q50 90 81 100 L86 112 Q50 121 14 112Z"/>
      </g>`; break;
    case "q":
      shape=`<g ${common}>
        <circle cx="25" cy="19" r="7"/><circle cx="50" cy="11" r="8"/><circle cx="75" cy="19" r="7"/>
        <path d="M22 29 L32 62 Q50 73 68 62 L78 29 L68 40 L58 27 L50 45 L42 27 L32 40Z"/>
        <path d="M39 64 Q50 70 61 64 L65 87 Q71 92 77 99 Q50 106 23 99 Q29 92 35 87Z"/>
        <path d="M18 100 Q50 90 82 100 L86 112 Q50 121 14 112Z"/>
        <path d="M34 76 Q50 83 66 76" fill="none" stroke="#fff6" stroke-width="2"/>
      </g>`; break;
    case "k":
      shape=`<g ${common}>
        <path d="M42 9 H58 V22 H69 V32 H58 V41 Q67 51 67 64 Q67 76 57 85 L72 99 Q50 106 28 99 L43 85 Q33 76 33 64 Q33 51 42 41 V32 H31 V22 H42Z"/>
        <path d="M50 10 V31 M43 22 H57" stroke="#fff9" stroke-width="3" fill="none"/>
        <path d="M18 101 Q50 91 82 101 L86 112 Q50 121 14 112Z"/>
      </g>`; break;
  }
  return `<svg viewBox="0 0 100 125" class="piece-svg" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0" stop-color="${body.a}"/><stop offset=".25" stop-color="${body.b}"/>
        <stop offset=".62" stop-color="${body.c}"/><stop offset=".82" stop-color="${body.d}"/>
        <stop offset="1" stop-color="${body.a}"/>
      </linearGradient>
      <linearGradient id="${hi}" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="transparent"/><stop offset=".48" stop-color="${white?"#fff9":"#ff3fd055"}"/><stop offset=".55" stop-color="transparent"/>
      </linearGradient>
      <filter id="shadow${uid}" x="-35%" y="-35%" width="170%" height="190%">
        <feDropShadow dx="0" dy="7" stdDeviation="4.5" flood-color="#000" flood-opacity=".9"/>
        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="${body.glow}" flood-opacity=".22"/>
      </filter>
    </defs>
    <g filter="url(#shadow${uid})">${shape}</g>
    <path d="M23 102 Q50 94 77 102" fill="none" stroke="${white?"#fff9":"#ff45db66"}" stroke-width="2"/>
    <path d="M28 23 Q50 9 72 23 L68 31 Q50 21 32 31Z" fill="url(#${hi})" opacity=".42"/>
  </svg>`;
}
function renderBoard(){let el=$("#board");el.innerHTML="";let rs=[0,1,2,3,4,5,6,7],cs=[0,1,2,3,4,5,6,7];if(S.flip)rs.reverse(),cs.reverse();let ms=S.sel?legal(...S.sel):[],last=S.h.at(-1)?.m;for(let r of rs)for(let c of cs){let b=document.createElement("button");b.className="sq "+((r+c)%2?"dark":"light");b.dataset.square=sq(r,c);b.setAttribute("aria-label",sq(r,c));if(S.sel?.[0]===r&&S.sel?.[1]===c)b.classList.add("sel");if(last&&((last.from[0]===r&&last.from[1]===c)||(last.to[0]===r&&last.to[1]===c)))b.classList.add("last");let p=S.board[r][c];if(p){
  const s=document.createElement("span");
  s.className="pc piece3d "+(color(p)==="w"?"white":"black");
  s.setAttribute("aria-label", p);
  s.innerHTML=pieceSVG(p);
  b.append(s);
}let m=ms.find(x=>x.to[0]===r&&x.to[1]===c);if(S.show&&m){let d=document.createElement("i");d.className=m.capture?"cap":"dot";b.append(d)}b.onclick=()=>click(r,c);el.append(b)}}
function renderHistory(){$("#history").innerHTML=S.h.map((x,i)=>`<li>${i%2===0?Math.floor(i/2)+1+". ":""}${x.s}</li>`).join("");$("#count").textContent=S.h.length;const eh=$("#empty-history");if(eh)eh.style.display=S.h.length?"none":"block"}
function evaluate(){let score=0;for(let row of S.board)for(let p of row)if(p)score+=(color(p)==="w"?1:-1)*(V[p.toLowerCase()]||0);let lm=all(),ch=check(S.board,S.turn);$("#eval").textContent=(score>=0?"+":"")+score.toFixed(1);$("#evalText").textContent=score>1?"Weiß im Vorteil":score<-1?"Schwarz im Vorteil":"Ausgeglichen";$("#meter").style.width=Math.max(8,Math.min(92,50+score*4))+"%";$("#material").textContent=(score>=0?"+":"")+score;$("#legal").textContent=lm.length;$("#phase").textContent=S.h.length<12?"Opening":S.h.length<40?"Middlegame":"Endgame";$("#status").textContent=!lm.length?(ch?"Checkmate":"Draw"):(ch?"Check":"Ready");if(!lm.length&&ch)fx("mate")}
function coach(){let lm=all(),ch=check(S.board,S.turn);$("#coachTitle").textContent=ch?"Du stehst im Schach.":S.sel?"Kandidaten prüfen.":"Position bereit.";$("#coach").textContent=ch?"Prüfe Königszüge, Schlagen des Angreifers und Blockieren.":`Du bist am Zug. ${lm.length} legale Züge. Prüfe zuerst Schachs, Schlagzüge und Drohungen.`}
function render(){renderBoard();renderHistory();evaluate();coach();$("#stage").classList.toggle("mode2d",!S.three);$("#stage").classList.toggle("mode3d",S.three&&!S.four);$("#stage").classList.toggle("mode4d",S.four);$("#stage").style.setProperty("--rot",S.rot+"deg")}
function undo(){let x=S.h.pop();if(!x)return toast("Nichts rückgängig zu machen");S.future.push(x);restore(x.before);render()}
function redo(){let x=S.future.pop();if(!x)return toast("Nichts wiederherzustellen");play(x.m,x.promo)}
function reset(){S.exercise=null;Object.assign(S,fenObj(START),{h:[],future:[],sel:null,aiThinking:false});render();updateAIStatus();if(S.mode==="ai"&&S.human!==S.turn)setTimeout(aiMove,220);toast("Neues Spiel") }
function gameOver(){let lm=all();return !lm.length}
function evaluatePosition(){let score=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){let p=S.board[r][c];if(!p)continue;let v=V[p.toLowerCase()]||0;let center=(3.5-Math.abs(3.5-r))+(3.5-Math.abs(3.5-c));let bonus=p.toLowerCase()==="p"?center*.05:center*.02;score+=(color(p)==="w"?1:-1)*(v+bonus)}return score}
function virtualApply(m){let old={board:S.board,turn:S.turn,castling:S.castling,ep:S.ep,half:S.half,full:S.full};let [r,c]=m.from,[a,d]=m.to,p=m.piece;S.board=apply(S.board,m);cast(p,m.from,m.to);S.ep=m.double?sq((r+a)/2,c):"-";S.half=(p.toLowerCase()==="p"||m.capture)?0:S.half+1;if(S.turn==="b")S.full++;S.turn=enemy(S.turn);if(p.toLowerCase()==="p"&&(a===0||a===7))S.board[a][d]=color(p)==="w"?"Q":"q";return old}
function virtualUndo(o){S.board=o.board;S.turn=o.turn;S.castling=o.castling;S.ep=o.ep;S.half=o.half;S.full=o.full}
function minimax(depth,alpha,beta){if(depth<=0)return evaluatePosition();let moves=all(S.turn);if(!moves.length)return check(S.board,S.turn)?(S.turn==="w"?-999:999):0;moves.sort((a,b)=>(b.capture?1:0)-(a.capture?1:0));let maximizing=S.turn==="w",best=maximizing?-Infinity:Infinity;for(let m of moves){let old=virtualApply(m);let v=minimax(depth-1,alpha,beta);virtualUndo(old);if(maximizing){best=Math.max(best,v);alpha=Math.max(alpha,v)}else{best=Math.min(best,v);beta=Math.min(beta,v)}if(beta<=alpha)break}return best}
function aiMove(){if(S.mode!=="ai"||S.aiThinking||S.turn===S.human||gameOver())return;S.aiThinking=true;updateAIStatus("🤖 KI berechnet …");setTimeout(()=>{let moves=all(S.turn);if(!moves.length){S.aiThinking=false;render();return}moves.sort((a,b)=>(b.capture?1:0)-(a.capture?1:0));let best=null,bestScore=S.turn==="w"?-Infinity:Infinity;let depth=Math.max(1,Math.min(3,+S.depth||2));for(let m of moves){let old=virtualApply(m);let v=minimax(depth-1,-Infinity,Infinity);virtualUndo(old);if((S.turn==="w"&&v>bestScore)||(S.turn==="b"&&v<bestScore)||best===null){best=m;bestScore=v}}S.aiThinking=false;if(best)play(best,"q","ai");updateAIStatus()},30)}
function updateAIStatus(custom){let e=$("#aiStatus");if(!e)return;if(custom){e.textContent=custom;e.classList.add("ai-thinking");return}e.classList.remove("ai-thinking");if(S.mode==="free")e.textContent="👤 2-Spieler-Modus · Beide Seiten sind manuell spielbar";else e.textContent=`🤖 KI bereit · Du spielst ${S.human==="w"?"Weiß":"Schwarz"}` }
function checkExercise(m){if(!S.exercise)return;let u=sq(...m.from)+sq(...m.to);let expected=S.exercise.line[S.exercise.step];if(u===expected){S.exercise.step++;if(S.exercise.step>=S.exercise.line.length){toast("Übung geschafft ✓");S.exercise=null;updateAIStatus("🎯 Übung geschafft")}else{toast(`Richtig ✓ · Schritt ${S.exercise.step+1}`);if(S.exercise.reply&&S.exercise.reply[S.exercise.step])setTimeout(()=>{let target=S.exercise.reply[S.exercise.step];let mm=all(S.turn).find(x=>sq(...x.from)+sq(...x.to)===target);if(mm)play(mm,"q","ai")},250)}}else{toast("Noch nicht · Prüfe die Aufgabe erneut")}}
const EXERCISES=[{id:"sicilian",tag:"ERÖFFNUNG",title:"Sizilianische Verteidigung",desc:"Lerne den klassischen Einstieg 1.e4 c5 2.Nf3 d6. Ziel: Zentrum angreifen, ohne symmetrisch zu spielen.",fen:START,line:["e2e4","g1f3"],reply:{1:"c7c5"},hint:"Spiele 1.e4. Danach zeigt die KI die schwarze Antwort 1…c5. Anschließend ist Nf3 gefragt."},{id:"fork",tag:"TAKTIK",title:"Springergabel",desc:"Finde eine Springer-Gabel, die zwei wertvolle Figuren gleichzeitig angreift.",fen:"r1bqkbnr/pppp1ppp/2n5/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 2 3",line:["f3e5"],hint:"Suche einen Springerzug mit zwei gleichzeitigen Angriffen."},{id:"castle",tag:"KÖNIGSSICHERHEIT",title:"Rochiere richtig",desc:"Entwickle deine Figuren und bringe den König mit O-O in Sicherheit.",fen:"rnbqk2r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",line:["f1e2"],hint:"Entwickle den Läufer, damit die kurze Rochade vorbereitet wird."}];
function renderExercises(){let g=$("#exerciseGrid");if(!g)return;g.innerHTML=EXERCISES.map(x=>`<article class="exercise" data-ex="${x.id}"><span class="tag">${x.tag}</span><h3>${x.title}</h3><p>${x.desc}</p><span class="start">Übung starten →</span></article>`).join("");$$('[data-ex]').forEach(e=>e.onclick=()=>startExercise(e.dataset.ex))}
function startExercise(id){let x=EXERCISES.find(e=>e.id===id);if(!x)return;S.mode="exercise";S.exercise={...x,step:0};Object.assign(S,fenObj(x.fen),{h:[],future:[],sel:null});S.human="w";view("play");render();updateAIStatus(`🎯 ${x.title} · ${x.hint}`);toast(`Übung: ${x.title}`)}
function save(){S.games.unshift({id:Date.now(),date:new Date().toLocaleString("de-DE"),fen:FEN(),moves:S.h.map(x=>x.s)});S.games=S.games.slice(0,30);localStorage.ljvGames=JSON.stringify(S.games);saved();toast("Spiel gespeichert")}
function pgn(){return S.h.map((x,i)=>(i%2===0?Math.floor(i/2)+1+". ":"")+x.s).join(" ")}
function exportPGN(){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([pgn()],{type:"text/plain"}));a.download="chess-strategic.pgn";a.click()}
function toast(x){let t=$("#toast");t.textContent=x;t.classList.add("show");clearTimeout(t.t);t.t=setTimeout(()=>t.classList.remove("show"),1700)}
function fx(x){let e=$("#"+x);e.classList.remove(x+"-on");void e.offsetWidth;e.classList.add(x+"-on");setTimeout(()=>e.classList.remove(x+"-on"),1000)}
function strategies(){let q=$("#search").value.toLowerCase(),c=$("#category").value,a=(window.STRATEGIES||[]).filter(x=>(c==="all"||x.category===c)&&`${x.title} ${x.question}`.toLowerCase().includes(q));$("#scount").textContent=a.length;$("#grid").innerHTML=a.map(x=>`<article class="strategy" data-id="${x.id}"><button class="fav" data-f="${x.id}">${S.fav.includes(x.id)?"★":"☆"}</button><small>${x.category.toUpperCase()}</small><h3>${x.title}</h3><p>${x.question}</p></article>`).join("");$$(".strategy").forEach(e=>e.onclick=q=>{if(q.target.dataset.f)return;open(+e.dataset.id)});$$("[data-f]").forEach(e=>e.onclick=q=>{q.stopPropagation();fav(+e.dataset.f)})}
function open(id){let x=(window.STRATEGIES||[]).find(x=>x.id===id);$("#mcat").textContent=x.category.toUpperCase();$("#mtitle").textContent=x.title;$("#mq").textContent=x.question;$("#ma").textContent=x.answer;$("#me").textContent=x.explanation;$("#mfav").dataset.id=id;$("#mfav").textContent=S.fav.includes(id)?"★ Favorit":"☆ Favorit";$("#modal").classList.remove("hidden")}
function fav(id){S.fav=S.fav.includes(id)?S.fav.filter(x=>x!==id):[...S.fav,id];localStorage.ljvFav=JSON.stringify(S.fav);strategies();saved()}
function saved(){$("#games").innerHTML=S.games.length?S.games.map(x=>`<div class="item">${x.date} · ${x.moves.length} Züge <button data-load="${x.id}">Laden</button></div>`).join(""):"<p>Noch keine Spiele.</p>";$$("[data-load]").forEach(b=>b.onclick=()=>{let x=S.games.find(x=>x.id==b.dataset.load);Object.assign(S,fenObj(x.fen),{h:[],future:[],sel:null,aiThinking:false,mode:"free"});view("play");render()});let f=(window.STRATEGIES||[]).filter(x=>S.fav.includes(x.id));$("#favs").innerHTML=f.length?f.map(x=>`<div class="item">${x.title}<button data-open="${x.id}">Öffnen</button></div>`).join(""):"<p>Noch keine Favoriten.</p>";$$("[data-open]").forEach(b=>b.onclick=()=>open(+b.dataset.open))}
function view(v){$$(".view").forEach(x=>x.classList.toggle("active",x.id===v));$$("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===v));if(v==="training")renderExercises();if(v==="learn")strategies();if(v==="saved")saved()}
function addHoloDots(){
  const stage=$("#stage");
  if(!stage || stage.querySelector(".holo-dot")) return;
  for(let i=0;i<4;i++){const d=document.createElement("i");d.className="holo-dot";stage.appendChild(d)}
}
function init(){Object.assign(S,fenObj(START));$$("[data-view]").forEach(b=>b.onclick=()=>view(b.dataset.view));$("#brand").onclick=()=>view("play");$("#new").onclick=reset;$("#undo").onclick=undo;$("#redo").onclick=redo;$("#flip").onclick=()=>{S.flip=!S.flip;renderBoard()};$("#d2").onclick=()=>{S.three=false;S.four=false;$("#d2").classList.add("active");$("#d3").classList.remove("active");$("#d4").classList.remove("active");render()};$("#d3").onclick=()=>{S.three=true;S.four=false;$("#d3").classList.add("active");$("#d2").classList.remove("active");$("#d4").classList.remove("active");render()};$("#d4").onclick=()=>{S.three=true;S.four=true;$("#d4").classList.add("active");$("#d3").classList.remove("active");$("#d2").classList.remove("active");render()};$("#rot").oninput=e=>{S.rot=e.target.value;render()};$("#moves").onchange=e=>{S.show=e.target.checked;$("#smoves").checked=S.show;renderBoard()};$("#sound").onchange=e=>S.sound=e.target.checked;$("#save").onclick=save;$("#pgn").onclick=exportPGN;$("#fen").onclick=()=>{const text=FEN();if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>toast("FEN kopiert")).catch(()=>{const a=document.createElement("textarea");a.value=text;document.body.append(a);a.select();document.execCommand("copy");a.remove();toast("FEN kopiert")})}else{const a=document.createElement("textarea");a.value=text;document.body.append(a);a.select();document.execCommand("copy");a.remove();toast("FEN kopiert")}};$("#refresh").onclick=coach;$("#search").oninput=strategies;$("#category").onchange=strategies;$$(".filter").forEach(b=>b.onclick=()=>{ $$(".filter").forEach(x=>x.classList.remove("active")); b.classList.add("active"); $("#category").value=b.dataset.filter; strategies(); });$("#mfav").onclick=()=>fav(+$("#mfav").dataset.id);$("#settings").onclick=()=>$("#settingsModal").classList.remove("hidden");$("#msettings").onclick=()=>$("#settingsModal").classList.remove("hidden");$$('.close').forEach(x=>x.onclick=()=>x.closest('.modal').classList.add('hidden'));$("#ssound").onchange=e=>$("#sound").checked=e.target.checked;$("#smoves").onchange=e=>{$("#moves").checked=e.target.checked;S.show=e.target.checked;renderBoard()};$("#anim").onchange=e=>document.body.classList.toggle("no-motion",!e.target.checked);$("#clear").onclick=()=>{localStorage.removeItem("ljvFav");localStorage.removeItem("ljvGames");S.fav=[];S.games=[];saved();strategies();toast("Lokale Daten gelöscht")};$("#modeAI").onclick=()=>{S.mode="ai";$("#modeAI").classList.add("active");$("#modeFree").classList.remove("active");reset()};$("#modeFree").onclick=()=>{S.mode="free";$("#modeFree").classList.add("active");$("#modeAI").classList.remove("active");S.aiThinking=false;updateAIStatus();toast("2-Spieler-Modus")};$("#humanWhite").onclick=()=>{S.human="w";$("#humanWhite").classList.add("active");$("#humanBlack").classList.remove("active");reset()};$("#humanBlack").onclick=()=>{S.human="b";$("#humanBlack").classList.add("active");$("#humanWhite").classList.remove("active");reset()};$("#aiDepth").onchange=e=>S.depth=+e.target.value;S.depth=2;$("#d3").classList.add("active");$("#d2").classList.remove("active");$("#d4").classList.remove("active");render();try{renderExercises();$$("[data-ex]").forEach(e=>e.onclick=()=>startExercise(e.dataset.ex));}catch(e){console.error("Training init",e)};$$("[data-view]").forEach(b=>b.onclick=()=>view(b.dataset.view));try{strategies();saved();}catch(e){console.error("Library init",e)};updateAIStatus();if(S.mode==="ai"&&S.human!==S.turn)setTimeout(aiMove,250);if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{})}init();
})()