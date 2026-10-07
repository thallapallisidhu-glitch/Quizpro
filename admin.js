import {db,guard,layout,setActive,toast,esc,leaderboardHTML,resultsTable} from "./common.js";
import {collection,doc,addDoc,setDoc,updateDoc,deleteDoc,getDocs,query,where,serverTimestamp,writeBatch} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const user = await guard("admin");
layout(user,[["quizzes","journal-text","Quizzes"],["questions","question-circle","Questions"],["students","people","Students"],["results","bar-chart-line","Results"],["board","trophy","Leaderboard"]]);
const main = document.getElementById("main");
let quizzes = [], curQuiz = "", editId = null;

const loadQuizzes = async () => { quizzes = (await getDocs(collection(db,"quizzes"))).docs.map(d => ({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); };
const head = (t,i) => `<h3 class="fw-bold mb-4"><i class="bi bi-${i} me-2"></i>${t}</h3>`;

const views = {
async quizzes() {
  await loadQuizzes();
  main.innerHTML = head("Quizzes","journal-text") + `
  <div class="glass p-4 mb-4"><form id="qf" class="row g-3">
    <div class="col-md-4"><label class="form-label">Title</label><input id="qt" class="form-control" required></div>
    <div class="col-md-4"><label class="form-label">Description</label><input id="qd" class="form-control"></div>
    <div class="col-6 col-md-2"><label class="form-label">Minutes</label><input id="qm" type="number" min="1" value="10" class="form-control" required></div>
    <div class="col-6 col-md-2"><label class="form-label">Pass %</label><input id="qp" type="number" min="1" max="100" value="40" class="form-control" required></div>
    <div class="col-12 d-flex gap-2"><button class="btn btn-grad"><i class="bi bi-plus-lg me-1"></i>Create quiz</button>
    <button type="button" class="btn btn-outline-light" id="seed"><i class="bi bi-lightning me-1"></i>Add sample Python quiz</button></div>
  </form></div>
  <div class="row g-3">${quizzes.map(q => `<div class="col-md-6 col-xl-4"><div class="glass card-q h-100">
    <div class="d-flex justify-content-between"><h5>${esc(q.title)}</h5><span class="badge bg-${q.published?"success":"secondary"}">${q.published?"Published":"Draft"}</span></div>
    <p class="text-muted2 small">${esc(q.description)}</p>
    <p class="small mb-3"><i class="bi bi-clock me-1"></i>${q.duration} min · Pass ${q.passPercent}%</p>
    <div class="d-flex gap-2 flex-wrap">
      <button class="btn btn-sm btn-grad" data-a="pub" data-id="${q.id}">${q.published?"Unpublish":"Publish"}</button>
      <button class="btn btn-sm btn-outline-light" data-a="qs" data-id="${q.id}">Questions</button>
      <button class="btn btn-sm btn-outline-danger" data-a="delq" data-id="${q.id}"><i class="bi bi-trash"></i></button></div>
  </div></div>`).join("") || `<p class="text-muted2">No quizzes yet. Create one above.</p>`}</div>`;
  document.getElementById("qf").onsubmit = async e => {
    e.preventDefault();
    await addDoc(collection(db,"quizzes"),{title:qt.value.trim(),description:qd.value.trim(),duration:+qm.value,passPercent:+qp.value,published:false,createdAt:serverTimestamp()});
    toast("Quiz created"); views.quizzes();
  };
  document.getElementById("seed").onclick = seed;
},
async questions() {
  await loadQuizzes();
  if (!curQuiz && quizzes[0]) curQuiz = quizzes[0].id;
  const qs = curQuiz ? (await getDocs(query(collection(db,"questions"),where("quizId","==",curQuiz)))).docs.map(d=>({id:d.id,...d.data()})) : [];
  const e = qs.find(x => x.id === editId) || {};
  main.innerHTML = head("Questions","question-circle") + `
  <div class="glass p-4 mb-4"><form id="qn" class="row g-3">
    <div class="col-12"><label class="form-label">Quiz</label><select id="fq" class="form-select">${quizzes.map(q=>`<option value="${q.id}" ${q.id===curQuiz?"selected":""}>${esc(q.title)}</option>`).join("")}</select></div>
    <div class="col-12"><label class="form-label">Question</label><textarea id="fqq" class="form-control" rows="2" required>${esc(e.question)}</textarea></div>
    ${["A","B","C","D"].map(l=>`<div class="col-md-6"><label class="form-label">Option ${l}</label><input id="o${l}" class="form-control" value="${esc(e["option"+l])}" required></div>`).join("")}
    <div class="col-6 col-md-3"><label class="form-label">Correct answer</label><select id="fc" class="form-select">${["A","B","C","D"].map(l=>`<option ${e.correctAnswer===l?"selected":""}>${l}</option>`).join("")}</select></div>
    <div class="col-6 col-md-3"><label class="form-label">Marks</label><input id="fm" type="number" min="1" value="${e.marks||1}" class="form-control" required></div>
    <div class="col-12 d-flex gap-2"><button class="btn btn-grad">${editId?"Update":"Add"} question</button>${editId?'<button type="button" class="btn btn-outline-light" data-a="cancel">Cancel</button>':""}</div>
  </form></div>
  <div class="glass p-4"><h5 class="mb-3">${qs.length} question(s)</h5>${qs.map((q,i)=>`<div class="border-bottom border-secondary py-3">
    <div class="d-flex justify-content-between gap-2"><b>${i+1}. ${esc(q.question)}</b>
    <span class="text-nowrap"><button class="btn btn-sm btn-outline-light" data-a="eq" data-id="${q.id}"><i class="bi bi-pencil"></i></button>
    <button class="btn btn-sm btn-outline-danger" data-a="dq" data-id="${q.id}"><i class="bi bi-trash"></i></button></span></div>
    <small class="text-muted2">A) ${esc(q.optionA)} · B) ${esc(q.optionB)} · C) ${esc(q.optionC)} · D) ${esc(q.optionD)}</small><br>
    <small><span class="badge bg-success">Correct: ${q.correctAnswer}</span> <span class="badge bg-primary">${q.marks} mark(s)</span></small></div>`).join("")}</div>`;
  fq.onchange = () => { curQuiz = fq.value; editId = null; views.questions(); };
  document.getElementById("qn").onsubmit = async ev => {
    ev.preventDefault();
    const data = {quizId:fq.value,question:fqq.value.trim(),optionA:oA.value,optionB:oB.value,optionC:oC.value,optionD:oD.value,correctAnswer:fc.value,marks:+fm.value};
    if (!data.quizId) return toast("Create a quiz first","warning");
    editId ? await updateDoc(doc(db,"questions",editId),data) : await addDoc(collection(db,"questions"),data);
    toast(editId?"Question updated":"Question added"); curQuiz = data.quizId; editId = null; views.questions();
  };
},
async students() {
  const us = (await getDocs(query(collection(db,"users"),where("role","==","student")))).docs.map(d=>({id:d.id,...d.data()}));
  main.innerHTML = head("Students","people") + `<div class="glass p-4"><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th></th></tr></thead><tbody>${
    us.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.createdAt?.toDate?u.createdAt.toDate().toLocaleDateString():"-"}</td><td><button class="btn btn-sm btn-outline-danger" data-a="ds" data-id="${u.id}"><i class="bi bi-person-x"></i> Remove</button></td></tr>`).join("")||"<tr><td colspan=4>No students yet.</td></tr>"}</tbody></table></div>
    <small class="text-muted2">Removing deletes the student's profile and access to the app (their login account stays in Firebase Auth).</small></div>`;
},
async results() {
  const rs = (await getDocs(collection(db,"results"))).docs.map(d=>d.data()).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  main.innerHTML = head("All results","bar-chart-line") + `<div class="glass p-4">${resultsTable(rs,true)}</div>`;
},
async board() { main.innerHTML = head("Leaderboard","trophy") + `<div class="glass p-4">${await leaderboardHTML()}</div>`; }
};

