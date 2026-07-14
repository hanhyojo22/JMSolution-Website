// JM Solution IT Services — shared behavior

// Pin the header directly below the (also sticky) top bar, measuring its
// real height so it stays correct if the top bar wraps to two lines.
document.addEventListener('DOMContentLoaded', function () {
  const topbar = document.querySelector('.jm-topbar');
  const header = document.querySelector('.jm-header');
  if (!topbar) return;
  function setTopbarHeight() {
    document.documentElement.style.setProperty('--jm-topbar-h', topbar.offsetHeight + 'px');
    if (header) {
      document.documentElement.style.setProperty('--jm-header-h', header.offsetHeight + 'px');
    }
  }
  setTopbarHeight();
  window.addEventListener('resize', setTopbarHeight);
});

// Header only takes on the floating/elevated look once the page is scrolled.
// On the home page (full-bleed photo hero), stay transparent for as long as
// the hero is still visible behind the sticky header, then switch to the
// solid pill and swap the logo for the light-background variant.
document.addEventListener('DOMContentLoaded', function () {
  const header = document.querySelector('.jm-header');
  if (!header) return;
  const topbar = document.querySelector('.jm-topbar');
  const onHero = header.classList.contains('jm-header-on-hero');
  const hero = onHero ? document.querySelector('.jm-hero, .jm-tb-hero') : null;
  const logoImg = header.querySelector('.jm-header-logo img');

  function updateHeaderScroll() {
    var scrolled;
    if (onHero && hero) {
      var coverHeight = header.offsetHeight + (topbar ? topbar.offsetHeight : 0);
      scrolled = hero.getBoundingClientRect().bottom <= coverHeight;
    } else {
      scrolled = window.scrollY > 8;
    }
    header.classList.toggle('jm-scrolled', scrolled);
    if (onHero) {
      header.classList.toggle('jm-hero-scrolling', !scrolled && window.scrollY > 0);
    }
    if (logoImg) {
      var unscrolledLogo = header.getAttribute('data-logo-unscrolled') || 'uploads/logo.webp';
      logoImg.src = scrolled ? 'uploads/logoblue.webp' : unscrolledLogo;
    }
  }

  updateHeaderScroll();
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
  window.addEventListener('resize', updateHeaderScroll, { passive: true });
});

function toggleNav() {
  const panel = document.getElementById('mobilePanel');
  const btn = document.querySelector('.jm-hamburger-btn');
  if (!panel || !btn) return;
  const isOpen = panel.classList.toggle('open');
  const ham = btn.querySelector('.icon-hamburger');
  const close = btn.querySelector('.icon-close');
  if (ham) ham.style.display = isOpen ? 'none' : '';
  if (close) close.style.display = isOpen ? '' : 'none';
}

// Close the mobile menu when a link inside it is clicked (page will navigate anyway,
// but this keeps state clean for same-page anchors).
document.addEventListener('DOMContentLoaded', function () {
  const panel = document.getElementById('mobilePanel');
  if (panel) {
    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        panel.classList.remove('open');
      });
    });
  }
});

// Services hover dropdown
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.jm-svc-dd').forEach(function (dd) {
    let closeTimer;
    dd.addEventListener('mouseenter', function () {
      clearTimeout(closeTimer);
      dd.classList.add('is-open');
    });
    dd.addEventListener('mouseleave', function () {
      closeTimer = setTimeout(function () {
        dd.classList.remove('is-open');
      }, 150);
    });
  });
});

// Respect reduced motion in the hero network-hub SVG: stop the SMIL animations
// and hide the traveling pulse dots instead of leaving them frozen mid-flight
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.jm-hub-svg').forEach(function (svg) {
      if (svg.pauseAnimations) svg.pauseAnimations();
      svg.querySelectorAll('animateMotion').forEach(function (anim) {
        const pulse = anim.closest('circle');
        if (pulse) pulse.style.opacity = '0';
      });
    });
  }
});

// Homepage hero carousel
document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('[data-slide]'));
  const dots = Array.from(carousel.querySelectorAll('[data-slide-to]'));
  if (!slides.length || slides.length !== dots.length) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timer = null;

  function showSlide(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach(function (slide, slideIndex) {
      slide.classList.toggle('is-active', slideIndex === current);
    });
    dots.forEach(function (dot, dotIndex) {
      const active = dotIndex === current;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function stopAuto() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startAuto() {
    if (reduced) return;
    stopAuto();
    timer = window.setInterval(function () {
      showSlide(current + 1);
    }, 4800);
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      showSlide(parseInt(dot.getAttribute('data-slide-to'), 10) || 0);
      startAuto();
    });
  });

  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);
  carousel.addEventListener('focusin', stopAuto);
  carousel.addEventListener('focusout', startAuto);

  showSlide(0);
  startAuto();
});

