// ===== HAFIF SHARED MODULE =====

const firebaseConfig = {
  apiKey: "AIzaSyDvqrronjp--dbDq8fqtlciwAMXr-U4XmI",
  authDomain: "hafifbagrut-hebrew.firebaseapp.com",
  databaseURL: "https://hafifbagrut-hebrew-default-rtdb.firebaseio.com",
  projectId: "hafifbagrut-hebrew",
  storageBucket: "hafifbagrut-hebrew.firebasestorage.app",
  messagingSenderId: "681533115805",
  appId: "1:681533115805:web:4662c221bb774ba1003374"
};

let db;
try { firebase.initializeApp(firebaseConfig); db = firebase.database(); } catch(e) { console.error('Firebase error:', e); }

const ADMIN_PASS = '14051987';

// Course registry
const COURSES = {
  lashon: { name: 'לשון', subtitle: 'כל החומר ללא תחביר – מערכת הצורות, מורפולוגיה ועוד', price: 15, originalPrice: 25, status: 'active', url: 'lashon.html', payLink: 'https://pay.grow.link/28e012e85eb3e522c1603e841af0548c-MzIwMjMzNw' },
  english: { name: 'אנגלית 5 יח"ל', subtitle: 'כיתה י"א', price: 15, originalPrice: 25, status: 'active', url: 'english.html', payLink: 'https://pay.grow.link/5244127c209832a7c537a5c89fbef33b-MzIwMjYyOQ' }
};

// COURSE_ID is set by each page before loading this script. null = landing page.
// e.g. <script>const COURSE_ID = 'lashon';</script>

// ===== AUTH FUNCTIONS =====
function authShowStep(n) {
  document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('on'));
  document.getElementById('authStep' + n).classList.add('on');
  document.querySelectorAll('.auth-msg').forEach(m => { m.className = 'auth-msg'; m.textContent = ''; });
}

function showMsg(id, type, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'auth-msg ' + type;
  el.textContent = text;
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ===== LOGIN =====
function doLogin() {
  const raw = document.getElementById('loginPhone').value.trim().replace(/\D/g, '');
  // Admin backdoor
  if (raw === ADMIN_PASS) {
    localStorage.setItem('hafif_admin', '1');
    document.getElementById('authOverlay').style.display = 'none';
    openAdmin();
    return;
  }
  const phone = raw;
  if (!phone || phone.length < 9) { showMsg('loginMsg', 'err', 'הזינו מספר טלפון תקין'); return; }
  if (!db) { showMsg('loginMsg', 'err', 'שגיאת חיבור'); return; }

  db.ref('users/' + phone).once('value').then(snap => {
    if (!snap.exists()) { showMsg('loginMsg', 'err', 'מספר לא רשום. הירשמו תחילה.'); return; }
    const u = snap.val();

    // Check course access
    if (typeof COURSE_ID !== 'undefined' && COURSE_ID) {
      // On a course page - check specific course access
      const hasCourse = (u.courses && u.courses[COURSE_ID]) || (COURSE_ID === 'lashon' && u.status === 'approved');
      if (hasCourse) {
        localStorage.setItem('hafif_phone', phone);
        localStorage.setItem('hafif_name', u.name);
        hideAuth();
      } else {
        showMsg('loginMsg', 'warn', 'אין לכם גישה לקורס הזה. רכשו אותו כדי להיכנס.');
      }
    } else {
      // On landing page - just log in
      localStorage.setItem('hafif_phone', phone);
      localStorage.setItem('hafif_name', u.name);
      hideAuth();
      if (typeof updateCourseCards === 'function') updateCourseCards(u);
    }
  }).catch(() => showMsg('loginMsg', 'err', 'שגיאת חיבור. נסו שוב.'));
}

// ===== PROGRESS SAVE/LOAD =====
function saveProgress(courseId, data) {
  const phone = localStorage.getItem('hafif_phone');
  if (!phone || !db) return;
  db.ref('users/' + phone + '/progress/' + courseId).set(data);
}

function loadProgress(courseId, callback) {
  const phone = localStorage.getItem('hafif_phone');
  if (!phone || !db) { callback(null); return; }
  db.ref('users/' + phone + '/progress/' + courseId).once('value').then(snap => {
    callback(snap.val());
  }).catch(() => callback(null));
}

// ===== VISIT TRACKING =====
(function(){
  if (!db) return;
  const today = new Date().toISOString().slice(0,10);
  const page = typeof COURSE_ID !== 'undefined' && COURSE_ID ? COURSE_ID : 'home';
  const ref = document.referrer || '';
  let source = 'direct';
  if (ref.includes('tiktok')) source = 'tiktok';
  else if (ref.includes('instagram')) source = 'instagram';
  else if (ref.includes('facebook') || ref.includes('fb.')) source = 'facebook';
  else if (ref.includes('google')) source = 'google';
  else if (ref.includes('whatsapp')) source = 'whatsapp';
  else if (ref.includes('t.co') || ref.includes('twitter')) source = 'twitter';
  else if (ref && !ref.includes('hafifbagrut')) source = 'other';
  else if (ref.includes('hafifbagrut')) source = 'internal';

  // Don't count admin visits
  const isAdmin = localStorage.getItem('hafif_admin');
  if (isAdmin === '1') return;

  db.ref('visits/' + today + '/' + page).transaction(function(c) { return (c || 0) + 1; });
  if (source !== 'internal') db.ref('visits/' + today + '/sources/' + source).transaction(function(c) { return (c || 0) + 1; });
})();

// ===== SHOW / HIDE =====
function hideAuth() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'none';
  const logout = document.getElementById('logoutBtn');
  if (logout) logout.style.display = 'block';
}

