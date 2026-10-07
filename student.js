import {db,guard,layout,setActive,toast,esc,fmtTime,leaderboardHTML,resultsTable} from "./common.js";
import {collection,addDoc,getDocs,query,where,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const user = await guard("student");
layout(user,[["quizzes","journal-text","Available quizzes"],["results","clock-history","My results"],["board","trophy","Leaderboard"]]);
const main = document.getElementById("main");
const head = (t,i) => `<h3 class="fw-bold mb-4"><i class="bi bi-${i} me-2"></i>${t}</h3>`;
let S = null; // active exam state

const myResults = async () => (await getDocs(query(collection(db,"results"),where("userId","==",user.uid)))).docs.map(d=>d.data()).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

const views = {
async quizzes() {
  const qs = (await getDocs(query(collection(db,"quizzes"),where("published","==",true)))).docs.map(d=>({id:d.id,...d.data()}));
  main.innerHTML = head("Available quizzes","journal-text") + `<div class="row g-3">${qs.map(q=>`<div class="col-md-6 col-xl-4"><div class="glass card-q h-100">
    <h5>${esc(q.title)}</h5><p class="text-muted2 small">${esc(q.description)}</p>
    <p class="small"><i class="bi bi-clock me-1"></i>${q.duration} min · Pass ${q.passPercent}%</p>
    <button class="btn btn-grad w-100" data-start="${q.id}"><i class="bi bi-play-fill"></i> Start quiz</button></div></div>`).join("")||`<p class="text-muted2">No published quizzes yet. Check back soon.</p>`}</div>`;
  main.querySelectorAll("[data-start]").forEach(b => b.onclick = () => start(qs.find(q=>q.id===b.dataset.start)));
},
async results() { main.innerHTML = head("My results","clock-history") + `<div class="glass p-4">${resultsTable(await myResults(),false)}</div>`; },
async board() { main.innerHTML = head("Leaderboard","trophy") + `<div class="glass p-4">${await leaderboardHTML(user.uid)}</div>`; }
};

async function start(quiz) {
  const qs = (await getDocs(query(collection(db,"questions"),where("quizId","==",quiz.id)))).docs.map(d=>({id:d.id,...d.data()}));
  if (!qs.length) return toast("This quiz has no questions yet.","warning");
  S = {quiz,qs,ans:{},i:0,t0:Date.now(),end:Date.now()+quiz.duration*60000,done:false};
  document.getElementById("side").style.display = "none";
  main.style.marginLeft = "0"; renderQ();
  S.timer = setInterval(tick,500); tick();
}
function tick() {
  const left = Math.max(0,Math.ceil((S.end-Date.now())/1000));
  const el = document.getElementById("timer");
  if (el) { el.textContent = `${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`; el.classList.toggle("low",left<=30); }
  if (left<=0) { toast("Time is up – submitting automatically","warning"); submit(); }
}
function renderQ() {
  const q = S.qs[S.i], last = S.i === S.qs.length-1;
  main.innerHTML = `<div class="container view" style="max-width:820px">
    <div class="glass p-3 mb-3 d-flex justify-content-between align-items-center"><b>${esc(S.quiz.title)}</b><span class="timer"><i class="bi bi-stopwatch me-1"></i><span id="timer"></span></span></div>
    <div class="progress mb-3" style="height:8px"><div class="progress-bar" style="width:${(S.i+1)/S.qs.length*100}%;background:linear-gradient(90deg,#6d28d9,#2563eb)"></div></div>
    <div class="glass p-4"><small class="text-muted2">Question ${S.i+1} of ${S.qs.length} · ${q.marks} mark(s)</small>
    <h5 class="my-3">${esc(q.question)}</h5>
    ${["A","B","C","D"].map(l=>`<label class="opt ${S.ans[q.id]===l?"sel":""}"><input type="radio" name="o" class="d-none" value="${l}"><b>${l}.</b> ${esc(q["option"+l])}</label>`).join("")}
    <div class="d-flex justify-content-between mt-4">
      <button class="btn btn-outline-light" id="prev" ${S.i===0?"disabled":""}><i class="bi bi-arrow-left"></i> Previous</button>
      ${last?`<button class="btn btn-success" id="sub"><i class="bi bi-check2-circle"></i> Submit exam</button>`:`<button class="btn btn-grad" id="next">Next <i class="bi bi-arrow-right"></i></button>`}</div></div>
    <div class="d-flex flex-wrap gap-2 mt-3 justify-content-center">${S.qs.map((x,k)=>`<button class="btn btn-sm ${k===S.i?"btn-grad":S.ans[x.id]?"btn-success":"btn-outline-light"}" data-go="${k}">${k+1}</button>`).join("")}</div></div>`;
  main.querySelectorAll("input[name=o]").forEach(r => r.onchange = () => { S.ans[q.id] = r.value; renderQ(); });
  main.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { S.i = +b.dataset.go; renderQ(); });
  const p = document.getElementById("prev"), n = document.getElementById("next"), s = document.getElementById("sub");
  p.onclick = () => { S.i--; renderQ(); };
  if (n) n.onclick = () => { S.i++; renderQ(); };
  if (s) s.onclick = () => { const un = S.qs.length-Object.keys(S.ans).length; if (!un || confirm(`${un} question(s) unanswered. Submit anyway?`)) submit(); };
  tick();
}
async function submit() {
  if (S.done) return; S.done = true; clearInterval(S.timer);
  let correct=0,wrong=0,un=0,score=0,total=0;
  S.qs.forEach(q => { total += q.marks; const a = S.ans[q.id]; if (!a) un++; else if (a===q.correctAnswer) { correct++; score += q.marks; } else wrong++; });
  const pct = total ? Math.round(score/total*1000)/10 : 0;
  const r = {userId:user.uid,userName:user.name,quizId:S.quiz.id,quizTitle:S.quiz.title,totalQuestions:S.qs.length,correct,wrong,unanswered:un,score,totalMarks:total,percentage:pct,passed:pct>=S.quiz.passPercent,timeTaken:Math.min(Math.round((Date.now()-S.t0)/1000),S.quiz.duration*60),createdAt:serverTimestamp()};
  try { await addDoc(collection(db,"results"),r); toast("Result saved"); } catch(e) { toast("Could not save result: "+e.message,"danger"); }
  document.getElementById("side").style.display = ""; main.style.marginLeft = "";
  const stat = (l,v,c="") => `<div class="col-6 col-md-4"><div class="glass p-3 text-center"><div class="stat ${c}">${v}</div><small class="text-muted2">${l}</small></div></div>`;
  main.innerHTML = `<div class="container view" style="max-width:820px"><div class="glass p-4 text-center mb-3">
    <i class="bi bi-${r.passed?"trophy-fill text-warning":"emoji-frown"}" style="font-size:3rem"></i>
    <h3 class="fw-bold mt-2">${r.passed?"You passed!":"Keep practising"}</h3><span class="badge fs-6 bg-${r.passed?"success":"danger"}">${r.passed?"PASS":"FAIL"}</span></div>
    <div class="row g-3 mb-3">${stat("Total questions",r.totalQuestions)}${stat("Correct",correct,"text-success")}${stat("Wrong",wrong,"text-danger")}${stat("Unanswered",un,"text-warning")}${stat("Score",`${score}/${total}`)}${stat("Percentage",pct+"%")}</div>
    <div class="glass p-3 text-center mb-3"><i class="bi bi-stopwatch me-1"></i>Time taken: <b>${fmtTime(r.timeTaken)}</b></div>
    <div class="text-center"><button class="btn btn-grad" id="back">Back to dashboard</button></div></div>`;
  document.getElementById("back").onclick = () => show("quizzes"); S = null;
}

const show = k => { if (S && !S.done) return toast("Finish the exam first","warning"); setActive(k); main.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div></div>'; views[k]().catch(e=>toast(e.message,"danger")); };
document.querySelectorAll(".nav-btn[data-s]").forEach(b => b.onclick = () => show(b.dataset.s));
window.addEventListener("beforeunload", e => { if (S && !S.done) { e.preventDefault(); e.returnValue = ""; } });
show("quizzes");
