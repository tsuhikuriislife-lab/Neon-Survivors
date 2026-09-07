const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

const app = express();
const port = 8888;

app.use('/', express.static(__dirname));

const server = app.listen(port, async () => {
    console.log(`Test server running on port ${port}`);

    try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        let errorsFound = 0;

        page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('favicon.ico') && !msg.text().includes('404 (Not Found)')) {
                console.error(`[BROWSER ERROR] ${msg.text()}`);
                errorsFound++;
            }
        });

        page.on('response', response => {
            if (!response.ok() && !response.url().includes('favicon.ico')) {
                console.error(`[NETWORK ERROR] Failed to load ${response.url()} (Status: ${response.status()})`);
                errorsFound++;
            }
        });

        page.on('pageerror', err => {
            console.error(`[RUNTIME ERROR] ${err.toString()}`);
            errorsFound++;
        });

        console.log("Loading game...");
        await page.goto(`http://localhost:${port}/index.html`);

        await new Promise(r => setTimeout(r, 1000));

        console.log("Clicking start button...");
        await page.evaluate(() => {
            const btn = document.getElementById('btnStartGame');
            if (btn) btn.click();
        });
        
        await new Promise(r => setTimeout(r, 1000));

        console.log("Triggering Quick Test...");
        const clicked = await page.evaluate(() => {
            const btn = document.getElementById('quick-test-btn');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });

        if (!clicked) console.warn("WARNING: #quick-test-btn not found.");

        console.log("Letting the game run for 10 seconds...");
        await new Promise(r => setTimeout(r, 10000));

        await browser.close();

        if (errorsFound > 0) {
            console.error(`\nSmoke test FAILED with ${errorsFound} errors.`);
            process.exit(1);
        } else {
            console.log("\nSmoke test PASSED! No console errors detected.");
            process.exit(0);
        }
    } catch (err) {
        console.error("Test framework error:", err);
        process.exit(1);
    } finally {
        server.close();
    }
});
