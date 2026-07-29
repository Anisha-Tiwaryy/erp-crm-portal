import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Layout";

const blank = {
  name: "", mobile: "", email: "", businessName: "", gstNumber: "",
  type: "RETAIL", address: "", status: "LEAD", notes: "",
};

export default function Customers() {
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) qs.set("search", search);
      if (status) qs.set("status", status);
      const res = await api(`/api/customers?${qs}`);
      setRows(res.data);
      setMeta(res.meta);
    } catch (e) { setError(e); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, status]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: any = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      await api("/api/customers", { method: "POST", body: payload });
      setForm(blank);
      setShowForm(false);
      load();
    } catch (e) { setError(e); }
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="topbar">
        <h2>Customers</h2>
        {can("ADMIN", "SALES") && (
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Customer"}
          </button>
        )}
      </div>

      <ErrorBox error={error} />

      {showForm && (
        <form className="panel" onSubmit={create}>
          <h3>New Customer</h3>
          <div className="grid">
            <div><label>Name *</label><input value={form.name} onChange={set("name")} /></div>
            <div><label>Mobile * (10 digits)</label><input value={form.mobile} onChange={set("mobile")} /></div>
            <div><label>Email</label><input value={form.email} onChange={set("email")} /></div>
            <div><label>Business Name</label><input value={form.businessName} onChange={set("businessName")} /></div>
            <div><label>GST Number</label><input value={form.gstNumber} onChange={set("gstNumber")} /></div>
            <div>
              <label>Type</label>
              <select value={form.type} onChange={set("type")}>
                <option>RETAIL</option><option>WHOLESALE</option><option>DISTRIBUTOR</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={set("status")}>
                <option>LEAD</option><option>ACTIVE</option><option>INACTIVE</option>
              </select>
            </div>
            <div><label>Address</label><input value={form.address} onChange={set("address")} /></div>
          </div>
          <div style={{ marginTop: 14 }}><button type="submit">Save Customer</button></div>
        </form>
      )}

      <div className="panel">
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Search by name, mobile, business or email</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())} />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All</option><option>LEAD</option><option>ACTIVE</option><option>INACTIVE</option>
            </select>
          </div>
          <button onClick={() => { setPage(1); load(); }}>Search</button>
        </div>

        <table>
          <thead>
            <tr><th>Name</th><th>Business</th><th>Mobile</th><th>Type</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.businessName || "-"}</td>
                <td>{c.mobile}</td>
                <td>{c.type}</td>
                <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                <td><Link to={`/customers/${c.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <div className="empty">No customers found.</div>}

        <div className="pager">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
          <button className="secondary" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}
