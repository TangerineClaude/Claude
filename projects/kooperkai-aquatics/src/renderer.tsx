import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} | Kooperkai Aquatics` : 'Kooperkai Aquatics - Premium Freshwater Fish'}</title>
        <meta name="description" content="Premium freshwater tropical fish, cichlids, and aquarium supplies. Tank-bred, healthy fish with live arrival guarantee. Serving Oberlin, OH and shipping nationwide." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Source+Serif+4:wght@600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/css/style.css" />
      </head>
      <body>
        <header class="site-header">
          <nav class="main-nav container">
            <div class="nav-brand">
              <a href="/" class="logo-link">
                <img src="/static/logo.png" alt="Kooperkai Aquatics Logo" class="logo" />
                <span class="brand-name">Kooperkai Aquatics</span>
              </a>
            </div>

            <button class="mobile-menu-toggle" aria-label="Toggle menu">
              <span class="hamburger"></span>
            </button>

            <ul class="nav-links">
              <li><a href="/">Home</a></li>
              <li><a href="/shop">Shop</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/faq">FAQ</a></li>
            </ul>
          </nav>
        </header>

        <main class="main-content">
          {children}
        </main>

        <footer class="site-footer">
          <div class="container footer-content">
            <div class="footer-section">
              <h3>Kooperkai Aquatics</h3>
              <p>Premium freshwater fish and aquarium supplies. Tank-bred, healthy fish with live arrival guarantee.</p>
              <p class="location">📍 Oberlin, Ohio 44074</p>
            </div>

            <div class="footer-section">
              <h4>Shop</h4>
              <ul>
                <li><a href="/shop?category=Cichlids">Cichlids</a></li>
                <li><a href="/shop?category=Tetras">Tetras</a></li>
                <li><a href="/shop?category=Catfish">Catfish</a></li>
                <li><a href="/shop?category=Plants">Live Plants</a></li>
              </ul>
            </div>

            <div class="footer-section">
              <h4>Information</h4>
              <ul>
                <li><a href="/policies/shipping">Shipping Policy</a></li>
                <li><a href="/policies/doa">DOA Policy</a></li>
                <li><a href="/policies/terms">Terms of Service</a></li>
                <li><a href="/faq">FAQ</a></li>
              </ul>
            </div>

            <div class="footer-section">
              <h4>Connect</h4>
              <ul>
                <li><a href="/contact">Contact Us</a></li>
                <li><a href="https://www.ebay.com/usr/kooperkai_aquatics" target="_blank" rel="noopener">eBay Store</a></li>
                <li><a href="https://facebook.com/kooperkaiaquatics" target="_blank" rel="noopener">Facebook</a></li>
                <li><a href="https://instagram.com/kooperkaiaquatics" target="_blank" rel="noopener">Instagram</a></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom container">
            <p>&copy; {new Date().getFullYear()} Kooperkai Aquatics. All rights reserved.</p>
          </div>
        </footer>

        <script src="/static/js/app.js"></script>
      </body>
    </html>
  )
})
