"""
Marketplace Platform Integrations
Handles listing and messaging across Facebook Marketplace, Craigslist, OfferUp
"""

from typing import Dict, List, Optional
import json
from datetime import datetime


class FacebookMarketplace:
    """
    Facebook Marketplace integration

    Note: Facebook doesn't have official Marketplace API for individuals.
    This provides a framework for browser automation or manual integration.
    """

    def __init__(self, config: Dict):
        """
        Initialize Facebook Marketplace handler

        Args:
            config: Dict containing:
                - access_token: Facebook access token (if available)
                - page_id: Facebook page ID (for business accounts)
        """
        self.access_token = config.get('access_token')
        self.page_id = config.get('page_id')
        self.enabled = bool(self.access_token)

    def create_listing(self, product_data: Dict) -> Optional[str]:
        """
        Create a new marketplace listing

        Args:
            product_data: Product configuration dict

        Returns:
            Listing ID if successful

        Note: Requires Facebook Graph API access or browser automation
        """
        print("⚠ Facebook Marketplace: Manual listing required")
        print("  1. Go to facebook.com/marketplace")
        print("  2. Click 'Create New Listing'")
        print(f"  3. Title: {product_data['name']}")
        print(f"  4. Price: ${product_data['pricing']['list_price']}")
        print(f"  5. Description: {product_data['description']}")
        print(f"  6. Location: {product_data['location']['city']}, {product_data['location']['state']}")

        return None

    def check_messages(self, agent_callback) -> int:
        """
        Check for new marketplace messages

        Note: Requires Facebook Messenger integration or browser automation
        """
        print("⚠ Facebook messages: Check manually at facebook.com/messages")
        return 0


class Craigslist:
    """
    Craigslist integration

    Note: Craigslist doesn't have an official API.
    This provides a framework for email-based integration.
    """

    def __init__(self, config: Dict):
        """
        Initialize Craigslist handler

        Args:
            config: Dict containing:
                - email: Craigslist posting email
                - city: Craigslist city (e.g., 'sfbay', 'newyork')
        """
        self.email = config.get('email')
        self.city = config.get('city', 'sfbay')

    def create_listing(self, product_data: Dict) -> Dict:
        """
        Generate Craigslist listing template

        Args:
            product_data: Product configuration dict

        Returns:
            Dict with listing details
        """
        # Generate posting URL
        category = self._get_category(product_data.get('category', 'general'))
        url = f"https://{self.city}.craigslist.org/search/{category}"

        # Generate listing text
        listing = {
            'url': url,
            'title': product_data['name'],
            'price': product_data['pricing']['list_price'],
            'description': self._format_description(product_data),
            'location': f"{product_data['location']['city']}, {product_data['location']['state']}",
            'instructions': [
                f"1. Go to {url}",
                "2. Click 'post' button",
                "3. Copy details below:",
                "",
                f"Title: {product_data['name']}",
                f"Price: ${product_data['pricing']['list_price']}",
                f"Location: {product_data['location']['zip']}",
                "",
                "Description:",
                self._format_description(product_data)
            ]
        }

        return listing

    def _format_description(self, product_data: Dict) -> str:
        """Format product description for Craigslist"""
        parts = [
            product_data['description'],
            "",
            f"Condition: {product_data.get('condition', 'used').replace('_', ' ').title()}",
            f"Price: ${product_data['pricing']['list_price']}",
        ]

        if product_data['location'].get('shipping_enabled'):
            parts.append(f"Shipping: +${product_data['pricing'].get('shipping_cost', 0)}")

        if product_data['location'].get('pickup_enabled'):
            parts.append(f"Local pickup available in {product_data['location']['city']}")

        parts.extend([
            "",
            "Serious buyers only. Cash or PayPal.",
            "Reply to this ad with questions."
        ])

        return '\n'.join(parts)

    def _get_category(self, product_category: str) -> str:
        """Map product category to Craigslist category code"""
        category_map = {
            'accessories': 'clo',
            'clothing': 'clo',
            'electronics': 'ele',
            'furniture': 'fuo',
            'auto': 'cto',
            'general': 'sss'
        }
        return category_map.get(product_category, 'sss')


class OfferUp:
    """
    OfferUp integration

    Note: OfferUp doesn't have a public API.
    This provides a framework for app-based integration.
    """

    def __init__(self, config: Dict):
        """
        Initialize OfferUp handler

        Args:
            config: Dict containing:
                - email: OfferUp account email
        """
        self.email = config.get('email')

    def create_listing(self, product_data: Dict) -> Dict:
        """
        Generate OfferUp listing guide

        Args:
            product_data: Product configuration dict

        Returns:
            Dict with listing instructions
        """
        return {
            'platform': 'OfferUp',
            'app': 'iOS/Android app required',
            'instructions': [
                "1. Open OfferUp app",
                "2. Tap '+' to create listing",
                "3. Upload photos",
                f"4. Title: {product_data['name']}",
                f"5. Price: ${product_data['pricing']['list_price']}",
                f"6. Category: {product_data.get('category', 'Other')}",
                f"7. Condition: {product_data.get('condition', 'Used')}",
                "8. Description:",
                product_data['description'],
                "",
                "9. Enable shipping if available",
                "10. Post listing"
            ]
        }

    def check_messages(self) -> int:
        """Check for messages (app-only feature)"""
        print("⚠ OfferUp messages: Check in mobile app")
        return 0


