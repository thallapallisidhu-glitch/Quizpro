import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc,collection,getDocs} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhlIghWcqJqw_IDLNKW_xpmjDgmbYI6dE",
  authDomain: "quizapplication-1cd32.firebaseapp.com",
  projectId: "quizapplication-1cd32",
  storageBucket: "quizapplication-1cd32.firebasestorage.app",
  messagingSenderId: "476416708987",
  appId: "1:476416708987:web:0795c08a5cbc83fc426dde"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function toast(msg, type = "success") {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; box.className = "toast-container position-fixed top-0 end-0 p-3"; box.style.zIndex = 3000; document.body.append(box); }
  const icon = {success:"check-circle-fill",danger:"x-octagon-fill",warning:"exclamation-triangle-fill",info:"info-circle-fill"}[type];
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${type} border-0`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi bi-${icon} me-2"></i>${esc(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  box.append(el);
  const t = new bootstrap.Toast(el, {delay: 3500}); t.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

// Redirect to login unless signed in with the required role
export function guard(role) {
  return new Promise(resolve => onAuthStateChanged(auth, async u => {
    if (!u) return location.replace("index.html");
    const s = await getDoc(doc(db, "users", u.uid));
    if (!s.exists() || s.data().role !== role) return location.replace("index.html");
    resolve({uid: u.uid, ...s.data()});
  }));
}
export const logout = () => signOut(auth).then(() => location.replace("index.html"));

export const fmtTime = s => `${Math.floor(s/60)}m ${String(s%60).padStart(2,"0")}s`;
export const fmtDate = t => t?.toDate ? t.toDate().toLocaleString() : "-";

export async function leaderboardHTML(meId) {
  const rs = (await getDocs(collection(db, "results"))).docs.map(d => d.data());
  const best = {};
  rs.forEach(r => { const b = best[r.userId]; if (!b || r.percentage > b.percentage || (r.percentage === b.percentage && r.timeTaken < b.timeTaken)) best[r.userId] = r; });
  const list = Object.values(best).sort((a,b) => b.percentage - a.percentage || a.timeTaken - b.timeTaken);
  if (!list.length) return `<p class="text-muted2">No results yet.</p>`;
  const medal = ["🥇","🥈","🥉"];
  return `<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Rank</th><th>Student</th><th>Best quiz</th><th>Score</th><th>%</th><th>Time</th></tr></thead><tbody>${
    list.map((r,i) => `<tr class="${r.userId===meId?"fw-bold":""}"><td>${medal[i]||i+1}</td><td>${esc(r.userName)}${r.userId===meId?" (you)":""}</td><td>${esc(r.quizTitle)}</td><td>${r.score}/${r.totalMarks}</td><td>${r.percentage}%</td><td>${fmtTime(r.timeTaken)}</td></tr>`).join("")}</tbody></table></div>`;
}

export function resultsTable(rows, showName) {
  if (!rows.length) return `<p class="text-muted2">No results yet.</p>`;
  return `<div class="table-responsive"><table class="table align-middle"><thead><tr>${showName?"<th>Student</th>":""}<th>Quiz</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Score</th><th>%</th><th>Status</th><th>Time</th><th>Date</th></tr></thead><tbody>${
    rows.map(r => `<tr>${showName?`<td>${esc(r.userName)}</td>`:""}<td>${esc(r.quizTitle)}</td><td>${r.correct}</td><td>${r.wrong}</td><td>${r.unanswered}</td><td>${r.score}/${r.totalMarks}</td><td>${r.percentage}%</td><td><span class="badge bg-${r.passed?"success":"danger"}">${r.passed?"Pass":"Fail"}</span></td><td>${fmtTime(r.timeTaken)}</td><td>${fmtDate(r.createdAt)}</td></tr>`).join("")}</tbody></table></div>`;
}

export function layout(user, items) {
  document.body.insertAdjacentHTML("afterbegin", `
  <aside class="sidebar glass" id="side">
    <h5 class="fw-bold mb-1"><i class="bi bi-mortarboard-fill me-2"></i>QuizHub</h5>
    <small class="text-muted2 d-block mb-4">${esc(user.name)} · ${user.role}</small>
    ${items.map(([k,i,l]) => `<button class="nav-btn" data-s="${k}"><i class="bi bi-${i}"></i>${l}</button>`).join("")}
    <button class="nav-btn mt-4" id="logout"><i class="bi bi-box-arrow-left"></i>Logout</button>
  </aside>
  <div class="topbar glass m-2 p-2 align-items-center justify-content-between">
    <button class="btn btn-grad" id="burger"><i class="bi bi-list"></i></button><b>QuizHub</b><span></span>
  </div>
  <main class="content" id="main"></main>`);
  document.getElementById("logout").onclick = logout;
  document.getElementById("burger").onclick = () => document.getElementById("side").classList.toggle("open");
}
export function setActive(k) {
  document.querySelectorAll(".nav-btn[data-s]").forEach(b => b.classList.toggle("active", b.dataset.s === k));
  document.getElementById("side").classList.remove("open");
}
