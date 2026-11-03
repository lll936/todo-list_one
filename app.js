const STORAGE_KEY = 'todo_tasks_v2';
const THEME_KEY   = 'todo_theme';

// ===== DOM =====
const form       = document.getElementById('addForm');
const input      = document.getElementById('taskInput');
const list       = document.getElementById('taskList');
const counter    = document.getElementById('counter');
const clearBtn   = document.getElementById('clearDone');
const filters    = document.getElementById('filters');
const themeBtn   = document.getElementById('themeToggle');
const subtitle   = document.getElementById('subtitle');

// ===== State =====
let tasks = loadTasks();
let currentFilter = 'all';
let dragId = null;

// ===== Persistence =====
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

// ===== Theme =====
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) { applyTheme(saved); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}
themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ===== Render =====
function render() {
  list.innerHTML = '';
  const visible = tasks.filter(t => {
    if (currentFilter === 'active') return !t.done;
    if (currentFilter === 'done')   return t.done;
    return true;
  });

  if (visible.length === 0) {
    list.appendChild(createEmptyState());
  } else {
    visible.forEach(task => list.appendChild(createTaskElement(task)));
  }
  updateFooter();
}

function createEmptyState() {
  const li = document.createElement('li');
  li.className = 'empty-state';
  const messages = {
    all:    'Пока задач нет — добавь первую!',
    active: 'Активных задач нет. Отдыхай',
    done:   'Ещё ничего не выполнено.',
  };
  li.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
    <span>${messages[currentFilter]}</span>
  `;
  return li;
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.done ? ' done' : '');
  li.dataset.id = task.id;
  li.draggable = true;

  const check = document.createElement('label');
  check.className = 'task-check';
  check.innerHTML = `
    <input type="checkbox" ${task.done ? 'checked' : ''} data-action="toggle" aria-label="Отметить задачу">
    <span class="checkmark">
      <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </span>
  `;

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  text.dataset.action = 'toggle';
  text.title = 'Клик — отметить';

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn edit-btn';
  editBtn.dataset.action = 'edit';
  editBtn.setAttribute('aria-label', 'Редактировать задачу');
  editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

  const delBtn = document.createElement('button');
  delBtn.className = 'action-btn delete-btn';
  delBtn.dataset.action = 'delete';
  delBtn.setAttribute('aria-label', 'Удалить задачу');
  delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path></svg>`;

  actions.append(editBtn, delBtn);
  li.append(check, text, actions);
  return li;
}

function updateFooter() {
  const total = tasks.length;
  const left  = tasks.filter(t => !t.done).length;
  const done  = total - left;

  counter.textContent = total === 0 ? 'Нет задач' : `${left} осталось · ${done} выполнено`;
  subtitle.textContent = total === 0 ? 'Добавь первую задачу' : left === 0 ? 'Всё сделано!' : `Осталось ${left} ${pluralize(left, 'задача', 'задачи', 'задач')}`;
  clearBtn.hidden = done === 0;
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  render();
}

function startEdit(li, textEl) {
  const id = li.dataset.id;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.text;
  editInput.maxLength = 200;

  textEl.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  const commit = () => {
    const value = editInput.value.trim();
    if (value) task.text = value;
    saveTasks();
    render();
  };

  editInput.addEventListener('blur', commit);
  editInput.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); editInput.blur(); }
    if (ev.key === 'Escape') { editInput.removeEventListener('blur', commit); render(); }
  });
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;

  tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: value, done: false });
  input.value = '';
  input.focus();
  saveTasks();
  render();
});

list.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const li = actionEl.closest('.task-item');
  if (!li) return;
  const id = li.dataset.id;
  const action = actionEl.dataset.action;

  if (action === 'toggle') { toggleTask(id); return; }
  if (action === 'edit') {
    const textEl = li.querySelector('.task-text');
    if (textEl) startEdit(li, textEl);
    return;
  }
  if (action === 'delete') {
    li.classList.add('removing');
    li.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, { once: true });
  }
});

filters.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  render();
});

clearBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
});

// ===== Drag & drop =====
list.addEventListener('dragstart', e => {
  const li = e.target.closest('.task-item');
  if (!li) return;
  dragId = li.dataset.id;
  li.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});
list.addEventListener('dragend', e => {
  const li = e.target.closest('.task-item');
  if (li) li.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
});
list.addEventListener('dragover', e => {
  e.preventDefault();
  const li = e.target.closest('.task-item');
  if (!li || li.dataset.id === dragId) return;
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  li.classList.add('drag-over');
});
list.addEventListener('drop', e => {
  e.preventDefault();
  const li = e.target.closest('.task-item');
  if (!li || !dragId) return;

  const targetId = li.dataset.id;
  if (targetId === dragId) return;

  const fromIndex = tasks.findIndex(t => t.id === dragId);
  const toIndex   = tasks.findIndex(t => t.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);
  dragId = null;
  saveTasks();
  render();
});

