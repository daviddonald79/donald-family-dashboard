let currentMealMonth = new Date();
let selectedMealWeekOffset = 0;
let mealsPageData = {};
let currentEditDate = null;

function initMealsPage() {
  currentMealMonth = new Date();
  selectedMealWeekOffset = 0;
  renderMonthCalendar();
  loadMealsPageData();
  const role = sessionStorage.getItem('dashRole') || 'display';
  const keegan = document.getElementById('keegan-suggest-section');
  const suggestions = document.getElementById('suggestions-section');
  if (keegan) keegan.style.display = role === 'keegan' ? 'block' : 'none';
  if (suggestions) suggestions.style.display = role === 'parent' ? 'block' : 'none';
  if (role === 'parent') loadSuggestions();
}

async function loadMealsPageData() {
  try {
    const rows = await fetchSheet('Meals');
    mealsPageData = {};
    rows.forEach(r => {
      if (r[0]) {
        const key = typeof r[0] === 'string' ? r[0].trim() : formatDate(new Date(r[0]));
        mealsPageData[key] = { meal: r[1]||'', side: r[2]||'', notes: r[3]||'', emoji: r[4]||'', ingredients: r[5]||'' };
      }
    });
    renderMealsWeek();
    renderMonthCalendar();
  } catch(e) {
    console.error('loadMealsPageData error:', e);
  }
}

function getWeekDatesForOffset(offset) {
  const today = new Date(); today.setHours(0,0,0,0);
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day===0?6:day-1) + (offset*7));
  const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const today2 = new Date(); today2.setHours(0,0,0,0);
    dates.push({
      label: dayNames[i], shortLabel: dayNames[i].substring(0,3),
      date: yyyy+'-'+mm+'-'+dd,
      display: monthNames[d.getMonth()]+' '+d.getDate(),
      num: d.getDate(), month: d.getMonth(),
      isPast: d < today2, isToday: d.getTime()===today2.getTime()
    });
  }
  return dates;
}

function renderMealsWeek() {
  const dates = getWeekDatesForOffset(selectedMealWeekOffset);
  const label = selectedMealWeekOffset===0 ? 'This Week' : selectedMealWeekOffset===1 ? 'Next Week' : selectedMealWeekOffset===-1 ? 'Last Week' : dates[0].display+' – '+dates[6].display;
  const weekLabel = document.getElementById('meals-page-week-label');
  if (weekLabel) weekLabel.textContent = label;

  const container = document.getElementById('meals-week-list');
  if (!container) return;
  const role = sessionStorage.getItem('dashRole') || 'display';
  const clickable = role === 'parent';

  container.innerHTML = dates.map(d => {
    const m = mealsPageData[d.date] || {};
    const hasM = !!m.meal;
    const emoji = m.emoji || (hasM ? getMealIcon(m.meal) : '');
    let cardClass = 'meal-day-card';
    if (!hasM) cardClass += ' empty';
    if (d.isToday) cardClass += ' today';
    if (d.isPast) cardClass += ' past';
    const onclick = clickable ? `openMealEditSheet('${d.date}')` : '';
    return `<div class="${cardClass}" onclick="${onclick}" style="${!clickable ? 'cursor:default;' : ''}">
      <div class="meal-card-date">
        <div class="meal-card-day">${d.shortLabel}</div>
        <div class="meal-card-num">${d.num}</div>
      </div>
      <div class="meal-card-divider"></div>
      ${hasM ? `<div class="meal-card-emoji">${emoji}</div>` : ''}
      <div class="meal-card-content">
        ${hasM
          ? `<div class="meal-card-name">${m.meal}</div>
             ${m.side ? `<div class="meal-card-side">${m.side}</div>` : ''}
             ${m.notes ? `<div class="meal-card-notes">📝 ${m.notes}</div>` : ''}`
          : `<div class="meal-card-empty-label">${clickable ? 'Tap to add meal' : 'No meal planned'}</div>`}
      </div>
      ${clickable ? '<div class="meal-card-arrow">›</div>' : ''}
    </div>`;
  }).join('');
}

