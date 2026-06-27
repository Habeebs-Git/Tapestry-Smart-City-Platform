/* ============================================================
   Tapestry AI — Client Data & API Layer  (Phase 2)
   ------------------------------------------------------------
   Full-stack implementation of the Tapestry API.
   Communicates with the Node.js/Express backend via HTTP.
   ------------------------------------------------------------ */
(function (global) {
  'use strict';

  var K = { session: 'tap_session' };

  // ---- low-level collection helpers --------------------------------------
  function readSession() { 
    try { return JSON.parse(localStorage.getItem(K.session)) || null; } 
    catch (e) { return null; } 
  }

  // ---- Synchronous HTTP Request Helper for Compatibility -----------------
  function syncRequest(method, url, data) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, false); // synchronous request
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    var s = readSession();
    if (s && s.token) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + s.token);
    }
    
    try {
      xhr.send(data ? JSON.stringify(data) : null);
    } catch (e) {
      throw new Error('Network error. Failed to connect to server.');
    }

    if (xhr.status === 401) {
      localStorage.removeItem(K.session);
      location.href = '/auth?next=' + encodeURIComponent(location.pathname);
      return null;
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        return JSON.parse(xhr.responseText);
      } catch (e) {
        return xhr.responseText;
      }
    } else {
      var err = {};
      try { err = JSON.parse(xhr.responseText); } catch (e) {}
      throw new Error(err.error || err.message || 'Server error (' + xhr.status + ')');
    }
  }

  // ========================================================================
  //  API  (each method = one REST endpoint)
  // ========================================================================
  var API = {

    /* POST /api/auth/register */
    register: async function (data) {
      if (!data.name || !data.email || !data.password) throw new Error('All fields are required.');
      
      var response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      var resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Registration failed.');
      }
      
      localStorage.setItem(K.session, JSON.stringify({ token: resData.token, user: resData.user }));
      return resData.user;
    },

    /* POST /api/auth/login */
    login: async function (data) {
      if (!data.email || !data.password) throw new Error('Email and password are required.');
      
      var response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      var resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Login failed.');
      }
      
      localStorage.setItem(K.session, JSON.stringify({ token: resData.token, user: resData.user }));
      return resData.user;
    },

    /* logout */
    logout: function () { 
      localStorage.removeItem(K.session); 
    },

    /* current authenticated user (synchronous from localStorage session) */
    currentUser: function () {
      var s = readSession(); 
      if (!s || !s.token || !s.user) return null;
      return s.user;
    },

    /* protected-route guard. roles = optional array of allowed roles */
    requireAuth: function (roles) {
      var u = API.currentUser();
      if (!u) { 
        location.href = '/auth?next=' + encodeURIComponent(location.pathname); 
        return null; 
      }
      if (roles && roles.length && roles.indexOf(u.role) === -1) { 
        location.href = '/dashboard'; 
        return null; 
      }
      return u;
    },

    /* POST /api/upload -> multipart file upload to Cloudinary */
    uploadImage: function (file) {
      return new Promise(function (resolve, reject) {
        if (!file) return reject(new Error('No file selected.'));
        var ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (ok.indexOf(file.type) === -1) return reject(new Error('Invalid file type. Use jpg, jpeg, png or webp.'));
        if (file.size > 10 * 1024 * 1024) return reject(new Error('Image exceeds the 10 MB limit.'));
        
        var fd = new FormData();
        fd.append('file', file);
        
        var s = readSession();
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true); // Asynchronous for file upload progress/feel
        if (s && s.token) {
          xhr.setRequestHeader('Authorization', 'Bearer ' + s.token);
        }
        
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              var res = JSON.parse(xhr.responseText);
              resolve(res.imageUrl);
            } catch (e) {
              reject(new Error('Failed to parse upload response.'));
            }
          } else {
            var err = {};
            try { err = JSON.parse(xhr.responseText); } catch (e) {}
            reject(new Error(err.error || 'Upload failed.'));
          }
        };
        xhr.onerror = function () {
          reject(new Error('Network error during file upload.'));
        };
        xhr.send(fd);
      });
    },

    /* POST /api/issues */
    createIssue: function (data) {
      var res = syncRequest('POST', '/api/issues', data);
      
      // Synchronously refresh the user session from /api/auth/me to capture reputation points bump (+50 pts)
      try {
        var userRes = syncRequest('GET', '/api/auth/me');
        if (userRes) {
          var s = readSession();
          if (s) {
            s.user = userRes;
            localStorage.setItem(K.session, JSON.stringify(s));
          }
        }
      } catch (e) {
        console.error('Failed to sync updated user reputation:', e);
      }
      
      return res;
    },

    /* GET /api/issues */
    getIssues: function (opts) {
      var query = '';
      if (opts && opts.mine) query = '?mine=true';
      return syncRequest('GET', '/api/issues' + query);
    },

    /* GET /api/issues/:id */
    getIssue: function (id) { 
      return syncRequest('GET', '/api/issues/' + id); 
    },

    /* PUT /api/issues/:id */
    updateIssue: function (id, changes) {
      return syncRequest('PUT', '/api/issues/' + id, changes);
    },

    /* GET /api/issues/:id/updates */
    getUpdates: function (issueId) {
      return syncRequest('GET', '/api/issues/' + issueId + '/updates');
    },

    /* GET /api/dashboard/stats */
    dashboardStats: function (opts) {
      var query = '';
      if (opts && opts.mine) query = '?mine=true';
      return syncRequest('GET', '/api/dashboard/stats' + query);
    },

    /* POST /api/seed -> database seeder trigger */
    seed: async function () {
      if (localStorage.getItem('tap_seeded')) return;
      try {
        var response = await fetch('/api/seed', { method: 'POST' });
        if (response.ok) {
          localStorage.setItem('tap_seeded', '1');
        }
      } catch (e) {
        console.error('Seeding trigger failed:', e);
      }
    }
  };

  // ---- shared nav auth-state + protected routes (additive, no redesign) --
  var PROTECTED = {
    '/dashboard': null, '/report': null, '/tracking': null, '/profile': null,
    '/admin': ['admin'], '/manage': ['admin', 'contractor']
  };
  function fmtRole(r) { return r ? r.charAt(0).toUpperCase() + r.slice(1) : ''; }

  function initNav() {
    var right = document.querySelector('.nav-right'); if (!right) return;
    var u = API.currentUser();
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;gap:10px;align-items:center';
    if (u) {
      box.innerHTML = '<a class="chip pill-emerald" href="/profile" title="' + u.email + '">● ' + u.name.split(' ')[0] + ' · ' + fmtRole(u.role) + '</a>' +
        '<button class="btn btn-ghost" id="tap-logout" style="padding:9px 16px">Logout</button>';
      // remove the static "Sign in" link if present (keeps single auth control)
      right.querySelectorAll('a').forEach(function (a) { if (/sign in/i.test(a.textContent)) a.remove(); });
      right.appendChild(box);
      var lo = box.querySelector('#tap-logout');
      lo.addEventListener('click', function () { API.logout(); location.href = '/'; });
    }
  }

  function enforceRoute() {
    var path = location.pathname.replace(/\/$/, '') || '/';
    if (Object.prototype.hasOwnProperty.call(PROTECTED, path)) API.requireAuth(PROTECTED[path]);
  }

  // boot
  API.seed().then(function () {
    enforceRoute();
    if (document.readyState !== 'loading') initNav();
    else document.addEventListener('DOMContentLoaded', initNav);
  });

  global.TapestryAPI = API;
})(window);