// Recent Projects carousel (index.html only) — swipe/drag through project
// cards, grouped into pages. No autoplay; manual navigation only.
document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('[data-proj-carousel]');
  const track = carousel ? carousel.querySelector('[data-proj-track]') : null;
  const dotsWrap = document.querySelector('[data-proj-dots]');
  const cards = track ? Array.from(track.querySelectorAll('.jm-proj-card')) : [];
  if (!carousel || !track || !dotsWrap || !cards.length) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GAP = 22;
  const DRAG_THRESHOLD = 50;

  let cardsPerView = 0;
  let pageCount = 1;
  let currentPage = 0;
  let dragging = false;
  let startX = 0;
  let baseTranslate = 0;
  let dragDistance = 0;

  function getCardsPerView() {
    const w = window.innerWidth;
    if (w < 700) return 1;
    if (w < 1000) return 2;
    return 4;
  }

  function setTransform(px, skipTransition) {
    if (skipTransition || reduced) track.classList.add('is-dragging');
    track.style.transform = 'translateX(' + px + 'px)';
    if (skipTransition || reduced) {
      void track.offsetWidth;
      track.classList.remove('is-dragging');
    }
  }

  function updateDots() {
    Array.from(dotsWrap.children).forEach(function (dot, i) {
      const active = i === currentPage;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderDots() {
    dotsWrap.innerHTML = '';
    if (pageCount <= 1) { dotsWrap.style.display = 'none'; return; }
    dotsWrap.style.display = 'flex';
    for (let i = 0; i < pageCount; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'jm-proj-dot';
      dot.setAttribute('aria-label', 'Show project page ' + (i + 1));
      dot.addEventListener('click', function () { goToPage(i); });
      dotsWrap.appendChild(dot);
    }
    updateDots();
  }

  function goToPage(page, skipTransition) {
    currentPage = Math.max(0, Math.min(page, pageCount - 1));
    setTransform(-currentPage * carousel.clientWidth, skipTransition);
    updateDots();
  }

  function layout() {
    const newCardsPerView = getCardsPerView();
    const newPageCount = Math.ceil(cards.length / newCardsPerView);
    const rebuildDots = newCardsPerView !== cardsPerView;

    cardsPerView = newCardsPerView;
    pageCount = newPageCount;
    currentPage = Math.min(currentPage, pageCount - 1);

    const viewportWidth = carousel.clientWidth;
    const cardWidth = (viewportWidth - GAP * (cardsPerView - 1)) / cardsPerView;
    cards.forEach(function (card) { card.style.flex = '0 0 ' + cardWidth + 'px'; });

    track.classList.add('is-carousel');
    if (rebuildDots) renderDots();
    goToPage(currentPage, true);
  }

  function dragStart(x) {
    dragging = true;
    dragDistance = 0;
    startX = x;
    baseTranslate = -currentPage * carousel.clientWidth;
    track.classList.add('is-dragging');
  }

  function dragMove(x) {
    if (!dragging) return;
    const delta = x - startX;
    dragDistance = Math.abs(delta);
    track.style.transform = 'translateX(' + (baseTranslate + delta) + 'px)';
  }

  function dragEnd(x) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    const delta = x - startX;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      goToPage(currentPage + (delta < 0 ? 1 : -1));
    } else {
      goToPage(currentPage);
    }
  }

  track.addEventListener('touchstart', function (e) { dragStart(e.touches[0].clientX); }, { passive: true });
  track.addEventListener('touchmove', function (e) { dragMove(e.touches[0].clientX); }, { passive: true });
  track.addEventListener('touchend', function (e) { dragEnd(e.changedTouches[0].clientX); });

  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;
    dragStart(e.clientX);
  });
  window.addEventListener('pointermove', function (e) { dragMove(e.clientX); });
  window.addEventListener('pointerup', function (e) { dragEnd(e.clientX); });

  // Prevent a card link from navigating when the user was actually dragging.
  track.addEventListener('click', function (e) {
    if (dragDistance > 10) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 150);
  });

  layout();
});

// Scroll-reveal for below-the-fold sections. Elements are visible by default
// (no-JS / crawler safe); only hidden-then-revealed when we can actually animate.
document.addEventListener('DOMContentLoaded', function () {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.jm-reveal');
  if (reduced || !('IntersectionObserver' in window) || !revealEls.length) return;

  revealEls.forEach(function (el) { el.classList.add('pre'); });
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('pre');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(function (el) { io.observe(el); });
});

// Count-up stat numbers when they scroll into view. Markup already contains
// the real final number, so no-JS / reduced-motion visitors see it immediately.
document.addEventListener('DOMContentLoaded', function () {
  const counters = document.querySelectorAll('.jm-count');
  if (!counters.length) return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) return;

  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    const duration = 1400;
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  const cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        cio.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  counters.forEach(function (el) { cio.observe(el); });
});

