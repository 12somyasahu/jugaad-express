import * as T from 'three';
import { roadX, roadY, ROUTE, partById } from './systems.js';

const materials=new Map(), geometries=new Map();
function mat(c) {if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:0.85,flatShading:true}));return materials.get(c);}
function geo(key,fn) {if(!geometries.has(key))geometries.set(key,fn());return geometries.get(key);}
export function box(parent,w,h,d,c,x=0,y=0,z=0) {
  const m=new T.Mesh(geo('box',()=>new T.BoxGeometry(1,1,1)),mat(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function cyl(parent,r,h,c,x=0,y=0,z=0,n=10) {
  const m=new T.Mesh(geo('cyl'+n,()=>new T.CylinderGeometry(1,1,1,n)),mat(c));m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
}
function ball(parent,r,c,x,y,z) {const m=new T.Mesh(geo('ico',()=>new T.IcosahedronGeometry(1,0)),mat(c));m.scale.setScalar(r);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function label(parent,text,bg='#184640',fg='#ffe9aa',w=5,h=1.2,x=0,y=4,z=0) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.strokeStyle=fg;ctx.lineWidth=5;ctx.strokeRect(8,8,496,112);ctx.fillStyle=fg;ctx.font='bold 44px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66,475);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;
}
function wheel(parent,x,z,r=0.47) {const g=new T.Group();g.position.set(x,r,z);const t=cyl(g,r,0.32,'#252f30');t.rotation.z=Math.PI/2;const rim=cyl(g,r*0.53,0.35,'#caac73');rim.rotation.z=Math.PI/2;box(g,0.37,0.08,r*1.2,'#596362');parent.add(g);return g;}
export function vehicle() {
  const root=new T.Group(),body=new T.Group();root.add(body);
  box(body,1.85,0.22,3.5,'#317e79',0,0.83,0);
  for(let i=-2;i<=2;i++)box(body,0.27,0.12,3.3,'#ad7c45',i*0.34,0.98,0);
  box(body,1.9,0.12,0.14,'#a04932',0,1.13,-1.6);box(body,2.2,0.16,0.16,'#e1be6e',0,0.72,1.8);
  box(body,0.66,0.58,0.62,'#333c39',0,1.3,1.02);
  for(let i=0;i<5;i++)box(body,0.8,0.045,0.5,'#969c89',0,1.08+i*0.1,1.02);
  const exhaust=cyl(body,0.09,0.9,'#5b655f',0.7,1.3,0.95);exhaust.rotation.z=0.2;
  box(body,0.72,0.12,0.72,'#e8dfb8',0,1.35,-0.1);box(body,0.72,0.7,0.12,'#e8dfb8',0,1.68,-0.43);
  for(let x of [-0.27,0.27])for(let z of [-0.36,0.16])box(body,0.055,0.4,0.055,'#e8dfb8',x,1.1,z);
  // The precious wedding generator, with cooling slats and rope straps.
  box(body,1.3,0.83,0.9,'#dba037',0,1.47,-1.05);box(body,1.05,0.58,0.035,'#263d36',0,1.45,-1.52);
  for(let x=-0.4;x<=0.4;x+=0.2)box(body,0.04,0.5,0.05,'#75827a',x,1.45,-1.56);
  for(let x of [-0.48,0.48])box(body,0.045,0.9,0.98,'#ddc591',x,1.48,-1.05);
  label(body,'SHAADI SPECIAL','#d89a35','#243d36',1.25,0.3,0,1.8,-1.54);
  // Driver: kurta, head, turban, and arms reaching for the handlebars.
  box(body,0.48,0.63,0.35,'#e99358',0,1.76,-0.02);ball(body,0.22,'#9b603d',0,2.23,0);ball(body,0.26,'#edb84d',0,2.41,-0.03);
  for(let x of [-0.31,0.31]){const a=box(body,0.14,0.13,0.52,'#e99358',x,1.98,0.25);a.rotation.x=-0.25;}
  const steering=box(body,0.85,0.07,0.08,'#2c3933',0,1.97,0.57);
  const wheels=[wheel(body,-1,1.05),wheel(body,1,1.05,0.43),wheel(body,-1,-1.12),wheel(body,1,-1.12,0.5)];
  const attachments=new T.Group();body.add(attachments);
  return {root,body,wheels,attachments,steering};
}
export const SLOTS={Front:[0,1.4,1.65],Rear:[0,1.8,-1.8],Roof:[0,2.8,-0.65],Left:[-1.18,1.38,-0.5],Right:[1.18,1.35,0.4],Engine:[0,1.9,1.05],Underbody:[0,0.47,-0.3],Wheels:[0,0,0]};
export function attachment(id,slot) {
  const g=new T.Group(),p=partById(id);g.position.set(...SLOTS[slot||p.slot]);
  if(id==='fan'||id==='giantfan') {
    const r=id==='giantfan'?0.85:0.48;cyl(g,0.065,0.5,'#758f7b',0,0.2);const pivot=new T.Group();pivot.position.y=0.55;g.add(pivot);
    const ring=new T.Mesh(new T.TorusGeometry(r,0.045,5,20),mat('#83c7b3'));pivot.add(ring);
    const spin=new T.Group();pivot.add(spin);ball(spin,0.11,'#eec368',0,0,0.05);
    for(let i=0;i<3;i++){const b=box(spin,r*1.65,0.14,0.05,'#82b7a1');b.rotation.z=i*Math.PI/3;}
    g.userData.spin=spin;
  } else if(id==='tractor'||id==='wheel') {
    for(let x of [-1,1])for(let z of [-1.12,1.05]){const w=wheel(g,x,z,id==='tractor'?0.72:0.55);w.position.y=0.47;}
  } else if(id==='barrel') {
    for(let x of [-1.22,1.22]){const b=cyl(g,0.46,2.2,'#449aad',x,0.05);b.rotation.x=Math.PI/2;for(let z of [-0.7,0.7]){const band=cyl(g,0.48,0.08,'#d5c99d',x,0.05,z);band.rotation.x=Math.PI/2;}}
  } else if(id==='tank') {cyl(g,0.62,1.05,'#76a5a1',0,0.2);cyl(g,0.2,0.12,'#c8c7ad',0,0.79);box(g,1.3,0.1,1.2,'#aa764b',0,-0.35);}
  else if(id==='pipe'||id==='turbo'){const t=cyl(g,id==='pipe'?0.12:0.25,1.25,'#88958f',0,0.2);t.rotation.x=0.3;if(id==='turbo'){const tor=new T.Mesh(new T.TorusGeometry(0.28,0.12,6,12),mat('#ae6141'));g.add(tor);}}
  else if(id==='battery'){box(g,0.55,0.65,0.8,'#303c4b');for(let x of [-0.18,0.18])cyl(g,0.06,0.12,x<0?'#ee7253':'#83a5ad',x,0.38);box(g,0.06,0.75,0.85,'#d4b475');}
  else if(id==='armour'){box(g,1.9,0.95,0.12,'#a56c52');for(let x of [-0.8,0.8])ball(g,0.07,'#ded6b6',x,0.3,0.1);}
  else if(id==='radiator'){box(g,1.4,0.8,0.17,'#374949');for(let x=-0.6;x<0.7;x+=0.12)box(g,0.05,0.7,0.21,'#a7b7a6',x);}
  else if(id==='engine'){box(g,0.6,0.65,0.9,'#595f57');for(let i=0;i<5;i++)box(g,0.7,0.03,0.95,'#b0b6a5',0,i*0.11-0.22);}
  else if(id==='spring'){for(let x of [-0.7,0.7])for(let y=0;y<0.5;y+=0.12){const r=new T.Mesh(new T.TorusGeometry(0.17,0.045,4,8),mat('#e4b758'));r.rotation.x=Math.PI/2;r.position.set(x,y,0);g.add(r);}}
  else if(id==='rope'){for(let x of [-0.5,0.5]){const r=new T.Mesh(new T.TorusGeometry(0.55,0.04,4,12),mat('#dbc38e'));r.position.x=x;r.rotation.y=Math.PI/2;g.add(r);}}
  else if(id==='tape'){for(let i=0;i<3;i++)box(g,0.82,0.08,0.69,'#c6c8b7',0,i*0.12-0.2);}
  else if(id==='torch'){const lamp=cyl(g,0.28,0.23,'#ffe9a4');lamp.rotation.x=Math.PI/2;const light=new T.SpotLight('#ffebaa',30,50,0.5,0.7);light.position.set(0,0,0.3);light.target.position.set(0,-1,22);g.add(light,light.target);}
  return g;
}
function tree(parent,x,z,seed) {const y=roadY(z);cyl(parent,0.24,3,'#735039',x,y+1.5,z);ball(parent,2.2+seed,'#57714b',x,y+4,z);ball(parent,1.65,'#6d8550',x+1,y+4.8,z+0.3);}
function building(parent,x,z,i) {
  const y=roadY(z),color=['#d7aa78','#cc815d','#82a39a','#e1c897'][i%4];box(parent,6,4,5,color,x,y+2,z);box(parent,6.6,0.25,5.6,'#b96f4c',x,y+4.1,z);
  box(parent,1.1,2.5,0.1,'#345653',x,y+1.25,z-2.55);for(let k of [-2,2])box(parent,1,1.1,0.12,'#3c6968',x+k,y+2.5,z-2.57);
  const awn=box(parent,6.5,0.12,2,'#d99e36',x,y+3.1,z-3.2);awn.rotation.x=-0.12;
  for(let k of [-2.9,2.9])cyl(parent,0.05,3,'#765b44',x+k,y+1.5,z-4);
  cyl(parent,0.85,1.2,'#4b6864',x+1.7,y+4.8,z);
  label(parent,['CHACHA MOTORS','CHAI & CHILL','HORN PLEASE','DESI DHABA'][i%4],'#255b50','#ffe2a2',5.3,0.9,x,y+3.6,z-2.65);
}
function cow() {const g=new T.Group();box(g,0.85,0.85,1.65,'#e7dcc2',0,0.9);box(g,0.7,0.65,0.55,'#e7dcc2',0,1.2,0.93);box(g,0.55,0.3,0.36,'#947665',0,1.04,1.23);for(let x of [-0.3,0.3])for(let z of [-0.6,0.6])box(g,0.13,0.6,0.13,'#6a5342',x,0.3,z);box(g,0.4,0.68,0.6,'#6a5140',0.27,0.91,-0.2);for(let x of [-0.3,0.3])cyl(g,0.045,0.3,'#554835',x,1.65,0.88);return g;}
function traffic(kind) {const g=new T.Group();if(kind==='cow')return cow();const truck=kind==='truck';box(g,truck?2.7:1.7,1,truck?5.2:2.6,truck?'#aa6847':'#599894',0,1.05);box(g,truck?2.6:1.6,1.3,1.6,'#e1b34e',0,2.1,truck?1.8:0.6);box(g,truck?2.2:1.3,0.7,0.06,'#6faca5',0,2.25,truck?2.62:1.42);for(let x of [-1,1])for(let z of [-1,1])wheel(g,x*(truck?1.3:0.87),z*(truck?1.7:0.85));if(truck)label(g,'OK · HORN','#2c6a66','#ffe5a4',2.3,0.6,0,1.5,-2.65);return g;}
function rand(seed){let s=seed;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function createWorld(scene) {
  const chunks=[],obstacles=[],pickups=[],mechanics=[],shortcuts=[];const random=rand(87);
  for(let start=-200;start<ROUTE+400;start+=200){
    const g=new T.Group();scene.add(g);chunks.push({start,g});
    for(let z=start;z<start+200;z+=10){
      const x=roadX(z),y=roadY(z);const road=box(g,13,0.3,10.8,z>=1300&&z<2800?'#86775d':'#68716a',x,y-0.16,z);road.rotation.x=-Math.atan2(roadY(z+5)-roadY(z-5),10);road.rotation.y=Math.atan2(roadX(z+5)-roadX(z-5),10);
      box(g,130,0.6,10.1,z>=4400&&z<5900?'#6e9080':'#a6a36f',x,y-0.6,z);
      if(z%20===0)box(g,0.18,0.02,3.5,'#e3d6a5',x,y+0.025,z);
      if(z%40===0)for(let side of [-1,1]){box(g,0.17,0.8,0.17,'#eee0b7',x+side*7,y+0.3,z);box(g,0.2,0.18,0.19,'#b36742',x+side*7,y+0.6,z);}
    }
    for(let i=0;i<9;i++){const z=start+random()*200,x=roadX(z)+(random()>0.5?1:-1)*(12+random()*42);tree(g,x,z,random());}
    if(start<1400||start%600===0){for(let i=0;i<3;i++){const z=start+35+i*53;building(g,roadX(z)+(i%2?-1:1)*18,z,Math.floor(random()*4));}}
    for(let j=0;j<2;j++){const z=start+j*100;const x=roadX(z)-9,y=roadY(z);cyl(g,0.13,9,'#797362',x,y+4.5,z);box(g,3.5,0.15,0.15,'#5e5e4e',x,y+8.5,z);}
    if(start>=1400&&start<2800)for(let j=0;j<4;j++){const z=start+20+j*45,x=(random()-0.5)*9;const m=cyl(g,1.25,0.05,'#4e4f3d',roadX(z)+x,roadY(z)+0.025,z);obstacles.push({kind:'pothole',x,z,r:1.45,mesh:m});}
    if(start>=4400&&start<5800){const z=start+70;const water=box(g,14,0.04,65,'#67a5a3',roadX(z),roadY(z)+0.12,z);water.material=mat('#67a5a3');}
    if(start>=200&&start<7400){const z=start+110,kind=start>=2800&&start<4400?'truck':(start%600===0?'cow':'tractor'),x=(random()-0.5)*8;const m=traffic(kind);m.position.set(roadX(z)+x,roadY(z),z);m.rotation.y=kind==='cow'?Math.PI/2:Math.PI;g.add(m);obstacles.push({kind,x,z,r:kind==='truck'?2:1.4,mesh:m,baseX:x});}
  }
  // Home workshop frames the title screen and the beginning of the journey.
  const home=new T.Group();scene.add(home);building(home,-12,-9,0);tree(home,13,-8,0.6);tree(home,-20,12,0.2);
  label(home,'CHAL JAYEGI.','#b9673f','#ffe2ae',4.5,1,-8,2.8,4);
  // An early, harmless impact introduces repairs in the opening seconds.
  const crate=box(scene,1.6,1,1,'#b08c55',roadX(25),roadY(25)+0.5,25);obstacles.push({kind:'crate',x:0,z:25,r:1.2,mesh:crate});
  const pool=['fan','pipe','tank','tractor','barrel','battery','armour','turbo','engine','radiator','spring','rope','tape','wheel','fuel','torch','giantfan'];
  for(let i=0,z=46;z<ROUTE-120;z+=185,i++){
    const x=i%2?5.7:-5.7,g=new T.Group();g.position.set(roadX(z)+x,roadY(z),z);scene.add(g);
    box(g,1.65,0.28,1.5,'#765d3d',0,0.15);for(let j=0;j<5;j++){const m=box(g,0.7,0.3,0.55,['#c99249','#79948c','#b27c5e'][j%3],(random()-0.5),0.35+random()*0.5,(random()-0.5));m.rotation.y=random()*3;}
    const ring=new T.Mesh(new T.TorusGeometry(1.25,0.05,4,24),new T.MeshBasicMaterial({color:'#f5d27c'}));ring.rotation.x=Math.PI/2;ring.position.y=0.15;g.add(ring);
    label(g,'E · SCRAP','#214b42','#ffe7a8',2.8,0.7,0,2.2,0);
    pickups.push({z,x,g,ids:i===0?['fan','bottle','pipe']:['fuel',pool[i%pool.length],pool[(i+5)%pool.length]],index:i});
  }
  for(let z of [1180,2700,4300,5800,6800]){const x=-9,g=new T.Group();g.position.set(roadX(z)+x,roadY(z),z);scene.add(g);box(g,5,0.15,8,'#d7b363',0,0);label(g,'CHACHA 2.0 · E','#1d655c','#ffe0a0',5,1,0,3,0);for(let k of [-2,2])cyl(g,0.08,3,'#705740',k,1.5);mechanics.push({x,z,g});}
  for(const [z,type] of [[1900,'mud'],[3900,'ramp'],[5050,'water']]){const x=10,g=new T.Group();g.position.set(roadX(z)+x,roadY(z),z);scene.add(g);box(g,5,0.12,80,type==='water'?'#559c9e':'#ad8759',0,0,30);label(g,`SHORTCUT · ${type.toUpperCase()}`,'#377068','#ffe4a2',5,1,0,3,-5);shortcuts.push({x,z,type,g});}
  const wedding=new T.Group();wedding.position.set(roadX(ROUTE),roadY(ROUTE),ROUTE);scene.add(wedding);
  box(wedding,38,0.2,55,'#c4a184',0,0,15);box(wedding,14,0.1,40,'#a15447',0,0.2,10);
  for(let x of [-8,8]){box(wedding,1.2,8,1.2,'#ebc690',x,4);box(wedding,12,6,18,'#bd826a',x*2,3,22);}
  box(wedding,17,1,1.2,'#d7a14f',0,8);label(wedding,'SHAADI · THIS WAY','#863f43','#ffe1a0',12,1.6,0,6.5,-0.7);
  const bulbs=[];
  for(let z=0;z<=35;z+=7)for(let x=-8;x<=8;x+=2){const m=ball(wedding,0.18,'#9b8b6b',x,7-Math.sin((x+8)/16*Math.PI)*1.5,z);m.material=new T.MeshStandardMaterial({color:'#e9c071',emissive:'#ffd07a',emissiveIntensity:0});bulbs.push(m);}
  const people=[];for(let i=0;i<24;i++){const g=new T.Group();g.position.set((i%2?1:-1)*(5+random()*5),0,5+random()*28);box(g,0.6,1.2,0.4,['#cb704a','#dbb447','#729b92','#ae6684'][i%4],0,0.9);ball(g,0.25,'#9f6b45',0,1.8,0);wedding.add(g);people.push(g);}
  const glow=new T.PointLight('#ffb95b',0,55,1);glow.position.set(0,7,18);wedding.add(glow);
  return {chunks,obstacles,pickups,mechanics,shortcuts,wedding,bulbs,people,glow,update(z,t){for(const c of chunks)c.g.visible=Math.abs(c.start-z)<330;for(const p of pickups){p.g.visible=Math.abs(p.z-z)<210&&!p.taken;p.g.rotation.y=Math.sin(t)*0.025;}for(const o of obstacles){if(o.kind==='cow'){o.x=o.baseX+Math.sin(t*0.35+o.z)*2;o.mesh.position.x=roadX(o.z)+o.x;}}wedding.visible=z>ROUTE-220;}};
}
export function particles(scene) {
  const count=240,pos=new Float32Array(count*3),colors=new Float32Array(count*3),life=new Float32Array(count),vel=new Float32Array(count*3);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const mesh=new T.Points(geometry,new T.PointsMaterial({size:0.16,vertexColors:true,transparent:true,opacity:0.8}));mesh.frustumCulled=false;scene.add(mesh);let cursor=0;
  return {emit(x,y,z,color,n=8){const c=new T.Color(color);for(let j=0;j<n;j++){const i=cursor++%count;pos.set([x,y,z],i*3);colors.set([c.r,c.g,c.b],i*3);vel.set([(Math.random()-0.5)*5,2+Math.random()*3,(Math.random()-0.5)*5],i*3);life[i]=0.5+Math.random();}},update(dt){for(let i=0;i<count;i++){life[i]-=dt;if(life[i]>0){for(let k=0;k<3;k++)pos[i*3+k]+=vel[i*3+k]*dt;vel[i*3+1]-=3*dt;}else pos[i*3+1]=-1000;}geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;}};
}
