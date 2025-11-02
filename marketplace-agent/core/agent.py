"""
Autonomous Marketplace Sales Agent
Handles buyer inquiries, negotiations, and transactions across multiple channels
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from .classifier import IntentClassifier, Intent
from .negotiator import Negotiator, NegotiationAction


class MarketplaceAgent:
    """
    Autonomous agent that manages product listings and buyer interactions

    Features:
    - Multi-channel communication (email, SMS, voice)
    - Intelligent intent classification
    - Automated price negotiation
    - Conversation history logging
    - Owner escalation for edge cases
    """

    def __init__(self, product_config_path: str):
        """
        Initialize agent with product configuration

        Args:
            product_config_path: Path to product JSON config file
        """
        self.config = self._load_config(product_config_path)
        self.product_id = self.config['product_id']

        # Initialize core components
        self.classifier = IntentClassifier()
        self.negotiator = Negotiator(self.config['pricing'])

        # Conversation tracking
        self.conversations: Dict[str, List[Dict]] = {}  # buyer_id -> messages
        self.negotiation_rounds: Dict[str, int] = {}  # buyer_id -> round count

        # Setup logging
        self.log_dir = Path(__file__).parent.parent / 'logs' / self.product_id
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def _load_config(self, config_path: str) -> Dict:
        """Load and validate product configuration"""
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Validate required fields
        required = ['product_id', 'name', 'pricing', 'owner']
        missing = [field for field in required if field not in config]
        if missing:
            raise ValueError(f"Missing required config fields: {missing}")

        return config

    def process_inquiry(self, message: str, channel: str = 'generic',
                       channel_data: Optional[Dict] = None) -> Dict:
        """
        Process an incoming buyer inquiry and generate appropriate response

        Args:
            message: The buyer's message text
            channel: Communication channel (email, sms, voice, facebook, etc.)
            channel_data: Additional data from channel (buyer info, thread ID, etc.)

        Returns:
            Dict containing:
                - response: Message to send to buyer
                - action: Action taken by agent
                - escalate: Whether owner should be notified
                - metadata: Additional context
        """
        channel_data = channel_data or {}

        # Extract buyer information
        buyer_info = self.classifier.extract_buyer_info(message, channel_data)
        buyer_id = self._get_buyer_id(buyer_info, channel_data)

        # Classify intent
        intent = self.classifier.classify(message)
        urgency = self.classifier.get_urgency_level(message)

        # Check for scam
        if intent == Intent.SCAM_DETECTED:
            return self._handle_scam(buyer_id, message)

        # Check escalation rules
        if self._should_escalate(intent, message, buyer_info):
            return self._escalate_to_owner(buyer_id, message, intent, buyer_info)

        # Generate response based on intent
        response_data = self._generate_response(intent, message, buyer_id, urgency)

        # Log conversation
        self._log_conversation(buyer_id, message, response_data, intent, channel)

        return response_data

    def _generate_response(self, intent: Intent, message: str,
                          buyer_id: str, urgency: str) -> Dict:
        """Generate appropriate response based on intent"""

        handlers = {
            Intent.PRICE: self._handle_price_inquiry,
            Intent.NEGOTIATION: self._handle_negotiation,
            Intent.AVAILABILITY: self._handle_availability,
            Intent.SHIPPING: self._handle_shipping,
            Intent.PICKUP: self._handle_pickup,
            Intent.CONDITION: self._handle_condition,
            Intent.AUTHENTICITY: self._handle_authenticity,
            Intent.MEASUREMENTS: self._handle_measurements,
            Intent.PAYMENT: self._handle_payment,
            Intent.READY_TO_BUY: self._handle_ready_to_buy,
            Intent.GENERAL_QUESTION: self._handle_general_question,
        }

        handler = handlers.get(intent, self._handle_general_question)
        return handler(message, buyer_id, urgency)

    def _handle_price_inquiry(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle questions about price"""
        price = self.config['pricing']['list_price']
        shipping = self.config['pricing'].get('shipping_cost', 0)

        response = f"I'm asking ${price:.0f}"

        if shipping > 0 and self.config['location'].get('shipping_enabled'):
            response += f" + ${shipping:.0f} shipping"

        if self.config['location'].get('pickup_enabled'):
            response += f", or ${price:.0f} if you can pick up locally"

        response += f". {self._get_product_highlight()}"

        return {
            'response': response,
            'action': 'price_inquiry',
            'escalate': False,
            'intent': 'price'
        }

    def _handle_negotiation(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle price negotiation"""
        # Extract offer amount
        offer_amount = self.classifier.extract_offer_amount(message)

        # Get negotiation round for this buyer
        round_num = self.negotiation_rounds.get(buyer_id, 0) + 1
        self.negotiation_rounds[buyer_id] = round_num

        # Evaluate offer
        context = {
            'urgency': urgency,
            'round': round_num,
            'buyer_id': buyer_id
        }

        result = self.negotiator.evaluate_offer(offer_amount, context)

        # Adjust for urgency
        if urgency == 'high':
            result = self.negotiator.adjust_for_urgency(result, urgency)

        return {
            'response': result['message'],
            'action': result['action'].value,
            'escalate': result.get('escalate', False),
            'intent': 'negotiation',
            'offer_amount': offer_amount,
            'counter_amount': result.get('counter_amount'),
            'next_step': result.get('next_step')
        }

    def _handle_availability(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle availability questions"""
        response = f"Yes, still available! {self._get_product_highlight()}"

        if urgency == 'high':
            response += " I can meet today if you're ready."

        return {
            'response': response,
            'action': 'availability_check',
            'escalate': False,
            'intent': 'availability'
        }

    def _handle_shipping(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle shipping questions"""
        if not self.config['location'].get('shipping_enabled'):
            return {
                'response': "I'm only doing local pickup for this item. Are you in the area?",
                'action': 'shipping_inquiry',
                'escalate': False,
                'intent': 'shipping'
            }

        cost = self.config['pricing'].get('shipping_cost', 0)
        city = self.config['location'].get('city', 'my location')

        response = f"Yes, I can ship! Shipping is ${cost:.0f} from {city}. "
        response += "I'll pack it carefully and ship within 1-2 business days after payment."

        return {
            'response': response,
            'action': 'shipping_inquiry',
            'escalate': False,
            'intent': 'shipping'
        }

    def _handle_pickup(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle local pickup questions"""
        if not self.config['location'].get('pickup_enabled'):
            response = "I can ship but not doing local pickup. Interested in shipping?"
        else:
            city = self.config['location'].get('city', 'my area')
            response = f"Local pickup works! I'm in {city}. We can meet at a public location."

        return {
            'response': response,
            'action': 'pickup_inquiry',
            'escalate': False,
            'intent': 'pickup'
        }

    def _handle_condition(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle questions about item condition"""
        condition = self.config.get('condition', 'used')
        description = self.config.get('description', '')

        condition_map = {
            'new': 'Brand new, never used',
            'like_new': 'Like new condition',
            'used_like_new': 'Gently used, excellent condition',
            'used_good': 'Good used condition',
            'used_fair': 'Used condition with normal wear'
        }

        response = condition_map.get(condition, description)

        # Add any specific condition details from config
        if 'condition_details' in self.config:
            response += f". {self.config['condition_details']}"

        return {
            'response': response,
            'action': 'condition_inquiry',
            'escalate': False,
            'intent': 'condition'
        }

    def _handle_authenticity(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle authenticity verification questions"""
        response = "100% authentic. "

        if 'authenticity_proof' in self.config:
            response += self.config['authenticity_proof']
        else:
            response += "Happy to provide additional photos or verification."

        return {
            'response': response,
            'action': 'authenticity_inquiry',
            'escalate': False,
            'intent': 'authenticity'
        }

    def _handle_measurements(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle measurement/size questions"""
        if 'measurements' in self.config:
            response = f"Measurements: {self.config['measurements']}"
        else:
            response = "Let me get you exact measurements. What specifically do you need to know?"
            return {
                'response': response,
                'action': 'measurements_inquiry',
                'escalate': True,  # Need owner to provide measurements
                'intent': 'measurements'
            }

        return {
            'response': response,
            'action': 'measurements_inquiry',
            'escalate': False,
            'intent': 'measurements'
        }

    def _handle_payment(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle payment method questions"""
        response = "I accept cash for local pickup"

        if self.config['location'].get('shipping_enabled'):
            response += " or PayPal/Venmo for shipped orders"

        response += ". No checks or money orders."

        return {
            'response': response,
            'action': 'payment_inquiry',
            'escalate': False,
            'intent': 'payment'
        }

    def _handle_ready_to_buy(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle buyer ready to purchase"""
        price = self.config['pricing']['list_price']

        response = f"Great! Here's how we'll do it:\n\n"

        if self.config['location'].get('pickup_enabled'):
            response += f"Local pickup: Meet at public location, ${price:.0f} cash\n"

        if self.config['location'].get('shipping_enabled'):
            shipping = self.config['pricing'].get('shipping_cost', 0)
            total = price + shipping
            response += f"Shipping: ${total:.0f} total via PayPal/Venmo, I'll ship within 1-2 days\n"

        response += "\nWhich works better for you?"

        return {
            'response': response,
            'action': 'ready_to_buy',
            'escalate': True,  # Notify owner of serious buyer
            'intent': 'ready_to_buy'
        }

    def _handle_general_question(self, message: str, buyer_id: str, urgency: str) -> Dict:
        """Handle custom questions using Q&A from config"""
        # Check custom Q&A
        if 'custom_qa' in self.config:
            message_lower = message.lower()
            for qa in self.config['custom_qa']:
                if qa['q'].lower() in message_lower:
                    return {
                        'response': qa['a'],
                        'action': 'custom_qa',
                        'escalate': False,
                        'intent': 'general_question'
                    }

        # Default generic response
        return {
            'response': f"{self.config['description']}. What would you like to know?",
            'action': 'general_question',
            'escalate': False,
            'intent': 'general_question'
        }

    def _handle_scam(self, buyer_id: str, message: str) -> Dict:
        """Handle detected scam attempts"""
        self._log_conversation(buyer_id, message, {'response': '[SCAM BLOCKED]'},
                             Intent.SCAM_DETECTED, 'system')

        return {
            'response': None,  # Don't respond to scams
            'action': 'scam_blocked',
            'escalate': True,
            'intent': 'scam',
            'note': 'Potential scam detected and blocked'
        }

    def _should_escalate(self, intent: Intent, message: str, buyer_info: Dict) -> bool:
        """Determine if inquiry should be escalated to owner"""
        # Always escalate scams
        if intent == Intent.SCAM_DETECTED:
            return True

        # Check for unusual requests (keywords that need human judgment)
        unusual_keywords = ['trade', 'barter', 'exchange', 'broken', 'damaged', 'warranty']
        if any(keyword in message.lower() for keyword in unusual_keywords):
            return True

        return False

    def _escalate_to_owner(self, buyer_id: str, message: str,
                          intent: Intent, buyer_info: Dict) -> Dict:
        """Escalate inquiry to product owner"""
        # Create escalation notification
        notification = {
            'product_id': self.product_id,
            'product_name': self.config['name'],
            'buyer_id': buyer_id,
            'buyer_info': buyer_info,
            'message': message,
            'intent': intent.value,
            'timestamp': datetime.now().isoformat(),
            'conversation_history': self.conversations.get(buyer_id, [])
        }

        # Save escalation
        escalation_file = self.log_dir / f'escalation_{buyer_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(escalation_file, 'w') as f:
            json.dump(notification, f, indent=2)

        # Response to buyer
        response = "Let me check on that and get back to you shortly. Thanks for your patience!"

        return {
            'response': response,
            'action': 'escalated',
            'escalate': True,
            'intent': intent.value,
            'escalation_file': str(escalation_file)
        }

    def _log_conversation(self, buyer_id: str, message: str, response_data: Dict,
                         intent: Intent, channel: str):
        """Log conversation for analytics and history"""
        # Initialize conversation if new buyer
        if buyer_id not in self.conversations:
            self.conversations[buyer_id] = []

        # Add to conversation history
        entry = {
            'timestamp': datetime.now().isoformat(),
            'channel': channel,
            'intent': intent.value,
            'buyer_message': message,
            'agent_response': response_data.get('response'),
            'action': response_data.get('action'),
            'escalated': response_data.get('escalate', False)
        }

        self.conversations[buyer_id].append(entry)

        # Save to file
        convo_file = self.log_dir / f'conversation_{buyer_id}.json'
        with open(convo_file, 'w') as f:
            json.dump(self.conversations[buyer_id], f, indent=2)

    def _get_buyer_id(self, buyer_info: Dict, channel_data: Dict) -> str:
        """Generate unique buyer ID"""
        # Use email or phone if available
        if buyer_info.get('email'):
            return f"email_{buyer_info['email']}"
        elif buyer_info.get('phone'):
            return f"phone_{buyer_info['phone']}"
        elif channel_data.get('user_id'):
            return f"user_{channel_data['user_id']}"
        else:
            # Fallback to timestamp-based ID
            return f"unknown_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    def _get_product_highlight(self) -> str:
        """Get a compelling product highlight"""
        highlights = self.config.get('highlights', [])
        if highlights:
            return highlights[0]
        return self.config.get('description', '')[:100]

    def get_statistics(self) -> Dict:
        """Get agent performance statistics"""
        total_conversations = len(self.conversations)
        total_messages = sum(len(convo) for convo in self.conversations.values())

        # Count intents
        intent_counts = {}
        escalation_count = 0

        for convo in self.conversations.values():
            for entry in convo:
                intent = entry.get('intent', 'unknown')
                intent_counts[intent] = intent_counts.get(intent, 0) + 1
                if entry.get('escalated'):
                    escalation_count += 1

        return {
            'product_id': self.product_id,
            'product_name': self.config['name'],
            'total_buyers': total_conversations,
            'total_messages': total_messages,
            'escalations': escalation_count,
            'intent_breakdown': intent_counts,
            'negotiation_rounds': len(self.negotiation_rounds),
            'avg_messages_per_buyer': total_messages / max(total_conversations, 1)
        }
