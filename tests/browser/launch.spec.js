import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

test('direct-file launch explains the server and HTTP launch starts the game',async({page})=>{
  await page.goto(pathToFileURL(resolve('index.html')).href);
  await expect(page.getByText('Close this tab, return to the game folder, and double-click Start Game.cmd.')).toBeVisible();
  await page.goto('http://127.0.0.1:5188');
  await page.getByRole('button',{name:'START DELIVERY'}).click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#launch-help')).toHaveCount(0);
});