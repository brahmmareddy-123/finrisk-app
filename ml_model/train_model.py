import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import joblib, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(BASE_DIR, "loan_risk_prediction_dataset.csv"))
df = df.dropna()
df = df[df['Income'] > 0]
df = df[df['LoanAmount'] > 0]

le_gender = LabelEncoder()
le_edu    = LabelEncoder()
le_emp    = LabelEncoder()

df['Gender']         = le_gender.fit_transform(df['Gender'])
df['Education']      = le_edu.fit_transform(df['Education'])
df['EmploymentType'] = le_emp.fit_transform(df['EmploymentType'])

FEATURES = ['Age','Income','LoanAmount','CreditScore','YearsExperience','Gender','Education','EmploymentType']
X = df[FEATURES]
y = df['LoanApproved']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model.fit(X_train, y_train)

print(f"✅ Accuracy: {accuracy_score(y_test, model.predict(X_test))*100:.2f}%")

joblib.dump(model,     os.path.join(BASE_DIR, "model.pkl"))
joblib.dump(le_gender, os.path.join(BASE_DIR, "le_gender.pkl"))
joblib.dump(le_edu,    os.path.join(BASE_DIR, "le_edu.pkl"))
joblib.dump(le_emp,    os.path.join(BASE_DIR, "le_emp.pkl"))

print("✅ model.pkl, le_gender.pkl, le_edu.pkl, le_emp.pkl saved!")