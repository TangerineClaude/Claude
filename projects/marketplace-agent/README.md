# Marketplace Sales Agent 🤖

**Autonomous AI agent that handles product listings and buyer inquiries across email, SMS, and voice channels.**

Turn any product into a fully automated listing with intelligent negotiation, scam filtering, and 24/7 buyer engagement.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install twilio  # Optional: for SMS/voice support
```

### 2. Configure Your Product

```bash
# Copy template
cp config/product_template.json products/my_product.json

# Edit with your product details
# Set pricing, location, description, etc.
```

### 3. Deploy Agent

```bash
# Test the agent
python deploy.py test --product my_product

# Start the agent
python deploy.py start --product my_product
```

That's it! Your agent is now handling inquiries autonomously.

---

## 📦 What's Included

### Core Agent (`core/`)
- **agent.py**: Main autonomous agent logic
- **classifier.py**: Intent classification (price, negotiation, shipping, etc.)
- **negotiator.py**: Intelligent price negotiation engine

### Communication Channels (`channels/`)
- **email_handler.py**: Email automation (Gmail, Outlook, Yahoo)
- **sms_handler.py**: SMS automation (Twilio)
- **voice_handler.py**: Voice call automation (Twilio)

### Integrations (`integrations/`)
- **marketplaces.py**: Facebook, Craigslist, OfferUp listing tools
- **payment.py**: PayPal, Venmo, Cash payment handling

### Deployment (`deploy.py`)
- One-command deployment
- Multi-product management
- Statistics and monitoring

---

## 🎯 Features

### Autonomous Capabilities
- ✅ Responds to buyer inquiries within seconds
- ✅ Negotiates prices based on your rules
- ✅ Answers common questions automatically
- ✅ Filters scams and spam
- ✅ Escalates important offers to you
- ✅ Tracks all conversations

### Multi-Channel Support
- 📧 **Email**: Auto-respond via SMTP/IMAP
- 📱 **SMS**: Text message automation
- 📞 **Voice**: Automated phone responses
- 🌐 **Marketplaces**: Facebook, Craigslist, OfferUp

### Intelligent Negotiation
- Accepts offers above threshold
- Counter-offers strategically
- Adjusts based on buyer urgency
- Protects your minimum price

### Owner Notifications
- Offers below minimum price
- Ready-to-buy inquiries
- Unusual requests
- Scam attempts

---

## 📋 Usage Examples

### Deploy Your Persol Sunglasses

```bash
# Your sunglasses are already configured!
python deploy.py start --product persol_001

# Monitor email and SMS for inquiries
# Agent handles everything automatically
```

### Test Agent Responses

```bash
python deploy.py test --product persol_001
```

**Example conversation:**
```
👤 Buyer: Is this still available?
🤖 Agent: Yes, still available! Authentic Persol hand-made in Italy

👤 Buyer: Would you take $120?
🤖 Agent: How about $135? That's a fair middle ground.

👤 Buyer: Can you do $130?
🤖 Agent: $130 works! Let's make it happen!
```

### Add More Products

```bash
# Create config from template
cp config/product_template.json products/guitar.json

# Edit guitar.json with details
nano products/guitar.json

# Add to system
python deploy.py add-product products/guitar.json

# Start agent
python deploy.py start --product guitar_001
```

### Run Multiple Products

```bash
# Start agents for ALL products at once
python deploy.py start --all
```

### View Statistics

```bash
# All products
python deploy.py stats

# Specific product
python deploy.py stats --product persol_001
```

**Output:**
```
📊 Statistics for: Persol Tortoise Sunglasses
  Total buyers contacted: 12
  Total messages: 28
  Escalations to owner: 3
  Avg messages per buyer: 2.3

  Intent breakdown:
    price: 8
    negotiation: 12
    availability: 5
    shipping: 3
