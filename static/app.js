const API="/api";
const SEX=[["","Not stated"],["male","Male"],["female","Female"],["unknown","Unknown"]];
const REPRO=[["","Not stated"],["intact","Intact"],["neutered","Neutered / spayed"],["unknown","Unknown"]];
const UNIT=[["","Unit"],["kg","kg"],["lb","lb"]];
const SECTIONS=[
["Patient",[["animal_name","Animal name"],["species","Species","Dog, Cat, Rabbit"],["breed","Breed"],["age","Age","3 years"],["sex","Sex","select",SEX],["reproductive_status","Neutered status","select",REPRO],["weight_value","Weight","number"],["weight_unit","Weight unit","select",UNIT],["color_markings","Colour / markings"],["microchip_id","Microchip ID"]]],
["Owner",[["owner_name","Owner name"],["owner_phone","Owner phone"],["owner_email","Owner email","email"],["owner_address","Owner address","textarea","wide"]]],
["Visit",[["visit_date","Visit date","date"],["veterinarian_name","Veterinarian"],["reason_for_visit","Reason for visit","textarea","wide"]]],
["History and symptoms",[["symptoms","Symptoms","list","wide","e.g. Vomiting"],["symptom_duration","Symptom duration"],["medical_history","Medical history","textarea","wide"],["vaccination_history","Vaccination history","textarea","wide"],["allergies","Allergies","textarea","wide"],["diet","Diet","textarea","wide"]]],
["Examination",[["temperature","Temperature"],["heart_rate","Heart rate"],["respiratory_rate","Respiratory rate"],["physical_exam","Physical exam findings","textarea","wide"]]],
["Diagnosis and plan",[["diagnosis","Diagnosis","textarea","wide"],["tests","Tests and results","list","wide","e.g. CBC - results pending"],["procedures","Procedures","textarea","wide"],["treatment","Treatment","textarea","wide"],["medications","Medications","meds","wide"],["follow_up","Follow-up","textarea","wide"],["owner_instructions","Instructions to owner","textarea","wide"],["additional_notes","Additional notes","textarea","wide"]]]
];
const LIST_KEYS=["symptoms","tests"], MED_KEYS=["medications"];
let record=null, samples=[], mediaRecorder=null, chunks=[], timer=null, seconds=0;

const $=id=>document.getElementById(id);
function showAlert(type,msg){const a=$("alert");a.className="alert "+type;$("alert-text").textContent=msg;a.hidden=false;}
function hideAlert(){$("alert").hidden=true;}
function emptyRecord(){const r={};for(const[,fs] of SECTIONS)for(const f of fs)r[f[0]]=LIST_KEYS.includes(f[0])||MED_KEYS.includes(f[0])?[]:"";
return {...r,status:"draft",source:"text",original_text:"",flagged_fields:[],ai_extraction:{}};}
async function api(path,options={}){let res;try{res=await fetch(API+path,options)}catch(e){throw new Error("Cannot reach the backend. Start Django with: python manage.py runserver")}
const raw=await res.text();let data=null;try{data=raw?JSON.parse(raw):null}catch(e){}
if(!res.ok){const msg=data?.error||data?.detail||(data?JSON.stringify(data):"Server error");throw new Error(msg)}return data;}
function json(method,body){return{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}}

async function loadSamples(){try{samples=await api("/samples/");const s=$("sample");samples.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.title;s.appendChild(o)})}catch(e){}}
$("sample").onchange=e=>{const s=samples.find(x=>String(x.id)===e.target.value);if(s){$("note").value=s.text;e.target.value=""}};

