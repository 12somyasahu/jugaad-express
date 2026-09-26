import * as T from 'three';
import './style.css';
import { Audio } from './audio.js';
import { createWorld, vehicle, attachment, particles, SLOTS } from './world.js';
import { ROUTE, STAGES, PARTS, partById, clamp, stats, newRun, roadX, roadY, stageAt, damage, rating, titleFor } from './systems.js';

const $=id=>document.getElementById(id);
const app=$('app');
app.innerHTML=`<div id="ui"><div class="vignette"></div>
<section id="menu" class="menu">
 <div class="brand"><span class="stamp">✣</span><span class="eyebrow">A little Indian ingenuity</span></div>
 <div class="route-preview">GAON <i></i> HIGHWAY <i></i> SHAADI</div><div class="edition">THE SHAADI SPECIAL · VOL. 01</div>
 <div class="menu-copy"><div class="eyebrow gold">One delivery. Infinite bad ideas.</div><h1>JUGAAD<span>EXPRESS</span></h1><div class="handline">Chal jayegi. Probably.</div>
 <p class="menu-desc">One generator. Twelve minutes. Absolutely no warranty. Build your beautiful disaster and get the wedding lights back on.</p>
 <div class="menu-buttons"><button id="start" class="primary">START DELIVERY <span>→</span></button><button id="how" class="secondary">HOW TO PLAY</button><button id="settings" class="secondary">SETTINGS</button></div>
 <div id="best"></div><p class="mobile-note">A desktop keyboard and WebGL 2 browser are required.</p></div>
 <div class="vehicle-caption"><span class="eyebrow gold">Meet your delivery vehicle</span><strong>THE SHAADI SPECIAL</strong><small>120 kg of optimism. Zero kilometres of warranty.</small></div>
 <footer><span>HANDMADE MACHINES. QUESTIONABLE DECISIONS.</span><a href="https://github.com/12somyasahu" target="_blank" rel="noopener noreferrer">BY 12SOMYASAHU ↗ GITHUB</a></footer>
</section>
<section id="hud" class="hud hidden"><div class="topbar"><div class="telemetry">
 <div class="meter"><span>ENGINE</span><span id="healthText"></span><progress id="health" max="100"></progress></div>
 <div class="meter"><span>TEMPERATURE</span><span id="tempText"></span><progress id="temp" max="120"></progress></div>
 <div class="meter"><span>FUEL</span><span id="fuelText"></span><progress id="fuel" max="100"></progress></div>
 </div><div class="clock"><span class="eyebrow" id="timerTitle">Wedding starts in</span><strong id="timer">12:00</strong></div><div class="distance"><span class="eyebrow">To the wedding</span><strong id="distance">7.6 <small>KM</small></strong><div class="stage-chip" id="stage">01 / GAON</div></div></div>
 <div class="status"><div id="warning" class="warning hidden"></div><div id="interaction" class="interaction hidden"></div></div>
 <div class="bottom"><div class="speed"><span id="speed">0</span> <small>KM/H</small></div><div class="controls"><span><kbd>WASD</kbd> DRIVE</span><span><kbd>E</kbd> COLLECT</span><span><kbd>TAB</kbd> JUGAAD</span><span><kbd>F</kbd> REPAIR</span><span><kbd>ESC</kbd> PAUSE</span></div><button id="mute" class="secondary" aria-label="Toggle sound">SOUND ON</button></div>
 <div class="progress-track"><div id="progress"></div></div></section>
<div id="toast" class="toast hidden" role="status" aria-live="polite"></div><div id="intro" class="intro hidden"></div>
<section id="overlay" class="overlay hidden"></section></div>`;

