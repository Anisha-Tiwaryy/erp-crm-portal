import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ErrorBox } from "../components/Layout";

interface Line { productId: string; quantity: string; }

export default function ChallanCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1" }]);
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCustomers((await api("/api/customers?limit=100")).data);
        setProducts((await api("/api/products?limit=100")).data);
      } catch (e) { setError(e); }
    })();
  }, []);

  const priceOf = (id: string) => Number(products.find((p) => p.id === id)?.unitPrice ?? 0);
  const stockOf = (id: string) => products.find((p) => p.id === id)?.currentStock ?? 0;

  const total = lines.reduce((sum, l) => sum + priceOf(l.productId) * (Number(l.quantity) || 0), 0);
  const totalQty = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit(status: "DRAFT" | "CONFIRMED") {
    setError(null); setBusy(true);
    try {
      const payload = {
        customerId,
        status,
        ...(remarks ? { remarks } : {}),
        items: lines
          .filter((l) => l.productId && Number(l.quantity) > 0)
          .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      };
      await api("/api/challans", { method: "POST", body: payload });
      navigate("/challans");
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="topbar"><h2>New Sales Challan</h2></div>
      <ErrorBox error={error} />

      <div className="panel">
        <div className="grid">
          <div>
            <label>Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName || c.name} — {c.mobile} ({c.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Line Items</h3>
        <table>
          <thead>
            <tr><th style={{ width: "45%" }}>Product</th><th>Available</th><th>Unit Price</th><th style={{ width: 110 }}>Quantity</th><th>Line Total</th><th></th></tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select value={l.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </td>
                <td>{l.productId ? stockOf(l.productId) : "-"}</td>
                <td>{l.productId ? `Rs ${priceOf(l.productId).toFixed(2)}` : "-"}</td>
                <td>
                  <input type="number" min="1" value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })} />
                </td>
                <td>Rs {(priceOf(l.productId) * (Number(l.quantity) || 0)).toFixed(2)}</td>
                <td>
                  {lines.length > 1 && (
                    <button className="link" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 14 }}>
          <button className="secondary" onClick={() => setLines([...lines, { productId: "", quantity: "1" }])}>
            Add another product
          </button>
        </div>

        <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div><strong>Total quantity:</strong> {totalQty}</div>
          <div style={{ fontSize: 18, marginTop: 4 }}><strong>Total amount: Rs {total.toFixed(2)}</strong></div>
        </div>

        <div className="row" style={{ marginTop: 18 }}>
          <button className="secondary" disabled={busy || !customerId} onClick={() => submit("DRAFT")}>
            Save as Draft
          </button>
          <button disabled={busy || !customerId} onClick={() => submit("CONFIRMED")}>
            Save &amp; Confirm (deducts stock)
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          A draft reserves nothing. Confirming deducts stock inside a single transaction and
          will be rejected if any line exceeds available quantity.
        </div>
      </div>
    </>
  );
}
