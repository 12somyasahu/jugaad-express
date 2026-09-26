export const ROUTE = 7600;
export const STAGES = [
  { name: 'GAON', sub: 'Home is where the spare parts are.', at: 0, color: '#d9a544' },
  { name: 'BROKEN ROAD', sub: 'Suspension is a state of mind.', at: 1300, color: '#d7804e' },
  { name: 'HIGHWAY', sub: 'Horn please. Brakes optional.', at: 2800, color: '#e8c16b' },
  { name: 'MONSOON', sub: 'Some assembly. Some swimming.', at: 4400, color: '#70b7b4' },
  { name: 'HILL ROAD', sub: 'What goes up needs a bigger engine.', at: 5900, color: '#d4a6a0' },
];
export const PARTS = [
  { id:'bottle', name:'Water bottle', icon:'◈', slot:'Engine', benefit:'Instantly cools 40°', downside:'One use · takes 2 seconds', weight:0, consume:true },
  { id:'fan', name:'Table fan', icon:'✣', slot:'Engine', benefit:'+ cooling', downside:'Drains battery', weight:7, cooling:1.5, drain:0.35 },
  { id:'pipe', name:'Metal pipe', icon:'╱', slot:'Rear', benefit:'Passive airflow', downside:'+8 kg', weight:8, cooling:0.55 },
  { id:'tank', name:'Roof water tank', icon:'▥', slot:'Roof', benefit:'Strong passive cooling', downside:'Top-heavy cornering', weight:25, cooling:1.4, stability:-0.3 },
  { id:'barrel', name:'Plastic barrels', icon:'◉', slot:'Underbody', benefit:'Float through floods', downside:'Sluggish steering', weight:12, water:1, steering:-0.22 },
  { id:'tractor', name:'Tractor wheels', icon:'◌', slot:'Wheels', benefit:'Huge grip · flood clearance', downside:'Heavy · wide turns', weight:35, traction:0.8, steering:-0.18, water:0.55 },
  { id:'battery', name:'Truck battery', icon:'▣', slot:'Left', benefit:'Recharges electrical system', downside:'+24 kg', weight:24, power:0.8 },
  { id:'armour', name:'Metal armour', icon:'▰', slot:'Front', benefit:'55% less collision damage', downside:'+32 kg', weight:32, armour:0.55 },
  { id:'turbo', name:'Turbocharger', icon:'➚', slot:'Rear', benefit:'+35% top speed', downside:'Heat · speed wobble', weight:8, speed:0.35, heat:1.2, stability:-0.16 },
  { id:'engine', name:'Second engine', icon:'▦', slot:'Right', benefit:'+70% acceleration', downside:'Fuel thirst · heat', weight:28, acceleration:0.7, heat:1, fuel:0.75 },
  { id:'radiator', name:'Radiator', icon:'▤', slot:'Front', benefit:'Excellent passive cooling', downside:'Fragile · +18 kg', weight:18, cooling:1.8, fragile:true },
  { id:'spring', name:'Sofa springs', icon:'≋', slot:'Underbody', benefit:'Stable over broken roads', downside:'Extra bounce · +10 kg', weight:10, stability:0.45 },
  { id:'rope', name:'Coir rope', icon:'⌁', slot:'Roof', benefit:'Attachments take half damage', downside:'+5 kg · catches wind', weight:5, speed:-0.03 },
  { id:'tape', name:'Duct tape', icon:'◎', slot:'Engine', benefit:'Waterproof wiring', downside:'Insulates engine heat', weight:2, water:0.5, heat:0.25 },
  { id:'wheel', name:'Car wheels', icon:'⊙', slot:'Wheels', benefit:'Better grip and steering', downside:'+16 kg', weight:16, traction:0.4, steering:0.1 },
  { id:'fuel', name:'Fuel can', icon:'▧', slot:'Rear', benefit:'Restores 45% fuel', downside:'One use · takes 2 seconds', weight:0, consume:true },
  { id:'torch', name:'Truck headlamp', icon:'☀', slot:'Front', benefit:'Lights up the evening road', downside:'Battery drain', weight:4, drain:0.13 },
  { id:'giantfan', name:'Giant fan', icon:'✺', slot:'Roof', benefit:'Enormous cooling', downside:'Big electrical drain', weight:20, cooling:2.7, drain:0.9 },
];
export const partById = id => PARTS.find(p=>p.id===id);
export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export function stats(installed, battery=100) {
  const s={weight:120,cooling:0.8,drain:0,power:0.22,traction:0.65,stability:1,steering:1,speed:1,acceleration:1,heat:0,fuel:1,water:0,armour:0};
  for(const item of installed) {
    if(item.hp<=0) continue;
    const p=partById(item.id);
    for(const key of Object.keys(s)) if(p[key]) s[key]+=((key==='cooling' && p.drain && battery<=0)?0:p[key]);
  }
  return s;
}
export function newRun() {
  return { z:0,x:0,speed:0,heading:0,time:0,health:100,temp:57,fuel:100,battery:100,tyres:100,
    installed:[],inventory:['bottle','fan','pipe'],scrap:0,installs:0,lost:0,collisions:0,shortcuts:0,maxSpeed:0,
    stage:0,checkpoint:0,collisionCooldown:0,repairCooldown:0,eventTime:48,firstProblem:false,firstHit:false,
    served:[],taken:[],shortcutsTaken:[],late:false,won:false,ending:0 };
}
export function rating(s) {
  return Math.round(clamp(60+Math.min(15,s.installs*3)+Math.min(10,s.scrap)+Math.min(10,s.shortcuts*5)+(s.health/100)*10-Math.max(0,s.time-720)/18-s.collisions*1.2-s.lost*1.5,0,100));
}
export function titleFor(score) {return score>85?'Chacha Approved':score>70?'Jugaad Master':score>50?'Local Engineering':score>30?'Road-Legal-ish':'Certified Disaster';}
export function roadX(z) { return Math.sin(z/340)*14+Math.sin(z/125)*4*(z>5900?2.5:1); }
export function roadY(z) {return z<5900?Math.sin(z/180)*1.4:Math.sin((z-5900)/180)*13+(z-5900)*0.015;}
export function stageAt(z) { let n=0; STAGES.forEach((s,i)=>{if(z>=s.at)n=i;});return n; }
export function damage(s,amount) {
  const st=stats(s.installed,s.battery);
  s.health=Math.max(0,s.health-amount*(1-st.armour));
  s.tyres=Math.max(0,s.tyres-amount*0.7);
  s.collisions++;
  const protection=s.installed.some(p=>p.id==='rope')?0.5:1;
  for(const p of s.installed) p.hp-=amount*1.8*protection*(partById(p.id).fragile?1.7:1);
}
