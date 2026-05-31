const flushAudio = new Audio('assets/flush.wav');
const pieckAudio = new Audio('assets/pieck.mp3');
const beastTitanAudio = new Audio('assets/beast-titan.mp3');
const leviAudio = new Audio('assets/levi.mp3');

const WEEKS = [
  { label: 'Week 1 (Jul 7–11)',     mathNeeded: 1, readingNeeded: 1 },
  { label: 'Week 2 (Jul 14–18)',    mathNeeded: 2, readingNeeded: 2 },
  { label: 'Week 3 (Jul 21–25)',    mathNeeded: 3, readingNeeded: 3 },
  { label: 'Week 4 (Jul 28–Aug 1)', mathNeeded: 4, readingNeeded: 4 },
  { label: 'Week 5 (Aug 4–8)',      mathNeeded: 5, readingNeeded: 5 },
  { label: 'Week 6 (Aug 11–15)',    mathNeeded: 6, readingNeeded: 6 },
  { label: 'Week 7 (Jul 28)',       mathNeeded: 7, readingNeeded: 6 },
];

const MM_COLORS = ['#e53e3e','#f6ad55','#48bb78','#4299e1','#9f7aea','#ed64a6','#f6e05e','#fc8181','#68d391','#76e4f7'];
const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const mealIcons = { 'tacos':'🌮','chicken bowls':'🍚','pasta':'🍝','leftovers':'🥘','pizza':'🍕','pizza night':'🍕','grill out':'🔥','breakfast for dinner':'🥞','soup':'🍲','salmon':'🐟','burgers':'🍔','sushi':'🍣','steak':'🥩','salad':'🥗' };

function getMealIcon(n) {
  const k = (n||'').toLowerCase();
  for (const key in mealIcons) { if (k.includes(key)) return mealIcons[key]; }
  return '🍽️';
}

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return yyyy+'-'+mm+'-'+dd;
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHTML(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; }

function csvToRows(text) {
  return text.trim().split('\n').slice(1).map(line => {
    const cols = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  }).filter(r => r.some(c => c));
}

async function fetchSheet(tab) {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
  return csvToRows(await res.text());
}

async function postToSheet(payload) {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch(e) { console.error('Sheet write failed', e); }
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  const navEl = document.getElementById('nav-' + page);
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (page === 'meals') initMealsPage();
  window.scrollTo(0, 0);
}

function updateDate() {
  const now = new Date();
  setText('w-day', dayNames[now.getDay()].toUpperCase());
  setText('w-date', shortMonths[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear());
}

function updateCountdown() {
  const BIRTHDAYS = [
    { name: "Lysithea's Birthday",  month: 10, day: 5,  emoji: '🎂' },
    { name: "Gabrielle's Birthday", month: 12, day: 8,  emoji: '🎂' },
    { name: "Keegan's Birthday",    month: 12, day: 9,  emoji: '🎂' },
    { name: "David's Birthday",     month: 5,  day: 3,  emoji: '🎂' },
  ];
  const today = new Date(); today.setHours(0,0,0,0);
  const year = today.getFullYear();
  let soonest = null, soonestDays = Infinity;
  for (const b of BIRTHDAYS) {
    let bday = new Date(year, b.month-1, b.day);
    if (bday < today) bday = new Date(year+1, b.month-1, b.day);
    const days = Math.round((bday-today)/86400000);
    if (days < soonestDays) { soonestDays = days; soonest = {...b, days}; }
  }
  if (!soonest) return;
  setText('cd-label', 'Days Until');
  setText('cd-num', soonest.days);
  setText('cd-sub', 'days to go');
  setText('cd-who', soonest.emoji + ' ' + soonest.name);
}

async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.18&longitude=-82.36&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York');
    const data = await res.json();
    const c = data.current, code = c.weather_code;
    const conds = {0:'Sunny',1:'Mostly Clear',2:'Partly Cloudy',3:'Cloudy',45:'Foggy',48:'Foggy',51:'Light Drizzle',53:'Drizzle',55:'Heavy Drizzle',61:'Light Rain',63:'Rain',65:'Heavy Rain',80:'Showers',81:'Showers',82:'Heavy Showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'};
    const icons = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',96:'⛈️',99:'⛈️'};
    setText('w-icon', icons[code]||'☀️');
    setText('w-temp', Math.round(c.temperature_2m)+'°F');
    setText('w-cond', conds[code]||'Clear');
    setText('w-feels', 'Feels like '+Math.round(c.apparent_temperature)+'°');
  } catch(e) { setText('w-cond', 'Wesley Chapel, FL'); }
}