class MarketplaceManager:
    """Unified manager for all marketplace platforms"""

    def __init__(self, marketplace_configs: Dict):
        """
        Initialize marketplace integrations

        Args:
            marketplace_configs: Dict with configs for each platform
        """
        self.facebook = FacebookMarketplace(marketplace_configs.get('facebook', {}))
        self.craigslist = Craigslist(marketplace_configs.get('craigslist', {}))
        self.offerup = OfferUp(marketplace_configs.get('offerup', {}))

    def create_all_listings(self, product_data: Dict) -> Dict:
        """
        Create listings across all enabled marketplaces

        Args:
            product_data: Product configuration dict

        Returns:
            Dict with results for each platform
        """
        results = {}

        # Get enabled marketplaces from product config
        enabled = product_data.get('marketplaces', [])

        if 'facebook' in enabled:
            print("\n📘 Facebook Marketplace:")
            results['facebook'] = self.facebook.create_listing(product_data)

        if 'craigslist' in enabled:
            print("\n📋 Craigslist:")
            cl_listing = self.craigslist.create_listing(product_data)
            print('\n'.join(cl_listing['instructions']))
            results['craigslist'] = cl_listing

        if 'offerup' in enabled:
            print("\n📱 OfferUp:")
            ou_listing = self.offerup.create_listing(product_data)
            print('\n'.join(ou_listing['instructions']))
            results['offerup'] = ou_listing

        return results

    def generate_listing_guide(self, product_data: Dict) -> str:
        """
        Generate comprehensive listing guide for all platforms

        Args:
            product_data: Product configuration dict

        Returns:
            Markdown-formatted guide
        """
        guide = f"""# Marketplace Listing Guide: {product_data['name']}

## Quick Details
- **Price**: ${product_data['pricing']['list_price']}
- **Condition**: {product_data.get('condition', 'used').replace('_', ' ').title()}
- **Location**: {product_data['location']['city']}, {product_data['location']['state']}

## Photos Required
Upload {len(product_data.get('photos', []))} photos in this order:
"""
        for i, photo in enumerate(product_data.get('photos', []), 1):
            guide += f"{i}. {photo}\n"

        guide += f"""
## Standard Description (copy/paste)

{product_data['description']}

**Condition**: {product_data.get('condition', 'used').replace('_', ' ').title()}
**Price**: ${product_data['pricing']['list_price']}
"""

        if product_data['location'].get('shipping_enabled'):
            guide += f"**Shipping**: +${product_data['pricing'].get('shipping_cost', 0)}\n"

        if product_data['location'].get('pickup_enabled'):
            guide += f"**Local Pickup**: Available in {product_data['location']['city']}\n"

        guide += "\n---\n\n"

        # Platform-specific instructions
        enabled = product_data.get('marketplaces', [])

        if 'facebook' in enabled:
            guide += """## Facebook Marketplace

1. Go to https://www.facebook.com/marketplace/create
2. Select "Item for Sale"
3. Upload photos
4. Fill in title, price, category
5. Paste description
6. Set location
7. Publish

"""

        if 'craigslist' in enabled:
            cl_listing = self.craigslist.create_listing(product_data)
            guide += f"""## Craigslist

1. Go to {cl_listing['url']}
2. Click "post" button
3. Select category
4. Fill in details
5. Add photos
6. Submit

"""

        if 'offerup' in enabled:
            guide += """## OfferUp

1. Open OfferUp mobile app
2. Tap "+" button
3. Add photos
4. Fill in title, price, description
5. Select category and condition
6. Enable shipping if desired
7. Post

"""

        guide += """
---

## Automated Agent Configuration

This product has an automated sales agent configured. To enable:

```bash
python deploy.py start --product {product_id}
```

The agent will handle:
- Price inquiries
- Negotiation (down to ${min_price})
- Availability questions
- Shipping/pickup details
- Scam filtering

Owner notification for:
- Serious buyers
- Offers below ${min_price}
- Unusual requests
""".format(
            product_id=product_data['product_id'],
            min_price=product_data['pricing']['minimum_price']
        )

        return guide

    def save_listing_guide(self, product_data: Dict, output_path: str):
        """Save listing guide to file"""
        guide = self.generate_listing_guide(product_data)

        with open(output_path, 'w') as f:
            f.write(guide)

        print(f"✓ Listing guide saved to {output_path}")