// ==========================================
// ===== ЛОГИКА ТАЙМЕРА =====
// ==========================================
const pomoCard = document.querySelector('.pomodoro-card');
const pomoTimeEl = document.getElementById('pomoTime');
const pomoModeEl = document.getElementById('pomoMode');
const pomoStartBtn = document.getElementById('pomoStart');
const pomoResetBtn = document.getElementById('pomoReset');
const pomoSettings = document.getElementById('pomoSettings');
const setFocusInput = document.getElementById('setFocus');
const setBreakInput = document.getElementById('setBreak');

let pomoInterval = null;
let isPomoRunning = false;
let isBreakMode = false;
let pomoTimeLeft = 25 * 60;

if (localStorage.getItem('pomo_focus')) setFocusInput.value = localStorage.getItem('pomo_focus');
if (localStorage.getItem('pomo_break')) setBreakInput.value = localStorage.getItem('pomo_break');

function getFocusTime() { return (parseInt(setFocusInput.value) || 25) * 60; }
function getBreakTime() { return (parseInt(setBreakInput.value) || 5) * 60; }

function updatePomoDisplay() {
  const minutes = Math.floor(pomoTimeLeft / 60);
  const seconds = pomoTimeLeft % 60;
  pomoTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.title = isPomoRunning ? `[${pomoTimeEl.textContent}] ${isBreakMode ? 'Отдых' : 'Фокус'}` : 'TODO — список задач';
}

function startPomo() {
  if (isPomoRunning) return;
  
  localStorage.setItem('pomo_focus', setFocusInput.value);
  localStorage.setItem('pomo_break', setBreakInput.value);
  
  if (pomoTimeLeft === getFocusTime() || pomoTimeLeft === getBreakTime()) {
    pomoTimeLeft = isBreakMode ? getBreakTime() : getFocusTime();
  }

  isPomoRunning = true;
  pomoStartBtn.textContent = 'Пауза';
  pomoCard.classList.add('running');
  pomoSettings.classList.add('disabled');
  
  pomoInterval = setInterval(() => {
    pomoTimeLeft--;
    updatePomoDisplay();

    if (pomoTimeLeft <= 0) {
      clearInterval(pomoInterval);
      isPomoRunning = false;
      
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine'; oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {}

      if (!isBreakMode) {
        isBreakMode = true;
        pomoTimeLeft = getBreakTime();
        pomoModeEl.textContent = 'Отдых';
        pomoCard.classList.add('break');
        alert('Время фокуса вышло! Пора отдохнуть.');
      } else {
        isBreakMode = false;
        pomoTimeLeft = getFocusTime();
        pomoModeEl.textContent = 'Фокус';
        pomoCard.classList.remove('break');
        alert('Отдых окончен! Возвращаемся к работе.');
      }
      
      pomoStartBtn.textContent = 'Старт';
      pomoCard.classList.remove('running');
      pomoSettings.classList.remove('disabled');
      updatePomoDisplay();
    }
  }, 1000);
}

function pausePomo() {
  clearInterval(pomoInterval);
  isPomoRunning = false;
  pomoStartBtn.textContent = 'Старт';
  pomoCard.classList.remove('running');
  pomoSettings.classList.remove('disabled');
  updatePomoDisplay();
}

function togglePomo() {
  if (isPomoRunning) pausePomo();
  else startPomo();
}

function resetPomo() {
  clearInterval(pomoInterval);
  isPomoRunning = false;
  isBreakMode = false;
  
  pomoModeEl.textContent = 'Фокус';
  pomoStartBtn.textContent = 'Старт';
  pomoCard.classList.remove('running', 'break');
  pomoSettings.classList.remove('disabled');
  
  pomoTimeLeft = getFocusTime();
  updatePomoDisplay();
}

pomoStartBtn.addEventListener('click', togglePomo);
pomoResetBtn.addEventListener('click', resetPomo);

setFocusInput.addEventListener('input', () => {
  if (!isPomoRunning && !isBreakMode) {
    pomoTimeLeft = getFocusTime();
    updatePomoDisplay();
  }
});
setBreakInput.addEventListener('input', () => {
  if (!isPomoRunning && isBreakMode) {
    pomoTimeLeft = getBreakTime();
    updatePomoDisplay();
  }
});

// ===== Init =====
initTheme();
render();
pomoTimeLeft = getFocusTime();
updatePomoDisplay();