function doLogout() {
  localStorage.removeItem('hafif_phone');
  localStorage.removeItem('hafif_name');
  localStorage.removeItem('hafif_admin');
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = '';
  const logout = document.getElementById('logoutBtn');
  if (logout) logout.style.display = 'none';
  const admin = document.getElementById('adminPanel');
  if (admin) admin.classList.remove('on');
  authShowStep(1);
  const loginPhone = document.getElementById('loginPhone');
  if (loginPhone) loginPhone.value = '';
}

// ===== PURCHASE NOTIFICATIONS =====
let lastPaymentCount = null;
function listenForPurchases() {
  if (!db) return;
  db.ref('payments').on('value', function(snap) {
    const payments = snap.val() || {};
    const count = Object.keys(payments).length;
    if (lastPaymentCount === null) { lastPaymentCount = count; return; }
    if (count > lastPaymentCount) {
      const newPayments = Object.values(payments).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      const latest = newPayments[0];
      // Play sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 800; gain.gain.value = 0.3;
        osc.start(); osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch(e){}
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('רכישה חדשה!', { body: (latest.name || '') + ' רכש ' + (COURSES[latest.courseId] ? COURSES[latest.courseId].name : latest.courseId) + ' - ₪' + latest.amount, icon: 'logo-small.jpeg' });
      }
      // On-screen alert
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:1rem;right:1rem;background:#27ae60;color:#fff;padding:1rem 1.5rem;border-radius:12px;font-family:Heebo;font-size:.95rem;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:slideIn .3s';
      toast.textContent = 'רכישה חדשה! ' + (latest.name || '') + ' - ' + (COURSES[latest.courseId] ? COURSES[latest.courseId].name : '');
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
      lastPaymentCount = count;
    }
  });
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ===== ADMIN PANEL =====
function openAdmin() {
  const panel = document.getElementById('adminPanel');
  if (!panel || !db) return;
  panel.classList.add('on');
  listenForPurchases();

  db.ref('users').on('value', snap => {
    const users = snap.val() || {};
    const list = Object.values(users);
    const total = list.length;

    // Count per course
    let courseStats = {};
    Object.keys(COURSES).forEach(cid => { courseStats[cid] = 0; });
    let totalRevenue = 0;
    list.forEach(u => {
      if (u.courses) {
        Object.keys(u.courses).forEach(cid => {
          courseStats[cid] = (courseStats[cid] || 0) + 1;
          totalRevenue += (u.courses[cid].amount || 0);
        });
      }
      // Legacy users
      if (u.status === 'approved' && (!u.courses || !u.courses.lashon)) {
        courseStats.lashon = (courseStats.lashon || 0) + 1;
      }
    });

    let statsHtml = '<div class="admin-stat"><div class="num">' + total + '</div><div class="label">סה"כ נרשמים</div></div>';
    Object.keys(COURSES).forEach(cid => {
      statsHtml += '<div class="admin-stat"><div class="num" style="color:var(--ok)">' + (courseStats[cid] || 0) + '</div><div class="label">' + COURSES[cid].name + '</div></div>';
    });
    statsHtml += '<div class="admin-stat"><div class="num" style="color:var(--ac)">₪' + totalRevenue + '</div><div class="label">הכנסות</div></div>';
    statsHtml += '<div class="admin-stat" id="visitsStat"><div class="num" style="color:var(--pl)">...</div><div class="label">כניסות היום</div></div>';
    document.getElementById('adminStats').innerHTML = statsHtml;

    // Load today's visits
    var today = new Date().toISOString().slice(0,10);
    db.ref('visits/' + today).once('value').then(function(vSnap) {
      var v = vSnap.val() || {};
      var totalVisits = (v.home || 0) + (v.lashon || 0) + (v.english || 0);
      var el = document.getElementById('visitsStat');
      if (el) el.innerHTML = '<div class="num" style="color:var(--pl)">' + totalVisits + '</div><div class="label">כניסות היום</div>';
      // Sources breakdown
      var sources = v.sources || {};
      var srcIcons = { tiktok:'🎵', instagram:'📸', facebook:'👥', google:'🔍', whatsapp:'💬', twitter:'🐦', direct:'🔗', other:'🌐' };
      var srcSorted = Object.entries(sources).sort(function(a,b){ return b[1]-a[1]; });
      var totalSrc = srcSorted.reduce(function(sum,s){ return sum+s[1]; },0);
      var srcHtml = srcSorted.map(function(s) {
        var pct = totalSrc > 0 ? Math.round(s[1]/totalSrc*100) : 0;
        var icon = srcIcons[s[0]] || '🌐';
        return '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem">' +
          '<span style="font-size:1.2rem;width:24px;text-align:center">' + icon + '</span>' +
          '<span style="color:#ccc;font-size:.85rem;min-width:70px">' + s[0] + '</span>' +
          '<div style="flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#2980b9,#3498db);border-radius:4px"></div></div>' +
          '<span style="color:#fff;font-weight:700;font-size:.85rem;min-width:30px;text-align:left">' + s[1] + '</span>' +
          '<span style="color:#666;font-size:.75rem;min-width:35px">(' + pct + '%)</span>' +
        '</div>';
      }).join('');
      var srcEl = document.getElementById('sourcesStat');
      if (srcEl) srcEl.innerHTML = srcHtml || '<div style="color:#666;font-size:.85rem;text-align:center;padding:1rem">אין נתונים עדיין</div>';
    });

    const sorted = list.sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0));
    document.getElementById('adminUsers').innerHTML = sorted.length === 0
      ? '<p style="text-align:center;padding:2rem;color:var(--txl)">אין משתמשים רשומים עדיין</p>'
      : sorted.map(u => {
        let badges = '';
        if (u.courses) {
          Object.keys(u.courses).forEach(cid => {
            badges += '<span class="course-badge ' + cid + '">' + (COURSES[cid] ? COURSES[cid].name : cid) + '</span>';
          });
        }
        if (u.status === 'approved' && (!u.courses || !u.courses.lashon)) {
          badges += '<span class="course-badge lashon">לשון</span>';
        }
        return '<div class="admin-user">' +
          '<div class="info">' +
            '<div class="uname">' + escHtml(u.name || '') + '</div>' +
            '<div><span class="phone">' + escHtml(u.phone || '') + '</span></div>' +
            '<div class="date">' + (u.registeredAt ? new Date(u.registeredAt).toLocaleString('he-IL') : '') + '</div>' +
            '<div>' + badges + '</div>' +
          '</div>' +
          '<div class="actions"><button class="delete-btn" onclick="deleteUser(\'' + escHtml(u.phone || '') + '\')">מחק</button></div>' +
        '</div>';
      }).join('');

    // Draw charts if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
      drawAdminCharts(list);
      drawVisitsChart();
    }
  });
}

