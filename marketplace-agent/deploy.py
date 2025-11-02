#!/usr/bin/env python3
"""
Marketplace Agent Deployment Script

One-command deployment and management for autonomous sales agents
"""

import argparse
import json
import sys
import os
from pathlib import Path
import threading
from typing import Dict, List, Optional

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core import MarketplaceAgent
from channels import EmailHandler, SMSHandler
from integrations import MarketplaceManager, PaymentProcessor


class AgentDeployer:
    """Manages deployment and operation of marketplace agents"""

    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.config_dir = self.base_dir / 'config'
        self.products_dir = self.base_dir / 'products'
        self.logs_dir = self.base_dir / 'logs'

        # Create directories
        self.products_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)

        # Load credentials if available
        self.credentials = self._load_credentials()

    def _load_credentials(self) -> Dict:
        """Load API credentials"""
        creds_file = self.config_dir / 'credentials.json'

        if not creds_file.exists():
            print("⚠ No credentials.json found. Some features will be limited.")
            print(f"  Copy {self.config_dir}/credentials.example.json to credentials.json")
            return {}

        with open(creds_file, 'r') as f:
            return json.load(f)

    def add_product(self, product_config_path: str):
        """
        Add a new product to the system

        Args:
            product_config_path: Path to product JSON config
        """
        # Load and validate product config
        with open(product_config_path, 'r') as f:
            product_data = json.load(f)

        product_id = product_data['product_id']

        # Copy to products directory
        dest_path = self.products_dir / f"{product_id}.json"
        with open(dest_path, 'w') as f:
            json.dump(product_data, f, indent=2)

        print(f"✓ Product added: {product_id}")
        print(f"  Name: {product_data['name']}")
        print(f"  Price: ${product_data['pricing']['list_price']}")
        print(f"  Config saved to: {dest_path}")

        # Generate marketplace listing guide
        if self.credentials.get('marketplaces'):
            marketplace_manager = MarketplaceManager(self.credentials['marketplaces'])
            guide_path = self.logs_dir / f"{product_id}_listing_guide.md"
            marketplace_manager.save_listing_guide(product_data, str(guide_path))
            print(f"  Listing guide: {guide_path}")

    def start_agent(self, product_id: str, channels: Optional[List[str]] = None):
        """
        Start autonomous agent for a product

        Args:
            product_id: Product ID to activate
            channels: List of channels to monitor (email, sms, all)
        """
        # Load product config
        product_file = self.products_dir / f"{product_id}.json"
        if not product_file.exists():
            print(f"✗ Product not found: {product_id}")
            print(f"  Run: python deploy.py add-product <config-file>")
            return

        print(f"🤖 Starting agent for product: {product_id}")

        # Initialize agent
        agent = MarketplaceAgent(str(product_file))

        # Default to all channels if not specified
        channels = channels or ['email', 'sms']

        # Setup channels
        handlers = []

        # Email channel
        if 'email' in channels and self.credentials.get('email'):
            print("📧 Initializing email channel...")
            email_handler = EmailHandler(self.credentials['email'])

            def email_callback(message, channel, channel_data):
                return agent.process_inquiry(message, channel, channel_data)

            # Start email monitoring in thread
            email_thread = threading.Thread(
                target=email_handler.monitor_inbox,
                args=(email_callback, agent.config['name']),
                daemon=True
            )
            email_thread.start()
            handlers.append(('email', email_thread))
            print("  ✓ Email monitoring active")

        # SMS channel
        if 'sms' in channels and self.credentials.get('sms'):
            print("📱 Initializing SMS channel...")
            sms_handler = SMSHandler(self.credentials['sms'])

            def sms_callback(message, channel, channel_data):
                return agent.process_inquiry(message, channel, channel_data)

            # Start SMS monitoring in thread
            sms_thread = threading.Thread(
                target=sms_handler.monitor_messages,
                args=(sms_callback,),
                daemon=True
            )
            sms_thread.start()
            handlers.append(('sms', sms_thread))
            print("  ✓ SMS monitoring active")

        if not handlers:
            print("⚠ No channels configured. Set up credentials.json to enable email/SMS.")
            print("\nAgent is ready but not monitoring any channels.")
            print("You can still use the agent programmatically:")
            print(f"  from core import MarketplaceAgent")
            print(f"  agent = MarketplaceAgent('{product_file}')")
            print(f"  response = agent.process_inquiry('Is this still available?')")
            return

        print(f"\n✓ Agent running for: {agent.config['name']}")
        print(f"  List price: ${agent.config['pricing']['list_price']}")
        print(f"  Minimum price: ${agent.config['pricing']['minimum_price']}")
        print(f"  Active channels: {', '.join(h[0] for h in handlers)}")
        print("\nPress Ctrl+C to stop...")

        # Keep main thread alive
        try:
            for name, thread in handlers:
                thread.join()
        except KeyboardInterrupt:
            print("\n\n✓ Agent stopped")

    def start_all_agents(self):
        """Start agents for all products"""
        product_files = list(self.products_dir.glob('*.json'))

        if not product_files:
            print("✗ No products found")
            print("  Run: python deploy.py add-product <config-file>")
            return

        print(f"🤖 Starting agents for {len(product_files)} products...")

        # Create threads for each product
        threads = []

        for product_file in product_files:
            product_id = product_file.stem

            thread = threading.Thread(
                target=self.start_agent,
                args=(product_id,),
                daemon=True
            )
            thread.start()
            threads.append(thread)

        print(f"\n✓ All agents running. Press Ctrl+C to stop...")

        try:
            for thread in threads:
                thread.join()
        except KeyboardInterrupt:
            print("\n\n✓ All agents stopped")

    def show_stats(self, product_id: Optional[str] = None):
        """Show agent statistics"""
        if product_id:
            # Stats for specific product
            product_file = self.products_dir / f"{product_id}.json"
            if not product_file.exists():
                print(f"✗ Product not found: {product_id}")
                return

            agent = MarketplaceAgent(str(product_file))
            stats = agent.get_statistics()

            print(f"\n📊 Statistics for: {stats['product_name']}")
            print(f"  Product ID: {stats['product_id']}")
            print(f"  Total buyers contacted: {stats['total_buyers']}")
            print(f"  Total messages: {stats['total_messages']}")
            print(f"  Escalations to owner: {stats['escalations']}")
            print(f"  Avg messages per buyer: {stats['avg_messages_per_buyer']:.1f}")
            print(f"\n  Intent breakdown:")
            for intent, count in stats['intent_breakdown'].items():
                print(f"    {intent}: {count}")

        else:
            # Stats for all products
            product_files = list(self.products_dir.glob('*.json'))

            if not product_files:
                print("✗ No products found")
                return

            print(f"\n📊 Statistics for all products:\n")

            total_buyers = 0
            total_messages = 0
            total_escalations = 0

            for product_file in product_files:
                agent = MarketplaceAgent(str(product_file))
                stats = agent.get_statistics()

                total_buyers += stats['total_buyers']
                total_messages += stats['total_messages']
                total_escalations += stats['escalations']

                print(f"  {stats['product_name']}:")
                print(f"    Buyers: {stats['total_buyers']}, Messages: {stats['total_messages']}, Escalations: {stats['escalations']}")

            print(f"\n  TOTALS:")
            print(f"    Products: {len(product_files)}")
            print(f"    Total buyers: {total_buyers}")
            print(f"    Total messages: {total_messages}")
            print(f"    Total escalations: {total_escalations}")

    def list_products(self):
        """List all configured products"""
        product_files = list(self.products_dir.glob('*.json'))

        if not product_files:
            print("No products configured yet.")
            print("\nGet started:")
            print("  python deploy.py add-product config/product_template.json")
            return

        print(f"\n📦 Configured products ({len(product_files)}):\n")

        for product_file in product_files:
            with open(product_file, 'r') as f:
                data = json.load(f)

            print(f"  {data['product_id']}: {data['name']}")
            print(f"    Price: ${data['pricing']['list_price']} (min: ${data['pricing']['minimum_price']})")
            print(f"    Location: {data['location']['city']}, {data['location']['state']}")
            print(f"    Marketplaces: {', '.join(data.get('marketplaces', []))}")
            print()

    def test_agent(self, product_id: str):
        """Test agent with sample inquiries"""
        product_file = self.products_dir / f"{product_id}.json"
        if not product_file.exists():
            print(f"✗ Product not found: {product_id}")
            return

        agent = MarketplaceAgent(str(product_file))

        test_messages = [
            "Is this still available?",
            "How much are you asking?",
            "Would you take $100?",
            "Can you ship it?",
            "What condition is it in?",
        ]

        print(f"\n🧪 Testing agent for: {agent.config['name']}\n")

        for msg in test_messages:
            print(f"👤 Buyer: {msg}")

            response = agent.process_inquiry(msg, 'test', {
                'email': 'test@example.com'
            })

            print(f"🤖 Agent: {response.get('response')}")
            print(f"   [Action: {response.get('action')}, Escalate: {response.get('escalate')}]")
            print()


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Deploy and manage autonomous marketplace sales agents',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Add a new product
  python deploy.py add-product products/sunglasses.json

  # Start agent for specific product
  python deploy.py start --product persol_001

  # Start agents for all products
  python deploy.py start --all

  # View statistics
  python deploy.py stats
  python deploy.py stats --product persol_001

  # List all products
  python deploy.py list

  # Test agent responses
  python deploy.py test --product persol_001
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Add product
    add_parser = subparsers.add_parser('add-product', help='Add a new product')
    add_parser.add_argument('config', help='Path to product config JSON')

    # Start agent
    start_parser = subparsers.add_parser('start', help='Start agent(s)')
    start_group = start_parser.add_mutually_exclusive_group(required=True)
    start_group.add_argument('--product', help='Product ID to start')
    start_group.add_argument('--all', action='store_true', help='Start all products')
    start_parser.add_argument('--channels', nargs='+', choices=['email', 'sms', 'all'],
                            help='Channels to monitor (default: all)')

    # Stats
    stats_parser = subparsers.add_parser('stats', help='View statistics')
    stats_parser.add_argument('--product', help='Product ID (optional, shows all if omitted)')

    # List products
    subparsers.add_parser('list', help='List all products')

    # Test
    test_parser = subparsers.add_parser('test', help='Test agent with sample messages')
    test_parser.add_argument('--product', required=True, help='Product ID to test')

    args = parser.parse_args()

    # Initialize deployer
    deployer = AgentDeployer()

    # Execute command
    if args.command == 'add-product':
        deployer.add_product(args.config)

    elif args.command == 'start':
        if args.all:
            deployer.start_all_agents()
        else:
            channels = args.channels or ['email', 'sms']
            if 'all' in channels:
                channels = ['email', 'sms']
            deployer.start_agent(args.product, channels)

    elif args.command == 'stats':
        deployer.show_stats(args.product)

    elif args.command == 'list':
        deployer.list_products()

    elif args.command == 'test':
        deployer.test_agent(args.product)

    else:
        parser.print_help()


if __name__ == '__main__':
    main()
