import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#667eea,#764ba2)" }}>
      <div style={{ textAlign:"center", color:"#fff" }}>
        <div style={{ fontSize:52, marginBottom:12 }}>💹</div>
        <div style={{ fontSize:20, fontWeight:700 }}>FinRisk</div>
        <div style={{ fontSize:13, opacity:0.8, marginTop:6 }}>Loading your dashboard...</div>
      </div>
    </div>
  );
  return user ? <Dashboard /> : <LoginPage />;
}
