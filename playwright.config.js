import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'tests/browser',fullyParallel:false,workers:1,timeout:30000,
 use:{baseURL:'http://127.0.0.1:4173',headless:true,viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}},
 webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
 reporter:'list'
});
