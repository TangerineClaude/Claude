"""
Price Negotiation Engine for Marketplace Agent
Handles offer evaluation and counter-offer generation
"""

from typing import Dict, Optional
from enum import Enum
from datetime import datetime, timedelta


class NegotiationAction(Enum):
    """Possible negotiation responses"""
    ACCEPT = "accept"
    ACCEPT_WITH_CONDITIONS = "accept_with_conditions"
    COUNTER_OFFER = "counter_offer"
    DECLINE = "decline"
    REQUEST_CLARIFICATION = "request_clarification"


class FlexibilityLevel(Enum):
    """How flexible the agent is in negotiations"""
    STRICT = "strict"  # Only accept list price or very close
    MEDIUM = "medium"  # Standard negotiation room
    FLEXIBLE = "flexible"  # Willing to negotiate significantly


class Negotiator:
    """Handles price negotiation logic and generates appropriate responses"""

    def __init__(self, pricing_config: Dict):
        """
        Initialize negotiator with pricing configuration

        Args:
            pricing_config: Dict containing pricing parameters:
                - list_price: Listed selling price
                - minimum_price: Absolute lowest acceptable price
                - shipping_cost: Cost to ship the item
                - negotiation_flexibility: 'strict', 'medium', or 'flexible'
        """
        self.list_price = pricing_config['list_price']
        self.min_price = pricing_config['minimum_price']
        self.shipping_cost = pricing_config.get('shipping_cost', 0)
        self.flexibility = FlexibilityLevel(pricing_config.get('negotiation_flexibility', 'medium'))

        # Calculate negotiation thresholds
        self.price_range = self.list_price - self.min_price
        self.excellent_threshold = self.list_price - (self.price_range * 0.2)  # Within 20% of range
        self.good_threshold = self.list_price - (self.price_range * 0.5)  # Within 50% of range
        self.acceptable_threshold = self.min_price + (self.price_range * 0.1)  # Just above minimum

    def evaluate_offer(self, offer_amount: Optional[float], context: Optional[Dict] = None) -> Dict:
        """
        Evaluate a buyer's offer and generate appropriate response

        Args:
            offer_amount: The dollar amount offered
            context: Additional context (buyer urgency, history, etc.)

        Returns:
            Dict containing:
                - action: NegotiationAction enum
                - message: Response message to send
                - counter_amount: Counter-offer amount (if applicable)
                - next_step: What should happen next
                - escalate: Whether to notify owner
        """
        if offer_amount is None:
            return self._request_clarification()

        context = context or {}
        buyer_urgency = context.get('urgency', 'low')
        negotiation_round = context.get('round', 1)

        # Offer is at or above list price
        if offer_amount >= self.list_price:
            return self._accept_offer(offer_amount, "full_price")

        # Excellent offer (within top 20% of negotiation range)
        elif offer_amount >= self.excellent_threshold:
            return self._accept_offer(offer_amount, "excellent")

        # Good offer (within middle 50% of range)
        elif offer_amount >= self.good_threshold:
            return self._accept_with_conditions(offer_amount)

        # Acceptable offer (just above minimum)
        elif offer_amount >= self.acceptable_threshold:
            # Accept if buyer is urgent or it's 2nd+ round
            if buyer_urgency == 'high' or negotiation_round >= 2:
                return self._accept_offer(offer_amount, "acceptable")
            else:
                return self._counter_offer(offer_amount, negotiation_round)

        # At minimum price (owner's threshold)
        elif offer_amount >= self.min_price:
            return self._counter_at_minimum(offer_amount)

        # Below minimum (escalate to owner)
        else:
            return self._decline_low_offer(offer_amount)

    def _accept_offer(self, amount: float, quality: str) -> Dict:
        """Generate acceptance response"""
        messages = {
            "full_price": f"Perfect! ${amount:.0f} works for me. Ready to move forward?",
            "excellent": f"${amount:.0f} sounds good! I can work with that. Should we arrange pickup/shipping?",
            "acceptable": f"Okay, ${amount:.0f} works. Let's make it happen!"
        }

        return {
            'action': NegotiationAction.ACCEPT,
            'message': messages.get(quality, f"${amount:.0f} is acceptable. Let's proceed!"),
            'counter_amount': None,
            'next_step': 'arrange_transaction',
            'escalate': False,
            'final_price': amount
        }

    def _accept_with_conditions(self, amount: float) -> Dict:
        """Accept but add conditions (buyer pays shipping, pickup only, etc.)"""
        conditions = []

        # If below list price, suggest buyer covers shipping
        if amount < self.list_price and self.shipping_cost > 0:
            conditions.append(f"buyer covers ${self.shipping_cost:.0f} shipping")

        condition_text = " if " + " and ".join(conditions) if conditions else ""

        return {
            'action': NegotiationAction.ACCEPT_WITH_CONDITIONS,
            'message': f"I can do ${amount:.0f}{condition_text}. Does that work for you?",
            'counter_amount': amount,
            'next_step': 'await_response',
            'escalate': False,
            'conditions': conditions
        }

    def _counter_offer(self, offer_amount: float, round_num: int) -> Dict:
        """Generate counter-offer"""
        # Counter-offer strategy: meet in middle, but closer to our minimum
        gap = self.good_threshold - offer_amount
        counter = offer_amount + (gap * 0.7)  # Move 70% of the way to our target

        # Round to nearest $5
        counter = round(counter / 5) * 5

        # Ensure counter is reasonable
        counter = max(counter, self.acceptable_threshold)
        counter = min(counter, self.list_price)

        messages = [
            f"I appreciate the offer! Could you meet me at ${counter:.0f}? That's the best I can do.",
            f"How about ${counter:.0f}? That's a fair middle ground.",
            f"I'm pretty firm, but I could come down to ${counter:.0f} to make this work."
        ]

        return {
            'action': NegotiationAction.COUNTER_OFFER,
            'message': messages[min(round_num - 1, len(messages) - 1)],
            'counter_amount': counter,
            'next_step': 'await_response',
            'escalate': False
        }

    def _counter_at_minimum(self, offer_amount: float) -> Dict:
        """Counter at absolute minimum price"""
        return {
            'action': NegotiationAction.COUNTER_OFFER,
            'message': f"My absolute bottom line is ${self.min_price:.0f}. That's as low as I can go.",
            'counter_amount': self.min_price,
            'next_step': 'await_response',
            'escalate': True,  # Notify owner we're at minimum
            'note': 'At minimum price threshold'
        }

    def _decline_low_offer(self, offer_amount: float) -> Dict:
        """Politely decline offer that's too low"""
        gap = self.min_price - offer_amount
        gap_percent = (gap / self.list_price) * 100

        # If gap is huge (>30%), decline firmly
        if gap_percent > 30:
            message = f"Thanks for your interest, but ${offer_amount:.0f} is too far below my asking price. Good luck with your search!"
            escalate = False
        else:
            # Close gap - escalate to owner for consideration
            message = f"I can't go as low as ${offer_amount:.0f}, but let me check with the owner and get back to you."
            escalate = True

        return {
            'action': NegotiationAction.DECLINE,
            'message': message,
            'counter_amount': None,
            'next_step': 'end_conversation' if not escalate else 'pending_owner',
            'escalate': escalate,
            'note': f'Offer ${offer_amount:.0f} below minimum ${self.min_price:.0f}'
        }

    def _request_clarification(self) -> Dict:
        """Ask buyer to specify their offer amount"""
        return {
            'action': NegotiationAction.REQUEST_CLARIFICATION,
            'message': f"I'm asking ${self.list_price:.0f}. What price were you thinking?",
            'counter_amount': None,
            'next_step': 'await_response',
            'escalate': False
        }

    def generate_bundle_offer(self, items: list, total_value: float, discount_percent: float = 10) -> Dict:
        """Generate offer for multiple items bundled together"""
        bundle_price = total_value * (1 - discount_percent / 100)

        return {
            'action': NegotiationAction.COUNTER_OFFER,
            'message': f"I can bundle all {len(items)} items for ${bundle_price:.0f} (saves you {discount_percent}%)!",
            'counter_amount': bundle_price,
            'next_step': 'await_response',
            'escalate': False,
            'bundle': True
        }

    def handle_trade_offer(self, trade_description: str) -> Dict:
        """Handle trade/barter offers"""
        # By default, escalate trade offers to owner
        return {
            'action': NegotiationAction.REQUEST_CLARIFICATION,
            'message': "I'm primarily looking for cash, but let me check with the owner about trades. What did you have in mind?",
            'counter_amount': None,
            'next_step': 'pending_owner',
            'escalate': True,
            'note': f'Trade offer: {trade_description}'
        }

    def adjust_for_urgency(self, base_response: Dict, urgency: str) -> Dict:
        """Modify response based on buyer urgency level"""
        if urgency == 'high' and base_response['action'] == NegotiationAction.COUNTER_OFFER:
            # Be more flexible with urgent buyers
            if base_response.get('counter_amount'):
                # Reduce counter by $5-10
                base_response['counter_amount'] = max(
                    self.min_price,
                    base_response['counter_amount'] - 5
                )
                base_response['message'] += " Can pick up today?"

        return base_response

    def get_pricing_summary(self) -> Dict:
        """Get summary of pricing configuration"""
        return {
            'list_price': self.list_price,
            'minimum_price': self.min_price,
            'negotiation_room': self.price_range,
            'room_percent': (self.price_range / self.list_price) * 100,
            'flexibility': self.flexibility.value,
            'excellent_threshold': self.excellent_threshold,
            'good_threshold': self.good_threshold
        }
