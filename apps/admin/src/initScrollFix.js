/**
 * FoodTrail Global Scroll Controller
 * - Enforces zero horizontal scroll across the entire application (strictly vertical scrolling only).
 * - Implements smooth vertical scrolling whenever any button is clicked on long pages or long modals.
 * - Handles action feedback, validation errors, revealed panels, and tab transitions smoothly.
 */

export function setupScrollBehavior() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Inject permanent CSS rule to guarantee zero horizontal scroll across entire display
  const STYLE_ID = 'foodtrail-zero-horizontal-scroll';
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.innerHTML = `
      html, body {
        overflow-x: hidden !important;
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        scroll-behavior: smooth !important;
        overscroll-behavior-x: none !important;
      }
      #root {
        overflow-x: hidden !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      img, video, canvas, svg, table, input, select, textarea, button {
        max-width: 100%;
      }
      .modal, .modal-card, [role="dialog"] {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        max-width: min(680px, calc(100vw - 32px)) !important;
        max-height: calc(100vh - 48px) !important;
        scroll-behavior: smooth !important;
        -webkit-overflow-scrolling: touch !important;
        margin: auto !important;
      }
      .modal-overlay {
        position: fixed !important;
        inset: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        align-items: flex-start !important;
        -webkit-overflow-scrolling: touch !important;
        padding: 24px 16px !important;
      }
      /* Prevent horizontal scrolling on ambient background decorators */
      .ambient-bg {
        width: 100% !important;
        max-width: 100% !important;
        left: 0 !important;
        right: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // 2. Lock root elements to vertical only
  const applyRootScrollConstraints = () => {
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.documentElement.style.setProperty('max-width', '100%', 'important');
    document.documentElement.style.setProperty('width', '100%', 'important');
    document.documentElement.style.setProperty('scroll-behavior', 'smooth', 'important');

    if (document.body) {
      document.body.style.setProperty('overflow-x', 'hidden', 'important');
      document.body.style.setProperty('max-width', '100%', 'important');
      document.body.style.setProperty('width', '100%', 'important');
    }

    const root = document.getElementById('root');
    if (root) {
      root.style.setProperty('overflow-x', 'hidden', 'important');
      root.style.setProperty('max-width', '100%', 'important');
      root.style.setProperty('width', '100%', 'important');
    }
  };

  applyRootScrollConstraints();
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', applyRootScrollConstraints);
  }

  // 3. Immediately neutralise any horizontal offset on window and document
  const neutraliseHorizontalScroll = () => {
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
    if (document.documentElement.scrollLeft !== 0) {
      document.documentElement.scrollLeft = 0;
    }
    if (document.body && document.body.scrollLeft !== 0) {
      document.body.scrollLeft = 0;
    }
  };

  window.addEventListener('scroll', neutraliseHorizontalScroll, { passive: true });

  // 4. Prevent horizontal wheel panning
  window.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 2) {
      event.preventDefault();
      neutraliseHorizontalScroll();
    }
  }, { passive: false });

  // 5. Global button click scrolling handler for long pages & long modals
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, .btn, [role="button"], input[type="submit"], input[type="button"]');
    if (!button) return;

    neutraliseHorizontalScroll();

    // Snapshot page state before click handling takes effect
    const pageHeightBefore = document.documentElement.scrollHeight;
    const scrollYBefore = window.scrollY;

    // Run after React state updates & DOM mutations settle
    setTimeout(() => {
      neutraliseHorizontalScroll();

      // Check if button is inside a scrollable modal / dialog
      const modal = button.closest('.modal, .modal-card, [role="dialog"], [data-scroll-container="true"]');
      if (modal) {
        modal.scrollLeft = 0;
        const isModalLong = modal.scrollHeight > modal.clientHeight + 30;
        if (isModalLong) {
          // Priority 1: Check for validation warnings/alerts inside modal
          const alertEl = modal.querySelector(
            '.submission-warning, [role="alert"], .badge-danger, .toast-error, [data-warning="true"], :invalid'
          );
          if (alertEl && alertEl.offsetParent !== null) {
            alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }

          // Priority 2: If the button revealed newly added items or expanded section
          const newContent = modal.querySelector('.form-success, .verification-result, .ocr-details');
          if (newContent && newContent.offsetParent !== null) {
            newContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
          }

          // Priority 3: Vertical scroll within modal
          const bRect = button.getBoundingClientRect();
          const mRect = modal.getBoundingClientRect();
          if (bRect.bottom > mRect.bottom - 40) {
            modal.scrollBy({ top: Math.min(220, bRect.bottom - mRect.bottom + 60), behavior: 'smooth' });
          } else if (bRect.top < mRect.top + 30) {
            modal.scrollBy({ top: bRect.top - mRect.top - 30, behavior: 'smooth' });
          } else {
            // General advance inside modal
            modal.scrollBy({ top: 120, behavior: 'smooth' });
          }
        }
        return;
      }

      // Check if the current page is long
      const isPageLong = document.documentElement.scrollHeight > window.innerHeight + 30;
      if (!isPageLong) return;

      // Priority 1: Check for newly surfaced form errors, invalid inputs, or warnings
      const invalidField = document.querySelector(':invalid');
      if (invalidField && invalidField.offsetParent !== null) {
        invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof invalidField.focus === 'function') invalidField.focus({ preventScroll: true });
        return;
      }

      const warningEl = document.querySelector(
        '.submission-warning, [role="alert"], .badge-danger, [data-warning="true"]'
      );
      if (warningEl && warningEl.offsetParent !== null) {
        const wRect = warningEl.getBoundingClientRect();
        if (wRect.top < 60 || wRect.bottom > window.innerHeight) {
          warningEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      // Priority 2: Check if button toggled or opened new content (e.g. showAddBranch, showVoucherTerminal, newly added items)
      const pageHeightAfter = document.documentElement.scrollHeight;
      const openedSection = document.querySelector(
        '#register-outlet-section, [data-collapsible="true"], .registration-panel, .voucher-terminal-panel'
      );
      if (openedSection && openedSection.offsetParent !== null) {
        const oRect = openedSection.getBoundingClientRect();
        if (oRect.top < 0 || oRect.top > window.innerHeight - 100) {
          openedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      // If page height expanded significantly (e.g. form/panel toggled open or item added)
      if (pageHeightAfter > pageHeightBefore + 80) {
        window.scrollBy({ top: Math.min(320, pageHeightAfter - pageHeightBefore), behavior: 'smooth' });
        return;
      }

      // Priority 3: Tab switchers, filters, refresh, portal switches -> smooth scroll to top of page/content
      const btnText = (button.innerText || button.getAttribute('aria-label') || '').toLowerCase();
      const isTabOrNav = button.classList.contains('nav-link') ||
                         button.classList.contains('tab-btn') ||
                         button.getAttribute('role') === 'tab' ||
                         /\b(tab|switch|filter|refresh|all outlets|pending|approved|overview|menu|reviews|analytics|users)\b/i.test(btnText);

      if (isTabOrNav && window.scrollY > 150) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Priority 4: Standard action button on a long page
      // Ensure vertical scrolling brings the relevant context/result into view
      const bRect = button.getBoundingClientRect();
      if (bRect.bottom > window.innerHeight - 80) {
        // Button is in the lower portion of the screen -> scroll down smoothly
        window.scrollBy({
          top: Math.min(260, bRect.bottom - window.innerHeight + 100),
          behavior: 'smooth',
        });
      } else if (bRect.top < 80) {
        // Button is near the top edge -> scroll up smoothly
        window.scrollBy({
          top: bRect.top - 100,
          behavior: 'smooth',
        });
      } else {
        // Button in the center: smoothly scroll down slightly (160px) to show newly triggered content or next fields
        const remainingScroll = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        if (remainingScroll > 40) {
          window.scrollBy({
            top: Math.min(180, remainingScroll),
            behavior: 'smooth',
          });
        }
      }
    }, 70);
  }, { passive: true });
}

// Auto-run on import
setupScrollBehavior();
