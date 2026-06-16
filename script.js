// ===== Theme: авто (устройство) → ручной выбор (localStorage с приоритетом) =====
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
}

// Тоггл: переключаем и ЗАПОМИНАЕМ осознанный выбор
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) {}
});

// Если пользователь НЕ выбирал вручную — следуем за системой даже на лету
systemDark.addEventListener('change', (e) => {
  try { if (localStorage.getItem('theme')) return; } catch (err) {}
  applyTheme(e.matches ? 'dark' : 'light');
});

// ===== Mobile menu =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  burger.classList.toggle('is-open');
  nav.classList.toggle('is-open');
});

// Закрываем меню при клике по ссылке
nav.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
  });
});

// ===== Pricing tabs =====
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.pricing');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
    panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === target));
  });
});

// ===== FAQ — открыт только один пункт =====
const faqItems = document.querySelectorAll('.faq__item');
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    }
  });
});

// ===== Spots → переключение Яндекс.Карты =====
const spotButtons = document.querySelectorAll('.spot');
const spotsMap = document.getElementById('spotsMap');

spotButtons.forEach((spot) => {
  spot.addEventListener('click', () => {
    spotButtons.forEach((s) => s.classList.toggle('is-active', s === spot));
    const ll = spot.dataset.ll; // "lon,lat" — координаты + маркер pt, без всплывающей карточки-поиска
    if (!ll) return;
    spotsMap.src =
      'https://yandex.ru/map-widget/v1/?ll=' + ll + '&z=16&pt=' + ll + ',pm2rdm';
  });
});

// ===== Skate video player =====
const skateFrame    = document.getElementById('skateFrame');
const skateTitle    = document.getElementById('skateVideoTitle');
const skateLabel    = document.getElementById('skateVideoLabel');
const skateYt       = document.getElementById('skateVideoYt');
const skateBadge    = document.getElementById('skateBadge');
const skatePlayer   = document.getElementById('skatePlayer');
const allVideoCards = document.querySelectorAll('.video-card[data-embed-url]');

allVideoCards.forEach((card) => {
  card.addEventListener('click', () => {
    allVideoCards.forEach((c) => c.classList.remove('is-active'));
    card.classList.add('is-active');

    const embedUrl = card.dataset.embedUrl;
    const extUrl   = card.dataset.extUrl;
    const srcType  = card.dataset.srcType;   // "youtube" | "archive"

    // YouTube — с autoplay, archive.org — без (браузер блокирует autoplay в iframe)
    skateFrame.src = srcType === 'youtube'
      ? `${embedUrl}?autoplay=1`
      : embedUrl;

    skateTitle.textContent  = card.dataset.videoTitle;
    skateLabel.textContent  = card.dataset.videoLabel;
    skateYt.href            = extUrl;

    // Обновляем бейдж источника
    skateBadge.dataset.src  = srcType;
    skateBadge.textContent  = srcType === 'youtube'
      ? 'YouTube · нужен VPN'
      : 'Archive.org · без VPN';

    skatePlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

// ===== Booking form =====
const form = document.getElementById('bookForm');
const note = document.getElementById('formNote');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const consent = document.getElementById('consent').checked;

  if (!name || phone.length < 6 || !consent) {
    form.reportValidity();
    return;
  }

  // Здесь интеграция с CRM/Telegram-ботом/почтой.
  // Демо: показываем подтверждение.
  note.hidden = false;
  form.querySelector('button[type="submit"]').textContent = 'Отправлено ✓';
  form.querySelectorAll('input, select, button').forEach((el) => (el.disabled = true));
});

// ===== Header CTA → клик по формату подставляет его в форму =====
document.querySelectorAll('.price-card .btn, .offer .btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = btn.closest('[data-panel]');
    const select = document.getElementById('format');
    if (panel && select) {
      const map = { group: 'group', individual: 'individual', pair: 'pair' };
      if (map[panel.dataset.panel]) select.value = map[panel.dataset.panel];
    }
  });
});

// ===== Лёгкое появление секций при скролле =====
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.price-card, .feature, .coach, .spot, .offer').forEach((el) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  io.observe(el);
});
