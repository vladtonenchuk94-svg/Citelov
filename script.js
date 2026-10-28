(() => {
'use strict';
const C = window.CONFIG || {};
const $ = s => document.querySelector(s);
const KEY = 'angelina-game-v1', PHOTO_KEY = 'angelina-final-photo';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fresh = () => ({ screen: 'intro', done: [], opened: [], secrets: [] });
let st = fresh();

/* ---------- Допоміжне ---------- */
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
// LocalStorage може бути недоступним (приватний режим) — тоді гра працює без збереження
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
function load() {
  try {
    const s = JSON.parse(store.get(KEY));
    if (s && ['intro','l1','l2','l3','l4','final'].includes(s.screen) && ['done','opened','secrets'].every(k => Array.isArray(s[k]))) st = s;
  } catch { st = fresh(); } // пошкоджені дані — починаємо з нуля
}
const save = () => store.set(KEY, JSON.stringify(st));
function toast(t) { const e = h('div', 'toast', t); $('#toasts').append(e); setTimeout(() => e.remove(), 3600); }
function ask(text) {
  return new Promise(res => {
    $('#confirmText').textContent = text; $('#confirm').hidden = false; $('#confirmNo').focus();
    const end = v => { $('#confirm').hidden = true; res(v); };
    $('#confirmYes').onclick = () => end(true); $('#confirmNo').onclick = () => end(false);
  });
}
function burst(el, n = 8) {
  if (reduce) return;
  const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const p = h('span', 'spark', ['💗', '✨', '💖'][i % 3]), a = Math.random() * 6.28, d = 50 + Math.random() * 90;
    p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    document.body.append(p); setTimeout(() => p.remove(), 1100);
  }
}
// Фото з заглушкою, якщо файл не завантажився
function photo(src, alt, cls) {
  const w = h('div', 'ph ' + (cls || '')), i = new Image();
  i.alt = alt || ''; i.decoding = 'async'; i.loading = 'lazy';
  const fail = () => { i.remove(); w.classList.add('empty'); w.replaceChildren(h('span', '', '📷')); };
  i.onerror = fail; w.append(i);
  if (src) i.src = src; else fail();
  return w;
}

/* ---------- Прогрес і навігація ---------- */
function updateBar() {
  const p = Math.round(st.done.length / 5 * 100);
  $('#pfill').style.width = p + '%'; $('.progress').setAttribute('aria-valuenow', p);
}
function complete(l) { if (!st.done.includes(l)) st.done.push(l); save(); updateBar(); }
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + id));
  if (id !== 'intro') st.screen = id;
  save(); updateBar(); scrollTo(0, 0);
  const hd = $(`#s-${id} h1, #s-${id} h2`); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll: true }); }
  ({ intro: initIntro, l1: initL1, l2: initL2, l3: initL3, l4: newGame, final: initFinal })[id]();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (!g || g.disabled) return;
  if (g.dataset.complete) complete(g.dataset.complete);
  show(g.dataset.go);
});

/* ---------- Заставка ---------- */
let skipTimer;
function initIntro() {
  $('#start').textContent = st.done.length ? 'Продовжити пригоду' : 'Почати нашу пригоду';
  $('#introMsg').textContent = C.introMessage || '';
  $('#s-intro').classList.remove('skipped'); $('#skip').hidden = false;
  clearTimeout(skipTimer); skipTimer = setTimeout(() => $('#skip').hidden = true, 4500);
}
$('#skip').onclick = () => { $('#s-intro').classList.add('skipped'); $('#skip').hidden = true; };
$('#start').onclick = () => show(st.screen === 'intro' ? 'l1' : st.screen);

/* ---------- Рівень 1 ---------- */
let slides = [], ci = 0;
function renderTimer() {
  const d = C.metDate ? new Date(C.metDate) : null, n = new Date();
  if (!d || isNaN(d) || d > n) { $('#timer').hidden = true; $('#timerStub').hidden = false; return; }
  $('#timerStub').hidden = true; $('#timer').hidden = false;
  let y = n.getFullYear() - d.getFullYear(); const a = new Date(d); a.setFullYear(d.getFullYear() + y);
  if (a > n) { y--; a.setFullYear(d.getFullYear() + y); }
  const r = n - a, v = { y, d: Math.floor(r / 864e5), h: Math.floor(r / 36e5) % 24, m: Math.floor(r / 6e4) % 60 };
  for (const k in v) $('#t-' + k).textContent = v[k];
}
function drawSlide() {
  const s = slides[ci];
  $('#slide').replaceChildren(photo(s.src, s.caption), h('span', 'cap', s.caption || 'Тут буде ваша фотографія'));
  $('#slideNum').textContent = (ci + 1) + ' / ' + slides.length;
}
function initL1() { slides = C.startPhotos && C.startPhotos.length ? C.startPhotos : [{}]; ci = 0; drawSlide(); renderTimer(); }
$('#prev').onclick = () => { ci = (ci - 1 + slides.length) % slides.length; drawSlide(); };
$('#next').onclick = () => { ci = (ci + 1) % slides.length; drawSlide(); };

