Pramataagentlibrary · JSX
import { useState, useEffect } from "react";
 
const NAVY  = "#023049";
const CORAL = "#E94728";
const STEEL = "#31728C";
const TAN   = "#DFDCCE";
const WHITE = "#FFFFFF";
const LIGHT = "#F5F3EE";
 
const SEED_SOLUTIONS = [
  "Marketing", "Termination for Convenience", "Risk & Compliance",
  "Document Processing", "Data Rights", "Renewal Intelligence",
  "Pricing & Discounts", "Authorized Users",
];
 
const AGENT_TYPES = [
  "Account Assist", "Contract Request Assist", "Contract Request Form Assist",
  "CRM Assist", "Custom Agentic Solutions", "Digitization", "Drafting Assist",
  "Playbook and CAM Creator", "Report Assist", "Word Add-in",
];
 
const CONTEXT_MODES = [
  { value: "ALL-DOCS", label: "ALL-DOCS", tip: "Use for Account Assist" },
  { value: "DOC-AT-A-TIME", label: "DOC-AT-A-TIME", tip: "Use for CAS Reporting" },
];
 
// ── STOP GATE ─────────────────────────────────────────────────────────────────
// SEED_AGENTS only loads when JSONBin has no data yet (first run, or no credentials set).
// Once connected, all agents live in JSONBin and are loaded from there on every session.
// To persist agent edits: edit in the Admin UI → changes auto-save to JSONBin.
// SEED prompt content stays empty — real prompts live in JSONBin only.
const SEED_AGENTS = [
  {
    id: "agent-001", name: "TFC Classification Agent",
    solution: "Termination for Convenience", agentTypes: ["Report Assist"], contextMode: "DOC-AT-A-TIME",
    downloads: 0, useCase: "Classifies Termination for Convenience clauses into six standardized AI TFC values.",
    clientTags: [],
    prompts: [
      { id: "p1", label: "Per-Document Extraction",      type: "markdown", content: "" },
      { id: "p2", label: "Account-Level Classification", type: "markdown", content: "" },
    ],
    config: { llmTier: "Reasoning", model: "Sonnet (32K)", notes: "" },
    version: "1.0", createdAt: "2025-11-12", updatedAt: "2025-11-12",
  },
  {
    id: "agent-002", name: "Page Sequence Analyzer",
    solution: "Document Processing", agentTypes: ["Digitization"], contextMode: "DOC-AT-A-TIME",
    downloads: 0, useCase: "Analyzes multi-page contract PDFs and assigns a structured page sequence with document type labels.",
    clientTags: [],
    prompts: [
      { id: "p1", label: "Page Marker Extraction", type: "markdown", content: "" },
      { id: "p2", label: "Sequence Assembly",      type: "markdown", content: "" },
    ],
    config: { llmTier: "Reasoning", model: "Sonnet (32K)", notes: "" },
    version: "1.0", createdAt: "2025-09-01", updatedAt: "2025-09-01",
  },
  {
    id: "agent-003", name: "High-Risk Contract Identifier",
    solution: "Risk & Compliance", agentTypes: ["Custom Agentic Solutions"], contextMode: "DOC-AT-A-TIME",
    downloads: 0, useCase: "Identifies high-risk contracts by flagging non-standard liability caps, uncapped indemnification, auto-renewal traps, or missing termination rights.",
    clientTags: [],
    prompts: [
      { id: "p1", label: "Risk Signal Extraction", type: "english", content: "" },
    ],
    config: { llmTier: "Balanced", model: "Haiku (8K)", notes: "" },
    version: "1.0", createdAt: "2025-12-05", updatedAt: "2025-12-05",
  },
  {
    id: "agent-004", name: "Marketing Consent Classifier",
    solution: "Marketing", agentTypes: ["Account Assist"], contextMode: "ALL-DOCS",
    downloads: 0, useCase: "Determines whether a customer has granted marketing consent across their agreement portfolio.",
    clientTags: [],
    prompts: [
      { id: "p1", label: "ALL-DOCS Consent Classification", type: "markdown", content: "" },
    ],
    config: { llmTier: "Light Reasoning", model: "Haiku (16K)", notes: "" },
    version: "1.0", createdAt: "2026-01-20", updatedAt: "2026-01-20",
  },
];
 
const SK = {
  solutions:   "agentlib-v9-solutions",
  clientNames: "agentlib-v9-clientnames",
};
 
// ── Firebase Realtime Database Config ─────────────────────────────────────────
// Hardcoded so every viewer of the shared link reads/writes the SAME database.
// RTDB REST API is plain JSON — no type wrapping needed like Firestore.
const FIREBASE_DB_URL = "https://pravesh-97f6a-default-rtdb.firebaseio.com";
const FIREBASE_DB_PATH = "";
 
function rtdbUrl() {
  return FIREBASE_DB_PATH
    ? `${FIREBASE_DB_URL}/${FIREBASE_DB_PATH}.json`
    : `${FIREBASE_DB_URL}/.json`;
}
 
// Lightweight reachability check — separate from fbLoad so we can tell
// "connected but empty" apart from "actually unreachable"
async function fbPing() {
  if (!FIREBASE_DB_URL) return false;
  try {
    const r = await fetch(`${FIREBASE_DB_URL}/.json?shallow=true`);
    return r.ok;
  } catch (e) {
    console.error("Firebase ping error:", e.message, e);
    return false;
  }
}
 
async function fbLoad() {
  if (!FIREBASE_DB_URL) return null;
  try {
    const r = await fetch(rtdbUrl());
    if (!r.ok) {
      console.error("Firebase load failed:", r.status, await r.text().catch(() => ""));
      return null;
    }
    const data = await r.json();
    return data; // null if path is empty, or the stored object
  } catch (e) {
    console.error("Firebase load error:", e.message, e);
    return null;
  }
}
 
