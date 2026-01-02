// Kooperkai Aquatics - Frontend JavaScript
// Mobile menu toggle, image gallery, category filter, and other interactive features

document.addEventListener('DOMContentLoaded', () => {
  // ========== MOBILE MENU ==========
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle')
  const navLinks = document.querySelector('.nav-links')

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active')
      mobileMenuToggle.setAttribute(
        'aria-expanded',
        navLinks.classList.contains('active')
      )
    })
  }

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navLinks && !e.target.closest('.main-nav')) {
      navLinks.classList.remove('active')
      if (mobileMenuToggle) {
        mobileMenuToggle.setAttribute('aria-expanded', 'false')
      }
    }
  })

  // ========== PRODUCT IMAGE GALLERY ==========
  const mainImage = document.querySelector('.main-image img')
  const thumbnails = document.querySelectorAll('.thumbnail')

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', () => {
      const newSrc = thumbnail.querySelector('img').src
      if (mainImage) {
        mainImage.src = newSrc
      }

      // Update active state
      thumbnails.forEach((t) => t.classList.remove('active'))
      thumbnail.classList.add('active')
    })
  })

  // ========== CATEGORY FILTER ==========
  const categoryButtons = document.querySelectorAll('.category-btn')
  const productCards = document.querySelectorAll('.product-card')

  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category

      // Update active button
      categoryButtons.forEach((btn) => btn.classList.remove('active'))
      button.classList.add('active')

      // Filter products
      productCards.forEach((card) => {
        if (category === 'all' || card.dataset.category === category) {
          card.style.display = 'block'
        } else {
          card.style.display = 'none'
        }
      })
    })
  })

  // ========== QUANTITY SELECTOR & PRICE UPDATE ==========
  const quantitySelect = document.getElementById('quantity')

  if (quantitySelect) {
    quantitySelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex]
      console.log('Quantity changed:', selectedOption.value)
      // Price is already in the option text, so no additional update needed
    })
  }

  // ========== SMOOTH SCROLL FOR ANCHOR LINKS ==========
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href')
      if (href !== '#') {
        e.preventDefault()
        const target = document.querySelector(href)
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      }
    })
  })

  // ========== FORM VALIDATION ==========
  const contactForm = document.getElementById('contact-form')

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault()

      // Basic validation
      const name = document.getElementById('name')
      const email = document.getElementById('email')
      const message = document.getElementById('message')

      if (!name.value.trim()) {
        alert('Please enter your name')
        name.focus()
        return
      }

      if (!email.value.trim() || !isValidEmail(email.value)) {
        alert('Please enter a valid email address')
        email.focus()
        return
      }

      if (!message.value.trim()) {
        alert('Please enter a message')
        message.focus()
        return
      }

      // If validation passes, submit the form
      contactForm.submit()
    })
  }

  // Email validation helper
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // ========== LAZY LOAD IMAGES ==========
  const images = document.querySelectorAll('img[data-src]')

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.removeAttribute('data-src')
          observer.unobserve(img)
        }
      })
    })

    images.forEach((img) => imageObserver.observe(img))
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    images.forEach((img) => {
      img.src = img.dataset.src
      img.removeAttribute('data-src')
    })
  }

  // ========== DYNAMIC YEAR IN FOOTER ==========
  // Already handled in JSX, but keeping for reference

  // ========== ANALYTICS (placeholder for future implementation) ==========
  // window.dataLayer = window.dataLayer || []
  // function gtag() { dataLayer.push(arguments) }
  // gtag('js', new Date())
  // gtag('config', 'GA_MEASUREMENT_ID')
})
