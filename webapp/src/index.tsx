import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'
import productsData from '../data/products.json'

const app = new Hono()

// Load products from JSON file (synced from Google Sheets)
const products = productsData

// Use renderer middleware
app.use(renderer)

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ========== HOME PAGE ==========
app.get('/', (c) => {
  const featuredProducts = products.slice(0, 3)

  return c.render(
    <div>
      <section class="hero">
        <div class="container">
          <h1>Premium Freshwater Fish</h1>
          <p>
            Tank-bred, healthy fish with live arrival guarantee.
            Serving aquarists in Oberlin, OH and shipping nationwide.
          </p>
          <a href="/shop" class="btn btn-primary">Shop Now</a>
        </div>
      </section>

      <section class="container mt-xl">
        <h2 class="text-center">Featured Fish</h2>
        <div class="product-grid">
          {featuredProducts.map((product) => (
            <a href={`/products/${product.name.toLowerCase().replace(/\s+/g, '-')}`} class="product-card">
              <img src={product.image} alt={product.name} class="product-image" />
              <div class="product-info">
                <h3 class="product-name">{product.name}</h3>
                <p class="product-scientific">{product.scientific}</p>
                <p class="product-size">{product.size}</p>
                <p class="product-price">${product.price.toFixed(2)}</p>
                {product.stock > 0 ? (
                  <span class="stock-badge in-stock">✓ In Stock</span>
                ) : (
                  <span class="stock-badge out-of-stock">✗ Sold Out</span>
                )}
              </div>
            </a>
          ))}
        </div>
        <div class="text-center mt-xl">
          <a href="/shop" class="btn btn-primary">View All Products</a>
        </div>
      </section>

      <section class="container mt-xl mb-xl">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
          <div class="card text-center">
            <h3>🐠 Tank-Bred Quality</h3>
            <p>All our fish are carefully bred and raised in optimal conditions for health and color.</p>
          </div>
          <div class="card text-center">
            <h3>📦 Live Arrival Guarantee</h3>
            <p>We guarantee your fish arrive alive and healthy, or we'll replace them free of charge.</p>
          </div>
          <div class="card text-center">
            <h3>🚚 Fast Shipping</h3>
            <p>USPS Priority shipping with tracking. Ships Monday-Wednesday for safe arrival.</p>
          </div>
        </div>
      </section>
    </div>,
    { title: 'Home' }
  )
})

// ========== SHOP PAGE ==========
app.get('/shop', (c) => {
  const categoryParam = c.req.query('category')
  const categories = ['All', ...new Set(products.map(p => p.category))]

  return c.render(
    <div class="container">
      <h1>Shop All Fish</h1>

      <div class="category-filter">
        {categories.map((category) => (
          <button
            class={`category-btn ${!categoryParam && category === 'All' ? 'active' : categoryParam === category ? 'active' : ''}`}
            data-category={category.toLowerCase()}
          >
            {category}
          </button>
        ))}
      </div>

      <div class="product-grid">
        {products.map((product) => {
          const showProduct = !categoryParam || categoryParam === 'All' || product.category === categoryParam

          return showProduct ? (
            <a
              href={`/products/${product.name.toLowerCase().replace(/\s+/g, '-')}`}
              class="product-card"
              data-category={product.category.toLowerCase()}
            >
              <img src={product.image} alt={product.name} class="product-image" />
              <div class="product-info">
                <h3 class="product-name">{product.name}</h3>
                <p class="product-scientific">{product.scientific}</p>
                <p class="product-size">{product.size}</p>
                <p class="product-price">${product.price.toFixed(2)}</p>
                {product.priceVolume && (
                  <p style="font-size: 0.875rem; color: #6B7280;">
                    Volume discounts available
                  </p>
                )}
                {product.stock > 0 ? (
                  <span class="stock-badge in-stock">✓ In Stock ({product.stock})</span>
                ) : (
                  <span class="stock-badge out-of-stock">✗ Sold Out</span>
                )}
              </div>
            </a>
          ) : null
        })}
      </div>
    </div>,
    { title: 'Shop' }
  )
})

