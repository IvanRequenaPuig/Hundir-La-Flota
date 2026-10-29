const $=s=>document.querySelector(s),LENS=[5,4,3,3,2,2];
const DIFF={easy:{n:'Fácil',p:12,e:8,d:'IA básica'},normal:{n:'Medio',p:10,e:10,d:'IA que remata'},hard:{n:'Difícil',p:8,e:10,d:'IA con probabilidades'}};
const WATER=['#0e5a8a','#0b8f9e','#0b2545','#4f8fb5'],SHIP=['#8d99ae','#5b7f4a','#d4a84b','#e07a3f'];
const DEF={diff:'normal',water:WATER[0],ship:SHIP[0],sound:true,vol:70,amb:false,vib:true,again:false,speed:700,bg:true,theme:'ocean',wave:1,rm:false,autop:true,zoom:100,coords:true,hud:true,log:true};
let S={...DEF},R={w:0,l:0},dirty=true;
try{Object.assign(S,JSON.parse(localStorage.getItem('hf_s')||'{}'));Object.assign(R,JSON.parse(localStorage.getItem('hf_r')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('hf_s',JSON.stringify(S));localStorage.setItem('hf_r',JSON.stringify(R))}catch(e){}};
const vib=p=>{if(S.vib&&navigator.vibrate)navigator.vibrate(p)};
function apply(){const r=document.documentElement.style,c=document.body.classList;r.setProperty('--water',S.water);r.setProperty('--ship',S.ship);r.setProperty('--zoom',S.zoom/100);c.toggle('nocoords',!S.coords);c.toggle('nohud',!S.hud);c.toggle('nolog',!S.log);c.toggle('rm',S.rm);dirty=true;ambient()}
/* audio */
let ac;function beep(f,d,t='sine',v=.08,at=0){if(!S.sound)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v*S.vol/70,ac.currentTime+at);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+at+d);o.connect(g);g.connect(ac.destination);o.start(ac.currentTime+at);o.stop(ac.currentTime+at+d)}catch(e){}}
const sfx={miss:()=>beep(260,.18),hit:()=>{vib(60);beep(120,.25,'sawtooth',.1);beep(70,.3,'square',.06,.05)},sunk:()=>{vib([80,40,80]);[300,220,150,90].forEach((f,i)=>beep(f,.25,'sawtooth',.1,i*.12))},win:()=>[440,554,659,880].forEach((f,i)=>beep(f,.3,'triangle',.1,i*.15)),lose:()=>[330,260,200,140].forEach((f,i)=>beep(f,.4,'sawtooth',.08,i*.2)),click:()=>beep(520,.05,'square',.04)};
/* screens */
const show=id=>document.querySelectorAll('main>section').forEach(s=>s.classList.toggle('on',s.id===id));
const modal=(id,on)=>$('#'+id).classList.toggle('on',on);
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
/* menu y selección de nivel */
const recH=()=>{$('#rec').innerHTML=`Victorias <b>${R.w}</b> · Derrotas <b>${R.l}</b>`};
function menu(){show('menu');recH()}
function levels(){show('levels');$('#diffs').innerHTML=Object.entries(DIFF).map(([k,d])=>`<div class="card diff ${k===S.diff?'sel':''}" data-k="${k}"><h3>${d.n}</h3><div class="sz">Tu flota: <b>${d.p}×${d.p}</b> · Enemigo: <b>${d.e}×${d.e}</b><br>${d.d}</div></div>`).join('')}
$('#diffs').onclick=e=>{const c=e.target.closest('.diff');if(c){S.diff=c.dataset.k;save();sfx.click();setup()}};
$('#lBack').onclick=menu;
/* board logic */
const mk=n=>({n,ships:[],grid:Array(n*n).fill(-1),shot:Array(n*n).fill(0)});
const cellsOf=(b,i,len,h)=>{const r=Math.floor(i/b.n),c=i%b.n,o=[];for(let k=0;k<len;k++){const rr=h?r:r+k,cc=h?c+k:c;if(rr>=b.n||cc>=b.n)return null;o.push(rr*b.n+cc)}return o};
const free=(b,cs)=>cs&&cs.every(x=>b.grid[x]<0);
function put(b,cs,len){const id=b.ships.length;b.ships.push({id,len,cells:cs,hits:0,sunk:false});cs.forEach(x=>b.grid[x]=id)}
function randomFill(b,from=b.ships.length){for(let k=from;k<LENS.length;k++){let cs;do{cs=cellsOf(b,Math.random()*b.n*b.n|0,LENS[k],Math.random()<.5)}while(!free(b,cs));put(b,cs,LENS[k])}}
function shoot(b,i){if(b.shot[i])return null;if(b.grid[i]<0){b.shot[i]=1;return{res:'miss'}}const s=b.ships[b.grid[i]];b.shot[i]=2;s.hits++;if(s.hits===s.len){s.sunk=true;s.cells.forEach(c=>b.shot[c]=3);return{res:'sunk',ship:s}}return{res:'hit'}}
const allSunk=b=>b.ships.every(s=>s.sunk);
const lbl=(b,i)=>String.fromCharCode(65+i%b.n)+(Math.floor(i/b.n)+1);
function draw(el,b,own,last=-1){el.style.setProperty('--n',b.n);let h='<span></span>';for(let c=0;c<b.n;c++)h+=`<span class="lb">${String.fromCharCode(65+c)}</span>`;
for(let r=0;r<b.n;r++){h+=`<span class="lb">${r+1}</span>`;for(let c=0;c<b.n;c++){const i=r*b.n+c,s=b.shot[i];let k='cell';if(own&&b.grid[i]>=0)k+=' ship';if(s===1)k+=' miss';if(s===2)k+=' hit';if(s===3)k+=own?' hit sunk':' ship sunk hit';if(i===last)k+=' new';h+=`<div class="${k}" data-i="${i}"></div>`}}el.innerHTML=h}
const fleetH=(b,cur=-1)=>LENS.map((l,k)=>{const s=b.ships[k];return`<div class="fl ${s&&s.sunk?'x':''} ${k===cur?'cur':''}" style="${!s&&cur>=0&&k!==cur?'opacity:.4':''}">${'<i></i>'.repeat(l)}</div>`}).join('');
/* colocación: arrastrar y soltar */
let P,E,cfg,pl=[],ord=[],dr=null,horiz=true;
const buildP=()=>{P=mk(cfg.p);pl.forEach((p,k)=>{if(p)put(P,p.cells,LENS[k])})};
const cellsAt=(r,c,len,h)=>{const o=[];for(let k=0;k<len;k++){const y=h?r:r+k,x=h?c+k:c;if(y<0||x<0||y>=P.n||x>=P.n)return null;o.push(y*P.n+x)}return o};
function setup(){cfg=DIFF[S.diff];pl=Array(6).fill(null);ord=[];horiz=true;dr=null;show('setup');drawSetup()}
function drawSetup(){buildP();const done=pl.filter(Boolean).length;draw($('#pb0'),P,true);
$('#sFleet').innerHTML=LENS.map((l,k)=>`<div class="fl dg" data-k="${k}" style="${pl[k]||(dr&&dr.k===k)?'opacity:.25;pointer-events:none':''}">${Array.from({length:l},(_,j)=>`<i data-g="${j}"></i>`).join('')}</div>`).join('');
$('#sGo').disabled=done<6;$('#sUndo').disabled=!ord.length;
$('#sHint').textContent=done<6?`Arrastra tus barcos al tablero ${P.n}×${P.n} · bandeja: ${horiz?'horizontal':'vertical'} (R gira)`:'Flota lista. Arrastra para recolocar o pulsa un barco para girarlo · ¡Combatir!'}
function ghostPos(e){const s=dr.w+2;dr.gh.style.left=(e.clientX-(dr.h?dr.g*s:0)-dr.w/2)+'px';dr.gh.style.top=(e.clientY-(dr.h?0:dr.g*s)-dr.w/2)+'px'}
function ghostBuild(){dr.gh.style.flexDirection=dr.h?'row':'column';dr.gh.innerHTML=Array.from({length:LENS[dr.k]},()=>`<i style="width:${dr.w}px;height:${dr.w}px"></i>`).join('');ghostPos(dr.last)}
function move(e){dr.last=e;ghostPos(e);document.querySelectorAll('#pb0 .pok,#pb0 .pbad').forEach(x=>x.classList.remove('pok','pbad'));
const el=document.elementFromPoint(e.clientX,e.clientY),c=el&&el.closest('#pb0 .cell');dr.over=!!c;dr.cs=null;if(!c)return;
const i=+c.dataset.i,n=P.n,r=i/n|0,k=i%n,cs=cellsAt(dr.h?r:r-dr.g,dr.h?k-dr.g:k,LENS[dr.k],dr.h);if(cs&&free(P,cs))dr.cs=cs;
const all=$('#pb0').querySelectorAll('.cell');(cs||[i]).forEach(x=>all[x].classList.add(dr.cs?'pok':'pbad'))}
const putAt=(k,cs,h)=>{pl[k]={cells:cs,h};ord.push(k);sfx.click()};
$('#setup').onpointerdown=e=>{if(dr||e.button>0)return;let k,g=0,h=horiz,from=null;const f=e.target.closest('.dg'),c=e.target.closest('#pb0 .cell.ship');
if(f){k=+f.dataset.k;if(pl[k])return;g=+(e.target.dataset.g||0)}
else if(c){const ks=[];pl.forEach((p,q)=>{if(p)ks.push(q)});k=ks[P.grid[+c.dataset.i]];from=pl[k];g=from.cells.indexOf(+c.dataset.i);h=from.h}else return;
e.preventDefault();$('#setup').setPointerCapture(e.pointerId);const gh=document.createElement('div');gh.className='ghost';document.body.append(gh);
dr={k,g,h,gh,from,w:$('#pb0 .cell').getBoundingClientRect().width,x0:e.clientX,y0:e.clientY,last:e,cs:null,over:false};
if(from){pl[k]=null;ord=ord.filter(x=>x!==k)}ghostBuild();drawSetup();move(e)};
$('#setup').onpointermove=e=>{if(dr)move(e)};
function drop(e,cancel){if(!dr)return;const d=dr;dr=null;d.gh.remove();try{$('#setup').releasePointerCapture(e.pointerId)}catch(x){}
const moved=Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>6,len=LENS[d.k];
if(!cancel&&!moved&&!d.from)horiz=!horiz;
else if(!cancel&&!moved){const hd=d.from.cells[0],cs=cellsAt(hd/P.n|0,hd%P.n,len,!d.from.h);if(cs&&free(P,cs))putAt(d.k,cs,!d.from.h);else{putAt(d.k,d.from.cells,d.from.h);sfx.miss()}}
else if(!cancel&&d.cs)putAt(d.k,d.cs,d.h);
else if(d.from&&(cancel||d.over)){putAt(d.k,d.from.cells,d.from.h);if(d.over&&!cancel)sfx.miss()}
drawSetup()}
$('#setup').onpointerup=e=>drop(e);$('#setup').onpointercancel=e=>drop(e,true);
$('#setup').oncontextmenu=e=>{e.preventDefault();if(dr)rot()};
function rot(){if(dr){dr.h=!dr.h;ghostBuild();move(dr.last)}else{horiz=!horiz;drawSetup()}}
$('#sRot').onclick=rot;
$('#sUndo').onclick=()=>{const k=ord.pop();if(k!==undefined){pl[k]=null;drawSetup()}};
$('#sRand').onclick=()=>{P=mk(cfg.p);randomFill(P);pl=P.ships.map(s=>({cells:s.cells,h:s.cells[1]-s.cells[0]===1}));ord=P.ships.map((_,k)=>k);sfx.click();drawSetup()};
$('#sBack').onclick=levels;$('#sGo').onclick=start;
/* game */
let turn,paused,pend,stat,timer,over,hunt;
function start(){E=mk(cfg.e);randomFill(E);turn='me';paused=false;pend=false;over=false;stat={t:0,sh:0,hi:0,ai:0};$('#log').innerHTML='';log('Flotas desplegadas. ¡Que empiece la batalla!');show('game');render();clearInterval(timer);timer=setInterval(()=>{if(!paused&&!over){stat.t++;hud()}},1000)}
function log(t){const d=document.createElement('div');d.textContent=t;$('#log').prepend(d)}
function hud(){const m=Math.floor(stat.t/60),s=stat.t%60;$('#tm').textContent=m+':'+String(s).padStart(2,'0');$('#sh').textContent=stat.sh;$('#ac').textContent=(stat.sh?Math.round(stat.hi/stat.sh*100):0)+'%'}
function render(le=-1,lp=-1){draw($('#eb'),E,false,le);draw($('#pb'),P,true,lp);$('#ef').innerHTML=fleetH(E);$('#pf').innerHTML=fleetH(P);
$('#eInfo').textContent=`${E.n}×${E.n} · ${E.ships.filter(s=>!s.sunk).length} barcos`;$('#pInfo').textContent=`${P.n}×${P.n} · ${P.ships.filter(s=>!s.sunk).length} barcos`;
const b=$('#banner');b.className='banner'+(turn==='ai'?' ai':'');b.textContent=turn==='me'?'TU TURNO · DISPARA':'EL ENEMIGO APUNTA…';$('#eb').classList.toggle('target',turn==='me'&&!over);hud()}
const say=(who,i,b,r)=>log(`${who} dispara a ${lbl(b,i)}: ${r.res==='miss'?'agua':r.res==='hit'?'¡tocado!':'¡hundido! (barco de '+r.ship.len+')'}`);
$('#eb').onclick=e=>{const c=e.target.closest('.cell');if(!c||turn!=='me'||paused||over)return;const i=+c.dataset.i,r=shoot(E,i);if(!r)return;stat.sh++;if(r.res!=='miss')stat.hi++;sfx[r.res==='miss'?'miss':r.res==='hit'?'hit':'sunk']();say('Tú',i,E,r);
if(allSunk(E)){render(i);return finish(true)}if(r.res==='miss'||!S.again){turn='ai';render(i);sched()}else render(i)};
function sched(){setTimeout(()=>{if(over)return;if(paused){pend=true;return}aiMove()},S.speed)}
function aiMove(){const i=aiPick(P),r=shoot(P,i);stat.ai++;sfx[r.res==='miss'?'miss':r.res==='hit'?'hit':'sunk']();say('Enemigo',i,P,r);if(allSunk(P)){render(-1,i);return finish(false)}
if(r.res!=='miss'&&S.again){render(-1,i);sched()}else{turn='me';render(-1,i)}}
function aiPick(b){const n=b.n,un=[];b.shot.forEach((s,i)=>{if(!s)un.push(i)});const rnd=a=>a[Math.random()*a.length|0];
if(S.diff==='easy')return rnd(un);
const hits=[];b.shot.forEach((s,i)=>{if(s===2)hits.push(i)});
if(S.diff==='normal'){if(hits.length){const c=new Set();hits.forEach(i=>{const r=Math.floor(i/n),k=i%n;[[r-1,k],[r+1,k],[r,k-1],[r,k+1]].forEach(([y,x])=>{if(y>=0&&x>=0&&y<n&&x<n&&!b.shot[y*n+x])c.add(y*n+x)})});if(c.size)return rnd([...c])}return rnd(un)}
const w=Array(n*n).fill(0);b.ships.filter(s=>!s.sunk).forEach(s=>{for(const h of[true,false])for(let i=0;i<n*n;i++){const cs=cellsOf(b,i,s.len,h);if(!cs||cs.some(x=>b.shot[x]===1||b.shot[x]===3))continue;const wt=1+cs.filter(x=>b.shot[x]===2).length*25;cs.forEach(x=>{if(!b.shot[x])w[x]+=wt})}});
let m=-1,best=[];un.forEach(i=>{if(w[i]>m){m=w[i];best=[i]}else if(w[i]===m)best.push(i)});return rnd(best)}
function finish(win){over=true;clearInterval(timer);if(win)R.w++;else R.l++;save();win?sfx.win():sfx.lose();
if(!win)E.ships.forEach(s=>s.cells.forEach(c=>{if(!E.shot[c])E.shot[c]=0}));
setTimeout(()=>{$('#eIcon').textContent=win?'🏆':'💥';$('#eTit').textContent=win?'¡VICTORIA!':'DERROTA';const m=Math.floor(stat.t/60),s=String(stat.t%60).padStart(2,'0');
$('#eTxt').innerHTML=`${win?'Has hundido toda la flota enemiga.':'La flota enemiga ha hundido tus barcos.'}<br>Tiempo <b>${m}:${s}</b> · Disparos <b>${stat.sh}</b> · Precisión <b>${stat.sh?Math.round(stat.hi/stat.sh*100):0}%</b>`;modal('mEnd',true)},900)}
/* pause */
function pause(on){if(over||!$('#game').classList.contains('on'))return;paused=on;modal('mPause',on);if(!on&&pend&&turn==='ai'){pend=false;sched()}}
$('#bPause').onclick=()=>pause(true);$('#pCont').onclick=()=>pause(false);
$('#pOpt').onclick=()=>{modal('mOpt',true);optUI()};
$('#pRest').onclick=()=>{paused=false;modal('mPause',false);clearInterval(timer);over=true;setup()};
$('#pMenu').onclick=()=>{paused=false;modal('mPause',false);clearInterval(timer);over=true;menu()};
$('#eAgain').onclick=()=>{modal('mEnd',false);setup()};$('#eMenu').onclick=()=>{modal('mEnd',false);menu()};
addEventListener('keydown',e=>{if(e.key==='f'||e.key==='F')fs();if(e.key==='Escape'){if($('#mOpt').classList.contains('on')){modal('mOpt',false)}else pause(!paused)}if((e.key==='r'||e.key==='R')&&$('#setup').classList.contains('on'))rot()});
/* sonido de oleaje y pantalla completa */
let am;const ctx=()=>ac=ac||new(window.AudioContext||window.webkitAudioContext)();
function ambient(){try{if(S.amb){if(!am){const c=ctx(),b=c.createBuffer(1,c.sampleRate*3,c.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}
const s=c.createBufferSource();s.buffer=b;s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=700;const g=c.createGain(),o=c.createOscillator(),og=c.createGain();o.frequency.value=.11;og.gain.value=.05;o.connect(og);og.connect(g.gain);s.connect(f);f.connect(g);g.connect(c.destination);s.start();o.start();am={s,o,g}}
am.g.gain.value=S.vol/100*.1;if(ac.state==='suspended')ac.resume()}else if(am){am.s.stop();am.o.stop();am=null}}catch(e){}}
addEventListener('pointerdown',()=>{if(am&&ac.state==='suspended')ac.resume()});
const fsOn=()=>!!document.fullscreenElement;
async function fs(){try{if(fsOn())await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch(e){}}
document.addEventListener('fullscreenchange',()=>{if($('#mOpt').classList.contains('on'))optUI();$('#fsb').textContent=fsOn()?'✕':'⛶'});
$('#fsb').onclick=fs;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.autop)pause(true)});
/* fondo: mar animado */
const cv=$('#sea'),cx=cv.getContext('2d'),STARS=Array.from({length:80},()=>[Math.random(),Math.random()*.45,Math.random()*1.3+.4,Math.random()*6]);
const TH={ocean:{s:['#031427','#06335c','#0a5a8c'],w:['#0b3f6b','#0a5486','#0f6e9c','#1a8bb5','#2aa6c8'],g:'120,210,255'},dusk:{s:['#150b2b','#4b1d52','#c4553f'],w:['#2a1245','#4a1c55','#7a2a5a','#a63d57','#d4603f'],g:'255,190,120'},storm:{s:['#0a0f16','#1b2733','#34485a'],w:['#101a24','#18303f','#21495a','#2d6173','#3d7a8c'],g:'170,190,210'},night:{s:['#02060f','#07163a','#12356b'],w:['#07163a','#0b2a5a','#123f7c','#1a5a9a','#2a7ab8'],g:'190,220,255'}};
let W,H,T=0,lt=0;
function size(){const d=Math.min(devicePixelRatio||1,1.5);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0);dirty=true}
function drawSea(){const t=TH[S.theme]||TH.ocean,g=cx.createLinearGradient(0,0,0,H);t.s.forEach((c,i)=>g.addColorStop(i/2,c));cx.fillStyle=g;cx.fillRect(0,0,W,H);
const gx=W*.78,gy=H*.28,rg=cx.createRadialGradient(gx,gy,0,gx,gy,H*.5);rg.addColorStop(0,`rgba(${t.g},.38)`);rg.addColorStop(1,`rgba(${t.g},0)`);cx.fillStyle=rg;cx.fillRect(0,0,W,H);
if(S.theme==='night'||S.theme==='ocean')STARS.forEach(([x,y,r,p])=>{cx.fillStyle=`rgba(255,255,255,${.25+.35*Math.sin(T*1.5+p)})`;cx.beginPath();cx.arc(x*W,y*H,r,0,7);cx.fill()});
for(let L=0;L<5;L++){const y0=H*(.5+L*.1),a=(6+L*5)*S.wave,sp=.5+L*.25,k=.004+.0013*L;cx.beginPath();cx.moveTo(0,H);
for(let x=0;x<=W+8;x+=8)cx.lineTo(x,y0+Math.sin(x*k+T*sp+L*2)*a+Math.sin(x*k*2.3-T*sp*1.4+L)*a*.4);
cx.lineTo(W,H);cx.closePath();cx.globalAlpha=.94;cx.fillStyle=t.w[L];cx.fill();cx.globalAlpha=1;cx.strokeStyle=`rgba(${t.g},.2)`;cx.lineWidth=1.5;cx.stroke()}
const sh=cx.createLinearGradient(0,H*.4,0,H);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.45)');cx.fillStyle=sh;cx.fillRect(0,0,W,H)}
function loop(n){requestAnimationFrame(loop);const live=S.bg&&!S.rm&&!document.hidden;if(live)T+=Math.min((n-lt)/1000,.05);lt=n;if(live||dirty){dirty=false;drawSea()}}
addEventListener('resize',size);size();requestAnimationFrame(loop);
/* opciones */
const OPT=[['Vídeo'],['fs','Pantalla completa (F)','fs'],['bg','Fondo de mar animado','tog'],['theme','Ambiente del mar','sel',[['ocean','Océano'],['dusk','Atardecer'],['storm','Tormenta'],['night','Noche']]],['wave','Oleaje','sel',[[.5,'Suave'],[1,'Normal'],[1.8,'Fuerte']]],['rm','Reducir animaciones','tog'],
['Sonido'],['sound','Efectos de sonido','tog'],['vol','Volumen','rng',0,100,5],['amb','Sonido de oleaje','tog'],['vib','Vibración (móvil)','tog'],
['Partida'],['again','Repetir turno al acertar','tog'],['speed','Velocidad enemigo','sel',[[350,'Rápida'],[700,'Normal'],[1300,'Lenta']]],['autop','Pausar al cambiar de pestaña','tog'],
['Tableros'],['water','Color del agua','col',WATER],['ship','Color de tus barcos','col',SHIP],['zoom','Tamaño del tablero','rng',70,130,5],['coords','Mostrar coordenadas','tog'],
['Interfaz'],['hud','Mostrar tiempo y precisión','tog'],['log','Mostrar registro de batalla','tog']];
function optUI(){$('#optBody').innerHTML=OPT.map(o=>{if(o.length===1)return`<h3 class="oh">${o[0]}</h3>`;const[k,n,t,a,b,c]=o;let x;
if(t==='tog')x=`<button class="tog ${S[k]?'on':''}" data-t="${k}"></button>`;
else if(t==='fs')x=`<button class="btn sm" id="fsx">${fsOn()?'Salir':'Activar'}</button>`;
else if(t==='sel')x=`<select data-k="${k}">${a.map(([v,l])=>`<option value="${v}" ${String(S[k])===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
else if(t==='rng')x=`<span class="sws"><input type="range" data-k="${k}" min="${a}" max="${b}" step="${c}" value="${S[k]}"><span class="mut rv">${S[k]}%</span></span>`;
else x=`<div class="sws">${a.map(v=>`<div class="sw ${S[k]===v?'sel':''}" data-k="${k}" data-c="${v}" style="background:${v}"></div>`).join('')}<input type="color" data-k="${k}" value="${S[k]}"></div>`;
return`<div class="opt"><span>${n}</span>${x}</div>`}).join('')+`<div class="opt"><button class="btn sm" id="oReset">Restablecer opciones</button><button class="btn sm" id="oRec">Borrar récord</button></div>`}
$('#optBody').onclick=e=>{const s=e.target.closest('.sw'),t=e.target.closest('.tog');
if(e.target.id==='fsx'){fs();return}
if(e.target.id==='oReset'){S={...DEF,diff:S.diff};apply();save();optUI();return}
if(e.target.id==='oRec'){R={w:0,l:0};save();recH();return}
if(s)S[s.dataset.k]=s.dataset.c;else if(t)S[t.dataset.t]=!S[t.dataset.t];else return;apply();save();optUI()};
$('#optBody').oninput=e=>{const x=e.target,k=x.dataset.k;if(!k)return;S[k]=x.type==='range'||(x.tagName==='SELECT'&&!isNaN(x.value))?+x.value:x.value;if(x.type==='range')x.nextElementSibling.textContent=x.value+'%';apply();save()};
$('#bOpt').onclick=()=>{modal('mOpt',true);optUI()};$('#oClose').onclick=()=>modal('mOpt',false);
$('#bHelp').onclick=()=>modal('mHelp',true);$('#bPlay').onclick=()=>{sfx.click();levels()};
/* loading */
apply();menu();show('');
const tips=['Calibrando radar…','Cargando flota…','Cebando cañones…','Listo, comandante'];let p=0;
const li=setInterval(()=>{p++;$('#lbar').style.width=p*25+'%';$('#ltxt').textContent=tips[p-1]||tips[3];if(p>=4){clearInterval(li);setTimeout(()=>{$('#loading').classList.add('off');show('menu')},350)}},550);