function renderForm(){const c=$("fields");c.innerHTML="";const flags=record.flagged_fields||[];const flagMap=Object.fromEntries(flags.map(f=>[f.field,f.reason]));
const evidence=record.ai_extraction?.evidence||{};
for(const [title,fields] of SECTIONS){const fs=document.createElement("fieldset");fs.innerHTML=`<legend>${title}</legend>`;const grid=document.createElement("div");grid.className="grid";
for(const f of fields){const [key,label,type,opt,ph]=f;const wrap=document.createElement("div");wrap.className="field"+((opt==="wide")?" wide":"")+(flagMap[key]?" flagged":"");
const lab=document.createElement("label");lab.htmlFor=key;lab.textContent=label;if(flagMap[key]){const b=document.createElement("span");b.className="badge";b.textContent="Review";lab.appendChild(b)}
wrap.appendChild(lab);let input;
if(type==="select"){input=document.createElement("select");input.id=key;for(const [v,t] of opt){const o=document.createElement("option");o.value=v;o.textContent=t;input.appendChild(o)}input.value=record[key]||""}
else if(type==="textarea"){input=document.createElement("textarea");input.id=key;input.rows=3;input.value=record[key]||"";input.placeholder=ph||"Not mentioned"}
else if(type==="list"){input=document.createElement("div");input.className="list-editor";renderList(input,key,ph)}
else if(type==="meds"){input=document.createElement("div");input.className="list-editor";renderMeds(input)}
else{input=document.createElement("input");input.id=key;input.type=type||"text";if(type==="number")input.step="0.01",input.min="0";input.value=record[key]??"";input.placeholder=ph||"Not mentioned"}
if(type!=="list"&&type!=="meds")input.onchange=e=>updateField(key,e.target.value);
wrap.appendChild(input);
if(flagMap[key]){const note=document.createElement("div");note.className="flag-note";note.innerHTML=`${flagMap[key]} ${evidence[key]?`<em>From the note: "${evidence[key]}"</em>`:""} `;const b=document.createElement("button");b.className="link";b.textContent="Looks correct";b.onclick=()=>{record.flagged_fields=record.flagged_fields.filter(x=>x.field!==key);renderForm()};note.appendChild(b);wrap.appendChild(note)}
grid.appendChild(wrap)}
fs.appendChild(grid);c.appendChild(fs)}
$("status-pill").textContent=record.status==="validated"?"Validated":"Draft";$("status-pill").className="pill "+record.status;
const n=flags.length;$("flag-bar").hidden=!n;$("flag-count").textContent=`${n} field${n===1?"":"s"} to review`;
if(record.original_text){$("original-wrap").hidden=false;$("original-text").textContent=record.original_text}else $("original-wrap").hidden=true;
$("form-card").hidden=false;}

function renderList(container,key,ph){container.innerHTML="";(record[key]||[]).forEach((val,i)=>{const row=document.createElement("div");row.className="list-row";const inp=document.createElement("input");inp.value=val;inp.placeholder=ph||"";inp.onchange=e=>{record[key][i]=e.target.value};const b=document.createElement("button");b.className="icon-btn";b.textContent="Remove";b.onclick=()=>{record[key].splice(i,1);renderForm()};row.append(inp,b);container.appendChild(row)});
const add=document.createElement("button");add.className="btn small ghost";add.textContent="Add item";add.onclick=()=>{record[key].push("");renderForm()};container.appendChild(add)}

function renderMeds(container){container.innerHTML="";const cols=[["name","Drug"],["dose","Dose"],["route","Route"],["frequency","Frequency"],["duration","Duration"]];
(record.medications||[]).forEach((med,i)=>{const row=document.createElement("div");row.className="med-row";for(const [k,label] of cols){const inp=document.createElement("input");inp.value=med[k]||"";inp.placeholder=label;inp.onchange=e=>{record.medications[i][k]=e.target.value};row.appendChild(inp)}
const b=document.createElement("button");b.className="icon-btn";b.textContent="Remove";b.onclick=()=>{record.medications.splice(i,1);renderForm()};row.appendChild(b);container.appendChild(row)});
const add=document.createElement("button");add.className="btn small ghost";add.textContent="Add medication";add.onclick=()=>{record.medications.push({name:"",dose:"",route:"",frequency:"",duration:""});renderForm()};container.appendChild(add)}

function updateField(key,value){record[key]=value;record.flagged_fields=(record.flagged_fields||[]).filter(f=>f.field!==key);renderForm()}

async function extract(){const text=$("note").value.trim();if(text.length<15)return showAlert("error","Please enter a longer note (at least 15 characters).");
const btn=$("extract-btn");btn.disabled=true;btn.textContent="Extracting...";hideAlert();
try{const result=await api("/extract/",json("POST",{text,source:record?.source||"text"}));
record={...emptyRecord(),...result.fields,flagged_fields:result.flagged_fields,ai_extraction:{evidence:result.evidence,extracted_fields:result.fields},original_text:text,source:record?.source||"text",status:"draft"};
const n=result.flagged_fields.length;showAlert(n?"warning":"success",n?`Fields extracted. ${n} need review.`:"Fields extracted. Please review before saving.");renderForm();window.scrollTo({top:$("form-card").offsetTop-20,behavior:"smooth"})}
catch(e){showAlert("error",e.message)}finally{btn.disabled=false;btn.textContent="Extract fields"}}

async function transcribe(blob,filename){const btn=$("record-btn");btn.disabled=true;$("record-status").hidden=false;$("record-status").textContent="Converting your voice to text...";
try{const fd=new FormData();fd.append("audio",blob,filename);const r=await api("/transcribe/",{method:"POST",body:fd});
const heard=r.text;const old=$("note").value.trim();$("note").value=old?old+"\n\n"+heard:heard;
if($("auto-extract").checked){record=record||emptyRecord();record.source="voice";await extract()}else showAlert("success","Transcription added. Press Extract fields.")}
catch(e){showAlert("error",e.message)}finally{btn.disabled=false;$("record-status").hidden=true}}