let timelineChart = null, coursesChart = null;
function drawAdminCharts(users) {
  const timelineCanvas = document.getElementById('chartTimeline');
  const coursesCanvas = document.getElementById('chartCourses');
  if (!timelineCanvas || !coursesCanvas) return;

  // Timeline chart - registrations per day (last 30 days)
  const days = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(5, 10); // MM-DD
    days[key] = 0;
  }
  users.forEach(u => {
    if (!u.registeredAt) return;
    const key = new Date(u.registeredAt).toISOString().slice(5, 10);
    if (days.hasOwnProperty(key)) days[key]++;
  });

  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(timelineCanvas, {
    type: 'line',
    data: {
      labels: Object.keys(days).map(k => k.replace('-', '/')),
      datasets: [{
        label: 'הרשמות',
        data: Object.values(days),
        borderColor: '#2980b9',
        backgroundColor: 'rgba(41,128,185,.1)',
        fill: true,
        tension: .4,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: 'rgba(255,255,255,.08)' } },
        x: { ticks: { maxTicksLimit: 10, font: { size: 10 }, color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' } }
      }
    }
  });

  // Courses pie chart
  const courseCount = {};
  Object.keys(COURSES).forEach(cid => { courseCount[cid] = 0; });
  users.forEach(u => {
    if (u.courses) {
      Object.keys(u.courses).forEach(cid => { courseCount[cid] = (courseCount[cid] || 0) + 1; });
    }
    if (u.status === 'approved' && (!u.courses || !u.courses.lashon)) {
      courseCount.lashon = (courseCount.lashon || 0) + 1;
    }
  });

  if (coursesChart) coursesChart.destroy();
  coursesChart = new Chart(coursesCanvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(courseCount).map(cid => COURSES[cid] ? COURSES[cid].name : cid),
      datasets: [{
        data: Object.values(courseCount),
        backgroundColor: ['#2980b9', '#8e44ad', '#27ae60', '#e67e22', '#e74c3c']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12, family: 'Heebo' }, color: '#888' } } }
    }
  });
}