async function fbSave(data) {
  if (!FIREBASE_DB_URL) return { ok: false, error: "No database URL configured" };
  try {
    const r = await fetch(rtdbUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("Firebase save failed:", r.status, text);
      return { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 150)}` };
    }
    return { ok: true, error: "" };
  } catch (e) {
    console.error("Firebase save error:", e.message, e);
    return { ok: false, error: e.message || "Network/CORS error — request never reached Firebase" };
  }
}
 
// ── window.storage helpers (non-agent data only) ──────────────────────────────
async function load(key, fallback) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; }
  catch { return fallback; }
}
async function persist(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}
 
const genId = () => "agent-" + Date.now();
const toDay = () => new Date().toISOString().slice(0, 10);
 
function exportCSV(rows, filename) {
  const csv = rows
    .map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
 
// ── ZIP / DOCX builder ───────────────────────────────────────────────────────
function buildZipBytes(fileMap) {
  const enc = new TextEncoder();
  function u8(s) { return enc.encode(s); }
 
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function w16(v, b, o) { b[o] = v & 0xFF; b[o + 1] = (v >> 8) & 0xFF; }
  function w32(v, b, o) {
    b[o] = v & 0xFF; b[o + 1] = (v >> 8) & 0xFF;
    b[o + 2] = (v >> 16) & 0xFF; b[o + 3] = (v >> 24) & 0xFF;
  }
 
  const now = new Date();
  const dt = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dd = (((now.getFullYear() - 1980) & 0x7F) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
 
  const entries = Object.entries(fileMap).map(([name, content]) => ({
    nb: u8(name),
    data: u8(content),
  }));
 
  const localSize  = entries.reduce((s, e) => s + 30 + e.nb.length + e.data.length, 0);
  const centralSize = entries.reduce((s, e) => s + 46 + e.nb.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  let pos = 0;
  const offsets = [];
 
  for (const e of entries) {
    offsets.push(pos);
    const crc = crc32(e.data);
    out[pos]=0x50; out[pos+1]=0x4B; out[pos+2]=0x03; out[pos+3]=0x04; pos += 4;
    w16(20, out, pos); pos += 2;
    w16(0,  out, pos); pos += 2;
    w16(0,  out, pos); pos += 2;
    w16(dt, out, pos); pos += 2;
    w16(dd, out, pos); pos += 2;
    w32(crc,          out, pos); pos += 4;
    w32(e.data.length, out, pos); pos += 4;
    w32(e.data.length, out, pos); pos += 4;
    w16(e.nb.length,  out, pos); pos += 2;
    w16(0,            out, pos); pos += 2;
    out.set(e.nb,   pos); pos += e.nb.length;
    out.set(e.data, pos); pos += e.data.length;
  }
 
  const centralStart = pos;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const crc = crc32(e.data);
    out[pos]=0x50; out[pos+1]=0x4B; out[pos+2]=0x01; out[pos+3]=0x02; pos += 4;
    w16(20, out, pos); pos += 2;
    w16(20, out, pos); pos += 2;
    w16(0,  out, pos); pos += 2;
    w16(0,  out, pos); pos += 2;
    w16(dt, out, pos); pos += 2;
    w16(dd, out, pos); pos += 2;
    w32(crc,           out, pos); pos += 4;
    w32(e.data.length,  out, pos); pos += 4;
    w32(e.data.length,  out, pos); pos += 4;
    w16(e.nb.length,   out, pos); pos += 2;
    w16(0, out, pos); pos += 2;
    w16(0, out, pos); pos += 2;
    w16(0, out, pos); pos += 2;
    w16(0, out, pos); pos += 2;
    w32(0,              out, pos); pos += 4;
    w32(offsets[i],     out, pos); pos += 4;
    out.set(e.nb, pos); pos += e.nb.length;
  }
 
  const centralEnd = pos;
  out[pos]=0x50; out[pos+1]=0x4B; out[pos+2]=0x05; out[pos+3]=0x06; pos += 4;
  w16(0, out, pos); pos += 2;
  w16(0, out, pos); pos += 2;
  w16(entries.length, out, pos); pos += 2;
  w16(entries.length, out, pos); pos += 2;
  w32(centralEnd - centralStart, out, pos); pos += 4;
  w32(centralStart,              out, pos); pos += 4;
  w16(0, out, pos);
 
  return out;
}
 
function makeDocxBytes(bodyXml) {
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;
  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${bodyXml}` +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>` +
    `</w:body></w:document>`;
  return buildZipBytes({
    "[Content_Types].xml":         ct,
    "_rels/.rels":                 rels,
    "word/_rels/document.xml.rels": wordRels,
    "word/document.xml":           doc,
  });
}
 
function xmlEsc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
 
function wHeading(text, sz, color) {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` +
    `<w:color w:val="${color}"/></w:rPr><w:t>${xmlEsc(text)}</w:t></w:r></w:p>`;
}
 
function wLabelValue(label, value) {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="31728C"/></w:rPr>` +
    `<w:t xml:space="preserve">${xmlEsc(label)}:  </w:t></w:r>` +
    `<w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>` +
    `<w:t>${xmlEsc(value)}</w:t></w:r></w:p>`;
}
 
function wDivider(color) {
  return `<w:p><w:pPr><w:spacing w:before="120" w:after="120"/>` +
    `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="${color || "DFDCCE"}"/></w:pBdr>` +
    `</w:pPr></w:p>`;
}
 
function wPara(text, sz) {
  const lines = String(text || "").split(/\r?\n/);
  const runs = lines.map((line, i) =>
    `<w:r><w:rPr><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>` +
    `<w:t xml:space="preserve">${xmlEsc(line)}</w:t></w:r>` +
    (i < lines.length - 1 ? "<w:br/>" : "")
  ).join("");
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr>${runs}</w:p>`;
}
 
function wPromptBox(content) {
  return String(content || "").split(/\r?\n/).map(line =>
    `<w:p><w:pPr><w:spacing w:before="0" w:after="40"/>` +
    `<w:shd w:val="clear" w:color="auto" w:fill="F5F3EE"/>` +
    `<w:pBdr><w:left w:val="single" w:sz="4" w:space="4" w:color="31728C"/></w:pBdr>` +
    `<w:ind w:left="180"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>` +
    `<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>` +
    `<w:t xml:space="preserve">${xmlEsc(line)}</w:t></w:r></w:p>`
  ).join("");
}
 
function dlPackage(agent) {
  try {
    const safe = s => String(s || "—").trim();
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
 
    // Description doc
    const descXml = [
      wHeading("Agent Package", 36, "023049"),
      wHeading(safe(agent.name), 32, "023049"),
      `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>`,
      wLabelValue("Solution",     safe(agent.solution)),
      wLabelValue("Agent Type",   safe(agent.agentType)),
      wLabelValue("Context Mode", safe(agent.contextMode)),
      wLabelValue("Version",      safe(agent.version)),
      wLabelValue("Created",      safe(agent.createdAt)),
      wLabelValue("Updated",      safe(agent.updatedAt)),
      wLabelValue("Exported",     date),
      wDivider(),
      wHeading("Use Case", 28, "023049"),
      wPara(safe(agent.useCase), 20),
      wDivider(),
      wHeading("Configuration", 28, "023049"),
      wLabelValue("LLM Tier", safe(agent.config?.llmTier)),
      agent.config?.notes
        ? wHeading("Notes", 22, "31728C") + wPara(safe(agent.config.notes), 20)
        : "",
      wDivider("E94728"),
      wPara("Pramata Agent Library  ·  Confidential", 16),
    ].join("");
 
    // Prompt docs
    const promptFiles = (agent.prompts || []).map((p, i) => {
      const safeName = String(p.label || `Prompt-${i + 1}`).replace(/[^a-zA-Z0-9]/g, "-");
      const xml = [
        wHeading("Agent Package", 36, "023049"),
        wHeading(safe(agent.name), 32, "023049"),
        `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>`,
        wLabelValue("Prompt", `${i + 1} of ${(agent.prompts || []).length}`),
        wLabelValue("Label",  safe(p.label)),
        wLabelValue("Type",   p.type === "markdown" ? "Markdown" : "Plain English"),
        wDivider(),
        wHeading("Prompt Content", 28, "023049"),
        `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr></w:p>`,
        wPromptBox(safe(p.content)),
        wDivider("E94728"),
        wPara("Pramata Agent Library  ·  Confidential", 16),
      ].join("");
      return { name: `prompt-${i + 1}-${safeName}.docx`, data: makeDocxBytes(xml) };
    });
 
    // Outer ZIP
    const allFiles = [
      { name: "agent-description.docx", data: makeDocxBytes(descXml) },
      ...promptFiles,
    ];
 
    const outerMap = {};
    for (const f of allFiles) {
      // Convert Uint8Array to string for the outer zip
      const str = Array.from(f.data).map(b => String.fromCharCode(b)).join("");
      outerMap[f.name] = str;
    }
 
    // Build outer zip directly with binary data
    const enc = new TextEncoder();
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTable[n] = c;
    }
    function crc32b(buf) {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
      return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function w16b(v, b, o) { b[o] = v & 0xFF; b[o+1] = (v>>8) & 0xFF; }
    function w32b(v, b, o) {
      b[o]=v&0xFF; b[o+1]=(v>>8)&0xFF; b[o+2]=(v>>16)&0xFF; b[o+3]=(v>>24)&0xFF;
    }
 
    const now2 = new Date();
    const dt2 = (now2.getHours() << 11) | (now2.getMinutes() << 5) | Math.floor(now2.getSeconds() / 2);
    const dd2 = (((now2.getFullYear()-1980)&0x7F) << 9) | ((now2.getMonth()+1) << 5) | now2.getDate();
 
    const bEntries = allFiles.map(f => ({ nb: enc.encode(f.name), data: f.data }));
    const lsz = bEntries.reduce((s,e) => s + 30 + e.nb.length + e.data.length, 0);
    const csz = bEntries.reduce((s,e) => s + 46 + e.nb.length, 0);
    const outer = new Uint8Array(lsz + csz + 22);
    let opos = 0; const ooffs = [];
 
    for (const e of bEntries) {
      ooffs.push(opos);
      const crc = crc32b(e.data);
      outer[opos]=0x50; outer[opos+1]=0x4B; outer[opos+2]=0x03; outer[opos+3]=0x04; opos+=4;
      w16b(20, outer, opos); opos+=2;
      w16b(0,  outer, opos); opos+=2;
      w16b(0,  outer, opos); opos+=2;
      w16b(dt2, outer, opos); opos+=2;
      w16b(dd2, outer, opos); opos+=2;
      w32b(crc,           outer, opos); opos+=4;
      w32b(e.data.length, outer, opos); opos+=4;
      w32b(e.data.length, outer, opos); opos+=4;
      w16b(e.nb.length,   outer, opos); opos+=2;
      w16b(0,             outer, opos); opos+=2;
      outer.set(e.nb,   opos); opos += e.nb.length;
      outer.set(e.data, opos); opos += e.data.length;
    }
 
    const ocStart = opos;
    for (let i = 0; i < bEntries.length; i++) {
      const e = bEntries[i];
      const crc = crc32b(e.data);
      outer[opos]=0x50; outer[opos+1]=0x4B; outer[opos+2]=0x01; outer[opos+3]=0x02; opos+=4;
      w16b(20, outer, opos); opos+=2;
      w16b(20, outer, opos); opos+=2;
      w16b(0,  outer, opos); opos+=2;
      w16b(0,  outer, opos); opos+=2;
      w16b(dt2, outer, opos); opos+=2;
      w16b(dd2, outer, opos); opos+=2;
      w32b(crc,           outer, opos); opos+=4;
      w32b(e.data.length, outer, opos); opos+=4;
      w32b(e.data.length, outer, opos); opos+=4;
      w16b(e.nb.length, outer, opos); opos+=2;
      w16b(0, outer, opos); opos+=2;
      w16b(0, outer, opos); opos+=2;
      w16b(0, outer, opos); opos+=2;
      w16b(0, outer, opos); opos+=2;
      w32b(0,           outer, opos); opos+=4;
      w32b(ooffs[i],    outer, opos); opos+=4;
      outer.set(e.nb, opos); opos += e.nb.length;
    }
 
    const ocEnd = opos;
    outer[opos]=0x50; outer[opos+1]=0x4B; outer[opos+2]=0x05; outer[opos+3]=0x06; opos+=4;
    w16b(0, outer, opos); opos+=2;
    w16b(0, outer, opos); opos+=2;
    w16b(bEntries.length, outer, opos); opos+=2;
    w16b(bEntries.length, outer, opos); opos+=2;
    w32b(ocEnd - ocStart, outer, opos); opos+=4;
    w32b(ocStart,         outer, opos); opos+=4;
    w16b(0, outer, opos);
 
    const blob = new Blob([outer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = String(agent.name || "agent").replace(/[^a-zA-Z0-9]/g, "_") + "_v" + agent.version + "_package.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch(e) {
    alert("Download failed: " + e.message);
  }
}
 
// ── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  dl:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  edit:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  back:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  lock:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  x:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  users:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  zap:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  building: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  info:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};
 
// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:        { fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh", background: LIGHT, color: NAVY },
  hdr:        { background: NAVY, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, borderBottom: `3px solid ${CORAL}` },
  logoText:   { color: WHITE, fontWeight: 700, fontSize: 19 },
  logoSub:    { color: TAN, fontSize: 14 },
  badge:      { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" },
  badgeName:  { color: WHITE, fontSize: 16 },
  badgeRole:  { fontSize: 13, color: CORAL, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" },
  loginWrap:  { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a1628", position: "relative", overflow: "hidden" },
  loginAppName: { color: WHITE, fontWeight: 800, fontSize: 48, textAlign: "center", letterSpacing: "-0.02em" },
  loginAppSub:  { color: "rgba(255,255,255,0.55)", fontSize: 18, marginTop: 6, textAlign: "center" },
  loginCard:  { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 40px", width: 440, boxShadow: "0 32px 80px rgba(0,0,0,0.5)" },
  lbl:        { fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.07em" },
  inp:        { width: "100%", padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 17, color: NAVY, outline: "none", boxSizing: "border-box" },
  loginBtn:   { width: "100%", padding: "16px", background: CORAL, color: WHITE, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 18, cursor: "pointer", marginTop: 24, letterSpacing: "0.01em" },
  adminLink:  { marginTop: 24, textAlign: "center" },
  adminLinkBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 0" },
  pinOverlay: { position: "fixed", inset: 0, background: "rgba(2,48,73,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
  pinBox:     { background: WHITE, borderRadius: 14, padding: "32px 36px", width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  pinTitle:   { fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 },
  pinSub:     { fontSize: 16, color: "#888", marginBottom: 20 },
  layout:     { display: "flex", minHeight: "calc(100vh - 63px)" },
  sidebar:    { width: 228, background: WHITE, borderRight: `1px solid ${TAN}`, padding: "16px 0", flexShrink: 0, overflowY: "auto" },
  sideSec:    { marginBottom: 2 },
  sideLbl:    { fontSize: 17, fontWeight: 700, color: NAVY, padding: "14px 20px 6px" },
  sideItem:   a => ({ padding: "7px 20px", cursor: "pointer", fontSize: 16, fontWeight: 400, color: a ? CORAL : "#555", background: a ? `${CORAL}0C` : "none", borderLeft: `3px solid ${a ? CORAL : "transparent"}`, transition: "all 0.1s", display: "flex", alignItems: "center", justifyContent: "space-between" }),
  sideCount:  { fontSize: 13, background: TAN, color: "#888", borderRadius: 10, padding: "1px 7px", fontWeight: 600 },
  main:       { flex: 1, padding: 32, overflowY: "auto" },
  pageTitle:  { fontSize: 25, fontWeight: 700, color: NAVY, marginBottom: 4 },
  pageSub:    { fontSize: 16, color: "#888", marginBottom: 24 },
  toolbar:    { display: "flex", gap: 10, marginBottom: 24, alignItems: "center" },
  searchWrap: { flex: 1, position: "relative" },
  searchIco:  { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#bbb" },
  searchInp:  { width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 16, outline: "none", boxSizing: "border-box", background: WHITE },
  btnP:       { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: CORAL, color: WHITE, border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" },
  btnS:       { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: WHITE, color: NAVY, border: `1.5px solid ${TAN}`, borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer", whiteSpace: "nowrap" },
  btnG:       { display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "none", color: "#777", border: "1.5px solid #e0e0e0", borderRadius: 7, fontWeight: 500, fontSize: 15, cursor: "pointer" },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 },
  card:       { background: WHITE, borderRadius: 12, border: `1.5px solid ${TAN}`, padding: 22, cursor: "pointer", transition: "all 0.15s", boxShadow: "0 2px 6px rgba(2,48,73,0.05)", display: "flex", flexDirection: "column" },
  cardSuper:  { fontSize: 10, fontWeight: 700, color: STEEL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 },
  cardTitle:  { fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 8, lineHeight: 1.35 },
  cardDesc:   { fontSize: 15, color: "#777", lineHeight: 1.6, marginBottom: 14, flex: 1, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: "auto" },
  tag:        { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: `${STEEL}18`, color: STEEL, borderRadius: 4, fontSize: 14, fontWeight: 600 },
  tagNavy:    { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: `${NAVY}0D`, color: NAVY, borderRadius: 4, fontSize: 14, fontWeight: 600 },
  tagCoral:   { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: `${CORAL}14`, color: CORAL, borderRadius: 4, fontSize: 14, fontWeight: 600 },
  dlCount:    { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, color: "#bbb", fontWeight: 500 },
  ver:        { fontSize: 14, color: "#ccc", fontWeight: 500 },
  backBtn:    { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "none", color: "#777", border: "none", borderRadius: 7, fontWeight: 500, fontSize: 16, cursor: "pointer", marginBottom: 18 },
  detailHdr:  { background: WHITE, borderRadius: 12, border: `1.5px solid ${TAN}`, padding: 28, marginBottom: 18 },
  detailTitle: { fontSize: 27, fontWeight: 700, color: NAVY, marginBottom: 10 },
  detailMeta: { display: "flex", gap: 14, fontSize: 15, color: "#aaa", marginBottom: 14, flexWrap: "wrap", alignItems: "center" },
  detailActs: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 },
  section:    { background: WHITE, borderRadius: 12, border: `1.5px solid ${TAN}`, padding: 24, marginBottom: 14 },
  secTitle:   { fontSize: 15, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${TAN}` },
  tabRow:     { display: "flex", gap: 0, marginBottom: 16, borderBottom: `1.5px solid ${TAN}` },
  tab:        a => ({ padding: "8px 18px", cursor: "pointer", fontSize: 16, fontWeight: a ? 600 : 400, color: a ? CORAL : "#999", background: "none", border: "none", borderBottom: `2px solid ${a ? CORAL : "transparent"}`, marginBottom: -1.5 }),
  promptBox:  { background: LIGHT, borderRadius: 8, padding: 18, fontSize: 15.5, lineHeight: 1.75, color: NAVY, whiteSpace: "pre-wrap", fontFamily: "monospace", border: `1px solid ${TAN}`, wordBreak: "break-word" },
  cfgItem:    { background: LIGHT, borderRadius: 8, padding: 14 },
  cfgLbl:     { fontSize: 13, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 },
  cfgVal:     { fontSize: 18, fontWeight: 600, color: NAVY },
  cfgNote:    { background: `${STEEL}0E`, borderRadius: 8, padding: 14, border: `1px solid ${STEEL}28`, fontSize: 16, color: "#444", lineHeight: 1.65 },
  overlay:    { position: "fixed", inset: 0, background: "rgba(2,48,73,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 },
  modal:      { background: WHITE, borderRadius: 16, padding: 36, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" },
  modalTitle: { fontSize: 23, fontWeight: 700, color: NAVY, marginBottom: 22 },
  fRow:       { marginBottom: 16 },
  ta:         { width: "100%", padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 16, color: NAVY, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" },
  sel:        { width: "100%", padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 16, color: NAVY, outline: "none", background: WHITE, boxSizing: "border-box" },
  modalFoot:  { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 18, borderTop: `1px solid ${TAN}` },
  err:        { background: `${CORAL}14`, color: CORAL, padding: "10px 14px", borderRadius: 8, fontSize: 16, marginBottom: 14 },
  empty:      { textAlign: "center", padding: "80px 40px" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 16 },
  th:         { textAlign: "left", padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1.5px solid ${TAN}` },
  td:         { padding: "9px 12px", borderBottom: `1px solid ${TAN}`, color: "#444", verticalAlign: "middle" },
  coRow:      { background: LIGHT, borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 16, color: NAVY, fontWeight: 500 },
};
 
const LLM_TIERS  = ["Reasoning", "Balanced", "Light Reasoning", "Deep Reasoning"];
const LLM_MODELS = { Reasoning: "Sonnet (32K)", Balanced: "Haiku (8K)", "Light Reasoning": "Haiku (16K)", "Deep Reasoning": "Sonnet (64K)" };
 
// ── Context Mode Select ──────────────────────────────────────────────────────
function ContextModeSelect({ value, onChange }) {
  const [tip, setTip] = useState(null);
  const cur = CONTEXT_MODES.find(m => m.value === value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select style={S.sel} value={value || ""} onChange={e => onChange(e.target.value)}>
        <option value="">— select —</option>
        {CONTEXT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      {cur && (
        <div style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => setTip(cur.tip)}
          onMouseLeave={() => setTip(null)}>
          <div style={{ color: STEEL, cursor: "help", display: "flex", alignItems: "center" }}>
            <Ic.info />
          </div>
          {tip && (
            <div style={{
              position: "absolute", left: "50%", bottom: "calc(100% + 6px)",
              transform: "translateX(-50%)", background: NAVY, color: WHITE,
              fontSize: 14, padding: "6px 10px", borderRadius: 6,
              whiteSpace: "nowrap", zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              pointerEvents: "none",
            }}>
              {tip}
              <div style={{
                position: "absolute", bottom: -4, left: "50%",
                transform: "translateX(-50%)", width: 8, height: 8,
                background: NAVY, clipPath: "polygon(0 0,100% 0,50% 100%)",
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 
// ── Add Category Modal ───────────────────────────────────────────────────────
function AddCategoryModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [err,  setErr]  = useState("");
  function doAdd() {
    if (!name.trim()) { setErr("Please enter a category name."); return; }
    onAdd(name.trim());
    onClose();
  }
  return (
    <div style={{ ...S.overlay, zIndex: 1200 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={S.modalTitle}>Add Solution Category</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa" }}><Ic.x /></button>
        </div>
        {err && <div style={S.err}>{err}</div>}
        <label style={S.lbl}>Category Name</label>
        <input style={S.inp} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") doAdd(); if (e.key === "Escape") onClose(); }}
          placeholder="e.g. Pricing & Discounts" autoFocus />
        <div style={S.modalFoot}>
          <button style={S.btnS} onClick={onClose}>Cancel</button>
          <button style={S.btnP} onClick={doAdd}>Add Category</button>
        </div>
      </div>
    </div>
  );
}
 
// ── Admin PIN ────────────────────────────────────────────────────────────────
function AdminPinOverlay({ onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  function go() { if (pin === "pramata2026") onSuccess(); else setErr("Incorrect PIN."); }
  return (
    <div style={S.pinOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.pinBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={S.pinTitle}>Admin Access</div>
            <div style={S.pinSub}>Enter your Pramata admin PIN.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb" }}><Ic.x /></button>
        </div>
        {err && <div style={{ ...S.err, marginBottom: 12 }}>{err}</div>}
        <label style={S.lbl}>PIN</label>
        <input style={S.inp} type="password" placeholder="••••••••••" value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          autoFocus />
        <button style={{ ...S.loginBtn, marginTop: 14 }} onClick={go}>Sign in as Admin</button>
      </div>
    </div>
  );
}
 
// ── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [showPin, setShowPin] = useState(false);
  return (
    <div style={S.loginWrap}>
      {/* Arc / grid background decoration */}
      <svg style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", opacity: 0.18, pointerEvents: "none" }}
        width="900" height="500" viewBox="0 0 900 500">
        {[80,150,220,290,360,430].map((r, i) => (
          <ellipse key={i} cx="450" cy="0" rx={r * 2.2} ry={r} fill="none"
            stroke="rgba(100,180,255,0.7)" strokeWidth="1" strokeDasharray="4 8" />
        ))}
        {/* Radial lines */}
        {Array.from({length: 16}, (_, i) => {
          const angle = (i / 16) * Math.PI;
          const x2 = 450 + Math.cos(angle) * 900;
          const y2 = Math.sin(angle) * 500;
          return <line key={i} x1="450" y1="0" x2={x2} y2={y2} stroke="rgba(100,180,255,0.25)" strokeWidth="0.5" />;
        })}
        {/* Center glow dot */}
        <circle cx="450" cy="0" r="6" fill="rgba(100,200,255,0.6)" />
      </svg>
 
      {/* Title */}
      <div style={{ marginBottom: 32, position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={S.loginAppName}>Agent Library</div>
        <div style={S.loginAppSub}>Pramata Contract Intelligence</div>
        {/* Coral accent underline */}
        <div style={{ width: 48, height: 3, background: CORAL, borderRadius: 2, margin: "14px auto 0" }} />
      </div>
 
      {/* Card */}
      <div style={{ ...S.loginCard, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
          {/* AI chip icon */}
          <div style={{ flexShrink: 0, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect x="14" y="14" width="24" height="24" rx="5" fill="none" stroke={CORAL} strokeWidth="2"/>
              <rect x="20" y="20" width="12" height="12" rx="2" fill="none" stroke={CORAL} strokeWidth="1.5"/>
              <text x="26" y="30" textAnchor="middle" fontSize="8" fontWeight="800" fill={CORAL} fontFamily="sans-serif">AI</text>
              {[17,22,27,32].map((y, i) => (
                <g key={i}>
                  <line x1="8" y1={y} x2="14" y2={y} stroke={CORAL} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="38" y1={y} x2="44" y2={y} stroke={CORAL} strokeWidth="1.5" strokeLinecap="round"/>
                </g>
              ))}
              {[17,22,27,32].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1="8" x2={x} y2="14" stroke={CORAL} strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1={x} y1="38" x2={x} y2="44" stroke={CORAL} strokeWidth="1.5" strokeLinecap="round"/>
                </g>
              ))}
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: WHITE, marginBottom: 6 }}>Browse Solutions</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>Legal solutions designed to provide the data you need</div>
          </div>
        </div>
        <button style={S.loginBtn} onClick={() => onLogin({ role: "client", name: "Client" })}>
          Enter Library →
        </button>
      </div>
 
      {/* Admin link */}
      <div style={{ ...S.adminLink, position: "relative", zIndex: 1 }}>
        <button style={S.adminLinkBtn} onClick={() => setShowPin(true)}>
          <Ic.lock /> Admin Access Only
        </button>
      </div>
 
      {showPin && (
        <AdminPinOverlay
          onSuccess={() => { setShowPin(false); onLogin({ role: "admin", name: "Pramata Admin" }); }}
          onClose={() => setShowPin(false)}
        />
      )}
    </div>
  );
}
 
// ── Agent Modal ──────────────────────────────────────────────────────────────
function AgentModal({ agent, solutions, clientNames, onSave, onClose, onAddSolution, onAddClientName }) {
  const isEdit = !!agent?.id;
  const blank = {
    id: "", name: "", solution: "", agentTypes: [], contextMode: "",
    downloads: 0, useCase: "",
    prompts: [{ id: "p1", label: "Primary Prompt", type: "english", content: "" }],
    config: { llmTier: "Balanced", model: "", notes: "" },
    version: "1.0", createdAt: toDay(), updatedAt: toDay(),
    clientTags: [],
  };
 
  // Migrate legacy single agentType string to array
  const initForm = () => {
    if (!agent) return blank;
    const base = { ...agent };
    if (!Array.isArray(base.agentTypes)) {
      base.agentTypes = base.agentType ? [base.agentType] : [];
    }
    if (!Array.isArray(base.clientTags)) base.clientTags = [];
    return base;
  };
 
  const [form, setForm]         = useState(initForm);
  const [ap, setAp]             = useState(0);
  const [err, setErr]           = useState("");
  const [showCat, setShowCat]   = useState(false);
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
 
  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCfg = (k, v) => setForm(f => ({ ...f, config: { ...f.config, [k]: v } }));
  const setPF  = (i, k, v) => {
    const ps = [...form.prompts];
    ps[i] = { ...ps[i], [k]: v };
    setForm(f => ({ ...f, prompts: ps }));
  };
 
  function toggleType(t) {
    const cur = form.agentTypes || [];
    const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t];
    set("agentTypes", next);
  }
 
  function toggleClientTag(name) {
    const cur = form.clientTags || [];
    const next = cur.includes(name) ? cur.filter(x => x !== name) : [...cur, name];
    set("clientTags", next);
  }
 
  function addNewClient() {
    const n = newClient.trim();
    if (!n) return;
    onAddClientName(n);
    toggleClientTag(n);
    setNewClient("");
    setShowNewClient(false);
  }
 
  function addP() {
    const id = `p${form.prompts.length + 1}`;
    setForm(f => ({ ...f, prompts: [...f.prompts, { id, label: `Prompt ${f.prompts.length + 1}`, type: "english", content: "" }] }));
    setAp(form.prompts.length);
  }
  function removeP(i) {
    const p = form.prompts[i];
    const isEmpty = !p.content?.trim();
    // Always allow removing if prompt is empty; block only if it's the last prompt with content
    if (form.prompts.length === 1 && !isEmpty) return;
    if (form.prompts.length === 1 && isEmpty) {
      // Reset to blank rather than deleting the last one
      setForm(f => ({ ...f, prompts: [{ id: "p1", label: "Primary Prompt", type: "english", content: "" }] }));
      setAp(0);
      return;
    }
    const ps = form.prompts.filter((_, idx) => idx !== i);
    setForm(f => ({ ...f, prompts: ps }));
    setAp(Math.max(0, i - 1));
  }
  function doSave() {
    if (!form.name.trim())    return setErr("Agent name is required.");
    if (!form.useCase.trim()) return setErr("Use case is required.");
    onSave({
      ...form,
      id: form.id || genId(),
      updatedAt: toDay(),
      agentType: (form.agentTypes || [])[0] || "",  // keep legacy field for compat
      config: { ...form.config, model: LLM_MODELS[form.config.llmTier] || form.config.model },
    });
  }
 
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={S.modalTitle}>{isEdit ? "Edit Agent" : "New Agent"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa" }}><Ic.x /></button>
        </div>
        {err && <div style={S.err}>{err}</div>}
 
        <div style={S.fRow}>
          <label style={S.lbl}>Agent Name *</label>
          <input style={S.inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. TFC Classification Agent" />
        </div>
 
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={S.lbl}>Solution *</label>
            <select style={S.sel} value={form.solution}
              onChange={e => {
                if (e.target.value === "__add__") setShowCat(true);
                else set("solution", e.target.value);
              }}>
              <option value="">— select —</option>
              {solutions.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__add__">+ Category</option>
            </select>
          </div>
          <div>
            <label style={S.lbl}>LLM Tier</label>
            <select style={S.sel} value={form.config.llmTier} onChange={e => setCfg("llmTier", e.target.value)}>
              {LLM_TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
 
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={S.lbl}>Context Mode</label>
            <ContextModeSelect value={form.contextMode || ""} onChange={v => set("contextMode", v)} />
          </div>
          <div>
            <label style={S.lbl}>Version</label>
            <select style={S.sel} value={form.version} onChange={e => set("version", e.target.value)}>
              {["1.0","2.0","3.0","4.0","5.0","6.0","7.0","8.0","9.0","10.0"].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
 
        {/* Agent Type — multi-select checkboxes */}
        <div style={{ ...S.fRow, background: LIGHT, borderRadius: 10, padding: "14px 16px", border: `1px solid ${TAN}` }}>
          <label style={{ ...S.lbl, marginBottom: 10 }}>Agent Type <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#aaa" }}>(select all that apply)</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
            {AGENT_TYPES.map(t => {
              const checked = (form.agentTypes || []).includes(t);
              return (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: checked ? NAVY : "#555", fontWeight: checked ? 600 : 400, padding: "4px 0" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleType(t)}
                    style={{ accentColor: CORAL, width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                  {t}
                </label>
              );
            })}
          </div>
        </div>
 
        {/* Client Tags */}
        <div style={{ ...S.fRow, background: LIGHT, borderRadius: 10, padding: "14px 16px", border: `1px solid ${TAN}` }}>
          <label style={{ ...S.lbl, marginBottom: 10 }}>Client Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: clientNames.length > 0 ? 10 : 0 }}>
            {clientNames.map(name => {
              const active = (form.clientTags || []).includes(name);
              return (
                <button key={name} type="button" onClick={() => toggleClientTag(name)}
                  style={{ padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${active ? STEEL : "#ccc"}`, background: active ? `${STEEL}18` : WHITE, color: active ? STEEL : "#888", transition: "all 0.15s" }}>
                  {active ? "✓ " : ""}{name}
                </button>
              );
            })}
          </div>
          {!showNewClient ? (
            <button type="button" onClick={() => setShowNewClient(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: STEEL, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}>
              <Ic.plus /> Add client name
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input style={{ ...S.inp, flex: 1, fontSize: 13, padding: "7px 12px" }}
                placeholder="Client name…" value={newClient}
                onChange={e => setNewClient(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addNewClient(); if (e.key === "Escape") { setShowNewClient(false); setNewClient(""); } }}
                autoFocus />
              <button type="button" style={{ ...S.btnP, padding: "7px 14px", fontSize: 13 }} onClick={addNewClient}>Add</button>
              <button type="button" style={{ ...S.btnG, padding: "6px 10px", fontSize: 13 }} onClick={() => { setShowNewClient(false); setNewClient(""); }}>Cancel</button>
            </div>
          )}
        </div>
 
        <div style={S.fRow}>
          <label style={S.lbl}>Use Case *</label>
          <div style={{ border: "1.5px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", gap: 4, padding: "6px 8px", background: LIGHT, borderBottom: "1px solid #e0e0e0" }}>
              <button type="button"
                title="Bold — wraps selected text in **bold**"
                onClick={() => {
                  const ta = document.getElementById("useCaseTa");
                  if (!ta) return;
                  const { selectionStart: s, selectionEnd: e, value: v } = ta;
                  const sel = v.slice(s, e);
                  const replacement = `**${sel || "bold text"}**`;
                  const next = v.slice(0, s) + replacement + v.slice(e);
                  set("useCase", next);
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 2, s + 2 + (sel || "bold text").length); }, 0);
                }}
                style={{ padding: "3px 10px", borderRadius: 5, border: "1.5px solid #ccc", background: WHITE, fontWeight: 700, fontSize: 13, cursor: "pointer", color: NAVY }}>
                B
              </button>
              <button type="button"
                title="Add bullet point"
                onClick={() => {
                  const ta = document.getElementById("useCaseTa");
                  if (!ta) return;
                  const { selectionStart: s, value: v } = ta;
                  const lineStart = v.lastIndexOf("\n", s - 1) + 1;
                  const next = v.slice(0, lineStart) + "• " + v.slice(lineStart);
                  set("useCase", next);
                  setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 2, s + 2); }, 0);
                }}
                style={{ padding: "3px 10px", borderRadius: 5, border: "1.5px solid #ccc", background: WHITE, fontSize: 14, cursor: "pointer", color: NAVY }}>
                •─
              </button>
            </div>
            <textarea id="useCaseTa"
              style={{ ...S.ta, minHeight: 80, border: "none", borderRadius: 0, outline: "none" }}
              value={form.useCase}
              onChange={e => set("useCase", e.target.value)}
              placeholder="Describe the client problem this agent solves..." />
          </div>
        </div>
 
        {/* Prompts — tabs always Prompt 1, Prompt 2… */}
        <div style={{ ...S.fRow, background: LIGHT, borderRadius: 10, padding: 16, border: `1px solid ${TAN}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={S.lbl}>Prompts</label>
            <button style={{ ...S.btnG, fontSize: 11 }} onClick={addP}><Ic.plus /> Add Prompt</button>
          </div>
          <div style={S.tabRow}>
            {form.prompts.map((_, i) => (
              <button key={i} style={S.tab(ap === i)} onClick={() => setAp(i)}>Prompt {i + 1}</button>
            ))}
          </div>
          {form.prompts.map((p, i) => i !== ap ? null : (
            <div key={i}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 10, alignItems: "flex-end" }}>
                <div>
                  <label style={S.lbl}>Label</label>
                  <input style={S.inp} value={p.label} onChange={e => setPF(i, "label", e.target.value)} />
                </div>
                <div>
                  <label style={S.lbl}>Type</label>
                  <select style={S.sel} value={p.type} onChange={e => setPF(i, "type", e.target.value)}>
                    <option value="english">Plain English</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>
                <button style={{ ...S.btnG, color: CORAL, borderColor: `${CORAL}40`, alignSelf: "flex-end" }}
                  onClick={() => removeP(i)}
                  disabled={form.prompts.length === 1 && !!form.prompts[i]?.content?.trim()}>
                  <Ic.trash />
                </button>
              </div>
              <textarea
                style={{ ...S.ta, minHeight: 240, fontFamily: p.type === "markdown" ? "monospace" : "inherit" }}
                value={p.content}
                onChange={e => setPF(i, "content", e.target.value)}
                placeholder={p.type === "markdown" ? "## Your prompt in Markdown..." : "Write your prompt in plain English..."}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              />
            </div>
          ))}
        </div>
 
        <div style={S.modalFoot}>
          <button style={S.btnS} onClick={onClose}>Cancel</button>
          <button style={S.btnP} onClick={doSave}>{isEdit ? "Save Changes" : "Create Agent"}</button>
        </div>
      </div>
 
      {showCat && (
        <AddCategoryModal
          onAdd={name => { onAddSolution(name); set("solution", name); }}
          onClose={() => setShowCat(false)}
        />
      )}
    </div>
  );
}
 
// ── Prompt Viewer ────────────────────────────────────────────────────────────
function PromptViewer({ content }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [copied,  setCopied]    = useState(false);
  const LIMIT = 1200;
  const isLong = (content || "").length > LIMIT;
  const displayed = isLong && !expanded ? content.slice(0, LIMIT) + "…" : content;
 
  function doCopy() {
    navigator.clipboard.writeText(content || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
 
  return (
    <div>
      <div style={{ position: "relative" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        <div style={S.promptBox}>{displayed}</div>
        {hovered && (
          <button onClick={doCopy}
            title="Copy full prompt"
            style={{
              position: "absolute", top: 10, right: 10,
              background: copied ? STEEL : WHITE,
              border: `1.5px solid ${copied ? STEEL : TAN}`,
              borderRadius: 6, cursor: "pointer", padding: "5px 8px",
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 600,
              color: copied ? WHITE : STEEL,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "all 0.15s",
            }}>
            {copied ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
            )}
          </button>
        )}
      </div>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ marginTop: 8, background: "none", border: `1.5px solid ${STEEL}`, borderRadius: 6, color: STEEL, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "5px 14px", display: "flex", alignItems: "center", gap: 5 }}>
          {expanded ? "▲ Collapse" : `▼ Show full prompt (${(content || "").length} chars)`}
        </button>
      )}
    </div>
  );
}
 
function AgentDetail({ agent, user, onBack, onEdit, onDelete, onDownload, onRemoveClientTag }) {
  const [ap, setAp]         = useState(0);
  const [showCtip, setCtip] = useState(false);
  const isAdmin = user.role === "admin";
  const ctip = CONTEXT_MODES.find(m => m.value === agent.contextMode);
 
  return (
    <div>
      <button style={S.backBtn} onClick={onBack}><Ic.back /> All Agents</button>
 
      <div style={S.detailHdr}>
        {agent.solution && (
          <div style={{ marginBottom: 10 }}>
            <span style={S.tagNavy}><Ic.zap /> {agent.solution}</span>
          </div>
        )}
 
        <div style={S.detailTitle}>{agent.name}</div>
        <div style={S.detailMeta}>
          <span>v{agent.version}</span><span>·</span>
          <span>Updated {agent.updatedAt}</span><span>·</span>
          <span>{agent.prompts.length} prompt{agent.prompts.length !== 1 ? "s" : ""}</span><span>·</span>
          <span style={S.dlCount}><Ic.dl /> {agent.downloads || 0} download{(agent.downloads || 0) !== 1 ? "s" : ""}</span>
        </div>
 
        {/* Context mode + LLM tier + Agent types */}
        <div style={{ display: "flex", gap: 28, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          {agent.contextMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: STEEL, textTransform: "uppercase", letterSpacing: "0.07em" }}>Context</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#7AACBE" }}>{agent.contextMode}</span>
              {ctip && (
                <span style={{ position: "relative", color: STEEL, cursor: "help", display: "inline-flex", alignItems: "center" }}
                  onMouseEnter={() => setCtip(true)}
                  onMouseLeave={() => setCtip(false)}>
                  <Ic.info />
                  {showCtip && (
                    <span style={{ position: "absolute", left: "50%", bottom: "calc(100% + 6px)", transform: "translateX(-50%)", background: NAVY, color: WHITE, fontSize: 14, padding: "6px 10px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
                      {ctip.tip}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
          {agent.config?.llmTier && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: STEEL, textTransform: "uppercase", letterSpacing: "0.07em" }}>LLM Tier</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#7AACBE" }}>{agent.config.llmTier}</span>
            </div>
          )}
          {(Array.isArray(agent.agentTypes) ? agent.agentTypes : [agent.agentType]).filter(Boolean).length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: STEEL, textTransform: "uppercase", letterSpacing: "0.07em" }}>Agent Type</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(Array.isArray(agent.agentTypes) ? agent.agentTypes : [agent.agentType]).filter(Boolean).map(t => (
                  <span key={t} style={{ fontSize: 13, fontWeight: 500, color: "#7AACBE" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
 
        <div style={S.detailActs}>
          <button style={S.btnP} onClick={() => onDownload(agent)}><Ic.dl /> Agent Package</button>
          {isAdmin && <>
            <button style={S.btnS} onClick={() => onEdit(agent)}><Ic.edit /> Edit Agent</button>
            <button style={{ ...S.btnG, color: CORAL, borderColor: `${CORAL}40` }} onClick={() => onDelete(agent.id)}><Ic.trash /> Delete</button>
          </>}
        </div>
 
        {/* Client tags — detail view only, admin can remove */}
        {(agent.clientTags || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {(agent.clientTags || []).map(name => (
              <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, color: "#5a6e78", background: "transparent", border: "1px solid #b0c4cc", letterSpacing: "0.01em" }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {name}
                {isAdmin && (
                  <button onClick={() => onRemoveClientTag(agent.id, name)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 2, color: "#aaa", display: "inline-flex", alignItems: "center", lineHeight: 1 }}
                    title={`Remove ${name}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
 
      <div style={S.section}>
        <div style={S.secTitle}>Use Case</div>
        <div style={{ fontSize: 17, color: "#444", lineHeight: 1.75 }}>
          {(agent.useCase || "").split("\n").map((line, i) => {
            // Render bullet lines
            const isBullet = line.startsWith("• ") || line.startsWith("- ");
            const text = isBullet ? line.slice(2) : line;
            // Render **bold** inline
            const parts = text.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            );
            if (isBullet) return (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                <span style={{ color: STEEL, fontWeight: 700, flexShrink: 0 }}>•</span>
                <span>{parts}</span>
              </div>
            );
            return <div key={i} style={{ marginBottom: line ? 4 : 8 }}>{parts}</div>;
          })}
        </div>
      </div>
 
      <div style={S.section}>
        <div style={S.secTitle}>Prompts</div>
        <div style={S.tabRow}>
          {agent.prompts.map((_, i) => (
            <button key={i} style={S.tab(ap === i)} onClick={() => setAp(i)}>Prompt {i + 1}</button>
          ))}
        </div>
        {agent.prompts.map((p, i) => i !== ap ? null : <PromptViewer key={i} content={p.content} />)}
      </div>
 
    </div>
  );
}
 
// ── Main App ─────────────────────────────────────────────────────────────────
export default function AgentLibrary() {
  const [user,           setUser]          = useState(null);
  const [agents,         setAgents]        = useState([]);
  const [solutions,      setSolutions]     = useState(SEED_SOLUTIONS);
  const [clientNames,    setClientNames]   = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [syncStatus,     setSyncStatus]    = useState("connecting"); // connecting | live | local | saving | error
  const [syncErrorDetail,setSyncErrorDetail] = useState("");
  const [view,           setView]          = useState("library");
  const [selected,       setSelected]      = useState(null);
  const [showModal,      setShowModal]     = useState(false);
  const [editAgent,      setEditAgent]     = useState(null);
  const [search,         setSearch]        = useState("");
  const [filterSolution, setFilterSolution] = useState("All");
  const [filterType,     setFilterType]    = useState("All");
  const [filterClient,   setFilterClient]  = useState("All");
  const [typeCollapsed,  setTypeCollapsed] = useState(true);
  const [clientCollapsed,setClientCollapsed] = useState(false);
 
  useEffect(() => {
    (async () => {
      // Try Realtime Database first — this is the SHARED database everyone reads from.
      let loadedAgents = null;
      let loadedSolutions = null;
      let loadedClientNames = null;
 
      if (FIREBASE_DB_URL) {
        const remote = await fbLoad();
        if (remote === null) {
          // Could be: DB empty (fine, first run) OR request failed (fbLoad already logged it)
          // We can't fully distinguish here without more info, so check reachability separately.
          const reachable = await fbPing();
          setSyncStatus(reachable ? "live" : "error");
        } else if (remote?.agents) {
          loadedAgents = remote.agents;
          loadedSolutions = remote.solutions || null;
          loadedClientNames = remote.clientNames || null;
          setSyncStatus("live");
        } else {
          // Connected, but no agents key yet — still live, just empty
          setSyncStatus("live");
        }
      } else {
        setSyncStatus("local");
      }
 
      // Fall back to local storage, then seeds
      if (!loadedAgents) {
        const a = await load(SK.agents, null);
        loadedAgents = a || SEED_AGENTS;
      }
      setAgents(loadedAgents);
 
      const s = loadedSolutions || await load(SK.solutions, null);
      if (s) setSolutions(s);
 
      const cn = loadedClientNames || await load(SK.clientNames, null);
      setClientNames(cn || []);
 
      setLoading(false);
    })();
  }, []);
 
  // Agents write to Realtime Database (shared for everyone) AND local storage (fast fallback)
  async function persistAgents(nextAgents) {
    setAgents(nextAgents);
    await persist(SK.agents, nextAgents);
    if (FIREBASE_DB_URL) {
      setSyncStatus("saving");
      const result = await fbSave({ agents: nextAgents, solutions, clientNames });
      setSyncStatus(result.ok ? "live" : "error");
      setSyncErrorDetail(result.ok ? "" : result.error);
    }
  }
 
  async function persistSolutions(s) {
    setSolutions(s);
    await persist(SK.solutions, s);
    if (FIREBASE_DB_URL) await fbSave({ agents, solutions: s, clientNames });
  }
  async function persistClientNames(n) {
    setClientNames(n);
    await persist(SK.clientNames, n);
    if (FIREBASE_DB_URL) await fbSave({ agents, solutions, clientNames: n });
  }
 
  function exportAgents() {
    const data = { agents, clientNames, solutions, exportedAt: toDay() };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pramata-agents-" + toDay() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
 
  function importAgents(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = Array.isArray(data) ? data : data.agents;
        if (!Array.isArray(imported) || imported.length === 0) {
          alert("Invalid file — no agents found."); return;
        }
 
        // Replace all agents with imported ones and save to storage
        setAgents(imported);
        await persist(SK.agents, imported);
 
        // Restore client names from file, merged with existing
        if (Array.isArray(data.clientNames) && data.clientNames.length > 0) {
          const merged = [...new Set([...clientNames, ...data.clientNames])];
          setClientNames(merged);
          persistClientNames(merged);
        } else {
          // Derive client names from agent clientTags if not explicitly stored
          const derived = [...new Set(imported.flatMap(a => a.clientTags || []))];
          if (derived.length > 0) {
            const merged = [...new Set([...clientNames, ...derived])];
            setClientNames(merged);
            persistClientNames(merged);
          }
        }
 
        // Restore solutions from file, merged with existing
        const importedSolutions = Array.isArray(data.solutions)
          ? data.solutions
          : [...new Set(imported.map(a => a.solution).filter(Boolean))];
        setSolutions(prev => {
          const merged = [...new Set([...prev, ...importedSolutions])];
          persistSolutions(merged);
          return merged;
        });
 
        alert(`✓ ${imported.length} agent${imported.length !== 1 ? "s" : ""} imported. Existing agents preserved.`);
      } catch { alert("Could not read file. Make sure it's a valid pramata-agents JSON file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
 
  function handleLogin(u) {
    setUser(u);
  }
 
  function addSolution(name) { if (!solutions.includes(name)) persistSolutions([...solutions, name]); }
  function addClientName(name) { if (!clientNames.includes(name)) persistClientNames([...clientNames, name]); }
 
  function saveAgent(agent) {
    const exists = agents.find(a => a.id === agent.id);
    const next = exists ? agents.map(a => a.id === agent.id ? agent : a) : [...agents, agent];
    persistAgents(next);
    setShowModal(false); setEditAgent(null);
    if (selected?.id === agent.id) setSelected(agent);
  }
 
  function removeClientTag(agentId, tagName) {
    const next = agents.map(a => a.id === agentId
      ? { ...a, clientTags: (a.clientTags || []).filter(t => t !== tagName) }
      : a
    );
    persistAgents(next);
    if (selected?.id === agentId) setSelected(next.find(a => a.id === agentId));
  }
 
  function deleteAgent(id) {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    persistAgents(agents.filter(a => a.id !== id));
    setView("library"); setSelected(null);
  }
 
  function handleDownload(agent) {
    dlPackage(agent);
    const ua = agents.map(a => a.id === agent.id ? { ...a, downloads: (a.downloads || 0) + 1 } : a);
    persistAgents(ua);
    if (selected?.id === agent.id) setSelected({ ...agent, downloads: (agent.downloads || 0) + 1 });
  }
 
  const solCounts  = solutions.reduce((acc, s) => { acc[s] = agents.filter(a => a.solution === s).length; return acc; }, {});
  const typeCounts = AGENT_TYPES.reduce((acc, t) => {
    acc[t] = agents.filter(a => (Array.isArray(a.agentTypes) ? a.agentTypes : [a.agentType]).includes(t)).length;
    return acc;
  }, {});
  const taggedClients = clientNames.filter(n => agents.some(a => (a.clientTags || []).includes(n)));
 
  const filtered = agents.filter(a => {
    const ms = !search || (a.name.toLowerCase().includes(search.toLowerCase()) || a.useCase.toLowerCase().includes(search.toLowerCase()) || (a.solution || "").toLowerCase().includes(search.toLowerCase()));
    const mSol    = filterSolution === "All" || a.solution === filterSolution;
    const aTypes  = Array.isArray(a.agentTypes) ? a.agentTypes : [a.agentType];
    const mType   = filterType === "All" || aTypes.includes(filterType);
    const mClient = filterClient === "All" || (a.clientTags || []).includes(filterClient);
    return ms && mSol && mType && mClient;
  });
 
  if (!user)   return <LoginScreen onLogin={handleLogin} />;
  if (loading) return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ color: "#aaa", fontSize: 14 }}>Loading…</div></div>;
 
  const isAdmin = user.role === "admin";
  let pageTitle = "All Agents";
  if (filterClient !== "All") pageTitle = filterClient;
  else if (filterSolution !== "All" && filterType === "All") pageTitle = filterSolution;
  else if (filterType !== "All" && filterSolution === "All") pageTitle = filterType;
  else if (filterSolution !== "All" && filterType !== "All") pageTitle = `${filterSolution} · ${filterType}`;
 
  const chevron = (collapsed) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="18 15 12 9 6 15" />}
    </svg>
  );
 
  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div><div style={S.logoText}>Agent Library</div><div style={S.logoSub}>Pramata Contract Intelligence</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {syncStatus === "live" && (
                <span style={{ fontSize: 12, color: "#7fe0a0", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7fe0a0", display: "inline-block" }} /> Live — shared
                </span>
              )}
              {syncStatus === "saving" && (
                <span style={{ fontSize: 12, color: TAN, opacity: 0.8 }}>Saving…</span>
              )}
              {syncStatus === "local" && (
                <span style={{ fontSize: 12, color: "#f0b429" }}>⚠️ Local only — not shared</span>
              )}
              {syncStatus === "error" && (
                <span title={syncErrorDetail} style={{ fontSize: 12, color: "#ff9999", cursor: "help", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ⚠️ Sync failed{syncErrorDetail ? `: ${syncErrorDetail}` : ""}
                </span>
              )}
              <button onClick={exportAgents}
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "5px 13px", display: "flex", alignItems: "center", gap: 5 }}>
                ⬇ Export
              </button>
              <label style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "5px 13px", display: "flex", alignItems: "center", gap: 5 }}>
                ⬆ Import
                <input type="file" accept=".json" onChange={importAgents} style={{ display: "none" }} />
              </label>
            </div>
          )}
          <div style={S.badge} onClick={() => { setUser(null); setView("library"); setSelected(null); setSearch(""); setFilterSolution("All"); setFilterType("All"); setFilterClient("All"); }}>
            <div><div style={S.badgeName}>{user.name}</div></div>
            <div style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>Sign out</div>
          </div>
        </div>
      </div>
 
      <div style={S.layout}>
        <div style={S.sidebar}>
          <div style={S.sideSec}>
            <div style={S.sideLbl}>Library</div>
            <div style={S.sideItem(view === "library" && filterSolution === "All" && filterType === "All" && filterClient === "All")}
              onClick={() => { setFilterSolution("All"); setFilterType("All"); setFilterClient("All"); setView("library"); setSelected(null); }}>
              <span>All Agents</span><span style={S.sideCount}>{agents.length}</span>
            </div>
          </div>
 
          {solutions.filter(s => solCounts[s] > 0).length > 0 && (
            <div style={S.sideSec}>
              <div style={S.sideLbl}>By Solution</div>
              {solutions.filter(s => solCounts[s] > 0).map(s => (
                <div key={s} style={S.sideItem(view === "library" && filterSolution === s && filterType === "All" && filterClient === "All")}
                  onClick={() => { setFilterSolution(s); setFilterType("All"); setFilterClient("All"); setView("library"); setSelected(null); }}>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
 
          {taggedClients.length > 0 && (
            <div style={S.sideSec}>
              <div style={{ ...S.sideLbl, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                onClick={() => setClientCollapsed(c => !c)}>
                <span>By Client</span>
                <span style={{ marginRight: 8, color: NAVY }}>{chevron(clientCollapsed)}</span>
              </div>
              {!clientCollapsed && taggedClients.map(n => (
                <div key={n} style={S.sideItem(view === "library" && filterClient === n)}
                  onClick={() => { setFilterClient(n); setFilterSolution("All"); setFilterType("All"); setView("library"); setSelected(null); }}>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}
 
          {AGENT_TYPES.filter(t => typeCounts[t] > 0).length > 0 && (
            <div style={S.sideSec}>
              <div style={{ ...S.sideLbl, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
                onClick={() => setTypeCollapsed(c => !c)}>
                <span>By Agent Type</span>
                <span style={{ marginRight: 8, color: NAVY }}>{chevron(typeCollapsed)}</span>
              </div>
              {!typeCollapsed && AGENT_TYPES.filter(t => typeCounts[t] > 0).map(t => (
                <div key={t} style={S.sideItem(view === "library" && filterType === t && filterSolution === "All" && filterClient === "All")}
                  onClick={() => { setFilterType(t); setFilterSolution("All"); setFilterClient("All"); setView("library"); setSelected(null); }}>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}
 
          {isAdmin && (
            <div style={S.sideSec}>
              <div style={S.sideLbl}>Admin</div>
              <div style={{ padding: "7px 20px", cursor: "pointer", fontSize: 16, fontWeight: 600, color: CORAL, display: "flex", alignItems: "center" }}
                onClick={() => { setEditAgent(null); setShowModal(true); }}>+ New Agent</div>
            </div>
          )}
        </div>
 
        <div style={S.main}>
          {view === "detail" && selected ? (
            <AgentDetail
              agent={agents.find(a => a.id === selected.id) || selected}
              user={user}
              onBack={() => { setView("library"); setSelected(null); }}
              onEdit={a => { setEditAgent(a); setShowModal(true); }}
              onDelete={deleteAgent}
              onDownload={handleDownload}
              onRemoveClientTag={removeClientTag}
            />
          ) : (
            <>
              <div style={S.pageTitle}>{pageTitle}</div>
              <div style={S.pageSub}>{filtered.length} agent{filtered.length !== 1 ? "s" : ""}</div>
              <div style={S.toolbar}>
                <div style={S.searchWrap}>
                  <span style={S.searchIco}><Ic.search /></span>
                  <input style={S.searchInp} placeholder="Search agents or use cases…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {isAdmin && (
                  <button style={S.btnP} onClick={() => { setEditAgent(null); setShowModal(true); }}>
                    <Ic.plus /> New Agent
                  </button>
                )}
              </div>
              {filtered.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>🤖</div>
                  <div style={{ fontSize: 19, fontWeight: 600, color: "#999", marginBottom: 8 }}>No agents found</div>
                  <div style={{ fontSize: 16, color: "#ccc" }}>Try a different filter or search{isAdmin ? ", or create a new agent" : ""}.</div>
                </div>
              ) : (
                <div style={S.grid}>
                  {filtered.map(agent => (
                    <div key={agent.id} style={S.card}
                      onClick={() => { setSelected(agent); setView("detail"); }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px rgba(2,48,73,0.11)`; e.currentTarget.style.borderColor = STEEL; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 6px rgba(2,48,73,0.05)`; e.currentTarget.style.borderColor = TAN; }}>
                      <div style={S.cardSuper}><Ic.zap /> {agent.solution || "—"}</div>
                      <div style={S.cardTitle}>{agent.name}</div>
                      <div style={S.cardDesc}>{agent.useCase}</div>
                      {/* Agent types + context mode as small tags */}
                      {((Array.isArray(agent.agentTypes) ? agent.agentTypes : [agent.agentType]).filter(Boolean).length > 0 || agent.contextMode) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                          {(Array.isArray(agent.agentTypes) ? agent.agentTypes : [agent.agentType]).filter(Boolean).map(t => (
                            <span key={t} style={{ fontSize: 11, fontWeight: 500, color: STEEL, background: `${STEEL}12`, borderRadius: 4, padding: "2px 7px" }}>{t}</span>
                          ))}
                          {agent.contextMode && (
                            <span style={{ fontSize: 11, fontWeight: 500, color: "#7AACBE", background: `${STEEL}0C`, borderRadius: 4, padding: "2px 7px" }}>{agent.contextMode}</span>
                          )}
                        </div>
                      )}
                      <div style={S.cardFooter}>
                        <span style={S.dlCount}><Ic.dl /> {agent.downloads || 0}</span>
                        <span style={{ ...S.ver, marginLeft: 10 }}>v{agent.version}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
 
      {showModal && (
        <AgentModal
          agent={editAgent}
          solutions={solutions}
          clientNames={clientNames}
          onSave={saveAgent}
          onClose={() => { setShowModal(false); setEditAgent(null); }}
          onAddSolution={addSolution}
          onAddClientName={addClientName}
        />
      )}
 
    </div>
  );
}
 