function renderMonthCalendar() {
  const year = currentMealMonth.getFullYear();
  const month = currentMealMonth.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const label = document.getElementById('month-cal-label');
  if (label) label.textContent = monthNames[month]+' '+year;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow===0 ? 6 : startDow-1;

  const today = new Date(); today.setHours(0,0,0,0);
  const selDates = getWeekDatesForOffset(selectedMealWeekOffset).map(d => d.date);

  let cells = [];
  for (let i=0; i<startDow; i++) cells.push(null);
  for (let d=1; d<=lastDay.getDate(); d++) cells.push(new Date(year,month,d));
  while (cells.length%7!==0) cells.push(null);

  const grid = document.getElementById('month-cal-grid');
  if (!grid) return;

  grid.innerHTML = cells.map(d => {
    if (!d) return '<div></div>';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const dateStr = yyyy+'-'+mm+'-'+dd;
    const isToday = d.getTime()===today.getTime();
    const isSelected = selDates.includes(dateStr);
    const hasMeal = !!mealsPageData[dateStr]?.meal;
    const isOther = d.getMonth()!==month;
    let cls = 'cal-day';
    if (isSelected) cls += ' selected-week';
    if (isToday) cls += ' today-cal';
    if (hasMeal) cls += ' has-meal';
    if (isOther) cls += ' other-month';
    const weekOffset = getWeekOffsetForDate(d);
    return `<div class="${cls}" onclick="jumpToWeek(${weekOffset})">
      <div class="cal-day-num">${d.getDate()}</div>
      ${hasMeal ? '<div class="cal-day-dot"></div>' : ''}
    </div>`;
  }).join('');
}

function getWeekOffsetForDate(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const day = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate()-(day===0?6:day-1));
  const targetMonday = new Date(date);
  const tDay = date.getDay();
  targetMonday.setDate(date.getDate()-(tDay===0?6:tDay-1));
  return Math.round((targetMonday-thisMonday)/(7*86400000));
}

function jumpToWeek(offset) {
  selectedMealWeekOffset = offset;
  renderMealsWeek();
  renderMonthCalendar();
}

function changeMonth(dir) {
  currentMealMonth = new Date(currentMealMonth.getFullYear(), currentMealMonth.getMonth()+dir, 1);
  renderMonthCalendar();
}

function openMealEditSheet(date) {
  currentEditDate = date;
  const m = mealsPageData[date] || {};
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(date+'T00:00:00');
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const title = document.getElementById('meal-edit-title');
  if (title) title.textContent = dayNames[d.getDay()]+', '+monthNames[d.getMonth()]+' '+d.getDate();
  document.getElementById('meal-edit-emoji').value = m.emoji||'';
  document.getElementById('meal-edit-name').value = m.meal||'';
  document.getElementById('meal-edit-side').value = m.side||'';
  document.getElementById('meal-edit-notes').value = m.notes||'';
  document.getElementById('meal-edit-ingredients').value = m.ingredients||'';
  document.getElementById('meal-edit-date').value = date;
  document.getElementById('meal-edit-overlay').classList.add('open');
  document.getElementById('meal-edit-sheet').classList.add('open');
  if (window.leviAudio) { leviAudio.currentTime=0; leviAudio.play(); }
}

function closeMealEditSheet() {
  document.getElementById('meal-edit-overlay').classList.remove('open');
  document.getElementById('meal-edit-sheet').classList.remove('open');
}

