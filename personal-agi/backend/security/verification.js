const twilio = require('twilio');
const Database = require('../memory/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class VerificationManager {
  constructor() {
    this.twilioClient = null;
    this.userPhoneNumber = process.env.USER_PHONE_NUMBER;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  /**
   * Determine verification level needed for an action
   */
  getVerificationLevel(action) {
    const actionType = action.type || action.task_type;
    const lowerAction = (action.description || '').toLowerCase();

    // Financial transactions - highest security
    if (lowerAction.includes('pay') || lowerAction.includes('transfer') ||
        lowerAction.includes('purchase') || actionType === 'financial') {
      return 'nfc_required';
    }

    // Account creation
    if (lowerAction.includes('create account') || lowerAction.includes('sign up')) {
      return 'nfc_required';
    }

    // Credential usage - notify with option to stop
    if (action.requires_credentials || lowerAction.includes('login') || lowerAction.includes('credentials')) {
      return 'sms_notify';
    }

    // Deployment operations - async notification
    if (actionType === 'deployment' || lowerAction.includes('deploy')) {
      return 'sms_notify';
    }

    // CAPTCHA solving - send link
    if (lowerAction.includes('captcha')) {
      return 'sms_confirm';
    }

    // Reading/browsing - no verification
    if (actionType === 'research' || actionType === 'api_call' && lowerAction.includes('read')) {
      return 'none';
    }

    // Default to notification for safety
    return 'sms_notify';
  }

  /**
   * Execute action with appropriate verification
   */
  async executeWithVerification(action, executeFunction) {
    const verificationLevel = this.getVerificationLevel(action);
    logger.info('Executing action with verification', { action: action.description, level: verificationLevel });

    try {
      if (verificationLevel === 'none') {
        // Execute directly
        return await executeFunction();
      }

      if (verificationLevel === 'sms_notify') {
        // Send notification with option to cancel
        const verification = await this.sendSMSNotification(action);

        // Wait 30 seconds for potential cancellation
        await this.waitForCancellation(verification.id, 30000);

        // If not cancelled, proceed
        return await executeFunction();
      }

      if (verificationLevel === 'sms_confirm') {
        // Send confirmation request and wait for approval
        const verification = await this.sendSMSConfirmation(action);

        // Wait for user to confirm (5 minute timeout)
        const approved = await this.waitForConfirmation(verification.id, 300000);

        if (!approved) {
          throw new Error('Verification timeout or rejected');
        }

        return await executeFunction();
      }

      if (verificationLevel === 'nfc_required') {
        // Send NFC verification request
        const verification = await this.sendNFCVerification(action);

        // Wait for NFC verification (5 minute timeout)
        const approved = await this.waitForNFCVerification(verification.id, 300000);

        if (!approved) {
          throw new Error('NFC verification timeout or rejected');
        }

        return await executeFunction();
      }

      throw new Error(`Unknown verification level: ${verificationLevel}`);
    } catch (error) {
      logger.error('Verification failed:', { action: action.description, error: error.message });
      throw error;
    }
  }

  /**
   * Send SMS notification (user can cancel within window)
   */
  async sendSMSNotification(action) {
    const message = `🤖 Personal AGI: ${action.description}\n\nI'm proceeding in 30 seconds. Reply STOP to cancel.`;

    if (this.twilioClient && this.userPhoneNumber) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: this.userPhoneNumber
        });

        logger.info('SMS notification sent', { action: action.description });
      } catch (error) {
        logger.error('Failed to send SMS:', error);
      }
    } else {
      logger.warn('SMS not configured, skipping notification');
    }

    // Create verification record
    const verification = await Database.createVerification(
      action.task_id,
      'sms',
      30 // 30 second expiry
    );

    return verification;
  }

  /**
   * Send SMS confirmation request
   */
  async sendSMSConfirmation(action) {
    const verification = await Database.createVerification(
      action.task_id,
      'sms',
      300 // 5 minute expiry
    );

    const message = `🤖 Personal AGI: ${action.description}\n\nReply with code ${verification.verification_code} to confirm.`;

    if (this.twilioClient && this.userPhoneNumber) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: this.userPhoneNumber
        });

        logger.info('SMS confirmation sent', { action: action.description, code: verification.verification_code });
      } catch (error) {
        logger.error('Failed to send SMS:', error);
      }
    } else {
      logger.warn('SMS not configured, skipping confirmation');
    }

    return verification;
  }

  /**
   * Send NFC verification request
   */
  async sendNFCVerification(action) {
    const verification = await Database.createVerification(
      action.task_id,
      'nfc',
      300 // 5 minute expiry
    );

    const message = `🤖 Personal AGI: ${action.description}\n\nTap your NFC tag to confirm. Session: ${verification.id.substring(0, 8)}`;

    if (this.twilioClient && this.userPhoneNumber) {
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: this.userPhoneNumber
        });

        logger.info('NFC verification requested', { action: action.description });
      } catch (error) {
        logger.error('Failed to send SMS:', error);
      }
    } else {
      logger.warn('SMS not configured, skipping NFC request');
    }

    return verification;
  }

  /**
   * Wait for potential cancellation
   */
  async waitForCancellation(verificationId, timeoutMs) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(async () => {
        // Check if verification was rejected
        const result = await Database.query(
          'SELECT status FROM verifications WHERE id = $1',
          [verificationId]
        );

        if (result.rows[0]?.status === 'rejected') {
          clearInterval(checkInterval);
          throw new Error('Action cancelled by user');
        }

        // Check timeout
        if (Date.now() - startTime >= timeoutMs) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Wait for confirmation
   */
  async waitForConfirmation(verificationId, timeoutMs) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(async () => {
        const result = await Database.query(
          'SELECT status FROM verifications WHERE id = $1',
          [verificationId]
        );

        const status = result.rows[0]?.status;

        if (status === 'approved') {
          clearInterval(checkInterval);
          resolve(true);
        }

        if (status === 'rejected' || Date.now() - startTime >= timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Wait for NFC verification
   */
  async waitForNFCVerification(verificationId, timeoutMs) {
    // Same as waitForConfirmation for now
    return await this.waitForConfirmation(verificationId, timeoutMs);
  }

  /**
   * Verify SMS code
   */
  async verifyCode(verificationId, code) {
    const result = await Database.verifyCode(verificationId, code);
    return result.status === 'approved';
  }

  /**
   * Manually approve verification (for testing or web interface)
   */
  async approveVerification(verificationId) {
    await Database.query(
      'UPDATE verifications SET status = $2, responded_at = NOW() WHERE id = $1',
      [verificationId, 'approved']
    );

    logger.info('Verification manually approved', { verificationId });
  }

  /**
   * Manually reject verification
   */
  async rejectVerification(verificationId) {
    await Database.query(
      'UPDATE verifications SET status = $2, responded_at = NOW() WHERE id = $1',
      [verificationId, 'rejected']
    );

    logger.info('Verification manually rejected', { verificationId });
  }

  /**
   * Handle incoming SMS (webhook from Twilio)
   */
  async handleIncomingSMS(from, body) {
    const normalizedBody = body.trim().toUpperCase();

    // Check for STOP command
    if (normalizedBody === 'STOP') {
      // Find most recent pending verification
      const result = await Database.query(
        `SELECT id FROM verifications
         WHERE status = 'pending' AND method = 'sms'
         ORDER BY created_at DESC LIMIT 1`
      );

      if (result.rows.length > 0) {
        await this.rejectVerification(result.rows[0].id);
        return { success: true, message: 'Action cancelled' };
      }

      return { success: false, message: 'No pending action to cancel' };
    }

    // Check for verification code
    const codeMatch = normalizedBody.match(/\d{6}/);
    if (codeMatch) {
      const code = codeMatch[0];

      // Find verification with this code
      const result = await Database.query(
        `SELECT id FROM verifications
         WHERE verification_code = $1 AND status = 'pending' AND expires_at > NOW()`,
        [code]
      );

      if (result.rows.length > 0) {
        const approved = await this.verifyCode(result.rows[0].id, code);
        return {
          success: approved,
          message: approved ? 'Verification approved' : 'Invalid code'
        };
      }

      return { success: false, message: 'Invalid or expired code' };
    }

    return { success: false, message: 'Unknown command' };
  }
}

module.exports = new VerificationManager();
