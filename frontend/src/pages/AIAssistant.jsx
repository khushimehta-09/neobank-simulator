import React,{useMemo,useState}from'react';
import{Bot,Send,Sparkles,ShieldCheck,Landmark}from'lucide-react';

const knowledge=[
  {keys:['project','neosim','how work','simulator'],answer:'NeoSim is an educational banking simulator. It lets users practice bank transfers, chat payments, bill payments, receipts, transaction history, scam detection, levels, challenges, story mode, trust score and achievements using virtual money only.'},
  {keys:['real bank','difference','actual bank'],answer:'A real bank holds real customer money, follows banking regulations, connects to payment networks, performs KYC/AML checks, protects deposits, and settles transactions through real financial rails. NeoSim is only a sandbox: balances are virtual, transfers happen inside the app database, and no real bank account is affected.'},
  {keys:['digital banking','real digital','upi','online banking'],answer:'Real digital banking uses regulated payment systems such as UPI/IMPS/NEFT/card networks, bank-grade authentication, audit logs, fraud monitoring and settlement. NeoSim copies the learning flow but keeps it inside the project so students can learn safely without real money risk.'},
  {keys:['transfer','send money','bank transfer'],answer:'In this project, outgoing bank transfers and outgoing chat payments appear under Transfer. Incoming bank transfers and incoming chat payments appear under Deposit. Game/story/learning money stays under Game.'},
  {keys:['deposit','received','incoming'],answer:'Deposit means real incoming virtual money from another user through bank account transfer or chat payment. Game rewards and learning rewards are intentionally kept in the Game tab, not Deposit.'},
  {keys:['game','profit','loss','story','level','challenge','scam'],answer:'Game includes all money changes caused by learning activities, levels, challenges, story mode, mini jobs and scam detective. Both profit and loss remain in Game so they do not mix with real transfer/deposit/bill history.'},
  {keys:['bill','payment','bills'],answer:'Bill Payment is for paying generated utility bills such as internet, mobile, electricity or water bills. These are virtual bill payments for practice.'},
  {keys:['safe','scam','fraud','phishing','otp','pin'],answer:'Never share OTP, PIN, CVV or password. Do not click random bank links. Verify payment requests through a separate trusted channel. To receive money, you should not need to enter your PIN.'},
  {keys:['balance','available balance','fast'],answer:'Available Balance is the current virtual account balance. After money actions, the app refreshes it quickly from the response or from the authenticated user endpoint.'},
  {keys:['withdraw','withdrawal'],answer:'Withdraw has been removed from this project as requested. The simulator now focuses on transfer, deposit, bill payment and game-related money movement.'}
];

const suggestions=['What is NeoSim?','Real bank vs this bank','Digital banking vs this project','Where does chat payment show?','Explain scam safety','Why game money is separate'];

function answerFor(text){
  const q=text.toLowerCase();
  const hit=knowledge.find(k=>k.keys.some(x=>q.includes(x)));
  if(hit)return hit.answer;
  return 'This bot answers project and banking-learning questions. You can ask about NeoSim features, transaction tabs, real bank vs simulator differences, digital banking, transfers, deposits, bills, game money, balance, receipts and scam safety.';
}

export default function AIAssistant(){
  const starter=useMemo(()=>[{role:'bot',text:'Hi! Ask me anything about this NeoSim project, real banking vs simulated banking, digital banking, transactions, bills, transfers or scam safety.'}],[]);
  const[messages,setMessages]=useState(starter),[input,setInput]=useState('');
  const send=(text=input)=>{const val=String(text||'').trim();if(!val)return;setMessages(prev=>[...prev,{role:'user',text:val},{role:'bot',text:answerFor(val)}]);setInput('')};
  return <div className="max-w-4xl mx-auto space-y-6">
    <div><h1 className="text-3xl font-black flex gap-3"><Bot className="text-primary"/>AI Banking Bot</h1><p className="text-text-muted text-sm mt-1">Project-safe assistant for NeoSim and digital banking concepts.</p></div>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="glass-panel p-4 rounded-2xl border border-white/5"><Sparkles className="text-primary mb-2"/><p className="font-black">Project Help</p><p className="text-xs text-text-muted">Ask how pages, tabs and money flows work.</p></div>
      <div className="glass-panel p-4 rounded-2xl border border-white/5"><Landmark className="text-success mb-2"/><p className="font-black">Real Bank Difference</p><p className="text-xs text-text-muted">Learn what is simulated vs real banking.</p></div>
      <div className="glass-panel p-4 rounded-2xl border border-white/5"><ShieldCheck className="text-warning mb-2"/><p className="font-black">Safety Learning</p><p className="text-xs text-text-muted">Ask about scams, PIN, OTP and safe payments.</p></div>
    </div>
    <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
      <div className="h-[440px] overflow-y-auto p-5 space-y-4 hide-scrollbar">
        {messages.map((m,i)=><div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${m.role==='user'?'bg-primary/20 border border-primary/20':'bg-white/5 border border-white/10'}`}>{m.text}</div></div>)}
      </div>
      <div className="border-t border-white/5 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">{suggestions.map(s=><button key={s} onClick={()=>send(s)} className="text-xs px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted">{s}</button>)}</div>
        <div className="flex gap-3"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about NeoSim or banking..." className="input-field flex-1"/><button onClick={()=>send()} className="px-5 py-3 bg-primary text-white rounded-2xl font-bold"><Send size={18}/></button></div>
      </div>
    </div>
  </div>
}
