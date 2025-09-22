// Browserless Integration for Ghost
class BrowserlessController {
    constructor() {
        this.browserlessUrl = 'http://localhost:3010';
        this.browser = null;
        this.page = null;
    }

    async launchBrowser() {
        const code = `
            const page = await browser.newPage();
            await page.goto('https://google.com');
            await page.screenshot({ path: 'screenshot.png' });
            return 'Browser launched!';
        `;
        
        return this.execute(code);
    }

    async execute(code) {
        const response = await fetch(`${this.browserlessUrl}/function`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        return response.json();
    }

    async navigateTo(url) {
        const code = `
            await page.goto('${url}');
            return page.url();
        `;
        return this.execute(code);
    }

    async clickElement(selector) {
        const code = `
            await page.click('${selector}');
            return 'Clicked!';
        `;
        return this.execute(code);
    }

    async typeText(selector, text) {
        const code = `
            await page.type('${selector}', '${text}');
            return 'Typed!';
        `;
        return this.execute(code);
    }
}

window.browserless = new BrowserlessController();
