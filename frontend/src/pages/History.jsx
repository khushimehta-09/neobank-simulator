import React,{useState,useEffect}from'react';
import{RefreshCw,ArrowDownRight,CreditCard,Zap,Gamepad2}from'lucide-react';
import api from'../services/api';
import{formatDateTime}from'../utils/time';

const fmt=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const tabs=['all','transfer','deposit','bill_payment','game'];
const tabLabel=f=>f.replace('_',' ').toUpperCase();

export default function History(){
  const[transactions,setTransactions]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all');

  useEffect(()=>{(async()=>{setLoading(true);try{const res=await api.get(`/transactions/history?type=${filter}`);setTransactions(res.data.transactions||[])}catch(e){console.error(e)}finally{setLoading(false)}})()},[filter]);

  const display=tx=>{
    const t=(tx.type||'').toLowerCase();
    const dir=tx.direction;
    if(t==='game_profit')return{sign:'+',label:'Game Profit',cls:'text-emerald-400',bg:'bg-emerald-400/10',icon:<Gamepad2/>};
    if(t==='game_loss')return{sign:'-',label:'Game Loss',cls:'text-amber-400',bg:'bg-amber-400/10',icon:<Gamepad2/>};
    if(t==='bill_payment')return{sign:'-',label:'Bill Payment',cls:'text-red-400',bg:'bg-red-400/10',icon:<Zap/>};
    if(t==='deposit'||dir==='credit')return{sign:'+',label:'Deposit / Received',cls:'text-emerald-400',bg:'bg-emerald-400/10',icon:<ArrowDownRight/>};
    return{sign:'-',label:t==='bank_transfer'?'Bank Transfer':'Transfer',cls:'text-red-400',bg:'bg-red-400/10',icon:<CreditCard/>};
  };

  return <div className="max-w-5xl mx-auto space-y-6">
    <header className="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black">Transaction History</h1>
        <p className="text-text-muted text-sm">All money movement including deposits, transfers, bills and game profit/loss.</p>
      </div>
      <div className="flex gap-2 bg-surface p-1.5 rounded-xl border border-white/10 overflow-x-auto md:ml-auto">
        {tabs.map(f=><button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${filter===f?'bg-primary text-white':'text-text-muted hover:bg-white/5'}`}>{tabLabel(f)}</button>)}
      </div>
    </header>
    {loading?<div className="flex justify-center py-20"><RefreshCw className="animate-spin text-primary" size={32}/></div>:<div className="space-y-3">{transactions.length===0?<div className="glass-panel p-8 rounded-2xl text-center text-text-muted">No transactions found.</div>:transactions.map(tx=>{const d=display(tx);return <div key={tx.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl ${d.bg} ${d.cls} flex items-center justify-center`}>{d.icon}</div><div className="flex-1 min-w-0"><p className="font-black">{d.label}</p><p className="text-xs text-text-muted truncate">{tx.description||tx.referenceId}</p><p className="text-[10px] text-text-muted/60">{formatDateTime(tx.timestamp)}</p></div><div className={`text-right font-black ${d.cls}`}>{d.sign}{fmt(tx.amount)}<p className="text-[10px] text-text-muted font-normal">{tx.referenceId}</p></div></div>})}</div>}
  </div>
}