/* ---------- Рівень 2 ---------- */
let lastFocus;
function openModal(nodes) {
  $('#modalBody').replaceChildren(...nodes); lastFocus = document.activeElement;
  $('#modal').hidden = false; document.body.classList.add('lock'); $('#modalClose').focus();
}
function closeModal() { $('#modal').hidden = true; document.body.classList.remove('lock'); if (lastFocus) lastFocus.focus(); }
$('#modalClose').onclick = closeModal;
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#confirm').hidden) $('#confirmNo').click(); else if (!$('#modal').hidden) closeModal();
});
function updateMem() {
  const t = (C.memories || []).length;
  $('#memCount').textContent = `Відкрито ${st.opened.length} з ${t}`; $('#go2').disabled = st.opened.length < t;
}
function initL2() {
  const g = $('#grid'); g.replaceChildren();
  (C.memories || []).forEach((m, i) => {
    const b = h('button', 'card' + (st.opened.includes(i) ? ' seen' : '')); b.type = 'button';
    b.append(photo(m.src, m.title), h('span', 'cap', m.title || 'Спогад ' + (i + 1)));
    b.onclick = () => {
      openModal([photo(m.src, m.title, 'big'), h('h3', '', m.title || ''), h('p', 'mut', m.text || '')]);
      if (!st.opened.includes(i)) { st.opened.push(i); save(); }
      b.classList.add('seen'); updateMem();
    };
    g.append(b);
  });
  updateMem();
}

/* ---------- Рівень 3 ---------- */
let typing;
function initL3() {
  clearTimeout(typing); $('#envelope').classList.remove('open'); $('#envelope').hidden = false;
  $('#paper').hidden = true; $('#go3').hidden = true;
}
$('#envelope').onclick = () => {
  const e = $('#envelope'); if (e.classList.contains('open')) return;
  e.classList.add('open'); setTimeout(showLetter, reduce ? 0 : 900);
};
function showLetter() {
  $('#envelope').hidden = true; const p = $('#paper'), L = C.letter || {}, body = $('#letterBody');
  p.hidden = false; $('#letterTitle').textContent = L.title || 'Лист для тебе'; body.replaceChildren();
  const paras = L.paragraphs || [], els = paras.map(() => body.appendChild(h('p')));
  const finish = () => { clearTimeout(typing); els.forEach((e, i) => e.textContent = paras[i]); $('#go3').hidden = false; };
  if (reduce) return finish();
  let pi = 0, c = 0;
  const step = () => {
    if (pi >= paras.length) return finish();
    els[pi].textContent = paras[pi].slice(0, ++c);
    if (c >= paras[pi].length) { pi++; c = 0; typing = setTimeout(step, 350); } else typing = setTimeout(step, 24);
  };
  step(); p.onclick = finish; // торкнись листа, щоб показати весь текст одразу
}

/* ---------- Рівень 4: мінігра ---------- */
let found = 0;
function newGame() {
  const f = $('#field'); f.replaceChildren(); found = 0; $('#win').hidden = true; $('#count').textContent = '0';
  const N = C.heartsToFind || 7, W = f.clientWidth || 300, H = f.clientHeight || 360, S = 46, pts = [];
  const rnd = () => [Math.random() * (W - S), Math.random() * (H - S)];
  const place = () => { for (let t = 0; t < 60; t++) { const p = rnd(); if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > S + 4)) { pts.push(p); return p; } } const p = rnd(); pts.push(p); return p; };
  const decor = ['✦', '✧', '♡', '·', '❖'], items = [];
  for (let i = 0; i < N + 10; i++) {
    const real = i < N, b = h('button', real ? 'heart' + (i < 3 ? ' dim' : '') : 'decoy', real ? '♥' : decor[i % 5]);
    b.type = 'button'; b.setAttribute('aria-label', real ? 'Сердечко' : 'Прикраса');
    const [x, y] = place(); b.style.left = x + 'px'; b.style.top = y + 'px';
    b.onclick = () => real ? hit(b, N) : (b.classList.remove('shake'), void b.offsetWidth, b.classList.add('shake'));
    items.push(b);
  }
  items.sort(() => Math.random() - .5).forEach(b => f.append(b));
}
function hit(b, N) {
  if (b.disabled) return;
  b.disabled = true; b.classList.add('found'); burst(b, 6); found++; $('#count').textContent = found + ' / ' + N;
  if (found >= N) { complete('l4'); setTimeout(() => { $('#win').hidden = false; $('#win').scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }, 600); }
}
$('#replay').onclick = newGame;

