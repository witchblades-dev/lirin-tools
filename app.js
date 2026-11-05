/* LIRIN — the ONE shared script (sidebar + helpers for the calculators).
   Every page has <nav id="sidebar"></nav> followed by <script src="/app.js"></script>, so the sidebar is drawn before the page paints.
   To add a page or change the order, edit only the NAV list below. */
/* Pictures: every page asks lirinImg('Item Name') and gets /images/Item_Name.webp
   (same naming as before: spaces become underscores, capitals are kept).
   Files whose name keeps its spaces are listed in KEEP_SPACES. */
const KEEP_SPACES=['Glimmer Dust'];
/* Pictures are cached by the browser for 1 year, immutable (see _headers). When you REPLACE a picture under the same name,
   raise IMG_V by one: every visitor then downloads the new version. */
const IMG_V=1;
window.lirinImg=n=>'/images/'+encodeURIComponent(KEEP_SPACES.includes(n)?n:String(n).replace(/ /g,'_'))+'.webp?v='+IMG_V;

(function(){
  const NAV=[
    {href:'/',                 icon:'home',    label:'Home'},
    {href:'/upgrade-cost/',    icon:'upgrade', label:'Upgrade Cost'},
    {soon:1,                    icon:'special', label:'Special Upgrade Cost'},
    {soon:1,                    icon:'sash',    label:'Sash Absorption'},
    {href:'/metin-simulator/', icon:'metin',   label:'Metin Simulator'},
    {soon:1,                    icon:'coin',    label:'Coin Calculator'},
    {href:'/upgrade-coin-calculator/', icon:'coin', label:'Upgrade Coin Calculator'},
    {href:'/gaya-calculator/', icon:'gaya',    label:'Gaya Calculator'}
  ];
  const ICONS={
    home:'<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
    upgrade:'<path d="M12 3v18M5 10l7-7 7 7M5 15h14"/>',
    special:'<path d="m12 3 2.2 5.3L20 10l-5.8 1.7L12 17l-2.2-5.3L4 10l5.8-1.7L12 3Z"/><path d="M19 16v5M16.5 18.5h5"/>',
    sash:'<path d="M4 7c4-3 12-3 16 0l-2 10c-4 3-8 3-12 0L4 7Z"/><path d="M7 9c3 2 7 2 10 0M8 14c2 1 6 1 8 0"/>',
    metin:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.7-.8-1.8-1.2-3.2-1.2-1.6 0-2.7.8-2.7 2 0 3.2 6.1 1.2 6.1 4.5 0 1.4-1.3 2.4-3.2 2.4-1.5 0-2.8-.5-3.7-1.5M12 5.5v13"/>',
    gaya:'<path d="M6 4h12l4 6-10 11L2 10l4-6Z"/><path d="M2 10h20M9 4l3 6 3-6M12 10v11"/>'
  };
  let here=location.pathname.replace(/index\.html$/,'');
  if(!here.endsWith('/'))here+='/';
  const item=n=>{
    const svg='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+ICONS[n.icon]+'</svg>';
    if(n.soon)return'<span class="nav-item is-soon" aria-disabled="true">'+svg+n.label+'<span class="badge">Soon</span></span>';
    const on=n.href===here;
    return'<a class="nav-item'+(on?' is-active':'')+'" href="'+n.href+'"'+(on?' aria-current="page"':'')+'>'+svg+n.label+'</a>';
  };
  const el=document.getElementById('sidebar');
  if(el)el.outerHTML='<nav class="sidebar" aria-label="Main navigation"><p class="nav-label">Lirin Tools</p>'+NAV.map(item).join('')+'</nav>';
})();

/* skip link on every page that has none, and a prefetch of the other pages so navigating feels instant */
document.addEventListener('DOMContentLoaded',()=>{
  const m=document.querySelector('main');
  if(m&&!document.querySelector('.skip')){
    m.id=m.id||'main';m.tabIndex=-1;
    const a=document.createElement('a');a.className='skip';a.href='#'+m.id;a.textContent='Skip to content';
    document.body.prepend(a);
  }
});
if(window.HTMLScriptElement&&HTMLScriptElement.supports&&HTMLScriptElement.supports('speculationrules')&&!(navigator.connection&&navigator.connection.saveData)){
  const s=document.createElement('script');s.type='speculationrules';
  s.textContent=JSON.stringify({prefetch:[{where:{href_matches:'/*'},eagerness:'moderate'}]});   // prefetch only (never runs the other page early)
  document.head.appendChild(s);
}

/* ===== helpers for the calculators (they are ready before the page script runs) =====
   Fix a bug here once and every calculator gets it. */

/* run f once, `ms` milliseconds after the last call */
const deb=(f,ms)=>{let t;return()=>{clearTimeout(t);t=setTimeout(f,ms)}};