$("record-btn").onclick=async()=>{if(mediaRecorder&&mediaRecorder.state==="recording"){mediaRecorder.stop();return}
try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(m=>MediaRecorder.isTypeSupported(m));
mediaRecorder=new MediaRecorder(stream,mime?{mime}:undefined);chunks=[];mediaRecorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
mediaRecorder.onstop=()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());$("record-btn").classList.remove("live");$("record-btn").innerHTML='<span class="dot"></span> Record voice';
transcribe(new Blob(chunks,{type:mediaRecorder.mimeType||"audio/webm"}),"recording.webm")};
mediaRecorder.start();seconds=0;$("record-btn").classList.add("live");$("record-btn").innerHTML='<span class="dot"></span> Stop recording 00:00';
timer=setInterval(()=>{seconds++;const m=String(Math.floor(seconds/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");$("record-btn").innerHTML=`<span class="dot"></span> Stop recording ${m}:${s}`},1000)}
catch(e){showAlert("error","Could not access the microphone. Allow microphone access in your browser.")}};

$("upload-btn").onclick=()=>$("audio-file").click();
$("audio-file").onchange=e=>{const f=e.target.files[0];if(f)transcribe(f,f.name);e.target.value=""};
$("extract-btn").onclick=extract;
$("clear-btn").onclick=()=>{$("note").value=""};
$("confirm-all").onclick=()=>{record.flagged_fields=[];renderForm()};
$("reset-btn").onclick=()=>{record=null;$("form-card").hidden=true;$("note").value="";hideAlert()};
async function save(status){if(!record)return showAlert("error","Extract fields or fill in a record first.");
const payload={...record,status};payload.weight_value=payload.weight_value===""?null:payload.weight_value;payload.visit_date=payload.visit_date===""?null:payload.visit_date;
payload.symptoms=(payload.symptoms||[]).map(x=>x.trim()).filter(Boolean);payload.tests=(payload.tests||[]).map(x=>x.trim()).filter(Boolean);
payload.medications=(payload.medications||[]).filter(m=>Object.values(m).some(v=>String(v||"").trim()));delete payload.id;delete payload.created_at;delete payload.updated_at;
try{const saved=record.id?await api(`/records/${record.id}/`,json("PUT",payload)):await api("/records/",json("POST",payload));
record={...emptyRecord(),...saved};renderForm();showAlert("success",status==="validated"?"Record validated and saved.":"Draft saved.");loadRecords($("search").value)}
catch(e){showAlert("error",e.message)}}
$("save-draft").onclick=()=>save("draft");$("save-validated").onclick=()=>save("validated");

function showView(v){$("new-view").hidden=v!=="new";$("records-view").hidden=v!=="records";
$("tab-new").classList.toggle("active",v==="new");$("tab-records").classList.toggle("active",v==="records");if(v==="records")loadRecords($("search").value)}
$("tab-new").onclick=()=>showView("new");$("tab-records").onclick=()=>showView("records");

async function loadRecords(search=""){const box=$("records-list");box.innerHTML='<p class="hint">Loading records...</p>';
try{const rows=await api(`/records/?search=${encodeURIComponent(search)}`);box.innerHTML="";
if(!rows.length){box.innerHTML='<p class="empty">No records found.</p>';return}
rows.forEach(r=>{const item=document.createElement("article");item.className="record-item";
item.innerHTML=`<div><h3>${r.animal_name||"Unnamed animal"} <span class="pill ${r.status}">${r.status}</span></h3><p>${[r.species,r.breed,r.age].filter(Boolean).join(" - ")||"No patient details"}</p><p class="muted">Owner: ${r.owner_name||"not recorded"} | Diagnosis: ${r.diagnosis||"not recorded"}</p></div>`;
const actions=document.createElement("div");actions.className="item-actions";
const open=document.createElement("button");open.className="btn small";open.textContent="Open";open.onclick=()=>{record={...emptyRecord(),...r};showView("new");renderForm()};
const del=document.createElement("button");del.className="btn small danger";del.textContent="Delete";del.onclick=async()=>{if(!confirm(`Delete record for ${r.animal_name||"this animal"}?`))return;await api(`/records/${r.id}/`,{method:"DELETE"});loadRecords(search)};
actions.append(open,del);item.appendChild(actions);box.appendChild(item)})}
catch(e){box.innerHTML="";showAlert("error",e.message)}}
let searchTimer;$("search").oninput=e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadRecords(e.target.value),250)};

(async()=>{await loadSamples();try{const h=await api("/health/");if(!h.database)showAlert("error","Django cannot open the database.");
else if(!h.openai_key_configured)showAlert("warning","OPENAI_API_KEY is not set in backend/.env. Add your Groq key and restart Django.")}catch(e){showAlert("error",e.message)}})();