async function seed() {
  const Q = [["Which keyword defines a function in Python?","def","func","function","lambda","A"],["What is the type of [1, 2, 3]?","list","tuple","dict","set","A"],["Which of these is immutable?","list","dict","tuple","set","C"],["What does len('Python') return?","5","6","7","Error","B"],["Which symbol starts a single-line comment?","//","#","/*","--","B"],["What is 2 ** 3?","6","8","9","5","B"],["Which method adds an item to the end of a list?","add()","push()","append()","insert()","C"],["What does 'a' * 3 produce?","aaa","a3","Error","3a","A"],["Which keyword handles exceptions?","catch","except","error","handle","B"],["How do you import the math module?","include math","import math","using math","require math","B"]];
  const q = await addDoc(collection(db,"quizzes"),{title:"Python Basics",description:"10 fundamentals questions",duration:10,passPercent:40,published:true,createdAt:serverTimestamp()});
  const b = writeBatch(db);
  Q.forEach(r => b.set(doc(collection(db,"questions")),{quizId:q.id,question:r[0],optionA:r[1],optionB:r[2],optionC:r[3],optionD:r[4],correctAnswer:r[5],marks:1}));
  await b.commit(); toast("Sample Python quiz added and published"); views.quizzes();
}

main.addEventListener("click", async e => {
  const b = e.target.closest("[data-a]"); if (!b) return;
  const {a,id} = b.dataset;
  try {
    if (a==="pub") { const q = quizzes.find(x=>x.id===id); await updateDoc(doc(db,"quizzes",id),{published:!q.published}); toast(q.published?"Unpublished":"Published"); views.quizzes(); }
    if (a==="qs") { curQuiz = id; editId = null; show("questions"); }
    if (a==="delq" && confirm("Delete this quiz and its questions?")) {
      const qs = await getDocs(query(collection(db,"questions"),where("quizId","==",id)));
      const bt = writeBatch(db); qs.forEach(d=>bt.delete(d.ref)); bt.delete(doc(db,"quizzes",id)); await bt.commit(); toast("Quiz deleted"); views.quizzes();
    }
    if (a==="eq") { editId = id; views.questions(); scrollTo({top:0,behavior:"smooth"}); }
    if (a==="cancel") { editId = null; views.questions(); }
    if (a==="dq" && confirm("Delete this question?")) { await deleteDoc(doc(db,"questions",id)); toast("Question deleted"); views.questions(); }
    if (a==="ds" && confirm("Remove this student?")) { await deleteDoc(doc(db,"users",id)); toast("Student removed"); views.students(); }
  } catch(err) { toast(err.message,"danger"); }
});
const show = k => { setActive(k); main.innerHTML = '<div class="text-center p-5"><div class="spinner-border"></div></div>'; views[k]().then(()=>main.classList.add("view")).catch(e=>toast(e.message,"danger")); };
document.querySelectorAll(".nav-btn[data-s]").forEach(b => b.onclick = () => show(b.dataset.s));
show("quizzes");
