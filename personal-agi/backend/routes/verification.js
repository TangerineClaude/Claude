const express = require('express');
const router = express.Router();
const VerificationManager = require('../security/verification');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

/**
 * POST /api/verification/sms-webhook
 * Webhook for incoming SMS from Twilio
 */
router.post('/sms-webhook', async (req, res) => {
  try {
    const { From, Body } = req.body;

    logger.info('Received SMS webhook', { from: From, body: Body });

    const result = await VerificationManager.handleIncomingSMS(From, Body);

    // Respond to Twilio
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${result.message}</Message>
</Response>`);
  } catch (error) {
    logger.error('SMS webhook error:', error);
    res.status(500).send('Error processing SMS');
  }
});

/**
 * POST /api/verification/approve
 * Manually approve a verification
 */
router.post('/approve', async (req, res) => {
  try {
    const { verificationId } = req.body;

    if (!verificationId) {
      return res.status(400).json({ error: 'verificationId is required' });
    }

    await VerificationManager.approveVerification(verificationId);

    res.json({ success: true, message: 'Verification approved' });
  } catch (error) {
    logger.error('Approve verification error:', error);
    res.status(500).json({ error: 'Failed to approve verification' });
  }
});

/**
 * POST /api/verification/reject
 * Manually reject a verification
 */
router.post('/reject', async (req, res) => {
  try {
    const { verificationId } = req.body;

    if (!verificationId) {
      return res.status(400).json({ error: 'verificationId is required' });
    }

    await VerificationManager.rejectVerification(verificationId);

    res.json({ success: true, message: 'Verification rejected' });
  } catch (error) {
    logger.error('Reject verification error:', error);
    res.status(500).json({ error: 'Failed to reject verification' });
  }
});

/**
 * POST /api/verification/verify-code
 * Verify a code
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { verificationId, code } = req.body;

    if (!verificationId || !code) {
      return res.status(400).json({ error: 'verificationId and code are required' });
    }

    const approved = await VerificationManager.verifyCode(verificationId, code);

    res.json({
      success: approved,
      message: approved ? 'Verification approved' : 'Invalid code'
    });
  } catch (error) {
    logger.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

module.exports = router;
