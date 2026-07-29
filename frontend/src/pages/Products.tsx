import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Layout";

const blank = { name: "", sku: "", category: "", unitPrice: "", currentStock: "0", minStockAlert: "0", location: "" };

export default function Products() {
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [move, setMove] = useState<any>({ productId: "", quantity: "", type: "IN", reason: "" });
  const [error, setError] = useState<any>(null);
  const [ok, setOk] = useState("");

  async function load() {
    try {
      const qs = new URLSearchParams({ limit: "50" });
      if (search) qs.set("search", search);
      if (lowStock) qs.set("lowStock", "true");
      setRows((await api(`/api/products?${qs}`)).data);
      setMovements((await api(`/api/products/movements?limit=15`)).data);
    } catch (e) { setError(e); }
  }
  useEffect(() => { load(); }, [lowStock]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try {
      const payload: any = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") delete payload[k]; });
      await api("/api/products", { method: "POST", body: payload });
      setForm(blank); setShowForm(false); load();
    } catch (e) { setError(e); }
  }

  async function submitMove(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk("");
    try {
      await api(`/api/products/${move.productId}/movements`, {
        method: "POST",
        body: { quantity: move.quantity, type: move.type, reason: move.reason },
      });
      setOk(`Stock ${move.type} recorded.`);
      setMove({ productId: "", quantity: "", type: "IN", reason: "" });
      load();
    } catch (e) { setError(e); }
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="topbar">
        <h2>Products &amp; Stock</h2>
        {can("ADMIN", "WAREHOUSE") && (
          <button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add Product"}</button>
        )}
      </div>

      <ErrorBox error={error} />
      {ok && <div className="alert ok">{ok}</div>}

      {showForm && (
        <form className="panel" onSubmit={create}>
          <h3>New Product</h3>
          <div className="grid">
            <div><label>Name *</label><input value={form.name} onChange={set("name")} /></div>
            <div><label>SKU *</label><input value={form.sku} onChange={set("sku")} /></div>
            <div><label>Category</label><input value={form.category} onChange={set("category")} /></div>
            <div><label>Unit Price *</label><input type="number" step="0.01" value={form.unitPrice} onChange={set("unitPrice")} /></div>
            <div><label>Opening Stock</label><input type="number" value={form.currentStock} onChange={set("currentStock")} /></div>
            <div><label>Min Stock Alert</label><input type="number" value={form.minStockAlert} onChange={set("minStockAlert")} /></div>
            <div><label>Location</label><input value={form.location} onChange={set("location")} /></div>
          </div>
          <div style={{ marginTop: 14 }}><button type="submit">Save Product</button></div>
        </form>
      )}

      {can("ADMIN", "WAREHOUSE") && (
        <form className="panel" onSubmit={submitMove}>
          <h3>Record Stock Movement</h3>
          <div className="row">
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Product</label>
              <select value={move.productId} onChange={(e) => setMove({ ...move, productId: e.target.value })} required>
                <option value="">Select a product</option>
                {rows.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock {p.currentStock}</option>)}
              </select>
            </div>
            <div style={{ width: 110 }}>
              <label>Type</label>
              <select value={move.type} onChange={(e) => setMove({ ...move, type: e.target.value })}>
                <option>IN</option><option>OUT</option>
              </select>
            </div>
            <div style={{ width: 110 }}>
              <label>Quantity</label>
              <input type="number" value={move.quantity} onChange={(e) => setMove({ ...move, quantity: e.target.value })} required />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Reason</label>
              <input value={move.reason} onChange={(e) => setMove({ ...move, reason: e.target.value })} required />
            </div>
            <button type="submit">Record</button>
          </div>
        </form>
      )}

      <div className="panel">
        <div className="row" style={{ marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Search by name or SKU</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </div>
          <button onClick={load}>Search</button>
          <button className="secondary" onClick={() => setLowStock(!lowStock)}>
            {lowStock ? "Show all" : "Low stock only"}
          </button>
        </div>
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Min</th><th>Location</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.sku}</td><td>{p.category || "-"}</td>
                <td>Rs {Number(p.unitPrice).toFixed(2)}</td>
                <td>
                  {p.currentStock}{" "}
                  {p.currentStock <= p.minStockAlert && <span className="badge low">LOW</span>}
                </td>
                <td>{p.minStockAlert}</td><td>{p.location || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No products found.</div>}
      </div>

      <div className="panel">
        <h3>Stock Movement Log</h3>
        <table>
          <thead><tr><th>When</th><th>Product</th><th>Type</th><th>Qty</th><th>Reason</th><th>By</th></tr></thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>{m.product?.name} ({m.product?.sku})</td>
                <td><span className={`badge ${m.type}`}>{m.type}</span></td>
                <td>{m.quantity}</td><td>{m.reason}</td><td>{m.createdBy?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <div className="empty">No movements recorded.</div>}
      </div>
    </>
  );
}
