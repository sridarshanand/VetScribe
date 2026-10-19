// One place that describes every field shown in the form.
const SEX = [["", "Not stated"], ["male", "Male"], ["female", "Female"], ["unknown", "Unknown"]];
const REPRO = [["", "Not stated"], ["intact", "Intact"], ["neutered", "Neutered / spayed"], ["unknown", "Unknown"]];
const UNIT = [["", "Unit"], ["kg", "kg"], ["lb", "lb"]];

export const SECTIONS = [
  {
    title: "Patient",
    fields: [
      { key: "animal_name", label: "Animal name" },
      { key: "species", label: "Species", placeholder: "e.g. Dog, Cat, Rabbit" },
      { key: "breed", label: "Breed" },
      { key: "age", label: "Age", placeholder: "e.g. 3 years" },
      { key: "sex", label: "Sex", type: "select", options: SEX },
      { key: "reproductive_status", label: "Neutered status", type: "select", options: REPRO },
      { key: "weight_value", label: "Weight", type: "number" },
      { key: "weight_unit", label: "Weight unit", type: "select", options: UNIT },
      { key: "color_markings", label: "Colour / markings" },
      { key: "microchip_id", label: "Microchip ID" },
    ],
  },
  {
    title: "Owner",
    fields: [
      { key: "owner_name", label: "Owner name" },
      { key: "owner_phone", label: "Owner phone" },
      { key: "owner_email", label: "Owner email", type: "email" },
      { key: "owner_address", label: "Owner address", type: "textarea", wide: true },
    ],
  },
  {
    title: "Visit",
    fields: [
      { key: "visit_date", label: "Visit date", type: "date" },
      { key: "veterinarian_name", label: "Veterinarian" },
      { key: "reason_for_visit", label: "Reason for visit", type: "textarea", wide: true },
    ],
  },
  {
    title: "History and symptoms",
    fields: [
      { key: "symptoms", label: "Symptoms", type: "list", wide: true, placeholder: "e.g. Vomiting" },
      { key: "symptom_duration", label: "Symptom duration" },
      { key: "medical_history", label: "Medical history", type: "textarea", wide: true },
      { key: "vaccination_history", label: "Vaccination history", type: "textarea", wide: true },
      { key: "allergies", label: "Allergies", type: "textarea", wide: true },
      { key: "diet", label: "Diet", type: "textarea", wide: true },
    ],
  },
  {
    title: "Examination",
    fields: [
      { key: "temperature", label: "Temperature" },
      { key: "heart_rate", label: "Heart rate" },
      { key: "respiratory_rate", label: "Respiratory rate" },
      { key: "physical_exam", label: "Physical exam findings", type: "textarea", wide: true },
    ],
  },
  {
    title: "Diagnosis and plan",
    fields: [
      { key: "diagnosis", label: "Diagnosis", type: "textarea", wide: true },
      { key: "tests", label: "Tests and results", type: "list", wide: true, placeholder: "e.g. CBC - results pending" },
      { key: "procedures", label: "Procedures", type: "textarea", wide: true },
      { key: "treatment", label: "Treatment", type: "textarea", wide: true },
      { key: "medications", label: "Medications", type: "meds", wide: true },
      { key: "follow_up", label: "Follow-up", type: "textarea", wide: true },
      { key: "owner_instructions", label: "Instructions to owner", type: "textarea", wide: true },
      { key: "additional_notes", label: "Additional notes", type: "textarea", wide: true },
    ],
  },
];

export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const EXTRA_LABELS = { status: "Status", flagged_fields: "Flagged fields", non_field_errors: "Error", detail: "Error" };
export const labelFor = (key) => ALL_FIELDS.find((f) => f.key === key)?.label || EXTRA_LABELS[key] || key;

export const emptyRecord = () => {
  const rec = {};
  for (const f of ALL_FIELDS) rec[f.key] = f.type === "list" || f.type === "meds" ? [] : "";
  return { ...rec, status: "draft", source: "text", original_text: "", flagged_fields: [], ai_extraction: {} };
};

// API -> form: null becomes "" so inputs stay controlled.
export const fromApi = (data) => {
  const rec = { ...emptyRecord(), ...data };
  for (const k of ["weight_value", "visit_date"]) if (rec[k] === null || rec[k] === undefined) rec[k] = "";
  return rec;
};

// form -> API: tidy values before saving.
export const toPayload = (rec) => {
  const out = { ...rec };
  out.weight_value = rec.weight_value === "" ? null : rec.weight_value;
  out.visit_date = rec.visit_date === "" ? null : rec.visit_date;
  out.symptoms = (rec.symptoms || []).map((s) => s.trim()).filter(Boolean);
  out.tests = (rec.tests || []).map((s) => s.trim()).filter(Boolean);
  out.medications = (rec.medications || []).filter((m) => Object.values(m).some((v) => String(v || "").trim()));
  delete out.id;
  delete out.created_at;
  delete out.updated_at;
  return out;
};
