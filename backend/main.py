from dotenv import load_dotenv
import os
load_dotenv()
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import sqlite3, os, hashlib, secrets, json
from datetime import datetime

app = FastAPI(title="Financial Risk Analysis System", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "finance.db")
security = HTTPBearer(auto_error=False)

try:
    import joblib, numpy as np
    MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml_model")
    model     = joblib.load(os.path.join(MODEL_DIR, "model.pkl"))
    le_gender = joblib.load(os.path.join(MODEL_DIR, "le_gender.pkl"))
    le_edu    = joblib.load(os.path.join(MODEL_DIR, "le_edu.pkl"))
    le_emp    = joblib.load(os.path.join(MODEL_DIR, "le_emp.pkl"))
    print("✅ ML Model loaded")
except: print("⚠️ ML Model not found")

DISTRICT_RATES = {
    "Hyderabad":8000,"Warangal":3500,"Nizamabad":2800,"Karimnagar":3000,"Khammam":2500,
    "Mahbubnagar":2200,"Nalgonda":2400,"Adilabad":1800,"Suryapet":2000,"Siddipet":2600,
    "Visakhapatnam":6000,"Vijayawada":5500,"Guntur":4000,"Nellore":3500,"Kurnool":3000,
    "Kadapa":2800,"Tirupati":5000,"Anantapur":2500,"Rajahmundry":4500,"Kakinada":4000,
    "Bangalore":9000,"Mysore":5500,"Hubli":4000,"Mangalore":5000,"Belgaum":3500,
    "Chennai":10000,"Coimbatore":6000,"Madurai":5000,"Tiruchirappalli":4500,"Salem":4000,
    "Mumbai":15000,"Pune":9000,"Nagpur":5500,"Nashik":5000,"Aurangabad":4000,
    "Ahmedabad":7000,"Surat":7500,"Vadodara":6000,"Rajkot":5500,"Gandhinagar":6500,
    "Jaipur":6500,"Jodhpur":4500,"Kota":4000,"Bikaner":3500,"Udaipur":5000,
    "Lucknow":6000,"Kanpur":4500,"Agra":5000,"Varanasi":5500,"Noida":8000,
    "Kolkata":8000,"Howrah":6000,"Durgapur":4000,"Siliguri":4500,
    "New Delhi":12000,"South Delhi":13000,"Gurgaon":10000,"Dwarka":10000,
    "Bhopal":5500,"Indore":6000,"Jabalpur":4000,"Gwalior":4500,
    "Kochi":8000,"Thiruvananthapuram":6500,"Kozhikode":5500,"Thrissur":5000,
    "Patna":5000,"Ranchi":4500,"Bhubaneswar":4500,
}

# ── DB ────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            phone TEXT DEFAULT '', password_hash TEXT NOT NULL,
            token TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, category TEXT NOT NULL,
            amount REAL NOT NULL, month TEXT NOT NULL, note TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS monthly_income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, month TEXT NOT NULL, income REAL NOT NULL,
            UNIQUE(user_id, month)
        );
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, goal_name TEXT NOT NULL,
            target_amount REAL NOT NULL, current_amount REAL DEFAULT 0,
            deadline TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, bill_name TEXT NOT NULL,
            amount REAL NOT NULL, due_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS loan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, inputs TEXT NOT NULL,
            risk_label TEXT NOT NULL, probability REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, category TEXT NOT NULL,
            month TEXT NOT NULL, budget_amount REAL NOT NULL,
            UNIQUE(user_id, category, month)
        );
        CREATE TABLE IF NOT EXISTS active_loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, loan_name TEXT NOT NULL,
            principal REAL NOT NULL, interest_rate REAL NOT NULL,
            tenure_months INTEGER NOT NULL, start_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, asset_name TEXT NOT NULL,
            asset_type TEXT NOT NULL, value REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS liabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL, liability_name TEXT NOT NULL,
            amount REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
    print("✅ Database initialized")

init_db()

# ── Auth ──────────────────────────────────────────────────────────
def hp(p): return hashlib.sha256(p.encode()).hexdigest()