let visitsChart = null;
function drawVisitsChart() {
  const canvas = document.getElementById('chartVisits');
  if (!canvas || !db) return;

  db.ref('visits').once('value').then(snap => {
    const visits = snap.val() || {};
    const days = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { home: 0, lashon: 0, english: 0 };
    }
    Object.keys(visits).forEach(date => {
      if (days[date]) {
        days[date].home = visits[date].home || 0;
        days[date].lashon = visits[date].lashon || 0;
        days[date].english = visits[date].english || 0;
      }
    });

    const labels = Object.keys(days).map(k => k.slice(5).replace('-', '/'));

    if (visitsChart) visitsChart.destroy();
    visitsChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'דף בית', data: Object.values(days).map(d => d.home), backgroundColor: 'rgba(41,128,185,.6)' },
          { label: 'לשון', data: Object.values(days).map(d => d.lashon), backgroundColor: 'rgba(39,174,96,.6)' },
          { label: 'אנגלית', data: Object.values(days).map(d => d.english), backgroundColor: 'rgba(142,68,173,.6)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#888', font: { size: 11, family: 'Heebo' } } } },
        scales: {
          y: { beginAtZero: true, stacked: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' } },
          x: { stacked: true, ticks: { maxTicksLimit: 10, font: { size: 10 }, color: '#888' }, grid: { color: 'rgba(255,255,255,.05)' } }
        }
      }
    });
  });
}