```

### List All Products

```bash
python deploy.py list
```

---

## ⚙️ Configuration

### Product Configuration

Edit `products/your_product.json`:

```json
{
  "product_id": "unique_id",
  "name": "Product Name",
  "pricing": {
    "list_price": 100,
    "minimum_price": 85,
    "shipping_cost": 10,
    "negotiation_flexibility": "medium"
  },
  "location": {
    "city": "Your City",
    "state": "ST",
    "pickup_enabled": true,
    "shipping_enabled": true
  },
  "owner": {
    "email": "you@example.com",
    "phone": "+12345678900",
    "notify_on_offer_below": 80
  }
}
```

See `config/product_template.json` for all options.

### API Credentials

Copy and configure credentials:

```bash
cp config/credentials.example.json config/credentials.json
nano config/credentials.json
```

**Email (Required for email channel):**
- Gmail: Use [app-specific password](https://myaccount.google.com/apppasswords)
- Outlook/Yahoo: Standard password

**SMS/Voice (Optional):**
- Sign up at [Twilio](https://www.twilio.com)
- Get phone number (~$1/mo)
- Add credentials to `config/credentials.json`

**Marketplaces:**
- No API needed - agent generates listing templates
- Facebook, Craigslist, OfferUp require manual posting

---

## 🧠 How It Works

### 1. Intent Classification

Agent analyzes each message to understand buyer intent:
- Price inquiries
- Negotiation attempts
- Availability checks
- Shipping questions
- Condition concerns
- Authenticity verification
- Scam detection

### 2. Automated Response

Based on intent and product config, agent:
- Answers questions using product data
- Provides pricing information
- Explains shipping/pickup options
- References custom Q&A

### 3. Price Negotiation

Sophisticated negotiation engine:
- **Above list price**: Accept immediately
- **Near list price**: Accept with enthusiasm
- **Mid-range**: Accept with conditions (buyer pays shipping)
- **Low but acceptable**: Counter-offer strategically
- **Below minimum**: Decline or escalate to owner

### 4. Escalation Rules

Agent escalates to owner when:
- Offer below `minimum_price`
- Buyer is ready to purchase
- Unusual request (trade, warranty, etc.)
- Potential scam detected

### 5. Conversation Logging

Every interaction is logged:
- Buyer contact info
- Full message history
- Agent actions taken
- Escalation notifications

Logs saved to `logs/product_id/`

---

## 📊 Negotiation Examples

**Scenario 1: Fair Offer**
```
List: $145, Minimum: $130
Buyer offers: $140
→ Agent accepts immediately
```

**Scenario 2: Strategic Negotiation**
```
List: $145, Minimum: $130
Buyer offers: $125
→ Agent counters: $135
→ Buyer: $130
→ Agent accepts ($130 is minimum)
```

**Scenario 3: Too Low**
```
List: $145, Minimum: $130
Buyer offers: $100
→ Agent declines: "Too far below asking price"
→ Escalates to owner for consideration
```

**Scenario 4: Urgent Buyer**
```
List: $145, Minimum: $130
Buyer: "Would you take $135? Can pick up today"
→ Agent detects urgency
→ Accepts $135 (above minimum + urgent)
```

---

## 🔒 Security Features

### Scam Detection

Agent automatically filters:
- Google Voice verification attempts
- Overseas shipping scams
- Overpayment schemes
- Western Union/MoneyGram requests
- Suspicious email patterns

Scams are blocked and logged, owner is notified.

### Privacy

- All credentials in `credentials.json` (gitignored)
- Conversation logs stored locally only
- No data sent to third parties
- Owner receives escalation notifications

---

## 🚀 Scaling Strategy

### Phase 1: Single Product (You Are Here)
- Validate the system works
- Fine-tune responses
- Learn buyer patterns

### Phase 2: Multiple Products (10-20 items)
- Use `python deploy.py start --all`
- Automate entire personal inventory
- One agent per product

### Phase 3: High Volume (100+ items)
- Consider dedicated server/VPS
- Setup webhooks for real-time responses
- Add analytics dashboard

### Phase 4: Platform/SaaS (Sell to others)
- Offer as service to other sellers
- $50-200/month per seller
- Multi-tenant architecture
- Web dashboard for management

---

## 📱 Channel Setup

### Email (Easiest)

**Gmail:**
1. Enable 2-factor authentication
2. Generate app-specific password: https://myaccount.google.com/apppasswords
3. Add to `credentials.json`:
```json
{
  "email": {
    "email": "you@gmail.com",
    "password": "your-app-password"
  }
}
```

**Outlook/Yahoo:** Similar process

### SMS (Optional)

**Twilio Setup:**
1. Sign up: https://www.twilio.com/try-twilio
2. Buy phone number (~$1/mo)
3. Get Account SID and Auth Token
4. Add to `credentials.json`:
```json
{
  "sms": {
    "account_sid": "ACxxxxx",
    "auth_token": "your-token",
    "phone_number": "+11234567890"
  }
}
```

**Cost:** ~$1/mo + $0.0075 per SMS

### Voice (Optional)

Same Twilio credentials as SMS. Voice calls ~$0.013/minute.

---

## 🎨 Customization

### Custom Q&A

Add product-specific questions to your config:

```json
{
  "custom_qa": [
    {
      "q": "does it have the original box?",
      "a": "No original box, but I'll pack it securely for shipping."
    },
    {
      "q": "why are you selling?",
      "a": "Upgrading to a different style. These are great glasses, just not my look anymore."
    }
  ]
}
```

Agent will auto-respond when these questions are detected.

### Negotiation Personality

Adjust `negotiation_flexibility`:
- **strict**: Only accept near list price
- **medium**: Standard negotiation (default)
- **flexible**: More willing to negotiate

### Agent Personality

Set `agent_personality`:
- **professional_friendly**: Balanced (default)
- **casual_friendly**: Relaxed tone
- **business_formal**: Very professional
- **enthusiastic**: Excited, energetic

---

## 📈 Analytics

Track your agent's performance:

```bash
python deploy.py stats
```

**Metrics:**
- Total buyers engaged
- Messages per buyer (conversion indicator)
- Escalation rate
- Intent breakdown (what buyers ask most)
- Negotiation rounds

Use this data to:
- Optimize pricing strategy
- Improve product descriptions
- Identify common questions to add to custom Q&A

---

## 🔧 Advanced Features

### Marketplace Listing Templates

Generate posting guides for all platforms:

```bash
python deploy.py add-product products/myproduct.json
# Creates listing guide with copy/paste templates
```

### Payment Processing

Agent can send payment instructions:

```json
{
  "payment": {
    "paypal_email": "you@paypal.com",
    "venmo_username": "yourvenmo"
  }
}
```

When buyer is ready, agent provides payment links automatically.

### Multi-Product Bundles

Selling multiple items? Agent can offer bundle discounts (future feature).

---

## 🐛 Troubleshooting

### Email not working

**Gmail:** Use app-specific password, not account password
**Firewall:** Check ports 587 (SMTP) and 993 (IMAP) are open

### SMS not working

**Twilio:** Verify phone number is active
**Install:** Run `pip install twilio`

### Agent not responding

**Check logs:** `logs/product_id/conversation_*.json`
**Test manually:** `python deploy.py test --product your_id`

### Permission errors

**Make executable:** `chmod +x deploy.py`

---

## 💡 Tips for Best Results

1. **Price Strategically**
   - Set `list_price` at your ideal price
   - Set `minimum_price` at absolute lowest you'll accept
   - Agent negotiates between these automatically

2. **Complete Product Info**
   - More details = fewer escalations
   - Add measurements, condition details, photos
   - Populate custom Q&A with expected questions

3. **Monitor Escalations**
   - Check `logs/` directory regularly
   - Respond to serious buyer escalations quickly
   - Fine-tune based on what gets escalated

4. **Test Before Deploying**
   - Run `python deploy.py test --product id`
   - Verify responses match your style
   - Adjust product config as needed

5. **Multiple Marketplaces**
   - List on Facebook, Craigslist, OfferUp simultaneously
   - Agent handles inquiries from all sources
   - More exposure = faster sale

---

## 🎯 Roadmap

**Version 1.0** (Current)
- ✅ Core agent logic
- ✅ Email/SMS/voice channels
- ✅ Price negotiation
- ✅ Multi-product support

**Version 2.0** (Future)
- 🔲 Web dashboard
- 🔲 Facebook Marketplace API integration
- 🔲 Automated photo uploads
- 🔲 Bundle offers
- 🔲 Dynamic pricing based on demand

**Version 3.0** (Future)
- 🔲 SaaS platform
- 🔲 Multi-tenant support
- 🔲 Payment processing integration
- 🔲 Buyer reputation system
- 🔲 Automated relisting

---

## 📞 Support

**Issues?** Check logs in `logs/` directory

**Questions?** Review this README and `config/product_template.json`

**Contributing?** This is designed to be modular and extensible. Fork and customize!

---

## 📄 License

MIT License - Use commercially, modify freely, sell as SaaS, etc.

---

## 🎉 Get Started Now

Your Persol sunglasses agent is ready to deploy:

```bash
cd marketplace-agent
python deploy.py test --product persol_001
python deploy.py start --product persol_001
```

Sit back and let the agent handle buyer inquiries while you focus on shipping sold items! 🚀