def get_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials: raise HTTPException(401, "Not authenticated")
    conn = get_db()
    u = conn.execute("SELECT * FROM users WHERE token=?", (credentials.credentials,)).fetchone()
    conn.close()
    if not u: raise HTTPException(401, "Invalid token")
    return dict(u)

class RegIn(BaseModel):
    name: str; email: str; phone: str = ""; password: str

class LogIn(BaseModel):
    email: str; password: str

@app.post("/auth/register")
def register(d: RegIn):
    conn = get_db()
    if conn.execute("SELECT id FROM users WHERE email=?", (d.email,)).fetchone():
        conn.close(); raise HTTPException(400, "Email already registered")
    token = secrets.token_hex(32)
    conn.execute("INSERT INTO users(name,email,phone,password_hash,token) VALUES(?,?,?,?,?)",
                 (d.name, d.email, d.phone, hp(d.password), token))
    conn.commit()
    u = conn.execute("SELECT id,name,email,phone FROM users WHERE email=?", (d.email,)).fetchone()
    conn.close()
    return {"token": token, "user": dict(u)}

@app.post("/auth/login")
def login(d: LogIn):
    conn = get_db()
    u = conn.execute("SELECT * FROM users WHERE email=? AND password_hash=?", (d.email, hp(d.password))).fetchone()
    if not u: conn.close(); raise HTTPException(401, "Invalid email or password")
    token = secrets.token_hex(32)
    conn.execute("UPDATE users SET token=? WHERE id=?", (token, u["id"]))
    conn.commit(); conn.close()
    return {"token": token, "user": {"id": u["id"], "name": u["name"], "email": u["email"], "phone": u["phone"]}}

@app.get("/auth/me")
def me(u=Depends(get_user)):
    return {"user": {k: u[k] for k in ["id","name","email","phone"]}}

@app.post("/auth/logout")
def logout(u=Depends(get_user)):
    conn = get_db()
    conn.execute("UPDATE users SET token=NULL WHERE id=?", (u["id"],))
    conn.commit(); conn.close()
    return {"message": "Logged out"}

# ── Expenses ──────────────────────────────────────────────────────
class ExpIn(BaseModel):
    category: str; amount: float; month: str; note: str = ""

class IncIn(BaseModel):
    month: str; income: float

@app.post("/expenses/add")
def add_exp(d: ExpIn, u=Depends(get_user)):
    conn = get_db()
    cur = conn.execute("INSERT INTO expenses(user_id,category,amount,month,note) VALUES(?,?,?,?,?)",
                       (u["id"], d.category, d.amount, d.month, d.note))
    conn.commit(); conn.close()
    return {"id": cur.lastrowid, "message": "Added"}

