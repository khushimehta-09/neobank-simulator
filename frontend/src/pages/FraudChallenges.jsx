import React,{useMemo,useState}from'react';
import{ShieldAlert,Trophy,RefreshCw}from'lucide-react';
const cases=[
 ['OTP fraud call','Caller says your account will close unless you share OTP','Hang up and call official bank number'],
 ['QR receive scam','Buyer sends QR and asks you to enter PIN to receive money','Do not scan; ask them to pay your UPI/account'],
 ['Fake KYC link','SMS asks KYC update through short link','Open official app/website only'],
 ['Emergency friend scam','Friend asks money from unknown new number','Verify by calling known number'],
 ['Prize fee scam','Message says you won phone but must pay delivery fee','Report/delete; do not pay'],
 ['Job fee scam','Company asks registration fee before joining','Reject; real employers do not charge'],
 ['Public WiFi banking','You need transfer while on free WiFi','Use mobile data or verified network'],
 ['Deepfake request','Boss video asks urgent transfer','Confirm through separate known channel'],
 ['Investment promise','Plan guarantees double money quickly','Avoid guaranteed return claims'],
 ['Support DM','Fake bank support asks account details','Use official support channel']
];
const bad=['Share OTP','Pay immediately','Trust screenshot','Forward to friends','Enter PIN','Use the random link','Ignore verification','Send half amount','Use public WiFi','Ask stranger'];
const sh=a=>[...a].sort(()=>Math.random()-0.5);
function build(n=4){const run=Number(localStorage.getItem('challengeRun')||0)+1;localStorage.setItem('challengeRun',String(run));return sh(cases).slice(0,n).map((c,i)=>{const opts=sh([c[2],...sh(bad).slice(0,3)]);return{id:`C-${run}-${i}-${Date.now()}`,q:`${c[0]} #${run}-${i+1}: ${c[1]}. What should you do?`,opts,ans:opts.indexOf(c[2])}})}
export default function FraudChallenges(){const qs=useMemo(()=>build(4),[]);const[i,setI]=useState(0),[sel,setSel]=useState(null),[score,setScore]=useState(0),[done,setDone]=useState(false);const q=qs[i];const sub=()=>{if(sel===null)return;const ns=score+(sel===q.ans?1:0);if(i===qs.length-1){setScore(ns);setDone(true);if(ns===qs.length)alert('Fraud Guard badge unlocked!')}else{setScore(ns);setI(i+1);setSel(null)}};return <div className="max-w-3xl mx-auto space-y-6"><div><h1 className="text-3xl font-black flex gap-3"><ShieldAlert className="text-primary"/>Challenges</h1><p className="text-text-muted text-sm">Each challenge run generates fresh case wording with a unique number.</p></div>{done?<div className="glass-panel p-8 rounded-3xl text-center"><Trophy className="mx-auto text-warning" size={60}/><h2 className="text-2xl font-black mt-3">Complete</h2><p>Score: {score}/{qs.length}</p><button onClick={()=>location.reload()} className="btn-primary px-5 py-3 rounded-xl mt-5 inline-flex gap-2"><RefreshCw/>Play Again</button></div>:<div className="glass-panel p-6 rounded-3xl"><p className="text-primary font-bold text-sm">Challenge {i+1}/{qs.length}</p><h2 className="text-2xl font-black my-4">{q.q}</h2>{q.opts.map((o,idx)=><button key={idx} onClick={()=>setSel(idx)} className={`block w-full p-4 mb-3 rounded-2xl border text-left ${sel===idx?'bg-primary/20 border-primary':'bg-white/5 border-white/10'}`}>{o}</button>)}<button onClick={sub} className="btn-primary w-full py-3 rounded-2xl font-black">Submit</button></div>}</div>}