// Image lightbox: any [data-lightbox-gallery] container's .jm-lightbox-trigger
// images open full-size in an overlay with prev/next navigation between the
// other triggers in the same container. No-JS visitors just see the plain
// inline images (unaffected).
document.addEventListener('DOMContentLoaded', function () {
  const galleries = document.querySelectorAll('[data-lightbox-gallery]');
  if (!galleries.length) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dialog = document.createElement('dialog');
  dialog.className = 'jm-lightbox' + (reduced ? ' jm-no-anim' : '');
  dialog.innerHTML =
    '<button type="button" class="jm-lightbox-close" aria-label="Close">&times;</button>' +
    '<button type="button" class="jm-lightbox-prev" aria-label="Previous image">&lsaquo;</button>' +
    '<button type="button" class="jm-lightbox-next" aria-label="Next image">&rsaquo;</button>' +
    '<figure class="jm-lightbox-figure">' +
      '<img class="jm-lightbox-img" alt="">' +
      '<figcaption class="jm-lightbox-caption"></figcaption>' +
    '</figure>';
  document.body.appendChild(dialog);

  const imgEl = dialog.querySelector('.jm-lightbox-img');
  const captionEl = dialog.querySelector('.jm-lightbox-caption');

  let items = [];
  let index = 0;

  function show(i) {
    index = (i + items.length) % items.length;
    const item = items[index];
    imgEl.src = item.src;
    imgEl.alt = item.alt;
    captionEl.textContent = item.caption;
    captionEl.style.display = item.caption ? '' : 'none';
  }

  function open(list, startIndex) {
    items = list;
    show(startIndex);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  dialog.querySelector('.jm-lightbox-close').addEventListener('click', function () { dialog.close(); });
  dialog.querySelector('.jm-lightbox-prev').addEventListener('click', function () { show(index - 1); });
  dialog.querySelector('.jm-lightbox-next').addEventListener('click', function () { show(index + 1); });

  // Clicking the backdrop fires a click on the dialog itself (not its children).
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });
  dialog.addEventListener('close', function () { imgEl.src = ''; });

  galleries.forEach(function (gallery) {
    const triggers = Array.prototype.slice.call(gallery.querySelectorAll('.jm-lightbox-trigger'));
    if (!triggers.length) return;
    const list = triggers.map(function (img) {
      const figure = img.closest('figure');
      const figcaption = figure ? figure.querySelector('figcaption') : null;
      return { src: img.currentSrc || img.src, alt: img.alt, caption: figcaption ? figcaption.textContent.trim() : '' };
    });
    triggers.forEach(function (img, i) {
      img.setAttribute('role', 'button');
      img.setAttribute('tabindex', '0');
      if (!img.hasAttribute('aria-label')) img.setAttribute('aria-label', 'View larger image');
      img.addEventListener('click', function () { open(list, i); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(list, i);
        }
      });
    });
  });
});

// Click-to-load Facebook video embeds (team-building.html). Markup ships as
// a real link to the video on Facebook (works with no JS); clicking swaps it
// for the Facebook video plugin iframe instead of navigating away.
document.addEventListener('DOMContentLoaded', function () {
  const posters = document.querySelectorAll('.jm-tb-video-poster');
  if (!posters.length) return;

  posters.forEach(function (poster) {
    poster.addEventListener('click', function (e) {
      const videoUrl = poster.getAttribute('data-fb-video');
      if (!videoUrl) return;
      e.preventDefault();

      const iframe = document.createElement('iframe');
      iframe.className = 'jm-tb-video-frame';
      iframe.src = 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(videoUrl) + '&show_text=false&autoplay=true';
      iframe.title = poster.getAttribute('aria-label') || 'Facebook video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.frameBorder = '0';

      poster.replaceWith(iframe);
    });
  });
});

// Contact form (contact.html only)
const CONTACT_WORKER_URL = 'https://jm-contact-form.jm-solution-it.workers.dev';

function handleContactSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  const error = document.getElementById('formError');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  if (!form) return false;

  const turnstileToken = form.querySelector('[name="cf-turnstile-response"]');

  if (error) error.style.display = 'none';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

  fetch(CONTACT_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      message: form.message.value,
      consent: form.consent.checked,
      turnstileToken: turnstileToken ? turnstileToken.value : ''
    })
  }).then(function (res) {
    if (!res.ok) throw new Error('Form submission failed');
    form.style.display = 'none';
    if (success) success.style.display = 'flex';
  }).catch(function () {
    if (error) error.style.display = 'block';
    if (window.turnstile) window.turnstile.reset();
  }).finally(function () {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Message →'; }
  });

  return false;
}
