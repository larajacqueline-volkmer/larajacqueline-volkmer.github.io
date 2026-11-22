(()=>{let deferred=null;const install=document.querySelector("#installApp");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;if(install)install.classList.remove("hidden")});
install?.addEventListener("click",async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;install.classList.add("hidden")});
window.addEventListener("appinstalled",()=>{install?.classList.add("hidden")});
const gs=document.querySelector("#globalSearch");
gs?.addEventListener("keydown",e=>{if(e.key==="Enter"){const q=gs.value.trim();document.querySelector('[data-view="learn"]')?.click();const s=document.querySelector("#search");if(s){s.value=q;s.dispatchEvent(new Event("input"))}}});
document.querySelectorAll(".mini-ex").forEach(x=>x.addEventListener("click",()=>{if(x.dataset.ex)document.querySelector(`[data-ex="${x.dataset.ex}"]`)?.click()}));
document.querySelectorAll(".topic").forEach(x=>x.addEventListener("click",()=>{if(x.dataset.view)document.querySelector(`[data-view="${x.dataset.view}"]`)?.click();}));
})();