function buildBoxes(id, done, total, cls) {
  const el = document.getElementById(id); if (!el) return; el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const b = document.createElement('div');
    b.className = 'pbox ' + (i < done ? 'filled-'+cls : 'empty');
    el.appendChild(b);
  }
}

let swData = { mathCompleted:0, mathTotal:7, readingCompleted:0, readingTotal:6 };

function calcMangaEarned(mc, rc) {
  let earned = 0;
  for (let i = 0; i < WEEKS.length; i++) {
    if (mc >= WEEKS[i].mathNeeded && rc >= WEEKS[i].readingNeeded) earned++;
  }
  return earned;
}

function updateManga(mc, rc) {
  const earned = calcMangaEarned(mc, rc);
  const booksEl = document.getElementById('manga-books');
  if (booksEl) {
    booksEl.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const b = document.createElement('div');
      b.className = 'manga-book' + (i < earned ? '' : ' locked');
      b.textContent = '📖';
      booksEl.appendChild(b);
    }
  }
  setText('manga-earned-label', earned + ' / 7 earned');
  let cwIdx = -1;
  for (let i = 0; i < WEEKS.length; i++) {
    if (mc < WEEKS[i].mathNeeded || rc < WEEKS[i].readingNeeded) { cwIdx = i; break; }
  }
  if (cwIdx === -1) {
    setText('manga-week-label', '🎉 All summer work complete — all 7 Manga earned!');
    setText('cw-name', 'All done! Amazing work, Keegan!');
    setText('cw-detail', 'Every assignment complete — enjoy your Manga!');
  } else {
    const w = WEEKS[cwIdx]; const isWeek7 = cwIdx===6;
    const parts = [];
    if (mc < w.mathNeeded) parts.push('Math '+w.mathNeeded);
    if (rc < w.readingNeeded && !isWeek7) parts.push('Reading '+w.readingNeeded);
    setText('manga-week-label', parts.length>0 ? 'Complete '+parts.join(' + ')+' to earn Manga #'+(cwIdx+1) : '');
    setText('cw-name', w.label);
    const dp = [];
    if (mc < w.mathNeeded) dp.push('Math '+w.mathNeeded+' still needed');
    if (rc < w.readingNeeded && !isWeek7) dp.push('Reading '+w.readingNeeded+' still needed');
    setText('cw-detail', dp.length>0 ? dp.join(' · ') : 'Week in progress...');
  }
}

function updatePotty(total, today) {
  setText('potty-total', total);
  setText('potty-today', today);
  const messages = [
    'You can do it, <span>Lysithea!</span> 💪',
    'Keep it up, <span>Lysithea!</span> 🌟',
    "You're doing amazing, <span>Lysithea!</span> 🎉",
    'So proud of you, <span>Lysithea!</span> 💕',
    'Way to go, <span>Lysithea!</span> ⭐',
    "You're a superstar, <span>Lysithea!</span> 🌈",
  ];
  setHTML('potty-message', messages[total % messages.length]);
  const mmRow = document.getElementById('mms-row'); if (!mmRow) return;
  mmRow.innerHTML = '';
  const show = Math.min(total, 20);
  for (let i = 0; i < show; i++) {
    const dot = document.createElement('div');
    dot.className = 'mm'; dot.style.background = MM_COLORS[i % MM_COLORS.length]; dot.textContent = 'm';
    mmRow.appendChild(dot);
  }
  if (total > 20) {
    const more = document.createElement('div');
    more.style.cssText = 'font-size:10px;font-weight:800;color:#ec4899;align-self:center;margin-left:2px;';
    more.textContent = '+'+(total-20)+' more!'; mmRow.appendChild(more);
  }
}

