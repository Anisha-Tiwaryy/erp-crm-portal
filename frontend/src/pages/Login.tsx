import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Layout";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@erpdemo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/customers" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/customers");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>ERP + CRM Operations Portal</h1>
        <p className="muted" style={{ marginTop: 0 }}>Sign in to continue</p>
        <ErrorBox error={error} />
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <div className="hint">
          <strong>Demo accounts</strong><br />
          <code>admin@erpdemo.com</code> — full access<br />
          <code>sales@erpdemo.com</code> — CRM and challans<br />
          <code>warehouse@erpdemo.com</code> — products and stock<br />
          <code>accounts@erpdemo.com</code> — read only
        </div>
      </form>
    </div>
  );
}
