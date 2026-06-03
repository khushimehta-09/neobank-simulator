import React, { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import api from "../services/api";
import { formatDateTime } from "../utils/time";

function maskLast4(value) {
  const last4 = String(value || "")
    .replace(/\D/g, "")
    .slice(-4);
  return last4 ? `****${last4}` : "-";
}
function ReceiptDetails({ r }) {
  const type = String(r.type || "").toLowerCase();
  const direction = String(r.direction || "").toLowerCase();
  const name = r.counterpartyName || r.receiverName || "-";
  const refLabel = type === "chat_payment" ? "Chat Ref" : "Ref";

  if (type === "bank_transfer") {
    const isReceived = direction === "received";
    const accountLast4 =
      r.counterpartyAccountLast4 ||
      (isReceived ? r.senderAccountLast4 : r.receiverAccount);
    return (
      <>
        <p className="text-sm text-text-muted mt-2">Type: bank_transfer</p>
        <p className="text-sm text-text-muted">
          {isReceived ? "Received from" : "Sent to"}: {name}
        </p>
        <p className="text-sm text-text-muted">
          {isReceived ? "Sender A/c" : "Receiver A/c"}:{" "}
          {maskLast4(accountLast4)}
        </p>
        <p className="text-sm text-text-muted">
          Bank:{" "}
          {isReceived ? r.senderBank || "NeoBank" : r.receiverBank || "NeoBank"}
        </p>
        <p className="text-xs text-text-muted mt-3">
          {refLabel}: {r.referenceId}
        </p>
        <p className="text-xs text-text-muted">{formatDateTime(r.createdAt)}</p>
      </>
    );
  }

  if (type === "chat_payment") {
    const isReceived = direction === "received";
    return (
      <>
        <p className="text-sm text-text-muted mt-2">Type: chat_payment</p>
        <p className="text-sm text-text-muted">
          {isReceived ? "Received from" : "Sent to"}: {name}
        </p>
        <p className="text-sm text-text-muted">Via: Chat Pay</p>
        {r.note && <p className="text-sm text-text-muted">Note: {r.note}</p>}
        <p className="text-xs text-text-muted mt-3">
          {refLabel}: {r.referenceId}
        </p>
        <p className="text-xs text-text-muted">{formatDateTime(r.createdAt)}</p>
      </>
    );
  }
  if (type === "split_bill") {
    return (
      <>
        <p className="text-sm text-text-muted mt-2">Type: split_bill</p>

        <p className="text-sm text-text-muted">Bill: {r.billName}</p>

        <p className="text-sm text-text-muted">
          Total Bill: ₹{Number(r.totalAmount || 0).toLocaleString("en-IN")}
        </p>

        <p className="text-sm text-text-muted">
          My Share: ₹{Number(r.myShare || 0).toLocaleString("en-IN")}
        </p>

        <p className="text-sm text-text-muted">Paid To: {r.receiverName}</p>

        {r.note && <p className="text-sm text-text-muted">Note: {r.note}</p>}

        <p className="text-xs text-text-muted mt-3">Ref: {r.referenceId}</p>

        <p className="text-xs text-text-muted">{formatDateTime(r.createdAt)}</p>
      </>
    );
  }

  if (type === "bill_payment") {
    return (
      <>
        <p className="text-sm text-text-muted mt-2">Type: bill_payment</p>
        <p className="text-sm text-text-muted">
          Paid to: {r.receiverName || "-"}
        </p>
        <p className="text-sm text-text-muted">
          Bank: {r.receiverBank || "NeoBank"}
        </p>
        {r.note && <p className="text-sm text-text-muted">Note: {r.note}</p>}
        <p className="text-xs text-text-muted mt-3">Ref: {r.referenceId}</p>
        <p className="text-xs text-text-muted">{formatDateTime(r.createdAt)}</p>
      </>
    );
  }

  return (
    <>
      <p className="text-sm text-text-muted mt-2">Type: {r.type}</p>
      <p className="text-sm text-text-muted">
        {direction === "received" ? "Received from" : "Sent to"}: {name}
      </p>
      <p className="text-sm text-text-muted">
        Bank: {r.receiverBank || "NeoBank"}
      </p>
      <p className="text-xs text-text-muted mt-3">Ref: {r.referenceId}</p>
      <p className="text-xs text-text-muted">{formatDateTime(r.createdAt)}</p>
    </>
  );
}

export default function Receipts() {
  const [receipts, setReceipts] = useState([]),
    [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get("/transactions/receipts");
      setReceipts(r.data.receipts || []);
    } catch (e) {
      alert(e.response?.data?.error || "Could not load receipts");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-black flex gap-3">
            <FileText className="text-primary" />
            Receipts
          </h1>
          <p className="text-text-muted text-sm">
            Stored online receipts for transfers and bill payments.
          </p>
        </div>
        <button onClick={load} className="p-3 bg-white/5 rounded-xl">
          <RefreshCw />
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : receipts.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl text-center">
          No receipts yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {receipts.map((r) => (
            <div
              key={r.id}
              className="glass-panel p-5 rounded-2xl border border-white/5"
            >
              <div className="flex justify-between">
                <b>{r.receiptNumber}</b>
                <span className="text-success text-xs font-bold">
                  COMPLETED
                </span>
              </div>
              <p className="text-2xl font-black mt-3">
                ₹{Number(r.amount).toLocaleString("en-IN")}
              </p>
              <ReceiptDetails r={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
