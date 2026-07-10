/* =====================================================================
   Админ-слой Нижегородской школы скейтбординга
   ---------------------------------------------------------------------
   Статический сайт (GitHub Pages, без бэкенда), поэтому редактирование
   устроено как слой поверх вёрстки:

   • content.json (в репозитории) — ОПУБЛИКОВАННЫЙ контент. Его подгружает
     каждый посетитель и накладывает поверх стандартной вёрстки.
   • localStorage-черновик — НЕопубликованные правки, живут только в браузере
     редактора, пока он не нажмёт «Опубликовать».

   Вход в редактор: одновременно зажать Q + W + E → ввести пароль.

   Публикация:
   • «Опубликовать на сайт» — коммитит content.json (и загруженные фото
     как файлы) прямо в репозиторий через GitHub API по токену. Через ~1 мин
     изменения видят все.
   • «Скачать JSON» / «Загрузить JSON» — резервный путь без токена.

   Ключ элемента — его CSS-путь от <body>. Вёрстка статична, поэтому путь
   стабилен и переживает бесшовную смену страниц (#page-main).
   ===================================================================== */
(function () {
  'use strict';

  var REPO = 'Averjahn/skateschool-redesign';
  var BRANCH = 'main';
  var PASS_HASH = '3ff7f54b35e99e85a14fe8f1234a6c53c05c0d792304862583b7319c8771270a';
  var LS_DRAFT = 'ssnn_admin_draft_v1';
  var LS_TOKEN = 'ssnn_admin_gh_token_v1';
  var LS_PUBCACHE = 'ssnn_pub_cache_v1';

  // Селекторы редактируемого текста (листовые элементы, без вложенности друг в друга)
  var TEXT_SEL = [
    '.logo__text', '.header__phone',
    '.badge', '.hero__title', '.hero__lead', '.hero__facts b', '.hero__facts span', '.hero__actions .btn',
    '.stat__num', '.stat__label',
    '.eyebrow', '.section__title', '.section__sub',
    '.price-card h3', '.price', '.price-card__meta', '.price-card__list li', '.price-card__tag',
    '.offer__price', '.offer h4', '.offer p',
    '.feature h3', '.feature p',
    '.coach__info h3', '.coach__role', '.coach__info p',
    '.spot__tag', '.spot__info h3', '.spot__info p',
    '.ev-tab__title', '.ev-tab__sub',
    '.faq__item summary', '.faq__a',
    '.book__text h2', '.book__text p', '.book__list li',
    '.footer__brand p', '.footer__col h4', '.footer__col a', '.footer__col span', '.footer__bottom span',
    '.subpage-hero__badge', '.subpage-hero h1', '.subpage-hero__lead', '.subpage-hero__actions .btn',
    '.info-chips b', '.info-chips span',
    '.timeline__time', '.timeline__title', '.timeline__text',
    '.stage-card__num', '.stage-card h3', '.stage-card__date', '.stage-card p', '.stage-card__price',
    '.discount-row b', '.discount-row span'
  ].join(',');

  // Редактируемые изображения: <img> внутри контента + блоки с фоновой картинкой
  var IMG_SEL = '#page-main img, .subpage-hero, .ev-tab';

  var draft = loadJSON(LS_DRAFT) || { text: {}, img: {} };
  var published = loadJSON(LS_PUBCACHE) || { text: {}, img: {} };
  var editMode = false;
  var barEl = null;
  var statusEl = null;
  var draftFlagEl = null;

  /* ---------------- утилиты ---------------- */
  function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function draftEmpty() { return !Object.keys(draft.text).length && !Object.keys(draft.img).length; }
  function persistDraft() { saveJSON(LS_DRAFT, draft); }

  async function sha256hex(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Стабильный CSS-путь от body (nth-of-type среди однотипных соседей)
  function cssPath(el) {
    if (!el || el === document.body) return 'body';
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      var tag = el.tagName.toLowerCase();
      var parent = el.parentNode;
      if (parent) {
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === el.tagName; });
        if (same.length > 1) tag += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      }
      parts.unshift(tag);
      el = el.parentNode;
    }
    return parts.join('>');
  }
  function resolve(path) { try { return document.body.querySelector(path); } catch (e) { return null; } }

  // Идентификатор страницы: имя файла из пути ('/', '/index.html', '/skate-camp.html' …).
  // Ключи хранятся как «<scope>::<css-path>», где scope — id страницы, а для
  // элементов внутри header/footer — 'shared' (общие для всех страниц).
  function pageId() { var p = location.pathname.split('/').pop(); return p || 'index.html'; }
  function scopeOf(el) { return el.closest('header, footer') ? 'shared' : pageId(); }
  function keyFor(el) { return scopeOf(el) + '::' + cssPath(el); }
  // Ключ относится к текущей странице?
  function keyMatchesPage(key) {
    var scope = key.split('::')[0];
    return scope === 'shared' || scope === pageId();
  }
  function pathOf(key) { return key.slice(key.indexOf('::') + 2); }

  /* ---------------- наложение контента ---------------- */
  // Итоговый контент = опубликованный + черновик поверх
  function merged() {
    return {
      text: Object.assign({}, published.text, draft.text),
      img: Object.assign({}, published.img, draft.img)
    };
  }
  function applyContent() {
    var m = merged();
    Object.keys(m.text).forEach(function (key) {
      if (!keyMatchesPage(key)) return;
      var el = resolve(pathOf(key));
      if (el && el.innerHTML !== m.text[key]) el.innerHTML = m.text[key];
    });
    Object.keys(m.img).forEach(function (key) {
      if (!keyMatchesPage(key)) return;
      var el = resolve(pathOf(key));
      if (!el) return;
      var val = m.img[key];
      if (el.tagName === 'IMG') { if (el.getAttribute('src') !== val) el.setAttribute('src', val); }
      else { el.style.backgroundImage = 'url(' + val + ')'; }
    });
  }

  // Загружаем опубликованный content.json и обновляем кэш
  function fetchPublished() {
    fetch('content.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (!json) return;
        published = { text: json.text || {}, img: json.img || {} };
        saveJSON(LS_PUBCACHE, published);
        applyContent();
      })
      .catch(function () {});
  }

  /* ---------------- горячие клавиши Q+W+E ---------------- */
  var down = {};
  function isTyping() {
    var a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  }
  document.addEventListener('keydown', function (e) {
    if (editMode || isTyping()) return;
    var k = (e.key || '').toLowerCase();
    if (k === 'q' || k === 'w' || k === 'e' || k === 'й' || k === 'ц' || k === 'у') down[k] = true;
    var qwe = (down.q || down['й']) && (down.w || down['ц']) && (down.e || down['у']);
    if (qwe) { down = {}; openPasswordModal(); }
  });
  document.addEventListener('keyup', function (e) {
    var k = (e.key || '').toLowerCase();
    delete down[k];
  });
  window.addEventListener('blur', function () { down = {}; });

  /* ---------------- модалки ---------------- */
  function modal(html) {
    var back = document.createElement('div');
    back.className = 'ssnn-modal-backdrop';
    back.innerHTML = '<div class="ssnn-modal">' + html + '</div>';
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    document.body.appendChild(back);
    function close() { back.remove(); }
    return { el: back, close: close };
  }

  function openPasswordModal() {
    var m = modal(
      '<h3>🛹 Вход в редактор</h3>' +
      '<p>Панель управления контентом школы. Введите пароль администратора.</p>' +
      '<label>Пароль</label>' +
      '<input type="password" id="ssnnPass" autocomplete="off" placeholder="••••••••" />' +
      '<div class="ssnn-modal__err" id="ssnnPassErr"></div>' +
      '<div class="ssnn-modal__row"><button class="ssnn-btn ssnn-btn--primary" id="ssnnPassOk" style="flex:1">Войти</button>' +
      '<button class="ssnn-btn ssnn-btn--ghost" id="ssnnPassCancel">Отмена</button></div>'
    );
    var inp = m.el.querySelector('#ssnnPass');
    var err = m.el.querySelector('#ssnnPassErr');
    inp.focus();
    async function submit() {
      var h = await sha256hex(inp.value);
      if (h === PASS_HASH) { m.close(); enterEditMode(); }
      else { err.textContent = 'Неверный пароль'; inp.value = ''; inp.focus(); }
    }
    m.el.querySelector('#ssnnPassOk').addEventListener('click', submit);
    m.el.querySelector('#ssnnPassCancel').addEventListener('click', m.close);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); if (e.key === 'Escape') m.close(); });
  }

  function openTokenModal() {
    var cur = '';
    try { cur = localStorage.getItem(LS_TOKEN) || ''; } catch (e) {}
    var m = modal(
      '<h3>⚙️ Токен GitHub для публикации</h3>' +
      '<p>Чтобы правки уходили на сайт автоматически, нужен fine-grained токен GitHub с доступом <b>Contents: Read and write</b> только к репозиторию <b>' + REPO + '</b>. Токен хранится локально в этом браузере.</p>' +
      '<label>Personal access token</label>' +
      '<input type="password" id="ssnnTok" autocomplete="off" placeholder="github_pat_..." value="' + cur.replace(/"/g, '&quot;') + '" />' +
      '<p style="margin-top:-6px"><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Создать токен →</a></p>' +
      '<div class="ssnn-modal__row"><button class="ssnn-btn ssnn-btn--primary" id="ssnnTokOk" style="flex:1">Сохранить</button>' +
      '<button class="ssnn-btn ssnn-btn--ghost" id="ssnnTokCancel">Отмена</button></div>'
    );
    m.el.querySelector('#ssnnTokOk').addEventListener('click', function () {
      var v = m.el.querySelector('#ssnnTok').value.trim();
      try { if (v) localStorage.setItem(LS_TOKEN, v); else localStorage.removeItem(LS_TOKEN); } catch (e) {}
      m.close(); toast(v ? 'Токен сохранён' : 'Токен удалён', 'ok');
    });
    m.el.querySelector('#ssnnTokCancel').addEventListener('click', m.close);
  }

  /* ---------------- тосты ---------------- */
  function toast(msg, kind) {
    var wrap = document.querySelector('.ssnn-toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ssnn-toasts'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'ssnn-toast' + (kind ? ' ssnn-toast--' + kind : '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  /* ---------------- режим редактирования ---------------- */
  function enterEditMode() {
    editMode = true;
    document.body.classList.add('ssnn-editing');
    hideDraftFlag();
    buildBar();
    enableEditing();
    toast('Режим редактирования включён. Нажмите на текст или фото, чтобы изменить.', 'ok');
  }
  function exitEditMode() {
    editMode = false;
    document.body.classList.remove('ssnn-editing');
    disableEditing();
    if (barEl) { barEl.remove(); barEl = null; }
    updateDraftFlag();
  }

  function enableEditing() {
    // текст
    document.querySelectorAll(TEXT_SEL).forEach(function (el) {
      if (el.closest('.ssnn-bar') || el.hasAttribute('data-ssnn-key')) return;
      el.setAttribute('data-ssnn-key', keyFor(el));
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('input', onTextInput);
      el.addEventListener('paste', onPastePlain);
    });
    // картинки
    document.querySelectorAll(IMG_SEL).forEach(function (el) {
      if (el.hasAttribute('data-ssnn-img')) return;
      el.setAttribute('data-ssnn-img', keyFor(el));
    });
  }
  function disableEditing() {
    document.querySelectorAll('[data-ssnn-key]').forEach(function (el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-ssnn-key');
      el.removeEventListener('input', onTextInput);
      el.removeEventListener('paste', onPastePlain);
    });
    document.querySelectorAll('[data-ssnn-img]').forEach(function (el) { el.removeAttribute('data-ssnn-img'); });
  }

  function onTextInput(e) {
    var el = e.currentTarget;
    var key = el.getAttribute('data-ssnn-key');
    draft.text[key] = el.innerHTML;
    persistDraft();
    updateStatus();
  }
  // вставка — только как обычный текст, чтобы не тащить чужую разметку/стили
  function onPastePlain(e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  // Клик по редактируемой картинке / блокировка навигации по ссылкам в режиме правки
  document.addEventListener('click', function (e) {
    if (!editMode) return;
    if (e.target.closest('.ssnn-bar') || e.target.closest('.ssnn-modal-backdrop')) return;
    var textEl = e.target.closest('[data-ssnn-key]');
    var imgEl = e.target.closest('[data-ssnn-img]');
    // не даём ссылкам/кнопкам уводить со страницы, пока идёт правка
    var link = e.target.closest('a, button');
    if (link && !link.closest('.ssnn-bar')) { e.preventDefault(); e.stopPropagation(); }
    if (imgEl && !textEl) { e.preventDefault(); e.stopPropagation(); pickImage(imgEl); }
  }, true);

  function pickImage(el) {
    var key = el.getAttribute('data-ssnn-img');
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      compressImage(file, function (dataUrl) {
        draft.img[key] = dataUrl;
        persistDraft();
        if (el.tagName === 'IMG') el.setAttribute('src', dataUrl);
        else el.style.backgroundImage = 'url(' + dataUrl + ')';
        updateStatus();
        toast('Фото обновлено (не забудьте опубликовать)', 'ok');
      });
    });
    inp.click();
  }

  // Сжатие: вписываем в 1400px по большей стороне, JPEG q0.78
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1400, w = img.width, h = img.height;
        if (w > max || h > max) { var s = Math.min(max / w, max / h); w = Math.round(w * s); h = Math.round(h * s); }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { cb(c.toDataURL('image/jpeg', 0.78)); }
        catch (e) { cb(reader.result); } // на всякий случай — исходник
      };
      img.onerror = function () { cb(reader.result); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- панель редактора ---------------- */
  function buildBar() {
    barEl = document.createElement('div');
    barEl.className = 'ssnn-bar';
    barEl.innerHTML =
      '<span class="ssnn-bar__brand"><span class="ssnn-bar__dot"></span>Редактор</span>' +
      '<span class="ssnn-bar__status" id="ssnnStatus"></span>' +
      '<button class="ssnn-btn ssnn-btn--primary" id="ssnnPublish">🚀 Опубликовать</button>' +
      '<button class="ssnn-btn ssnn-btn--ghost" id="ssnnExport">⬇ Скачать JSON</button>' +
      '<button class="ssnn-btn ssnn-btn--ghost" id="ssnnImport">⬆ Загрузить</button>' +
      '<button class="ssnn-btn ssnn-btn--ghost" id="ssnnToken">⚙</button>' +
      '<button class="ssnn-btn ssnn-btn--danger" id="ssnnDiscard">Сбросить</button>' +
      '<button class="ssnn-btn ssnn-btn--ghost" id="ssnnExit">Выйти</button>';
    document.body.appendChild(barEl);
    statusEl = barEl.querySelector('#ssnnStatus');
    barEl.querySelector('#ssnnPublish').addEventListener('click', publish);
    barEl.querySelector('#ssnnExport').addEventListener('click', exportJSON);
    barEl.querySelector('#ssnnImport').addEventListener('click', importJSON);
    barEl.querySelector('#ssnnToken').addEventListener('click', openTokenModal);
    barEl.querySelector('#ssnnDiscard').addEventListener('click', discardDraft);
    barEl.querySelector('#ssnnExit').addEventListener('click', exitEditMode);
    updateStatus();
  }
  function updateStatus() {
    if (!statusEl) return;
    var n = Object.keys(draft.text).length + Object.keys(draft.img).length;
    statusEl.innerHTML = n ? ('<b>' + n + '</b> неопубликованных правок') : 'изменений нет';
  }

  /* ---------------- черновик / экспорт ---------------- */
  function discardDraft() {
    if (!confirm('Сбросить все неопубликованные правки?')) return;
    draft = { text: {}, img: {} };
    persistDraft();
    applyContent();
    // вернуть исходную вёрстку там, где ключ есть только в черновике — проще перезагрузить контент
    location.reload();
  }

  function exportJSON() {
    var data = JSON.stringify(merged(), null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('content.json скачан. Замените им файл в репозитории.', 'ok');
  }

  function importJSON() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          draft = { text: j.text || {}, img: j.img || {} };
          persistDraft(); applyContent(); updateStatus();
          toast('Загружено. Просмотрите и опубликуйте.', 'ok');
        } catch (e) { toast('Не удалось прочитать JSON', 'err'); }
      };
      r.readAsText(f);
    });
    inp.click();
  }

  /* ---------------- публикация в GitHub ---------------- */
  function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }

  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }

  function ghHeaders(token) {
    return { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };
  }
  async function ghGetSha(path, token) {
    var r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path + '?ref=' + BRANCH, { headers: ghHeaders(token) });
    if (r.status === 200) { var j = await r.json(); return j.sha; }
    if (r.status === 404) return null;
    throw new Error('GitHub ' + r.status + ' при чтении ' + path);
  }
  async function ghPut(path, base64Content, message, token) {
    var sha = await ghGetSha(path, token);
    var body = { message: message, content: base64Content, branch: BRANCH };
    if (sha) body.sha = sha;
    var r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body)
    });
    if (!r.ok) { var t = await r.text(); throw new Error('GitHub ' + r.status + ': ' + t.slice(0, 140)); }
    return r.json();
  }

  async function publish() {
    if (draftEmpty()) { toast('Нет изменений для публикации', 'err'); return; }
    var token = getToken();
    if (!token) {
      toast('Сначала укажите токен GitHub (⚙) — или используйте «Скачать JSON»', 'err');
      openTokenModal();
      return;
    }
    var btn = barEl.querySelector('#ssnnPublish');
    btn.disabled = true; btn.textContent = '⏳ Публикую…';
    try {
      var out = merged();
      // загруженные фото (data:) выкладываем отдельными файлами, в JSON храним путь
      for (var key in out.img) {
        var v = out.img[key];
        if (typeof v === 'string' && v.indexOf('data:') === 0) {
          var comma = v.indexOf(',');
          var b64 = v.slice(comma + 1);
          var safe = key.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'img';
          var path = 'assets/img/uploads/' + safe + '-' + Date.now().toString(36) + '.jpg';
          await ghPut(path, b64, 'admin: загрузка фото', token);
          out.img[key] = path;
        }
      }
      await ghPut('content.json', utf8ToB64(JSON.stringify(out, null, 2)), 'admin: обновление контента', token);
      // успех: черновик становится опубликованным
      published = out; saveJSON(LS_PUBCACHE, published);
      draft = { text: {}, img: {} }; persistDraft();
      applyContent(); updateStatus();
      toast('Опубликовано! Сайт обновится за ~1 минуту.', 'ok');
    } catch (err) {
      toast('Ошибка публикации: ' + err.message, 'err');
    } finally {
      btn.disabled = false; btn.textContent = '🚀 Опубликовать';
    }
  }

  /* ---------------- флажок черновика (вне режима правки) ---------------- */
  function updateDraftFlag() {
    if (editMode || draftEmpty()) { hideDraftFlag(); return; }
    if (draftFlagEl) return;
    draftFlagEl = document.createElement('div');
    draftFlagEl.className = 'ssnn-draft-flag';
    draftFlagEl.innerHTML =
      '<div><b>Черновик не опубликован</b><span>Изменения видите только вы</span></div>' +
      '<button class="ssnn-btn ssnn-btn--primary" id="ssnnResume">Редактировать</button>';
    document.body.appendChild(draftFlagEl);
    draftFlagEl.querySelector('#ssnnResume').addEventListener('click', openPasswordModal);
  }
  function hideDraftFlag() { if (draftFlagEl) { draftFlagEl.remove(); draftFlagEl = null; } }

  /* ---------------- перерисовка страницы (бесшовная навигация) ---------------- */
  document.addEventListener('ssnn:pagerender', function () {
    applyContent();
    if (editMode) enableEditing();
  });

  /* ---------------- старт ---------------- */
  applyContent();      // мгновенно из кэша, чтобы не мигало
  fetchPublished();    // затем свежий content.json
  updateDraftFlag();

  // маленькая подсказка в консоли для владельца
  try { console.log('%c🛹 Админка: Q+W+E → пароль', 'color:#ffd400;font-weight:bold'); } catch (e) {}
})();