async function logPotty() {
  const btn = document.querySelector('.potty-btn');
  btn.disabled = true; btn.textContent = '✨ Yay Lysithea!';
  flushAudio.currentTime = 0; flushAudio.play();
  const totalEl = document.getElementById('potty-total');
  const todayEl = document.getElementById('potty-today');
  const newTotal = parseInt(totalEl.textContent||0)+1;
  const newToday = parseInt(todayEl.textContent||0)+1;
  updatePotty(newTotal, newToday);
  const mmRow = document.getElementById('mms-row');
  if (mmRow && mmRow.children.length < 20) {
    const dot = document.createElement('div');
    dot.className = 'mm mm-new';
    dot.style.background = MM_COLORS[newTotal % MM_COLORS.length];
    dot.textContent = 'm'; mmRow.appendChild(dot);
  }
  await postToSheet({ action:'potty' });
  setTimeout(() => { btn.disabled=false; btn.textContent='🚽 Lysithea went potty! +1 M&M'; }, 2000);
}

let undoTimer = null;
async function completeTask(el, taskName) {
  if (el.classList.contains('completing')) return;
  el.classList.add('completing');
  if (undoTimer) { clearTimeout(undoTimer); removeToast(); }
  const toast = document.createElement('div');
  toast.className = 'undo-toast'; toast.id = 'undo-toast';
  toast.innerHTML = `"${taskName}" completed <button onclick="undoTask('${taskName.replace(/'/g,"\\'")}',this)">Undo</button>`;
  document.body.appendChild(toast);
  undoTimer = setTimeout(async () => {
    el.remove(); removeToast();
    await postToSheet({ action:'completeTask', task:taskName });
  }, 5000);
}

function removeToast() { const t = document.getElementById('undo-toast'); if (t) t.remove(); }

async function undoTask(taskName) {
  clearTimeout(undoTimer); removeToast();
  const li = document.querySelector('.task-list li.completing');
  if (li) li.classList.remove('completing');
}

async function addAssignment(type) {
  if (type === 'reading') { pieckAudio.currentTime=0; pieckAudio.play(); }
  if (type === 'math') { beastTitanAudio.currentTime=0; beastTitanAudio.play(); }
  const ismath = type==='math';
  const key = ismath ? 'MathCompleted' : 'ReadingCompleted';
  const currentKey = ismath ? 'mathCompleted' : 'readingCompleted';
  const totalKey = ismath ? 'mathTotal' : 'readingTotal';
  const newVal = Math.min(swData[currentKey]+1, swData[totalKey]);
  if (newVal === swData[currentKey]) return;
  const prevEarned = calcMangaEarned(swData.mathCompleted, swData.readingCompleted);
  swData[currentKey] = newVal;
  setText(ismath?'math-score':'reading-score', newVal+' / '+swData[totalKey]);
  buildBoxes(ismath?'math-boxes':'reading-boxes', newVal, swData[totalKey], ismath?'math':'reading');
  const newEarned = calcMangaEarned(swData.mathCompleted, swData.readingCompleted);
  if (newEarned > prevEarned) {
    const books = document.querySelectorAll('.manga-book');
    if (books[newEarned-1]) { books[newEarned-1].classList.add('unlocking'); setTimeout(()=>books[newEarned-1].classList.remove('unlocking'),600); }
  }
  updateManga(swData.mathCompleted, swData.readingCompleted);
  await postToSheet({ action:'summerWork', key, value:newVal });
}

function getWeekDates(offsetWeeks) {
  offsetWeeks = offsetWeeks || 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate()-(day===0?6:day-1)+(offsetWeeks*7));
  const dates = [];
  const dNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    const today2 = new Date(); today2.setHours(0,0,0,0);
    dates.push({ label:dNames[i], date:yyyy+'-'+mm+'-'+dd, display:mNames[d.getMonth()]+' '+d.getDate(), num:d.getDate(), isPast:d<today2 });
  }
  return dates;
}

let currentWeekOffset = 0;
let currentMealData = {};

