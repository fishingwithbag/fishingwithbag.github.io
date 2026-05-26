import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove, update } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyApX90ynhEGP2uBgxMXOhNeM-Jbrvyzgps",
  authDomain: "gen-lang-client-0162948406.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0162948406-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gen-lang-client-0162948406",
  storageBucket: "gen-lang-client-0162948406.firebasestorage.app",
  messagingSenderId: "700325287638",
  appId: "1:700325287638:web:541c2146fd62adcb789b77"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

function exposeFirebase() {
  window.__db = db;
  window.__ref = ref;
  window.__push = push;
  window.__set = set;
  window.__remove = remove;
  window.__update = update;
  window.__onValue = onValue;
  window.__firebaseReady = true;
  window.dispatchEvent(new Event('firebase-ready'));
}

signInAnonymously(auth)
  .then(exposeFirebase)
  .catch(err => {
    console.error('Firebase 匿名登入失敗:', err);
    exposeFirebase(); // 降級：auth 失敗仍嘗試連線（Realtime DB rules 設 public read 時有效）
  });


/*import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, push, set, remove, update } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyApX90ynhEGP2uBgxMXOhNeM-Jbrvyzgps",
  authDomain: "gen-lang-client-0162948406.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0162948406-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gen-lang-client-0162948406",
  storageBucket: "gen-lang-client-0162948406.firebasestorage.app",
  messagingSenderId: "700325287638",
  appId: "1:700325287638:web:541c2146fd62adcb789b77"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

function exposeFirebase() {
  window.__db = db;
  window.__ref = ref;
  window.__push = push;
  window.__set = set;
  window.__remove = remove;
  window.__update = update;
  window.__onValue = onValue;
  window.__firebaseReady = true;
  window.dispatchEvent(new Event('firebase-ready'));
}

signInAnonymously(auth)
  .then(() => {
    exposeFirebase();
  })
  .catch(err => {
    console.error('Firebase 匿名登入失敗:', err);
    exposeFirebase();
  });
