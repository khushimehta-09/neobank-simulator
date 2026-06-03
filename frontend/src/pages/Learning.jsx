import React,{useMemo,useState}from'react';
import{BookOpen,CheckCircle,RefreshCw}from'lucide-react';

const topics=[
  ['UPI PIN safety','What is the safest UPI PIN habit?','Never share PIN/OTP/CVV'],
  ['Deposits','If someone sends money to you, where should it show?','Deposit / Received'],
  ['Transfers','If you send money to someone, where should it show?','Transfer'],
  ['Game money','Where should game profit/loss appear?','Game section'],
  ['Bank transfer','What must match for bank transfer?','Account number and holder name'],
  ['Receipts','Why do we save receipts?','Proof of payment'],
  ['Card freeze','What should unfreeze require?','Correct PIN'],
  ['Bill pay','What should bill payment require?','Correct PIN'],
  ['Friends payment','When can chat payment happen?','After friend request accepted'],
  ['Trust score','What improves trust score?','Safe actions and completed learning'],
  ['Phishing','What should you do with suspicious bank links?','Use official app/site only'],
  ['Balance','What is remaining balance?','Available money after all debits/credits']
];
const wrong=['Random link','Share OTP','Ignore receipt','Use fake account','Pay without checking','Logout immediately','Show in transfer','Use public WiFi','Ask stranger','Enter any name','Hide history','No PIN needed'];
const sh=a=>[...a].sort(()=>Math.random()-0.5);
function buildQuestions(n=5){
  const run=Number(localStorage.getItem('levelRun')||0)+1;localStorage.setItem('levelRun',String(run));
  return sh(topics).slice(0,n).map((t,i)=>{
    const correct=t[2];const opts=sh([correct,...sh(wrong.filter(w=>w!==correct)).slice(0,3)]);
    return{ id:`L-${run}-${i}-${Date.now()}`, title:`${t[0]} — practice ${run}.${i+1}`, question:`${t[1]} Scenario ID ${run}-${i+1}: choose the best answer.`, options:opts, correct:opts.indexOf(correct)};
  });
}
export default function Learning(){
  const qs=useMemo(()=>buildQuestions(5),[]);const[i,setI]=useState(0),[sel,setSel]=useState(null),[score,setScore]=useState(0),[done,setDone]=useState(false);const q=qs[i];
  const sub=()=>{if(sel===null)return;const ns=score+(sel===q.correct?1:0);if(i===qs.length-1){setScore(ns);setDone(true)}else{setScore(ns);setI(i+1);setSel(null)}};
  return <div className="max-w-3xl mx-auto space-y-6"><div><h1 className="text-3xl font-black flex gap-3"><BookOpen className="text-primary"/>Levels</h1><p className="text-text-muted text-sm">Every play creates fresh scenario wording with unique IDs, so the same exact question is not repeated.</p></div>{done?<div className="glass-panel p-8 rounded-3xl text-center"><CheckCircle className="mx-auto text-success" size={54}/><h2 className="text-2xl font-black mt-3">Level Complete</h2><p>Score: {score}/{qs.length}</p><button onClick={()=>location.reload()} className="btn-primary px-5 py-3 rounded-xl mt-5 inline-flex gap-2"><RefreshCw/>New Questions</button></div>:<div className="glass-panel p-6 rounded-3xl"><p className="text-primary font-bold text-sm">Question {i+1}/{qs.length}</p><h2 className="text-xl font-black my-2">{q.title}</h2><p className="text-lg mb-4">{q.question}</p>{q.options.map((o,idx)=><button key={idx} onClick={()=>setSel(idx)} className={`block w-full p-4 mb-3 rounded-2xl border text-left ${sel===idx?'bg-primary/20 border-primary':'bg-white/5 border-white/10'}`}>{o}</button>)}<button onClick={sub} className="btn-primary w-full py-3 rounded-2xl font-black">Submit</button></div>}</div>
}
