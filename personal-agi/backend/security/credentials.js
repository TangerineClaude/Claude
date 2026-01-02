const crypto = require('crypto');
const Database = require('../memory/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class CredentialManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      logger.warn('ENCRYPTION_KEY not set or too short. Using default (INSECURE for production!)');
      this.encryptionKey = 'default_key_change_this_in_production!!!';
    }
  }

  /**
   * Encrypt credential data
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt credential data
   */
  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Save credentials for a platform
   */
  async saveCredentials(platform, credentials, sessionData = null) {
    const credentialData = {
      username: credentials.username,
      password: credentials.password,
      email: credentials.email,
      apiKey: credentials.apiKey,
      token: credentials.token,
      metadata: credentials.metadata
    };

    const encryptedData = this.encrypt(JSON.stringify(credentialData));

    await Database.saveCredentials(
      platform,
      credentials.username || credentials.email,
      encryptedData,
      sessionData
    );

    logger.info('Credentials saved', { platform, username: credentials.username || credentials.email });
  }

  /**
   * Retrieve credentials for a platform
   */
  async getCredentials(platform) {
    const result = await Database.getCredentials(platform);

    if (!result) {
      throw new Error(`No credentials found for platform: ${platform}`);
    }

    const decryptedData = this.decrypt(result.encrypted_data);
    const credentials = JSON.parse(decryptedData);

    return {
      ...credentials,
      sessionData: result.session_data,
      lastUsed: result.last_used,
      usageCount: result.usage_count
    };
  }

  /**
   * Update session data (cookies, tokens) for a platform
   */
  async updateSessionData(platform, sessionData) {
    const existing = await Database.getCredentials(platform);

    if (!existing) {
      throw new Error(`No credentials found for platform: ${platform}`);
    }

    await Database.query(
      `UPDATE credentials SET session_data = $1, updated_at = NOW() WHERE platform = $2`,
      [JSON.stringify(sessionData), platform]
    );

    logger.info('Session data updated', { platform });
  }

  /**
   * Delete credentials for a platform
   */
  async deleteCredentials(platform) {
    await Database.query('DELETE FROM credentials WHERE platform = $1', [platform]);
    logger.info('Credentials deleted', { platform });
  }

  /**
   * List all stored platforms
   */
  async listPlatforms() {
    const result = await Database.query(
      'SELECT platform, username, last_used, usage_count FROM credentials ORDER BY last_used DESC'
    );

    return result.rows;
  }

  /**
   * Check if credentials exist for a platform
   */
  async hasCredentials(platform) {
    const result = await Database.query(
      'SELECT COUNT(*) as count FROM credentials WHERE platform = $1',
      [platform]
    );

    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = new CredentialManager();
