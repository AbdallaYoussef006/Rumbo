/**
 * features/auth.js — Rumbo "Sign In / Sign Up" popup.
 * Opens over the splash screen from the Login / Sign up buttons (or index.html#login / #signup).
 * Accounts run on Firebase Authentication (email + password, Google, Apple) once
 * js/features/firebase-config.js is filled in. Until then the popup explains that accounts aren't connected.
 */
(function () {
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const cfg = window.RUMBO_FIREBASE;
  const configured = !!(cfg && cfg.apiKey);
  let fb = null;                 // firebase auth instance once loaded
  let mode = 'signin';
  let lastFocus = null;

  const ICON = {
    at: '<svg height="20" viewBox="0 0 32 32" width="20" aria-hidden="true"><path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z"/></svg>',
    lock: '<svg height="20" viewBox="-64 0 512 512" width="20" aria-hidden="true"><path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"/><path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"/></svg>',
    user: '<svg height="20" viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
    eye: '<svg viewBox="0 0 576 512" aria-hidden="true"><path fill="currentColor" d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4 142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1-288 0zm144-64a64 64 0 1 1-64 64c0-1.6.1-3.2.2-4.8a48 48 0 0 0 59.6-59.6c1.5-.1 3.1-.2 4.6-.2z"/></svg>',
    eyeOff: '<svg viewBox="0 0 640 512" aria-hidden="true"><path fill="currentColor" d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zm151 118.3C226 97.7 269.5 80 320 80c65.2 0 118.8 29.6 159.9 67.7C518.4 183.5 545 226 558.6 256c-12.6 28-36.6 66.8-70.9 100.9l-53.8-42.2c9.1-17.6 14.2-37.5 14.2-58.7 0-70.7-57.3-128-128-128-32.2 0-61.7 11.9-84.2 31.5l-46.1-36.1zM394.9 284.2l-81.5-63.9c4.2-8.5 6.6-18.2 6.6-28.3 0-5.5-.7-10.9-2-16 .7 0 1.3 0 2 0 44.2 0 80 35.8 80 80 0 9.9-1.8 19.4-5.1 28.2zm9.4 130.3C378.8 425.4 350.7 432 320 432c-65.2 0-118.8-29.6-159.9-67.7C121.6 328.5 95 286 81.4 256c8.3-18.4 21.5-41.5 39.4-64.8L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5l-41.9-33z"/></svg>',
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    apple: '<svg viewBox="0 0 22.773 22.773" aria-hidden="true"><path d="M15.769 0h.162c.13 1.606-.483 2.806-1.228 3.675-.731.863-1.732 1.7-3.351 1.573-.108-1.583.506-2.694 1.25-3.561C13.292.879 14.557.16 15.769 0zM20.67 16.716v.045c-.455 1.378-1.104 2.559-1.896 3.655-.723.995-1.609 2.334-3.191 2.334-1.367 0-2.275-.879-3.676-.903-1.482-.024-2.297.735-3.652.926h-.462c-.995-.144-1.798-.932-2.383-1.642-1.725-2.098-3.058-4.808-3.306-8.276v-1.019c.105-2.482 1.311-4.5 2.914-5.478.846-.52 2.009-.963 3.304-.765.555.086 1.122.276 1.619.464.471.181 1.06.502 1.618.485.378-.011.754-.208 1.135-.347 1.116-.403 2.21-.865 3.652-.648 1.733.262 2.963 1.032 3.723 2.22-1.466.933-2.625 2.339-2.427 4.74.176 2.181 1.444 3.457 3.028 4.209z"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  /* ---------------- markup ---------------- */
  const overlay = document.createElement('div');
  overlay.className = 'auth-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <form class="form" id="auth-form" role="dialog" aria-modal="true" aria-labelledby="auth-title" novalidate>
      <div class="auth-head">
        <img src="assets/logo/rumbo-logo-blue-framed.png" alt="Rumbo — Travel &amp; Tours">
        <button type="button" class="auth-close" id="auth-close" aria-label="Close">${ICON.close}</button>
      </div>
      <h2 class="auth-title" id="auth-title"></h2>
      <p class="auth-sub" id="auth-sub"></p>

      <div class="flex-column" data-only="signup"><label for="auth-name">Full name</label></div>
      <div class="inputForm" data-only="signup">${ICON.user}<input id="auth-name" type="text" class="input" placeholder="Enter your Name" autocomplete="name"></div>

      <div class="flex-column"><label for="auth-email">Email</label></div>
      <div class="inputForm">${ICON.at}<input id="auth-email" type="email" class="input" placeholder="Enter your Email" autocomplete="email"></div>

      <div class="flex-column"><label for="auth-pass">Password</label></div>
      <div class="inputForm">${ICON.lock}<input id="auth-pass" type="password" class="input" placeholder="Enter your Password" autocomplete="current-password">
        <button type="button" class="eye" id="auth-eye" aria-label="Show password">${ICON.eye}</button></div>

      <div class="flex-row" data-only="signin">
        <div><label><input type="checkbox" id="auth-remember" checked> Remember me</label></div>
        <button type="button" class="span" id="auth-forgot">Forgot password?</button>
      </div>

      <button class="button-submit" id="auth-submit" type="submit"></button>
      <p class="p"><span id="auth-switch-text"></span> <button type="button" class="span" id="auth-switch"></button></p>
      <p class="p line">Or With</p>
      <div class="flex-row socials">
        <button type="button" class="btn google" id="auth-google">${ICON.google} Google</button>
        <button type="button" class="btn apple" id="auth-apple">${ICON.apple} Apple</button>
      </div>
      <div class="auth-status" id="auth-status" role="status" aria-live="polite"></div>
    </form>`;
  document.body.appendChild(overlay);
  const $ = (id) => document.getElementById(id);

  /* ---------------- open / close / switch ---------------- */
  function setMode(m) {
    mode = m === 'signup' ? 'signup' : 'signin';
    overlay.querySelectorAll('[data-only]').forEach((el) => { el.style.display = el.dataset.only === mode ? '' : 'none'; });
    $('auth-title').textContent = mode === 'signin' ? 'Welcome back' : 'Create your account';
    $('auth-sub').textContent = mode === 'signin' ? 'Sign in to see your saved trips and plans.' : 'Save trips and plans across all your devices.';
    $('auth-submit').textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
    $('auth-switch-text').textContent = mode === 'signin' ? "Don't have an account?" : 'Already have an account?';
    $('auth-switch').textContent = mode === 'signin' ? 'Sign Up' : 'Sign In';
    $('auth-pass').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    status('');
    overlay.querySelectorAll('.inputForm').forEach((f) => f.classList.remove('invalid'));
  }
  function open(m) {
    setMode(m);
    lastFocus = document.activeElement;
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => (mode === 'signup' ? $('auth-name') : $('auth-email')).focus(), 60);
    if (location.hash !== '#' + (mode === 'signup' ? 'signup' : 'login')) history.replaceState(null, '', '#' + (mode === 'signup' ? 'signup' : 'login'));
  }
  function close() {
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $('auth-close').addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {   // keep keyboard focus inside the popup
      const f = [...overlay.querySelectorAll('button, input')].filter((x) => x.offsetParent !== null);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('auth-switch').addEventListener('click', () => { setMode(mode === 'signin' ? 'signup' : 'signin'); history.replaceState(null, '', mode === 'signup' ? '#signup' : '#login'); });
  $('auth-eye').addEventListener('click', () => {
    const p = $('auth-pass'); const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    $('auth-eye').innerHTML = show ? ICON.eyeOff : ICON.eye;
    $('auth-eye').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  // Buttons / links that open the popup: href="#login" or href="#signup"
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#login"], a[href="#signup"], a[href$="login.html"], a[href$="signup.html"]');
    if (!a || overlay.contains(a)) return;
    e.preventDefault();
    open(/signup/.test(a.getAttribute('href')) ? 'signup' : 'signin');
  });
  const fromHash = () => { if (location.hash === '#login') open('signin'); else if (location.hash === '#signup') open('signup'); };
  window.addEventListener('hashchange', fromHash);
  fromHash();

  /* ---------------- messages ---------------- */
  function status(msg, kind) {
    const s = $('auth-status');
    s.className = 'auth-status' + (msg ? ' show' : '') + (kind ? ' ' + kind : '');
    s.innerHTML = msg || '';
  }
  const notConnected = (what) =>
    `<b>${what} isn't connected yet.</b> Accounts run on Firebase — add your project settings in <code>js/features/firebase-config.js</code> to switch it on. ` +
    `Meanwhile you can <a href="home.html">browse as a guest</a>.`;
  const fileMode = () =>
    '<b>Sign-in only works on a real web address.</b> Open Rumbo from GitHub Pages or VS Code Live Server (not by double-clicking the file).';

  /* ---------------- Firebase (loaded only when needed) ---------------- */
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  }
  async function auth() {
    if (fb) return fb;
    await loadScript(SDK + 'firebase-app-compat.js');
    await loadScript(SDK + 'firebase-auth-compat.js');
    if (!window.firebase.apps.length) window.firebase.initializeApp(cfg);
    fb = window.firebase.auth();
    return fb;
  }
  function friendly(err) {
    const c = (err && err.code) || '';
    const map = {
      'auth/invalid-email': 'That email address doesn\'t look right.',
      'auth/missing-password': 'Please enter your password.',
      'auth/weak-password': 'Use at least 6 characters for your password.',
      'auth/email-already-in-use': 'An account with this email already exists — try signing in.',
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/wrong-password': 'Wrong email or password.',
      'auth/user-not-found': 'No account with this email — sign up first.',
      'auth/too-many-requests': 'Too many tries. Please wait a minute and try again.',
      'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
      'auth/popup-blocked': 'Your browser blocked the sign-in window — allow pop-ups for this site.',
      'auth/unauthorized-domain': 'This web address isn\'t allowed yet — add it in Firebase → Authentication → Settings → Authorized domains.',
      'auth/operation-not-allowed': 'This sign-in method is switched off — enable it in Firebase → Authentication → Sign-in method.',
      'auth/network-request-failed': 'No internet connection.',
    };
    return map[c] || (err && err.message) || 'Something went wrong. Please try again.';
  }
  function done(user) {
    const u = { name: user.displayName || (user.email || '').split('@')[0], email: user.email || '', photo: user.photoURL || '', provider: (user.providerData[0] || {}).providerId || 'password' };
    try { localStorage.setItem('rumbo:user', JSON.stringify(u)); } catch (_) { /* ignore */ }
    status(`<b>Welcome, ${u.name.replace(/[<>&]/g, '')}!</b> Taking you to Rumbo…`, 'ok');
    setTimeout(() => { location.href = 'home.html'; }, 900);
  }
  function ready(what) {
    if (!configured) { status(notConnected(what), ''); return false; }
    if (location.protocol === 'file:') { status(fileMode(), 'error'); return false; }
    return true;
  }

  /* ---------------- actions ---------------- */
  function validate() {
    let ok = true;
    const mark = (id, bad) => { $(id).closest('.inputForm').classList.toggle('invalid', bad); if (bad) ok = false; };
    if (mode === 'signup') mark('auth-name', !$('auth-name').value.trim());
    mark('auth-email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('auth-email').value.trim()));
    mark('auth-pass', $('auth-pass').value.length < 6);
    if (!ok) status(mode === 'signup' ? 'Please enter your name, a valid email and a password of at least 6 characters.' : 'Please enter a valid email and your password (at least 6 characters).', 'error');
    return ok;
  }

  $('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!ready(mode === 'signin' ? 'Signing in' : 'Signing up')) return;
    const btn = $('auth-submit'); btn.disabled = true; status('Please wait…');
    try {
      const a = await auth();
      const email = $('auth-email').value.trim(), pass = $('auth-pass').value;
      if (mode === 'signin') {
        await a.setPersistence($('auth-remember').checked ? window.firebase.auth.Auth.Persistence.LOCAL : window.firebase.auth.Auth.Persistence.SESSION);
        const r = await a.signInWithEmailAndPassword(email, pass); done(r.user);
      } else {
        const r = await a.createUserWithEmailAndPassword(email, pass);
        await r.user.updateProfile({ displayName: $('auth-name').value.trim() }); done(r.user);
      }
    } catch (err) { status(friendly(err), 'error'); } finally { btn.disabled = false; }
  });

  async function social(kind) {
    if (!ready(kind === 'google' ? 'Google sign-in' : 'Apple sign-in')) return;
    status('Opening ' + (kind === 'google' ? 'Google' : 'Apple') + ' sign-in…');
    try {
      const a = await auth();
      const provider = kind === 'google' ? new window.firebase.auth.GoogleAuthProvider() : new window.firebase.auth.OAuthProvider('apple.com');
      if (kind === 'apple') { provider.addScope('email'); provider.addScope('name'); }
      const r = await a.signInWithPopup(provider); done(r.user);
    } catch (err) { status(friendly(err), 'error'); }
  }
  $('auth-google').addEventListener('click', () => social('google'));
  $('auth-apple').addEventListener('click', () => social('apple'));

  $('auth-forgot').addEventListener('click', async () => {
    const email = $('auth-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('auth-email').closest('.inputForm').classList.add('invalid'); status('Type your email above first, then press "Forgot password?".', 'error'); return; }
    if (!ready('Password reset')) return;
    try { const a = await auth(); await a.sendPasswordResetEmail(email); status('We sent a password reset link to <b>' + email.replace(/[<>&]/g, '') + '</b>.', 'ok'); }
    catch (err) { status(friendly(err), 'error'); }
  });

  window.RumboAuth = { open, close };
})();
