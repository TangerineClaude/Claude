"""
Email Channel Handler for Marketplace Agent
Handles automated email responses using SMTP/IMAP
"""

import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional
from datetime import datetime
import time
import json


class EmailHandler:
    """
    Handles automated email communication for marketplace listings

    Supports:
    - Gmail, Outlook, Yahoo, and custom SMTP/IMAP servers
    - Automated response to inquiries
    - Thread tracking
    - HTML and plain text emails
    """

    def __init__(self, email_config: Dict):
        """
        Initialize email handler

        Args:
            email_config: Dict containing:
                - email: Email address
                - password: Email password or app-specific password
                - smtp_server: SMTP server (default: smtp.gmail.com)
                - smtp_port: SMTP port (default: 587)
                - imap_server: IMAP server (default: imap.gmail.com)
                - imap_port: IMAP port (default: 993)
        """
        self.email_address = email_config['email']
        self.password = email_config['password']
        self.smtp_server = email_config.get('smtp_server', 'smtp.gmail.com')
        self.smtp_port = email_config.get('smtp_port', 587)
        self.imap_server = email_config.get('imap_server', 'imap.gmail.com')
        self.imap_port = email_config.get('imap_port', 993)

        self.processed_emails = set()  # Track processed email IDs

    def send_email(self, to_email: str, subject: str, body: str,
                   reply_to_message_id: Optional[str] = None) -> bool:
        """
        Send an email response

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (plain text)
            reply_to_message_id: Original message ID for threading

        Returns:
            True if sent successfully
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.email_address
            msg['To'] = to_email
            msg['Subject'] = subject
            msg['Date'] = email.utils.formatdate(localtime=True)

            # Add reply headers for threading
            if reply_to_message_id:
                msg['In-Reply-To'] = reply_to_message_id
                msg['References'] = reply_to_message_id

            # Add body (plain text and HTML)
            plain_part = MIMEText(body, 'plain')
            html_body = self._convert_to_html(body)
            html_part = MIMEText(html_body, 'html')

            msg.attach(plain_part)
            msg.attach(html_part)

            # Send via SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email_address, self.password)
                server.send_message(msg)

            print(f"✓ Email sent to {to_email}")
            return True

        except Exception as e:
            print(f"✗ Failed to send email: {e}")
            return False

    def check_inbox(self, agent_callback, product_name: str = None) -> int:
        """
        Check inbox for new messages and process them with agent

        Args:
            agent_callback: Function to call with (message, channel_data)
            product_name: Filter for specific product (optional)

        Returns:
            Number of messages processed
        """
        processed_count = 0

        try:
            # Connect to IMAP
            mail = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
            mail.login(self.email_address, self.password)
            mail.select('inbox')

            # Search for unread messages
            status, message_ids = mail.search(None, 'UNSEEN')

            if status != 'OK':
                return 0

            # Process each message
            for msg_id in message_ids[0].split():
                try:
                    # Fetch message
                    status, msg_data = mail.fetch(msg_id, '(RFC822)')
                    if status != 'OK':
                        continue

                    # Parse email
                    raw_email = msg_data[0][1]
                    email_message = email.message_from_bytes(raw_email)

                    # Extract details
                    from_email = email.utils.parseaddr(email_message['From'])[1]
                    subject = email_message['Subject']
                    message_id = email_message['Message-ID']

                    # Skip if already processed
                    if message_id in self.processed_emails:
                        continue

                    # Filter by product if specified
                    if product_name and product_name.lower() not in subject.lower():
                        continue

                    # Extract body
                    body = self._extract_body(email_message)

                    # Prepare channel data
                    channel_data = {
                        'email': from_email,
                        'message_id': message_id,
                        'subject': subject,
                        'thread_id': email_message.get('References', message_id)
                    }

                    # Process with agent
                    response = agent_callback(body, 'email', channel_data)

                    # Send response if not escalated
                    if response.get('response') and not response.get('action') == 'scam_blocked':
                        # Create subject for reply
                        reply_subject = f"Re: {subject}" if not subject.startswith('Re:') else subject

                        self.send_email(
                            to_email=from_email,
                            subject=reply_subject,
                            body=response['response'],
                            reply_to_message_id=message_id
                        )

                    # Mark as processed
                    self.processed_emails.add(message_id)
                    processed_count += 1

                except Exception as e:
                    print(f"✗ Error processing email {msg_id}: {e}")
                    continue

            mail.close()
            mail.logout()

        except Exception as e:
            print(f"✗ Failed to check inbox: {e}")

        return processed_count

    def monitor_inbox(self, agent_callback, product_name: str = None,
                     interval_seconds: int = 60):
        """
        Continuously monitor inbox for new messages

        Args:
            agent_callback: Function to call with (message, channel_data)
            product_name: Filter for specific product (optional)
            interval_seconds: How often to check (default: 60)
        """
        print(f"📧 Monitoring {self.email_address} every {interval_seconds}s...")

        while True:
            try:
                count = self.check_inbox(agent_callback, product_name)
                if count > 0:
                    print(f"✓ Processed {count} new messages")

                time.sleep(interval_seconds)

            except KeyboardInterrupt:
                print("\n✓ Email monitoring stopped")
                break
            except Exception as e:
                print(f"✗ Monitor error: {e}")
                time.sleep(interval_seconds)

    def _extract_body(self, email_message) -> str:
        """Extract plain text body from email"""
        body = ""

        if email_message.is_multipart():
            for part in email_message.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                # Get plain text parts
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        body = part.get_payload(decode=True).decode()
                        break
                    except:
                        pass
        else:
            try:
                body = email_message.get_payload(decode=True).decode()
            except:
                body = str(email_message.get_payload())

        # Clean up body (remove quoted replies)
        lines = body.split('\n')
        clean_lines = []
        for line in lines:
            # Stop at common reply indicators
            if line.startswith('>') or line.startswith('On ') and ' wrote:' in line:
                break
            clean_lines.append(line)

        return '\n'.join(clean_lines).strip()

    def _convert_to_html(self, plain_text: str) -> str:
        """Convert plain text to simple HTML"""
        # Simple conversion: preserve line breaks
        html = plain_text.replace('\n', '<br>\n')

        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
            {html}
            <br><br>
            <p style="color: #888; font-size: 12px;">
                This is an automated response from a marketplace listing agent.
            </p>
        </body>
        </html>
        """

    @staticmethod
    def get_provider_config(provider: str, email_address: str, password: str) -> Dict:
        """
        Get pre-configured settings for common email providers

        Args:
            provider: 'gmail', 'outlook', 'yahoo', etc.
            email_address: Your email address
            password: Your password or app-specific password

        Returns:
            Email configuration dict
        """
        configs = {
            'gmail': {
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'imap_server': 'imap.gmail.com',
                'imap_port': 993
            },
            'outlook': {
                'smtp_server': 'smtp-mail.outlook.com',
                'smtp_port': 587,
                'imap_server': 'outlook.office365.com',
                'imap_port': 993
            },
            'yahoo': {
                'smtp_server': 'smtp.mail.yahoo.com',
                'smtp_port': 587,
                'imap_server': 'imap.mail.yahoo.com',
                'imap_port': 993
            }
        }

        config = configs.get(provider.lower(), configs['gmail'])
        config['email'] = email_address
        config['password'] = password

        return config
