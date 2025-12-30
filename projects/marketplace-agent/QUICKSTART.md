# Quick Start: Persol Sunglasses Agent 🕶️

Your autonomous sales agent is ready to handle buyer inquiries for your Persol sunglasses!

## ⚡ 60-Second Setup

### 1. Test the Agent (No Setup Required)

```bash
cd marketplace-agent
python deploy.py test --product persol_001
```

This shows how the agent responds to common questions.

### 2. Configure Email (Optional but Recommended)

To enable automatic email responses:

```bash
# Copy credentials template
cp config/credentials.example.json config/credentials.json

# Edit with your email
nano config/credentials.json
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate app password: https://myaccount.google.com/apppasswords
3. Add to credentials.json:
```json
{
  "email": {
    "email": "j25011111@protonmail.com",
    "password": "your-app-password"
  }
}
```

### 3. Deploy the Agent

```bash
python deploy.py start --product persol_001
```

**The agent is now running!** It will:
- ✅ Auto-respond to email inquiries
- ✅ Negotiate prices ($145 down to $130 minimum)
- ✅ Answer questions about condition, shipping, authenticity
- ✅ Filter scams automatically
- ✅ Notify you of serious buyers

Press `Ctrl+C` to stop.

---

## 📋 Your Product Configuration

**Persol Tortoise Sunglasses**
- List Price: **$145**
- Minimum Price: **$130** (agent won't go below this)
- Shipping: **$10**
- Location: **Akron, OH**
- Pickup: **Enabled**
- Shipping: **Enabled**

The agent will:
- Accept offers **≥ $135** immediately
- Counter-offer for **$125-$134**
- Escalate offers **< $120** to you for decision
- Decline lowball offers **< $100**

---

## 💬 Example Conversations

### Scenario 1: Availability Check
```
👤 Buyer: Are these still available?
🤖 Agent: Yes, still available! Authentic Persol hand-made in Italy
```

### Scenario 2: Price Negotiation
```
👤 Buyer: Would you take $140?
🤖 Agent: $140 sounds good! I can work with that. Should we arrange pickup/shipping?

👤 Buyer: Can you ship?
🤖 Agent: Yes, I can ship! Shipping is $10 from Akron. I'll pack it carefully
         and ship within 1-2 business days after payment.

👤 Buyer: Great, I'll take them!
🤖 Agent: Great! Total is $150. Payment options:
         💳 PayPal: Send to j25011111@protonmail.com
         💵 Cash: $140 at pickup (exact change appreciated)

         Once payment is sent, let me know and we'll arrange pickup/shipping!
```

### Scenario 3: Tough Negotiation
```
👤 Buyer: Would you take $120?
🤖 Agent: I appreciate the offer! Could you meet me at $133? That's the best I can do.

👤 Buyer: How about $130?
🤖 Agent: $130 works! Let's make it happen!
```

### Scenario 4: Custom Q&A
```
👤 Buyer: Do you have the case?
🤖 Agent: No case included, price reflects this. I can include a generic
         protective case for $5 extra if you'd like.
```

### Scenario 5: Scam Blocked
```
👤 Scammer: Please send Google Voice verification code to confirm
🤖 Agent: [NO RESPONSE - Scam detected and logged]
         [Owner notified via escalation log]
```

---

## 📱 Posting on Marketplaces

The agent works with inquiries from **any source** (email, text, etc.). You still need to create the initial listings manually:

### Facebook Marketplace

1. Go to https://www.facebook.com/marketplace/create
2. Click "Item for Sale"
3. Upload photos
4. Title: **Persol Tortoise Sunglasses - Handmade in Italy**
5. Price: **$145**
6. Description:
```
Authentic Persol tortoise sunglasses, hand-made in Italy. These are the real deal - superior Italian craftsmanship and classic design.

Lenses are in perfect condition with no scratches. Frames show minimal wear from gentle use. A timeless style that never goes out of fashion.

Condition: Gently used, excellent condition
Price: $145
Shipping: +$10
Local Pickup: Available in Akron

100% authentic Persol. Marked 'Made in Italy' with Persol branding on frames. Can provide additional photos of markings/details.

No case included (price reflects this).

Serious buyers only. Reply with questions!
```
7. Location: Akron, OH 44310
8. Publish!

### Craigslist

1. Go to https://cleveland.craigslist.org (or your local area)
2. Click "post to classifieds"
3. Select "for sale by owner" → "clothing & accessories"
4. Use same title/description as Facebook
5. Add photos
6. Post!

### OfferUp

1. Open OfferUp mobile app
2. Tap "+" button
3. Add photos
4. Use same title/description
5. Category: Accessories
6. Condition: Used - Good
7. Post!

**Pro Tip:** Post on all 3 platforms simultaneously. The agent handles inquiries from all sources!

---

## 📊 Monitoring Your Agent

### View Statistics
```bash
python deploy.py stats --product persol_001
```

Shows:
- How many buyers contacted you
- Total messages exchanged
- What buyers asked about most
- How many escalations (serious buyers)

### Check Conversation Logs
```bash
ls logs/persol_001/
cat logs/persol_001/conversation_*.json
```

See full conversation history with each buyer.

### Check Escalations
```bash
cat logs/persol_001/escalation_*.json
```

These are serious buyers or unusual requests that need your attention.

---

## 🎯 Next Steps

### After Your First Sale

1. **Stop the agent** (Ctrl+C)
2. **Remove the product**:
   ```bash
   rm products/persol_001.json
   ```

### Add More Products

Got more items to sell? Add them!

```bash
# Copy template
cp config/product_template.json products/guitar.json

# Edit with your product details
nano products/guitar.json

# Add to system
python deploy.py add-product products/guitar.json

# Start agent
python deploy.py start --product guitar_001
```

### Run Multiple Agents

Selling multiple items? Run agents for all of them:

```bash
python deploy.py start --all
```

Each product gets its own agent, all running simultaneously!

---

## 🔧 Advanced: SMS Support (Optional)

Want buyers to text you? Add SMS support:

1. Sign up at https://www.twilio.com/try-twilio
2. Get a phone number (~$1/month)
3. Add credentials to `config/credentials.json`:
```json
{
  "sms": {
    "account_sid": "ACxxxxx",
    "auth_token": "your-token",
    "phone_number": "+12345678900"
  }
}
```
4. Install Twilio: `pip install twilio`
5. Restart agent

Now buyers can text your Twilio number and get instant auto-responses!

---

## ❓ FAQ

**Q: Will the agent sell my item without my approval?**
A: No! The agent only handles inquiries and negotiation. When a buyer is ready to purchase, you get escalated and you finalize the sale.

**Q: What if someone offers $125 (below my $130 minimum)?**
A: The agent will counter at $130. If they insist on $125, it escalates to you to decide.

**Q: Can I change the price after deploying?**
A: Yes! Edit `products/persol_001.json`, change the pricing, save, and restart the agent.

**Q: Does this work for any product?**
A: Yes! Cars, furniture, electronics, anything. Just create a new product config.

**Q: How do I know if someone wants to buy?**
A: Check `logs/persol_001/escalation_*.json` for serious buyer notifications.

**Q: What if I get too many inquiries?**
A: That's the point! The agent handles them all. You only respond to serious buyers who pass the automated screening.

---

## 🎉 You're Ready!

Your Persol sunglasses agent is configured and tested. Deploy it now:

```bash
python deploy.py start --product persol_001
```

Let the agent handle the tire-kickers while you focus on shipping sold items! 📦

Questions? Check the main [README.md](README.md) for full documentation.

**Happy selling! 🚀**
