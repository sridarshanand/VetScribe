import { SECTIONS } from "../fields.js";

const MED_COLUMNS = [
  ["name", "Drug"],
  ["dose", "Dose"],
  ["route", "Route"],
  ["frequency", "Frequency"],
  ["duration", "Duration"],
];

function ListEditor({ id, items, onChange, placeholder }) {
  const set = (i, value) => onChange(items.map((x, idx) => (idx === i ? value : x)));
  return (
    <div className="list-editor">
      {items.map((item, i) => (
        <div className="list-row" key={i}>
          <input id={i === 0 ? id : undefined} value={item} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} aria-label={`Item ${i + 1}`} />
          <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label={`Remove item ${i + 1}`}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn small ghost" onClick={() => onChange([...items, ""])}>Add item</button>
    </div>
  );
}

function MedsEditor({ items, onChange }) {
  const set = (i, key, value) => onChange(items.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));
  return (
    <div className="list-editor">
      {items.map((med, i) => (
        <div className="med-row" key={i}>
          {MED_COLUMNS.map(([key, label]) => (
            <input key={key} value={med[key] || ""} placeholder={label} aria-label={`${label} for medication ${i + 1}`} onChange={(e) => set(i, key, e.target.value)} />
          ))}
          <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn small ghost" onClick={() => onChange([...items, { name: "", dose: "", route: "", frequency: "", duration: "" }])}>Add medication</button>
    </div>
  );
}

export default function RecordForm({ record, setRecord, onSave, onReset, saving, errors }) {
  const flags = record.flagged_fields || [];
  const flagMap = Object.fromEntries(flags.map((f) => [f.field, f.reason]));
  const evidence = record.ai_extraction?.evidence || {};
  const fromAi = Boolean(record.ai_extraction?.evidence);

  const dropFlag = (r, key) => (r.flagged_fields || []).filter((f) => f.field !== key);
  // Editing a flagged field counts as reviewing it.
  const update = (key, value) => setRecord((r) => ({ ...r, [key]: value, flagged_fields: dropFlag(r, key) }));
  const confirm = (key) => setRecord((r) => ({ ...r, flagged_fields: dropFlag(r, key) }));
  const confirmAll = () => setRecord((r) => ({ ...r, flagged_fields: [] }));

  const renderInput = (f) => {
    const value = record[f.key];
    const placeholder = f.placeholder || (fromAi ? "Not mentioned" : "");
    if (f.type === "list") return <ListEditor id={f.key} items={value} placeholder={f.placeholder} onChange={(v) => update(f.key, v)} />;
    if (f.type === "meds") return <MedsEditor items={value} onChange={(v) => update(f.key, v)} />;
    if (f.type === "textarea") return <textarea id={f.key} rows={3} value={value} placeholder={placeholder} onChange={(e) => update(f.key, e.target.value)} />;
    if (f.type === "select")
      return (
        <select id={f.key} value={value} onChange={(e) => update(f.key, e.target.value)}>
          {f.options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      );
    return (
      <input
        id={f.key}
        type={f.type || "text"}
        step={f.type === "number" ? "0.01" : undefined}
        min={f.type === "number" ? "0" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => update(f.key, e.target.value)}
      />
    );
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>2. Review, edit and save</h2>
        <span className={`pill ${record.status}`}>{record.status === "validated" ? "Validated" : "Draft"}</span>
      </div>

      {fromAi && (
        <p className="hint">
          These fields were extracted by AI. Empty fields were not mentioned in the note and were left blank on purpose.
          Highlighted fields need your review.
        </p>
      )}

      {flags.length > 0 && (
        <div className="flag-bar">
          <strong>{flags.length} field{flags.length > 1 ? "s" : ""} to review</strong>
          <button type="button" className="btn small ghost" onClick={confirmAll}>Mark all as correct</button>
        </div>
      )}

      {SECTIONS.map((section) => (
        <fieldset key={section.title}>
          <legend>{section.title}</legend>
          <div className="grid">
            {section.fields.map((f) => {
              const flagged = flagMap[f.key];
              return (
                <div key={f.key} className={`field ${f.wide ? "wide" : ""} ${flagged ? "flagged" : ""}`}>
                  <label htmlFor={f.key}>{f.label}{flagged && <span className="badge">Review</span>}</label>
                  {renderInput(f)}
                  {flagged && (
                    <div className="flag-note">
                      <span>{flagged}</span>
                      {evidence[f.key] && <em>From the note: "{evidence[f.key]}"</em>}
                      <button type="button" className="link" onClick={() => confirm(f.key)}>Looks correct</button>
                    </div>
                  )}
                  {errors?.[f.key] && <div className="field-error">{errors[f.key]}</div>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {record.original_text && (
        <details className="original">
          <summary>Original note ({record.source === "voice" ? "voice transcript" : "typed text"})</summary>
          <pre>{record.original_text}</pre>
        </details>
      )}

      <div className="actions">
        <button className="btn ghost" onClick={onReset} disabled={saving}>Start new record</button>
        <div className="spacer" />
        <button className="btn" onClick={() => onSave("draft")} disabled={saving}>{saving ? "Saving..." : "Save draft"}</button>
        <button className="btn primary" onClick={() => onSave("validated")} disabled={saving}>Validate and save</button>
      </div>
    </section>
  );
}