let saved={};try{saved=JSON.parse(localStorage.getItem('jugaad-express')||'{}');}catch{}
let settings={muted:false,quality:'high',...saved.settings};
function save(){try{localStorage.setItem('jugaad-express',JSON.stringify({...saved,settings}));}catch{}}
const audio=new Audio();audio.mute(settings.muted);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{
 app.innerHTML='<div id="fatal"><h1>We need a little more graphics power.</h1><p>Please use Chrome or Edge with hardware acceleration and WebGL 2 enabled, then reload the page.</p><a href="https://github.com/12somyasahu">12somyasahu on GitHub</a></div>';throw new Error('WebGL 2 unavailable');
}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.5:1));renderer.shadowMap.enabled=settings.quality==='high';renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;app.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D Jugaad Express driving game');
const scene=new T.Scene();scene.background=new T.Color('#bed4c0');scene.fog=new T.Fog('#bed4c0',85,260);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,0.1,360);
const ambient=new T.HemisphereLight('#fff1ce','#71855b',2);scene.add(ambient);
const sun=new T.DirectionalLight('#ffe0a1',3.1);sun.position.set(-35,65,30);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.near=1;sun.shadow.camera.far=180;sun.shadow.normalBias=0.04;scene.add(sun,sun.target);
const world=createWorld(scene),car=vehicle();scene.add(car.root);const fx=particles(scene);
const rainCount=550,rainPos=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++)rainPos.set([(Math.random()-0.5)*65,Math.random()*30,(Math.random()-0.5)*90],i*3);
const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:'#c8e8e2',size:0.065,transparent:true,opacity:0.65}));scene.add(rain);
let run=newRun(),mode='menu',panel=null,selected='fan',toastTime=0,shake=0,clock=0,repairTime=0,introTime=0,nearby=null,endingShown=false,endingStartedAt=0,particlesTimer=0,eventNumber=0;
const keys=new Set(),fallen=[];let cameraYaw=0,drag=false,lastMouse=0;
const menuParts=[['fan','Engine'],['tank','Roof'],['barrel','Underbody'],['battery','Left'],['tractor','Wheels']];
function addModel(item){const m=attachment(item.id,item.slot);m.userData.item=item;car.attachments.add(m);return m;}
function refreshModels(){car.attachments.clear();run.installed.forEach(addModel);car.wheels.forEach(w=>w.visible=!run.installed.some(p=>p.id==='tractor'||p.id==='wheel'));}
function showDemo(){car.attachments.clear();menuParts.forEach(([id,slot])=>addModel({id,slot,hp:100}));car.wheels.forEach(w=>w.visible=false);}
function bestText(){ $('best').textContent=saved.bestTime?`PERSONAL BEST  ${formatTime(saved.bestTime)}  ·  ${saved.bestRating}/100 JUGAAD RATING`:'7.6 KM TO GO  /  MADE OF SCRAP & HOPE'; }
bestText();showDemo();
function formatTime(s){s=Math.max(0,Math.floor(s));return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
function toast(text,duration=4){$('toast').textContent=text;$('toast').classList.remove('hidden');toastTime=duration;}
function clearOverlay(){panel=null;$('overlay').classList.add('hidden');$('overlay').innerHTML='';keys.clear();}
function showPanel(html,name){panel=name;$('overlay').innerHTML=html;$('overlay').classList.remove('hidden');keys.clear();$('overlay').querySelector('button')?.focus();}
function modal(title,content,name){showPanel(`<div class="panel"><button class="close" id="close" aria-label="Close">×</button><span class="eyebrow gold">Jugaad Express</span><h2>${title}</h2>${content}</div>`,name);$('close').onclick=()=>closePanel();}
function closePanel(){if(panel==='settings'&&mode==='paused'){showPause();return;}clearOverlay();if(mode==='paused')mode='driving';}
function start(){audio.start();clearOverlay();run=newRun();eventNumber=0;endingShown=false;repairTime=0;introTime=0;cameraYaw=0;fallen.forEach(f=>scene.remove(f.mesh));fallen.length=0;refreshModels();world.pickups.forEach(p=>p.taken=false);world.obstacles.forEach(o=>o.mesh.visible=true);world.bulbs.forEach(b=>b.material.emissiveIntensity=0);world.glow.intensity=0;$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('intro').classList.remove('hidden');mode='driving';camera.position.set(0,6,-10);toast('W to drive · A / D to steer. Chacha left some scrap just down the road.',7);}
function menu(){clearOverlay();mode='menu';run=newRun();$('menu').classList.remove('hidden');$('hud').classList.add('hidden');$('intro').classList.add('hidden');$('toast').classList.add('hidden');showDemo();bestText();}
function showPause(){mode='paused';modal('Take a chai break.',`<div class="stack"><button id="resume" class="primary">BACK TO THE ROAD →</button><button id="restart" class="secondary">RESTART DELIVERY</button><button id="pauseSettings" class="secondary">SETTINGS</button><button id="mainMenu" class="secondary">MAIN MENU</button></div>`,'pause');$('resume').onclick=()=>closePanel();$('restart').onclick=start;$('pauseSettings').onclick=showSettings;$('mainMenu').onclick=menu;}
function showSettings(){modal('Your kind of chaos.',`<label class="setting">Sound <input id="soundCheck" type="checkbox" ${settings.muted?'':'checked'}></label><label class="setting">Graphics <select id="quality"><option value="high">High · shadows</option><option value="low">Low · better performance</option></select></label><p>Move the mouse while holding the right button to look around. The camera eases back when released. Best played with a keyboard at 1366 × 768 or larger.</p>`,'settings');$('quality').value=settings.quality;$('soundCheck').onchange=e=>{settings.muted=!e.target.checked;audio.mute(settings.muted);save();updateMute();};$('quality').onchange=e=>{settings.quality=e.target.value;renderer.shadowMap.enabled=settings.quality==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.5:1));save();};}
function how(){modal('Get the lights back on.',`<p>Deliver the generator through five stretches of road. Every improvised upgrade solves one problem and creates another.</p><div class="key-list"><span><kbd>W A S D</kbd></span><span>Accelerate, brake / reverse, steer</span><span><kbd>SPACE</kbd></span><span>Handbrake · tighter turns</span><span><kbd>E</kbd></span><span>Collect scrap / visit mechanic / shortcut</span><span><kbd>TAB</kbd></span><span>Build in the Jugaad workshop</span><span><kbd>F</kbd></span><span>Emergency repair (stop first)</span><span><kbd>R</kbd></span><span>Recover to the road</span><span><kbd>ESC</kbd></span><span>Pause</span></div><p>Look for glowing scrap on the shoulders. Install a fan early. Watch fuel and temperature. Mechanics restore your vehicle. The workshop lets time pass slowly; Escape pauses fully. Late? Keep going — the baraat can wait.</p><button id="howStart" class="primary">CHAL, LET'S GO →</button>`,'how');$('howStart').onclick=start;}
$('start').onclick=start;$('how').onclick=how;$('settings').onclick=showSettings;
function updateMute(){$('mute').textContent=settings.muted?'SOUND OFF':'SOUND ON';}
$('mute').onclick=()=>{settings.muted=!settings.muted;audio.mute(settings.muted);save();updateMute();};updateMute();

