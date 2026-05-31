const SHEET_ID = '1a7-juFqBK_m5tC1vypEQSOu9SPTZUYm3JWHiND9yco0';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4BsCAOIskyIPmgf8FSNsg_rSo5e7JOkhmDFO-mrM8m_an97f9XgRnsEx37_XM-np5Cg/exec';

let selectedRole = null;
let pinValue = '';
let verifying = false;

function selectRole(role) {
  selectedRole = role;
  pinValue = '';
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('role-' + role + '-btn').classList.add('selected');
  document.getElementById('pin-section').style.display = 'block';
  document.getElementById('pin-label').textContent = 'Enter ' + (role === 'parent' ? 'Parent' : "Keegan's") + ' PIN';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

function pinPress(digit) {
  if (pinValue.length >= 4 || verifying) return;
  pinValue += digit;
  updatePinDots();
  if (pinValue.length === 4) verifyPin();
}

function pinDelete() {
  pinValue = pinValue.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('dot-' + i);
    if (dot) dot.classList.toggle('filled', i < pinValue.length);
  }
}

async function verifyPin() {
  verifying = true;
  document.getElementById('pin-error').textContent = '';
  try {
    const rows = await fetchSheet('Pins');
    let valid = false;
    rows.forEach(r => {
      if (r[0] && r[0].toString().trim() === selectedRole && r[1] && r[1].toString().trim() === pinValue) valid = true;
    });
    if (valid) {
      enterDashboard(selectedRole);
    } else {
      document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
      pinValue = '';
      updatePinDots();
    }
  } catch(e) {
    document.getElementById('pin-error').textContent = 'Connection error. Try again.';
    pinValue = '';
    updatePinDots();
  }
  verifying = false;
}

function enterDisplayMode() {
  enterDashboard('display');
}

function enterDashboard(role) {
  document.getElementById('login-screen').classList.add('hidden');
  document.body.classList.remove('role-parent', 'role-keegan', 'role-display');
  document.body.classList.add('role-' + role);
  try { sessionStorage.setItem('dashRole', role); } catch(e) {}
  applyPermissions(role);
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.toggle('hidden', role === 'display');
  showPage('home');
}

function applyPermissions(role) {
  const isParent = role === 'parent';
  const mealBtn = document.querySelector('.meal-add-btn');
  if (mealBtn) mealBtn.style.display = isParent ? '' : 'none';
  const pottyBtn = document.querySelector('.potty-btn');
  if (pottyBtn) pottyBtn.style.display = isParent ? '' : 'none';
  const bgBtn = document.querySelector('.change-bg-btn');
  if (bgBtn) bgBtn.style.display = (role === 'keegan' || isParent) ? '' : 'none';
  document.querySelectorAll('.sw-btn').forEach(b => {
    b.style.display = (role === 'keegan' || isParent) ? '' : 'none';
  });
  document.querySelectorAll('.task-list li').forEach(li => {
    li.style.cursor = isParent ? 'pointer' : 'default';
    li.style.pointerEvents = isParent ? '' : 'none';
  });
  document.querySelectorAll('.meal-day').forEach(d => {
    d.style.pointerEvents = isParent ? '' : 'none';
    d.style.cursor = isParent ? 'pointer' : 'default';
  });
}

function logout() {
  try { sessionStorage.removeItem('dashRole'); } catch(e) {}
  document.body.classList.remove('role-parent', 'role-keegan', 'role-display');
  document.getElementById('login-screen').classList.remove('hidden');
  const nav = document.getElementById('bottom-nav');
  if (nav) nav.classList.add('hidden');
  selectedRole = null;
  pinValue = '';
  document.getElementById('pin-section').style.display = 'none';
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  showPage('home');
}

function checkSession() {
  try {
    const role = sessionStorage.getItem('dashRole');
    if (role) enterDashboard(role);
  } catch(e) {}
}

function applyUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}
