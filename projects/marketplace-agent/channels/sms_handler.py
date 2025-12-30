"""
SMS Channel Handler for Marketplace Agent
Handles automated SMS responses using Twilio API
"""

from typing import Dict, Optional, Callable
import time


class SMSHandler:
    """
    Handles automated SMS communication for marketplace listings

    Uses Twilio API for sending/receiving SMS messages
    """

    def __init__(self, sms_config: Dict):
        """
        Initialize SMS handler

        Args:
            sms_config: Dict containing:
                - account_sid: Twilio account SID
                - auth_token: Twilio auth token
                - phone_number: Your Twilio phone number
        """
        self.account_sid = sms_config.get('account_sid')
        self.auth_token = sms_config.get('auth_token')
        self.phone_number = sms_config.get('phone_number')

        # Import Twilio only if credentials provided
        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self.client = Client(self.account_sid, self.auth_token)
                self.enabled = True
            except ImportError:
                print("⚠ Twilio not installed. Run: pip install twilio")
                self.enabled = False
        else:
            print("⚠ SMS not configured (missing Twilio credentials)")
            self.enabled = False

        self.processed_messages = set()

    def send_sms(self, to_phone: str, message: str) -> bool:
        """
        Send an SMS message

        Args:
            to_phone: Recipient phone number (E.164 format)
            message: Message text (max 1600 chars for concatenated SMS)

        Returns:
            True if sent successfully
        """
        if not self.enabled:
            print("✗ SMS not enabled")
            return False

        try:
            # Truncate long messages
            if len(message) > 1600:
                message = message[:1597] + "..."

            # Send message
            msg = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_phone
            )

            print(f"✓ SMS sent to {to_phone} (SID: {msg.sid})")
            return True

        except Exception as e:
            print(f"✗ Failed to send SMS: {e}")
            return False

    def check_messages(self, agent_callback: Callable, since_minutes: int = 5) -> int:
        """
        Check for new incoming messages and process them

        Args:
            agent_callback: Function to call with (message, channel_data)
            since_minutes: How far back to check (default: 5 minutes)

        Returns:
            Number of messages processed
        """
        if not self.enabled:
            return 0

        processed_count = 0

        try:
            from datetime import datetime, timedelta

            # Get messages from last N minutes
            since_time = datetime.utcnow() - timedelta(minutes=since_minutes)

            messages = self.client.messages.list(
                to=self.phone_number,
                date_sent_after=since_time
            )

            for msg in messages:
                # Skip if already processed
                if msg.sid in self.processed_messages:
                    continue

                # Extract details
                from_phone = msg.from_
                body = msg.body

                # Prepare channel data
                channel_data = {
                    'phone': from_phone,
                    'message_id': msg.sid,
                    'user_id': from_phone
                }

                # Process with agent
                response = agent_callback(body, 'sms', channel_data)

                # Send response if not escalated or scam
                if response.get('response') and response.get('action') != 'scam_blocked':
                    self.send_sms(from_phone, response['response'])

                # Mark as processed
                self.processed_messages.add(msg.sid)
                processed_count += 1

        except Exception as e:
            print(f"✗ Failed to check messages: {e}")

        return processed_count

    def monitor_messages(self, agent_callback: Callable, interval_seconds: int = 30):
        """
        Continuously monitor for new SMS messages

        Args:
            agent_callback: Function to call with (message, channel_data)
            interval_seconds: How often to check (default: 30)
        """
        if not self.enabled:
            print("✗ SMS monitoring disabled (not configured)")
            return

        print(f"📱 Monitoring SMS on {self.phone_number} every {interval_seconds}s...")

        while True:
            try:
                count = self.check_messages(agent_callback)
                if count > 0:
                    print(f"✓ Processed {count} new SMS messages")

                time.sleep(interval_seconds)

            except KeyboardInterrupt:
                print("\n✓ SMS monitoring stopped")
                break
            except Exception as e:
                print(f"✗ Monitor error: {e}")
                time.sleep(interval_seconds)

    def setup_webhook(self, webhook_url: str) -> bool:
        """
        Setup webhook for real-time message delivery (more efficient than polling)

        Args:
            webhook_url: Public URL to receive webhook POSTs

        Returns:
            True if configured successfully
        """
        if not self.enabled:
            return False

        try:
            # Update phone number webhook URL
            phone_number = self.client.incoming_phone_numbers.list(
                phone_number=self.phone_number
            )[0]

            phone_number.update(sms_url=webhook_url)

            print(f"✓ Webhook configured: {webhook_url}")
            return True

        except Exception as e:
            print(f"✗ Failed to setup webhook: {e}")
            return False

    @staticmethod
    def format_phone_e164(phone: str, country_code: str = '+1') -> str:
        """
        Format phone number to E.164 standard

        Args:
            phone: Phone number in any format
            country_code: Country code (default: +1 for US)

        Returns:
            E.164 formatted phone number
        """
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, phone))

        # Add country code if not present
        if not digits.startswith('1'):
            digits = country_code.replace('+', '') + digits

        return '+' + digits

    @staticmethod
    def parse_webhook_request(request_data: Dict) -> Dict:
        """
        Parse incoming Twilio webhook request

        Args:
            request_data: POST data from Twilio webhook

        Returns:
            Dict with parsed message data
        """
        return {
            'from': request_data.get('From'),
            'to': request_data.get('To'),
            'body': request_data.get('Body'),
            'message_sid': request_data.get('MessageSid'),
            'timestamp': request_data.get('DateSent')
        }


# Flask webhook example (for reference)
"""
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)
agent = MarketplaceAgent('config/product.json')
sms_handler = SMSHandler(sms_config)

@app.route('/sms', methods=['POST'])
def sms_webhook():
    # Parse incoming message
    from_phone = request.form.get('From')
    body = request.form.get('Body')

    # Process with agent
    channel_data = {'phone': from_phone}
    response = agent.process_inquiry(body, 'sms', channel_data)

    # Create TwiML response
    resp = MessagingResponse()
    if response.get('response'):
        resp.message(response['response'])

    return str(resp)

if __name__ == '__main__':
    app.run(port=5000)
"""