@app.delete("/expenses/{eid}")
def del_exp(eid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("DELETE FROM expenses WHERE id=? AND user_id=?", (eid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

@app.get("/expenses/{month}")
def get_exp(month: str, u=Depends(get_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM expenses WHERE user_id=? AND month=? ORDER BY created_at DESC", (u["id"], month)).fetchall()
    conn.close()
    return {"expenses": [dict(r) for r in rows]}

@app.post("/income")
def set_inc(d: IncIn, u=Depends(get_user)):
    conn = get_db()
    conn.execute("INSERT INTO monthly_income(user_id,month,income) VALUES(?,?,?) ON CONFLICT(user_id,month) DO UPDATE SET income=excluded.income",
                 (u["id"], d.month, d.income))
    conn.commit(); conn.close()
    return {"message": "Saved"}

@app.get("/summary/{month}")
def summary(month: str, u=Depends(get_user)):
    conn = get_db()
    inc = conn.execute("SELECT income FROM monthly_income WHERE user_id=? AND month=?", (u["id"], month)).fetchone()
    income = inc["income"] if inc else 0
    cats = conn.execute("SELECT category, SUM(amount) as t FROM expenses WHERE user_id=? AND month=? GROUP BY category", (u["id"], month)).fetchall()
    conn.close()
    bd = {r["category"]: r["t"] for r in cats}
    te = sum(bd.values())
    disp = income - te
    sr = round((disp / income) * 100, 1) if income > 0 else 0
    return {"income": income, "total_expenses": te, "disposable_income": disp, "savings_rate": sr, "category_breakdown": bd}

# ── Spending Insights (month comparison) ─────────────────────────
@app.get("/insights/{month}")
def insights(month: str, u=Depends(get_user)):
    conn = get_db()
    year, mon = month.split("-")
    prev_mon = str(int(mon) - 1).zfill(2) if int(mon) > 1 else "12"
    prev_year = year if int(mon) > 1 else str(int(year) - 1)
    prev_month = f"{prev_year}-{prev_mon}"
    curr = conn.execute("SELECT category, SUM(amount) as t FROM expenses WHERE user_id=? AND month=? GROUP BY category", (u["id"], month)).fetchall()
    prev = conn.execute("SELECT category, SUM(amount) as t FROM expenses WHERE user_id=? AND month=? GROUP BY category", (u["id"], prev_month)).fetchall()
    conn.close()
    curr_d = {r["category"]: r["t"] for r in curr}
    prev_d = {r["category"]: r["t"] for r in prev}
    all_cats = set(list(curr_d.keys()) + list(prev_d.keys()))
    comparison = []
    for cat in all_cats:
        c = curr_d.get(cat, 0); p = prev_d.get(cat, 0)
        change = round(((c - p) / p) * 100, 1) if p > 0 else 0
        comparison.append({"category": cat, "current": c, "previous": p, "change_pct": change})
    comparison.sort(key=lambda x: x["current"], reverse=True)
    return {"current_month": month, "previous_month": prev_month, "comparison": comparison}

# ── Budget Planner ────────────────────────────────────────────────
class BudgetIn(BaseModel):
    category: str; month: str; budget_amount: float

@app.post("/budget")
def set_budget(d: BudgetIn, u=Depends(get_user)):
    conn = get_db()
    conn.execute("INSERT INTO budgets(user_id,category,month,budget_amount) VALUES(?,?,?,?) ON CONFLICT(user_id,category,month) DO UPDATE SET budget_amount=excluded.budget_amount",
                 (u["id"], d.category, d.month, d.budget_amount))
    conn.commit(); conn.close()
    return {"message": "Budget set"}

@app.get("/budget/{month}")
def get_budget(month: str, u=Depends(get_user)):
    conn = get_db()
    budgets = conn.execute("SELECT category, budget_amount FROM budgets WHERE user_id=? AND month=?", (u["id"], month)).fetchall()
    spent = conn.execute("SELECT category, SUM(amount) as t FROM expenses WHERE user_id=? AND month=? GROUP BY category", (u["id"], month)).fetchall()
    conn.close()
    spent_d = {r["category"]: r["t"] for r in spent}
    result = []
    for b in budgets:
        s = spent_d.get(b["category"], 0)
        pct = round((s / b["budget_amount"]) * 100, 1) if b["budget_amount"] > 0 else 0
        result.append({"category": b["category"], "budget": b["budget_amount"], "spent": s, "remaining": b["budget_amount"] - s, "pct_used": pct})
    return {"budgets": result}

# ── Goals ─────────────────────────────────────────────────────────
class GoalIn(BaseModel):
    goal_name: str; target_amount: float; current_amount: float = 0; deadline: str = ""

@app.get("/goals")
def get_goals(u=Depends(get_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM goals WHERE user_id=? ORDER BY created_at DESC", (u["id"],)).fetchall()
    conn.close()
    return {"goals": [dict(r) for r in rows]}

@app.post("/goals")
def add_goal(d: GoalIn, u=Depends(get_user)):
    conn = get_db()
    cur = conn.execute("INSERT INTO goals(user_id,goal_name,target_amount,current_amount,deadline) VALUES(?,?,?,?,?)",
                       (u["id"], d.goal_name, d.target_amount, d.current_amount, d.deadline))
    conn.commit(); conn.close()
    return {"id": cur.lastrowid, "message": "Goal added"}

@app.delete("/goals/{gid}")
def del_goal(gid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("DELETE FROM goals WHERE id=? AND user_id=?", (gid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

# ── Bills ─────────────────────────────────────────────────────────
class BillIn(BaseModel):
    bill_name: str; amount: float; due_date: str

@app.get("/bills")
def get_bills(u=Depends(get_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM bills WHERE user_id=? ORDER BY due_date ASC", (u["id"],)).fetchall()
    conn.close()
    today = datetime.now().strftime("%Y-%m-%d")
    bills = []
    for r in rows:
        b = dict(r)
        if b["status"] == "pending":
            days = (datetime.strptime(b["due_date"], "%Y-%m-%d") - datetime.now()).days
            b["days_left"] = days
            b["urgency"] = "overdue" if days < 0 else "urgent" if days <= 3 else "soon" if days <= 7 else "normal"
        else:
            b["days_left"] = None; b["urgency"] = "paid"
        bills.append(b)
    return {"bills": bills}

@app.post("/bills")
def add_bill(d: BillIn, u=Depends(get_user)):
    conn = get_db()
    cur = conn.execute("INSERT INTO bills(user_id,bill_name,amount,due_date) VALUES(?,?,?,?)",
                       (u["id"], d.bill_name, d.amount, d.due_date))
    conn.commit(); conn.close()
    return {"id": cur.lastrowid}

@app.put("/bills/{bid}/pay")
def pay_bill(bid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("UPDATE bills SET status='paid' WHERE id=? AND user_id=?", (bid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Paid"}

@app.delete("/bills/{bid}")
def del_bill(bid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("DELETE FROM bills WHERE id=? AND user_id=?", (bid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

# ── Active Loans (Repayment Tracker) ─────────────────────────────
class LoanTrackIn(BaseModel):
    loan_name: str; principal: float; interest_rate: float
    tenure_months: int; start_date: str

@app.get("/active-loans")
def get_active_loans(u=Depends(get_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM active_loans WHERE user_id=? ORDER BY created_at DESC", (u["id"],)).fetchall()
    conn.close()
    result = []
    for r in rows:
        loan = dict(r)
        P = loan["principal"]; R = loan["interest_rate"] / 12 / 100; N = loan["tenure_months"]
        if R > 0:
            emi = P * R * (1+R)**N / ((1+R)**N - 1)
        else:
            emi = P / N
        start = datetime.strptime(loan["start_date"], "%Y-%m-%d")
        months_paid = (datetime.now().year - start.year) * 12 + (datetime.now().month - start.month)
        months_paid = max(0, min(months_paid, N))
        months_left = N - months_paid
        total_paid = emi * months_paid
        balance = P * (1+R)**months_paid - emi * ((1+R)**months_paid - 1) / R if R > 0 else P - (P/N)*months_paid
        loan["emi"] = round(emi)
        loan["months_paid"] = months_paid
        loan["months_left"] = months_left
        loan["balance"] = round(max(0, balance))
        loan["total_paid"] = round(total_paid)
        loan["progress_pct"] = round((months_paid / N) * 100, 1)
        result.append(loan)
    return {"loans": result}

@app.post("/active-loans")
def add_active_loan(d: LoanTrackIn, u=Depends(get_user)):
    conn = get_db()
    cur = conn.execute("INSERT INTO active_loans(user_id,loan_name,principal,interest_rate,tenure_months,start_date) VALUES(?,?,?,?,?,?)",
                       (u["id"], d.loan_name, d.principal, d.interest_rate, d.tenure_months, d.start_date))
    conn.commit(); conn.close()
    return {"id": cur.lastrowid}

@app.delete("/active-loans/{lid}")
def del_active_loan(lid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("DELETE FROM active_loans WHERE id=? AND user_id=?", (lid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

# ── Net Worth ─────────────────────────────────────────────────────
class AssetIn(BaseModel):
    asset_name: str; asset_type: str; value: float

class LiabIn(BaseModel):
    liability_name: str; amount: float

@app.get("/networth")
def get_networth(u=Depends(get_user)):
    conn = get_db()
    assets = conn.execute("SELECT * FROM assets WHERE user_id=?", (u["id"],)).fetchall()
    liabs = conn.execute("SELECT * FROM liabilities WHERE user_id=?", (u["id"],)).fetchall()
    conn.close()
    total_assets = sum(r["value"] for r in assets)
    total_liabs = sum(r["amount"] for r in liabs)
    return {"assets": [dict(r) for r in assets], "liabilities": [dict(r) for r in liabs],
            "total_assets": total_assets, "total_liabilities": total_liabs,
            "net_worth": total_assets - total_liabs}

@app.post("/networth/asset")
def add_asset(d: AssetIn, u=Depends(get_user)):
    conn = get_db()
    cur = conn.execute("INSERT INTO assets(user_id,asset_name,asset_type,value) VALUES(?,?,?,?)",
                       (u["id"], d.asset_name, d.asset_type, d.value))
    conn.commit(); conn.close()
    return {"id": cur.lastrowid}

@app.delete("/networth/asset/{aid}")
def del_asset(aid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("DELETE FROM assets WHERE id=? AND user_id=?", (aid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

@app.post("/networth/liability")
def add_liab(d: LiabIn, u=Depends(get_user)):
    conn = get_db()
    cur = conn.execute("INSERT INTO liabilities(user_id,liability_name,amount) VALUES(?,?,?)",
                       (u["id"], d.liability_name, d.amount))
    conn.commit(); conn.close()
    return {"id": cur.lastrowid}

@app.delete("/networth/liability/{lid}")
def del_liab(lid: int, u=Depends(get_user)):
    conn = get_db()
    conn.execute("DELETE FROM liabilities WHERE id=? AND user_id=?", (lid, u["id"]))
    conn.commit(); conn.close()
    return {"message": "Deleted"}

# ── Loan Risk Prediction ──────────────────────────────────────────
class LoanIn(BaseModel):
    age: int = Field(..., ge=18, le=69)
    income: float; loan_amount: float
    credit_score: float = Field(..., ge=300, le=849)
    years_experience: int = Field(..., ge=0, le=39)
    gender: str; education: str; employment_type: str

def score_loan(d):
    s = 0
    if d.credit_score >= 750: s += 35
    elif d.credit_score >= 700: s += 28
    elif d.credit_score >= 650: s += 20
    elif d.credit_score >= 600: s += 13
    elif d.credit_score >= 500: s += 6
    else: s -= 20
    if d.employment_type == "Salaried": s += 20
    elif d.employment_type == "Self-Employed": s += 12
    if d.income > 0:
        r = d.loan_amount / d.income
        if r <= 0.2: s += 20
        elif r <= 0.4: s += 15
        elif r <= 0.6: s += 8
        elif r <= 0.8: s += 3
    if d.years_experience >= 10: s += 15
    elif d.years_experience >= 5: s += 11
    elif d.years_experience >= 2: s += 6
    s += {"PhD": 10, "Masters": 8, "Bachelors": 6, "High School": 3}.get(d.education, 4)
    return s

def risk_label(s):
    if s >= 65: return "Low Risk", 1
    if s >= 40: return "Medium Risk", 0
    return "High Risk", 0

def risk_factors(d):
    f = []
    if d.credit_score < 600: f.append(f"Low credit score ({int(d.credit_score)}) — aim for 650+")
    if d.employment_type == "Unemployed": f.append("Currently unemployed")
    if d.income > 0 and d.loan_amount / d.income > 0.6: f.append("Loan amount too high vs income")
    if d.years_experience < 2: f.append("Less than 2 years work experience")
    if d.income * 83 < 1660000: f.append("Low annual income (below ₹16,60,000)")
    return f or ["No major risk factors ✅"]

@app.post("/predict")
def predict(d: LoanIn, u=Depends(get_user)):
    s = score_loan(d); lbl, appr = risk_label(s)
    conn = get_db()
    conn.execute("INSERT INTO loan_history(user_id,inputs,risk_label,probability) VALUES(?,?,?,?)",
                 (u["id"], json.dumps(d.dict()), lbl, round(s, 1)))
    conn.commit(); conn.close()
    return {"approved": appr, "risk_label": lbl, "approval_probability": round(s, 1),
            "rejection_probability": round(100 - s, 1), "risk_factors": risk_factors(d)}

@app.get("/loan-history")
def loan_hist(u=Depends(get_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM loan_history WHERE user_id=? ORDER BY created_at DESC LIMIT 20", (u["id"],)).fetchall()
    conn.close()
    return {"history": [dict(r) for r in rows]}

# ── Land Rate ─────────────────────────────────────────────────────
@app.get("/land-rate/{district}")
def land_rate(district: str):
    return {"district": district, "rate_per_sqft": DISTRICT_RATES.get(district, 2500)}

# ── Dashboard ─────────────────────────────────────────────────────
@app.get("/dashboard")
def dashboard(u=Depends(get_user)):
    conn = get_db()
    month = datetime.now().strftime("%Y-%m")
    today = datetime.now().strftime("%Y-%m-%d")
    inc = conn.execute("SELECT income FROM monthly_income WHERE user_id=? AND month=?", (u["id"], month)).fetchone()
    income = inc["income"] if inc else 0
    exp = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id=? AND month=?", (u["id"], month)).fetchone()["t"]
    goals = conn.execute("SELECT COUNT(*) as c FROM goals WHERE user_id=?", (u["id"],)).fetchone()["c"]
    bills_due = conn.execute("SELECT COUNT(*) as c FROM bills WHERE user_id=? AND status='pending' AND due_date<=date('now','+7 days')", (u["id"],)).fetchone()["c"]
    bills_overdue = conn.execute("SELECT COUNT(*) as c FROM bills WHERE user_id=? AND status='pending' AND due_date<date('now')", (u["id"],)).fetchone()["c"]
    last_loan = conn.execute("SELECT risk_label,probability FROM loan_history WHERE user_id=? ORDER BY created_at DESC LIMIT 1", (u["id"],)).fetchone()
    assets_total = conn.execute("SELECT COALESCE(SUM(value),0) as t FROM assets WHERE user_id=?", (u["id"],)).fetchone()["t"]
    liabs_total = conn.execute("SELECT COALESCE(SUM(amount),0) as t FROM liabilities WHERE user_id=?", (u["id"],)).fetchone()["t"]
    active_loans = conn.execute("SELECT COUNT(*) as c FROM active_loans WHERE user_id=?", (u["id"],)).fetchone()["c"]
    conn.close()
    disp = income - exp
    sr = round((disp / income) * 100) if income > 0 else 0
    health = min(100, max(0, sr + (20 if last_loan and last_loan["risk_label"] == "Low Risk" else 5) + (10 if bills_overdue == 0 else 0)))
    return {
        "month": month, "income": income, "total_expenses": exp,
        "disposable_income": disp, "savings_rate": sr,
        "goals_count": goals, "bills_due_soon": bills_due,
        "bills_overdue": bills_overdue, "financial_health_score": health,
        "last_loan_risk": dict(last_loan) if last_loan else None,
        "net_worth": assets_total - liabs_total,
        "active_loans": active_loans,
    }

# ── AI Chat ───────────────────────────────────────────────────────
class ChatInput(BaseModel):
    message: str
    history: list = []

@app.post("/ai/chat")
def ai_chat(data: ChatInput, u=Depends(get_user)):
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        chat_messages = [{"role":"system","content":"You are a helpful Indian financial advisor. Give concise practical advice in simple language. Focus on Indian context — mention INR, SIP, PPF, FD, Indian banks etc. Keep responses under 100 words."}] + data.history + [{"role":"user","content":data.message}]
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=chat_messages,
            max_tokens=400,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        return {"reply": f"Sorry, AI service unavailable: {str(e)}"}

@app.get("/")
def root():
    return {"message": "Financial Risk Analysis System API v3.0 ✅"}