function workshop(){
 if(mode!=='driving'||run.won)return;
 const st=stats(run.installed,run.battery),counts={};run.inventory.forEach(id=>counts[id]=(counts[id]||0)+1);
 if(!counts[selected])selected=Object.keys(counts)[0]||null;
 const p=partById(selected);
 showPanel(`<div class="panel workshop"><div class="workshop-header"><div><span class="eyebrow gold">Roadside research & development</span><h2>Thoda sa jugaad.</h2><p>One fix. One new problem. Choose wisely-ish.</p></div><button id="closeWorkshop" class="secondary">BACK TO ROAD <kbd>TAB</kbd></button></div><div class="workshop-layout"><aside class="schematic"><div class="eyebrow">Shaadi Special</div><div class="car-plan"><span class="slot-dot" style="top:10%">FRONT</span><span class="slot-dot" style="top:35%">ENGINE</span><span class="slot-dot" style="top:60%">ROOF</span><span class="slot-dot" style="top:85%">GENERATOR</span></div><div class="stat-row"><span>Weight</span><b>${st.weight} kg</b></div><div class="stat-row"><span>Cooling</span><b>${st.cooling.toFixed(1)}</b></div><div class="stat-row"><span>Battery</span><b>${Math.round(run.battery)}%</b></div><div class="stat-row"><span>Tyres</span><b>${Math.round(run.tyres)}%</b></div><div class="stat-row"><span>Grip / stability</span><b>${st.traction.toFixed(1)} / ${st.stability.toFixed(1)}</b></div></aside><div><div class="parts-grid">${Object.entries(counts).map(([id,count])=>{const q=partById(id);return `<button class="part-card ${id===selected?'selected':''}" data-part="${id}" aria-pressed="${id===selected}"><span class="part-icon">${q.icon}</span><div class="qty">${count} AVAILABLE · ${q.weight} KG</div><strong>${q.name}</strong><small>+ ${q.benefit}</small><small class="tradeoff">− ${q.downside}</small></button>`;}).join('')||'<p>No scrap left. Find a glowing pile and press E.</p>'}</div><div class="install-row"><span class="eyebrow">Mount</span><select id="slot" aria-label="Attachment position" ${p?.consume?'disabled':''}>${Object.keys(SLOTS).filter(s=>s!=='Wheels'||p?.slot==='Wheels').map(s=>`<option ${s===p?.slot?'selected':''}>${s}</option>`).join('')}</select><button id="install" class="primary" ${p?'':'disabled'}>${p?.consume?'USE SUPPLY':'LAGAO JUGAAD'} →</button></div><div class="installed">${run.installed.map((p,i)=>`<button data-remove="${i}" title="Remove and keep this part">${partById(p.id).name} · ${Math.max(0,Math.round(p.hp))}% ×</button>`).join('')||'Nothing installed. This is how bad ideas begin.'}</div><div class="workshop-foot">Click an installed part to remove it. Six attachments maximum. Replacing a slot returns the old part. Time moves at 15% while you build.</div></div></div></div>`,'workshop');
 $('closeWorkshop').onclick=clearOverlay;$('overlay').querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{selected=b.dataset.part;workshop();});
 $('overlay').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const [p]=run.installed.splice(Number(b.dataset.remove),1);run.inventory.push(p.id);refreshModels();workshop();});
 $('install').onclick=()=>install(selected,$('slot').value);
 if(p?.slot==='Wheels'){$('slot').value='Wheels';$('slot').disabled=true;}
}
function install(id,slot){
 const index=run.inventory.indexOf(id);if(index<0)return false;const p=partById(id);
 if(run.installed.some(v=>v.id===id)){toast('Already fitted. Try a different idea, bhai.');return false;}
 if(!p.consume){if(p.slot==='Wheels')slot='Wheels';const occupied=run.installed.findIndex(i=>i.slot===slot);if(occupied<0&&run.installed.length>=6){toast('Six parts is enough optimism. Remove one first.');return false;}if(occupied>=0){run.inventory.push(run.installed[occupied].id);run.installed.splice(occupied,1);}run.installed.push({id,slot,hp:100});run.installs++;}
 else {if(id==='bottle')run.temp=Math.max(30,run.temp-40);if(id==='fuel')run.fuel=Math.min(100,run.fuel+45);run.time+=2;}
 run.inventory.splice(index,1);refreshModels();audio.effect('install');shake=0.25;fx.emit(car.root.position.x,car.root.position.y+1.8,run.z,'#ffcc6a',22);clearOverlay();toast(`${p.name.toUpperCase()} ${p.consume?'USED':'FITTED'} · ${p.benefit}. ${p.downside}.`,4);return true;
}
function mechanic(m){run.speed=0;const used=run.served.includes(m.z);modal('“Lekin lag jayega.”',`<p>CHACHA 2.0 — “Ye tyre gaadi ka nahi hai.”<br>A little chai, a lot of unsolicited engineering.</p><div class="stack"><button id="service" class="primary" ${used?'disabled':''}>${used?'SERVICE ALREADY CLAIMED':'FREE SERVICE + MYSTERY PART · 20 SEC'}</button><button id="trade" class="secondary" ${run.inventory.length?'':'disabled'}>TRADE ONE SCRAP FOR A FUEL CAN</button><button id="leaveMechanic" class="secondary">BACK TO DELIVERY →</button></div><p>Service restores engine, tyres, fuel, battery and attachments. One free service per checkpoint. Trading uses your oldest scrap.</p>`,'mechanic');
 $('service').onclick=()=>{if(run.served.includes(m.z))return;run.health=100;run.fuel=100;run.battery=100;run.tyres=100;run.temp=45;run.installed.forEach(p=>p.hp=100);run.time+=20;run.served.push(m.z);run.checkpoint=m.z;const id=PARTS[(Math.floor(m.z/100)+run.installs)%PARTS.length].id;run.inventory.push(id);clearOverlay();toast(`Chacha fixed it. + ${partById(id).name.toUpperCase()}. “No warranty.”`);audio.effect('install');};
 $('trade').onclick=()=>{run.inventory.shift();run.inventory.push('fuel');clearOverlay();toast('Scrap traded for a fuel can. Use it in the workshop.');};$('leaveMechanic').onclick=clearOverlay;
}
function interaction(){
 nearby=null;
 for(const m of world.mechanics)if(Math.abs(run.z-m.z)<13&&Math.abs(run.x-m.x)<8){nearby={type:'mechanic',data:m,text:'E · CHACHA 2.0 — repairs & a little chai'};break;}
 if(!nearby)for(const p of world.pickups)if(!p.taken&&Math.abs(run.z-p.z)<12&&Math.abs(run.x-p.x)<8){nearby={type:'scrap',data:p,text:'E · COLLECT SCRAP — something here might fit'};break;}
 if(!nearby||nearby.type==='scrap')for(const s of world.shortcuts)if(!run.shortcutsTaken.includes(s.z)&&Math.abs(run.z-s.z)<18&&run.x>8){nearby={type:'shortcut',data:s,text:`E · ${s.type.toUpperCase()} SHORTCUT — ${s.type==='mud'?'needs good grip':s.type==='water'?'needs flotation':'needs 65 km/h'}`};break;}
 $('interaction').classList.toggle('hidden',!nearby);if(nearby)$('interaction').textContent=nearby.text;
}
function interact(){if(!nearby||mode!=='driving'||panel)return;const {type,data}=nearby;
 if(type==='scrap'){data.taken=true;data.g.visible=false;run.inventory.push(...data.ids);run.scrap+=data.ids.length;audio.effect('pickup');toast(data.ids.map(id=>'+ '+partById(id).name.toUpperCase()).join('   ')+ ' · TAB to build',5);}
 else if(type==='mechanic')mechanic(data);
 else {const st=stats(run.installed,run.battery);const viable=data.type==='mud'?st.traction>=1:data.type==='water'?st.water>=0.9:run.speed*3.6>=65&&st.weight<190;if(viable){run.z+=240;run.time+=5;run.shortcuts++;run.shortcutsTaken.push(data.z);shake=0.35;audio.effect('splash');toast('SHORTCUT TAKEN · 240 metres closer. Chacha would be proud.');}else{run.speed*=0.25;run.health=Math.max(1,run.health-4);toast('Wrong build for this shortcut. Try the main road.');}}
}
function repair(){if(run.speed>3||run.speed<-3){toast('Stop first, then press F for a roadside repair.');return;}if(run.repairCooldown>0){toast(`Give the tape a moment. Repair ready in ${Math.ceil(run.repairCooldown)} sec.`);return;}repairTime=3;run.repairCooldown=35;run.time+=10;toast('TEN SECONDS, ONE ROLL OF TAPE · roadside repairs…',3);audio.effect('install');}
function recover(){run.x=0;run.heading=0;run.speed=0;run.z=Math.max(0,run.z-5);run.health=Math.max(25,run.health);run.time+=8;toast('Back on the road. +8 seconds. Even legends need a push.');}
function keydown(e){if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;
 if(e.code==='Escape'){if(panel){closePanel();}else if(mode==='driving'&&!run.won)showPause();return;}
 if(mode!=='driving'||run.won)return;
 if(e.code==='Tab'){panel==='workshop'?clearOverlay():!panel&&workshop();return;}
 if(panel)return;keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='KeyF')repair();if(e.code==='KeyR')recover();
}
window.addEventListener('keydown',keydown);window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(mode==='driving'&&!run.won&&!panel)showPause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='driving'&&!run.won)showPause();});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2){drag=true;lastMouse=e.clientX;}});window.addEventListener('pointerup',()=>drag=false);window.addEventListener('pointermove',e=>{if(drag){cameraYaw=clamp(cameraYaw+(e.clientX-lastMouse)*0.005,-1.1,1.1);lastMouse=e.clientX;}});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function breakParts(){for(let i=run.installed.length-1;i>=0;i--){const p=run.installed[i];if(p.hp>0)continue;const m=car.attachments.children.find(m=>m.userData.item===p);if(m){const pos=new T.Vector3(),quat=new T.Quaternion();m.getWorldPosition(pos);m.getWorldQuaternion(quat);car.attachments.remove(m);scene.add(m);m.position.copy(pos);m.quaternion.copy(quat);fallen.push({mesh:m,life:5,vx:(Math.random()-0.5)*5,vy:4,vz:run.speed*0.5});}run.installed.splice(i,1);run.lost++;audio.effect('break');shake=0.5;toast(`THERE GOES THE ${partById(p.id).name.toUpperCase()}.`,4);}car.wheels.forEach(w=>w.visible=!run.installed.some(p=>p.id==='tractor'||p.id==='wheel'));}
function randomEvent(){const events=['puncture','surge','leak','scrap'];const type=events[eventNumber++%events.length];if(type==='puncture'){run.tyres=Math.max(10,run.tyres-28);toast('TYRE PUNCTURE · steering pulls right. Stop and press F, or fit better wheels.');}else if(type==='surge'){run.battery=Math.max(0,run.battery-35);toast('POWER SURGE · battery took a hit. Electrical fans need power.');}else if(type==='leak'){run.fuel=Math.max(0,run.fuel-12);toast('FUEL LEAK · lost 12% fuel. Look for a scrap pile or Chacha.');}else{run.inventory.push('rope','fuel');run.scrap+=2;toast('SCRAP TRUCK DROPPED A GIFT · + coir rope + fuel can.');}audio.effect('warn');}
function finish(){run.won=true;run.ending=0;endingStartedAt=performance.now();run.speed=0;keys.clear();clearOverlay();$('intro').classList.remove('hidden');$('intro').innerHTML='<small>THE GENERATOR IS CONNECTED</small>“Ek second… ek second…”';toast('You made it. Now, please start.',4);}
function results(){const score=rating(run);saved.bestTime=Math.min(saved.bestTime||Infinity,run.time);saved.bestRating=Math.max(saved.bestRating||0,score);save();showPanel(`<div class="panel results"><span class="eyebrow gold">Special delivery · ${titleFor(score)}</span><h2>SHAADI SAVED.</h2><p>Vehicle… not so much.</p><div class="score">${score}<small> / 100</small></div><span class="eyebrow">JUGAAD RATING</span><div class="result-grid">${[['TIME',formatTime(run.time)],['CONDITION',Math.round(run.health)+'%'],['JUGAADS',run.installs],['SCRAP',run.scrap],['PARTS LOST',run.lost],['COLLISIONS',run.collisions],['SHORTCUTS',run.shortcuts],['TOP KM/H',Math.round(run.maxSpeed*3.6)]].map(([k,v])=>`<div><strong>${v}</strong><small>${k}</small></div>`).join('')}</div><p>THE SHAADI SPECIAL · Built from scrap. Powered by optimism.<br>${run.late?'The baraat waited. Your rating includes a late penalty.':'The generator arrived before the baraat. Chacha approves.'}</p><div class="actions" style="justify-content:center"><button class="primary" id="again">ONE MORE DELIVERY →</button><button class="secondary" id="resultsMenu">MAIN MENU</button></div><p><a href="https://github.com/12somyasahu" target="_blank" rel="noopener noreferrer">Made by 12somyasahu · GitHub ↗</a></p></div>`,'results');$('again').onclick=start;$('resultsMenu').onclick=menu;}

