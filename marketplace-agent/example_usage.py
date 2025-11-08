#!/usr/bin/env python3
"""
Example Usage: Marketplace Agent

Demonstrates how to use the agent programmatically
"""

from core import MarketplaceAgent

# Initialize agent with product config
agent = MarketplaceAgent('products/persol_001.json')

print("=" * 60)
print("MARKETPLACE AGENT - EXAMPLE USAGE")
print("=" * 60)
print(f"\nProduct: {agent.config['name']}")
print(f"Price: ${agent.config['pricing']['list_price']}")
print(f"Minimum: ${agent.config['pricing']['minimum_price']}")
print("\n" + "=" * 60)

# Example buyer inquiries
test_messages = [
    ("Is this still available?", "Availability check"),
    ("How much?", "Price inquiry"),
    ("What condition is it in?", "Condition question"),
    ("Would you take $140?", "Good offer"),
    ("Would you take $125?", "Low offer - negotiation"),
    ("Would you take $120?", "At minimum threshold"),
    ("Would you take $100?", "Too low - should decline"),
    ("Can you ship to California?", "Shipping question"),
    ("Do you have the case?", "Custom Q&A"),
    ("Are these real Persol?", "Authenticity check"),
]

buyer_channel_data = {
    'email': 'buyer@example.com',
    'name': 'Test Buyer'
}

for message, description in test_messages:
    print(f"\n{'─' * 60}")
    print(f"📝 Scenario: {description}")
    print(f"👤 Buyer: \"{message}\"")
    print()

    # Process inquiry
    response = agent.process_inquiry(
        message=message,
        channel='email',
        channel_data=buyer_channel_data
    )

    # Display response
    print(f"🤖 Agent Response:")
    print(f"   {response['response']}")
    print()
    print(f"📊 Metadata:")
    print(f"   Action: {response['action']}")
    print(f"   Intent: {response['intent']}")
    print(f"   Escalate: {response['escalate']}")

    if response.get('offer_amount'):
        print(f"   Offer: ${response['offer_amount']}")

    if response.get('counter_amount'):
        print(f"   Counter: ${response['counter_amount']}")

print("\n" + "=" * 60)

# Show agent statistics
print("\n📊 AGENT STATISTICS")
print("=" * 60)

stats = agent.get_statistics()
print(f"\nTotal buyers: {stats['total_buyers']}")
print(f"Total messages: {stats['total_messages']}")
print(f"Escalations: {stats['escalations']}")
print(f"Avg messages per buyer: {stats['avg_messages_per_buyer']:.1f}")

if stats['intent_breakdown']:
    print("\nIntent breakdown:")
    for intent, count in stats['intent_breakdown'].items():
        print(f"  {intent}: {count}")

print("\n" + "=" * 60)
print("\n✅ Example complete! Check logs/ directory for conversation history.")
print()