async function openMealSheet(offset) {
  if (offset !== undefined) currentWeekOffset = offset;
  const rows = await fetchSheet('Meals');
  currentMealData = {};
  rows.forEach(r => {
    if (r[0]) {
      const key = typeof r[0]==='string' ? r[0].trim() : formatDate(new Date(r[0]));
      currentMealData[key] = { meal:r[1]||'', side:r[2]||'' };
    }
  });
  const weekDates = getWeekDates(currentWeekOffset);
  const monday = weekDates[0], sunday = weekDates[6];
  const container = document.getElementById('bs-week-rows');
  const weekLabel = currentWeekOffset===0?'This Week':currentWeekOffset===1?'Next Week':currentWeekOffset===-1?'Last Week':monday.display+' — '+sunday.display;
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px 12px;">
    <button onclick="openMealSheet(${currentWeekOffset-1})" style="background:none;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 14px;font-size:16px;cursor:pointer;">◀</button>
    <div style="font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;color:#1e3a5f;text-align:center;">${weekLabel}</div>
    <button onclick="openMealSheet(${currentWeekOffset+1})" style="background:none;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 14px;font-size:16px;cursor:pointer;">▶</button>
  </div>` + weekDates.map(d => {
    const existing = currentMealData[d.date] || { meal:'', side:'' };
    return `<div class="bs-day-row" style="${d.isPast?'opacity:0.5;':''}">
      <div class="bs-day-label">${d.display}${d.isPast?' · past':''}</div>
      <div class="bs-inputs">
        <input class="bs-input" id="meal-${d.date}" placeholder="Meal name" value="${existing.meal}" autocomplete="off">
        <input class="bs-input" id="side-${d.date}" placeholder="Side dish (optional)" value="${existing.side}" autocomplete="off">
      </div>
    </div>`;
  }).join('');
  document.getElementById('bs-overlay').classList.add('open');
  document.getElementById('meal-sheet').classList.add('open');
  leviAudio.currentTime=0; leviAudio.play();
}

function closeMealSheet() {
  document.getElementById('bs-overlay').classList.remove('open');
  document.getElementById('meal-sheet').classList.remove('open');
}

async function saveAllMeals() {
  const btn = document.querySelector('.bs-save-btn');
  btn.classList.add('bs-saving'); btn.textContent = 'Saving...';
  const weekDates = getWeekDates(currentWeekOffset);
  await Promise.all(weekDates.map(d => {
    const meal = document.getElementById('meal-'+d.date)?.value.trim()||'';
    const side = document.getElementById('side-'+d.date)?.value.trim()||'';
    return postToSheet({ action:'saveMeal', date:d.date, meal, side, notes:'', emoji:'', ingredients:'' });
  }));
  await loadMeals();
  closeMealSheet();
  btn.classList.remove('bs-saving'); btn.textContent = 'Save Meals';
}

async function loadEvents() {
  try {
    const rows = await fetchSheet('Events');
    setHTML('events-list', rows.map(r =>
      `<li><div class="week-day">${r[0]||''}<br>${r[1]||''}</div><div class="week-event">${r[2]||''}</div></li>`
    ).join(''));
  } catch(e) { console.error('Events', e); }
}

async function loadMeals() {
  try {
    const rows = await fetchSheet('Meals');
    const weekDates = getWeekDates(0);
    const mealMap = {};
    rows.forEach(r => {
      if (r[0]) {
        const key = typeof r[0]==='string' ? r[0].trim() : formatDate(new Date(r[0]));
        mealMap[key] = { meal:r[1]||'', side:r[2]||'' };
      }
    });
    const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    setHTML('meal-grid', weekDates.map((d,i) => {
      const m = mealMap[d.date]||{ meal:'', side:'' };
      return `<div class="meal-day" onclick="openMealSheet()">
        <div class="meal-day-label">${dayLabels[i]}</div>
        <div class="meal-icon">${m.meal ? getMealIcon(m.meal) : '➕'}</div>
        <div class="meal-name">${m.meal||'Add meal'}</div>
        <div class="meal-sub">${m.side}</div>
      </div>`;
    }).join(''));
    const role = sessionStorage.getItem('dashRole')||'display';
    applyPermissions(role);
  } catch(e) { console.error('Meals', e); }
}

async function loadTasks() {
  try {
    const rows = await fetchSheet('Tasks');
    setHTML('tasks-list', rows.map(r =>
      `<li onclick="if(document.body.classList.contains('role-parent')){completeTask(this,'${(r[0]||'').replace(/'/g,"\\'")}')}">\
<div class="task-check"></div>${r[0]||''}</li>`
    ).join(''));
    const role = sessionStorage.getItem('dashRole')||'display';
    applyPermissions(role);
  } catch(e) { console.error('Tasks', e); }
}