function update(dt){
 if(mode!=='driving'||run.won)return;
 const slow=panel==='workshop'?0.15:panel?0:1;dt*=slow;if(!dt)return;
 run.time+=dt;run.collisionCooldown=Math.max(0,run.collisionCooldown-dt);run.repairCooldown=Math.max(0,run.repairCooldown-dt);
 if(repairTime>0){repairTime-=dt;if(repairTime<=0){run.health=Math.min(100,run.health+40);run.tyres=Math.min(100,run.tyres+45);run.temp=Math.max(45,run.temp-20);run.fuel=Math.max(12,run.fuel);run.battery=Math.max(20,run.battery);toast('PATCHED UP · Enough fuel to limp onward. Find Chacha for a full service.');}}
 introTime+=dt;
 if(introTime<8){$('intro').innerHTML=`<small>CHACHA</small>${introTime<2.5?'“Generator pahuchana hai.”':introTime<5?'“Gaadi thodi problem kar rahi hai.”':'“Chal jayegi.”'}`;}else $('intro').classList.add('hidden');
 const st=stats(run.installed,run.battery),throttle=!panel&&repairTime<=0&&(keys.has('KeyW')||keys.has('ArrowUp')),brake=!panel&&(keys.has('KeyS')||keys.has('ArrowDown')),hand=!panel&&keys.has('Space');
 const steering=!panel?Number(keys.has('KeyA')||keys.has('ArrowLeft'))-Number(keys.has('KeyD')||keys.has('ArrowRight')):0;
 const offroad=Math.abs(run.x)>6.3,monsoon=run.stage===3,flood=monsoon&&(run.z%200>37&&run.z%200<103);
 let max=22*st.speed*(120/st.weight)**0.24;
 if(offroad)max*=Math.min(0.86,st.traction*0.72);
 if(flood)max*=0.32+Math.min(0.68,st.water*0.68);
 if(run.temp>100)max*=0.48;if(run.health<25)max*=0.5;if(run.fuel<=0||run.health<=0)max=2.5;
 const slope=(roadY(run.z+2)-roadY(run.z-2))/4;
 if(throttle)run.speed+=dt*7*st.acceleration*(120/st.weight)*(run.speed>=0?1:1.6);
 else if(brake)run.speed-=dt*(run.speed>0?15:4);
 else run.speed*=Math.exp(-dt*0.3);
 if(hand)run.speed*=Math.exp(-dt*2.4);
 if(run.speed>0)run.speed-=Math.max(0,slope)*dt*6;
 run.speed=clamp(run.speed,-5,max);
 const grip=st.traction*(monsoon?0.75:1)*(run.tyres<30?0.65:1);
 const steerSpeed=clamp(st.steering,0.4,1.3)*(hand?1.6:1);
 const target=-steering*0.54*steerSpeed*(run.speed<0?-1:1)+(run.tyres<35?0.06:0);
 run.heading=T.MathUtils.damp(run.heading,target,3.5*grip,dt);
 if(Math.abs(run.speed)>1)run.x+=Math.sin(run.heading)*Math.abs(run.speed)*dt;
 run.x=clamp(run.x,-25,25);run.z=clamp(run.z+Math.cos(run.heading)*run.speed*dt,0,ROUTE+2);
 run.maxSpeed=Math.max(run.maxSpeed,run.speed);
 const heating=(throttle?1.35+st.heat+Math.abs(run.speed)*0.022+Math.max(0,slope)*2:0.12);
 run.temp=clamp(run.temp+(heating-st.cooling)*dt,32,120);
 run.fuel=clamp(run.fuel-(Math.abs(run.speed)>1?0.085*st.fuel:0.018)*dt,0,100);
 run.battery=clamp(run.battery+(st.power-st.drain-(flood&&st.water<0.5?0.5:0))*dt,0,100);
 if(run.temp>105)run.health=Math.max(0,run.health-(run.temp-100)*0.05*dt);
 if(flood&&st.water<0.45){run.health=Math.max(0,run.health-0.3*dt);run.temp=Math.max(35,run.temp-0.5*dt);}
 if(offroad&&Math.abs(run.speed)>8)run.tyres=Math.max(0,run.tyres-0.08*dt);
 if(!run.firstProblem&&run.time>12){run.firstProblem=true;run.temp=98;toast('ENGINE HOT! · Chacha packed a bottle, fan and pipe. TAB → choose a fix → LAGAO JUGAAD.',8);audio.effect('warn');}
 const next=stageAt(run.z);if(next!==run.stage){run.stage=next;toast(`${STAGES[next].name} · ${STAGES[next].sub}`,6);audio.effect('pickup');}
 if(run.time>run.eventTime){randomEvent();run.eventTime=run.time+65;}
 if(run.time>=720&&!run.late){run.late=true;toast('BARAAT ARRIVED. Keep driving! Late delivery beats no delivery.',7);}
 for(const o of world.obstacles){if(!o.mesh.visible||run.collisionCooldown>0)continue;if(Math.abs(run.z-o.z)<(o.kind==='truck'?3.6:1.7)&&Math.abs(run.x-o.x)<o.r+0.8&&Math.abs(run.speed)>2){
   const impact=o.kind==='cow'?2:o.kind==='pothole'?6/Math.max(0.6,st.stability):Math.max(5,Math.abs(run.speed)*0.6);
   damage(run,impact);run.speed*=o.kind==='pothole'?0.7:0.2;run.x+=run.x>o.x?1.2:-1.2;run.collisionCooldown=1.4;shake=0.4;audio.effect('hit');fx.emit(car.root.position.x,car.root.position.y+0.8,run.z,'#dfb070',16);
   if(o.kind==='crate'){o.mesh.visible=false;run.firstHit=true;toast('AUSPICIOUS START. A little dent. A lot of character. Scrap ahead — press E.',5);}else if(o.kind==='cow')toast('BRAKE, BHAI! The cow has right of way.');else if(o.kind==='pothole')toast('SUSPENSION? OPTIONAL. Better wheels or springs would help.',2);else toast('HORN PLEASE! That cost us a few bolts.',2);
   breakParts();break;
 }}
 if(run.z>=ROUTE)finish();interaction();
}
function hud(){
 for(const [id,v,suffix] of [['health',run.health,'%'],['temp',run.temp,'°'],['fuel',run.fuel,'%']]){$(id).value=v;$(id+'Text').textContent=Math.round(v)+suffix;$(id).classList.toggle('danger',id==='temp'?v>95:v<25);}
 $('timer').textContent=run.late?'+'+formatTime(run.time-720):formatTime(720-run.time);$('timerTitle').textContent=run.late?'Baraat is waiting':'Wedding starts in';$('distance').innerHTML=`${(Math.max(0,ROUTE-run.z)/1000).toFixed(1)} <small>KM</small>`;$('stage').textContent=`0${run.stage+1} / ${STAGES[run.stage].name}`;$('speed').textContent=Math.round(Math.abs(run.speed)*3.6);$('progress').style.width=(run.z/ROUTE*100)+'%';
 const warnings=[];if(run.temp>95)warnings.push('ENGINE HOT · TAB TO COOL');if(run.fuel<20)warnings.push('LOW FUEL');if(run.battery<15)warnings.push('BATTERY DYING');if(run.health<30||run.tyres<25)warnings.push('STOP + F TO REPAIR');if(stats(run.installed).weight>225)warnings.push('TOO HEAVY');$('warning').classList.toggle('hidden',!warnings.length);$('warning').textContent=warnings.join(' / ');
}
const cameraTarget=new T.Vector3(),lookTarget=new T.Vector3();
let last=performance.now();
function frame(now){const realDt=Math.min((now-last)/1000,0.05);last=now;clock+=realDt;update(realDt);
 const moving=mode==='driving'&&!panel;const z=mode==='menu'?0:run.z;const x=roadX(z)+(mode==='menu'?0:run.x),y=roadY(z);
 car.root.position.set(x,y,z);car.root.rotation.y=mode==='menu'?-0.25:run.heading+Math.atan2(roadX(z+2)-roadX(z-2),4)*0.5;
 const st=stats(run.installed,run.battery);car.body.rotation.z=mode==='menu'?Math.sin(clock*1.8)*0.015:Math.sin(clock*14)*Math.min(0.03,Math.abs(run.speed)*0.001)+(run.heading*run.speed*0.014)/Math.max(0.5,st.stability);car.body.rotation.x=-Math.atan2(roadY(z+2)-roadY(z-2),4);car.body.position.y=0.025*Math.sin(clock*13)*(mode==='menu'?1:Math.abs(run.speed)*0.12);
 car.steering.rotation.y=-run.heading;
 car.wheels.forEach((w,i)=>{w.rotation.x+=run.speed*realDt*2;if(i<2)w.rotation.y=-run.heading*0.5;});
 for(const m of car.attachments.children){if(m.userData.spin&&(mode==='menu'||run.battery>0))m.userData.spin.rotation.z+=realDt*18;if(m.userData.item?.hp<30)m.rotation.z=Math.sin(clock*30)*0.08;}
 if(!drag)cameraYaw=T.MathUtils.damp(cameraYaw,0,2,realDt);
 if(mode==='menu'){
   cameraTarget.set(x+8.8+Math.sin(clock*0.08)*0.8,y+5.4,z+9.7);lookTarget.set(x-2.5,y+1.3,z);
 }else if(run.won){const angle=run.ending*0.18;cameraTarget.set(x+Math.sin(angle)*9,y+4.5,z-9*Math.cos(angle));lookTarget.set(x,y+1.7,z+2);}
 else{const follow=10+Math.abs(run.speed)*0.095;cameraTarget.set(x+Math.sin(cameraYaw)*follow-run.heading*3,y+5.1,z-Math.cos(cameraYaw)*follow);lookTarget.set(x+run.heading*4,y+1.25,z+4);}
 if(mode==='paused'||panel==='results'){}else camera.position.lerp(cameraTarget,1-Math.exp(-realDt*(mode==='menu'?2:5)));
 if(shake>0){shake=Math.max(0,shake-realDt);camera.position.x+=(Math.random()-0.5)*shake*0.35;camera.position.y+=(Math.random()-0.5)*shake*0.2;}
 camera.lookAt(lookTarget);camera.fov=T.MathUtils.damp(camera.fov,mode==='menu'?43:48+Math.abs(run.speed)*0.25,2,realDt);camera.updateProjectionMatrix();
 const evening=mode==='menu'?0:clamp(run.z/ROUTE,0,1);const sky=new T.Color('#bed4c0').lerp(new T.Color('#48546e'),evening*0.9);if(run.stage===3)sky.lerp(new T.Color('#728e91'),0.6);scene.background.copy(sky);scene.fog.color.copy(sky);ambient.intensity=2-evening*1.2;sun.intensity=3.1-evening*2.7;sun.position.set(x-35,y+65,z+30);sun.target.position.set(x,y,z);sun.target.updateMatrixWorld();
 world.update(z,clock);rain.visible=run.stage===3&&mode!=='menu';if(rain.visible){rain.position.set(x,y,z+25);for(let i=0;i<rainCount;i++){rainPos[i*3+1]-=realDt*20;rainPos[i*3]-=realDt*2;if(rainPos[i*3+1]<0){rainPos[i*3+1]=30;rainPos[i*3]=(Math.random()-0.5)*65;}}rainGeo.attributes.position.needsUpdate=true;}
 particlesTimer+=realDt;if(particlesTimer>0.08){particlesTimer=0;if(Math.abs(run.speed)>3&&moving)fx.emit(x,y+0.3,z-1.7,rain.visible?'#a9d4ce':'#d9c391',3);if(run.temp>85)fx.emit(x+0.7,y+1.7,z+1,'#86948a',2);if(run.won&&run.ending>3)fx.emit(x+(Math.random()-0.5)*15,y+8,z+12,['#efb354','#d68786','#8dc3b3'][Math.floor(Math.random()*3)],10);}
 for(let i=fallen.length-1;i>=0;i--){const f=fallen[i];f.life-=realDt;f.vy-=realDt*9;f.mesh.position.x+=f.vx*realDt;f.mesh.position.y+=f.vy*realDt;f.mesh.position.z+=f.vz*realDt;f.mesh.rotation.x+=realDt*4;if(f.mesh.position.y<roadY(f.mesh.position.z)+0.2){f.mesh.position.y=roadY(f.mesh.position.z)+0.2;f.vy=Math.abs(f.vy)*0.25;f.vz*=0.9;}if(f.life<=0){scene.remove(f.mesh);fallen.splice(i,1);}}
 if(run.won&&mode==='driving'){run.ending=(now-endingStartedAt)/1000;world.bulbs.forEach((b,i)=>b.material.emissiveIntensity=run.ending>2+i*0.025?2.5:0);world.glow.intensity=run.ending>3?65:0;world.people.forEach((p,i)=>{p.position.y=run.ending>3?Math.abs(Math.sin(clock*5+i))*0.35:0;});if(run.ending>3){$('intro').innerHTML='<small>THE SHAADI SPECIAL DELIVERS</small>SHAADI SAVED. Vehicle… not so much.';}if(run.ending>9&&!endingShown){endingShown=true;$('intro').classList.add('hidden');results();}}
 fx.update(realDt);audio.update(run.speed,run.health,mode==='driving'&&!panel&&!run.won,run.won&&run.ending>3);
 if(toastTime>0){toastTime-=realDt;if(toastTime<=0)$('toast').classList.add('hidden');}if(mode!=='menu')hud();renderer.render(scene,camera);
}
camera.position.set(9,5,10);renderer.setAnimationLoop(frame);
// Development-only hooks make full-route smoke tests deterministic; excluded in production.
if(import.meta.env.DEV){window.__jugaad={get state(){return run;},get mode(){return mode;},get panel(){return panel;},get renderInfo(){return renderer.info.render;},start,install,workshop,interact,repair,recover,finish,damage:n=>{damage(run,n);breakParts();},get attachmentCount(){return car.attachments.children.length;},teleport(z,x=0){run.z=z;run.x=x;run.speed=0;run.stage=stageAt(z);interaction();},step(seconds){for(let t=0;t<seconds;t+=1/60)update(1/60);}};}
