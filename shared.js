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

// ===== ADMIN PANEL =====
function openAdmin() {
  const panel = document.getElementById('adminPanel');
  if (!panel || !db) return;
  panel.classList.add('on');

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
    document.getElementById('adminStats').innerHTML = statsHtml;

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
    if (typeof Chart !== 'undefined') drawAdminCharts(list);
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
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { ticks: { maxTicksLimit: 10, font: { size: 10 } } }
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
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12, family: 'Heebo' } } } }
    }
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