/* ---------- Фінал ---------- */
function drawFinalPhoto() { $('#finalPhoto').replaceChildren(photo(store.get(PHOTO_KEY) || C.finalPhoto || '', 'Наше фото')); }
function initFinal() {
  complete('final');
  $('#finalText').replaceChildren(...(C.finalText || []).map(t => h('p', '', t)));
  $('#hidden').hidden = true; $('#hiddenText').textContent = C.hiddenMessage || '';
  $('#secretCount').textContent = `Секретів знайдено: ${st.secrets.length} з 3`;
  drawFinalPhoto(); burst(null, 18);
}
$('#reveal').onclick = () => { $('#hidden').hidden = false; burst(null, 26); $('#hidden').scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); };
$('#addPhoto').onclick = () => $('#photoInput').click();
$('#photoInput').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url); const d = c.toDataURL('image/jpeg', .8);
    if (store.set(PHOTO_KEY, d)) { drawFinalPhoto(); toast('Фото додано та збережено в цьому браузері 📷'); }
    else { $('#finalPhoto').replaceChildren(photo(d, 'Фото')); toast('Фото показано, але не збережено: немає місця'); }
  };
  img.onerror = () => toast('Не вдалося відкрити це фото'); img.src = url; e.target.value = '';
};
// «Пройти ще раз» не стирає фото та знайдені секрети
$('#again').onclick = () => { st = { screen: 'l1', done: [], opened: [], secrets: st.secrets }; show('l1'); };
// «Почати спочатку» з підтвердженням: очищує прогрес, але лишає додане фото
$('#btnRestart').onclick = async () => {
  if (!(await ask('Почати спочатку? Весь прогрес і знайдені секрети буде скинуто. Додане фото залишиться.'))) return;
  st = fresh(); store.del(KEY); show('intro'); toast('Гру скинуто');
};

/* ---------- Секрети ---------- */
const taps = {};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-secret]'); if (!t) return;
  const id = t.dataset.secret; taps[id] = (taps[id] || 0) + 1;
  if (taps[id] < +t.dataset.taps) return; taps[id] = 0;
  if (st.secrets.includes(id)) return toast('Цей секрет уже знайдено ✨');
  st.secrets.push(id); save(); burst(t, 10); toast((C.secrets && C.secrets[id]) || 'Ти знайшла секрет 💗');
  if (st.secrets.length >= 3) setTimeout(() => { toast(C.bonus || 'Ти знайшла всі секрети! 🎁'); burst(null, 26); }, 1800);
});

/* ---------- Музика (лише після натискання) ---------- */
const au = new Audio(); au.loop = true; au.volume = .6; let playing = false;
function setSnd(v) { playing = v; $('#btnSound').textContent = v ? '🔊' : '🔇'; $('#btnSound').setAttribute('aria-pressed', v); $('#btnSound').setAttribute('aria-label', v ? 'Вимкнути музику' : 'Увімкнути музику'); }
au.onerror = () => { if (au.getAttribute('src')) { setSnd(false); toast('Музичний файл не знайдено. Додай його в assets/audio'); } };
$('#btnSound').onclick = () => {
  if (playing) { au.pause(); setSnd(false); return; }
  if (!C.music) return toast('Музичний файл ще не додано');
  if (!au.getAttribute('src')) au.src = C.music;
  au.play().then(() => setSnd(true)).catch(err => { setSnd(false); if (err && err.name === 'NotAllowedError') toast('Не вдалося увімкнути музику'); });
};

/* ---------- Фонові сердечка ---------- */
function bg() {
  for (let i = 0; i < 9; i++) {
    const s = h('span', 'fl', '♥');
    s.style.cssText = `left:${Math.random() * 100}%;font-size:${12 + Math.random() * 16}px;animation-duration:${14 + Math.random() * 12}s;animation-delay:${-Math.random() * 20}s`;
    $('#bg').append(s);
  }
}

/* ---------- Старт ---------- */
load(); bg(); setInterval(renderTimer, 1000); setSnd(false); show('intro');
})();
