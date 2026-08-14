/* ============================================================
   PERSONAL DASHBOARD — app.js
   Vanilla JS | LocalStorage | No dependencies

   Challenges:
     ✅ Light / Dark mode
     ✅ Change Pomodoro time
     ✅ Sort tasks
   ============================================================ */

'use strict';

/* ============================================================
   CHALLENGE 1 — LIGHT / DARK MODE
   ============================================================ */
(function initTheme() {
  const KEY = 'dashboard_theme';
  const btn  = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    btn.textContent = theme === 'light' ? '🌙' : '☀️';
    btn.setAttribute('aria-label',
      theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }

  btn.addEventListener('click', () => {
    const next = document.body.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem(KEY, next);
    applyTheme(next);
  });

  // Restore saved preference, fall back to dark
  applyTheme(localStorage.getItem(KEY) || 'dark');
})();


/* ============================================================
   1. GREETING & CLOCK
   ============================================================ */
(function initClock() {
  const clockEl    = document.getElementById('clock');
  const dateEl     = document.getElementById('date');
  const greetingEl = document.getElementById('greeting');

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function getGreeting(hour) {
    if (hour < 12) return 'Good morning! ☀️';
    if (hour < 17) return 'Good afternoon! 🌤️';
    if (hour < 21) return 'Good evening! 🌆';
    return 'Good night! 🌙';
  }

  function tick() {
    const now = new Date();
    const h   = now.getHours();
    clockEl.textContent    = `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    dateEl.textContent     = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    greetingEl.textContent = getGreeting(h);
  }

  tick();
  setInterval(tick, 1000);
})();


/* ============================================================
   2. FOCUS TIMER  +  CHALLENGE 2 — CHANGE POMODORO TIME
   ============================================================ */
(function initTimer() {
  const KEY_DURATION  = 'dashboard_timer_minutes';
  const DEFAULT_MIN   = 25;

  const displayEl    = document.getElementById('timer-display');
  const labelEl      = document.getElementById('timer-label');
  const btnStart     = document.getElementById('btn-start');
  const btnStop      = document.getElementById('btn-stop');
  const btnReset     = document.getElementById('btn-reset');
  const minutesInput = document.getElementById('timer-minutes');
  const btnSetTime   = document.getElementById('btn-set-time');

  // Restore saved duration or fall back to 25
  let focusMinutes = parseInt(localStorage.getItem(KEY_DURATION), 10) || DEFAULT_MIN;
  let remaining    = focusMinutes * 60;
  let interval     = null;
  let isRunning    = false;

  function pad(n) { return String(n).padStart(2, '0'); }

  function renderDisplay() {
    displayEl.textContent = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
  }

  function setLabel(text) { labelEl.textContent = text; }

  function setRunningState(running) {
    isRunning = running;
    displayEl.classList.toggle('running', running);
    btnStart.disabled     = running;
    btnStop.disabled      = !running;
    // Lock duration controls while timer is running
    minutesInput.disabled = running;
    btnSetTime.disabled   = running;
  }

  function start() {
    if (isRunning || remaining <= 0) return;
    setRunningState(true);
    setLabel('Stay focused…');
    interval = setInterval(() => {
      remaining--;
      renderDisplay();
      if (remaining <= 0) {
        clearInterval(interval);
        interval = null;
        setRunningState(false);
        displayEl.classList.add('done');
        setLabel('Session complete! Great work 🎉');
      }
    }, 1000);
  }

  function stop() {
    if (!isRunning) return;
    clearInterval(interval);
    interval = null;
    setRunningState(false);
    setLabel('Paused.');
  }

  function reset() {
    clearInterval(interval);
    interval  = null;
    remaining = focusMinutes * 60;
    setRunningState(false);
    displayEl.classList.remove('done');
    renderDisplay();
    setLabel('Ready to focus?');
  }

  /* ---- Set custom duration ---- */
  function applyDuration() {
    if (isRunning) return;
    let val = parseInt(minutesInput.value, 10);
    if (isNaN(val) || val < 1)  val = 1;
    if (val > 120)               val = 120;
    minutesInput.value = val;
    focusMinutes = val;
    localStorage.setItem(KEY_DURATION, val);
    remaining = focusMinutes * 60;
    displayEl.classList.remove('done');
    renderDisplay();
    setLabel(`Timer set to ${val} min — ready to focus?`);
  }

  btnSetTime.addEventListener('click', applyDuration);
  minutesInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') applyDuration();
  });

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  btnReset.addEventListener('click', reset);

  // Init
  minutesInput.value = focusMinutes;
  btnStop.disabled   = true;
  renderDisplay();
})();


/* ============================================================
   3. TO-DO LIST  +  CHALLENGE 3 — SORT TASKS
   ============================================================ */
(function initTodo() {
  const STORAGE_KEY = 'dashboard_todos';
  const SORT_KEY    = 'dashboard_todo_sort';

  const form       = document.getElementById('todo-form');
  const input      = document.getElementById('todo-input');
  const listEl     = document.getElementById('todo-list');
  const emptyEl    = document.getElementById('todo-empty');
  const sortSelect = document.getElementById('sort-select');
  const modal      = document.getElementById('edit-modal');
  const editInput  = document.getElementById('edit-input');
  const editSave   = document.getElementById('edit-save');
  const editCancel = document.getElementById('edit-cancel');

  let todos     = [];
  let editingId = null;

  /* ---- Storage ---- */
  function load() {
    try { todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { todos = []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  /* ---- Helpers ---- */
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function sanitize(str) {
    return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---- Sort ---- */
  function getSorted() {
    const mode = sortSelect.value;
    const copy = [...todos];
    if (mode === 'alpha')      return copy.sort((a, b) => a.text.localeCompare(b.text));
    if (mode === 'alpha-desc') return copy.sort((a, b) => b.text.localeCompare(a.text));
    if (mode === 'done')       return copy.sort((a, b) => Number(a.done) - Number(b.done));
    return copy; // 'added' — insertion order
  }

  /* ---- Render ---- */
  function render() {
    listEl.innerHTML = '';
    const sorted = getSorted();
    emptyEl.style.display = sorted.length ? 'none' : 'block';

    sorted.forEach(todo => {
      const li = document.createElement('li');
      li.className  = 'todo-item' + (todo.done ? ' done' : '');
      li.dataset.id = todo.id;

      li.innerHTML = `
        <input
          type="checkbox"
          class="todo-checkbox"
          aria-label="Mark as done"
          ${todo.done ? 'checked' : ''}
        />
        <span class="todo-text">${sanitize(todo.text)}</span>
        <div class="todo-actions">
          <button class="btn-icon edit-btn"        aria-label="Edit task">✏️</button>
          <button class="btn-icon danger delete-btn" aria-label="Delete task">🗑️</button>
        </div>
      `;

      li.querySelector('.todo-checkbox').addEventListener('change', () => toggleDone(todo.id));
      li.querySelector('.edit-btn').addEventListener('click',       () => openEdit(todo.id));
      li.querySelector('.delete-btn').addEventListener('click',     () => deleteTodo(todo.id));

      listEl.appendChild(li);
    });
  }

  /* ---- CRUD ---- */
  function addTodo(text) {
    if (!text) return;
    todos.push({ id: genId(), text, done: false });
    save();
    render();
  }

  function toggleDone(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) { todo.done = !todo.done; save(); render(); }
  }

  function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    save();
    render();
  }

  function updateTodo(id, newText) {
    if (!newText) return;
    const todo = todos.find(t => t.id === id);
    if (todo) { todo.text = newText; save(); render(); }
  }

  /* ---- Edit Modal ---- */
  function openEdit(id) {
    editingId = id;
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    editInput.value = todo.text;
    modal.hidden = false;
    editInput.focus();
  }

  function closeEdit() {
    modal.hidden  = true;
    editingId     = null;
    editInput.value = '';
  }

  editSave.addEventListener('click', () => {
    const newText = editInput.value.trim();
    if (newText && editingId) updateTodo(editingId, newText);
    closeEdit();
  });

  editCancel.addEventListener('click', closeEdit);
  modal.addEventListener('click', e => { if (e.target === modal) closeEdit(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeEdit();
  });
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') editSave.click();
  });

  /* ---- Sort change — persist and re-render ---- */
  sortSelect.addEventListener('change', () => {
    localStorage.setItem(SORT_KEY, sortSelect.value);
    render();
  });

  /* ---- Form submit ---- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    addTodo(input.value.trim());
    input.value = '';
    input.focus();
  });

  /* ---- Init ---- */
  load();
  sortSelect.value = localStorage.getItem(SORT_KEY) || 'added';
  render();
})();


/* ============================================================
   4. QUICK LINKS
   ============================================================ */
(function initLinks() {
  const STORAGE_KEY = 'dashboard_links';

  const form      = document.getElementById('link-form');
  const nameInput = document.getElementById('link-name');
  const urlInput  = document.getElementById('link-url');
  const gridEl    = document.getElementById('links-grid');
  const emptyEl   = document.getElementById('links-empty');

  let links = [];

  /* ---- Storage ---- */
  function load() {
    try { links = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { links = []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }

  /* ---- Helpers ---- */
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function sanitize(str) {
    return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function faviconUrl(href) {
    try { return `${new URL(href).origin}/favicon.ico`; }
    catch { return ''; }
  }

  /* ---- Render ---- */
  function render() {
    gridEl.innerHTML = '';
    emptyEl.style.display = links.length ? 'none' : 'block';

    links.forEach(link => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;align-items:center;gap:0';

      const anchor = document.createElement('a');
      anchor.href      = link.url;
      anchor.target    = '_blank';
      anchor.rel       = 'noopener noreferrer';
      anchor.className = 'link-chip';
      anchor.setAttribute('aria-label', `Open ${sanitize(link.name)}`);

      const favicon = document.createElement('img');
      favicon.src       = faviconUrl(link.url);
      favicon.alt       = '';
      favicon.width     = 16;
      favicon.height    = 16;
      favicon.className = 'link-chip-favicon';
      favicon.onerror   = () => { favicon.style.display = 'none'; };

      const label = document.createElement('span');
      label.textContent = sanitize(link.name);

      anchor.appendChild(favicon);
      anchor.appendChild(label);

      const delBtn = document.createElement('button');
      delBtn.className   = 'link-delete';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', `Remove ${sanitize(link.name)}`);
      delBtn.addEventListener('click', () => deleteLink(link.id));

      wrapper.appendChild(anchor);
      wrapper.appendChild(delBtn);
      gridEl.appendChild(wrapper);
    });
  }

  /* ---- CRUD ---- */
  function addLink(name, url) {
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    links.push({ id: genId(), name, url });
    save();
    render();
  }

  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    save();
    render();
  }

  /* ---- Form submit ---- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const url  = urlInput.value.trim();
    if (!name || !url) {
      if (!name) nameInput.focus(); else urlInput.focus();
      return;
    }
    addLink(name, url);
    nameInput.value = '';
    urlInput.value  = '';
    nameInput.focus();
  });

  /* ---- Init ---- */
  load();
  render();
})();
