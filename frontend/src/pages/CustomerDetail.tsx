import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Layout";

export default function CustomerDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [c, setC] = useState<any>(null);
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [error, setError] = useState<any>(null);

  async function load() {
    try { setC((await api(`/api/customers/${id}`)).data); }
    catch (e) { setError(e); }
  }
  useEffect(() => { load(); }, [id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/api/customers/${id}/follow-ups`, {
        method: "POST",
        body: { note, ...(nextDate ? { nextDate } : {}) },
      });
      setNote(""); setNextDate(""); load();
    } catch (e) { setError(e); }
  }

  if (!c) return <><ErrorBox error={error} /><div className="empty">Loading...</div></>;

  return (
    <>
      <div className="topbar">
        <h2>{c.name}</h2>
        <Link to="/customers">Back to list</Link>
      </div>
      <ErrorBox error={error} />

      <div className="panel">
        <h3>Details</h3>
        <div className="grid">
          <div><div className="muted">Business</div>{c.businessName || "-"}</div>
          <div><div className="muted">Mobile</div>{c.mobile}</div>
          <div><div className="muted">Email</div>{c.email || "-"}</div>
          <div><div className="muted">GST</div>{c.gstNumber || "-"}</div>
          <div><div className="muted">Type</div>{c.type}</div>
          <div><div className="muted">Status</div><span className={`badge ${c.status}`}>{c.status}</span></div>
          <div><div className="muted">Address</div>{c.address || "-"}</div>
          <div><div className="muted">Created by</div>{c.createdBy?.name}</div>
        </div>
      </div>

      <div className="panel">
        <h3>Follow-up Notes</h3>
        {can("ADMIN", "SALES") && (
          <form className="row" style={{ marginBottom: 14 }} onSubmit={addNote}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label>Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} required />
            </div>
            <div>
              <label>Next follow-up date</label>
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
            <button type="submit">Add Note</button>
          </form>
        )}
        <table>
          <thead><tr><th>Date</th><th>Note</th><th>Next</th><th>By</th></tr></thead>
          <tbody>
            {c.followUps.map((f: any) => (
              <tr key={f.id}>
                <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                <td>{f.note}</td>
                <td>{f.nextDate ? new Date(f.nextDate).toLocaleDateString() : "-"}</td>
                <td>{f.createdBy?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {c.followUps.length === 0 && <div className="empty">No follow-ups yet.</div>}
      </div>

      <div className="panel">
        <h3>Recent Challans</h3>
        <table>
          <thead><tr><th>Number</th><th>Status</th><th>Qty</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            {c.challans.map((ch: any) => (
              <tr key={ch.id}>
                <td><Link to={`/challans?search=${ch.challanNumber}`}>{ch.challanNumber}</Link></td>
                <td><span className={`badge ${ch.status}`}>{ch.status}</span></td>
                <td>{ch.totalQuantity}</td>
                <td>Rs {Number(ch.totalAmount).toFixed(2)}</td>
                <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {c.challans.length === 0 && <div className="empty">No challans yet.</div>}
      </div>
    </>
  );
}
