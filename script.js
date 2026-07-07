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
  const open = nav.classList.toggle('is-open');
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});

// Закрываем меню при клике по любой ссылке/кнопке внутри
nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
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

// ===== Events: закаты / лагерь =====
const evTabs = document.querySelectorAll('.ev-tab');
const evPanels = document.querySelectorAll('.ev-panel');

evTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.ev;
    evTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
    evPanels.forEach((p) => p.classList.toggle('is-active', p.dataset.evPanel === target));
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
document.querySelectorAll('.price-card .btn, .offer .btn, .ev-panel .btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = btn.closest('[data-panel]');
    const evPanel = btn.closest('[data-ev-panel]');
    const select = document.getElementById('format');
    if (!select) return;
    if (panel) {
      const map = { group: 'group', individual: 'individual', pair: 'pair' };
      if (map[panel.dataset.panel]) select.value = map[panel.dataset.panel];
    } else if (evPanel) {
      const map = { sunset: 'sunset', camp: 'camp' };
      if (map[evPanel.dataset.evPanel]) select.value = map[evPanel.dataset.evPanel];
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

document.querySelectorAll('.price-card, .feature, .coach, .spot, .offer, .ev-tab').forEach((el) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  io.observe(el);
});