async function saveMealEdit() {
  const date = document.getElementById('meal-edit-date').value;
  const meal = document.getElementById('meal-edit-name').value.trim();
  const side = document.getElementById('meal-edit-side').value.trim();
  const notes = document.getElementById('meal-edit-notes').value.trim();
  const emoji = document.getElementById('meal-edit-emoji').value.trim();
  const ingredients = document.getElementById('meal-edit-ingredients').value.trim();
  if (!meal) return;
  mealsPageData[date] = { meal, side, notes, emoji, ingredients };
  closeMealEditSheet();
  renderMealsWeek();
  renderMonthCalendar();
  await postToSheet({ action:'saveMeal', date, meal, side, notes, emoji, ingredients });
  if (window.loadMeals) await loadMeals();
}

async function deleteMealEdit() {
  const date = document.getElementById('meal-edit-date').value;
  delete mealsPageData[date];
  closeMealEditSheet();
  renderMealsWeek();
  renderMonthCalendar();
  await postToSheet({ action:'saveMeal', date, meal:'' });
  if (window.loadMeals) await loadMeals();
}

async function loadSuggestions() {
  try {
    const rows = await fetchSheet('Suggestions');
    const pending = rows.filter(r => r[4] && r[4].toString().trim().toLowerCase()==='pending');
    const section = document.getElementById('suggestions-section');
    const container = document.getElementById('suggestions-list');
    if (!container) return;
    if (pending.length===0) { if (section) section.style.display='none'; return; }
    if (section) section.style.display='block';
    container.innerHTML = pending.map(r => {
      const date = typeof r[0]==='string' ? r[0].trim() : formatDate(new Date(r[0]));
      const meal = r[1]||'Unknown meal';
      const side = r[2]||'';
      const notes = r[3]||'';
      const by = r[5]||'Keegan';
      return `<div class="suggestion-card">
        <div class="suggestion-card-name">${meal}${side?' · '+side:''}</div>
        <div class="suggestion-card-meta">Suggested by ${by} for ${date}${notes?' · "'+notes+'"':''}</div>
        <div class="suggestion-card-actions">
          <button class="suggestion-approve" onclick="approveSuggestion('${date}','${meal}','${side}','${notes}')">✓ Approve</button>
          <button class="suggestion-dismiss" onclick="dismissSuggestion('${date}','${meal}')">✕ Dismiss</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) { console.error('loadSuggestions error:', e); }
}

async function approveSuggestion(date, meal, side, notes) {
  mealsPageData[date] = { meal, side, notes, emoji:'', ingredients:'' };
  renderMealsWeek();
  await postToSheet({ action:'saveMeal', date, meal, side, notes, emoji:'', ingredients:'' });
  await postToSheet({ action:'approveSuggestion', date, meal });
  await loadSuggestions();
  if (window.loadMeals) await loadMeals();
}

async function dismissSuggestion(date, meal) {
  await postToSheet({ action:'dismissSuggestion', date, meal });
  await loadSuggestions();
}

function openSuggestSheet() {
  const dates = getWeekDatesForOffset(selectedMealWeekOffset);
  const sel = document.getElementById('suggest-date');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pick a day...</option>' +
    dates.map(d => `<option value="${d.date}">${d.shortLabel} ${d.display}</option>`).join('');
  ['suggest-meal','suggest-side','suggest-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value='';
  });
  document.getElementById('suggest-overlay').classList.add('open');
  document.getElementById('suggest-sheet').classList.add('open');
}

function closeSuggestSheet() {
  document.getElementById('suggest-overlay').classList.remove('open');
  document.getElementById('suggest-sheet').classList.remove('open');
}

async function submitSuggestion() {
  const date = document.getElementById('suggest-date').value;
  const meal = document.getElementById('suggest-meal').value.trim();
  const side = document.getElementById('suggest-side').value.trim();
  const notes = document.getElementById('suggest-notes').value.trim();
  if (!date||!meal) { alert('Please pick a day and enter a meal name'); return; }
  closeSuggestSheet();
  await postToSheet({ action:'suggestMeal', date, meal, side, notes, suggestedBy:'Keegan' });
  alert('Suggestion submitted! Your parents will review it. 😄');
}
