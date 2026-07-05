import { useState } from "react";
import axios from "axios";
import { useAuth, API } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab]     = useState("login");
  const [form, setForm]   = useState({ name:"", email:"", phone:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const url = tab==="login" ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = tab==="login" ? {email:form.email,password:form.password} : form;
      const res = await axios.post(url, payload);
      login(res.data.token, res.data.user);
    } catch(e) { setError(e.response?.data?.detail || "Something went wrong"); }
    setLoading(false);
  };

  const inp = { width:"100%", padding:"11px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", marginBottom:"1rem", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:"2.5rem", width:"100%", maxWidth:400, boxShadow:"0 25px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ fontSize:48, marginBottom:8 }}>💹</div>
          <div style={{ fontSize:26, fontWeight:800, color:"#1e293b" }}>FinRisk</div>
          <div style={{ fontSize:13, color:"#64748b" }}>Financial Risk Analysis System</div>
        </div>

        <div style={{ display:"flex", background:"#f1f5f9", borderRadius:12, padding:4, marginBottom:"1.5rem" }}>
          {["login","register"].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:600, background:tab===t?"#fff":"transparent", color:tab===t?"#6366f1":"#64748b", boxShadow:tab===t?"0 2px 8px rgba(0,0,0,0.1)":"none", fontFamily:"inherit" }}>
              {t==="login"?"Login":"Register"}
            </button>
          ))}
        </div>

        {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:"1rem" }}>{error}</div>}

        {tab==="register" && <>
          <label style={{ fontSize:13, fontWeight:500, color:"#374151", display:"block", marginBottom:6 }}>Full Name</label>
          <input style={inp} placeholder="Your full name" value={form.name} onChange={e=>set("name",e.target.value)} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
          <label style={{ fontSize:13, fontWeight:500, color:"#374151", display:"block", marginBottom:6 }}>Phone Number</label>
          <input style={inp} placeholder="Phone number" value={form.phone} onChange={e=>set("phone",e.target.value)} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
        </>}

        <label style={{ fontSize:13, fontWeight:500, color:"#374151", display:"block", marginBottom:6 }}>Email Address</label>
        <input style={inp} placeholder="Email" type="email" value={form.email} onChange={e=>set("email",e.target.value)} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />

        <label style={{ fontSize:13, fontWeight:500, color:"#374151", display:"block", marginBottom:6 }}>Password</label>
        <input style={{...inp, marginBottom:"1.5rem"}} placeholder="Password" type="password" value={form.password} onChange={e=>set("password",e.target.value)} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />

        <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg,#667eea,#764ba2)", border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
          {loading ? "Please wait..." : tab==="login" ? "Login to Dashboard" : "Create Account"}
        </button>
      </div>
    </div>
  );
}
