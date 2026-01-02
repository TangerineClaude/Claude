const { chromium } = require('playwright');
const CredentialManager = require('../security/credentials');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class BrowserAgent {
  constructor() {
    this.browser = null;
    this.context = null;
    this.sessionsDir = path.join(__dirname, '../../.sessions');
  }

  async initialize(headless = true) {
    if (this.browser) {
      return;
    }

    // Ensure sessions directory exists
    await fs.mkdir(this.sessionsDir, { recursive: true });

    this.browser = await chromium.launch({
      headless: headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    logger.info('Browser initialized', { headless });
  }

  async createContext(platform = null) {
    if (!this.browser) {
      await this.initialize();
    }

    // Check if we have saved session for this platform
    let sessionData = null;
    if (platform) {
      sessionData = await this.loadSession(platform);
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(sessionData && { storageState: sessionData })
    });

    return this.context;
  }

  async newPage() {
    if (!this.context) {
      await this.createContext();
    }

    return await this.context.newPage();
  }

  async saveSession(platform) {
    if (!this.context) {
      throw new Error('No active context to save');
    }

    const sessionFile = path.join(this.sessionsDir, `${platform}.json`);
    const state = await this.context.storageState();

    await fs.writeFile(sessionFile, JSON.stringify(state, null, 2));
    logger.info('Session saved', { platform, file: sessionFile });

    // Also save to database
    await CredentialManager.updateSessionData(platform, state);
  }

  async loadSession(platform) {
    const sessionFile = path.join(this.sessionsDir, `${platform}.json`);

    try {
      const data = await fs.readFile(sessionFile, 'utf-8');
      logger.info('Session loaded from file', { platform });
      return JSON.parse(data);
    } catch (error) {
      // Try loading from database
      try {
        const creds = await CredentialManager.getCredentials(platform);
        if (creds.sessionData) {
          logger.info('Session loaded from database', { platform });
          return creds.sessionData;
        }
      } catch (dbError) {
        logger.debug('No saved session found', { platform });
      }

      return null;
    }
  }

  async loginToChatGPT(credentials) {
    const page = await this.newPage();

    try {
      logger.info('Navigating to ChatGPT login');
      await page.goto('https://chat.openai.com/auth/login', { waitUntil: 'networkidle' });

      // Click login button
      await page.click('button:has-text("Log in")');
      await page.waitForTimeout(2000);

      // Enter email
      logger.info('Entering email');
      await page.fill('input[name="username"]', credentials.email);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Enter password
      logger.info('Entering password');
      await page.fill('input[name="password"]', credentials.password);
      await page.click('button[type="submit"]');

      // Wait for successful login (check for chat interface)
      await page.waitForSelector('[data-testid="chat-input"]', { timeout: 30000 });

      logger.info('Successfully logged into ChatGPT');

      // Save session
      await this.saveSession('chatgpt');

      return { success: true, message: 'Logged in successfully' };
    } catch (error) {
      logger.error('ChatGPT login failed:', error);

      // Take screenshot for debugging
      await page.screenshot({ path: path.join(this.sessionsDir, 'chatgpt-error.png') });

      throw new Error(`Login failed: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async exportChatGPTChats(outputDir) {
    const page = await this.newPage();
    const exportedChats = [];

    try {
      // Navigate to ChatGPT
      await page.goto('https://chat.openai.com', { waitUntil: 'networkidle' });

      // Check if we're logged in
      const isLoggedIn = await page.isVisible('[data-testid="chat-input"]');
      if (!isLoggedIn) {
        throw new Error('Not logged in to ChatGPT. Please login first.');
      }

      // Get all chat items from sidebar
      await page.waitForSelector('[data-testid="history-item"]', { timeout: 10000 });
      const chatItems = await page.$$('[data-testid="history-item"]');

      logger.info(`Found ${chatItems.length} chats to export`);

      for (let i = 0; i < chatItems.length; i++) {
        try {
          // Click on chat
          await chatItems[i].click();
          await page.waitForTimeout(2000);

          // Get chat title
          const title = await page.textContent('h1') || `chat_${i + 1}`;
          const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

          // Export as PDF
          const pdfPath = path.join(outputDir, `${safeTitle}.pdf`);
          await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true
          });

          exportedChats.push({
            title,
            path: pdfPath,
            index: i + 1
          });

          logger.info(`Exported chat ${i + 1}/${chatItems.length}: ${title}`);
        } catch (error) {
          logger.error(`Failed to export chat ${i + 1}:`, error);
        }
      }

      return {
        success: true,
        exportedChats,
        totalChats: chatItems.length
      };
    } catch (error) {
      logger.error('ChatGPT export failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async navigateAndPerform(url, actions) {
    const page = await this.newPage();

    try {
      logger.info('Navigating to URL', { url });
      await page.goto(url, { waitUntil: 'networkidle' });

      const results = [];

      for (const action of actions) {
        logger.info('Performing action', { action: action.type });

        switch (action.type) {
          case 'click':
            await page.click(action.selector);
            results.push({ action: 'click', selector: action.selector, success: true });
            break;

          case 'fill':
            await page.fill(action.selector, action.value);
            results.push({ action: 'fill', selector: action.selector, success: true });
            break;

          case 'wait':
            await page.waitForTimeout(action.duration || 1000);
            results.push({ action: 'wait', duration: action.duration, success: true });
            break;

          case 'waitForSelector':
            await page.waitForSelector(action.selector, { timeout: action.timeout || 30000 });
            results.push({ action: 'waitForSelector', selector: action.selector, success: true });
            break;

          case 'screenshot':
            const screenshotPath = path.join(this.sessionsDir, action.filename || 'screenshot.png');
            await page.screenshot({ path: screenshotPath, fullPage: action.fullPage || false });
            results.push({ action: 'screenshot', path: screenshotPath, success: true });
            break;

          case 'extract':
            const content = await page.textContent(action.selector);
            results.push({ action: 'extract', selector: action.selector, content, success: true });
            break;

          default:
            logger.warn('Unknown action type', { type: action.type });
        }

        // Optional delay between actions
        if (action.waitAfter) {
          await page.waitForTimeout(action.waitAfter);
        }
      }

      return { success: true, results };
    } catch (error) {
      logger.error('Browser automation failed:', error);

      // Take screenshot on error
      await page.screenshot({
        path: path.join(this.sessionsDir, 'automation-error.png')
      });

      throw error;
    } finally {
      await page.close();
    }
  }

  async solveCaptcha(pageUrl) {
    // For MVP, we'll ask the user to solve it
    // Future: integrate with 2Captcha or similar service
    logger.info('CAPTCHA detected, requesting user assistance');

    return {
      success: false,
      requiresUserAction: true,
      message: 'CAPTCHA detected. Please check your SMS for the link to solve it.',
      pageUrl
    };
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  async cleanup() {
    await this.close();
  }
}

module.exports = BrowserAgent;
