import { useEffect, useState } from "react";
import { api } from "./api.js";
import { emptyRecord, fromApi, toPayload } from "./fields.js";
import InputPanel from "./components/InputPanel.jsx";
import RecordForm from "./components/RecordForm.jsx";
import RecordsList from "./components/RecordsList.jsx";

export default function App() {
  const [view, setView] = useState("new");
  const [text, setText] = useState("");
  const [source, setSource] = useState("text");
  const [record, setRecord] = useState(null);
  const [alert, setAlert] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Friendly startup check: is the backend, database and API key OK?
  useEffect(() => {
    api.health()
      .then((h) => {
        if (!h.database) setAlert({ type: "error", message: "Django is running but cannot open the database. Check the database settings in backend/.env." });
        else if (!h.openai_key_configured) setAlert({ type: "warning", message: "OPENAI_API_KEY is not set in backend/.env. Voice and extraction will not work until you add it and restart Django." });
      })
      .catch((err) => setAlert({ type: "error", message: err.message }));
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const onExtracted = (result, originalText, src) => {
    setRecord({
      ...fromApi(result.fields),
      flagged_fields: result.flagged_fields,
      ai_extraction: { evidence: result.evidence, extracted_fields: result.fields },
      original_text: originalText,
      source: src,
      status: "draft",
    });
    setErrors({});
    setTimeout(() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const save = async (status) => {
    setSaving(true);
    setErrors({});
    const payload = toPayload({ ...record, status });
    try {
      const saved = record.id ? await api.updateRecord(record.id, payload) : await api.createRecord(payload);
      setRecord(fromApi(saved));
      setRefreshKey((k) => k + 1);
      setAlert({ type: "success", message: status === "validated" ? "Record validated and saved to the database." : "Draft saved to the database." });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setAlert({ type: "error", message: err.message });
    } finally {
      setSaving(false);
      scrollTop();
    }
  };

  const reset = () => {
    setRecord(null);
    setText("");
    setSource("text");
    setErrors({});
    setAlert(null);
    scrollTop();
  };

  const openRecord = (r) => {
    setRecord(fromApi(r));
    setErrors({});
    setAlert(null);
    setView("new");
    setTimeout(() => document.getElementById("review")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">V</span>
          <div>
            <h1>VetVoice</h1>
            <p>Speak or paste a visit note. Review the structured record. Save it.</p>
          </div>
        </div>
        <nav aria-label="Main">
          <button className={view === "new" ? "tab active" : "tab"} onClick={() => setView("new")}>New record</button>
          <button className={view === "records" ? "tab active" : "tab"} onClick={() => setView("records")}>Saved records</button>
        </nav>
      </header>

      <main>
        {alert && (
          <div className={`alert ${alert.type}`} role={alert.type === "error" ? "alert" : "status"}>
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)} aria-label="Dismiss message">Dismiss</button>
          </div>
        )}

        <div hidden={view !== "new"}>
          <InputPanel text={text} setText={setText} source={source} setSource={setSource} onExtracted={onExtracted} setAlert={setAlert} />
          <div id="review">
            {record ? (
              <RecordForm record={record} setRecord={setRecord} onSave={save} onReset={reset} saving={saving} errors={errors} />
            ) : (
              <p className="empty">Your extracted fields will appear here. You can also <button className="link" onClick={() => setRecord(emptyRecord())}>fill in a record by hand</button>.</p>
            )}
          </div>
        </div>

        {view === "records" && <RecordsList onOpen={openRecord} setAlert={setAlert} refreshKey={refreshKey} />}
      </main>

      <footer>AI output can be wrong. A veterinarian must review every record before it is relied on.</footer>
    </div>
  );
}
