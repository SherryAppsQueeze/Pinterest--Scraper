const puppeteer = require('puppeteer');
const baseUrl = 'https://pindown.io/';

async function scrapeLinksFromUrl(url, options = {}) {
    const { onRetry } = options;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let browser;
        try {
            browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();

            // Increase timeouts to reduce spurious timeouts
            page.setDefaultNavigationTimeout(45000);
            page.setDefaultTimeout(45000);

            await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 45000 });
            await page.type('input.input-url', url);
            await page.click('button#send');
            await page.waitForSelector('div.container.download-box', { timeout: 45000 });

            const tableData = await page.evaluate(() => {
                const rows = document.querySelectorAll('table.table.is-fullwidth tbody tr');
                return Array.from(rows).map(row => ({
                    type: row.querySelector('td.video-quality')?.innerText.trim(),
                    downloadLink: row.querySelector('a.button.is-success')?.href
                })).filter(r => r.type && r.downloadLink);
            });

            await browser.close();
            return tableData;
        } catch (err) {
            const isTimeout = /Navigation timeout|Timeout exceeded|waiting for selector/i.test(err?.message || '');
            console.error(`Scraping error (attempt ${attempt}/${maxAttempts}) for ${url}: ${err.message}`);
            if (browser) {
                try { await browser.close(); } catch (_) {}
            }
            if (isTimeout && attempt < maxAttempts) {
                if (typeof onRetry === 'function') {
                    try {
                        onRetry({ url, attempt, maxAttempts, reason: 'timeout', message: err.message });
                    } catch (_) {}
                }
                const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
                await new Promise(r => setTimeout(r, backoffMs));
                continue; // retry
            }
            // Non-timeout or last attempt: give up
            return [];
        }
    }
    return [];
}

module.exports = { scrapeLinksFromUrl };