/* money input: 1450, 1.45k, 2.3kk, 3.12kkk (k=thousand, kk=million, kkk=billion)
   "1,450" / "1.450" (groups of 3, no suffix, not starting with 0) = thousands separator; otherwise a comma is a decimal point.
   Returns a number, or null when the text is not a valid amount. */
const parseMoney=s=>{
  s=String(s).trim().toLowerCase().replace(/\s/g,'');
  if(/^[1-9]\d{0,2}([.,]\d{3})+$/.test(s))s=s.replace(/[.,]/g,'');
  s=s.replace(/,/g,'.');
  const m=s.match(/^(\d*\.?\d+|\d+\.)(k{0,3})$/);
  return m?+(parseFloat(m[1])*Math.pow(1000,m[2].length)).toFixed(4):null};

/* short form: 1450000 -> 1.45kk (d = decimals kept; use 6 when filling an input so nothing is lost) */
const fmt=(n,d=3)=>{
  const a=Math.abs(n);let i=a>=1e9?3:a>=1e6?2:a>=1e3?1:0,v=+(n/Math.pow(1e3,i)).toFixed(d);
  if(i<3&&Math.abs(v)>=1e3){i++;v=+(n/Math.pow(1e3,i)).toFixed(d)}      // 999999.9996 -> 1kk, not 1000k
  return v+['','k','kk','kkk'][i]};
const full=n=>Math.round(n).toLocaleString('de-DE');
const money=n=>full(n)+' ('+fmt(n)+')';

/* ===== shared by every calculator page ===== */
const $=id=>document.getElementById(id);
const ini=n=>(String(n).match(/\b[A-Z]/g)||[]).join('').slice(0,2);      // initials, shown while a picture is missing
const okNum=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;

/* pictures: /images/<name>.webp, see lirinImg() above (an empty address is used if app.js did not load).
   Every picture is loaded once and kept in memory, so redrawing a table never flashes initials or blanks.
   A picture that failed is forgotten after 5 s, so a short network problem does not hide it for the whole visit. */
const imgUrl=n=>typeof lirinImg==='function'?lirinImg(n):'';
const IM=new Map();
const warm=n=>{let r=IM.get(n);if(!r){r={el:new Image()};r.el.onerror=()=>setTimeout(()=>{if(IM.get(n)===r)IM.delete(n)},5000);r.el.src=imgUrl(n);IM.set(n,r)}return r};
const imgState=n=>{const e=warm(n).el;return e.complete?(e.naturalWidth?1:-1):0};   // 1 ready, 0 still loading, -1 missing
const miss=n=>imgState(n)<0?' no':'';                                                  // ' no' = show the initials
/* <img> markup: already visible when the picture is in memory, fades in only if it is still loading, empty if missing */
const pic=(n,c='')=>{const s=imgState(n);return s<0?'':`<img class="${c}${s>0?' ok':''}" src="${warm(n).el.src}" alt="" decoding="async" onload="this.classList.add('ok');this.parentNode.classList.remove('no')" onerror="imgErr(this)">`};
/* a picture that fails while loading: initials show, it is retried once after 5 s, a second failure drops it */
function imgErr(i){
  i.parentNode.classList.add('no');
  if(i.dataset.r){i.remove();return}
  i.dataset.r=1;const u=i.src;setTimeout(()=>{i.src=u+(u.includes('?')?'&':'?')+'r=1'},5000);
}
const slot=n=>`<span class="slot${miss(n)}"><i>${ini(n)}</i>${pic(n)}</span>`;

/* wrong price/number typed: red frame, message shown, and screen readers are told (aria-invalid + aria-describedby) */
let _er=0;
const flagBad=(inp,bad)=>{
  const box=inp.closest('.pin'),er=box&&box.querySelector('.er');if(!box)return;
  box.classList.toggle('bad',bad);
  if(er){er.hidden=!bad;if(!er.id)er.id='er'+(++_er);bad?inp.setAttribute('aria-describedby',er.id):inp.removeAttribute('aria-describedby')}
  bad?inp.setAttribute('aria-invalid','true'):inp.removeAttribute('aria-invalid');
};
/* true after the first real action: screen readers are not told the result on page load */
let USED=false;
['pointerdown','keydown','input'].forEach(t=>addEventListener(t,()=>{USED=true},{capture:true,once:true}));

/* saving the page state in the browser: save() = after 250 ms of quiet, flush() = right now (also on leaving the page).
   get() returns what to store; after() runs after each store (the Metin page puts the share link in the address bar). */
function persist(key,get,after){
  let t;
  const flush=()=>{clearTimeout(t);try{localStorage.setItem(key,JSON.stringify(get()))}catch(e){}if(after)try{after()}catch(e){}};
  const save=()=>{clearTimeout(t);t=setTimeout(flush,250)};
  addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
  return{flush,save};
}