async function loadSummerWork() {
  try {
    const rows = await fetchSheet('SummerWork');
    const data = {};
    rows.forEach(r => { if (r[0]) data[r[0].trim()] = (r[1]||'').trim(); });
    const mc = parseInt(data['MathCompleted']||0);
    const mt = parseInt(data['MathTotal']||7);
    const rc = parseInt(data['ReadingCompleted']||0);
    const rt = parseInt(data['ReadingTotal']||6);
    setText('math-score', mc+' / '+mt);
    setText('reading-score', rc+' / '+rt);
    buildBoxes('math-boxes', mc, mt, 'math');
    buildBoxes('reading-boxes', rc, rt, 'reading');
    setText('sw-goal', data['Goal']||'August 1, 2026');
    updateManga(mc, rc);
    swData = { mathCompleted:mc, mathTotal:mt, readingCompleted:rc, readingTotal:rt };
  } catch(e) { console.error('SummerWork', e); }
}

async function loadPotty() {
  try {
    const rows = await fetchSheet('Potty');
    const data = {};
    rows.forEach(r => { if (r[0]) data[r[0].trim()] = (r[1]||'').trim(); });
    updatePotty(parseInt(data['Total']||0), parseInt(data['Today']||0));
  } catch(e) { updatePotty(0,0); }
}

function changeSummerBg(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    setSummerBg(e.target.result);
    try { localStorage.setItem('summerBg', e.target.result); } catch(err) {}
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function setSummerBg(dataUrl) {
  const card = document.querySelector('.summer-card'); if (!card) return;
  card.style.backgroundImage = "url('"+dataUrl+"')";
  card.style.backgroundSize = 'cover';
  card.style.backgroundPosition = 'center top';
}

function loadSavedSummerBg() {
  try { const saved = localStorage.getItem('summerBg'); if (saved) setSummerBg(saved); } catch(err) {}
}

function openAddTaskSheet() {
  const sheet = document.createElement('div');
  sheet.id = 'add-task-sheet-wrapper';
  sheet.innerHTML = `
    <div class="bottom-sheet-overlay open" onclick="closeAddTaskSheet()"></div>
    <div class="bottom-sheet open" style="padding-bottom:40px;">
      <div class="bs-handle"></div>
      <div class="bs-header">
        <div class="bs-title">➕ Add Task</div>
        <button class="bs-close" onclick="closeAddTaskSheet()">×</button>
      </div>
      <div style="padding:20px;">
        <input class="bs-input" id="new-task-input" placeholder="Enter task..." autocomplete="off" style="margin-bottom:12px;">
        <button class="bs-save-btn" style="background:#7c3aed;" onclick="saveNewTask()">Add Task</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  setTimeout(() => document.getElementById('new-task-input')?.focus(), 100);
}

function closeAddTaskSheet() {
  const el = document.getElementById('add-task-sheet-wrapper'); if (el) el.remove();
}

async function saveNewTask() {
  const input = document.getElementById('new-task-input');
  const task = input?.value.trim(); if (!task) return;
  input.value = '';
  await postToSheet({ action:'undoTask', task });
  await loadTasks();
  closeAddTaskSheet();
}

document.addEventListener('DOMContentLoaded', function() {
  checkSession();
  updateDate();
  updateCountdown();
  loadSavedSummerBg();
  fetchWeather();
  loadEvents();
  loadMeals();
  loadTasks();
  loadSummerWork();
  loadPotty();
  setInterval(() => { updateDate(); updateCountdown(); }, 60000);
  setInterval(fetchWeather, 600000);
  setInterval(() => { loadEvents(); loadMeals(); loadTasks(); loadSummerWork(); loadPotty(); }, 300000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            document.getElementById('update-banner')?.classList.add('visible');
          }
        });
      });
      if (reg.waiting) document.getElementById('update-banner')?.classList.add('visible');
    }).catch(err => console.log('SW failed:', err));
  }
});
