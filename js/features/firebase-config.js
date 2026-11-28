/**
 * features/firebase-config.js — settings for the Firebase account service (used by features/auth.js).
 *
 * Firebase settings for Rumbo accounts (email, Google and Apple sign-in).
 *
 * Until this is filled in, the Login / Sign up popup works visually but tells users
 * that accounts aren't connected yet.
 *
 * How to fill it in (free, ~5 minutes):
 *   1. Go to https://console.firebase.google.com → "Add project" → name it "rumbo".
 *   2. In the project: Build → Authentication → "Get started" → Sign-in method:
 *        - enable "Email/Password"
 *        - enable "Google"
 *        - (optional) enable "Apple" — needs an Apple Developer account
 *   3. Authentication → Settings → Authorized domains → add your GitHub Pages domain
 *      (e.g. abdallayoussef006.github.io). "localhost" is already there for testing.
 *   4. Project settings (gear icon) → "Your apps" → Web (</>) → register "rumbo-web"
 *      → copy the firebaseConfig values into the object below.
 *
 * These values are safe to keep in a public repo — Firebase protects accounts with the
 * authorized-domains list and its security rules, not by hiding this config.
 */
window.RUMBO_FIREBASE = null;

/* Example — replace null above with your own values:
window.RUMBO_FIREBASE = {
  apiKey: "AIza....",
  authDomain: "rumbo-xxxx.firebaseapp.com",
  projectId: "rumbo-xxxx",
  appId: "1:123456789:web:abcdef"
};
*/
