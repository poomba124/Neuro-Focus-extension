// Dyslexia Ruler Content Script
class DyslexiaRuler {
  constructor() {
    this.isActive = false;
    this.ruler = null;
    this.rulerColor = '#ffeb3b';
    this.rulerOpacity = 0.3;
    this.rulerHeight = 25;
    this.lastMouseY = 0;
    this.debounceTimer = null;

    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggleDyslexiaRuler') {
        if (message.enabled) {
          this.enable(message.color || '#ffeb3b');
        } else {
          this.disable();
        }
        sendResponse({ success: true });
      }

      if (message.action === 'updateRulerColor') {
        this.updateColor(message.color);
        sendResponse({ success: true });
      }

      // Handle restore page action
      if (message.action === 'restorePage') {
        this.restorePage();
        sendResponse({ success: true });
      }
    });

    // Check if ruler should be active on page load
    chrome.storage.sync.get(['dyslexiaRulerEnabled', 'rulerColor'], (data) => {
      if (data.dyslexiaRulerEnabled) {
        this.enable(data.rulerColor || '#ffeb3b');
      }
    });
  }

  enable(color = '#ffeb3b') {
    if (this.isActive) return;

    this.isActive = true;
    this.rulerColor = color;
    this.createRuler();
    this.attachEventListeners();

    // Show notification
    this.showNotification('📏 Dyslexia Ruler Enabled', 'Move your mouse to track reading lines');
  }

  disable() {
    if (!this.isActive) return;

    this.isActive = false;
    this.removeRuler();
    this.removeEventListeners();

    // Show notification
    this.showNotification('📏 Dyslexia Ruler Disabled', 'Ruler has been turned off');
  }

  createRuler() {
    // Remove existing ruler first
    this.removeRuler();

    // Create ruler element
    this.ruler = document.createElement('div');
    this.ruler.id = 'neuro-focus-dyslexia-ruler';
    this.ruler.style.cssText = `
      position: fixed !important;
      left: 0 !important;
      right: 0 !important;
      height: ${this.rulerHeight}px !important;
      background: linear-gradient(to bottom, 
        transparent 0%, 
        ${this.rulerColor}${Math.round(this.rulerOpacity * 255).toString(16).padStart(2, '0')} 20%, 
        ${this.rulerColor}${Math.round(this.rulerOpacity * 255).toString(16).padStart(2, '0')} 80%, 
        transparent 100%) !important;
      pointer-events: none !important;
      z-index: 999999 !important;
      top: -100px !important;
      transition: top 0.1s ease !important;
      border-top: 1px solid ${this.rulerColor}80 !important;
      border-bottom: 1px solid ${this.rulerColor}80 !important;
      box-shadow: 0 0 10px ${this.rulerColor}40 !important;
    `;

    document.body.appendChild(this.ruler);
  }

  removeRuler() {
    if (this.ruler && this.ruler.parentNode) {
      this.ruler.parentNode.removeChild(this.ruler);
      this.ruler = null;
    }
  }

  attachEventListeners() {
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.scrollHandler = this.handleScroll.bind(this);

    document.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    document.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('resize', this.scrollHandler, { passive: true });
  }

  removeEventListeners() {
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.scrollHandler) {
      document.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('resize', this.scrollHandler);
    }
  }

  handleMouseMove(event) {
    if (!this.isActive || !this.ruler) return;

    // Debounce for performance
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.updateRulerPosition(event.clientY);
    }, 10);
  }

  handleScroll() {
    if (!this.isActive || !this.ruler) return;

    // Update ruler position based on last mouse position
    this.updateRulerPosition(this.lastMouseY);
  }

  updateRulerPosition(mouseY) {
    if (!this.ruler) return;

    this.lastMouseY = mouseY;

    // Position ruler to follow mouse cursor
    const rulerTop = mouseY - (this.rulerHeight / 2);
    this.ruler.style.top = `${rulerTop}px`;
  }

  updateColor(color) {
    this.rulerColor = color;

    if (this.ruler) {
      this.ruler.style.background = `linear-gradient(to bottom, 
        transparent 0%, 
        ${color}${Math.round(this.rulerOpacity * 255).toString(16).padStart(2, '0')} 20%, 
        ${color}${Math.round(this.rulerOpacity * 255).toString(16).padStart(2, '0')} 80%, 
        transparent 100%)`;
      this.ruler.style.borderTop = `1px solid ${color}80`;
      this.ruler.style.borderBottom = `1px solid ${color}80`;
      this.ruler.style.boxShadow = `0 0 10px ${color}40`;
    }
  }

  // NEW: Restore page functionality
  restorePage() {
    try {
      // 1. Remove dyslexia ruler
      this.disable();

      // 2. Remove injected reading mode styles
      this.removeReadingModeStyles();

      // 3. Remove custom font styles
      this.removeCustomFontStyles();

      // 4. Remove reading mode indicator
      this.removeReadingModeIndicator();

      // 5. Show restoration notification
      this.showNotification('🔄 Page Restored', 'All Neuro Focus modifications have been removed');

    } catch (error) {
      console.error('Error restoring page:', error);
      this.showNotification('❌ Restore Failed', 'Could not fully restore page');
    }
  }

  removeReadingModeStyles() {
    // Remove any injected style elements that might contain reading mode CSS
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach(style => {
      if (style.textContent.includes('neuro-focus') || 
          style.textContent.includes('reading-mode') || 
          style.textContent.includes('🧠 Neuro Focus Reading Mode Active')) {
        style.remove();
      }
    });

    // Also remove any elements with IDs that might be from our extension
    const readingModeElements = [
      'neuro-focus-reading-style',
      'neuro-focus-font-style',
      'neuro-focus-custom-css'
    ];

    readingModeElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
  }

  removeCustomFontStyles() {
    // Reset font styles on body and main elements
    const elementsToReset = [
      document.body,
      document.documentElement,
      ...document.querySelectorAll('main, article, .article, .post, .content, [role="main"]'),
      ...document.querySelectorAll('p, div, span, li, h1, h2, h3, h4, h5, h6')
    ];

    elementsToReset.forEach(element => {
      if (element && element.style) {
        element.style.fontFamily = '';
        element.style.fontSize = '';
        element.style.lineHeight = '';
        element.style.background = '';
        element.style.color = '';
        element.style.margin = '';
        element.style.padding = '';
        element.style.maxWidth = '';
        element.style.boxShadow = '';
        element.style.borderRadius = '';
      }
    });
  }

  removeReadingModeIndicator() {
    // Remove the "Reading Mode Active" indicator if it exists
    const indicators = document.querySelectorAll('[style*="Neuro Focus Reading Mode Active"]');
    indicators.forEach(indicator => {
      indicator.remove();
    });

    // Also check for pseudo-elements by looking for styles that might create them
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach(style => {
      if (style.textContent.includes('body::before') && 
          style.textContent.includes('Neuro Focus Reading Mode Active')) {
        style.remove();
      }
    });
  }

  showNotification(title, message) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: #2c3e50 !important;
      color: white !important;
      padding: 15px 20px !important;
      border-radius: 8px !important;
      font-family: Arial, sans-serif !important;
      font-size: 14px !important;
      z-index: 1000000 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      max-width: 300px !important;
      opacity: 0 !important;
      transform: translateX(100%) !important;
      transition: all 0.3s ease !important;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize the dyslexia ruler when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DyslexiaRuler();
  });
} else {
  new DyslexiaRuler();
}
