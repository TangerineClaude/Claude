"""
Payment Processing Integration
Handles PayPal, Venmo, and other payment methods
"""

from typing import Dict, Optional
from datetime import datetime


class PaymentProcessor:
    """
    Unified payment processing handler

    Supports:
    - PayPal
    - Venmo
    - Cash (tracking only)
    - Payment links generation
    """

    def __init__(self, payment_config: Dict):
        """
        Initialize payment processor

        Args:
            payment_config: Dict containing:
                - paypal_email: PayPal account email
                - venmo_username: Venmo username
                - cash_enabled: Whether to accept cash
        """
        self.paypal_email = payment_config.get('paypal_email')
        self.venmo_username = payment_config.get('venmo_username')
        self.cash_enabled = payment_config.get('cash_enabled', True)

    def generate_payment_request(self, amount: float, description: str,
                                buyer_info: Dict) -> Dict:
        """
        Generate payment request links

        Args:
            amount: Payment amount
            description: Item description
            buyer_info: Buyer contact information

        Returns:
            Dict with payment options and links
        """
        payment_options = {
            'amount': amount,
            'description': description,
            'methods': []
        }

        # PayPal payment link
        if self.paypal_email:
            paypal_link = self._generate_paypal_link(amount, description)
            payment_options['methods'].append({
                'type': 'paypal',
                'link': paypal_link,
                'instructions': f"Send ${amount:.2f} to {self.paypal_email} via PayPal"
            })

        # Venmo payment link
        if self.venmo_username:
            venmo_link = self._generate_venmo_link(amount, description)
            payment_options['methods'].append({
                'type': 'venmo',
                'link': venmo_link,
                'instructions': f"Send ${amount:.2f} to @{self.venmo_username} on Venmo"
            })

        # Cash option
        if self.cash_enabled:
            payment_options['methods'].append({
                'type': 'cash',
                'instructions': f"${amount:.2f} cash at pickup"
            })

        return payment_options

    def _generate_paypal_link(self, amount: float, description: str) -> str:
        """Generate PayPal.me payment link"""
        # PayPal.me format: paypal.me/username/amount
        # Note: Requires PayPal.me to be set up for the account

        username = self.paypal_email.split('@')[0]  # Simplified
        return f"https://paypal.me/{username}/{amount:.2f}"

    def _generate_venmo_link(self, amount: float, description: str) -> str:
        """Generate Venmo payment link"""
        # Venmo deep link format
        import urllib.parse

        note = urllib.parse.quote(description[:100])  # Max 100 chars
        return f"venmo://paycharge?txn=pay&recipients={self.venmo_username}&amount={amount:.2f}&note={note}"

    def format_payment_message(self, amount: float, description: str) -> str:
        """
        Generate payment instructions message for buyer

        Args:
            amount: Payment amount
            description: Item description

        Returns:
            Formatted payment message
        """
        message = f"Great! Total is ${amount:.2f}. Payment options:\n\n"

        if self.paypal_email:
            message += f"💳 PayPal: Send to {self.paypal_email}\n"
            message += f"   Link: {self._generate_paypal_link(amount, description)}\n\n"

        if self.venmo_username:
            message += f"💚 Venmo: @{self.venmo_username}\n"
            message += f"   Amount: ${amount:.2f}\n\n"

        if self.cash_enabled:
            message += f"💵 Cash: ${amount:.2f} at pickup (exact change appreciated)\n\n"

        message += "Once payment is sent, let me know and we'll arrange pickup/shipping!"

        return message

    def track_payment(self, transaction_data: Dict) -> str:
        """
        Track payment (manual or automated)

        Args:
            transaction_data: Dict containing:
                - transaction_id: Payment ID
                - method: Payment method used
                - amount: Amount paid
                - buyer_id: Buyer identifier
                - timestamp: When paid

        Returns:
            Transaction ID
        """
        # In production, this would integrate with payment APIs
        # For now, just log the transaction

        transaction_id = transaction_data.get(
            'transaction_id',
            f"TXN_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )

        # Save transaction record
        record = {
            'transaction_id': transaction_id,
            'method': transaction_data.get('method'),
            'amount': transaction_data.get('amount'),
            'buyer_id': transaction_data.get('buyer_id'),
            'timestamp': transaction_data.get('timestamp', datetime.now().isoformat()),
            'status': 'pending'
        }

        print(f"✓ Payment tracked: {transaction_id} - ${record['amount']:.2f}")

        return transaction_id

    def verify_payment_received(self, transaction_id: str) -> bool:
        """
        Verify payment was received (manual check)

        Args:
            transaction_id: Transaction ID to verify

        Returns:
            True if payment confirmed

        Note: In production, this would use PayPal/Venmo APIs
        """
        print(f"⚠ Manual verification required for {transaction_id}")
        print("  Check your PayPal/Venmo account for incoming payment")

        return False  # Requires manual confirmation

    @staticmethod
    def calculate_total(item_price: float, shipping_cost: float = 0,
                       tax_rate: float = 0) -> Dict:
        """
        Calculate total payment amount

        Args:
            item_price: Base item price
            shipping_cost: Shipping cost
            tax_rate: Tax rate (e.g., 0.08 for 8%)

        Returns:
            Dict with price breakdown
        """
        subtotal = item_price + shipping_cost
        tax = subtotal * tax_rate
        total = subtotal + tax

        return {
            'item_price': item_price,
            'shipping': shipping_cost,
            'subtotal': subtotal,
            'tax': tax,
            'tax_rate': tax_rate,
            'total': total
        }


# Payment webhook handlers (for future API integration)
class PayPalWebhook:
    """Handle PayPal IPN/webhook notifications"""

    @staticmethod
    def verify_webhook(webhook_data: Dict) -> bool:
        """Verify PayPal webhook signature"""
        # Implementation would verify webhook authenticity
        return True

    @staticmethod
    def process_payment(webhook_data: Dict) -> Dict:
        """Process PayPal payment notification"""
        return {
            'transaction_id': webhook_data.get('txn_id'),
            'amount': float(webhook_data.get('mc_gross', 0)),
            'payer_email': webhook_data.get('payer_email'),
            'status': webhook_data.get('payment_status')
        }


class VenmoWebhook:
    """Handle Venmo payment notifications (if API available)"""

    @staticmethod
    def process_payment(webhook_data: Dict) -> Dict:
        """Process Venmo payment notification"""
        return {
            'transaction_id': webhook_data.get('id'),
            'amount': float(webhook_data.get('amount', 0)),
            'payer': webhook_data.get('actor', {}).get('username'),
            'status': webhook_data.get('status')
        }
