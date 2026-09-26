import {test,expect} from '@playwright/test';

// Hosted runners render WebGL in software. Exercise the supported Low setting.
test.beforeEach(async({page})=>{
 if(process.env.CI)await page.addInitScript(()=>{
   if(!localStorage.getItem('jugaad-express'))localStorage.setItem('jugaad-express',JSON.stringify({settings:{quality:'low'}}));
 });
});

test('drive, collide, collect, install, reverse, repair, pause and restart',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5188');
 await expect(page.getByRole('button',{name:'START DELIVERY'})).toBeVisible();
 await page.screenshot({path:'test-results/title.png'});
 await page.getByRole('button',{name:'START DELIVERY'}).click();
 await page.keyboard.down('w');await page.evaluate(()=>window.__jugaad.step(5));await page.keyboard.up('w');
 expect(await page.evaluate(()=>window.__jugaad.state.z)).toBeGreaterThan(20);
 expect(await page.evaluate(()=>window.__jugaad.state.collisions)).toBeGreaterThan(0);
 await page.evaluate(()=>window.__jugaad.teleport(46,-3));await page.keyboard.press('e');
 expect(await page.evaluate(()=>window.__jugaad.state.scrap)).toBe(3);
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:/LAGAO JUGAAD/})).toBeVisible();
 await page.getByRole('button',{name:/LAGAO JUGAAD/}).click();
 expect(await page.evaluate(()=>window.__jugaad.state.installed[0].id)).toBe('fan');
 expect(await page.evaluate(()=>window.__jugaad.attachmentCount)).toBe(1);
 await page.evaluate(()=>window.__jugaad.teleport(100));
 await page.keyboard.down('s');await page.evaluate(()=>window.__jugaad.step(2));await page.keyboard.up('s');
 expect(await page.evaluate(()=>window.__jugaad.state.speed)).toBeLessThan(0);
 await page.keyboard.down('w');await page.keyboard.down('a');await page.evaluate(()=>window.__jugaad.step(3));await page.keyboard.up('w');await page.keyboard.up('a');
 expect(await page.evaluate(()=>window.__jugaad.state.x)).toBeLessThan(-1);
 await page.keyboard.press('r');expect(await page.evaluate(()=>window.__jugaad.state.x)).toBe(0);
 await page.evaluate(()=>{window.__jugaad.damage(40);window.__jugaad.state.speed=0;});
 const damaged=await page.evaluate(()=>window.__jugaad.state.health);
 await page.keyboard.press('f');await page.evaluate(()=>window.__jugaad.step(3.2));
 expect(await page.evaluate(()=>window.__jugaad.state.health)).toBeGreaterThan(damaged);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'BACK TO THE ROAD'})).toBeVisible();
 const paused=await page.evaluate(()=>window.__jugaad.state.time);await page.evaluate(()=>window.__jugaad.step(5));expect(await page.evaluate(()=>window.__jugaad.state.time)).toBe(paused);
 await page.getByRole('button',{name:'RESTART DELIVERY'}).click();expect(await page.evaluate(()=>window.__jugaad.state.collisions)).toBe(0);
 expect(errors).toEqual([]);
});

test('all attachments, breakage, mechanic, shortcuts, late arrival and wedding ending',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5188');await page.getByRole('button',{name:'START DELIVERY'}).click();
 for(const [id,slot] of [['tractor','Wheels'],['barrel','Underbody'],['tank','Roof'],['battery','Left'],['turbo','Rear'],['engine','Right']]){
   expect(await page.evaluate(([id,slot])=>{window.__jugaad.state.inventory.push(id);return window.__jugaad.install(id,slot);},[id,slot])).toBe(true);
 }
 expect(await page.evaluate(()=>window.__jugaad.attachmentCount)).toBe(6);
 await page.evaluate(()=>window.__jugaad.teleport(1900,10));await page.keyboard.press('e');expect(await page.evaluate(()=>window.__jugaad.state.shortcuts)).toBe(1);
 await page.evaluate(()=>window.__jugaad.teleport(5050,10));await page.keyboard.press('e');expect(await page.evaluate(()=>window.__jugaad.state.shortcuts)).toBe(2);
 await page.evaluate(()=>window.__jugaad.teleport(2700,-9));await page.keyboard.press('e');await page.getByRole('button',{name:/FREE SERVICE/}).click();
 expect(await page.evaluate(()=>window.__jugaad.state.served.includes(2700))).toBe(true);
 await page.evaluate(()=>window.__jugaad.damage(80));expect(await page.evaluate(()=>window.__jugaad.state.lost)).toBeGreaterThan(0);
 await page.evaluate(()=>{window.__jugaad.state.time=721;window.__jugaad.step(0.1);});expect(await page.evaluate(()=>window.__jugaad.state.late)).toBe(true);
 expect(await page.evaluate(()=>window.__jugaad.state.won)).toBe(false);
 await page.evaluate(()=>{window.__jugaad.teleport(7600);window.__jugaad.step(0.1);});
 await expect(page.getByRole('heading',{name:'SHAADI SAVED.'})).toBeVisible({timeout:30000});
 await page.screenshot({path:'test-results/wedding.png'});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jugaad-express')).bestRating)).toBeGreaterThanOrEqual(0);
 await page.getByRole('button',{name:'ONE MORE DELIVERY'}).click();expect(await page.evaluate(()=>window.__jugaad.state.won)).toBe(false);
 expect(errors).toEqual([]);
});

test('settings persist and instructions are usable',async({page})=>{
 await page.goto('http://127.0.0.1:5188');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
 await page.getByLabel('Sound',{exact:true}).uncheck();await page.getByLabel('Graphics').selectOption('low');await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await expect(page.getByLabel('Sound',{exact:true})).not.toBeChecked();await expect(page.getByLabel('Graphics')).toHaveValue('low');
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'HOW TO PLAY'}).click();await expect(page.getByText('Get the lights back on.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/CHAL, LET'S GO/}).click();await expect(page.locator('#hud')).toBeVisible();
});
