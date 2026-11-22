// Integrated features app.js (compact)
(() => {'use strict';const $=s=>document.querySelector(s);const on=(e,t,f,o)=>e.addEventListener(t,f,o);const toast=m=>{const t=$('#toast');if(!t)return;t.textContent=m;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),1600);};const LS='ljv-studio-map-v1',SN='mindmap-snap-';let state={nodes:[],selected:null,zoom:1,theme:'system'};const cvs=$('#map'),ctx=cvs.getContext('2d'),wrap=$('#canvasWrap');const hist={past:[],future:[],push(s){this.past.push(JSON.stringify(s));this.future.length=0;},undo(s){if(!this.past.length)return s;const p=this.past.pop();this.future.push(JSON.stringify(s));return JSON.parse(p);},redo(s){if(!this.future.length)return s;const n=this.future.pop();this.past.push(JSON.stringify(s));return JSON.parse(n);}};function save(){localStorage.setItem(LS,JSON.stringify(state));}function load(){const r=localStorage.getItem(LS);if(r)state=JSON.parse(r);}function rr(ctx,x,y,w,h,r,f,s){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(f)ctx.fill();if(s)ctx.stroke();}function render(){ctx.setTransform(state.zoom,0,0,state.zoom,0,0);ctx.clearRect(0,0,cvs.width,cvs.height);ctx.save();ctx.strokeStyle='rgba(0,0,0,.06)';for(let x=0;x<cvs.width;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cvs.height);ctx.stroke();}for(let y=0;y<cvs.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cvs.width,y);ctx.stroke();}ctx.restore();ctx.lineWidth=2;state.nodes.forEach(n=>{(n.edges||[]).forEach(eid=>{const t=state.nodes.find(x=>x.id===eid);if(!t)return;ctx.strokeStyle='#7d6ab8';ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(t.x,t.y);ctx.stroke();});});state.nodes.forEach(n=>{ctx.fillStyle=n.color||'#9c7ccc';ctx.strokeStyle='#1c1230';rr(ctx,n.x-80,n.y-30,160,60,12,true,true);ctx.fillStyle='#fff';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.fillText(n.title||'Node',n.x,n.y+5);if(state.selected===n.id){ctx.strokeStyle='#ffcc66';ctx.lineWidth=3;rr(ctx,n.x-86,n.y-36,172,72,14,false,true);}});const zi=document.getElementById('zoomInfo');if(zi)zi.textContent=Math.round(state.zoom*100)+'%';}function toW(x,y){return{x:x/state.zoom,y:y/state.zoom}}function addNode(x=200,y=150){hist.push(state);const parent=state.nodes.find(n=>n.id===state.selected);const n={id:crypto.randomUUID(),title:'Neuer Knoten',x,y,color:$('#nodeColor').value,edges:[]};if(parent)parent.edges.push(n.id);state.nodes.push(n);state.selected=n.id;save();render();}function upd(){if(!state.selected)return;hist.push(state);const n=state.nodes.find(n=>n.id===state.selected);if(!n)return;n.title=$('#nodeTitle').value;n.color=$('#nodeColor').value;save();render();}
function position(event) {
  const box = cvs.getBoundingClientRect();
  return toW((event.clientX-box.left)*cvs.width/box.width,(event.clientY-box.top)*cvs.height/box.height);
}
let drag = null;
on(cvs,'pointerdown',event=>{
  const p=position(event);
  const node=state.nodes.slice().reverse().find(n=>Math.abs(n.x-p.x)<80 && Math.abs(n.y-p.y)<30);
  if(!node) return;
  hist.push(state);
  drag=node; state.selected=node.id;
  cvs.setPointerCapture(event.pointerId);
  $('#nodeTitle').value=node.title; $('#nodeColor').value=node.color;
  render();
});
on(cvs,'pointermove',event=>{
  if(!drag) return;
  const p=position(event);
  drag.x=Math.max(80,Math.min(cvs.width-80,p.x)); drag.y=Math.max(30,Math.min(cvs.height-30,p.y)); render();
});
on(cvs,'lostpointercapture',()=>{drag=null;save()});
on($('#newNode'),'click',()=>{
  const count=state.nodes.length;
  addNode(110+(count%3)*190,85+(Math.floor(count/3)%5)*90);
  $('#nodeTitle').value='Neuer Knoten'; $('#nodeTitle').focus(); $('#nodeTitle').select();
});
on($('#editor'),'submit',e=>{e.preventDefault();if($('#nodeTitle').value.trim())upd()});
on($('#undo'),'click',()=>{state=hist.undo(state);save();sync()});
on($('#redo'),'click',()=>{state=hist.redo(state);save();sync()});
on($('#export'),'click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='mindmap.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function sync(){let n=state.nodes.find(n=>n.id===state.selected);$('#nodeTitle').value=n?.title||'';$('#nodeColor').value=n?.color||'#7755b6';render()}
if(localStorage.getItem(LS))load();else{addNode(300,215);state.nodes[0].title='Meine Idee';save();hist.past=[]}
sync();
})();
