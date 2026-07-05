import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, API } from "../context/AuthContext";
import { PieChart,Pie,Cell,LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,BarChart,Bar,Legend } from "recharts";

// ── Constants ─────────────────────────────────────────────────────
const COLORS = ["#6366f1","#22c55e","#f97316","#ef4444","#38bdf8","#a855f7","#eab308","#14b8a6","#f43f5e","#84cc16"];
const CATEGORIES = ["Rent","Food","Transport","EMI","Entertainment","Utilities","Healthcare","Education","Shopping","Other"];
const ASSET_TYPES = ["Cash & Bank","Real Estate","Investments","Vehicle","Gold","Other"];
const fmtINR = v => v!=null ? "₹"+Number(v).toLocaleString("en-IN") : "₹0";
const getMonth = () => new Date().toISOString().slice(0,7);
const greet = () => { const h=new Date().getHours(); return h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening"; };

const INDIA_STATES = {
  "Andhra Pradesh":["Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Kadapa","Tirupati","Anantapur","Rajahmundry","Kakinada"],
  "Telangana":["Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Mahbubnagar","Nalgonda","Adilabad","Suryapet","Siddipet"],
  "Karnataka":["Bangalore","Mysore","Hubli","Mangalore","Belgaum","Gulbarga","Davanagere","Shimoga","Tumkur","Udupi"],
  "Tamil Nadu":["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Tiruppur","Vellore","Erode","Kanchipuram"],
  "Maharashtra":["Mumbai","Pune","Nagpur","Nashik","Aurangabad","Solapur","Amravati","Kolhapur","Latur","Ahmednagar"],
  "Gujarat":["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Gandhinagar","Anand","Bharuch","Navsari"],
  "Rajasthan":["Jaipur","Jodhpur","Kota","Bikaner","Ajmer","Udaipur","Bhilwara","Alwar","Bharatpur","Sikar"],
  "Uttar Pradesh":["Lucknow","Kanpur","Agra","Varanasi","Meerut","Allahabad","Ghaziabad","Noida","Bareilly","Gorakhpur"],
  "West Bengal":["Kolkata","Howrah","Durgapur","Asansol","Siliguri","Bardhaman","Kharagpur","Jalpaiguri","Midnapore","Bankura"],
  "Delhi":["New Delhi","North Delhi","South Delhi","East Delhi","West Delhi","Central Delhi","Gurgaon","Noida","Dwarka","Rohini"],
  "Kerala":["Kochi","Thiruvananthapuram","Kozhikode","Thrissur","Kollam","Palakkad","Malappuram","Kannur","Ernakulam","Kottayam"],
  "Madhya Pradesh":["Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar","Rewa","Satna","Ratlam","Dewas"],
  "Punjab":["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Mohali","Pathankot","Hoshiarpur","Moga","Sangrur"],
  "Haryana":["Faridabad","Gurgaon","Panipat","Ambala","Rohtak","Hisar","Karnal","Sonipat","Panchkula","Bhiwani"],
  "Bihar":["Patna","Gaya","Bhagalpur","Muzaffarpur","Purnia","Darbhanga","Arrah","Begusarai","Hajipur","Chapra"],
};

// ── Reusable UI ───────────────────────────────────────────────────
const Card = ({children,style={}}) => <div style={{background:"#fff",borderRadius:16,padding:"1.25rem",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",...style}}>{children}</div>;
const Btn = ({children,onClick,color="#6366f1",style={}}) => <button onClick={onClick} style={{background:color,color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",...style}}>{children}</button>;
const OutlineBtn = ({children,onClick,style={}}) => <button onClick={onClick} style={{background:"transparent",color:"#6366f1",border:"1.5px solid #6366f1",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",...style}}>{children}</button>;

const Inp = ({label,value,onChange,type="text",placeholder,min,max}) => (
  <div style={{marginBottom:"0.9rem"}}>
    {label && <label style={{fontSize:13,fontWeight:500,color:"#374151",display:"block",marginBottom:5}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} max={max}
      style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",color:"#1e293b"}}
      onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
  </div>
);

const Sel = ({label,value,onChange,options,placeholder}) => (
  <div style={{marginBottom:"0.9rem"}}>
    {label && <label style={{fontSize:13,fontWeight:500,color:"#374151",display:"block",marginBottom:5}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",background:"#fff",color:"#1e293b"}}
      onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}>
      <option value="">{placeholder||"Select..."}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Toggle = ({options,value,onChange,label}) => (
  <div style={{marginBottom:"0.9rem"}}>
    {label && <label style={{fontSize:13,fontWeight:500,color:"#374151",display:"block",marginBottom:5}}>{label}</label>}
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {options.map(o=>(
        <button key={o} onClick={()=>onChange(o)} style={{padding:"7px 13px",borderRadius:8,border:`1.5px solid ${value===o?"#6366f1":"#e2e8f0"}`,background:value===o?"#eef2ff":"#fff",color:value===o?"#6366f1":"#64748b",fontSize:12,fontWeight:value===o?600:400,cursor:"pointer",fontFamily:"inherit"}}>
          {o}
        </button>
      ))}
    </div>
  </div>
);

const StatCard = ({icon,label,value,color="#6366f1",sub,style={}}) => (
  <Card style={{textAlign:"center",...style}}>
    <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
    <div style={{fontSize:20,fontWeight:800,color}}>{value}</div>
    <div style={{fontSize:12,fontWeight:600,color:"#1e293b",marginTop:2}}>{label}</div>
    {sub && <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{sub}</div>}
  </Card>
);

const SectionHeader = ({icon,title,subtitle}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"1.25rem"}}>
    <span style={{fontSize:26}}>{icon}</span>
    <div>
      <div style={{fontSize:18,fontWeight:700,color:"#1e293b"}}>{title}</div>
      <div style={{fontSize:13,color:"#64748b"}}>{subtitle}</div>
    </div>
  </div>
);

// ── HOME DASHBOARD ────────────────────────────────────────────────
function Home({dash,onNav}) {
  const {user} = useAuth();
  const health = dash?.financial_health_score || 0;
  const hColor = health>=70?"#22c55e":health>=40?"#f97316":"#ef4444";
  const hLabel = health>=70?"Good":health>=40?"Average":"Needs Attention";

  const quickCards = [
    {icon:"💰",label:"Monthly Income",value:fmtINR(dash?.income),color:"#22c55e",sub:"This month",page:"expenses"},
    {icon:"💸",label:"Total Expenses",value:fmtINR(dash?.total_expenses),color:"#ef4444",sub:"This month",page:"expenses"},
    {icon:"💵",label:"Disposable",value:fmtINR(dash?.disposable_income),color:"#6366f1",sub:"Available",page:"expenses"},
    {icon:"📊",label:"Net Worth",value:fmtINR(dash?.net_worth),color:"#a855f7",sub:"Assets − Liabilities",page:"networth"},
    {icon:"🎯",label:"Goals",value:dash?.goals_count||0,color:"#f97316",sub:"Active",page:"goals"},
    {icon:"🏦",label:"Active Loans",value:dash?.active_loans||0,color:"#38bdf8",sub:"Tracking",page:"loantrack"},
  ];

  const features = [
    {section:"MANAGE & PLAN",color:"#6366f1",items:[
      {icon:"📈",label:"Monthly Expenses",page:"expenses"},
      {icon:"📊",label:"Budget Planner",page:"budget"},
      {icon:"💹",label:"Investments",page:"investment"},
      {icon:"🎯",label:"My Goals",page:"goals"},
      {icon:"💡",label:"Financial Tips",page:"tips"},
      {icon:"🤖",label:"AI Assistant",page:"ai"},
    ]},
    {section:"LOANS & CREDIT",color:"#ef4444",items:[
      {icon:"⚠️",label:"Loan Risk",page:"loan"},
      {icon:"🏠",label:"Property Check",page:"property"},
      {icon:"📉",label:"Credit Score",page:"credit"},
      {icon:"🔢",label:"EMI Calculator",page:"emi"},
      {icon:"💲",label:"Interest Calc",page:"interest"},
      {icon:"🏦",label:"Loan Tracker",page:"loantrack"},
    ]},
    {section:"ANALYZE & PROTECT",color:"#22c55e",items:[
      {icon:"🔍",label:"Spending Insights",page:"insights"},
      {icon:"💎",label:"Net Worth",page:"networth"},
      {icon:"🚨",label:"Overspending",page:"alert"},
      {icon:"🛡️",label:"Emergency Fund",page:"emergency"},
      {icon:"😰",label:"Stress Check",page:"stress"},
      {icon:"📑",label:"Reports",page:"reports"},
    ]},
    {section:"MORE TOOLS",color:"#a855f7",items:[
      {icon:"🧾",label:"Bills & Payments",page:"bills"},
    ]},
  ];

  return (
    <div>
      {/* Greeting Banner */}
      <div style={{background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:20,padding:"1.5rem",marginBottom:"1.25rem",color:"#fff",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:-20,top:-20,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/>
        <div style={{fontSize:13,opacity:0.8,marginBottom:4}}>{greet()},</div>
        <div style={{fontSize:22,fontWeight:800}}>{user?.name} 👋</div>
        <div style={{fontSize:12,opacity:0.75,marginTop:4}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        {dash?.bills_overdue>0 && <div style={{marginTop:10,background:"rgba(239,68,68,0.3)",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600}}>⚠️ {dash.bills_overdue} bill(s) overdue!</div>}
        {dash?.bills_due_soon>0 && dash?.bills_overdue===0 && <div style={{marginTop:10,background:"rgba(249,115,22,0.3)",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600}}>🔔 {dash.bills_due_soon} bill(s) due within 7 days</div>}
      </div>

      {/* Health Score */}
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",letterSpacing:"0.06em",marginBottom:12}}>FINANCIAL HEALTH OVERVIEW</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div style={{textAlign:"center",padding:"1rem",background:"#f8fafc",borderRadius:12}}>
            <div style={{fontSize:34,fontWeight:800,color:hColor}}>{health}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Health Score</div>
            <div style={{fontSize:12,color:hColor,fontWeight:600,marginTop:2}}>{hLabel}</div>
          </div>
          <div style={{textAlign:"center",padding:"1rem",background:"#f8fafc",borderRadius:12}}>
            <div style={{fontSize:34,fontWeight:800,color:"#6366f1"}}>{dash?.savings_rate||0}%</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Savings Rate</div>
            <div style={{fontSize:12,color:dash?.savings_rate>=20?"#22c55e":"#f97316",fontWeight:600,marginTop:2}}>{dash?.savings_rate>=20?"On Track":"Improve"}</div>
          </div>
          <div style={{textAlign:"center",padding:"1rem",background:"#f8fafc",borderRadius:12,cursor:"pointer"}} onClick={()=>onNav("networth")}>
            <div style={{fontSize:24,fontWeight:800,color:"#a855f7"}}>{fmtINR(dash?.net_worth)}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Net Worth</div>
            <div style={{fontSize:12,color:"#a855f7",fontWeight:600,marginTop:2}}>Tap to view</div>
          </div>
        </div>
      </Card>

      {/* Quick Cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
        {quickCards.map(c=>(
          <div key={c.label} onClick={()=>onNav(c.page)} style={{background:"#fff",borderRadius:14,padding:"1rem",cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"1.5px solid transparent",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=c.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
            <div style={{fontSize:22,marginBottom:6}}>{c.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:c.color}}>{c.value}</div>
            <div style={{fontSize:12,fontWeight:600,color:"#1e293b",marginTop:2}}>{c.label}</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* All Features */}
      <Card>
        <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",letterSpacing:"0.06em",marginBottom:16}}>ALL FEATURES</div>
        {features.map(sec=>(
          <div key={sec.section} style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:sec.color,letterSpacing:"0.08em",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:3,height:12,background:sec.color,borderRadius:2}}/>
              {sec.section}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {sec.items.map(item=>(
                <div key={item.label} onClick={()=>onNav(item.page)} style={{background:"#f8fafc",borderRadius:12,padding:"12px 6px",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#eef2ff";e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#f8fafc";e.currentTarget.style.transform="translateY(0)";}}>
                  <div style={{fontSize:22,marginBottom:5}}>{item.icon}</div>
                  <div style={{fontSize:11,fontWeight:600,color:"#374151",lineHeight:1.3}}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── EXPENSE TRACKER ───────────────────────────────────────────────
function ExpensePage({authHeaders}) {
  const [month,setMonth] = useState(getMonth());
  const [summary,setSummary] = useState(null);
  const [expenses,setExpenses] = useState([]);
  const [form,setForm] = useState({category:"Food",amount:"",note:""});
  const [income,setIncome] = useState("");

  const load = async () => {
    try {
      const [s,e] = await Promise.all([
        axios.get(`${API}/summary/${month}`,{headers:authHeaders()}),
        axios.get(`${API}/expenses/${month}`,{headers:authHeaders()}),
      ]);
      setSummary(s.data); setExpenses(e.data.expenses);
      setIncome(s.data.income||"");
    } catch{}
  };
  useEffect(()=>{load();},[month]);

  const saveIncome = async () => { await axios.post(`${API}/income`,{month,income:Number(income)},{headers:authHeaders()}); load(); };
  const addExp = async () => {
    if(!form.amount) return;
    await axios.post(`${API}/expenses/add`,{...form,amount:Number(form.amount),month},{headers:authHeaders()});
    setForm(f=>({...f,amount:"",note:""})); load();
  };
  const delExp = async id => { await axios.delete(`${API}/expenses/${id}`,{headers:authHeaders()}); load(); };

  const pieData = summary?.category_breakdown ? Object.entries(summary.category_breakdown).map(([name,value])=>({name,value})) : [];

  return (
    <div className="fade-in">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <SectionHeader icon="📈" title="Monthly Expenses" subtitle="Track income and spending" />
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"inherit"}} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
        <StatCard icon="💰" label="Income" value={fmtINR(summary?.income)} color="#22c55e" />
        <StatCard icon="💸" label="Expenses" value={fmtINR(summary?.total_expenses)} color="#ef4444" />
        <StatCard icon="💵" label="Disposable" value={fmtINR(summary?.disposable_income)} color="#6366f1" />
      </div>

      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>Set Monthly Income</div>
        <div style={{display:"flex",gap:8}}>
          <input type="number" placeholder="Enter income (₹)" value={income} onChange={e=>setIncome(e.target.value)} style={{flex:1,padding:"10px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit"}} />
          <Btn onClick={saveIncome}>Save</Btn>
        </div>
      </Card>

      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Add Expense</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Sel label="Category" value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} options={CATEGORIES} />
          <Inp label="Amount (₹)" type="number" value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder="e.g. 2500" />
        </div>
        <Inp label="Note (optional)" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} placeholder="e.g. Monthly rent" />
        <Btn onClick={addExp} style={{width:"100%"}}>+ Add Expense</Btn>
      </Card>

      {pieData.length>0 && (
        <Card style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Spending Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie><Tooltip formatter={v=>fmtINR(v)}/></PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Expense List ({expenses.length})</div>
        {expenses.length===0 ? <div style={{textAlign:"center",color:"#94a3b8",padding:"1.5rem",fontSize:14}}>No expenses this month</div> :
        expenses.map(exp=>(
          <div key={exp.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{exp.category}</div>
              {exp.note && <div style={{fontSize:12,color:"#94a3b8"}}>{exp.note}</div>}
            </div>
            <div style={{fontWeight:700,color:"#ef4444",marginRight:12}}>{fmtINR(exp.amount)}</div>
            <button onClick={()=>delExp(exp.id)} style={{background:"#fef2f2",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#ef4444",fontSize:13}}>✕</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── BUDGET PLANNER ────────────────────────────────────────────────
function BudgetPage({authHeaders}) {
  const [month,setMonth] = useState(getMonth());
  const [budgets,setBudgets] = useState([]);
  const [cat,setCat] = useState("Food");
  const [amt,setAmt] = useState("");

  const load = async () => {
    try { const r = await axios.get(`${API}/budget/${month}`,{headers:authHeaders()}); setBudgets(r.data.budgets); } catch{}
  };
  useEffect(()=>{load();},[month]);

  const save = async () => {
    if(!amt) return;
    await axios.post(`${API}/budget`,{category:cat,month,budget_amount:Number(amt)},{headers:authHeaders()});
    setAmt(""); load();
  };

  return (
    <div className="fade-in">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <SectionHeader icon="📊" title="Budget Planner" subtitle="Set and track category budgets" />
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"inherit"}} />
      </div>

      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Set Budget Limit</div>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <div style={{flex:1}}><Sel label="Category" value={cat} onChange={setCat} options={CATEGORIES}/></div>
          <div style={{flex:1}}><Inp label="Budget (₹)" type="number" value={amt} onChange={setAmt} placeholder="e.g. 5000"/></div>
          <Btn onClick={save} style={{marginBottom:"0.9rem"}}>Set</Btn>
        </div>
      </Card>

      {budgets.length===0 ? (
        <Card><div style={{textAlign:"center",color:"#94a3b8",padding:"2rem",fontSize:14}}>No budgets set yet. Add a budget above!</div></Card>
      ) : budgets.map(b=>{
        const pct = b.pct_used;
        const color = pct>=100?"#ef4444":pct>=80?"#f97316":"#22c55e";
        return (
          <Card key={b.category} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:14,fontWeight:600}}>{b.category}</div>
              <div style={{fontSize:13,fontWeight:700,color}}>{pct}% used</div>
            </div>
            <div style={{height:10,background:"#f1f5f9",borderRadius:99,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:color,borderRadius:99,transition:"width 0.8s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b"}}>
              <span>Spent: <strong style={{color:"#ef4444"}}>{fmtINR(b.spent)}</strong></span>
              <span>Budget: <strong style={{color:"#6366f1"}}>{fmtINR(b.budget)}</strong></span>
              <span>Left: <strong style={{color:"#22c55e"}}>{fmtINR(b.remaining)}</strong></span>
            </div>
            {pct>=80 && <div style={{marginTop:8,fontSize:12,color:pct>=100?"#ef4444":"#f97316",fontWeight:600,background:pct>=100?"#fef2f2":"#fff7ed",borderRadius:8,padding:"6px 10px"}}>{pct>=100?"❌ Budget exceeded!":"⚠️ Approaching budget limit!"}</div>}
          </Card>
        );
      })}
    </div>
  );
}

// ── SPENDING INSIGHTS ─────────────────────────────────────────────
function InsightsPage({authHeaders}) {
  const [month,setMonth] = useState(getMonth());
  const [data,setData] = useState(null);

  useEffect(()=>{
    axios.get(`${API}/insights/${month}`,{headers:authHeaders()}).then(r=>setData(r.data)).catch(()=>{});
  },[month]);

  const chartData = data?.comparison?.map(c=>({name:c.category,Current:c.current,Previous:c.previous})) || [];

  return (
    <div className="fade-in">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"}}>
        <SectionHeader icon="🔍" title="Spending Insights" subtitle="Month-over-month comparison" />
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"inherit"}} />
      </div>

      {chartData.length>0 && (
        <Card style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>This Month vs Last Month</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`}/>
              <Tooltip formatter={v=>fmtINR(v)}/>
              <Legend/>
              <Bar dataKey="Current" fill="#6366f1" radius={[4,4,0,0]}/>
              <Bar dataKey="Previous" fill="#e2e8f0" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {data?.comparison?.map(c=>(
        <Card key={c.category} style={{marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600}}>{c.category}</div>
            <div style={{fontSize:12,color:"#64748b"}}>Last month: {fmtINR(c.previous)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#1e293b"}}>{fmtINR(c.current)}</div>
            {c.previous>0 && <div style={{fontSize:12,fontWeight:600,color:c.change_pct>0?"#ef4444":"#22c55e"}}>
              {c.change_pct>0?"▲":"▼"} {Math.abs(c.change_pct)}% vs last month
            </div>}
          </div>
        </Card>
      ))}

      {(!data||data.comparison.length===0) && <Card><div style={{textAlign:"center",color:"#94a3b8",padding:"2rem",fontSize:14}}>Add expenses to see insights</div></Card>}
    </div>
  );
}

// ── LOAN RISK ─────────────────────────────────────────────────────
function LoanPage({authHeaders}) {
  const [form,setForm] = useState({age:"",income:"",loan_amount:"",credit_score:650,years_experience:"",gender:"Male",education:"Bachelors",employment_type:"Salaried"});
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await axios.post(`${API}/predict`,{age:Number(form.age),income:Number(form.income)/83,loan_amount:Number(form.loan_amount)/83,credit_score:Number(form.credit_score),years_experience:Number(form.years_experience),gender:form.gender,education:form.education,employment_type:form.employment_type},{headers:authHeaders()});
      setResult(res.data);
    } catch { setError("Check all fields and try again."); }
    setLoading(false);
  };

  const rBg = result ? (result.risk_label==="Low Risk"?"#f0fdf4":result.risk_label==="Medium Risk"?"#fff7ed":"#fef2f2") : "";
  const rCol = result ? (result.risk_label==="Low Risk"?"#22c55e":result.risk_label==="Medium Risk"?"#f97316":"#ef4444") : "";
  const rBdr = result ? (result.risk_label==="Low Risk"?"#86efac":result.risk_label==="Medium Risk"?"#fdba74":"#fca5a5") : "";

  return (
    <div className="fade-in">
      <SectionHeader icon="⚠️" title="Loan Risk Prediction" subtitle="AI-powered credit risk assessment"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#6366f1",letterSpacing:"0.06em",marginBottom:12}}>PERSONAL INFORMATION</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Age" type="number" value={form.age} onChange={v=>set("age",v)} placeholder="18–69"/>
          <Toggle label="Gender" options={["Male","Female"]} value={form.gender} onChange={v=>set("gender",v)}/>
          <Toggle label="Education" options={["High School","Bachelors","Masters","PhD"]} value={form.education} onChange={v=>set("education",v)}/>
          <Toggle label="Employment" options={["Salaried","Self-Employed","Unemployed"]} value={form.employment_type} onChange={v=>set("employment_type",v)}/>
        </div>
      </Card>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#6366f1",letterSpacing:"0.06em",marginBottom:12}}>FINANCIAL INFORMATION</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Annual Income (₹)" type="number" value={form.income} onChange={v=>set("income",v)} placeholder="e.g. 600000"/>
          <Inp label="Loan Amount (₹)" type="number" value={form.loan_amount} onChange={v=>set("loan_amount",v)} placeholder="e.g. 200000"/>
          <Inp label="Work Experience (yrs)" type="number" value={form.years_experience} onChange={v=>set("years_experience",v)} placeholder="0–39"/>
          <div>
            <label style={{fontSize:13,fontWeight:500,color:"#374151",display:"flex",justifyContent:"space-between",marginBottom:5}}>
              Credit Score
              <span style={{color:form.credit_score>=750?"#22c55e":form.credit_score>=650?"#6366f1":form.credit_score>=500?"#f97316":"#ef4444",fontWeight:600}}>
                {form.credit_score>=750?"Excellent":form.credit_score>=650?"Good":form.credit_score>=500?"Fair":"Poor"}
              </span>
            </label>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="range" min={300} max={849} value={form.credit_score} onChange={e=>set("credit_score",Number(e.target.value))} style={{flex:1}}/>
              <span style={{fontWeight:700,color:"#6366f1",minWidth:36}}>{form.credit_score}</span>
            </div>
          </div>
        </div>
      </Card>
      {error && <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:"1rem"}}>{error}</div>}
      <Btn onClick={submit} style={{width:"100%",padding:"14px",fontSize:15,marginBottom:"1.25rem"}}>{loading?"Analyzing...":"🔍 Predict Loan Risk"}</Btn>
      {result && (
        <div style={{background:rBg,border:`1.5px solid ${rBdr}`,borderRadius:16,padding:"1.5rem"}} className="fade-in">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <div style={{fontSize:20,fontWeight:800,color:rCol}}>{result.risk_label==="Low Risk"?"✅":result.risk_label==="Medium Risk"?"⚠️":"❌"} {result.risk_label}</div>
            <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:800,color:rCol}}>{result.approval_probability}%</div><div style={{fontSize:11,color:"#64748b"}}>approval chance</div></div>
          </div>
          <div style={{height:8,background:"#e2e8f0",borderRadius:99,overflow:"hidden",marginBottom:"1rem"}}>
            <div style={{height:"100%",width:`${result.approval_probability}%`,background:rCol,borderRadius:99,transition:"width 1s ease"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1rem"}}>
            <div style={{background:"#fff",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:"#22c55e"}}>{result.approval_probability}%</div>
              <div style={{fontSize:12,color:"#64748b"}}>Approval</div>
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:"#ef4444"}}>{result.rejection_probability}%</div>
              <div style={{fontSize:12,color:"#64748b"}}>Rejection</div>
            </div>
          </div>
          <div style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:8}}>RISK FACTORS</div>
          {result.risk_factors.map((f,i)=><div key={i} style={{fontSize:13,color:"#374151",padding:"4px 0",display:"flex",gap:8}}><span style={{color:rCol}}>●</span>{f}</div>)}
        </div>
      )}
    </div>
  );
}

// ── LOAN REPAYMENT TRACKER ────────────────────────────────────────
function LoanTrackerPage({authHeaders}) {
  const [loans,setLoans] = useState([]);
  const [form,setForm] = useState({loan_name:"",principal:"",interest_rate:"",tenure_months:"",start_date:""});

  const load = async () => { try { const r=await axios.get(`${API}/active-loans`,{headers:authHeaders()}); setLoans(r.data.loans); } catch{} };
  useEffect(()=>{load();},[]);

  const add = async () => {
    await axios.post(`${API}/active-loans`,{...form,principal:Number(form.principal),interest_rate:Number(form.interest_rate),tenure_months:Number(form.tenure_months)},{headers:authHeaders()});
    setForm({loan_name:"",principal:"",interest_rate:"",tenure_months:"",start_date:""}); load();
  };
  const del = async id => { await axios.delete(`${API}/active-loans/${id}`,{headers:authHeaders()}); load(); };

  return (
    <div className="fade-in">
      <SectionHeader icon="🏦" title="Loan Repayment Tracker" subtitle="Track your active loans"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Add Active Loan</div>
        <Inp label="Loan Name" value={form.loan_name} onChange={v=>setForm(f=>({...f,loan_name:v}))} placeholder="e.g. Home Loan"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Principal (₹)" type="number" value={form.principal} onChange={v=>setForm(f=>({...f,principal:v}))} placeholder="e.g. 2000000"/>
          <Inp label="Interest Rate (%)" type="number" value={form.interest_rate} onChange={v=>setForm(f=>({...f,interest_rate:v}))} placeholder="e.g. 8.5"/>
          <Inp label="Tenure (Months)" type="number" value={form.tenure_months} onChange={v=>setForm(f=>({...f,tenure_months:v}))} placeholder="e.g. 240"/>
          <Inp label="Start Date" type="date" value={form.start_date} onChange={v=>setForm(f=>({...f,start_date:v}))}/>
        </div>
        <Btn onClick={add} style={{width:"100%"}}>+ Add Loan</Btn>
      </Card>
      {loans.map(loan=>(
        <Card key={loan.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:16,fontWeight:700}}>{loan.loan_name}</div>
            <button onClick={()=>del(loan.id)} style={{background:"#fef2f2",border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"#ef4444",fontSize:12}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{textAlign:"center",background:"#f8fafc",borderRadius:10,padding:"8px"}}>
              <div style={{fontSize:14,fontWeight:800,color:"#6366f1"}}>{fmtINR(loan.emi)}</div>
              <div style={{fontSize:11,color:"#64748b"}}>Monthly EMI</div>
            </div>
            <div style={{textAlign:"center",background:"#f8fafc",borderRadius:10,padding:"8px"}}>
              <div style={{fontSize:14,fontWeight:800,color:"#ef4444"}}>{fmtINR(loan.balance)}</div>
              <div style={{fontSize:11,color:"#64748b"}}>Balance</div>
            </div>
            <div style={{textAlign:"center",background:"#f8fafc",borderRadius:10,padding:"8px"}}>
              <div style={{fontSize:14,fontWeight:800,color:"#22c55e"}}>{loan.months_left}</div>
              <div style={{fontSize:11,color:"#64748b"}}>Months Left</div>
            </div>
          </div>
          <div style={{height:8,background:"#f1f5f9",borderRadius:99,overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:`${loan.progress_pct}%`,background:"linear-gradient(90deg,#6366f1,#22c55e)",borderRadius:99}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b"}}>
            <span>{loan.months_paid} months paid</span>
            <span style={{fontWeight:600,color:"#6366f1"}}>{loan.progress_pct}% complete</span>
          </div>
        </Card>
      ))}
      {loans.length===0 && <Card><div style={{textAlign:"center",color:"#94a3b8",padding:"2rem",fontSize:14}}>No active loans tracked</div></Card>}
    </div>
  );
}

// ── NET WORTH ─────────────────────────────────────────────────────
function NetWorthPage({authHeaders}) {
  const [data,setData] = useState(null);
  const [aForm,setAForm] = useState({asset_name:"",asset_type:"Cash & Bank",value:""});
  const [lForm,setLForm] = useState({liability_name:"",amount:""});

  const load = async () => { try { const r=await axios.get(`${API}/networth`,{headers:authHeaders()}); setData(r.data); } catch{} };
  useEffect(()=>{load();},[]);

  const addA = async () => { await axios.post(`${API}/networth/asset`,{...aForm,value:Number(aForm.value)},{headers:authHeaders()}); setAForm({asset_name:"",asset_type:"Cash & Bank",value:""}); load(); };
  const addL = async () => { await axios.post(`${API}/networth/liability`,{...lForm,amount:Number(lForm.amount)},{headers:authHeaders()}); setLForm({liability_name:"",amount:""}); load(); };
  const delA = async id => { await axios.delete(`${API}/networth/asset/${id}`,{headers:authHeaders()}); load(); };
  const delL = async id => { await axios.delete(`${API}/networth/liability/${id}`,{headers:authHeaders()}); load(); };

  const nw = data?.net_worth || 0;
  const nwColor = nw>=0?"#22c55e":"#ef4444";

  const pieData = data ? [
    ...(data.assets||[]).map(a=>({name:a.asset_name,value:a.value,type:"asset"})),
  ] : [];

  return (
    <div className="fade-in">
      <SectionHeader icon="💎" title="Net Worth Calculator" subtitle="Assets minus Liabilities"/>
      <Card style={{marginBottom:"1.25rem",textAlign:"center"}}>
        <div style={{fontSize:13,color:"#64748b",marginBottom:6}}>YOUR NET WORTH</div>
        <div style={{fontSize:40,fontWeight:800,color:nwColor}}>{fmtINR(nw)}</div>
        <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:12}}>
          <div><div style={{fontSize:16,fontWeight:700,color:"#22c55e"}}>{fmtINR(data?.total_assets)}</div><div style={{fontSize:12,color:"#64748b"}}>Total Assets</div></div>
          <div style={{fontSize:20,color:"#94a3b8",alignSelf:"center"}}>−</div>
          <div><div style={{fontSize:16,fontWeight:700,color:"#ef4444"}}>{fmtINR(data?.total_liabilities)}</div><div style={{fontSize:12,color:"#64748b"}}>Total Liabilities</div></div>
        </div>
      </Card>

      {pieData.length>0 && (
        <Card style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Asset Breakdown</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie><Tooltip formatter={v=>fmtINR(v)}/></PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:"#22c55e"}}>➕ Add Asset</div>
        <Inp label="Asset Name" value={aForm.asset_name} onChange={v=>setAForm(f=>({...f,asset_name:v}))} placeholder="e.g. Savings Account"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Sel label="Type" value={aForm.asset_type} onChange={v=>setAForm(f=>({...f,asset_type:v}))} options={ASSET_TYPES}/>
          <Inp label="Value (₹)" type="number" value={aForm.value} onChange={v=>setAForm(f=>({...f,value:v}))} placeholder="e.g. 200000"/>
        </div>
        <Btn onClick={addA} color="#22c55e" style={{width:"100%"}}>Add Asset</Btn>
        {data?.assets?.map(a=>(
          <div key={a.id} style={{display:"flex",alignItems:"center",padding:"8px 0",borderTop:"1px solid #f1f5f9",marginTop:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{a.asset_name}</div><div style={{fontSize:11,color:"#94a3b8"}}>{a.asset_type}</div></div>
            <div style={{fontWeight:700,color:"#22c55e",marginRight:10}}>{fmtINR(a.value)}</div>
            <button onClick={()=>delA(a.id)} style={{background:"#f1f5f9",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:"#ef4444"}}>➖ Add Liability</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Liability Name" value={lForm.liability_name} onChange={v=>setLForm(f=>({...f,liability_name:v}))} placeholder="e.g. Home Loan"/>
          <Inp label="Amount (₹)" type="number" value={lForm.amount} onChange={v=>setLForm(f=>({...f,amount:v}))} placeholder="e.g. 1500000"/>
        </div>
        <Btn onClick={addL} color="#ef4444" style={{width:"100%"}}>Add Liability</Btn>
        {data?.liabilities?.map(l=>(
          <div key={l.id} style={{display:"flex",alignItems:"center",padding:"8px 0",borderTop:"1px solid #f1f5f9",marginTop:8}}>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{l.liability_name}</div></div>
            <div style={{fontWeight:700,color:"#ef4444",marginRight:10}}>{fmtINR(l.amount)}</div>
            <button onClick={()=>delL(l.id)} style={{background:"#f1f5f9",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── AI MONEY ASSISTANT ────────────────────────────────────────────
function AIPage({authHeaders}) {
  const [messages,setMessages] = useState([
    {role:"assistant",content:"Hi! I'm your AI Money Assistant 🤖 Ask me anything about budgeting, savings, loans, or investments!"}
  ]);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);

  const quickQ = ["How can I improve my credit score?","What is the 50-30-20 rule?","How much emergency fund should I have?","Is SIP better than FD?"];

  const send = async (msg) => {
  const q = msg || input;
  if (!q.trim()) return;
  setInput(""); setLoading(true);
  setMessages(m => [...m, { role: "user", content: q }]);
  try {
    const res = await axios.post(`${API}/ai/chat`, {
      message: q,
      history: messages
        .filter((m, i) => i > 0)
        .map(m => ({ role: m.role, content: m.content }))
    }, { headers: authHeaders() });
    setMessages(m => [...m, { role: "assistant", content: res.data.reply }]);
  } catch {
    setMessages(m => [...m, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again!" }]);
  }
  setLoading(false);
};

  return (
    <div className="fade-in">
      <SectionHeader icon="🤖" title="AI Money Assistant" subtitle="Ask anything about your finances"/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
        {quickQ.map(q=>(
          <button key={q} onClick={()=>send(q)} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid #e2e8f0",background:"#f8fafc",fontSize:12,cursor:"pointer",color:"#374151",fontFamily:"inherit"}}>
            {q}
          </button>
        ))}
      </div>
      <Card style={{marginBottom:"1rem",maxHeight:400,overflowY:"auto"}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:12,flexDirection:m.role==="user"?"row-reverse":"row"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:m.role==="user"?"#6366f1":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
              {m.role==="user"?"👤":"🤖"}
            </div>
            <div style={{maxWidth:"80%",background:m.role==="user"?"#eef2ff":"#f8fafc",borderRadius:m.role==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",padding:"10px 14px",fontSize:13,color:"#1e293b",lineHeight:1.6}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{display:"flex",gap:8}}><div style={{width:32,height:32,borderRadius:"50%",background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div><div style={{background:"#f8fafc",borderRadius:"4px 16px 16px 16px",padding:"10px 14px",fontSize:13,color:"#64748b"}}>Thinking...</div></div>}
      </Card>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about savings, loans, investments..." style={{flex:1,padding:"12px 14px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
        <Btn onClick={()=>send()} style={{padding:"12px 20px"}}>Send</Btn>
      </div>
    </div>
  );
}

// ── BILLS ─────────────────────────────────────────────────────────
function BillsPage({authHeaders}) {
  const [bills,setBills] = useState([]);
  const [form,setForm] = useState({bill_name:"",amount:"",due_date:""});

  const load = async () => { try { const r=await axios.get(`${API}/bills`,{headers:authHeaders()}); setBills(r.data.bills); } catch{} };
  useEffect(()=>{load();},[]);

  const add = async () => { await axios.post(`${API}/bills`,{...form,amount:Number(form.amount)},{headers:authHeaders()}); setForm({bill_name:"",amount:"",due_date:""}); load(); };
  const pay = async id => { await axios.put(`${API}/bills/${id}/pay`,{},{headers:authHeaders()}); load(); };
  const del = async id => { await axios.delete(`${API}/bills/${id}`,{headers:authHeaders()}); load(); };

  const urgencyColor = u => u==="overdue"?"#ef4444":u==="urgent"?"#f97316":u==="soon"?"#eab308":"#22c55e";
  const urgencyLabel = u => u==="overdue"?"❌ Overdue":u==="urgent"?"🔴 Due in 3 days":u==="soon"?"🟡 Due this week":"🟢 Upcoming";

  const pending = bills.filter(b=>b.status==="pending");
  const paid = bills.filter(b=>b.status==="paid");

  return (
    <div className="fade-in">
      <SectionHeader icon="🧾" title="Bills & Payments" subtitle="Track and pay your bills"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Add Bill</div>
        <Inp label="Bill Name" value={form.bill_name} onChange={v=>setForm(f=>({...f,bill_name:v}))} placeholder="e.g. Electricity Bill"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Amount (₹)" type="number" value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder="e.g. 2500"/>
          <Inp label="Due Date" type="date" value={form.due_date} onChange={v=>setForm(f=>({...f,due_date:v}))}/>
        </div>
        <Btn onClick={add} style={{width:"100%"}}>+ Add Bill</Btn>
      </Card>

      {pending.length>0 && (
        <Card style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>⏳ Pending ({pending.length})</div>
          {pending.map(b=>(
            <div key={b.id} style={{padding:"12px 0",borderBottom:"1px solid #f1f5f9"}}>
              <div style={{display:"flex",alignItems:"center",marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600}}>{b.bill_name}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>Due: {b.due_date}</div>
                </div>
                <div style={{fontWeight:700,color:urgencyColor(b.urgency),marginRight:8}}>{fmtINR(b.amount)}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:600,color:urgencyColor(b.urgency)}}>{urgencyLabel(b.urgency)}</span>
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={()=>pay(b.id)} color="#22c55e" style={{padding:"6px 12px",fontSize:12}}>✓ Pay</Btn>
                  <button onClick={()=>del(b.id)} style={{background:"#fef2f2",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#ef4444",fontSize:12}}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {paid.length>0 && (
        <Card>
          <div style={{fontSize:14,fontWeight:600,marginBottom:12,color:"#22c55e"}}>✅ Paid ({paid.length})</div>
          {paid.map(b=>(
            <div key={b.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9",opacity:0.6}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,textDecoration:"line-through"}}>{b.bill_name}</div></div>
              <div style={{fontWeight:700,color:"#22c55e"}}>{fmtINR(b.amount)}</div>
            </div>
          ))}
        </Card>
      )}
      {bills.length===0 && <Card><div style={{textAlign:"center",color:"#94a3b8",padding:"2rem",fontSize:14}}>No bills added yet</div></Card>}
    </div>
  );
}

// ── OTHER PAGES (Property, Credit, EMI, Interest, Investment, Goals, Tips, Stress, Reports, Alert, Emergency) ──
function PropertyPage() {
  const [state,setState] = useState(""); const [district,setDistrict] = useState(""); const [area,setArea] = useState(""); const [rate,setRate] = useState(0); const [loanAmt,setLoanAmt] = useState("");
  const districts = state ? INDIA_STATES[state]||[] : [];
  const lv = area&&rate ? Number(area)*rate : 0;
  const maxL = Math.round(lv*0.7);
  const fetchRate = async d => { try { const r=await axios.get(`${API}/land-rate/${encodeURIComponent(d)}`); setRate(r.data.rate_per_sqft); } catch{ setRate(2500); } };
  return (
    <div className="fade-in">
      <SectionHeader icon="🏠" title="Property Value Check" subtitle="Land collateral & loan eligibility"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <Sel label="State" value={state} onChange={v=>{setState(v);setDistrict("");setRate(0);}} options={Object.keys(INDIA_STATES).sort()} placeholder="Select State"/>
        <Sel label="District" value={district} onChange={v=>{setDistrict(v);fetchRate(v);}} options={districts} placeholder={state?"Select District":"Select State first"}/>
        <Inp label="Land Area (sq ft)" type="number" value={area} onChange={setArea} placeholder="e.g. 2400"/>
      </Card>
      {rate>0&&area && (
        <div className="fade-in">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
            <StatCard icon="📐" label="Rate/sq ft" value={fmtINR(rate)} color="#6366f1"/>
            <StatCard icon="🏠" label="Land Value" value={fmtINR(lv)} color="#f97316"/>
            <StatCard icon="🏦" label="Max Loan (70%)" value={fmtINR(maxL)} color="#22c55e"/>
          </div>
          <Card>
            <Inp label="Check Your Loan Amount (₹)" type="number" value={loanAmt} onChange={setLoanAmt} placeholder="Enter loan amount"/>
            {loanAmt && <div style={{padding:"10px 14px",borderRadius:10,background:Number(loanAmt)<=maxL?"#f0fdf4":"#fef2f2",border:`1px solid ${Number(loanAmt)<=maxL?"#86efac":"#fca5a5"}`,fontSize:13,fontWeight:600,color:Number(loanAmt)<=maxL?"#16a34a":"#dc2626"}}>
              {Number(loanAmt)<=maxL?`✅ Eligible! Within max limit of ${fmtINR(maxL)}.`:`❌ Exceeds max limit of ${fmtINR(maxL)}.`}
            </div>}
          </Card>
        </div>
      )}
    </div>
  );
}

function CreditPage() {
  const [score,setScore] = useState(600); const [habits,setHabits] = useState({onTime:50,util:60,newCr:2,accs:3}); const [result,setResult] = useState(null);
  const simulate = () => {
    let imp=0;
    if(habits.onTime>=90)imp+=25; else if(habits.onTime>=70)imp+=15; else imp+=5;
    if(habits.util<=20)imp+=20; else if(habits.util<=30)imp+=12; else if(habits.util<=50)imp+=5; else imp-=5;
    if(habits.newCr===0)imp+=5; else if(habits.newCr>=3)imp-=5;
    if(habits.accs>=3)imp+=5;
    const s6=Math.min(850,score+Math.round(imp*0.5)); const s12=Math.min(850,score+imp);
    const tips=[];
    if(habits.onTime<90)tips.push("Pay all bills on time — adds up to 25 points");
    if(habits.util>30)tips.push("Reduce credit card usage below 30%");
    if(habits.newCr>=3)tips.push("Avoid applying for new credit too often");
    if(habits.accs<3)tips.push("Maintain a healthy mix of credit accounts");
    setResult({s6,s12,tips});
  };
  const chartData = result ? [{name:"Now",score},{name:"6 Months",score:result.s6},{name:"12 Months",score:result.s12}] : [];
  return (
    <div className="fade-in">
      <SectionHeader icon="📉" title="Credit Score Helper" subtitle="Simulate your credit improvement"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><label style={{fontSize:13,fontWeight:500,color:"#374151"}}>Current Credit Score</label><span style={{fontWeight:700,color:"#6366f1"}}>{score}</span></div>
        <input type="range" min={300} max={849} value={score} onChange={e=>setScore(Number(e.target.value))} style={{marginBottom:"1rem",width:"100%"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><label style={{fontSize:13,fontWeight:500,color:"#374151"}}>On-time Payments %</label><span style={{fontWeight:600,color:"#6366f1"}}>{habits.onTime}%</span></div><input type="range" min={0} max={100} value={habits.onTime} onChange={e=>setHabits(h=>({...h,onTime:Number(e.target.value)}))} style={{width:"100%",marginBottom:"1rem"}}/></div>
          <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><label style={{fontSize:13,fontWeight:500,color:"#374151"}}>Credit Utilization %</label><span style={{fontWeight:600,color:"#6366f1"}}>{habits.util}%</span></div><input type="range" min={0} max={100} value={habits.util} onChange={e=>setHabits(h=>({...h,util:Number(e.target.value)}))} style={{width:"100%",marginBottom:"1rem"}}/></div>
          <Inp label="New Credit Apps (last year)" type="number" value={habits.newCr} onChange={v=>setHabits(h=>({...h,newCr:Number(v)}))} placeholder="e.g. 2"/>
          <Inp label="Credit Accounts" type="number" value={habits.accs} onChange={v=>setHabits(h=>({...h,accs:Number(v)}))} placeholder="e.g. 3"/>
        </div>
        <Btn onClick={simulate} style={{width:"100%"}}>Simulate Score</Btn>
      </Card>
      {result && <div className="fade-in">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
          <StatCard icon="📊" label="Current" value={score} color="#64748b"/>
          <StatCard icon="📈" label="6 Months" value={result.s6} color="#f97316"/>
          <StatCard icon="🏆" label="12 Months" value={result.s12} color="#22c55e"/>
        </div>
        <Card style={{marginBottom:"1.25rem"}}><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Score Projection</div>
          <ResponsiveContainer width="100%" height={180}><LineChart data={chartData}><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis domain={[300,850]} tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{fill:"#6366f1",r:5}}/></LineChart></ResponsiveContainer>
        </Card>
        <Card><div style={{fontSize:14,fontWeight:600,marginBottom:10}}>💡 Tips to Improve</div>{result.tips.map((t,i)=><div key={i} style={{fontSize:13,color:"#374151",padding:"6px 0",borderBottom:i<result.tips.length-1?"1px solid #f1f5f9":"none",display:"flex",gap:8}}><span style={{color:"#22c55e"}}>✓</span>{t}</div>)}</Card>
      </div>}
    </div>
  );
}

function EMIPage() {
  const [p,setP]=useState(""); const [r,setR]=useState(""); const [n,setN]=useState(""); const [res,setRes]=useState(null);
  const calc = () => { const P=Number(p),R=Number(r)/12/100,N=Number(n); if(!P||!R||!N)return; const emi=P*R*Math.pow(1+R,N)/(Math.pow(1+R,N)-1); const tot=emi*N; const int=tot-P; const sched=Array.from({length:Math.min(N,12)},(_,i)=>({month:`M${i+1}`,balance:Math.max(0,Math.round(P*Math.pow(1+R,i+1)-emi*(Math.pow(1+R,i+1)-1)/R))})); setRes({emi:Math.round(emi),total:Math.round(tot),interest:Math.round(int),sched}); };
  return (
    <div className="fade-in">
      <SectionHeader icon="🔢" title="EMI Calculator" subtitle="Calculate monthly loan payment"/>
      <Card style={{marginBottom:"1.25rem"}}><Inp label="Loan Amount (₹)" type="number" value={p} onChange={setP} placeholder="e.g. 500000"/><Inp label="Annual Interest Rate (%)" type="number" value={r} onChange={setR} placeholder="e.g. 8.5"/><Inp label="Tenure (Months)" type="number" value={n} onChange={setN} placeholder="e.g. 60"/><Btn onClick={calc} style={{width:"100%"}}>Calculate EMI</Btn></Card>
      {res && <div className="fade-in">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
          <StatCard icon="📅" label="Monthly EMI" value={fmtINR(res.emi)} color="#6366f1"/><StatCard icon="💰" label="Total Amount" value={fmtINR(res.total)} color="#f97316"/><StatCard icon="💸" label="Total Interest" value={fmtINR(res.interest)} color="#ef4444"/>
        </div>
        <Card style={{marginBottom:"1.25rem"}}><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Principal vs Interest</div>
          <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={[{name:"Principal",value:Number(p)},{name:"Interest",value:res.interest}]} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}><Cell fill="#6366f1"/><Cell fill="#ef4444"/></Pie><Tooltip formatter={v=>fmtINR(v)}/></PieChart></ResponsiveContainer>
        </Card>
        <Card><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Loan Balance Over Time</div>
          <ResponsiveContainer width="100%" height={180}><LineChart data={res.sched}><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${(v/100000).toFixed(1)}L`}/><Tooltip formatter={v=>fmtINR(v)}/><Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
        </Card>
      </div>}
    </div>
  );
}

function InterestPage() {
  const [p,setP]=useState(""); const [r,setR]=useState(""); const [t,setT]=useState(""); const [res,setRes]=useState(null);
  const calc = () => { const P=Number(p),R=Number(r),T=Number(t); if(!P||!R||!T)return; const si=(P*R*T)/100; const ci=P*Math.pow(1+R/100,T)-P; const yd=Array.from({length:T},(_,i)=>({year:`Y${i+1}`,SI:Math.round((P*R*(i+1))/100),CI:Math.round(P*Math.pow(1+R/100,i+1)-P)})); setRes({si:Math.round(si),ci:Math.round(ci),siT:Math.round(P+si),ciT:Math.round(P+ci),yd}); };
  return (
    <div className="fade-in">
      <SectionHeader icon="💲" title="Interest Calculator" subtitle="Compare Simple vs Compound Interest"/>
      <Card style={{marginBottom:"1.25rem"}}><Inp label="Principal (₹)" type="number" value={p} onChange={setP} placeholder="e.g. 100000"/><Inp label="Interest Rate (%/year)" type="number" value={r} onChange={setR} placeholder="e.g. 8"/><Inp label="Time (Years)" type="number" value={t} onChange={setT} placeholder="e.g. 5"/><Btn onClick={calc} style={{width:"100%"}}>Calculate</Btn></Card>
      {res && <div className="fade-in">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
          <Card style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#6366f1"}}>{fmtINR(res.si)}</div><div style={{fontSize:12,color:"#64748b"}}>Simple Interest</div><div style={{fontSize:12,color:"#374151",fontWeight:600,marginTop:4}}>Maturity: {fmtINR(res.siT)}</div></Card>
          <Card style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:"#22c55e"}}>{fmtINR(res.ci)}</div><div style={{fontSize:12,color:"#64748b"}}>Compound Interest</div><div style={{fontSize:12,color:"#374151",fontWeight:600,marginTop:4}}>Maturity: {fmtINR(res.ciT)}</div></Card>
        </div>
        <Card><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>SI vs CI Year-wise</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={res.yd}><XAxis dataKey="year" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`}/><Tooltip formatter={v=>fmtINR(v)}/><Legend/><Bar dataKey="SI" fill="#6366f1" name="Simple" radius={[4,4,0,0]}/><Bar dataKey="CI" fill="#22c55e" name="Compound" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </Card>
      </div>}
    </div>
  );
}

function InvestmentPage() {
  const [type,setType]=useState("SIP"); const [p,setP]=useState(""); const [r,setR]=useState(""); const [t,setT]=useState(""); const [res,setRes]=useState(null);
  const calc = () => { const P=Number(p),R=Number(r)/100,T=Number(t); if(!P||!R||!T)return; let mat,inv; if(type==="SIP"){const rm=R/12,n=T*12;mat=Math.round(P*((Math.pow(1+rm,n)-1)/rm)*(1+rm));inv=P*n;}else{mat=Math.round(P*Math.pow(1+R,T));inv=P;} const ret=mat-inv; const yd=Array.from({length:T},(_,i)=>({year:`Y${i+1}`,value:type==="SIP"?Math.round(P*((Math.pow(1+R/12,(i+1)*12)-1)/(R/12))*(1+R/12)):Math.round(P*Math.pow(1+R,i+1))})); setRes({mat,inv,ret,yd}); };
  return (
    <div className="fade-in">
      <SectionHeader icon="💹" title="Investment Calculator" subtitle="SIP & Fixed Deposit planner"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <Toggle label="Type" options={["SIP","FD"]} value={type} onChange={v=>{setType(v);setRes(null);}}/>
        <Inp label={type==="SIP"?"Monthly Investment (₹)":"Principal (₹)"} type="number" value={p} onChange={setP} placeholder={type==="SIP"?"e.g. 5000":"e.g. 100000"}/>
        <Inp label="Annual Return (%)" type="number" value={r} onChange={setR} placeholder="e.g. 12"/>
        <Inp label="Time (Years)" type="number" value={t} onChange={setT} placeholder="e.g. 10"/>
        <Btn onClick={calc} style={{width:"100%"}}>Calculate</Btn>
      </Card>
      {res && <div className="fade-in">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:"1.25rem"}}>
          <StatCard icon="💰" label="Invested" value={fmtINR(res.inv)} color="#6366f1"/><StatCard icon="📈" label="Returns" value={fmtINR(res.ret)} color="#22c55e"/><StatCard icon="🏆" label="Maturity" value={fmtINR(res.mat)} color="#f97316"/>
        </div>
        <Card><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Growth Over Time</div>
          <ResponsiveContainer width="100%" height={200}><LineChart data={res.yd}><XAxis dataKey="year" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${(v/100000).toFixed(1)}L`}/><Tooltip formatter={v=>fmtINR(v)}/><Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
        </Card>
      </div>}
    </div>
  );
}

function GoalsPage({authHeaders}) {
  const [goals,setGoals]=useState([]); const [form,setForm]=useState({goal_name:"",target_amount:"",current_amount:"",deadline:""});
  const load = async()=>{ try{const r=await axios.get(`${API}/goals`,{headers:authHeaders()});setGoals(r.data.goals);}catch{} };
  useEffect(()=>{load();},[]);
  const add = async()=>{ await axios.post(`${API}/goals`,{...form,target_amount:Number(form.target_amount),current_amount:Number(form.current_amount)||0},{headers:authHeaders()}); setForm({goal_name:"",target_amount:"",current_amount:"",deadline:""}); load(); };
  const del = async id=>{ await axios.delete(`${API}/goals/${id}`,{headers:authHeaders()}); load(); };
  return (
    <div className="fade-in">
      <SectionHeader icon="🎯" title="My Goals" subtitle="Track your financial goals"/>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Add Goal</div>
        <Inp label="Goal Name" value={form.goal_name} onChange={v=>setForm(f=>({...f,goal_name:v}))} placeholder="e.g. Buy a Car"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Target Amount (₹)" type="number" value={form.target_amount} onChange={v=>setForm(f=>({...f,target_amount:v}))} placeholder="e.g. 500000"/>
          <Inp label="Saved So Far (₹)" type="number" value={form.current_amount} onChange={v=>setForm(f=>({...f,current_amount:v}))} placeholder="e.g. 50000"/>
        </div>
        <Inp label="Target Date" type="date" value={form.deadline} onChange={v=>setForm(f=>({...f,deadline:v}))}/>
        <Btn onClick={add} style={{width:"100%"}}>+ Add Goal</Btn>
      </Card>
      {goals.map(g=>{ const pct=Math.min(100,Math.round((g.current_amount/g.target_amount)*100)); return (
        <Card key={g.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontSize:15,fontWeight:700}}>{g.goal_name}</div><button onClick={()=>del(g.id)} style={{background:"#fef2f2",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#ef4444",fontSize:12}}>✕</button></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#64748b",marginBottom:8}}><span>{fmtINR(g.current_amount)} saved</span><span>Target: {fmtINR(g.target_amount)}</span></div>
          <div style={{height:8,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?"#22c55e":"#6366f1",borderRadius:99}}/></div>
          <div style={{fontSize:12,color:"#6366f1",fontWeight:600,marginTop:4}}>{pct}% achieved</div>
          {g.deadline && <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Target: {g.deadline}</div>}
        </Card>
      );})}
      {goals.length===0 && <Card><div style={{textAlign:"center",color:"#94a3b8",padding:"2rem",fontSize:14}}>No goals yet. Add one above!</div></Card>}
    </div>
  );
}

function TipsPage() {
  const tips = [
    {icon:"💰",title:"50-30-20 Rule",desc:"Spend 50% on needs, 30% on wants, save 20% every month.",color:"#6366f1"},
    {icon:"📈",title:"Start SIP Early",desc:"₹500/month for 20 years at 12% return = ₹4.9 lakhs. Start today!",color:"#22c55e"},
    {icon:"🎯",title:"Emergency Fund",desc:"Keep 6 months of expenses in a liquid savings account always.",color:"#f97316"},
    {icon:"💳",title:"Credit Score Tips",desc:"Pay credit card bills on time. Never use more than 30% of credit limit.",color:"#a855f7"},
    {icon:"📊",title:"Diversify",desc:"Never put all money in one place. Mix FD, mutual funds, and gold.",color:"#38bdf8"},
    {icon:"🏠",title:"Home Loan EMI",desc:"Keep EMI below 40% of your monthly take-home salary.",color:"#ef4444"},
    {icon:"🔄",title:"Review Regularly",desc:"Review your budget and investments every 3 months.",color:"#eab308"},
    {icon:"📱",title:"Avoid Impulse Buying",desc:"Wait 48 hours before any unplanned purchase above ₹2,000.",color:"#14b8a6"},
  ];
  return (
    <div className="fade-in">
      <SectionHeader icon="💡" title="Smart Financial Tips" subtitle="Expert advice for financial health"/>
      {tips.map(t=><Card key={t.title} style={{marginBottom:10,borderLeft:`4px solid ${t.color}`}}><div style={{display:"flex",gap:12}}><span style={{fontSize:22}}>{t.icon}</span><div><div style={{fontSize:14,fontWeight:700,color:t.color,marginBottom:4}}>{t.title}</div><div style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{t.desc}</div></div></div></Card>)}
    </div>
  );
}

function StressPage() {
  const [ans,setAns]=useState({}); const [res,setRes]=useState(null);
  const qs = [
    {id:"q1",text:"Do you worry about money most days?",opts:["Never","Sometimes","Often","Always"]},
    {id:"q2",text:"Can you cover 3 months of expenses if you lose income?",opts:["Yes easily","Yes barely","No","Not sure"]},
    {id:"q3",text:"Do you have outstanding loans or credit card debt?",opts:["No debt","Small amount","Manageable","Struggling"]},
    {id:"q4",text:"Do you save money every month?",opts:["Yes 20%+","Yes 10-20%","Less than 10%","Nothing"]},
    {id:"q5",text:"Are you satisfied with your financial situation?",opts:["Very satisfied","Somewhat","Not really","Very stressed"]},
  ];
  const check = () => { if(Object.keys(ans).length<qs.length)return; const tot=Object.values(ans).reduce((s,v)=>s+v,0); const pct=Math.round((tot/(qs.length*3))*100); let label,color,advice; if(pct<=30){label="Low Stress";color="#22c55e";advice="Great financial shape! Keep it up.";}else if(pct<=60){label="Moderate Stress";color="#f97316";advice="Focus on building emergency fund and reducing debt.";}else{label="High Stress";color="#ef4444";advice="Start with a strict budget and reduce non-essential spending immediately.";} setRes({pct,label,color,advice}); };
  return (
    <div className="fade-in">
      <SectionHeader icon="😰" title="Financial Stress Check" subtitle="Assess your financial stress level"/>
      {qs.map(q=><Card key={q.id} style={{marginBottom:10}}><div style={{fontSize:14,fontWeight:600,marginBottom:10}}>{q.text}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{q.opts.map((o,i)=><button key={o} onClick={()=>setAns(a=>({...a,[q.id]:i}))} style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${ans[q.id]===i?"#6366f1":"#e2e8f0"}`,background:ans[q.id]===i?"#eef2ff":"#fff",color:ans[q.id]===i?"#6366f1":"#374151",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:ans[q.id]===i?600:400}}>{o}</button>)}</div></Card>)}
      <Btn onClick={check} style={{width:"100%",marginBottom:"1rem"}}>Check My Level</Btn>
      {res && <Card className="fade-in" style={{textAlign:"center",borderTop:`4px solid ${res.color}`}}><div style={{fontSize:36,fontWeight:800,color:res.color,marginBottom:4}}>{res.pct}%</div><div style={{fontSize:18,fontWeight:700,color:res.color,marginBottom:8}}>{res.label}</div><div style={{fontSize:14,color:"#374151",lineHeight:1.6}}>{res.advice}</div></Card>}
    </div>
  );
}

function ReportsPage({authHeaders}) {
  const [summary,setSummary]=useState(null); const [history,setHistory]=useState([]);
  useEffect(()=>{ const m=getMonth(); axios.get(`${API}/summary/${m}`,{headers:authHeaders()}).then(r=>setSummary(r.data)).catch(()=>{}); axios.get(`${API}/loan-history`,{headers:authHeaders()}).then(r=>setHistory(r.data.history)).catch(()=>{}); },[]);
  return (
    <div className="fade-in">
      <SectionHeader icon="📑" title="Financial Reports" subtitle="Monthly summary and history"/>
      {summary && <Card style={{marginBottom:"1.25rem"}}><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>This Month</div>{[{l:"Income",v:fmtINR(summary.income),c:"#22c55e"},{l:"Expenses",v:fmtINR(summary.total_expenses),c:"#ef4444"},{l:"Disposable",v:fmtINR(summary.disposable_income),c:"#6366f1"},{l:"Savings Rate",v:`${summary.savings_rate}%`,c:"#f97316"}].map(r=><div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f1f5f9"}}><span style={{fontSize:13,color:"#64748b"}}>{r.l}</span><span style={{fontSize:13,fontWeight:700,color:r.c}}>{r.v}</span></div>)}</Card>}
      <Card><div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Loan History</div>
        {history.length===0?<div style={{textAlign:"center",color:"#94a3b8",padding:"1rem",fontSize:14}}>No predictions yet</div>:
        history.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{h.risk_label}</div><div style={{fontSize:11,color:"#94a3b8"}}>{new Date(h.created_at).toLocaleDateString("en-IN")}</div></div><span style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600,color:h.risk_label==="Low Risk"?"#16a34a":h.risk_label==="Medium Risk"?"#d97706":"#dc2626",background:h.risk_label==="Low Risk"?"#f0fdf4":h.risk_label==="Medium Risk"?"#fff7ed":"#fef2f2"}}>{h.probability}%</span></div>)}
      </Card>
    </div>
  );
}

function AlertPage({authHeaders}) {
  const [summary,setSummary]=useState(null);
  useEffect(()=>{ axios.get(`${API}/summary/${getMonth()}`,{headers:authHeaders()}).then(r=>setSummary(r.data)).catch(()=>{}); },[]);
  return (
    <div className="fade-in">
      <SectionHeader icon="🚨" title="Overspending Alert" subtitle="Monitor your spending health"/>
      {summary ? (
        <div>
          <Card style={{marginBottom:10,borderLeft:`4px solid ${summary.savings_rate<10?"#ef4444":summary.savings_rate<20?"#f97316":"#22c55e"}`}}>
            <div style={{fontSize:14,fontWeight:700,color:summary.savings_rate<10?"#ef4444":summary.savings_rate<20?"#f97316":"#22c55e",marginBottom:6}}>
              {summary.savings_rate<10?"❌ Critical Overspending":summary.savings_rate<20?"⚠️ Watch Your Spending":"✅ Healthy Spending"}
            </div>
            <div style={{fontSize:13,color:"#374151"}}>Savings rate: <strong>{summary.savings_rate}%</strong> {summary.savings_rate<20?"(Recommended: 20%+)":"— Great job!"}</div>
          </Card>
          {Object.entries(summary.category_breakdown||{}).map(([cat,amt])=>(
            <Card key={cat} style={{marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{cat}</div></div>
              <div style={{fontWeight:700,color:"#ef4444"}}>{fmtINR(amt)}</div>
            </Card>
          ))}
        </div>
      ) : <Card><div style={{textAlign:"center",color:"#94a3b8",padding:"2rem",fontSize:14}}>Add expenses to see alerts</div></Card>}
    </div>
  );
}

function EmergencyPage({authHeaders}) {
  const [summary,setSummary]=useState(null);
  useEffect(()=>{ axios.get(`${API}/summary/${getMonth()}`,{headers:authHeaders()}).then(r=>setSummary(r.data)).catch(()=>{}); },[]);
  const monthly = summary?.total_expenses||0;
  const fund6 = monthly*6;
  return (
    <div className="fade-in">
      <SectionHeader icon="🛡️" title="Emergency Fund" subtitle="Plan your financial safety net"/>
      <Card style={{marginBottom:"1.25rem",textAlign:"center"}}>
        <div style={{fontSize:13,color:"#64748b",marginBottom:6}}>RECOMMENDED EMERGENCY FUND</div>
        <div style={{fontSize:36,fontWeight:800,color:"#6366f1"}}>{fmtINR(fund6)}</div>
        <div style={{fontSize:13,color:"#64748b",marginTop:4}}>= 6 months of your monthly expenses ({fmtINR(monthly)})</div>
      </Card>
      <Card style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>How to Build It</div>
        {[{step:"1",text:"Open a separate savings account only for emergencies"},
          {step:"2",text:"Transfer 10-20% of income automatically every month"},
          {step:"3",text:"Never use it for non-emergency purposes"},
          {step:"4",text:"Keep in liquid funds or high-interest savings account"},
          {step:"5",text:"Aim to reach 3 months first, then build to 6 months"},
        ].map(s=><div key={s.step} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #f1f5f9",alignItems:"flex-start"}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{s.step}</div>
          <div style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{s.text}</div>
        </div>)}
      </Card>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────
export default function Dashboard() {
  const {user,logout,authHeaders} = useAuth();
  const [page,setPage] = useState("home");
  const [dash,setDash] = useState(null);

  useEffect(()=>{ axios.get(`${API}/dashboard`,{headers:authHeaders()}).then(r=>setDash(r.data)).catch(()=>{}); },[page]);

  const navItems = [
    {page:"home",icon:"🏠",label:"Home"},
    {page:"expenses",icon:"📈",label:"Finance"},
    {page:"loan",icon:"⚠️",label:"Loan"},
    {page:"goals",icon:"🎯",label:"Goals"},
    {page:"reports",icon:"📑",label:"Reports"},
  ];

  const renderPage = () => {
    const h = authHeaders;
    switch(page) {
      case "home":       return <Home dash={dash} onNav={setPage}/>;
      case "expenses":   return <ExpensePage authHeaders={h}/>;
      case "budget":     return <BudgetPage authHeaders={h}/>;
      case "insights":   return <InsightsPage authHeaders={h}/>;
      case "loan":       return <LoanPage authHeaders={h}/>;
      case "loantrack":  return <LoanTrackerPage authHeaders={h}/>;
      case "networth":   return <NetWorthPage authHeaders={h}/>;
      case "property":   return <PropertyPage/>;
      case "credit":     return <CreditPage/>;
      case "emi":        return <EMIPage/>;
      case "interest":   return <InterestPage/>;
      case "investment": return <InvestmentPage/>;
      case "goals":      return <GoalsPage authHeaders={h}/>;
      case "bills":      return <BillsPage authHeaders={h}/>;
      case "ai":         return <AIPage authHeaders={h}/>;
      case "tips":       return <TipsPage/>;
      case "stress":     return <StressPage/>;
      case "reports":    return <ReportsPage authHeaders={h}/>;
      case "alert":      return <AlertPage authHeaders={h}/>;
      case "emergency":  return <EmergencyPage authHeaders={h}/>;
      default:           return <Home dash={dash} onNav={setPage}/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0f4ff",paddingBottom:80}}>
      {/* Top Bar */}
      <div style={{background:"#fff",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {page!=="home" && <button onClick={()=>setPage("home")} style={{background:"#f0f4ff",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,marginRight:4}}>←</button>}
          <div style={{fontSize:18,fontWeight:800,color:"#6366f1"}}>💹 FinRisk</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {dash?.bills_overdue>0 && <div style={{background:"#fef2f2",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:600,color:"#ef4444"}}>⚠️ {dash.bills_overdue} overdue</div>}
          <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>{user?.name}</div>
          <button onClick={logout} style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,color:"#ef4444",fontFamily:"inherit",fontWeight:600}}>Logout</button>
        </div>
      </div>

      {/* Page Content */}
      <div style={{maxWidth:780,margin:"0 auto",padding:"1.25rem 1rem"}}>
        {renderPage()}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-around",padding:"8px 0",zIndex:100}}>
        {navItems.map(n=>(
          <button key={n.page} onClick={()=>setPage(n.page)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",padding:"6px 12px",borderRadius:10}}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:600,color:page===n.page?"#6366f1":"#94a3b8"}}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