// ========== PRODUCT DETAIL PAGE ==========
app.get('/products/:slug', (c) => {
  const slug = c.req.param('slug')
  const product = products.find(p =>
    p.name.toLowerCase().replace(/\s+/g, '-') === slug
  )

  if (!product) {
    return c.notFound()
  }

  return c.render(
    <div class="container">
      <div class="product-detail">
        <div class="product-gallery">
          <div class="main-image">
            <img src={product.image} alt={product.name} />
          </div>
          {product.images && product.images.length > 1 && (
            <div class="thumbnail-grid">
              {product.images.map((img, index) => (
                <div class={`thumbnail ${index === 0 ? 'active' : ''}`}>
                  <img src={img} alt={`${product.name} ${index + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div class="product-details-section">
          <div>
            <h1>{product.name}</h1>
            <p class="product-scientific" style="font-size: 1.125rem; margin-bottom: 1rem;">
              {product.scientific}
            </p>
            <p style="color: #6B7280; margin-bottom: 1.5rem;">Size: {product.size}</p>

            <div style="background-color: #F6F5EF; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
              <p style="font-size: 2rem; font-weight: 800; color: #F97316; margin-bottom: 0.5rem;">
                ${product.price.toFixed(2)}
              </p>

              {product.priceVolume && (
                <div class="volume-pricing">
                  <p class="price-label">💰 Volume Discounts:</p>
                  <p class="price-label">• Buy 2: ${product.priceVolume.qty2.toFixed(2)}/ea (Save ${((product.price - product.priceVolume.qty2) * 2).toFixed(2)})</p>
                  <p class="price-label">• Buy 3: ${product.priceVolume.qty3.toFixed(2)}/ea (Save ${((product.price - product.priceVolume.qty3) * 3).toFixed(2)})</p>
                  <p class="price-label">• Buy 4+: ${product.priceVolume.qty4.toFixed(2)}/ea (Save ${((product.price - product.priceVolume.qty4) * 4).toFixed(2)})</p>
                </div>
              )}

              <div class="quantity-selector">
                <label for="quantity">Quantity:</label>
                <select id="quantity" name="quantity">
                  <option value="1">1 fish - ${product.price.toFixed(2)}</option>
                  {product.priceVolume && (
                    <>
                      <option value="2">2 fish - ${product.priceVolume.qty2.toFixed(2)}/ea (${(product.priceVolume.qty2 * 2).toFixed(2)} total)</option>
                      <option value="3">3 fish - ${product.priceVolume.qty3.toFixed(2)}/ea (${(product.priceVolume.qty3 * 3).toFixed(2)} total)</option>
                      <option value="4">4+ fish - ${product.priceVolume.qty4.toFixed(2)}/ea (${(product.priceVolume.qty4 * 4).toFixed(2)} total)</option>
                    </>
                  )}
                </select>
              </div>

              {product.stock > 0 ? (
                <p class="stock-badge in-stock" style="margin-top: 1rem;">
                  ✓ In Stock ({product.stock} available)
                </p>
              ) : (
                <p class="stock-badge out-of-stock" style="margin-top: 1rem;">
                  ✗ Currently Sold Out
                </p>
              )}
            </div>

            {product.stock > 0 && (
              <div class="checkout-buttons">
                <a
                  href="https://checkout.square.site/merchant/MLBGB95GQP5MW/checkout/YOUR_ITEM_ID"
                  class="btn btn-primary"
                  target="_blank"
                  rel="noopener"
                >
                  🛒 Buy with Square
                </a>

                <div id="paypal-button-container"></div>

                <a href="/contact?subject=Local Pickup Request" class="btn btn-secondary">
                  📍 Request Local Pickup (Free)
                </a>
              </div>
            )}

            <div class="shipping-info">
              <h4>Shipping Information</h4>
              <p><strong>Cost:</strong> $17.68 (USPS Priority with tracking)</p>
              <p><strong>Schedule:</strong> Ships Monday-Wednesday only</p>
              <p><strong>Local Pickup:</strong> Free in Oberlin, OH 44074</p>
              <p><a href="/policies/shipping">View full shipping policy →</a></p>
            </div>
          </div>

          <div class="care-info">
            <h3>Care Information</h3>
            <p style="margin-bottom: 1.5rem;">{product.description}</p>

            <div class="care-specs">
              <div class="care-spec">
                <span class="care-spec-label">Care Level</span>
                <span class="care-spec-value">{product.careLevel}</span>
              </div>
              <div class="care-spec">
                <span class="care-spec-label">Temperature</span>
                <span class="care-spec-value">{product.tempRange}</span>
              </div>
              <div class="care-spec">
                <span class="care-spec-label">pH Range</span>
                <span class="care-spec-value">{product.phRange}</span>
              </div>
              <div class="care-spec">
                <span class="care-spec-label">Minimum Tank</span>
                <span class="care-spec-value">{product.tankSize}</span>
              </div>
              <div class="care-spec">
                <span class="care-spec-label">Temperament</span>
                <span class="care-spec-value">{product.temperament}</span>
              </div>
              <div class="care-spec">
                <span class="care-spec-label">Diet</span>
                <span class="care-spec-value">{product.diet}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PayPal SDK - Replace with your client ID */}
      <script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD"></script>
      <script dangerouslySetInnerHTML={{
        __html: `
          if (document.getElementById('paypal-button-container')) {
            paypal.Buttons({
              createOrder: function(data, actions) {
                const qty = parseInt(document.getElementById('quantity').value);
                const prices = ${JSON.stringify({
                  1: product.price,
                  2: product.priceVolume?.qty2 || product.price,
                  3: product.priceVolume?.qty3 || product.price,
                  4: product.priceVolume?.qty4 || product.price,
                })};
                const unitPrice = prices[qty] || prices[1];
                const totalAmount = (unitPrice * qty).toFixed(2);

                return actions.order.create({
                  purchase_units: [{
                    description: '${product.name} (${product.size}) x' + qty,
                    amount: {
                      value: totalAmount
                    }
                  }]
                });
              },
              onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                  alert('Transaction completed by ' + details.payer.name.given_name);
                  window.location.href = '/thank-you?order=' + data.orderID;
                });
              },
              onError: function(err) {
                console.error('PayPal error:', err);
                alert('An error occurred with PayPal. Please try again or use Square.');
              }
            }).render('#paypal-button-container');
          }
        `
      }}></script>
    </div>,
    { title: product.name }
  )
})

// ========== ABOUT PAGE ==========
app.get('/about', (c) => {
  return c.render(
    <div class="container">
      <div class="policy-page">
        <h1>About Kooperkai Aquatics</h1>

        <p>
          Welcome to Kooperkai Aquatics! We're a family-owned business based in Oberlin, Ohio,
          dedicated to providing premium freshwater tropical fish and aquarium supplies to
          hobbyists across the country.
        </p>

        <h2>Our Mission</h2>
        <p>
          We believe that every aquarist deserves access to healthy, vibrant, tank-bred fish.
          Our mission is to breed and raise high-quality fish in optimal conditions, ensuring
          they arrive at your door healthy and ready to thrive in their new home.
        </p>

        <h2>Why Choose Us?</h2>
        <ul>
          <li><strong>Tank-Bred Quality:</strong> All our fish are bred and raised in-house with expert care</li>
          <li><strong>Live Arrival Guarantee:</strong> We stand behind our fish with a comprehensive DOA policy</li>
          <li><strong>Expert Support:</strong> Years of aquarium experience to help you succeed</li>
          <li><strong>Local Pickup Available:</strong> Free pickup in Oberlin, OH</li>
          <li><strong>Fast, Safe Shipping:</strong> USPS Priority with insulated packaging and heat/cold packs</li>
        </ul>

        <h2>Our Values</h2>
        <p>
          Quality, transparency, and customer satisfaction are at the heart of everything we do.
          We're passionate aquarists ourselves, and we treat every order like it's going to our
          own tanks.
        </p>

        <h2>Contact Us</h2>
        <p>
          Have questions? We'd love to hear from you! Visit our <a href="/contact">contact page</a>
          or reach out through our social media channels.
        </p>
      </div>
    </div>,
    { title: 'About Us' }
  )
})

// ========== CONTACT PAGE ==========
app.get('/contact', (c) => {
  const subject = c.req.query('subject') || ''

  return c.render(
    <div class="container">
      <div class="policy-page">
        <h1>Contact Us</h1>

        <p>Have questions about our fish, shipping, or policies? We'd love to hear from you!</p>

        <div class="card" style="margin-top: 2rem;">
          <form id="contact-form" action="/api/contact" method="POST">
            <div class="form-group">
              <label for="name">Name *</label>
              <input type="text" id="name" name="name" required />
            </div>

            <div class="form-group">
              <label for="email">Email *</label>
              <input type="email" id="email" name="email" required />
            </div>

            <div class="form-group">
              <label for="subject">Subject *</label>
              <input type="text" id="subject" name="subject" value={subject} required />
            </div>

            <div class="form-group">
              <label for="message">Message *</label>
              <textarea id="message" name="message" required></textarea>
            </div>

            <button type="submit" class="btn btn-primary">Send Message</button>
          </form>
        </div>

        <div style="margin-top: 3rem;">
          <h2>Other Ways to Reach Us</h2>
          <p><strong>Location:</strong> Oberlin, Ohio 44074</p>
          <p><strong>eBay Store:</strong> <a href="https://www.ebay.com/usr/kooperkai_aquatics" target="_blank" rel="noopener">kooperkai_aquatics</a></p>
          <p><strong>Facebook:</strong> <a href="https://facebook.com/kooperkaiaquatics" target="_blank" rel="noopener">@kooperkaiaquatics</a></p>
          <p><strong>Instagram:</strong> <a href="https://instagram.com/kooperkaiaquatics" target="_blank" rel="noopener">@kooperkaiaquatics</a></p>
        </div>
      </div>
    </div>,
    { title: 'Contact Us' }
  )
})

// ========== FAQ PAGE ==========
app.get('/faq', (c) => {
  const faqs = [
    {
      question: "Do you offer a live arrival guarantee?",
      answer: "Yes! All fish come with our comprehensive Dead on Arrival (DOA) policy. If any fish arrive deceased, we'll replace them free of charge or issue a refund. See our DOA policy for full details."
    },
    {
      question: "When do you ship?",
      answer: "We ship Monday through Wednesday only to ensure your fish don't sit in transit over the weekend. All orders are shipped via USPS Priority Mail with tracking."
    },
    {
      question: "How much is shipping?",
      answer: "Shipping is $17.68 via USPS Priority Mail. Local pickup is available for free in Oberlin, OH 44074."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept payments through Square and PayPal on our website. We also sell on eBay where you can use eBay's payment system."
    },
    {
      question: "Are your fish tank-bred or wild-caught?",
      answer: "All our fish are tank-bred and raised in-house. We do not sell wild-caught specimens."
    },
    {
      question: "Do you offer volume discounts?",
      answer: "Yes! Many of our fish have volume pricing. The more you buy, the more you save. Check individual product pages for specific pricing."
    },
    {
      question: "Can I pick up my order locally?",
      answer: "Absolutely! We offer free local pickup in Oberlin, OH 44074. Just select 'Local Pickup' when checking out or contact us to arrange."
    },
    {
      question: "How are the fish packaged for shipping?",
      answer: "Fish are shipped in insulated boxes with oxygen-filled bags. We include heat or cold packs as needed based on your location's weather."
    },
    {
      question: "What if I have a problem with my order?",
      answer: "We stand behind every fish we sell. Contact us immediately if you have any concerns, and we'll work with you to make it right."
    },
    {
      question: "Do you ship internationally?",
      answer: "Currently, we only ship within the United States."
    }
  ]

  return c.render(
    <div class="container">
      <div class="policy-page">
        <h1>Frequently Asked Questions</h1>
        <p>Find answers to common questions about our fish, shipping, and policies.</p>

        <div class="faq-list" style="margin-top: 2rem;">
          {faqs.map((faq) => (
            <div class="faq-item">
              <div class="faq-question">{faq.question}</div>
              <div class="faq-answer">{faq.answer}</div>
            </div>
          ))}
        </div>

        <div style="margin-top: 3rem; text-align: center;">
          <p>Still have questions?</p>
          <a href="/contact" class="btn btn-primary">Contact Us</a>
        </div>
      </div>
    </div>,
    { title: 'FAQ' }
  )
})

// ========== SHIPPING POLICY ==========
app.get('/policies/shipping', (c) => {
  return c.render(
    <div class="container">
      <div class="policy-page">
        <h1>Shipping Policy</h1>

        <h2>Shipping Schedule</h2>
        <p>
          We ship <strong>Monday through Wednesday only</strong> to ensure your fish don't sit
          in transit over the weekend. Orders placed Thursday through Sunday will ship the
          following Monday (weather permitting).
        </p>

        <h2>Shipping Method & Cost</h2>
        <p>
          All orders are shipped via <strong>USPS Priority Mail</strong> with tracking for
          <strong>$17.68</strong>. Most packages arrive within 2-3 business days.
        </p>

        <h2>Packaging</h2>
        <p>Your fish will be carefully packaged in:</p>
        <ul>
          <li>Insulated styrofoam boxes</li>
          <li>Oxygen-filled bags (double-bagged for safety)</li>
          <li>Heat or cold packs as needed based on weather</li>
          <li>Cushioning material to prevent damage</li>
        </ul>

        <h2>Weather Delays</h2>
        <p>
          We monitor weather conditions closely and may delay shipment if temperatures are
          unsafe for live fish transport. Your fish's safety is our top priority.
        </p>

        <h2>Local Pickup</h2>
        <p>
          <strong>Free local pickup is available in Oberlin, OH 44074!</strong> Contact us
          after placing your order to arrange a pickup time.
        </p>

        <h2>Tracking</h2>
        <p>
          You'll receive a tracking number via email as soon as your order ships. Please
          monitor tracking and be available to receive your package on the delivery date.
        </p>

        <h2>Questions?</h2>
        <p>
          Contact us at any time if you have questions about shipping. We're here to help!
        </p>
      </div>
    </div>,
    { title: 'Shipping Policy' }
  )
})

// ========== DOA POLICY ==========
app.get('/policies/doa', (c) => {
  return c.render(
    <div class="container">
      <div class="policy-page">
        <h1>Dead on Arrival (DOA) Policy</h1>

        <p>
          We take great care in packaging and shipping our fish, but occasionally issues can
          occur during transit. We stand behind every fish we sell with our comprehensive
          DOA guarantee.
        </p>

        <h2>Our Guarantee</h2>
        <p>
          If any fish arrive deceased (DOA), we will <strong>replace the fish free of charge</strong>
          or issue a <strong>refund for the fish</strong> (shipping costs are non-refundable).
        </p>

        <h2>DOA Claim Requirements</h2>
        <p>To file a DOA claim, you must:</p>
        <ol>
          <li>
            <strong>Contact us within 2 hours of the first delivery attempt</strong> with photos
            of the deceased fish in the unopened bag
          </li>
          <li>
            Include photos of the shipping label showing the delivery timestamp
          </li>
          <li>
            Provide your order number and a description of which fish arrived DOA
          </li>
        </ol>

        <h2>Important Notes</h2>
        <ul>
          <li>
            DOA coverage only applies if you are present to receive the package on the first
            delivery attempt
          </li>
          <li>
            Claims must be made within 2 hours of delivery with photographic evidence
          </li>
          <li>
            Refusal to pay for delivery or pick up from post office voids the DOA guarantee
          </li>
          <li>
            Shipping costs are non-refundable
          </li>
        </ul>

        <h2>Acclimation</h2>
        <p>
          Always properly acclimate your fish! Float the sealed bag in your tank for 15-20
          minutes, then slowly mix in tank water over another 20-30 minutes before releasing
          the fish. Deaths occurring after acclimation are not covered by the DOA policy.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you need to file a DOA claim or have questions about this policy, please
          <a href="/contact"> contact us immediately</a>.
        </p>
      </div>
    </div>,
    { title: 'DOA Policy' }
  )
})

// ========== TERMS OF SERVICE ==========
app.get('/policies/terms', (c) => {
  return c.render(
    <div class="container">
      <div class="policy-page">
        <h1>Terms of Service</h1>

        <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using this website or purchasing from Kooperkai Aquatics, you agree
          to be bound by these Terms of Service and all applicable laws and regulations.
        </p>

        <h2>2. Products & Availability</h2>
        <p>
          All products are subject to availability. We reserve the right to limit quantities
          or discontinue any product at any time. Product images are for illustration purposes
          and actual fish may vary in color and pattern.
        </p>

        <h2>3. Pricing</h2>
        <p>
          All prices are in USD and are subject to change without notice. We strive to ensure
          pricing accuracy but reserve the right to correct any errors.
        </p>

        <h2>4. Payment</h2>
        <p>
          We accept payment via Square and PayPal. Payment must be received before shipment.
          All transactions are secure and encrypted.
        </p>

        <h2>5. Shipping & Delivery</h2>
        <p>
          Please see our <a href="/policies/shipping">Shipping Policy</a> for detailed information.
          We are not responsible for delays caused by weather, carrier issues, or incorrect
          shipping addresses provided by the customer.
        </p>

        <h2>6. Live Arrival Guarantee</h2>
        <p>
          Please see our <a href="/policies/doa">DOA Policy</a> for our live arrival guarantee
          and claim requirements.
        </p>

        <h2>7. Returns & Refunds</h2>
        <p>
          Due to the nature of live fish, we do not accept returns once the fish have left our
          facility. Refunds are only issued in accordance with our DOA Policy.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          Kooperkai Aquatics shall not be liable for any indirect, incidental, or consequential
          damages arising from the use of our products or services.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          These terms are governed by the laws of the State of Ohio, United States.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of our website
          after changes constitutes acceptance of the modified terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Please <a href="/contact">contact us</a>.
        </p>
      </div>
    </div>,
    { title: 'Terms of Service' }
  )
})

// ========== THANK YOU PAGE ==========
app.get('/thank-you', (c) => {
  const orderId = c.req.query('order')

  return c.render(
    <div class="container">
      <div class="policy-page text-center">
        <h1>Thank You for Your Order! 🎉</h1>

        {orderId && (
          <p style="font-size: 1.125rem; color: #6B7280;">
            Order ID: <strong>{orderId}</strong>
          </p>
        )}

        <div class="card" style="margin-top: 2rem; text-align: left;">
          <h2>What Happens Next?</h2>
          <ol>
            <li>You'll receive an order confirmation email shortly</li>
            <li>We'll prepare your fish with expert care</li>
            <li>Your order will ship Monday-Wednesday (weather permitting)</li>
            <li>You'll receive tracking information when it ships</li>
            <li>Please be available to receive your package on delivery day</li>
          </ol>

          <h3 style="margin-top: 2rem;">Important Reminders:</h3>
          <ul>
            <li>Monitor your email for tracking updates</li>
            <li>Be present to receive the package on the first delivery attempt</li>
            <li>Properly acclimate your fish before adding them to your tank</li>
            <li>Contact us within 2 hours if you have any DOA issues</li>
          </ul>
        </div>

        <div style="margin-top: 2rem;">
          <a href="/shop" class="btn btn-primary">Continue Shopping</a>
          <a href="/" class="btn btn-secondary" style="margin-left: 1rem;">Return Home</a>
        </div>
      </div>
    </div>,
    { title: 'Thank You' }
  )
})

// ========== API ENDPOINT: Contact Form ==========
app.post('/api/contact', async (c) => {
  const body = await c.req.parseBody()

  // In production, this would send an email or save to a database
  // For now, we'll just log it and redirect
  console.log('Contact form submission:', body)

  // TODO: Implement email sending via SendGrid, Mailgun, or similar
  // TODO: Store in database or Google Sheets

  return c.redirect('/thank-you?message=contact')
})

// ========== 404 PAGE ==========
app.notFound((c) => {
  return c.render(
    <div class="container text-center" style="padding: 4rem 0;">
      <h1>404 - Page Not Found</h1>
      <p style="font-size: 1.25rem; margin: 2rem 0;">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <a href="/" class="btn btn-primary">Go Home</a>
    </div>,
    { title: '404 Not Found' }
  )
})

export default app
