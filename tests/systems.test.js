import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PARTS,stats,newRun,damage,rating,stageAt,ROUTE} from '../src/systems.js';

test('all 18 parts have explicit costs and valid unique identities',()=>{
 assert.equal(PARTS.length,18);assert.equal(new Set(PARTS.map(p=>p.id)).size,18);
 for(const p of PARTS){assert.ok(p.benefit);assert.ok(p.downside);assert.ok(p.slot);}
});
test('battery failure disables electrical cooling without disabling passive cooling',()=>{
 const parts=[{id:'fan',hp:100},{id:'pipe',hp:100}];
 assert.ok(Math.abs(stats(parts,0).cooling-1.35)<1e-9);assert.ok(Math.abs(stats(parts,100).cooling-2.85)<1e-9);
});
test('powerful builds have tradeoffs and broken parts no longer contribute',()=>{
 const base=stats([]),turbo=stats([{id:'turbo',hp:100}]);
 assert.ok(turbo.speed>base.speed);assert.ok(turbo.heat>base.heat);assert.ok(turbo.stability<base.stability);
 assert.deepEqual(stats([{id:'turbo',hp:0}]),base);
});
test('armour absorbs collision damage and rope protects attachments',()=>{
 const raw=newRun(),protectedRun=newRun();protectedRun.installed=[{id:'armour',hp:100},{id:'rope',hp:100}];
 damage(raw,20);damage(protectedRun,20);assert.ok(protectedRun.health>raw.health);assert.equal(protectedRun.installed[0].hp,82);assert.equal(protectedRun.collisions,1);
});
test('route contains all five stages and rating is achievable and bounded',()=>{
 assert.deepEqual([0,1300,2800,4400,5900,ROUTE].map(stageAt),[0,1,2,3,4,4]);
 const good={...newRun(),installs:5,scrap:10,shortcuts:2};assert.equal(rating(good),100);
 assert.ok(rating({...good,time:2000,collisions:50})>=0);
 assert.ok(rating({...good,time:850})<rating(good));
});
