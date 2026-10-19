import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function RecordsList({ onOpen, setAlert, refreshKey }) {
  const [records, setRecords] = useState(null);
  const [search, setSearch] = useState("");

  const load = async (term) => {
    try {
      setRecords(await api.listRecords(term));
    } catch (err) {
      setRecords([]);
      setAlert({ type: "error", message: err.message });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => load(search), 250);
    return () => clearTimeout(timer);
  }, [search, refreshKey]);

  const remove = async (record) => {
    if (!window.confirm(`Delete the record for ${record.animal_name || "this animal"}? This cannot be undone.`)) return;
    try {
      await api.deleteRecord(record.id);
      setAlert({ type: "success", message: "Record deleted." });
      load(search);
    } catch (err) {
      setAlert({ type: "error", message: err.message });
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>Saved records</h2>
        <input className="search" type="search" placeholder="Search name, owner, species, diagnosis" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search records" />
      </div>
      {records === null && <p className="hint"><span className="spinner" /> Loading records...</p>}
      {records && records.length === 0 && <p className="empty">No records found. Create one from the "New record" tab, or run <code>python manage.py load_samples</code>.</p>}
      <div className="record-list">
        {(records || []).map((r) => (
          <article className="record-item" key={r.id}>
            <div>
              <h3>{r.animal_name || "Unnamed animal"} <span className={`pill ${r.status}`}>{r.status}</span></h3>
              <p>{[r.species, r.breed, r.age].filter(Boolean).join(" - ") || "No patient details"}</p>
              <p className="muted">Owner: {r.owner_name || "not recorded"} | Diagnosis: {r.diagnosis || "not recorded"}</p>
              <p className="muted">Updated {new Date(r.updated_at).toLocaleString()}</p>
            </div>
            <div className="item-actions">
              <button className="btn small" onClick={() => onOpen(r)}>Open</button>
              <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
