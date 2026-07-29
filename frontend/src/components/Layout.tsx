import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="empty">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>ERP + CRM PORTAL</h1>
        <nav>
          <NavLink to="/customers">Customers</NavLink>
          <NavLink to="/products">Products &amp; Stock</NavLink>
          <NavLink to="/challans">Sales Challans</NavLink>
          <NavLink to="/challans/new">New Challan</NavLink>
        </nav>
        <div className="who">
          <div><strong>{user.name}</strong></div>
          <div>{user.role}</div>
          <button
            className="link"
            style={{ color: "#cfe0ef", marginTop: 8 }}
            onClick={() => { logout(); navigate("/login"); }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBox({ error }: { error: any }) {
  if (!error) return null;
  return (
    <div className="alert error">
      {error.message}
      {error.fields?.length ? (
        <ul>
          {error.fields.map((f: any, i: number) => (
            <li key={i}>{f.field}: {f.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
