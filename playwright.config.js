import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  timeout:90000,
  workers:1,
  use:{browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL||undefined,viewport:{width:1366,height:768},headless:true,launchOptions:{args:['--enable-webgl','--ignore-gpu-blocklist']}},
  webServer:{command:'npm run dev -- --port 5188 --strictPort',url:'http://127.0.0.1:5188',reuseExistingServer:!process.env.CI},
});
