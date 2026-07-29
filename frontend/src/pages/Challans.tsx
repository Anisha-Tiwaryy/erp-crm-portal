import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Layout";

export default function Challans() {
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);
  const [ok, setOk] = useState("");

  async function load() {
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "10" });
      if (status) qs.set("status", status);
      const res = await api(`/api/challans?${qs}`);
      setRows(res.data); setMeta(res.meta);
    } catch (e) { setError(e); }
  }
  useEffect(() => { load(); }, [page, status]);

  async function act(id: string, action: "confirm" | "cancel") {
    setError(null); setOk("");
    try {
      await api(`/api/challans/${id}/${action}`, { method: "POST" });
      setOk(`Challan ${action === "confirm" ? "confirmed and stock deducted" : "cancelled and stock restored"}.`);
      load();
    } catch (e) { setError(e); }
  }

  return (
    <>
      <div className="topbar">
        <h2>Sales Challans</h2>
        {can("ADMIN", "SALES") && <Link to="/challans/new"><button>New Challan</button></Link>}
      </div>

      <ErrorBox error={error} />
      {ok && <div className="alert ok">{ok}</div>}

      <div className="panel">
        <div className="row" style={{ marginBottom: 14 }}>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All</option><option>DRAFT</option><option>CONFIRMED</option><option>CANCELLED</option>
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr><th>Number</th><th>Customer</th><th>Status</th><th>Qty</th><th>Amount</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <Fragment key={c.id}>
                <tr>
                  <td><button className="link" onClick={() => setOpen(open === c.id ? null : c.id)}>{c.challanNumber}</button></td>
                  <td>{c.customer?.businessName || c.customer?.name}</td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td>{c.totalQuantity}</td>
                  <td>Rs {Number(c.totalAmount).toFixed(2)}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    {c.status === "DRAFT" && can("ADMIN", "SALES", "WAREHOUSE") && (
                      <button onClick={() => act(c.id, "confirm")}>Confirm</button>
                    )}{" "}
                    {c.status !== "CANCELLED" && can("ADMIN", "SALES") && (
                      <button className="danger" onClick={() => act(c.id, "cancel")}>Cancel</button>
                    )}
                  </td>
                </tr>
                {open === c.id && (
                  <tr>
                    <td colSpan={7} style={{ background: "#fafbfc" }}>
                      <strong style={{ fontSize: 12 }}>SNAPSHOT LINE ITEMS</strong>
                      <table style={{ marginTop: 8 }}>
                        <thead><tr><th>Product</th><th>SKU</th><th>Unit Price</th><th>Qty</th><th>Line Total</th></tr></thead>
                        <tbody>
                          {c.items.map((i: any) => (
                            <tr key={i.id}>
                              <td>{i.productName}</td><td>{i.sku}</td>
                              <td>Rs {Number(i.unitPrice).toFixed(2)}</td>
                              <td>{i.quantity}</td>
                              <td>Rs {Number(i.lineTotal).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Product name, SKU and price are stored on the challan itself, so later
                        edits to the product master do not alter this document.
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No challans yet.</div>}

        <div className="pager">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
          <button className="secondary" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}
