import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const API = "https://finrisk-backend-e3xs.onrender.com";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(localStorage.getItem("finrisk_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setUser(r.data.user))
        .catch(() => { setToken(null); localStorage.removeItem("finrisk_token"); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, [token]);

  const login = (tkn, userData) => {
    setToken(tkn); setUser(userData);
    localStorage.setItem("finrisk_token", tkn);
  };

  const logout = () => {
    if (token) axios.post(`${API}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setToken(null); setUser(null);
    localStorage.removeItem("finrisk_token");
  };

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authHeaders, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
