// ===== Theme: авто (устройство) → ручной выбор (localStorage с приоритетом) =====
// Хедер не пересоздаётся при переходах между страницами, поэтому эти привязки — одноразовые.
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
}

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) {}
});

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

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
  });
});

// ===== Появление карточек при скролле (общий наблюдатель, цели переопределяются на каждой странице) =====
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
        revealIO.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

const REVEAL_SELECTOR = '.price-card, .feature, .coach, .spot, .offer, .ev-tab, .stage-card, .timeline__item';

// ===== Всё, что живёт внутри #page-main — переинициализируется после каждого перехода =====
function initPageScripts() {
  // Прайс-табы (только на главной)
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.pricing');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === target));
    });
  });

  // FAQ — открыт только один пункт (главная и подстраницы закатов/лагеря)
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

  // Площадки → переключение Яндекс.Карты (только на главной)
  const spotButtons = document.querySelectorAll('.spot');
  const spotsMap = document.getElementById('spotsMap');
  spotButtons.forEach((spot) => {
    spot.addEventListener('click', () => {
      spotButtons.forEach((s) => s.classList.toggle('is-active', s === spot));
      const ll = spot.dataset.ll;
      if (!ll || !spotsMap) return;
      spotsMap.src = 'https://yandex.ru/map-widget/v1/?ll=' + ll + '&z=16&pt=' + ll + ',pm2rdm';
    });
  });

  // Форма записи (только на главной)
  const form = document.getElementById('bookForm');
  const note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      const consent = document.getElementById('consent').checked;
      if (!name || phone.length < 6 || !consent) {
        form.reportValidity();
        return;
      }
      // Здесь интеграция с CRM/Telegram-ботом/почтой. Демо: показываем подтверждение.
      note.hidden = false;
      form.querySelector('button[type="submit"]').textContent = 'Отправлено ✓';
      form.querySelectorAll('input, select, button').forEach((el) => (el.disabled = true));
    });

    // Формат подставляется из карточек цен/офферов
    document.querySelectorAll('.price-card .btn, .offer .btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('[data-panel]');
        const select = document.getElementById('format');
        const map = { group: 'group', individual: 'individual', pair: 'pair' };
        if (panel && select && map[panel.dataset.panel]) select.value = map[panel.dataset.panel];
      });
    });

    // Формат подставляется из query-параметра ?format=sunset|camp — так к нему приходят
    // кнопки «Записаться» со страниц skate-sunset.html / skate-camp.html.
    const select = document.getElementById('format');
    const params = new URLSearchParams(window.location.search);
    const formatParam = params.get('format');
    if (select && formatParam && [...select.options].some((o) => o.value === formatParam)) {
      select.value = formatParam;
    }
  }

  // Появление карточек при скролле — цели ищем заново, т.к. #page-main пересоздаётся
  document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    revealIO.observe(el);
  });
}

// ===== Бесшовная навигация между страницами (главная / закаты / лагерь) =====
// Хедер и футер остаются на месте, подменяется только содержимое #page-main —
// поэтому переход выглядит мгновенным, без белого экрана перезагрузки.
function isSoftNavLink(anchor) {
  if (!anchor || !anchor.href) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  let url;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch (e) {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  const isHtmlPage = /\.html$/.test(url.pathname) || url.pathname.endsWith('/');
  if (!isHtmlPage) return false;
  // Чистая смена якоря на текущей странице — отдаём браузеру для нативного плавного скролла
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
  return true;
}

async function softNavigate(href, push) {
  const targetUrl = new URL(href, window.location.href);
  try {
    const res = await fetch(targetUrl.pathname + targetUrl.search);
    if (!res.ok) throw new Error('Network response was not ok');
    const html = await res.text();
    const nextDoc = new DOMParser().parseFromString(html, 'text/html');
    const nextMain = nextDoc.getElementById('page-main');
    const curMain = document.getElementById('page-main');
    if (!nextMain || !curMain) throw new Error('page-main not found');

    const swap = () => {
      curMain.replaceWith(nextMain);
      nextMain.id = 'page-main';
      document.title = nextDoc.title;
      initPageScripts();
    };

    // pushState — ДО swap()/initPageScripts(): те читают window.location.search
    // (например, ?format=sunset) для подстановки формата в форму записи.
    if (push) history.pushState({ softNav: true }, '', targetUrl.pathname + targetUrl.search + targetUrl.hash);

    // Переход с якорем (например, index.html?format=sunset#book) пропускает
    // View Transition: анимация скролла к якорю ненадёжно сочетается с крос-фейдом
    // (браузер иногда «съедает» scrollIntoView сразу после снимка перехода),
    // а мгновенный переход к разделу записи важнее декоративного кросс-фейда.
    if (targetUrl.hash) {
      swap();
      const target = document.getElementById(targetUrl.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (document.startViewTransition) {
      document.startViewTransition(swap);
      window.scrollTo(0, 0);
    } else {
      swap();
      window.scrollTo(0, 0);
    }
  } catch (err) {
    window.location.href = targetUrl.href; // сеть подвела — обычный переход как запасной вариант
  }
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const anchor = e.target.closest('a');
  if (!isSoftNavLink(anchor)) return;
  e.preventDefault();
  softNavigate(anchor.href, true);
});

window.addEventListener('popstate', () => {
  softNavigate(window.location.href, false);
});

initPageScripts();
