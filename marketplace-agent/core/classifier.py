"""
Intent Classification Engine for Marketplace Agent
Analyzes buyer messages to determine intent and extract key information
"""

import re
from typing import Dict, List, Optional, Tuple
from enum import Enum


class Intent(Enum):
    """Buyer inquiry intent types"""
    PRICE = "price"
    NEGOTIATION = "negotiation"
    AVAILABILITY = "availability"
    SHIPPING = "shipping"
    PICKUP = "pickup"
    CONDITION = "condition"
    AUTHENTICITY = "authenticity"
    MEASUREMENTS = "measurements"
    PAYMENT = "payment"
    GENERAL_QUESTION = "general_question"
    READY_TO_BUY = "ready_to_buy"
    SCAM_DETECTED = "scam_detected"


class IntentClassifier:
    """Classifies buyer message intent using pattern matching and keyword analysis"""

    def __init__(self):
        self.intent_patterns = self._build_intent_patterns()
        self.scam_indicators = self._build_scam_indicators()

    def _build_intent_patterns(self) -> Dict[Intent, List[str]]:
        """Define keyword patterns for each intent"""
        return {
            Intent.NEGOTIATION: [
                r'\bwould you (take|accept)\b', r'\blowest\b', r'\bbest price\b',
                r'\bcounter\b', r'\boffer.*\$\d+', r'\bnegotiate\b',
                r'\bcan you do\s*\$\d+', r'\bmeet.*middle\b', r'\bfirm\b',
                r'\btake\s*\$\d+', r'\baccept\s*\$\d+'
            ],
            Intent.PRICE: [
                r'\bhow much\b', r'\bprice\b', r'\bcost\b',
                r'\bwhat.*asking\b', r'\bhow.*priced\b'
            ],
            Intent.AVAILABILITY: [
                r'\bavailable\b', r'\bstill have\b', r'\bin stock\b',
                r'\bsold\b', r'\bstill.*sale\b', r'\bdo you still\b'
            ],
            Intent.SHIPPING: [
                r'\bship\b', r'\bmail\b', r'\bdelivery\b', r'\bshipping cost\b',
                r'\bsend\b', r'\bdeliver\b', r'\bpostage\b'
            ],
            Intent.PICKUP: [
                r'\bpick.*up\b', r'\bmeet\b', r'\blocal\b', r'\bin person\b',
                r'\bwhere.*located\b', r'\bcome.*get\b'
            ],
            Intent.CONDITION: [
                r'\bcondition\b', r'\bwear\b', r'\bscratches\b', r'\bdamage\b',
                r'\bused\b', r'\bnew\b', r'\blike new\b', r'\bdefects\b'
            ],
            Intent.AUTHENTICITY: [
                r'\breal\b', r'\bauthentic\b', r'\bfake\b', r'\blegit\b',
                r'\bserial number\b', r'\bproof\b', r'\bverify\b'
            ],
            Intent.MEASUREMENTS: [
                r'\bsize\b', r'\bdimensions\b', r'\bmeasure\b', r'\bhow.*big\b',
                r'\blength\b', r'\bwidth\b', r'\bheight\b'
            ],
            Intent.PAYMENT: [
                r'\bpayment\b', r'\bpay\b', r'\bcash\b', r'\bvenmo\b',
                r'\bpaypal\b', r'\bzelle\b', r'\bhow.*purchase\b'
            ],
            Intent.READY_TO_BUY: [
                r'\bi\'ll take\b', r'\bwhen can i\b', r'\bread to buy\b',
                r'\blet\'s do it\b', r'\bdeal\b', r'\bsold\b', r'\byes.*buy\b'
            ],
            Intent.SCAM_DETECTED: [
                # Handled separately in scam detection
            ]
        }

    def _build_scam_indicators(self) -> List[str]:
        """Common scam message patterns"""
        return [
            r'\bGoogle Voice\b', r'\bverification code\b',
            r'\bshipping.*overseas\b', r'\bNigeria\b',
            r'\bWestern Union\b', r'\bMoneygram\b',
            r'\bcheck.*extra\b', r'\boverpay\b',
            r'\bmy.*agent\b', r'\bmovers.*coming\b',
            r'\bemail.*direct\b.*\b@\w+\.(com|net)\b'
        ]

    def classify(self, message: str) -> Intent:
        """
        Classify the primary intent of a buyer message

        Args:
            message: The buyer's message text

        Returns:
            Intent enum representing the primary intent
        """
        message_lower = message.lower()

        # First check for scams (highest priority)
        if self._detect_scam(message_lower):
            return Intent.SCAM_DETECTED

        # Score each intent
        intent_scores: Dict[Intent, int] = {}
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for pattern in patterns if re.search(pattern, message_lower, re.IGNORECASE))
            if score > 0:
                intent_scores[intent] = score

        # Return highest scoring intent or general question
        if intent_scores:
            return max(intent_scores.items(), key=lambda x: x[1])[0]

        return Intent.GENERAL_QUESTION

    def extract_offer_amount(self, message: str) -> Optional[float]:
        """
        Extract a dollar amount from a negotiation message

        Args:
            message: The message text

        Returns:
            Float dollar amount or None if not found
        """
        # Look for patterns like "$100", "100 dollars", "offer 100"
        patterns = [
            r'\$(\d+(?:\.\d{2})?)',  # $100 or $100.00
            r'(\d+(?:\.\d{2})?)\s*(?:dollars|bucks)',  # 100 dollars
            r'(?:offer|pay|give|take)\s*(\d+(?:\.\d{2})?)',  # offer 100
        ]

        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except (ValueError, IndexError):
                    continue

        return None

    def _detect_scam(self, message: str) -> bool:
        """Check if message contains scam indicators"""
        return any(re.search(pattern, message, re.IGNORECASE) for pattern in self.scam_indicators)

    def extract_buyer_info(self, message: str, channel_data: Optional[Dict] = None) -> Dict:
        """
        Extract buyer contact information from message and channel data

        Args:
            message: The message text
            channel_data: Additional data from the communication channel

        Returns:
            Dict containing extracted buyer information
        """
        info = {
            'email': None,
            'phone': None,
            'name': None,
            'location': None
        }

        # Extract email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', message)
        if email_match:
            info['email'] = email_match.group(0)

        # Extract phone (US format)
        phone_patterns = [
            r'\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b',  # 123-456-7890
            r'\b(\(\d{3}\)\s*\d{3}[-.]?\d{4})\b',  # (123) 456-7890
        ]
        for pattern in phone_patterns:
            phone_match = re.search(pattern, message)
            if phone_match:
                info['phone'] = phone_match.group(1)
                break

        # Use channel data if available
        if channel_data:
            info['email'] = info['email'] or channel_data.get('email')
            info['phone'] = info['phone'] or channel_data.get('phone')
            info['name'] = channel_data.get('name')
            info['location'] = channel_data.get('location')

        return info

    def get_urgency_level(self, message: str) -> str:
        """
        Determine urgency level of the inquiry

        Returns:
            'high', 'medium', or 'low'
        """
        high_urgency = [
            r'\btoday\b', r'\bright now\b', r'\basap\b', r'\burgent\b',
            r'\bready to buy\b', r'\bcash in hand\b'
        ]

        medium_urgency = [
            r'\bthis week\b', r'\bsoon\b', r'\bquick\b'
        ]

        message_lower = message.lower()

        if any(re.search(pattern, message_lower) for pattern in high_urgency):
            return 'high'
        elif any(re.search(pattern, message_lower) for pattern in medium_urgency):
            return 'medium'

        return 'low'
