import { chromium, Browser, Page } from 'playwright';

class BrowserAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      console.log('Browser initialized');
    }
  }

  async getPage(): Promise<Page> {
    if (!this.browser) {
      await this.initialize();
    }

    if (!this.page) {
      this.page = await this.browser!.newPage();
    }

    return this.page;
  }

  async goto(url: string) {
    const page = await this.getPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    return page;
  }

  async screenshot(path: string) {
    const page = await this.getPage();
    await page.screenshot({ path, fullPage: true });
  }

  async extractText(selector: string): Promise<string | null> {
    const page = await this.getPage();
    const element = await page.$(selector);
    if (!element) return null;
    return await element.textContent();
  }

  async click(selector: string) {
    const page = await this.getPage();
    await page.click(selector);
  }

  async type(selector: string, text: string) {
    const page = await this.getPage();
    await page.fill(selector, text);
  }

  async waitForSelector(selector: string, timeout = 30000) {
    const page = await this.getPage();
    await page.waitForSelector(selector, { timeout });
  }

  async evaluate<T>(fn: () => T): Promise<T> {
    const page = await this.getPage();
    return await page.evaluate(fn);
  }

  async close() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('Browser closed');
    }
  }
}

export const browserAutomation = new BrowserAutomation();