function closeAdmin() {
  document.getElementById('adminPanel').classList.remove('on');
  if (db) db.ref('users').off();
  if (typeof COURSE_ID !== 'undefined' && COURSE_ID) {
    document.getElementById('authOverlay').style.display = '';
  }
  localStorage.removeItem('hafif_admin');
  authShowStep(1);
}

const _DBSEC = 'USdZLOPwJY516JIDfKZXFvT3FguH7BTmxqD5Mhte';
const _FBURL = 'https://hafifbagrut-hebrew-default-rtdb.firebaseio.com';

function _adminWrite(path, data, method) {
  method = method || 'PATCH';
  return fetch(_FBURL + path + '?auth=' + _DBSEC, {
    method: method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
}

function addFreeUser() {
  const phone = (document.getElementById('addPhone').value || '').trim().replace(/\D/g, '');
  const name = (document.getElementById('addName').value || '').trim() || 'גישה חינמית';
  const courseSelect = document.getElementById('addCourse').value;
  if (!phone || phone.length < 9) { alert('הזינו מספר טלפון תקין'); return; }
  if (!Object.keys(COURSES).includes(courseSelect) && courseSelect !== 'all') { alert('קורס לא תקין'); return; }

  const userBase = { name: name, phone: phone, registeredAt: new Date().toISOString() };
  _adminWrite('/users/' + phone + '.json', userBase).then(() => {
    const courseIds = courseSelect === 'all' ? Object.keys(COURSES) : [courseSelect];
    return Promise.all(courseIds.map(cid =>
      _adminWrite('/users/' + phone + '/courses/' + cid + '.json', {
        purchasedAt: new Date().toISOString(), amount: 0, transactionCode: 'free'
      }, 'PUT')
    ));
  }).then(() => {
    alert('גישה ניתנה ל-' + phone);
    document.getElementById('addPhone').value = '';
    document.getElementById('addName').value = '';
  });
}

function deleteUser(phone) {
  if (!confirm('למחוק את המשתמש?')) return;
  fetch(_FBURL + '/users/' + phone + '.json?auth=' + _DBSEC, { method: 'DELETE' });
}

function exportUsers() {
  if (!db) return;
  db.ref('users').once('value').then(snap => {
    const users = Object.values(snap.val() || {});
    const headers = 'שם,טלפון,קורסים,תאריך הרשמה';
    const csv = '\ufeff' + headers + '\n' + users.map(u => {
      let courses = [];
      if (u.courses) courses = Object.keys(u.courses);
      if (u.status === 'approved' && (!u.courses || !u.courses.lashon)) courses.push('lashon');
      return (u.name || '') + ',' + (u.phone || '') + ',' + courses.join('+') + ',' + (u.registeredAt || '');
    }).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'hafif-users.csv';
    a.click();
  });
}

// ===== AUTO-CHECK ON PAGE LOAD =====
// Hide overlay immediately if user is known (prevents flash)
(function() {
  const savedPhone = localStorage.getItem('hafif_phone');
  const savedAdmin = localStorage.getItem('hafif_admin');
  if (savedPhone || savedAdmin === '1') {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
  }
})();

(function() {
  const isAdmin = localStorage.getItem('hafif_admin');
  if (isAdmin === '1') {
    openAdmin();
    return;
  }
  const phone = localStorage.getItem('hafif_phone');
  if (phone && db) {
    db.ref('users/' + phone).once('value').then(snap => {
      if (!snap.exists()) return;
      const u = snap.val();
      if (typeof COURSE_ID !== 'undefined' && COURSE_ID) {
        const hasCourse = (u.courses && u.courses[COURSE_ID]) || (COURSE_ID === 'lashon' && u.status === 'approved');
        if (hasCourse) hideAuth();
        else {
          const overlay = document.getElementById('authOverlay');
          if (overlay) overlay.style.display = '';
        }
      } else {
        hideAuth();
        if (typeof updateCourseCards === 'function') updateCourseCards(u);
      }
    }).catch(() => {});
  }
})();
