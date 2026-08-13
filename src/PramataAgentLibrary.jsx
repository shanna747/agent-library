import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
 
const NAVY  = "#023049";
const CORAL = "#E94728";
const STEEL = "#31728C";
const TAN   = "#DFDCCE";
const WHITE = "#FFFFFF";
const LIGHT = "#F5F3EE";
 
const SEED_SOLUTIONS = [
  "Marketing",
  "Termination for Convenience",
  "Risk & Compliance",
  "Document Processing",
  "Data Rights",
  "Renewal Intelligence",
  "Pricing & Discounts",
  "Authorized Users",
  "Price Increase",
  "Clauses",
  "Governing Terms",
  "Address Change Notice"
];

const SEED_CLIENT_NAMES = [
  "JDPower",
  "Salsify",
  "MHA",
  "test",
  "Comacast"
];
 
const CONTEXT_MODES = [
  { value: "ALL-DOCS", label: "ALL-DOCS", tip: "Use for Account Assist" },
  { value: "DOC-AT-A-TIME", label: "DOC-AT-A-TIME", tip: "Use for CAS Reporting" },
];

const CLAUDE_PROXY_URL = import.meta.env.VITE_CLAUDE_ENDPOINT || "/api/claude";
const CLAUDE_MODEL = import.meta.env.VITE_CLAUDE_MODEL || "claude-3.5-sonnet-latest";
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || "";
 
// ── STOP GATE ─────────────────────────────────────────────────────────────────
// SEED_AGENTS only loads when JSONBin has no data yet (first run, or no credentials set).
// Once connected, all agents live in JSONBin and are loaded from there on every session.
// To persist agent edits: edit in the Admin UI → changes auto-save to JSONBin.
// SEED prompt content stays empty — real prompts live in JSONBin only.
const SEED_AGENTS = [
  {
    "id": "agent-001",
    "name": "TFC Classification Agent",
    "solution": "Termination for Convenience",
    "agentTypes": [
      "Account Assist",
      "Custom Agentic Solutions"
    ],
    "contextMode": "DOC-AT-A-TIME",
    "downloads": 1,
    "useCase": "Classifies Termination for Convenience clauses into six standardized AI TFC values.",
    "clientTags": [],
    "prompts": [
      {
        "id": "p1",
        "label": "Per-Document Extraction",
        "type": "markdown",
        "content": "This agent runs in two phases within a single pass:\n\nPHASE 1 — Per-document extraction (DOC-AT-A-TIME):\nFor each document in the account hierarchy, read {{kt+.sk___Termination_for_Convenience}} \nand {{DOCUMENT}} independently for THAT document only. Determine whether TFC language \nexists in that document and capture the full clause text. Record source (KT or document \nfallback) in the SOURCE AUDIT LOG.\n\nDO NOT attempt Phase 2 classification until ALL documents have completed Phase 1 \nextraction and the SOURCE AUDIT LOG is fully populated.\n\nPHASE 2 — Account-level classification:\nUsing ONLY the per-document extractions recorded in Phase 1, resolve the full hierarchy — \ninheritance, amendments, overrides, and account-level outliers — and produce the final \nAITable. Do not re-read individual documents during Phase 2; rely solely on what \nPhase 1 captured.\n\n---\n\nThe following AI TFC Key Term information is to persist data:\n\nKEY TERM TFC: The AI TFC data will be derived from Pramata into Salesforce.\n\n**Important Validation Rules**:\n- The value must be exactly one of the Allowed Values\n- No other non-blank values permitted\n- Do not include any additional text or comments\n- If multiple options could apply, select the most appropriate one\n- If none of the options apply, leave the cell blank\n\n**Allowed Values to be sent to Salesforce**:\n- No - None\n- No - Overrides Parent\n- No - Overridden by Child\n- Yes - Amended\n- Yes - In this Document\n- Yes - Inherited\n\n---\n\n**Objective:** Analyze all contracts across the full account hierarchy to identify the \npresence, classification, and source of Termination for Convenience (TFC) clauses using \nthe AI TFC framework.\n\n### DATA SOURCE — Per-Document KT + Document Fallback + Section Number Lookup:\n\nFor each contract, three layers of data are available, applied in strict priority order \nduring Phase 1:\n\n1. **Primary source — Key term context:** A `[sk___Termination_for_Convenience] -> BEGIN ... END` \nblock injected by the `{{kt+.sk___Termination_for_Convenience}}` variable, read per-document \nduring Phase 1. This is the authoritative source for clause content. Use this layer first.\n\n   When the [sk___Termination_for_Convenience] block injects as a table with DS_ references \n   (e.g., \"Yes [See: DS_sk___Termination_for_Convenience_1]\"), dereference the DS_ pointer \n   to retrieve the full clause text shown above the table. The clause text IS present — \n   it is in the DS_ block above the table, not in the table cell itself.\n\n2. **Secondary source — Document fallback (absent KT blocks only):** If the KT block for \na contract is **completely absent** (not injected at all), scan `{{DOCUMENT}}` for TFC \nlanguage. This fallback is permitted ONLY when the KT block is absent — it does NOT apply \nwhen the KT block is present but empty or non-substantive (e.g., reads \"No sk___Termination_for_Convenience term specified\", \"Not present\", or is blank). When the KT block is present but \nempty/non-substantive, the result is `No - None` with a blank clause cell — no document \nscan is attempted.\n\n3. **Tertiary source — Section number lookup only:** `{{TRUEDOC+}}` is used exclusively \nto identify the section number of the TFC clause for inclusion as a prefix in the \n`TFC source/clause` cell. It is **not** used to find or validate clause content. If \n`{{TRUEDOC+}}` does not yield a section number for a given clause, omit the prefix and \nquote clause text only.\n\n### CRITICAL OMISSION RULE:\nYour results table MUST contain exactly N rows — one for EACH contract from the DEFINITIVE \nCONTRACT LIST. **FAILURE CONDITION:** If your results table has fewer than N rows, your \nanalysis is INCOMPLETE and UNACCEPTABLE.\n\n### DEFINITIVE CONTRACT LIST:\nUse ALL contracts present in the account hierarchy as your source. **Preserve the Contract \nStatus value from the account data exactly** — do not re-derive.\n\n### MANDATORY CONTRACT MAPPING (Required Step — DO NOT SKIP):\nFor each document, extract from {{METADATA}}:\n- Pramata Number\n- Contract Status\n- Document Title\n- Contract Type\n- Contract Category\n- Parent Pramata Number (if present — this field defines the hierarchy)\n- **Amended Document Level** — for every Amendment or Addendum, identify the Contract \n  Category of its Parent document from {{METADATA}} (Master or Order). Record this as \n  either \"Master-level amendment\" or \"Order-level amendment\". This field drives \n  classification behavior for all amendments and addenda throughout Phase 2.\n\nIf Parent Pramata Number is absent in {{METADATA}}, the document is a root document \nfor hierarchy purposes regardless of Contract Type or Contract Category.\n\n**CHANGE REQUEST flag:** For each contract, also note whether it qualifies as a Change \nRequest under the CR Flag Detection Rule (see CR LOGIC gating condition). A contract is \nflagged if ANY of: Document Title contains or is similar to `CHANGE REQUEST`; Contract \nType = `Change Request` or `Change Order` with an Order-level parent; Contract Type = \n`Addendum` or `Amendment` with an Order-level parent; or Document Title is exactly \n`Service Request` or `Contract Request Change` with an Order-level parent. This flag \ndetermines whether CR LOGIC (below) applies to that row. If no contract in the account \nhierarchy meets any of these conditions, CR LOGIC is not applicable anywhere in this \nanalysis — skip it entirely and proceed with standard logic only.\n\n### VALIDATION CHECKLIST (Required Step):\nDO NOT PROCEED TO PHASE 2 until all contracts are checked and the SOURCE AUDIT LOG \nis fully populated from Phase 1.\n\n- PNo [X] — [Status: Active/Inactive/Terminated/Superseded/Unknown] | [KT context: \npresent-and-populated / present-but-empty / absent] | [parent PNo: X / N/A] | \n[parent KT context: present-and-populated / present-but-empty / absent / N/A] | \n[Amended Document Level: Master-level / Order-level / N/A] |\n[Document Title = CHANGE REQUEST (or Service Request / Contract Request Change): Yes/No]\n\nNOTE: Parent KT context and Amended Document Level must be populated from Phase 1 \nextraction results and {{METADATA}} only. Do not pre-fill based on assumptions.\n\n---\n\n### 🆕 AMENDMENT DOCUMENT TYPE RULE (Apply to ALL Amendments and Addenda):\n\nAn amendment or addendum is classified as the **same document level as the document it \namends**, not its own contract category. Determine the amended document's level from \nthe Parent document's Contract Category in {{METADATA}}:\n\n- **If the parent document is a Master, Master Addendum, or any Master-category document** \n  → the amendment is a **Master-level amendment**. TFC found in this amendment is \n  treated as present at the Master level. The amendment's TFC classification options \n  are identical to those available to a Master document.\n\n- **If the parent document is an Order, SOW, or any Order-category document** \n  → the amendment is an **Order-level amendment**. TFC found in this amendment is \n  treated as present at the Order/SOW level. The amendment's TFC classification options \n  are identical to those available to an Order/SOW document.\n\nThis rule applies to every amendment and addendum in the hierarchy without exception, \nincluding CHANGE REQUEST, Service Request, and Contract Request Change documents.\n\n**Effect on Master-level amendments:**\nWhen a Master-level amendment introduces TFC into an Agreement that the original Master \ndocument did not itself contain:\n- The amendment = `Yes - In this Document` (it is the document where TFC originates)\n- The original Master and any other Master-level addenda/amendments that have no TFC \n  of their own = `Yes - Inherited`, sourced from the Master-level amendment's clause text\n- This TFC is now considered present at the Master level for all inheritance purposes \n  downstream\n\n**Effect on Order-level amendments (including CHANGE REQUEST, Service Request, and \nContract Request Change):**\nWhen an Order-level amendment introduces, modifies, or removes TFC relative to a child \nOrder/SOW document, the classification follows CR LOGIC below. The amendment is treated \nas acting upon its immediate parent Order/SOW. No document above the Order/SOW level \nis reclassified as a result.\n\n---\n\n### ACCOUNT-LEVEL OUTLIER RULE:\nAny document with no Parent Pramata Number in {{METADATA}} is treated as a root document \nfor classification purposes — regardless of Contract Type or Contract Category. This \nincludes standalone Evaluation Agreements, Letter Agreements, Addenda, and any other \ndocument type that exists at account level without a parent.\n\n- Root document WITH TFC (found via KT or document fallback) → **Yes - In this Document**\n- Root document WITHOUT TFC → **No - None**\n- Root documents are NEVER `Yes - Inherited`, `No - Overrides Parent`, or `Yes - Amended`\n\nThis rule supersedes the Master Agreement Validation block below for any document \nwithout a Parent Pramata Number.\n\n---\n\n### SCOPE NUANCE — TFC Granted Over Sub-Documents:\n\nIf a Master Agreement (or Master-level amendment) grants a party the right to terminate \n**a SOW, Order, Statement of Work, or other child document** for convenience, this STILL \ncounts as TFC language at the Master level.\n\n- The Master level has TFC language → AI TFC = `Yes - In this Document` for the document \n  where TFC originates; all other Master-level documents without their own TFC = \n  `Yes - Inherited` from that source document.\n- A child SOW/Order under that Master inherits this right → AI TFC = `Yes - Inherited` \n  for the SOW/Order (subject to the INHERITABILITY TEST below).\n\n### SCOPE NUANCE — Child Modifies Parent's TFC Terms:\n\nIf a child Order, SOW, or Order-level amendment **changes a term of the parent's TFC \nclause** (e.g., changes the notice period, alters or waives a termination fee, or \nnarrows/broadens the scope) — but does NOT remove or fully replace the parent's right \nto terminate for convenience — this is an AMENDMENT, not an override.\n\n- The parent's TFC grant survives; only a term is modified → AI TFC = `Yes - Amended` \n  for the child.\n- Use `No - Overrides Parent` ONLY when the child removes, nullifies, or wholly replaces \n  the parent's TFC right — not when it merely changes a term.\n\n### SCOPE NUANCE — Child References Parent's TFC When Parent Is Not In Context:\n\nWhen a child document's TFC clause explicitly references, invokes, or conditions itself \non the governing Agreement — using language such as \"in accordance with the terms of the \nAgreement\", \"as provided in the Master Agreement\", \"subject to the Agreement\", \"pursuant \nto the Agreement's termination provisions\", or similar — treat the parent as HAVING a TFC \nright that the child is modifying or conditioning, EVEN IF the parent document's KT block \nis empty or absent.\n\n- The clause's own reference to the Agreement is sufficient evidence that the parent's \n  TFC grant exists and survives; the child is adjusting it.\n- This → AI TFC = `Yes - Amended`.\n- For the Parent portion of the clause cell, quote the child's reference to the parent \n  right (since the parent KT is unavailable).\n- Do NOT downgrade to `Yes - In this Document` merely because the parent KT block is \n  empty. A self-contained TFC clause that makes NO reference to a governing agreement → \n  `Yes - In this Document`; a TFC clause that expressly ties itself to the parent \n  Agreement → `Yes - Amended`.\n\n### INHERITABILITY TEST — Required for `Yes - Inherited`:\n\nA child may only be classified `Yes - Inherited` if the parent's TFC clause meets \nBOTH of the following:\n\n1. It is AUTOMATICALLY in effect (not gated behind a condition the child must satisfy), AND\n2. It is actually CAPABLE of terminating the child document (its scope reaches the child).\n\nIf the parent's TFC is conditional and unactivated, or cannot reach/end the child, \ninheritance FAILS → classify as `No - None` (NOT `Yes - Inherited`).\n\nNote: A child-activation conditional grant (parent says \"if provided in a SOW…\") that \nthe child DOES activate is `Yes - Amended`, not `Yes - Inherited`.\n\n---\n\n### TFC LANGUAGE INDICATORS (for KT clause interpretation):\n\nA clause IS a Termination for Convenience clause if it contains language granting one or \nboth parties the right to terminate **without cause** or **for any reason**, typically \nwith a notice period. Indicators include:\n\n- \"terminate for convenience\"\n- \"terminate without cause\"\n- \"terminate at will\"\n- \"terminate for any reason\"\n- \"terminate with [N] days [prior] [written] notice\" — when no breach/cause is required\n- \"may terminate this Agreement [or any portion thereof] upon [notice period]\" — when \nnot conditioned on breach\n- \"terminate a [SOW / Order / Statement of Work] without cause\"\n- \"convenience termination\"\n\n**Substance over label:** A clause IS TFC if it grants the substance of a no-cause \ntermination right even if it never uses the words \"convenience,\" \"without cause,\" \"at \nwill,\" or \"for any reason.\" Mutual \"either party may terminate on [N] days' written \nnotice\" language, with no cause requirement, IS TFC.\n\n**Term-phase timing does NOT disqualify:** A no-cause termination right is still TFC \neven if it is only exercisable during a specific phase of the term (e.g., only after \nthe Initial Term, only during a Renewal Term).\n\n### EXCLUSION — Termination Language That Is NOT TFC:\n\nDo NOT classify the following as TFC:\n\n- **Termination for breach/default/cause** — language tied to breach, material breach, \ndefault, failure to perform, with cure periods\n- **Termination for insolvency / bankruptcy** — automatic termination upon insolvency events\n- **Termination upon expiration** — natural expiry at end of term with no affirmative \nparty action\n- **Termination for failure of regulatory approval** — conditional terminations tied to \nspecific events\n- **Force majeure termination** — termination after prolonged force majeure\n- **Termination for change of control** — assignment-related triggers\n\n---\n\n### AI TFC SELECTION OPTIONS — REFERENCE TABLE:\n\n| AI TFC Selection | What it means | TFC source/clause content |\n|---|---|---|\n| **No - None** | TFC KT is empty/non-substantive for current document AND parent (if any), OR KT is absent AND no TFC language found in `{{DOCUMENT}}`, OR the parent's TFC fails the INHERITABILITY TEST and the child is silent | Leave blank |\n| **No - Overrides Parent** | Parent KT has TFC but current document's KT clause removes/wholly replaces the parent's TFC right. Scoped to immediate parent only — does not cascade further up the hierarchy. | Full clause text of the **child document**, prefixed with section number if available |\n| **No - Overridden by Child** | Current document's own KT has TFC (in this document, inherited, or amended) but a child document contains language that removes/nullifies that TFC right. Does NOT cascade upward. | Full clause text of the **child document** that contains the override language, prefixed with section number if available |\n| **Yes - In this Document** | Current document's KT has a self-contained TFC clause (or `{{DOCUMENT}}` fallback found one) — either a root document, or a child whose parent has NO TFC. *(See CR LOGIC below for the Change-Request-only exception.)* | Full clause text of the **current document**, prefixed with section number if available |\n| **Yes - Inherited** | Current document KT has no own TFC clause (and `{{DOCUMENT}}` fallback found none), but parent KT has TFC that is automatically in effect AND capable of terminating the child | Full clause text of the **parent document**, prefixed with section number if available |\n| **Yes - Amended** | Both parent and current document have TFC clauses that work together — including when the child modifies a term of the parent's TFC while the parent's grant remains in effect | Full parent clause text + full child clause text: `Parent: <text> // Child: <text>` — each prefixed with section number if available |\n\n---\n\n### 🆕 CR LOGIC — CHANGE REQUEST Considerations (APPLY ONLY IF A CHANGE REQUEST DOCUMENT IS IN SCOPE):\n\n**GATING CONDITION — CR Flag Detection Rule:** A document is treated as a Change Request \n(subject to CR LOGIC) if ANY of the following is true:\n\n- `{{METADATA}}` Document Title contains or is similar to `CHANGE REQUEST`, OR\n- Contract Type = `Change Request` or `Change Order` with an Order-level parent, OR\n- Contract Type = `Addendum` or `Amendment` with an Order-level parent, OR\n- `{{METADATA}}` Document Title is exactly `Service Request` or `Contract Request Change` \n  with an Order-level parent.\n\nAddenda and Amendments whose parent is a Master-category document are NEVER flagged as CR \n— they follow the AMENDMENT DOCUMENT TYPE RULE only.\n\nIf no document in the account hierarchy meets any of the above, skip this entire section.\n\n**Core principle:** A Change Request document (`CHANGE REQUEST`, `Service Request`, or \n`Contract Request Change`) is an Order-level amendment and is evaluated against its own \nimmediate parent (the Order/SOW) using the five patterns below. No document above the \nOrder/SOW level is reclassified as a result of CR LOGIC.\n\n**Pattern 1 — CR silent; Master TFC flows automatically to child (no invocation required):**\n- Master: unchanged\n- Child: `Yes - Inherited`\n- CR: `Yes - Inherited` — matches child, sources same clause text the child relied on\n\n**Pattern 2 — CR silent; Master TFC requires child to specifically invoke and child DOES invoke:**\n- Master: unchanged\n- Child: `Yes - Amended` — child invoked; clause cell = `Parent: <master text> // Child: <child text>`\n- CR: `Yes - Inherited` — CR inherits from child's resolved value, sources both clause texts the child relied on\n\n**Pattern 3 — CR silent; Master TFC requires child to specifically invoke and child does NOT invoke:**\n- Master: unchanged\n- Child: `No - None`\n- CR: `No - None` — matches child; blank clause cell\n\n**Pattern 4 — CR contains its own TFC language that adds or amends the right:**\n- Master Amendment that originally introduced TFC (e.g., 33513): `Yes - In this Document`\n- Original Master and any Master-level addenda/amendments without their own TFC (e.g., 129549, 146433): `Yes - Inherited`, sourced from the Master Amendment's clause text\n- Child/SOW (e.g., 156241): `Yes - Amended` — the CR's TFC amends the child's inherited right; clause cell = `Parent: <Master Amendment TFC text> // Child: <CR TFC text>`\n- CR (e.g., 195908): `Yes - In this Document` — CR stands on its own TFC language; source = full CR clause text\n- No document above the Child↔CR relationship is reclassified due to the CR.\n\n**Pattern 5 — CR contains its own TFC language that removes/nullifies the child's TFC right:**\n- Master: unchanged — `Yes - In this Document`\n- Child: `No - Overridden by Child`; source = full CR override clause text\n- CR: `No - Overrides Parent`; source = full CR clause text\n\n---\n\n### 🔒 STRICT CELL-CONTENT RULE FOR `TFC source/clause` COLUMN (CRITICAL):\n\nThe `TFC source/clause` cell contains **ONLY clause text from the contract**, optionally \nprefixed with a section number — nothing else. The following content is **STRICTLY \nFORBIDDEN** inside the cell:\n\n- ❌ Audit annotations such as `[KT: empty]`, `[KT populated]`, `[from KT]`, `[from document]`\n- ❌ Source markers such as `Source:`, `From:`, `Found in:`, `Citation:`\n- ❌ Status notes such as `[no clause]`, `[N/A]`, `[blank]`\n- ❌ Inheritance descriptors such as `Inherited from PNo XXXXX:`, `Per parent agreement:`\n- ❌ Any bracketed `[...]` metadata\n- ❌ Any meta-commentary about how the clause was located or processed\n\nThe **only structural labels permitted** inside the cell are:\n- `Section X.X:` — permitted as a prefix when a section number is found in `{{TRUEDOC+}}`. \nIf no section number is found, omit the prefix entirely and quote clause text only.\n- `Parent:` and `Child:` — permitted **exclusively for `Yes - Amended` rows** in the \nformat `Parent: <text> // Child: <text>`. Section numbers appear inside each segment: \n`Parent: Section X.X: <text> // Child: Section X.X: <text>`.\n\nNo other labels or prefixes are permitted.\n\n---\n\n### ANALYSIS LOGIC:\n\n**PHASE 1 — PER-DOCUMENT EXTRACTION (complete for ALL documents before proceeding):**\n\nFor each document in the account hierarchy:\n\n1. Read `{{kt+.sk___Termination_for_Convenience}}` for this document.\n   - **Present-and-populated (including DS_ dereferenced text):** Record full clause text. \n   Mark KT status = populated.\n   - **Present-but-empty or non-substantive:** Mark KT status = empty. TFC result = \n   No - None. No document scan attempted.\n   - **Absent:** Proceed to document fallback.\n\n2. **KT absent — Document fallback:** Scan `{{DOCUMENT}}` for TFC language using \nTFC LANGUAGE INDICATORS.\n   - **TFC found:** Record full clause text. Mark source = document fallback.\n   - **TFC not found:** TFC result = No - None.\n\n3. Record in SOURCE AUDIT LOG: PNo, KT status, fallback result, parent PNo, \nCHANGE REQUEST flag.\n\nRecord whether each document's TFC clause is self-contained or references a parent \nAgreement — this is required for Phase 2 classification.\n\n**PHASE 2 — ACCOUNT-LEVEL CLASSIFICATION (only after Phase 1 is complete):**\n\nUsing Phase 1 results only, classify each document:\n\n**Root documents (no Parent Pramata Number in {{METADATA}}):**\nApply ACCOUNT-LEVEL OUTLIER RULE:\n- WITH TFC → `Yes - In this Document`\n- WITHOUT TFC → `No - None`\n- NEVER `Yes - Inherited`, `No - Overrides Parent`, or `Yes - Amended`\n\n**Child documents (Parent Pramata Number present in {{METADATA}}):**\n\nFor Change Request documents (`CHANGE REQUEST`, `Service Request`, or `Contract Request \nChange`), apply CR LOGIC. For all others, apply the Decision Tree:\n\n1. **Current doc has TFC + parent PNo exists**\n   - **Parent has TFC OR child clause references the governing Agreement:**\n     - Child REMOVES or wholly REPLACES parent's TFC right → **No - Overrides Parent**\n     - Child works together with, modifies, or adjusts parent's TFC while grant survives \n     → **Yes - Amended** → `Parent: <full text> // Child: <full text>`\n   - **Parent has NO TFC AND child clause is self-contained** → **Yes - In this Document**\n2. **Current doc has TFC + parent has NO TFC** → **Yes - In this Document**\n3. **Current doc has TFC + NO parent PNo** → **Yes - In this Document** (covered by \noutlier rule above)\n4. **Current doc has NO TFC + parent has TFC**\n   - Passes INHERITABILITY TEST → **Yes - Inherited** → source = full parent clause text\n   - Fails INHERITABILITY TEST → **No - None**\n5. **Current doc has NO TFC + parent has NO TFC** → **No - None**\n6. **Current doc has NO TFC + NO parent PNo** → **No - None** (covered by outlier rule)\n\nAlso apply during Phase 2: if a child document's Phase 1 result shows it removes/nullifies \na parent's TFC right, update the parent's classification to **No - Overridden by Child** \nand set the parent's TFC source/clause cell to the child's override clause text.\n\nLook up section numbers in `{{TRUEDOC+}}` for each quoted clause. Prefix as \n`Section X.X:` if found; omit prefix if not found.\n\n---\n\n### OUTPUT STRUCTURE:\n\n#### 1. MANDATORY CONTRACT MAPPING\n*(PNo | Counterparty | Contract Status | Title | Type | Parent PNo | Amended Document Level | CHANGE REQUEST flag)*\n\n#### 2. VALIDATION CHECKLIST\n*(PNo | Status | KT context | Parent PNo | Parent KT context | Amended Document Level | CHANGE REQUEST flag)*\n*(Populated from Phase 1 results only — do not pre-fill)*\n\n#### 3. PHASE 1 EXTRACTION LOG (SOURCE AUDIT LOG)\nPopulated during Phase 1. Format:\n\n| PNo | KT status (current doc) | Document fallback (current doc) | KT status (parent doc) | CHANGE REQUEST? |\n|---|---|---|---|---|\n| XXXXX | KT populated | N/A — KT used | KT populated / KT empty / N/A — no parent | No |\n| XXXXX | KT empty — No - None | N/A — KT present (not scanned) | N/A | No |\n| XXXXX | KT absent | TFC found via document scan | KT populated / KT empty / N/A | No |\n| XXXXX | KT absent | No TFC found in document — No - None | N/A | Yes — pattern 3 |\n\n#### 4. SYSTEMATIC ANALYSIS (Phase 2)\nFor each contract:\n- PNo, name, status, type\n- Phase 1 TFC result (present / absent) and source\n- Parent Phase 1 result, if applicable\n- Inheritability test result, if inheritance was considered\n- Amended Document Level (Master-level / Order-level / N/A)\n- Is this a CHANGE REQUEST (CHANGE REQUEST / Service Request / Contract Request Change)? \n  If yes, which CR LOGIC pattern applies and why\n- Decision tree branch applied\n- Final AI TFC value\n\n#### 5. AITable — TFC Classification Results (FINAL OUTPUT — nothing after this)\n\nColumns in this exact order:\n\n1. **Pramata No.** — RAW integer only, NO PRAMATANOREF formatting\n2. **Counterparty**\n3. **Contract Status** — from {{METADATA}}, canonical set only\n4. **Doc Title** — document title only, no prefix\n5. **Contract Type**\n6. **AI TFC** — one of: `No - None` / `No - Overrides Parent` / `No - Overridden by Child` / `Yes - In this Document` / `Yes - Inherited` / `Yes - Amended`\n7. **TFC source/clause** — full clause text per STRICT CELL-CONTENT RULE. No annotations.\n\n**DO NOT ADD ANYTHING AFTER THE AITABLE.**\n\n---\n\n### FINAL VERIFICATION (before submitting):\n- ✓ Does my results table have exactly N rows?\n- ✓ Did Phase 1 complete for ALL documents before Phase 2 classification began?\n- ✓ For every \"No - None\" row, did KT return empty/non-substantive OR did both KT AND \ndocument fallback yield no TFC — OR did the parent's TFC fail the INHERITABILITY TEST?\n- ✓ For every \"Yes - Inherited\" row, does the parent's TFC pass the INHERITABILITY TEST?\n- ✓ Did I send a child whose parent TFC is conditional/unactivated to \"No - None\" \nrather than \"Yes - Inherited\"?\n- ✓ Are all root documents (no Parent PNo) classified as \"Yes - In this Document\" \nor \"No - None\" only?\n- ✓ Are all \"Yes - Amended\" rows formatted as `Parent: <text> // Child: <text>`?\n- ✓ Did I classify a child that MODIFIES a parent TFC term as `Yes - Amended` rather \nthan `No - Overrides Parent`?\n- ✓ Did I classify a child referencing the governing Agreement as `Yes - Amended` even \nwhen the parent KT block was empty?\n- ✓ Did I reserve `No - Overrides Parent` ONLY for children that remove or wholly \nreplace the parent's TFC right?\n- ✓ Did I mistakenly flag termination-for-cause or termination-for-breach as TFC?\n- ✓ Does EVERY TFC source/clause cell contain ONLY clause text — no annotations, no \nsource markers, no audit notes?\n- ✓ Is KT and fallback status recorded ONLY in the Phase 1 Extraction Log?\n- ✓ Does every row have a Contract Status value from the canonical set?\n- ✓ Is the 7-column AITable the LAST thing in the response?\n- ✓ If any Change Request document exists (CHANGE REQUEST / Service Request / Contract \nRequest Change): was CR LOGIC applied correctly with the correct pattern?\n- ✓ If NO Change Request document exists: was CR LOGIC skipped entirely?\n- ✓ For every Amendment/Addendum: was Amended Document Level determined and applied correctly?\n\nIf ANY answer is NO, STOP and revise.\n\n### COMPLETENESS ATTESTATION:\n- [ ] All contracts from the account hierarchy included in CONTRACT MAPPING\n- [ ] All Pramata Numbers present as RAW integers (no PRAMATANOREF formatting)\n- [ ] Phase 1 completed for every document before Phase 2 began\n- [ ] KT empty/non-substantive = No - None applied directly (no document scan attempted)\n- [ ] KT absent = `{{DOCUMENT}}` fallback scan performed before concluding No - None\n- [ ] DS_ references in KT blocks dereferenced to retrieve full clause text\n- [ ] INHERITABILITY TEST applied to every candidate `Yes - Inherited` row\n- [ ] No termination-for-cause language was misclassified as TFC\n- [ ] All root documents correctly classified under ACCOUNT-LEVEL OUTLIER RULE\n- [ ] Children modifying a parent TFC term correctly classified as `Yes - Amended`\n- [ ] Children referencing the governing Agreement classified as `Yes - Amended` even \nwhen parent KT is empty\n- [ ] Amended Document Level determined for every Amendment/Addendum and applied in Phase 2\n- [ ] Contract Status populated from canonical set\n- [ ] Section numbers looked up in `{{TRUEDOC+}}` and prepended where found\n- [ ] Full clause text quoted in all TFC source/clause cells — no truncation\n- [ ] Every Change Request document (CHANGE REQUEST / Service Request / Contract Request \nChange) evaluated under CR LOGIC with correct pattern\n- [ ] No document outside the immediate CR↔parent relationship reclassified due to CR LOGIC\n- [ ] The 7-column AITable is the final output\n\nTotal rows in results: _____ (must equal N)"
      }
    ],
    "config": {
      "llmTier": "Reasoning",
      "model": "Sonnet (32K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2025-11-12",
    "updatedAt": "2026-07-22",
    "agentType": "Account Assist"
  },
  {
    "id": "agent-002",
    "name": "Page Sequence Analyzer",
    "solution": "Document Processing",
    "agentTypes": [
      "Custom Agentic Solutions"
    ],
    "contextMode": "ALL-DOCS",
    "downloads": 2,
    "useCase": "Analyzes multi-page contract PDFs and assigns a structured page sequence with document type labels.",
    "clientTags": [
      "MHA"
    ],
    "prompts": [
      {
        "id": "p1",
        "label": "Page Marker Extraction",
        "type": "markdown",
        "content": "Looking at this document carefully:\n\n- Physical page 1 = signature page, printed page number **6**, footer `NY:507853v6`, contains \"ORIGINAL\" stamp, \"IN WITNESS WHEREOF\", execution fields (DEA#, Tax ID, NCPDP#, etc.)\n- Physical pages 2–10 = body pages printed 1–5, then DEFINITIONS (7), EXHIBIT A (8), CMS ADDENDUM (9–10)\n\nThe current prompt's Terminal Boilerplate Pre-Check + Signature/Execution rule is **overriding the printed page number** on the signature page, pulling it to the end of the body instead of honoring its printed label of **6**. The fix is a clarification that a signature/execution page bearing a printed page number from the document's own sequence must be ordered by that printed number, not relocated by the signature-page rule.\n\nHere is the full updated prompt with **Patch 7** applied surgically to the Signature/Execution placement rule and the Terminal Boilerplate Pre-Check:\n\n---\n\n**Page Sequence Analyzer Prompt — v2**\n*Changes from v1: Patches 1–4 applied. Changes from prior v2: Patch 5 (cover page pre-anchor), Patch 5a (member letter pre-cover anchor), Patch 6 (miscellaneous non-contractual page handling), Patch 7 (printed-label authority on signature/execution pages) applied.*\n\n---\n\nYou are a document structure analyst. Your task is to determine whether the pages of this contract are in the correct logical sequence, and if not, identify the correct order.\n\nAnalyze {{TRUEDOC+}} {{DOCUMENT}} using the following approach. {{TRUEDOC+}} provides the tagged document format with structured metadata — page numbers, paragraph identifiers, and table references — to support accurate page boundary detection and clause location tracking throughout this analysis.\n\nBe concise in your step-by-step reasoning. Each step should produce the required output in as few words as possible. Do not narrate your thinking process — state findings directly.\n\n---\n\n**Step 1 — Identify the Title Page**\n\nScan the document for the title page — defined as the page bearing the formal agreement title (e.g., a centered heading such as \"XYZ Agreement\" or \"MHA LONG TERM CARE NETWORK, INC. PARTICIPATING PROVIDER AGREEMENT\") followed by party identification language or a preamble. Record which physical page number this is.\n\nThe title page frequently has no printed page number — this is expected and normal. Do not bundle the title page with adjacent content; it is its own discrete logical page and must anchor the start of the main agreement body, appearing before all Articles in the final sequence.\n\n**[PATCH 5a] Member Letter Detection — Pre-Cover Anchor**\n\nBefore applying the Cover Page rule below, scan all physical pages for a Member Letter page. A Member Letter page is identified by ALL of the following signals:\n\n- A bolded or prominently styled salutation heading of exactly **\"To All MHA LTC Members:\"** or a close variant (e.g., \"To All MHA LTC Network Members:\", \"To All Members:\") appearing as the first or near-first line of the page\n- No printed page number in the footer (the footer is blank, carries only the document reference code with no numeric sequence, or is absent entirely)\n- Content that is addressed directly to network members — explaining the agreement, summarizing key terms, or providing context and encouragement to sign — written in plain language rather than formal contract language\n- Contains no Article headings, Section headings, numbered clauses, or formal exhibit labels\n\nIf such a page is identified, designate it the **Member Letter page**. The Member Letter page must be placed at the absolute beginning of the document — before the Cover Page, before the title page, before any Amendment pages, and before all other content — in the final sequence. This rule is not overridable by content flow or printed labels.\n\nIf no page satisfies all Member Letter signals above, no Member Letter designation is made and the Cover Page rule below applies as the outermost pre-anchor.\n\n**[PATCH 5] Cover Page Detection — Pre-Title Anchor**\n\nBefore finalizing the title page position, scan all physical pages for a Cover Page. A Cover Page is distinct from both the Member Letter page and the title page and is identified by ALL of the following signals:\n\n- A bolded or prominently styled section heading such as **\"THE PROVIDER AGREEMENT\"**, **\"COVER PAGE\"**, **\"INTRODUCTION\"**, or a similar introductory label (not the formal agreement title itself)\n- No printed page number in the footer (the footer is blank, carries only the document reference code with no numeric sequence, or is absent entirely)\n- Content that is introductory, contextual, or summary in nature — e.g., a letter from an executive, a plain-language summary of key terms, or a welcome/orientation narrative directed at the signing party\n- Often concludes with a signature or sign-off (e.g., \"Sincerely, [Name], Chairman & CEO\") but contains no Article headings, Section headings, or numbered clauses\n\nIf such a page is identified, designate it the **Cover Page**. The Cover Page must be placed at the beginning of the document — after the Member Letter page (if one exists) but before the title page, before any Amendment pages, and before all other body content — in the final sequence. This rule is not overridable by content flow. If no page satisfies all signals above, no Cover Page designation is made.\n\n**Priority order when both are present:**\nIf both a Member Letter page and a Cover Page are identified in the same document, the final pre-body sequence is strictly:\n\n> **Member Letter → Cover Page → Title Page → [Amendment pages if any] → Body Articles**\n\n**[PATCH 6] Miscellaneous Non-Contractual Page Detection**\n\nAfter identifying any Member Letter and Cover Page above, scan all remaining physical pages for Miscellaneous Non-Contractual pages. A Miscellaneous Non-Contractual page is identified by ALL of the following signals:\n\n- Contains no contractual obligations, article headings, section headings, numbered clauses, exhibit labels, or party signature blocks\n- Contains no printed page number from the document's own numbering sequence (no footer number, no centered body number, no exhibit label belonging to this document)\n- Content consists entirely of administrative, transmittal, or logistical material — examples include but are not limited to: postal receipts, certified mail forms, transmittal cover sheets, routing slips, fax cover pages, or other non-agreement artifacts physically bundled with the document\n\n**Placement rule:** A Miscellaneous Non-Contractual page that is already in its correct physical position (i.e., it does not interrupt the printed page number sequence of the surrounding pages) must remain in its current position — do not move it. A Miscellaneous Non-Contractual page that interrupts the printed page number sequence (i.e., it sits between two pages whose printed numbers are otherwise contiguous) must be relocated to immediately before the first page of the printed number sequence, ahead of all contractual content. Do not place it after the last page of the document unless it was already there physically and does not break any sequence.\n\nIf no page satisfies all Miscellaneous Non-Contractual signals, no designation is made and this rule has no effect.\n\nIf the document contains an Amendment, the Amendment pages must always precede the base agreement they amend. However, if printed page numbers are present and explicitly dictate a different order, defer to the printed page numbers over this default rule.\n\n---\n\n**Step 2 — Count physical pages using page boundary rules**\n\n[PATCH 1] Identifying the document reference code for this document. Document reference codes vary by document family. Common formats include NY:507853v6, #12377233 v2, CHI:4521309v3, and similar alphanumeric or pound-prefixed strings that appear consistently in footers across pages. Before applying any page-break or page-number detection logic, identify the repeating footer string for this specific document. You will confirm it formally in Step 2.5 and use it as the document reference code throughout all subsequent steps. Do not assume the format matches any prior example — observe what is actually present in this document.\n\nPhysical page breaks are identified by the document reference code appearing as a standalone line immediately followed by new section-level content (a heading, article title, exhibit label, or addendum header). Where available, {{DOCUMENT}} {{TRUEDOC+}} page metadata can be used to corroborate physical page boundaries identified via this rule.\n\nDo NOT treat the document reference code as a page break when it appears:\n\n- Inside a table cell\n- As part of a table row (e.g., | NY:507853v6 | 8 |)\n- Embedded mid-paragraph\n- On the same line as a standalone number, separated only by whitespace (e.g., NY:507853v6                                     2) — this is a printed page number, not a page break (see Step 3)\n\nOnly a standalone document reference code on its own line, followed immediately by a new section heading, marks a true page boundary.\n\nCount every physical page using this rule. Record the total. The output sequence must contain exactly that many integers — no more, no less.\n\nAfter counting physical pages, verify that the page_num_ tag sequence is fully contiguous with no gaps (e.g., page_num_1, page_num_2, ..., page_num_N with no integers skipped). If any integer is missing from the sequence, record this finding — it will be noted in the Evidence field.\n\n---\n\n**Step 2.5 — Footer Pattern Audit**\n\nScan all physical pages and record every unique footer string observed. Identify:\n\n- The repeating body footer (appears on 3+ consecutive pages)\n- The terminal footer (a footer that differs from the repeating body footer, typically appearing only on the last page)\n\n[PATCH 4] Anchor the document reference code here. During this audit, explicitly identify and record the document reference code format used in this document (e.g., NY:507853v6, #12377233 v2). State it explicitly as: \"Document reference code for this document: [value]\". Use this identified string — not any example strings from Steps 2 or 3 — as the reference code to apply throughout all subsequent detection logic.\n\n**[PATCH 5/5a/6 — Footer Audit Extension]** During this audit, also record which physical pages carry NO numeric sequence in their footer (i.e., the footer contains only the document reference code with no page number, or is entirely absent). Flag each such page explicitly. These pages are candidates for Member Letter, Cover Page, Miscellaneous Non-Contractual, or title page classification per Step 1, and their lack of a footer page number must be noted in the Evidence field.\n\nNote any completeness signals observed (e.g., final page carries the repeating body footer with no distinct terminal footer, sub-document ends on repeating footer). Record these findings for inclusion in the Evidence field only — they do not affect the Validation value.\n\n---\n\n**Step 3 — Extract printed page numbers and labels**\n\nScan every page for printed page identifiers in headers, footers, or body text. Recognized formats include:\n\n- Numeric sequences: - 3 -, Page 1 of 12, NY:507853v6 | 6\n\n[PATCH 2] Centered dash-wrapped numerals: -1-, -2-, -3- etc. appearing as a standalone centered line in the body of the page (not in a header or footer). These are authoritative printed page numbers exactly like any other numeric sequence and must be recorded for every page on which they appear.\n\n- Numeric exhibit sub-labels: A-1, A-2, B-1, B-2, etc. appearing in headers, footers, or as standalone section anchors\n- Schedule sub-labels: Schedule 1, Schedule 2, etc.\n- Footer sequences: Any repeating footer pattern containing a number or alphanumeric label\n- Footer page numbers: Page numbers appearing alongside the document reference code in any of these formats are explicit printed page numbers, are authoritative for ordering, and must never be mistaken for page breaks. Scan for these on every physical page, not only on exhibit pages or footer regions:\n  - Table-embedded: | NY:507853v6 | N |\n  - Whitespace-separated: NY:507853v6                                     N\n  - Pound-prefixed with version: #12377233 v2 appearing in the footer alongside a separate body page number — in this case, record the body page number as the printed page number (see Dual-Signal Pages below)\n\nIn all cases, record N as the printed page number for that physical page.\n\n- Standalone exhibit and attachment headings: Labels such as \"Exhibit A\", \"Exhibit B\", \"Exhibit C\", \"Attachment 1 to Exhibit A\", \"Attachment 2 to Exhibit A\", \"Schedule 1 to Exhibit A\" appearing as standalone headings or in page headers. These are printed page labels and are authoritative for ordering the pages on which they appear, exactly the same as numeric printed page numbers.\n\n[PATCH 3] Dual-Signal Pages. Some pages carry both a footer document reference code (e.g., #12377233 v2) and a separate printed page number elsewhere on the page — either a centered body number (e.g., -2-) or a body exhibit label (e.g., B-10). These are complementary signals on the same physical page, not conflicting signals. In all such cases:\n\n- Record the centered body number or exhibit label as the printed page number for that page.\n- Treat the footer reference code as a page identity confirmation only — it is not itself the page number.\n- Do not report a dual-signal page as ambiguous. The body-level number or label is authoritative.\n\n**[PATCH 7] Signature/Execution Page with Printed Page Number**\n\nA signature/execution page may bear a printed page number from the document's own numbering sequence (e.g., footer reads \"NY:507853v6    6\", placing it as page 6 of the agreement). When a signature/execution page carries such a printed number, record that printed number in the Step 3 map exactly as you would for any other body page. The printed number is fully authoritative and dictates this page's position in the sequence. Do NOT flag this page as requiring relocation to the end of the body — it must be ordered by its printed label, not by its page type.\n\nA signature/execution page is only subject to the end-of-body placement rule in Step 5 when it carries NO printed page number from the document's own sequence (i.e., the footer is absent or carries only the document reference code with no numeric label).\n\n**[PATCH 5/5a/6 — Special Page Label Handling]** Pages identified as a Member Letter page, Cover Page, or Miscellaneous Non-Contractual page per Step 1 will typically have no printed page number. Record each explicitly in the Step 3 map as follows:\n\n- Member Letter page: \"printed page: none — Member Letter\"\n- Cover Page: \"printed page: none — Cover Page\"\n- Miscellaneous Non-Contractual page: \"printed page: none — Miscellaneous Non-Contractual\"\n\nDo not treat the absence of a page number on these pages as ambiguous or as a sequencing failure. Their positions are governed by Step 1 rules and they are fully exempt from content-flow ordering in Step 4. For Miscellaneous Non-Contractual pages specifically, note in the map whether the page is in a position-breaking location (i.e., it sits between two otherwise contiguous printed page numbers) or a non-breaking location (it does not interrupt any contiguous sequence).\n\nFor each physical page, record either its printed number/label or \"none.\" Do not estimate or infer — only record what is explicitly visible in the document text.\n\nBuild a simple map:\n\nPhysical page 1 → printed page [X or none]\nPhysical page 2 → printed page [X or none]\n...\n\nThis map is MANDATORY and must be explicitly output before proceeding to Step 4. Do not skip, abbreviate, or summarize this map. List every physical page individually.\n\nIf printed page labels are present on any pages, those labels are authoritative for ordering those pages. Pages with no printed label are ordered using content flow (Step 4). The Member Letter page always precedes the Cover Page and title page. The Cover Page always precedes the title page. Miscellaneous Non-Contractual pages are repositioned only when they break the printed sequence. Signature/execution pages bearing a printed page number are ordered by that number, not relocated by page type.\n\nIMPORTANT: Do not silently fail on page label extraction. If labels are detected on some pages but not others, explicitly record \"none\" for each page missing a label and flag the discrepancy. Do not fall back to content-flow-only ordering without first explicitly stating that label extraction yielded no results across ALL pages.\n\nCRITICAL: If ANY printed page labels are found on ANY pages, you MUST use those labels as the primary ordering mechanism. Content flow (Step 4) may only be used to position pages that have no printed label. Content flow must NEVER override a printed page label.\n\nImplied sequence completion: After extracting all explicit printed labels, verify the implied contiguous sequence. If printed page numbers N and N+2 are both confirmed but N+1 is absent from any explicit label, use content flow to identify which unlabeled physical page carries printed page N+1 and assign it accordingly. A physical page whose content falls between two confirmed printed page numbers in content flow must be treated as carrying the intervening printed page number — this assignment is then authoritative for ordering. Document this inference explicitly in the Step 3 map with a note such as \"implied page N by content flow between confirmed pages N-1 and N+1.\"\n\nAfter building the map, verify that the sequence of printed labels is contiguous and complete. If a gap exists in the sequence (e.g., Exhibit A is followed by Exhibit C with no Exhibit B), explicitly flag the missing label as absent from the document. Note this in the Evidence field.\n\n**Step 3 Example — Page Label Extraction Map**\n\nSuppose a document has 6 physical pages. The correct map output should look exactly like this:\n\nPhysical page 1 → printed page: none\nPhysical page 2 → printed page: Exhibit A\nPhysical page 3 → printed page: Exhibit A (continued)\nPhysical page 4 → printed page: Attachment 1 to Exhibit A\nPhysical page 5 → printed page: none\nPhysical page 6 → printed page: Exhibit B\n\n⚠ Discrepancy flagged: Physical pages 1 and 5 have no printed page label. Exhibit C is absent from the document — gap detected after Exhibit B.\n\nBecause printed labels were found on physical pages 2, 3, 4, and 6, those labels are authoritative. Physical pages 1 and 5 will be positioned using content flow in Step 4.\n\n---\n\n**Step 4 — Analyze content flow**\n\nUse content signals to confirm or fill gaps from Step 3. Use this step ONLY to position pages that have no printed page label as recorded in the Step 3 map. Do not use content flow to override, adjust, or reinterpret any printed page label.\n\n**[PATCH 5/5a/6 — Special Page Exemption]** Any page designated as a Member Letter page, Cover Page, or Miscellaneous Non-Contractual page in Step 1 is fully exempt from content flow analysis. Their positions are governed by Step 1 rules and must not be re-evaluated, moved, or questioned in this step regardless of any content flow signal.\n\n**Classification Rules**\n\nBefore assigning any unlabeled page to a position, classify it using the following rules in order. Apply the first rule that matches and do not proceed to subsequent rules.\n\n1. **[PATCH 5/5a/6]** If the page has been designated a Member Letter page, Cover Page, or Miscellaneous Non-Contractual page in Step 1, skip classification — its position is already governed by Step 1 rules and must not be re-evaluated in this step.\n2. If the page bears a standalone section title (e.g., \"DEFINITIONS\", \"GLOSSARY\") with no Article number, no printed page label, and no exhibit or addendum designation, classify it as a reference appendix. Place it after the last Article page and the signature/execution page, and before the first exhibit. Do not place it before any Article page regardless of where the terms it defines first appear in the agreement body.\n3. If the page contains only intake forms, welcome letters, questionnaire content, or pre-agreement administrative material with no formal exhibit label, section heading, or article number, classify it as pre-agreement administrative material. Place it after the main agreement body and all exhibits.\n4. If the page contains substantive article or section content, classify it as a body page and proceed to the Natural-Successor Test below.\n5. If the page contains party signature blocks or execution fill-in fields AND no Article heading, Section heading, or numbered clause, AND no printed page number from the document's own sequence, classify it as an unanchored signature/execution page and apply the end-of-body placement rule in Step 5. **[PATCH 7]** If the page contains party signature blocks or execution fill-in fields but ALSO bears a printed page number from the document's own sequence, classify it as a labeled body page and order it by its printed number — do not apply the end-of-body placement rule.\n\n**Natural-Successor Test**\n\n⟶ PATCH START — Terminal Boilerplate Pre-Check\n\nBefore running the standard successor-matching steps below, scan all unpositioned body pages for any page that contains BOTH:\n(a) provisions semantically identified as terminal boilerplate — Severability, Further Assurances, Entire Agreement, or equivalent wrap-up clauses, AND\n(b) a party signature/execution block (e.g., \"IN WITNESS WHEREOF\", \"By:\", \"Date:\", Tax ID, DEA#, NCPDP#, or similar execution fields).\n\n**[PATCH 7 — Pre-Check Gate]** Before designating any such page as the terminal body page, first check whether it carries a printed page number from the document's own sequence. If it does, it is a labeled body page — order it by its printed number and do NOT designate it terminal via this pre-check. Only proceed with the terminal body page designation if the page has NO printed page number from the document's own sequence.\n\nIf such an unlabeled page exists satisfying both (a) and (b), designate it the terminal body page immediately. Do not subject it to the standard section-letter advancement test. Place it at the end of the main agreement body — after the last non-terminal Article page — regardless of how its section letters compare to any other unpositioned page. Any unpositioned body pages whose section letters fall alphabetically between the prior page's closing section letter and this terminal page's opening section letter are displaced pages: place them immediately after the terminal body page and before any exhibits or reference appendices.\n\nIf no page satisfies both conditions (a) and (b) without a printed page number, skip this pre-check and proceed to the standard steps below.\n\n⟶ PATCH END\n\nFor every unlabeled page classified as a body page, before assigning it to a position, run this test:\n\n1. Identify the page that would immediately precede it in the candidate sequence.\n2. State that preceding page's closing content signal (last section heading, last clause number, last sentence fragment).\n3. Identify all other unpositioned body pages and state each one's opening content signal (first section heading, first clause number, first sentence fragment).\n4. Compare: which unpositioned page's opening signal is the strongest continuation of the preceding page's closing signal? The strongest continuation is defined as: section or article numbering advances by exactly one unit (e.g., II.C → II.D), OR a sentence broken at the preceding page's close is completed at this page's open.\n5. Assign the strongest match to the position. If no broken sentence exists and numbering advances equally from multiple candidates, assign by ascending article/section number.\n6. State the result explicitly: \"Preceding page closes with [X]. Candidate [page N] opens with [Y] — assigned as natural successor.\"\n\nDo not assign any body page to a position without completing and stating this test.\n\n**Content Flow Confirmation Checks**\n\nAfter all unlabeled pages have been classified and positioned using the rules above, confirm:\n\n- Do section headings across all pages follow a logical progression without gap or repeat?\n- Does narrative text flow coherently between pages or break mid-sentence?\n- Do signature blocks, exhibits, and addenda appear in expected positions?\n- Does the Member Letter page (if present) correctly precede the Cover Page?\n- Does the Cover Page (if present) correctly precede the title page?\n- Does the title page correctly precede all Articles?\n- Are Miscellaneous Non-Contractual pages in non-breaking positions, or correctly relocated to before the printed sequence if they were breaking it?\n- Are signature/execution pages with printed numbers correctly ordered by those numbers rather than relocated to end-of-body?\n- Does the document contain interleaved document types (e.g., an Amendment mixed with a base agreement)? If so, apply the correct logical ordering rule: Amendment pages first, base agreement body second, then exhibits and schedules last.\n\n---\n\n**Step 5 — Determine the correct sequence**\n\nApply the following ordering rules strictly in priority order:\n\n1. **Member Letter page first** (if identified in Step 1). The Member Letter page precedes all other content including the Cover Page, Amendment pages, and the title page.\n2. **Cover Page second** (if identified in Step 1). The Cover Page follows the Member Letter page (or is first if no Member Letter exists), and precedes all Amendment pages and the title page.\n3. **Miscellaneous Non-Contractual pages** (if identified in Step 1): If a Miscellaneous Non-Contractual page is in a non-breaking position in the physical document, retain it in its current physical position. If it is in a position-breaking location (sitting between two otherwise contiguous printed page numbers), relocate it to immediately before the first page of the document's printed sequence, placed after any Member Letter or Cover Page and before the title page and all contractual content.\n4. Title page first among all main agreement body pages (immediately after any pre-body pages resolved by rules 1–3 above).\n5. Main body pages follow the title page, sorted by printed label ascending (or by content flow if no label). **[PATCH 7]** Signature/execution pages bearing a printed page number from the document's own sequence are treated as standard labeled body pages and sorted by that printed number — they are not subject to the end-of-body placement rule below.\n6. **Signature/execution page end-of-body placement (unanchored only):**\n   This rule applies ONLY to a signature/execution page that carries NO printed page number from the document's own sequence. Such a page is placed at the END of the main agreement body — immediately after the last Article page and before any exhibits — unless a printed page label explicitly dictates a different position. This rule is not overridable by content-flow judgment; apply it only when the page-type test is met AND no printed number is present.\n7. Footer-anomaly tie-breaker:\n   If a page's footer differs from the repeating body footer (e.g., a different date or version stamp), do NOT treat that difference alone as a reordering signal. Use it only to corroborate a placement already determined by page type or printed label. A differing footer on an unanchored signature/execution page confirms end-of-body placement; it never moves a substantive Article page or a labeled signature page.\n8. Exhibit pages follow all main body pages. Within exhibits, apply this strict sub-sort order:\n   - Sort first by exhibit letter ascending (Exhibit A before Exhibit B before Exhibit C).\n   - Within each exhibit, sort sub-documents in this fixed order:\n     - Exhibit body pages (labeled \"Exhibit A\", \"Exhibit B\", etc.) — all continuation pages follow immediately after their labeled first page\n     - Schedule pages ascending by number (Schedule 1, Schedule 2, etc.)\n     - Attachment pages ascending by number (Attachment 1, Attachment 2, etc.)\n   - Unlabeled or blank pages within an exhibit group must be placed after ALL labeled pages in that group, not inserted between labeled pages, unless content flow provides unambiguous mid-section evidence (e.g., a sentence that breaks mid-paragraph across the blank page).\n9. Amendment pages precede all base agreement pages and exhibits unless printed labels explicitly indicate otherwise.\n10. Pages containing only intake forms, welcome letters, questionnaire content, or pre-agreement administrative material with no formal label must be placed after the main agreement body and all exhibits.\n11. The output must contain exactly as many integers as there are physical pages.\n\nOutput ONLY a comma-separated list of physical page integers in correct logical order.\nExample: if the document has 5 pages and pages 3 and 4 are swapped, output: 1, 2, 4, 3, 5\nIf the page order is already correct, output: IN ORDER\n\nOnly output IN ORDER if the Step 3 map confirmed that ALL physical pages with printed labels are already in ascending sequence AND all pages without printed labels are correctly positioned by content flow. If there is any doubt, output the explicit sequence.\n\n---\n\n**Step 5.5 — Verify the sequence**\n\nFor every boundary (P→Q) where Q was positioned by content flow rather than a printed label, explicitly state: \"P closes with [last content signal]; Q opens with [first content signal]; continuity = [YES/NO].\" Do not mark this step silent. Output the boundary tests before populating the Validation field.\n\n**CHECK A — Adjacency continuity:**\nFor each adjacent pair (P, Q) in the Step 5 output, test whether Q's opening content genuinely continues P's closing content:\n- Section/Article numbering advances without gap or repeat (e.g., II.C -> II.D, Article VII -> Article VIII), AND\n- No sentence broken across the boundary is left uncompleted by Q.\nA MEMBER LETTER page is exempt as a source page — it precedes the Cover Page or title page by rule and need not satisfy a content-continuity test at its trailing boundary.\nA COVER PAGE is exempt as a source page — it precedes the title page by rule and need not satisfy a content-continuity test at its trailing boundary.\nA MISCELLANEOUS NON-CONTRACTUAL page is exempt as a source page and as a destination page — it carries no contractual content and continuity testing does not apply at either its leading or trailing boundary.\nA LABELED SIGNATURE/EXECUTION page (one bearing a printed page number) is treated as a standard body page for continuity testing — its adjacency boundaries are tested normally. **[PATCH 7]** Do not exempt a labeled signature/execution page from continuity testing merely because it contains execution fields; its printed number places it in sequence and that placement must be verified.\nAn UNANCHORED SIGNATURE/EXECUTION page (no printed page number) is exempt as a source page (it continues into nothing) but must still be the LAST body page (see Check B).\nIf any adjacency breaks a continuity the document otherwise exhibits → Validation = **REQUIRES REVIEW**. Record the breaking boundary in Evidence.\n\n**CHECK B — Rule conformance:**\nConfirm ALL of: Member Letter page (if present) is first; Cover Page (if present) is second (or first if no Member Letter exists); Miscellaneous Non-Contractual pages are in non-breaking positions or correctly relocated before the printed sequence; title page is first in the body (immediately after any pre-body pages); labeled signature/execution pages are ordered by their printed number within the body sequence; unanchored signature/execution page (if present) is last in the body; exhibits follow the body in A→B→C order; sub-documents ordered body → Schedule → Attachment; intake/admin pages after all exhibits; implied printed numbers in strict ascending order. Any violation → Validation = **REQUIRES REVIEW**, and record which rule failed in Evidence.\n\n**Resolution:**\n- Fails Check A or B → Reorder Required = YES, output the corrected sequence, Validation = **REQUIRES REVIEW**\n- Passes A and B, output = physical order → Reorder Required = NO, Correct Page Sequence = IN ORDER, Validation = CORRECT\n- Passes A and B, output differs from physical order → Reorder Required = YES, output the sequence, Validation = CORRECT\n\n---\n\n**Step 6 — Summarize evidence**\n\nEvidence Used (150 max characters): state what signals confirmed the correct sequence. Note any completeness signals (repeating footer on final page, missing cross-referenced content, page_num_ tag gaps, Miscellaneous Non-Contractual pages found and their disposition, labeled vs. unanchored signature page determination) as informational context. If the Step 5.5 re-derivation found a discrepancy, state it explicitly.\n\nStop reasoning. Output the AITable now.\n\n{{ANSWER}}\n\n---\n\n**ARTIFACT_TITLE: Page Sequence Analysis**\n\n| Pramata Number | Document Title | Reorder Required | Correct Page Sequence | Evidence Used | Validation |\n|---|---|---|---|---|---|\n| [from document metadata] | [from document metadata] | [YES / NO] | [integers only, comma-separated, or \"IN ORDER\"] | [1–2 sentences] | [CORRECT / REQUIRES REVIEW] |"
      }
    ],
    "config": {
      "llmTier": "Reasoning",
      "model": "Sonnet (32K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2025-09-01",
    "updatedAt": "2026-07-22",
    "agentType": "Custom Agentic Solutions"
  },
  {
    "id": "agent-003",
    "name": "High-Risk Contract Identifier",
    "solution": "Risk & Compliance",
    "agentTypes": [
      "Custom Agentic Solutions",
      "Account Assist"
    ],
    "contextMode": "DOC-AT-A-TIME",
    "downloads": 0,
    "useCase": "Identifies high-risk contracts by flagging non-standard liability caps, uncapped indemnification, auto-renewal traps, or missing termination rights.",
    "clientTags": [
      "Wasabi"
    ],
    "prompts": [
      {
        "id": "p1",
        "label": "Risk Signal Extraction",
        "type": "english",
        "content": "# PROMPT 1 — Per-Document Extraction & Risk Evaluation (Preliminary)\n\n> **Context mode:** ALL-DOCS. All contracts are processed in a single pass.\n> Analyze each document independently and emit one compact record per document that Prompt 2 consumes.\n> **Variables used:** `{{DOCUMENT}}`, `{{METADATA}}`, `{{kt+.Limitation of Liability}}`, `{{kt+.Termination for Convenience}}`, `{{kt.sk___Doc_Source}}`\n---\n\n## ROLE\nProcess each contract exactly once. Do not re-evaluate any contract \nafter emitting its compact record.\n\nYou analyze **one contract** and produce a structured findings record. Do not\nevaluate any document other than the one in context. Do not infer from the title\n— use the contract text and metadata.\n\nContract text: {{DOCUMENT}}\nContract metadata: {{METADATA}}\nLimitation of Liability key term: {{kt+.Limitation of Liability}}\nTermination for Convenience key term: {{kt+.Termination for Convenience}}\nDoc Source: {{kt.sk___Doc_Source}}\n\n---\n\n## STEP 1 — ESTABLISH CONTRACT ROLE AND ACCOUNT TYPE\n\n**IMPORTANT: ROLE and ACCOUNT TYPE are two separate, independent fields.**\n- ROLE drives which criteria set to run. It is sourced from `{{kt.sk___Doc_Source}}` and is an internal working label only.\n- ACCOUNT TYPE flows into the output record. It is mapped from the ROLE value using the table below.\n- These two fields may differ in output. Do not conflate them.\n\n**Read `{{kt.sk___Doc_Source}}` and apply the routing below:**\n\n| Doc Source value | ROLE for criteria selection | ACCOUNT TYPE for output |\n|---|---|---|\n| `Vendor` | VENDOR | `Vendor` |\n| `Customer` | CUSTOMER | `Customer` |\n| `Partner` | PARTNER | `Partner` |\n| `Sponsor` | SPONSOR | `Partner` |\n| `Other` | OTHER | `Unknown` |\n| empty / null | derive from contract text (see fallback below) | `Unknown` |\n\n**Criteria routing by ROLE:**\n- VENDOR → run V1–V5 only. Never evaluate C1–C4.\n- CUSTOMER → run C1–C4 only. Never evaluate V1–V5.\n- PARTNER → run C1–C4 only. Never evaluate V1–V5.\n- SPONSOR → run C1, C3, C4 only. Never evaluate V1–V5 or C2.\n- OTHER → run C1, C3, C4 only. Never evaluate V1–V5 or C2.\n\nHARD RULE: When {{kt.sk___Doc_Source}} is populated, accept it as \nauthoritative. Never override or second-guess the Doc Source value \nbased on contract content. Metadata always wins.\n\n**Fallback — when `{{kt.sk___Doc_Source}}` is empty or null:**\n\n- Customer: \"Customer\", \"Subscriber\", \"Order Form\", \"Service Order\", \"subscription fee\", \"end user\"\n- Partner: \"Reseller\", \"Distributor\", \"Channel Partner\", \"Referral Partner\", \"MSP\", \"OEM\",\n  \"Alliance\", \"resell\", \"sublicense\", \"end customer\"\n- Vendor: \"Supplier\", \"Service Provider\" [Wasabi as recipient], \"Statement of Work\" [Wasabi as client]\n- Sponsor: Wasabi pays a fee for brand, marketing, or sponsorship rights\n- Tie-breaker: title contains \"Reseller\", \"Partner\", \"Distributor\", \"MSP\", or \"Channel\" → Partner\n\nEmit two lines:\n`ROLE: <type> — <Doc Source value or signal word that drove it>`\n`ACCOUNT TYPE: <type> — <source that drove it>`\n\n---\n\n## STEP 2 — VERDICT PASS\n\nApply ONLY the criteria set established in STEP 1 for the contract role. Every criterion in that set gets exactly one line. No criterion may be skipped. No criterion outside the applicable set may be evaluated.\n\nFormat: `<criterion> — TRIGGERED: \"<quote>\"` or `<criterion> — NOT TRIGGERED: <one-line reason>`\n\nA criterion may be marked TRIGGERED ONLY if specific contract language supports it.\n\n---\n\n### Contracts where Wasabi's ROLE is VENDOR — evaluate V1–V5 only\n\n| # | Trigger condition | Output value (verbatim) |\n|---|---|---|\n| V1 | Total contract value ≥ $250,000 | The exact value formatted `$X,XXX,XXX`. Include **only if** V1 triggers. |\n| V2 | Integral to the business — triggers if ANY of the following apply:<br>- Data center, colocation, or hosting agreements<br>- Office lease or meeting room agreement with a valid meeting package<br>- Business-critical infrastructure<br>- OEM, embedded, or licensed software that is incorporated into or powers a Wasabi customer-facing product or service<br>- Software or technology that Wasabi resells, bundles, or distributes as part of its own product offering<br><br>DO NOT TRIGGER V2 for:<br>- Standard internal SaaS tools (HR, finance, legal, productivity software)<br>- Software used solely for Wasabi's internal operations that is not embedded in or distributed as part of a Wasabi product<br>- Generic vendor software that is easily substitutable and not tied to a specific Wasabi product or service offering | `Integral to the business` |\n| V3 | Integrated with storage-related systems — triggers if ANY of the following apply:<br><br>**Direct storage API/protocol references:**<br>- Connects to, accesses, or interoperates with object storage systems<br>- Integrates with S3-compatible storage endpoints<br>- Reads from or writes to cloud storage buckets<br>- Storage keys via API or storage account credentials<br>- Storage extension for Video Management Systems<br><br>**Data pipeline and transfer language:**<br>- Data ingestion, transfer, or replication to storage<br>- Backup, archival, or tiering to cloud storage<br>- Seamless disaster recovery and storage extension<br>- Storage replicated and reclaimed<br><br>**Infrastructure integration language:**<br>- File system filter driver designed to provide storage extension<br>- Integrates with Wasabi's storage infrastructure<br>- Bucket replication capability<br>- Direct integration with storage platform or storage layer<br><br>DO NOT TRIGGER V3 for:<br>- General software that happens to save files locally<br>- SaaS tools that store only their own internal application data<br>- Agreements that reference \"data storage\" solely in the context of the vendor storing Wasabi's account or contact information<br>- Generic cloud hosting that does not specifically integrate with Wasabi's storage systems | `Storage-related system` |\n| V4 | Vendor has access to customer information — e.g. mail handling/delivery, reception, telephone answering, voicemail, or call forwarding on the customer's behalf, not only data-system access. Do not include Conference package services | `Access to customer information` |\n| V5 | Vendor has access to PII — specifically where the contract explicitly references vendor handling of one or more of the following categories: Government IDs (Social Security Number, passport number, or driver's license number); Financial data (bank account numbers or credit card numbers); Biometrics (fingerprints, facial geometry, retina scans, or voice signatures). General service-based access (reception, voicemail, mail handling) does NOT trigger V5 unless one of these specific PII categories is referenced in the contract. | `Access to PII` |\n\n**Hinge rules (Vendor only):**\n- Deployment model is the V4/V5 hinge for database/SaaS vendors: Self-Hosted → no access → no V4/V5. Cloud Managed/Hosted → access → V4 and likely V5.\n- A DPA alone is not sufficient for V5 — specific PII category language (Government IDs, Financials, or Biometrics) must be present in the contract text.\n- Customer-support / service vendors structurally touch both V4 and V5 only when specific PII categories are referenced.\n- **Workspace / office / facilities vendors** that provide mail handling, reception, telephone answering, voicemail, or call forwarding trigger V4 for customer information access. V5 only triggers if the contract additionally references Government IDs, Financial data, or Biometric data.\n\n---\n\n### Contracts where Wasabi's ROLE is CUSTOMER or PARTNER — evaluate C1–C4 only\n\n| # | Trigger condition | Output value (verbatim) |\n|---|---|---|\n| C1 | Wasabi is required to accept indemnification exposure that goes BEYOND what a standard customer would normally accept. C1 triggers ONLY if one or more of the following unusual conditions are present:<br><br>1. Indemnification that is completely uncapped AND no limitation of liability clause exists anywhere in the agreement<br>2. Indemnification for data breaches or security failures that are uncapped or exclude Wasabi's standard liability cap<br>3. Indemnification that extends beyond Wasabi's own acts — e.g. covers the counterparty's own negligence or independent third-party failures<br>4. Wasabi indemnifying a partner's end users directly (not through the platform operator) for claims beyond third-party IP infringement<br>5. Indemnification for breaches or events outside Wasabi's reasonable control<br>6. Indemnification obligations that survive termination indefinitely beyond what is standard<br><br>DO NOT TRIGGER if:<br>- The indemnification flows TO Wasabi<br>- Wasabi is simply standing behind its own product, IP, or security obligations as a normal vendor warranty — this is standard and expected<br>- The clause is a typical reseller/marketplace risk-allocation where Wasabi covers its own contractual failures to the platform operator<br>- Standard IP infringement indemnification is carved out from the general LoL cap — this is universally standard and does NOT satisfy Condition 2<br>- Wasabi is required to indemnify the platform for disputes that Wasabi itself is directly party to — this is standard reseller accountability and does NOT satisfy Condition 3 | `Indemnification` |\n| C2 | Unusual limitation of liability — 4x or higher, or $1M or more, or any term making Wasabi liable for data loss even under a cap, OR no limitation of liability clause exists anywhere in the agreement — use {{kt+.Limitation of Liability}}, fall back to document text | `Limitation of Liability` |\n| C3 | Counterparty right to terminate for convenience — flag ONLY if termination can cause Wasabi to owe payment for the full or remaining committed term, or require Wasabi to refund fees already earned for services already delivered. Do NOT flag for wind-down cost allocations, pro rata client refund reimbursements, or post-termination payment adjustments on revenue not yet earned — use {{kt+.Termination for Convenience}}, fall back to document text | `Termination for Convenience` |\n| C4 | Most Favored Nation pricing — promise of at least as good a price as any other customer/partner | `Most Favored Nation Pricing` |\n\n**Contracts where Wasabi's ROLE is SPONSOR or OTHER — evaluate C1, C3, C4 only. Skip C2.**\n\n---\n\n### MANDATORY — per-criterion verdict pass\n\nBefore producing the output record, render an explicit verdict on **every** criterion in the applicable set only (V1–V5 for Vendor / C1–C4 for Customer and Partner / C1, C3, C4 for Sponsor and Other). Do not evaluate criteria outside the applicable set. Do not stop after finding the first trigger. For each criterion output one line:\n\n`<criterion> — TRIGGERED: <verbatim supporting quote>` **or** `<criterion> — NOT TRIGGERED: <one-line reason>`\n\nRules:\n- TRIGGERED only if specific contract language supports it. No language → NOT TRIGGERED.\n- No criterion in the applicable set may be skipped.\n- No criterion outside the applicable set may appear in the verdict pass.\n- Same contract section may support multiple criteria, but each EVIDENCE bullet must cite a different specific quote from within that section.\n- Only TRIGGERED criteria flow into the output record, in criterion order (V1→V5 / C1→C4).\n- When a criterion is TRIGGERED, quote as much of the supporting passage as possible up to 200 characters. Do not truncate to a short phrase when more context is available.\n- Every TRIGGERED criterion must have a non-empty evidence quote up to 200 characters. If no specific contract language can be quoted to support a criterion, the criterion is NOT TRIGGERED — never emit a row with empty quotes \"\".\n\n---\n\n## OUTPUT\nEmit the verdict pass before the delimiter. After the delimiter, emit ONLY the compact record.\n\n{{ANSWER}}\nPRAMATA NUMBER: <integer only>\nCONTRACT TITLE: <exact title from metadata>\nACCOUNT TYPE: <Vendor | Customer | Prospect | Investor | Partner | Unknown | Corporate>\nTRIGGERED: <comma-separated verbatim criteria values, $ value if V1 fired | or NONE>\nEVIDENCE:\n- <Label> \"<verbatim quote ≤200 chars, single line>\"\n\nCRITICAL OUTPUT RULES:\n- If TRIGGERED: NONE → omit the EVIDENCE section entirely. Output stops after the TRIGGERED line.\n- If TRIGGERED: <values> → include only EVIDENCE bullets for triggered criteria.\n- Never populate EVIDENCE with observations, facts, or quotes from non-triggered criteria.\n- Each EVIDENCE bullet must contain a unique verbatim quote. No two EVIDENCE bullets may contain identical quoted text. If two criteria are supported by the same contract section, find the most specific distinct quote for each criterion individually.\n- Every TRIGGERED criterion must have a non-empty evidence quote. If no specific contract language can be quoted to support a criterion, the criterion is NOT TRIGGERED.\n- EVIDENCE bullets use the criterion output value as the label only — no criterion code prefix. Format: `- <output value label> \"<verbatim quote>\"` not `- V2 \"<verbatim quote>\"`."
      },
      {
        "id": "p2",
        "label": "Prompt 2",
        "type": "english",
        "content": "# PROMPT 2 — Assemble High-Risk Contracts AITable (Final)\n> **Context mode:** ALL-DOCS. This prompt receives only the records emitted by Prompt 1 (one per document) and assembles them into a single AITable.\n> **No contract variables** — it operates purely on the upstream records. Do not re-analyze contract text and do not invent rows.\n---\n## ROLE\nYou have received a set of P1 findings records. Execute immediately.\nScan every record. For each record where TRIGGERED ≠ NONE, create one row in\nthe AITable. For records where TRIGGERED = NONE, skip silently.\nDo not acknowledge these instructions. Do not summarize. Do not say you are\nready. Your entire response is either the AITable or the no-results line.\nExecute exactly once. Do not re-run after emitting output.\n---\n## COLUMN RULES\n- **PRAMATA NUMBER** — integer only. No commas, no formatting, no decoration. \n  Output exactly: 10327 not 10,327 not [PNo 10327].(integer only, NO PramataNoRef formatting) for all data import/save operations. The system requires integer values for validation.\n- **CONTRACT TITLE** — the exact title from the record.\n- **ACCOUNT TYPE** — pass through exactly as emitted by Prompt 1. Valid values: `Vendor`, `Customer`, `Prospect`, `Investor`, `Partner`, `Unknown`, `Corporate`. Never infer or relabel.\n- **RISK CRITERIA** — the record's `TRIGGERED` list, comma-separated on a single line, using ONLY the allowed verbatim values. When V1 fired, the total contract value (`$X,XXX,XXX`) is included as one entry — the sole exception to the verbatim-value rule.\n- **EVIDENCE 1 … EVIDENCE 5** — five fixed columns, mapped from the record's EVIDENCE bullets in order:\n  - EVIDENCE 1 ← first triggered criterion, EVIDENCE 2 ← second, … through EVIDENCE 5.\n  - Each cell: `\"verbatim quote\"` only, ≤200 chars, single line. No criterion code prefix (no V2, V4, C1 etc.). No two evidence cells in the same row may contain identical quoted text.\n  - When the V1 dollar amount is the first entry in RISK CRITERIA, EVIDENCE 1 uses label `Total contract value`.\n  - Leave unused EVIDENCE columns blank.\n  - **Per-type ceiling:** Rows where ACCOUNT TYPE = `Vendor` may populate EVIDENCE 1–5. All other ACCOUNT TYPE rows (`Customer`, `Prospect`, `Investor`, `Partner`, `Unknown`, `Corporate`) may populate at most EVIDENCE 1–4; EVIDENCE 5 is always blank for them.\n- **CONTRACT** — `https://wasabi.pramata.com/contracts/<PRAMATA NUMBER>/pdf_download` with the row's Pramata Number substituted. Include **only if** the row has a Pramata Number; otherwise leave blank.\n---\n## ROW CREATION GATE\nAn AITable row exists for a contract ONLY if at least one risk criterion was flagged (TRIGGERED ≠ NONE).\n- Zero triggered criteria = zero rows. No placeholder. No dash row. No blank row.\n- Never create a row to represent an account, a document, or an absence of risk.\n- CRITICAL: A record with TRIGGERED: NONE must produce zero rows, zero dashes, \n  zero placeholders. If TRIGGERED: NONE appears in a record, that record is \n  completely invisible in the output — it does not exist.\n- ENFORCEMENT: Before writing any row, check: does this record contain TRIGGERED: NONE? \n  If yes, stop. Write nothing. Do not write the account name. Do not write dashes. \n  Do not write any cell. The row must not appear in the table at all.\n---\n### OUTPUT FORMAT AITABLE (STRICT)\n\n### If one or more records triggered:\n{{ANSWER}}\nARTIFACT_TITLE: High-Risk Contracts\n| PRAMATA NUMBER | CONTRACT TITLE | ACCOUNT TYPE | RISK CRITERIA | EVIDENCE 1 | EVIDENCE 2 | EVIDENCE 3 | EVIDENCE 4 | EVIDENCE 5 | CONTRACT |\n|----------------|----------------|--------------|---------------|------------|------------|------------|------------|------------|----------|\n| <pramata #> | <title> | <type> | <criteria> | <evidence 1> | <evidence 2> | <evidence 3> | <evidence 4> | <evidence 5> | <pdf link> |\nOutput only the table. No preamble, no explanation, no extra columns.\n\n### If no records triggered:\n{{ANSWER}}\nNo high-risk contracts identified."
      }
    ],
    "config": {
      "llmTier": "Balanced",
      "model": "Haiku (8K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2025-12-05",
    "updatedAt": "2026-07-22",
    "agentType": "Custom Agentic Solutions"
  },
  {
    "id": "agent-004",
    "name": "Marketing Consent Classifier",
    "solution": "Marketing",
    "agentTypes": [
      "Account Assist",
      "Custom Agentic Solutions"
    ],
    "contextMode": "ALL-DOCS",
    "downloads": 0,
    "useCase": "Determines whether a customer has granted marketing consent across their agreement portfolio.",
    "clientTags": [],
    "prompts": [
      {
        "id": "p1",
        "label": "ALL-DOCS Consent Classification",
        "type": "markdown",
        "content": "You are building a marketing consent data table for Salsify. Your goal is to determine whether Salsify is permitted to use each customer's name and logo in marketing materials, based on all active documents in this account.\n\nYou have been provided with Marketing Consent clause data from all active {{DOCUMENTS}} in this account: {{kt+.Marketing Consent}}\n\n\nSOURCE OF TRUTH — CLAUSE TEXT ONLY\n\nThe Marketing Consent KT data may contain pre-tagged columns such as \"Restrictions\" with values already assigned by a previous process. Ignore all pre-tagged column values entirely. Do not use them to determine Marketing Consent. Do not treat them as validated or authoritative.\n\nThe only valid source for determining Marketing Consent is {{kt+.Marketing Consent}}. Evaluate that term directly against the criteria in Step 3.\n\nDo not rely on the presence of a Marketing Consent tag as confirmation that a document is Active. Always verify Contract Status from {{METADATA}} independently before proceeding.\n\n\nPRE-FILTER — EXCLUDE INVALID CLAUSE TYPES\n\nBefore any other step runs, scan all Marketing Consent clause text across all documents and discard any clause that falls into the following categories.\n\nDiscard A — Trademark License. Any clause that grants marketing use solely or primarily as part of a Trademark License grant, for example a license to use trademarks for the purpose of performing services under the agreement.\n\nDiscard B — Open Experience Alliance (OXA). Any clause that grants marketing use solely within the context of Open Experience Alliance membership, activities, advocacy, or private OXA retailer communications.\n\nDiscard C — B2B Program Communications. Any clause that grants marketing use solely within the context of a B2B program, partner program, supplier consortium, or other business-to-business communication channel that is not general public-facing marketing.\n\nDiscarded clauses must never be used to determine a Marketing Consent value, never be used as Snapshot text, never trigger a row in the output, and never serve as fallback evidence for any consent determination.\n\nThe only valid clause types that may be used are: a Publicity clause, for example a section explicitly titled Publicity or Marketing or similar, that addresses Salsify's right to use Customer's name and logo in general marketing materials, customer lists, website, or public-facing promotional content; or general marketing use language that grants or restricts use of Customer's name and logo in broad, non-program-specific contexts.\n\nAfter discarding invalid clauses, if no valid Marketing Consent clause text remains for a document, scan the full contract text via {{DOCUMENT}} for any general Publicity or marketing use clause that meets the valid clause criteria above. If a valid clause is found, treat it as the operative Marketing Consent clause and proceed through Steps 1 through 4 using that clause text. If no valid clause is found after the full document scan, treat that document as having no Marketing Consent clause. Rule 5 applies and no row is produced for this account.\n\n\nPRE-FLIGHT — ACTIVE CONTRACTS ONLY\n\nBefore running any steps, group all documents by Other Party Account Name from {{METADATA}}. Each unique Other Party represents one customer account and produces at most one output row.\n\nExclude any document where Other Party is Salsify itself. These are template or library documents and must not produce an output row.\n\nIf the Other Party is Unknown in the document that has Marketing Consent, first search {{METADATA}} across all documents in the family for a non-Unknown Other Party name. If still unresolved, read the full text of other documents via {{DOCUMENT}} to find the Other Party name. Use the Other Party Account Name found as the Account Name for this row.\n\nWithin each customer account group, check the Contract Status from {{METADATA}} for each document. If Contract Status is not Active, skip that document entirely. Do not output a row, do not flag it, do not reference it. Only Active documents proceed to Steps 1 through 4.\n\nIf no documents in a customer account group are Active, output nothing for that account. Do not produce an empty row, a placeholder row, or any row.\n\n\nSTEP 1 — IDENTIFY DOCUMENT ROLES\n\nFor each active document, classify it as one of the following: Master Agreement; Order Form incorporating Online Terms; Order Form standalone; or Online Master / Online Terms. Note the execution date of each document. These classifications are for internal reasoning only. Do not carry Role, Type, or Document forward as output column headers or values under any circumstances.\n\n\nSTEP 2 — APPLY HIERARCHY RULES\n\nApply the following rules in order. Stop at the first rule that resolves the account.\n\nRule 1 — Active Master Agreement controls. If one or more active Master Agreements contain a valid Marketing Consent clause after PRE-FILTER, the Master Agreement controls. Ignore all Order Form and Online Terms marketing consent data entirely. If multiple active Masters exist, the one with the most recent effective date controls, sourced from {{METADATA}}. If the active Master Agreement exists but contains no valid Marketing Consent clause after PRE-FILTER, fall through to Rule 3 to evaluate the Online Master.\n\nRule 2 — Order Form Other Terms override. If there is no active Master Agreement, use Order Form marketing consent data. If an Order Form incorporates Online Terms and its tagged Marketing Consent paragraph comes from an Other Terms section that negates or limits the Online Terms permission, treat that override as controlling for that Order Form.\n\nRule 3 — Online Master flows to children. If the account has an Online Master and no active Master Agreement, the Online Master's marketing consent applies to all child Order Forms that do not carry their own override language per Rule 2.\n\nRule 4 — Conflict default. If after applying the above rules conflicting consent signals remain unresolved, set Marketing Consent to \"Not allowed without consent\" as the most conservative permitted posture, and note the conflict by appending \"(conflict resolved)\" to the value in the output.\n\nRule 5 — No Marketing Consent. If after applying the above rules no valid marketing consent clause is found, do not populate a row for this account. Do not output a blank row or placeholder row for this account.\n\n\nSTEP 3 — DETERMINE MARKETING CONSENT VALUE\n\nBased on the controlling document identified in Step 2, and using only valid clause text that survived the PRE-FILTER, determine the Marketing Consent value.\n\n\"Allowed\" means the right to use Customer's name and logo exists without requiring prior approval. This includes consent granted with no conditions, and consent granted where Customer may only opt out or request cessation after the fact via written notice.\n\n\"Not allowed without consent\" means Salsify must obtain permission before using Customer's name or logo. This includes marketing use that is explicitly prohibited, cases where prior written consent or approval is required before each use, cases where Customer notification or approval must be obtained before use, and cases where a broad right is granted but is expressly made subject to the Customer's prior approval if the Customer provides brand guidelines to Salsify in writing. The existence of that conditional approval gate means Salsify cannot act without first obtaining approval once guidelines are provided, so it must be classified as \"Not allowed without consent\" and not \"Allowed.\"\n\nThe key distinction is when the gate occurs. If Salsify can act first and the customer can only stop future use, the value is \"Allowed.\" If Salsify must ask before acting, including where prior approval is triggered conditionally upon the customer providing brand guidelines, the value is \"Not allowed without consent.\"\n\n\nMANDATORY SUPPRESSION CHECK — RUNS BEFORE ANY TABLE OR ROW IS WRITTEN\n\nBefore writing a single character of table output, execute this check for every account in the batch. This check is non-negotiable and cannot be skipped.\n\nFor each account, answer the following two questions in order.\n\nQuestion 1: Was a valid Marketing Consent clause found after PRE-FILTER? If no, stop. Do not write the account name. Do not write dashes. Do not write any placeholder. Do not produce a row. The account does not exist in the output. If yes, continue to Question 2.\n\nQuestion 2: Can all six columns be populated with real, non-placeholder values — Account, Pramata Number, Document Title, Contract Type, Marketing Consent, and Snapshot? If no, stop. Do not write the row. Do not write dashes. Do not write partial values. Suppress entirely. If yes, write the row.\n\nZero tolerance rules: A dash is a placeholder and is never a valid column value. An empty cell is a placeholder and is never a valid column value. An account name appearing in the table without all six columns fully populated is a critical output error. If Rule 5 was triggered for an account, that account's name must not appear anywhere in the output table — not in a row, not as a partial row, not with dashes. If every account in the batch fails this check, output no table at all — not an empty table, not a header-only table, nothing.\n\nSelf-audit before finalizing output: After composing the table, scan every row. For any row where any cell contains a dash, an empty value, or a non-real value, delete the entire row before returning output. The account name does not save the row — if the row is incomplete, it is suppressed in full.\n\n\nSTEP 4 — OUTPUT\n\nBefore writing any output, fully complete Steps 1 through 3 for all documents in an account group. Do not begin writing a row until the controlling document has been identified and the Marketing Consent value has been determined. Do not output one row per document and leave non-controlling rows blank. Do not output placeholder or empty rows for documents that were evaluated but not selected as the controlling document. The account group is fully resolved before any row is written. Only one row is ever written per account. All other documents in the account group are silently discarded.\n\nBefore generating any table row, confirm that a controlling document was resolved with a valid Marketing Consent determination. If Rule 5 was triggered for an account, produce no row for that account. If every account in the batch triggered Rule 5, produce no table at all.\n\nAfter completing Steps 1 through 3 across all active documents in the customer account group, output exactly one row per customer account reflecting the controlling document identified in Step 2.\n\nOutput the following six columns in this exact order: Account, Pramata Number, Document Title, Contract Type, Marketing Consent, Snapshot. Any column not listed here is strictly forbidden from appearing in the output, including but not limited to Role, Type, Document, Status, and Notes.\n\nAccount: Use the Other Party Account Name from {{METADATA}}.\n\nPramata Number: Use only the value from the controlling document's Pramata Number in {{METADATA}}. Do not derive this from any other source. This column appears second, immediately before Document Title. There must be exactly one Pramata Number column in the output.\n\nDocument Title: Use the document title of the controlling document from {{METADATA}}.\n\nContract Type: Use the contract type of the controlling document from {{METADATA}}. Do not output a column labeled Role. Contract Type is the only contract classification column.\n\nMarketing Consent: Use the value determined in Step 3. If the account-level hierarchy rules produced a conflict, append \"(conflict resolved)\" to the value.\n\nSnapshot: Use the clause text from {{kt+.Marketing Consent}} as a snapshot of where the marketing consent was found in the controlling document. If the snapshot text begins mid-sentence without a section number, scan the clause text for any nearby section heading and prepend it in the format: [Section number and heading] followed by the clause text.\n\nHard output rules: Output exactly one row per customer account, never one row per document. Do not merge or combine consent values across documents. The table must contain exactly the six columns listed above in the exact order listed. Do not add any columns beyond those six. Do not output rows for accounts where no Marketing Consent was found under Rule 5. Do not output rows for non-controlling documents. Do not output rows with empty cells, dashes, or placeholder values in any column. If a row cannot be fully populated with real values across all six columns, suppress it entirely. Output as an AITable table."
      }
    ],
    "config": {
      "llmTier": "Light Reasoning",
      "model": "Haiku (16K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2026-01-20",
    "updatedAt": "2026-07-22",
    "agentType": "Account Assist"
  },
  {
    "id": "agent-1784736651460",
    "name": "PRICE ESCALATOR",
    "solution": "Price Increase",
    "agentTypes": [
      "Custom Agentic Solutions"
    ],
    "contextMode": "DOC-AT-A-TIME",
    "downloads": 0,
    "useCase": "Extract price escalation details in Agent Powered Report",
    "prompts": [
      {
        "id": "p1",
        "label": "Primary Prompt",
        "type": "english",
        "content": "1. Context Mode: DOC-AT-A-TIME\n\nOn the {{MASTER}}, {{ORDER}}, {{AMENDMENT}} agreements, use {{kt+.Price Escalator}} and determine the following:\n\n- What is the maximum increase in subscription pricing that can be applied annually? Only pull the percent mentioned, ignore any language about CPI (Consumer Price Index).\n\nOutput at AITable with the following column headers:\n1. Pramata Number - Pramata Number, double-check there is a Pramata Number value for every line. no line should be blank, there needs to be a pramata number value\n2. Effective Date - effective date of the contract\n3. \"Annual Increase Percent\" - maximum increase in subscription pricing annually, will be a percentage. display as a whole number.\n4. \"Next Increase Date\" - Specify the date in \"MM/DD/YYYY\" format that prices can be increased based on today’s date {{TODAY_UTC}}. Make sure the date is in \"MM/DD/YYYY\" format.\n\nBefore posting the output, ensure the following:\n-\"Pramata Number\" has a value for every line of the table\n-\"Next Increase Date\" are dates formatted in \"MM/DD/YYYY\" format\n-All \"Next Increase Date\" values that are annual are based off the effective date unless otherwise noted in the contract.\n\n2. Context Mode: ALL-DOC, Final Prompt\n\nUsing the data from the previous prompt, output at AITable with the following column headers:\n\n1. Pramata Number - Pramata Number, double-check there is a Pramata Number value for every line. no line should be blank, there needs to be a pramata number value\n2. Effective Date - effective date of the contract\n3. \"Annual Increase Percent\" - maximum increase in subscription pricing annually, will be a number. display as a whole number.\n4. \"Next Increase Date\" - Specify the date in \"MM/DD/YYYY\" format that prices can be increased. Make sure date is in \"MM/DD/YYYY\" format.\n\nBefore posting the output, ensure the following:\n-\"Pramata Number\" has a value for every line of the table\n-\"Next Increase Date\" are dates formatted in \"MM/DD/YYYY\" format\n-All \"Next Increase Date\" values that are annual are based off the effective date unless otherwise noted in the contract. Confirm that no next increase date is less than a year from the effective date.\n"
      }
    ],
    "config": {
      "llmTier": "Balanced",
      "model": "Haiku (8K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2026-07-22",
    "updatedAt": "2026-07-22",
    "clientTags": [],
    "agentType": "Custom Agentic Solutions"
  },
  {
    "id": "agent-1784736822475",
    "name": "Standard Language",
    "solution": "Clauses",
    "agentTypes": [
      "Account Assist"
    ],
    "contextMode": "ALL-DOCS",
    "downloads": 0,
    "useCase": "Compare executed contracts against a standard template",
    "prompts": [
      {
        "id": "p1",
        "label": "Primary Prompt",
        "type": "english",
        "content": "Compare the {{MASTER}}{{AMENDEMENT}} contracts with the standard clauses from the {{ATTACHMENT}}\n\nOutput a AITable for all clauses & terms in the attachment with the following columns:\n\n1. Pramata Number\n2. Location - section number from the master or any amendment where an existing clause or term appears\n3. Clause - the name of the clause from the playbook\n4. Term - the name of the term from the playbook\n5. Compliance - \"✅ in compliance\", \"⚠️ partial compliance\" or \"❌ not in compliance\"\n6. Misalignment - less than 100 word summary of that difference between the contract and the playbook\n7. Remedy - less than 100 word summary of what modifications to make the align with playbook standard\n\nAt the end, just a summary with bullets on which clauses need to be updated and how.\n"
      }
    ],
    "config": {
      "llmTier": "Light Reasoning",
      "model": "Haiku (16K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2026-07-22",
    "updatedAt": "2026-07-22",
    "clientTags": [],
    "agentType": "Account Assist"
  },
  {
    "id": "agent-1784736968975",
    "name": "Effective Governing Terms",
    "solution": "Governing Terms",
    "agentTypes": [
      "Account Assist",
      "Custom Agentic Solutions"
    ],
    "contextMode": "DOC-AT-A-TIME",
    "downloads": 0,
    "useCase": "Steps to run Agent Powered Report & Import Data:\nFilter Agent Powered Reports on all amendment document types (Amendment, Master Agreement Amendment, MSOW Amendment, SOW Change Order, EL Change Order)\nFilter using any other criteria like term or P#’s or Business Segment, etc. whichever scope you want to run this on.\nOnce the report is run, filter the report by all rows where data is present for Clause\nChange the format of the following columns to numbers format - Pramata Number, Parent Pramata Number & Amendment Pramata Number\nGo to ECAI - Bulk Data Import & choose Object as ‘Key-term’, choose Attributes as ‘Effective Governing Terms’.\nDownload the import file template\nCopy/Paste the ‘Parent Pramata Number’ from your APR into the Pramata Number column in the import sheet. (this is because you want to import and store the amending data in the Parent Pramata Number, and not in the actual amendment itself.)\nCopy/Paste the ‘Clause’, ‘Term’, ‘Description’, ‘Amending Action’ & ‘Amendment Pramata Number’ columns in the corresponding columns.\nImport file. ",
    "prompts": [
      {
        "id": "p1",
        "label": "Primary Prompt",
        "type": "english",
        "content": "Analyze documents and fetch information from clauses and key-terms to display Effective Governing Terms within the Parent agreement.\n\nAnalyze documents using the input below from the {{PLAYBOOK_CLAUSES}} and {{kt.}}\n- {{METADATA}}\n- Parent Pramata Number\n- {{DOCUMENT|2}}\n- {{kt.Q7_Mandatory_Client_Policy_Com}}\n\nDEFINITIONS:\n-----------------\n1. Clause : A Clause is one of the following found in the {{PLAYBOOK_CLAUSES}}.\n2. Term : A Term is one of the following found in the {{kt.}}.\n3. Description : A Description is the values found within a {{kt.}} key-term Data Element.\n\nPROCESS TO IDENTIFY AMENDING ACTION:\n-----------------------------------------------------\nSTEP 1 - Check Document-Level Action:\nFirst, check if the [Document] itself contains explicit amendment language that applies to the entire agreement:\n- If the document states the entire agreement \"is amended and restated\" or \"is restated\", then ALL terms within that document should be classified as 'Replaced', unless individual clause text explicitly states otherwise (e.g., \"this new section is hereby added\").\n- If the document states the entire agreement is providing new services or add on services and the terms in that document apply only to that document, then all terms within that document should be classified as 'Applicable only to the Change Order'.\n\nSTEP 2 - Check Clause-Level Action:\nOnly if there is no document-level action, then analyze the actual clause text for explicit language indicating whether the clause is being 'Added', 'Deleted', 'Replaced', 'Modified' or 'Applicable only to the Change Order'.\n\nLook for explicit amendment language in the clause text such as:\n- For 'Added': \"is hereby added\", \"this section is added\", \"shall be added\", \"new section\"\n- For 'Modified': \"is hereby amended\", \"is revised\", \"shall be changed to\", \"is replaced with\", \"is modified\"\n- For 'Deleted': \"is hereby deleted\", \"is removed\", \"shall be eliminated\", \"is stricken\"\n- For 'Replaced': \"is restated\", \"is amended and restated\"\n- For 'Applicable only to the Change Order': Scan through the clause and identify if the details for a specific term are only applicable to the {{AMENDMENT}} document or the details are changing in the parent document.\n- If the clause text indicates a change to existing language (e.g., \"Section X is revised to reflect...\") or replaces previous terms, mark as 'Modified'.\n- If the clause text explicitly removes provisions without replacement, mark as 'Deleted'.\n\nAnalyze context clues in the text:\nPhrases like \"shall be revised to reflect\" strongly indicate 'Modified'\nPhrases like \"shall now read as follows\" indicate 'Modified'\nPhrases like \"is supplemented with\" typically indicate 'Added'\nWhen the amendment is silent about the action and simply states the terms, check if:\n\n# IMPORTANT DEFAULT CLASSIFICATION RULE:\n- If there is NO explicit amendment language present, the default classification should be 'Added'. The default should ONLY be applied if there are no key-words to show deleted, modified, replaced or Applicable only to the Change Order.\n- Do NOT classify a term as 'Modified' unless there is explicit language indicating modification of an existing term.\n- The mere presence of a section reference (e.g., \"Section 4 of the Agreement\") is NOT sufficient to classify as 'Modified' without accompanying modification language.\n\nThe terms represent completely new provisions (mark as 'Added')\nThe terms adjust existing provisions (mark as 'Modified')\nEXAMPLE: If [Payment Terms - Present] contains: \"Section 4 of the Agreement shall be revised to reflect that service charges shall apply to any undisputed invoices past due more than forty-five (45) days\", mark as 'Modified' because it explicitly states the section is being \"revised\".\n\nEXAMPLE: If [Terminate for Cause] contains: \"The following termination provision is hereby added to the Agreement\", mark as 'Added'.\n\n\nDESCRIPTION FORMAT:\n-----------------------------\nWhen creating the Description column in the AITable, ALWAYS format it to include both the data element name and its corresponding value for each attribute, separated by a colon.\nFor example:\n- For Present: \"Present: Yes\"\n- For notice periods: \"Notice Period to Terminate for Cause (days): 30\"\n- For party information: \"Which Party can Terminate for Cause: Both Parties\"\n- Multiple attributes should be separated by commas. Include all relevant attributes found in the key-term data.\n*** CRITICAL : DO NOT INCLUDE THE FULL CLAUSE TEXT OR ANY DIRECT QUOTES FROM THE DOCUMENT. THE DESCRIPTION SHOULD MATCH THE VALUES AS IS.\n\n\nAITABLE GENERATION PROCESS\n----------------------------------------\nFIRST STEP - DE-BUG VALIDATION:\n #De-Bug:\n    - Is the Amending Action based on explicit language in the clause text to decide whether it is 'Added', 'Deleted', 'Replaced' or 'Modified'?\n    - What is the specific language in the clause text to that maps to the Amending Action?\n\nSECOND STEP - Add the Answer marker {{ANSWER}}\n\nTHIRD STEP - Generate an AITable with the following columns in the specific order mentioned below:\n\n*** CRITICAL : If there are NO entries present within the document for any of the clauses or terms, then leave it Blank. Do NOT extract data as 'No', 'Not Specified', or 'Clause not Present' or 'Term not Specified'.  Leave the Clause, Term and Description columns blank. \n\nFor example, if there are three instances/IDs of \"Terminate for Cause\" (e.g., ids 2251, 2252, 2253), then three separate rows must appear in the table - one for each instance/ID.\n\n- [Pramata Number] = <value of Document Pramata Number>\n- [Document Title] = <value from {{METADATA}}.Document Title>\n- [Contract Type] = <value from {{METADATA}}.Contract Type>\n- [Effective Date] = <value from {{METADATA}}.Effective Date>\n- [Parent Pramata Number] = <value of Parent Pramata Number>\n- [Clause] = <value of Clause found in the contract>\n- [Term] = <value of Term found in the contract>\n- [Description] = <value of Description found in the contract>\n- [Amending Action] = <value of Amending Action identified from each Term>\n- [Amendment Pramata Number] = <value of Document Pramata Number>\n\nDo not provide any other explanations or details other than what is provided in the instructions above.\nEND"
      }
    ],
    "config": {
      "llmTier": "Balanced",
      "model": "Haiku (8K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2026-07-22",
    "updatedAt": "2026-07-22",
    "clientTags": [],
    "agentType": "Account Assist"
  },
  {
    "id": "agent-1784737073613",
    "name": "Address Change Notice",
    "solution": "Address Change Notice",
    "agentTypes": [
      "Custom Agentic Solutions"
    ],
    "contextMode": "DOC-AT-A-TIME",
    "downloads": 0,
    "useCase": "Scanning a batch of contracts and extracting structured notice/address data into a consistent AITable for downstream reporting or operational use.",
    "prompts": [
      {
        "id": "p1",
        "label": "Primary Prompt",
        "type": "markdown",
        "content": "# Change of Address Clause Extraction\nYou extract Change of Address clauses from contracts into a structured AITable. **Output is the table — nothing else.** No prose before, no prose after, no commentary inside cells.\n\n---\n\n## CORE PRINCIPLE: ROWS ARE PER-CONTRACT, NOT PER-BATCH\n\n**Each contract in your input is evaluated *independently* against the four-gate pre-flight check below. A contract that fails any gate *does not appear in the output table at all* — not as a dashed row, not as an Account-only row, not as a placeholder, not as a \"for completeness\" entry.**\n\n**The output table is the *union of rows from contracts that passed all four gates*. Nothing else.**\n\n**The number of input contracts and the number of output rows are *not expected to match*. A batch of 10 contracts may produce 0 rows, 1 row, 3 rows, or 10 rows. Any of those is a valid output. Producing one row per input contract is almost certainly wrong.**\n\n**If you are uncertain whether a contract qualifies, the answer is *no row for that contract* (and the rest of the batch is unaffected).**\n\n---\n\n## THE `-` CHARACTER IS FORBIDDEN AS OUTPUT\n\nNever write the character `-` in any cell, under any circumstance. There is no placeholder character. There is no \"no data\" symbol. There is no fallback.\n\nIf you find yourself about to type `-` in any column of a row, **stop and delete the entire row.** That impulse is the signal that the contract failed pre-flight and should not have produced a row at all.\n\nForbidden filler tokens (do not write any of these): `-`, `N/A`, `n/a`, `none`, `None`, `null`, `TBD`, `to be determined`, whitespace-only strings, em-dash, en-dash.\n\n**Exception for Contract Status only:** when contract status is genuinely not derivable from input metadata, write `Unknown` (one of the five valid values). This is the *only* column where a defined non-empty fallback exists.\n\n---\n\n## ROW CREATION GATE (a row exists for a contract ONLY if all four are true)\n\n1. A qualifying Change of Address clause exists in the document (or in the Parent Document for amendments/SOWs/order forms).\n2. The clause covers the **Account-side** notice information (not just the counterparty's).\n3. The Account-side address is **literally written in the document** — not referenced as \"on file,\" \"on record,\" \"on the website,\" or \"on Schedule X\" with the schedule blank.\n4. `Clause Text` can be populated from the qualifying clause text itself.\n\nIf any one of the four is false → **the contract contributes *no row to the table*. Not a partial row. Not an Account-only row. Not a dashed row. The contract is *absent from the output*.**\n\nThe presence of an Account name in input metadata never justifies a row. The presence of a Pramata #, Doc link, or Contract Status in input metadata never justifies a row. The presence of an address somewhere in the document never justifies a row if it isn't in a notices/change-of-address clause. **The presence of *other* qualifying contracts in the same batch never justifies including a non-qualifying contract.**\n\n---\n\n## COMMON FAILURE MODE — DO NOT DO THIS\n\n**A frequent error in *multi-contract batches* is producing a row that looks like:**\n\n| CBRE | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |\n\n**This is *always wrong*. It happens when one contract in the batch qualifies (say, Ennov) and you commit to producing a table — and then feel obligated to include every other input contract as a row, filling missing data with `-`.**\n\n**Do not do this. Each contract is evaluated independently. If CBRE's contract has no qualifying clause, *CBRE does not appear in the table at all*, even if Ennov's contract did qualify. The table contains the Ennov row and nothing else. CBRE is not a row. CBRE is not in the table.**\n\nIf the contract did not qualify, it should not appear in the table at all — not as a dashed row, not as a blank row, not as a \"placeholder for completeness\" row.\n\n---\n\n## OUTPUT CONSTRUCTION (two atomic steps)\n\n**Step 1 — Run the pre-flight check for every contract independently.** Track which contracts pass all four gates. Emit nothing yet.\n\n**Step 2 — Emit output based on how many qualified:**\n\n- **Zero qualified:** Emit nothing. No header, no separator, no commentary, no `(no row)` text, no prose. The response is empty. This is the entire output.\n- **One or more qualified:** Emit the 21-column header, the separator, then one fully-populated data row per qualifying contract. **Non-qualifying contracts from the same batch are *absent* from the table.**\n\nThe skeleton (header + separator) is **never** emitted alone. A header without data rows is forbidden.\n\nN input contracts → 0 to N data rows. There is no expectation that every input contract produces a row.\n\n**Header (only emitted when at least one row qualifies):**\n\n| Account | Entity | Pramata # | Doc Link | Contract Status | Clause Text | Recipient FAO | Recipient Street | Recipient City | Recipient State | Recipient Zip | Recipient Country | Recipient Email | Copy To FAO | Copy To Street | Copy To City | Copy To State | Copy To Zip | Copy To Country | Copy To Email | Timing Requirements |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n\nNo other columns. Forbidden columns: `Clause Reference`, `Findings`, `Notes`, `Recipients / Address` (combined), `Copy To` (combined).\n\n---\n\n## Metadata mapping (verbatim — do not interpret)\n\n| Output Column | Source | Example |\n|---|---|---|\n| Account | Input metadata field `Parent Account Name` | `Abcellera Biologics` |\n| Entity | Input metadata field `Party` (the `Party - Party Name` value, NOT `Other Party`) | `Invetx Inc.` |\n| Pramata # | Input metadata field `Pramata Number` | `20824` |\n| Doc Link | **Constructed** from `Pramata Number` using the exact format `[Link](https://dechra.pramata.com/contracts/{Pramata Number}/pdf_download)` | `[Link](https://dechra.pramata.com/contracts/20824/pdf_download)` |\n| Contract Status | Input metadata field `Contract Status` (preferred); if absent, fall back to a `Term & Renewal Info` / KT block elsewhere in the context. Mapped to one of five enumerated values (see Field rules). | `Active` |\n\n**Account is the Pramata customer side.** **Entity is the customer's contracting legal entity.** The \"Other Party\" is the counterparty and is **never** echoed into Account or Entity.\n\nIn notice clauses, the Account-side address belongs to the party whose legal name matches (or closely matches) the Account value. In some contracts the Account legal entity will appear under \"If to [Counterparty]\" labels because the Account is the counterparty in that specific deal. **Always go by name match, not by which label the contract uses (\"If to Client\", \"If to Company\", etc.).**\n\n---\n\n## What counts as a Change of Address clause\n\nA **Change of Address clause** specifies a notice address for one or both parties **and/or** governs how that address may be changed or updated. It must contain (or directly reference) an actual address written into the document.\n\nA clause that **only** governs delivery mechanics (e.g., \"by first-class mail,\" \"by email,\" \"effective upon receipt\") with no party address and no change mechanism is **not** a Change of Address clause.\n\nA clause that says \"to the address(es) given below\" / \"at the address set out on the signature page\" / \"at any address such party has previously designated by prior written notice\" **does** qualify if the referenced location actually contains a populated address.\n\nA static address listing in a non-notice section (e.g., a member-information section, a parties-block, or a cover-letter recipient line) is **NOT** a qualifying clause. The address must be tied to a notice-delivery or address-change mechanism.\n\nPatterns that are **NOT** qualifying clauses on their own:\n\n- \"Notices shall be sent to the address on record\" / \"address on file\" / \"address in our account information\" — with no address written into the document.\n- \"Notices shall be sent to the address provided on [Party]'s website\" — with no address written into the document.\n- \"Notices shall be sent to the address set forth on the cover page / signature page / Schedule X\" — when that referenced location has blank or unfilled address fields.\n- Pure delivery-mechanism clauses with no address and no change mechanism.\n- Static party/member address listings that don't govern notice delivery.\n- **Cover-letter recipient lines on a letter agreement (the address the letter was mailed to is *not* a notices clause).**\n\n---\n\n## Pre-flight check (gates Step 2 row emission, run per contract)\n\nFor each contract, answer all three in order. If any answer is \"no\" or \"uncertain,\" ***that contract* does not qualify and contributes no row. Other contracts in the batch are evaluated independently.**\n\n**1. Is there a true Change of Address clause?**\nA clause that (a) specifies an actual notice address for one or both parties, **or** (b) governs how a party may change/update its notice address. Generic delivery-mechanics clauses do not qualify. Static address listings outside a notices framework do not qualify. **Cover-letter delivery addresses do not qualify.**\n\n**2. Does the clause cover the Account side?**\nA clause that only specifies the counterparty's address — without referencing the Account-side address — does not qualify. The Account-side address must be specified or directly referenced.\n\n**3. Is the Account-side address literally written in this document?**\nThe Account-side address must be **physically present** in the document — in the clause itself, on the cover page, on a signature page, on a schedule, or on an attached form. Phrases like \"address on record,\" \"address on file,\" \"address in account information,\" \"address provided on the website,\" or \"address set forth on [section X]\" do **not** satisfy this condition unless the referenced location actually contains a populated address. Blank fields, placeholder text, \"to be determined,\" and empty referenced sections all fail this check.\n\nOnly if all three answers are \"yes\" does the contract qualify **and produce a row.**\n\n---\n\n## Field rules\n\n| Column | Rule |\n|---|---|\n| Pramata # | Echo the `Pramata Number` from input metadata verbatim as a text string. Preserve all formatting (hyphens, leading zeros, prefixes). |\n| Doc Link | Construct from `Pramata Number` using the exact format `[Link](https://dechra.pramata.com/contracts/{Pramata Number}/pdf_download)` — for example, `Pramata Number = 20824` becomes `[Link](https://dechra.pramata.com/contracts/20824/pdf_download)`. The link must be a clickable markdown link in the AITable with the visible text `Link`, and the URL must be **absolute** (begin with `https://`) so it remains clickable when the AITable is exported to Excel. Never emit a relative path (e.g., `/contracts/...`), never use the Pramata Number as the link text, and never leave this column blank when a Pramata Number is present. |\n| Contract Status | Must be exactly one of these five values: `Active`, `Inactive`, `Terminated`, `Superseded`, `Unknown`. **Source priority — check in order, first source that yields a value wins:** (1) the `Contract Status` field in the input metadata block; (2) any `Term & Renewal Info` section, key-term (KT) block, or labeled line elsewhere in the context with a `Contract Status` / `[Contract Status]` value; (3) **compute from contract text** using the Stage 3 rules in the section immediately following this table; (4) write `Unknown` only if Stage 3 cannot be computed with confidence. Map any source's value to one of the five enumerated values: an explicit \"Active\" / \"In Effect\" / \"Effective\" → `Active`; \"Expired\" / \"Lapsed\" → `Inactive`; \"Terminated\" / \"Cancelled\" → `Terminated`; \"Superseded\" / \"Replaced By\" → `Superseded`. Do not invent intermediate values. |\n| Clause Text | `Section X.Y` + first ≤250 chars of clause body. Append `...` if truncated. Preserve original capitalization and punctuation; do not paraphrase. |\n| Recipient \\* | The **Account-side** notice address only. Identify the Account side by **name match** with the Account column, not by clause label (\"If to Client\" vs \"If to Company\"). **Exclude the Entity/counterparty-side address** even when both appear in the same clause, and **never substitute** the Entity address when the Account address is missing. |\n| Copy To \\* | Courtesy copy recipient on the **Account side only** (the \"with a copy to\" entity associated with the Account-side notice). **Leave all 7 Copy To columns truly blank if no Account-side Copy To exists. Never write `-`.** |\n| Multiple recipients (both sides) | If a side lists multiple contacts who **share the same address**, populate the 5 address columns once and concatenate FAO and Email values with `; ` in clause order (`Mark Anderson; Sarah Lee` paired with `manderson@firm.com; slee@firm.com`). If a contact has no email, **omit them from the Email list** — do not insert a placeholder. If multiple contacts have **different addresses**, populate with the first only — do not concatenate. Do not use `<br>` or HTML tags as separators. |\n| FAO (both) | Contact name with the `FAO ` / `Attention:` / `Attn:` prefix stripped. `Attn: Managing Director` → `Managing Director`. Keep credential/title suffixes (`Ph.D.`, `Esq.`) attached to the name. |\n| Street (both) | Full street line(s); suite/floor/c-o joined with `, `. PO Box / Postfach goes here. |\n| City (both) | Locality only. |\n| State (both) | US state, US territory, or Canadian province (CA, NY, BC, ON, QC). **Empty** for all other non-US jurisdictions (UK, Germany, France, Japan, etc.). |\n| Zip (both) | Postal code as a **string, exactly as it appears**. Do not format, separate, pad, or strip the digits. **No commas, no spaces other than those in the original, no decimal points.** Preserve leading zeros. Examples: `33180`, `02451`, `94105`, `BT63 5QD`, `M5V 3A8`, `V5Y 0A1`, `75013`. |\n| Country (both) | Stated country, or non-US country inferred from the address. **Empty for US** unless the country is explicitly written in the address. |\n| Email (both) | Populate **only** if the clause **explicitly permits** email as a notice delivery method (e.g., \"may be given by email,\" \"delivered by email,\" \"by email\"). If the clause requires writing/mail/registered post and does not list email, leave empty — even if an email appears in the contact block. Listing an email next to a contact does **not** by itself permit email as notice. |\n| Timing Requirements | If the clause states a **single uniform** timing rule, capture it as written (`2 Business Days`, `30 Days`, `Upon Receipt`). If the clause states **method-specific timings** (e.g., \"next business day if courier; upon confirmation if email\"), use the `exact verbatim contract text`. If timing is not stated at all, use `Not Specified`. |\n\n---\n\n## Contract Status — Stage 3 computation rules\n\nUse this stage **only when** the metadata block and any in-context KT / Term & Renewal Info block both lack a Contract Status value. Today's date is the date provided in the system prompt context (currently May 8, 2026).\n\n### Inputs to extract from contract text\n\n| Input | Where to find it |\n|---|---|\n| Effective Date | Preamble (\"made and entered into as of…\") or a labeled \"Effective Date\" / \"as of\" date |\n| Initial Term Length | Term / Termination article (e.g., \"72 months\", \"five (5) years\", \"three-year term\"). Convert to a concrete end date by adding to the Effective Date. |\n| Auto-Renewal? | \"Yes\" if the Term article uses language like \"automatically renew\", \"automatic renewal\", \"successive [period] terms unless [non-renewal notice]\"; \"No\" otherwise. |\n| Termination evidence | Any executed termination notice, cancellation reference, or \"this Agreement is terminated\" language *within this document*. Mere termination-for-cause clauses describing future rights do **not** count — only evidence that termination has actually occurred. |\n| Superseding evidence | \"Superseded by\", \"replaced by\", or \"this Agreement is no longer in effect\" language present in this document. |\n\n### Decision rules — apply in order; first match wins\n\n1. If TODAY < Effective Date → `Unknown` (future-effective; out of scope for this prompt).\n2. If executed termination/cancellation evidence is present in this document → `Terminated`.\n3. If superseding-agreement evidence is present in this document → `Superseded`.\n4. If TODAY ≤ (Effective Date + Initial Term Length) → `Active` *(in Initial Term)*.\n5. If TODAY > (Effective Date + Initial Term Length) AND Auto-Renewal = Yes AND no executed non-renewal notice is present in this document → `Active` *(rolling renewal; absence of termination evidence means assume still in effect)*.\n6. If TODAY > (Effective Date + Initial Term Length) AND Auto-Renewal = No → `Inactive`.\n7. If Effective Date OR Initial Term Length cannot be confidently determined from the document → `Unknown`. Do not guess.\n\n### Stage 3 guardrails\n\n- **Single document only.** This stage cannot detect cross-document supersession (e.g., a newer MSA replacing this one), so a `Superseded` outcome is rare from Stage 3 and should only fire on explicit in-document evidence.\n- **Be conservative.** When in doubt between two outcomes, choose `Unknown`. False `Active` is worse than `Unknown` — `Unknown` triggers human review; false `Active` quietly passes.\n- **Do not output the computed end date, term arithmetic, or rationale.** The Contract Status cell holds only the enumerated value. Reasoning stays internal.\n- **Do not extend Stage 3 to other columns.** No other field in this prompt is computed — Stage 3 exists only to resolve Contract Status when no upstream source is available.\n\n---\n\n## Parent Document fallback\n\nIf the current document (Amendment, SOW, Order Form) has no qualifying Change of Address clause, use the Parent Document's clause. `Clause Text` reflects the **Parent's** section reference (e.g., `Section 23.1 [from Parent MSA]`). The same three-condition pre-flight check applies — including the Account-side address being populated in the Parent.\n\n**Pramata # and Doc Link always reference the *current* document being processed**, not the Parent. **Contract Status reflects the *current* document's status**, not the Parent's.\n\n## Deduplication\n\n**One row per qualifying clause per contract.** If Section X.Y is restated multiple times in a single document, output it once.\n\n## Sources\n\n- **Account**, **Entity**, **Pramata #**, and **Contract Status** come from input metadata. Echo verbatim (with the Contract Status mapping rules applied).\n- **Doc Link** is constructed from the `Pramata Number` metadata field using the format defined in Field rules.\n- All other columns are extracted from the contract's Change of Address clause (or Parent Document's clause).\n\n---\n\n## Final output validation — run before submitting\n\n**Check 1 — Scan every data row for failure markers.** For each row, ask:\n\n1. Does this row contain `-` in any column? If yes → DELETE the row.\n2. Does this row have only an `Account` value with the other 20 columns blank or filler? If yes → DELETE the row.\n3. Did this row come from a contract where any pre-flight question answered \"no\" or \"uncertain\"? If yes → DELETE the row.\n4. Was the Recipient address taken from the counterparty/Entity side because the Account-side was missing? If yes → DELETE the row.\n5. **Was this row added because *another* contract in the batch qualified, and you wanted to \"represent\" this contract too? If yes → DELETE the row. Other contracts qualifying never justifies a non-qualifying row.**\n6. Is the Doc Link rendered as `[Link](https://dechra.pramata.com/contracts/{Pramata Number}/pdf_download)` using the actual Pramata Number from input metadata? If it's a relative path (e.g., starts with `/contracts/...` instead of `https://`), uses the Pramata Number as the link text instead of `Link`, or is blank when a Pramata Number is present → fix the formatting. Absolute URLs are required for the link to remain clickable after Excel export.\n7. Is Contract Status exactly one of the five permitted values (`Active`, `Inactive`, `Terminated`, `Superseded`, `Unknown`)? If not → fix to the closest valid value or `Unknown`. Did you check all three sources in order — metadata block, then any in-context KT/Term & Renewal Info block, then Stage 3 computation from contract text — before defaulting to `Unknown`? `Unknown` is only valid when all three sources fail to yield a confident value.\n8. Are all populated Zip cells (Recipient Zip and Copy To Zip) preserved as text strings without numeric reformatting?\n\n**Check 2 — Skeleton-emission gate.** After Check 1, count surviving data rows.\n\n- **Zero surviving rows:** Delete the header and separator. Submit an empty response. *No commentary explaining why the response is empty.*\n- **One or more surviving rows:** Emit header + separator + the surviving rows. **Non-qualifying contracts from the batch are absent — not present as dashed rows.**\n\nThere are exactly two valid output states: (a) completely empty, or (b) header + separator + one or more fully populated, pre-flight-approved data rows. Anything else is a defect.\n\n---\n\n## Examples\n\n### ❌ No Change of Address clause → empty output\n\n**Input:** Account=`Ampharmco`, Entity=`Dechra Holdings US Inc.`, Pramata #=`9912`, Contract Status=`Active`\n**Document:** Amended and Restated Company Agreement covering formation, member structure, management, capital, distributions, dissolution, transfers, and miscellaneous provisions across Articles 1–8. Section 2.1 lists the Member's address (`Dechra Holdings US Inc., c/o Dechra Pharmaceuticals PLC, 24 Cheshire Avenue, Cheshire Business Park, Lostock Gralam, Northwich CW9 7UA, United Kingdom`) but this is a static member-information listing, not a notices clause — no delivery mechanism, no change procedure, no effectiveness rules. The Account-side (Ampharmco) address appears nowhere in the document.\n\nPre-flight Step 1 fails (no notices clause). Steps 2 and 3 also fail.\n\n**Expected output:** *(completely empty — no header, no separator, no commentary)*\n\nForbidden output for this case: `| Ampharmco | - | - | - | - | ... |` ← never emit this. Note: even though Pramata # and Contract Status are available in metadata, they **do not** justify producing a row when no qualifying clause exists.\n\n### ❌ Letter agreement with cover-line delivery address → empty output\n\n**Input:** Account=`CBRE`, Entity=`Med Pharmex Property LLC`, Pramata #=`18220`, Contract Status=`Active`\n**Document:** Letter agreement (Exclusive Sales Listing Agreement) covering listing terms, commission, term, and standard contractual language. The cover line \"BY ELECTRONIC MAIL Med Pharmex Property LLC, 2727 Thompson Creek Rd, Pomona, CA 91767\" is the delivery address for the letter itself, not a notices clause. Sections 1–17 cover Term, exclusive agency, Listing Team, listing price, marketing strategy, cooperation, representations, offers/negotiations, commission, Cooperating Brokers, lease commission, dual agency, environmental/zoning, foreclosure, dispute resolution, anti-discrimination, and entire-agreement provisions. None of these is a notices section.\n\nPre-flight Step 1 fails → CBRE contributes no row → CBRE is **absent from the output**.\n\n**Expected output:** *(completely empty if CBRE is the only contract; or, if other contracts in the batch qualify, the table contains only those contracts and CBRE is not present)*\n\nForbidden output for this case: `| CBRE | - | - | - | - | ... |` ← never emit this, even when other contracts in the same batch did qualify.\n\n### ❌ Clause exists but Account-side address is blank → no row from this contract\n\n**Input:** Any Account / Entity pair from input metadata, with Pramata # populated and Contract Status `Active`.\n**Document:** Contract has a clause referencing notice addresses elsewhere (e.g., \"at the addresses set out on the first page hereof\"), but the Account-side address fields at the referenced location are blank or unfilled. Only the counterparty's address is populated.\n\nPre-flight Step 3 fails → this contract contributes no row. **If no other contracts qualify, the entire output is empty. If other contracts in the batch qualify, the table contains only those contracts.** Available metadata (Pramata #, Contract Status) never overrides a pre-flight failure.\n\n### ✅ Heterogeneous batch — one qualifies, one doesn't\n\n**Input:** Two contracts in the same batch.\n\n- Contract A: Account=`Ennov`, Entity=`MED PHARMEX, INC`, Pramata #=`14507`, Contract Status=`Active` — contains Article 23 (Election of domicile) with Ennov's address at 7015 College Blvd, Suite 525, Overland Park, KS 66211, with timing \"eight (8) calendar days after it has been duly notified.\"\n- Contract B: Account=`CBRE`, Entity=`Med Pharmex Property LLC`, Pramata #=`18220`, Contract Status=`Active` — letter agreement with no notices clause.\n\nContract A passes pre-flight. Contract B fails pre-flight Step 1.\n\n**Expected output:**\n\n| Account | Entity | Pramata # | Doc Link | Contract Status | Clause Text | Recipient FAO | Recipient Street | Recipient City | Recipient State | Recipient Zip | Recipient Country | Recipient Email | Copy To FAO | Copy To Street | Copy To City | Copy To State | Copy To Zip | Copy To Country | Copy To Email | Timing Requirements |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| Ennov | MED PHARMEX, INC | 14507 | [Link](https://dechra.pramata.com/contracts/14507/pdf_download) | Active | Article 23 (Election of domicile) For the execution of this Agreement and all of its consequences, the Parties make election of domicile at the addresses indicated above. Any change of domicile shall only be enforceable against the other Party eight (8) calendar days after it has been duly notified... |  | 7015 College Blvd, Suite 525 | Overland Park | KS | 66211 |  |  |  |  |  |  |  |  |  | eight (8) calendar days after it has been duly notified |\n\nCBRE is **absent**. The table has one row, not two. Do not include a CBRE row with `-` fillers — that is the most common defect this prompt is designed to prevent.\n\n### ✅ Standard US clause\n\n**Input:** Account=`Adsurgo`, Entity=`DECHRA DEVELOPMENT LLC`, Pramata #=`22081`, Contract Status=`Active`\n\n**Clause:** Section 23.1 — Any notice required to be given under this Agreement shall be in writing and addressed to: DECHRA DEVELOPMENT LLC – FAO General Counsel, 7015 College Blvd, Suite 510, Overland Park, KS 66211; Adsurgo – FAO Engagement Manager, 1234 Consulting Way, Boulder, CO 80301. Notice shall be effective two (2) business days after delivery.\n\n| Account | Entity | Pramata # | Doc Link | Contract Status | Clause Text | Recipient FAO | Recipient Street | Recipient City | Recipient State | Recipient Zip | Recipient Country | Recipient Email | Copy To FAO | Copy To Street | Copy To City | Copy To State | Copy To Zip | Copy To Country | Copy To Email | Timing Requirements |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| Adsurgo | DECHRA DEVELOPMENT LLC | 22081 | [Link](https://dechra.pramata.com/contracts/22081/pdf_download) | Active | Section 23.1 Any notice required to be given under this Agreement shall be in writing and addressed to: DECHRA DEVELOPMENT LLC – FAO General Counsel, 7015 College Blvd, Suite 510, Overland Park, KS 66211; Adsurgo – FAO Engagement Manager, 1234 Consulting Way, Boulder, CO 80301... | Engagement Manager | 1234 Consulting Way | Boulder | CO | 80301 |  |  |  |  |  |  |  |  |  | 2 Business Days |\n\nDECHRA's address is excluded (counterparty-side). Country empty (US, not explicitly written). Empty cells are *truly blank*, not `-`.\n\n### ✅ Canadian Account-side address with method-specific timing + Copy To\n\n**Input:** Account=`Abcellera Biologics`, Entity=`Invetx Inc.`, Pramata #=`31455`, Contract Status=`Active`\n\n**Clause (Section 10.9):** Any notice to be given under this Agreement must be in writing and delivered either in person, by internationally-recognized express courier, by email, or by facsimile, to the party to be notified at its address(es) given below, or at any address such party has previously designated by prior written notice. Notice deemed given upon earliest of: actual receipt; next business day if by courier; date of return-email confirmation if by email; or confirmation of successful transmission if by fax.\n\n**If to AbCellera:** AbCellera, 2215 Yukon St., Vancouver, BC V5Y 0A1, Canada, Attn: President and Chief Executive Officer, Email: carl.hansen@abcellera.com\n\n**With a copy to:** AbCellera Biologics Inc., 2215 Yukon St., Vancouver, BC V5Y 0A1, Canada, Attn: Murray McCutcheon, Ph.D., Email: murray.mccutcheon@abcellera.com\n\n**If to Client:** Invetx Inc., c/o Anterra Capital, One Boston Place, Suite 3930, 201 Washington Street, Boston, MA 02108, Attn: Jürgen Horn, Email: jhorn@invetx.com\n\n| Account | Entity | Pramata # | Doc Link | Contract Status | Clause Text | Recipient FAO | Recipient Street | Recipient City | Recipient State | Recipient Zip | Recipient Country | Recipient Email | Copy To FAO | Copy To Street | Copy To City | Copy To State | Copy To Zip | Copy To Country | Copy To Email | Timing Requirements |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| Abcellera Biologics | Invetx Inc. | 31455 | [Link](https://dechra.pramata.com/contracts/31455/pdf_download) | Active | Section 10.9 Any notice to be given under this Agreement must be in writing and delivered either in person, by internationally-recognized express courier, by email, or by facsimile, to the party to be notified at its address(es) given below, or at any address such party has previously designated... | President and Chief Executive Officer | 2215 Yukon St. | Vancouver | BC | `V5Y 0A1` | Canada | carl.hansen@abcellera.com | Murray McCutcheon, Ph.D. | 2215 Yukon St. | Vancouver | BC | `V5Y 0A1` | Canada | murray.mccutcheon@abcellera.com | Notice deemed given upon earliest of: actual receipt; next business day if by courier; date of return-email confirmation if by email; or confirmation of successful transmission if by fax. |\n\nAccount = AbCellera, so AbCellera address goes in Recipient. Invetx is the Entity/counterparty — its Boston address is excluded.\n\n### ✅ International address + email permitted (Parent Document fallback)\n\n**Input:** Account=`Almac Pharma Services`, Entity=`Piedmont Animal Health, LLC`, Pramata #=`40118` (this is the SOW's number, not the parent MSA's), Contract Status=`Active` (SOW under Master Agreement; SOW has no notices clause)\n\n**Parent clause (MSA Section 23.1):** Notice in writing or by email to Piedmont Animal Health, LLC – FAO Operations, 145 Industrial Way, Greensboro, NC 27409; Almac Pharma Services – FAO Managing Director, 20 Seagoe Industrial Estate, Craigavon BT63 5QD, United Kingdom, md@almac.com. Effective 2 business days after delivery.\n\n| Account | Entity | Pramata # | Doc Link | Contract Status | Clause Text | Recipient FAO | Recipient Street | Recipient City | Recipient State | Recipient Zip | Recipient Country | Recipient Email | Copy To FAO | Copy To Street | Copy To City | Copy To State | Copy To Zip | Copy To Country | Copy To Email | Timing Requirements |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| Almac Pharma Services | Piedmont Animal Health, LLC | 40118 | [Link](https://dechra.pramata.com/contracts/40118/pdf_download) | Active | Section 23.1 [from Parent MSA] Notice in writing or by email to Piedmont Animal Health, LLC – FAO Operations, 145 Industrial Way, Greensboro, NC 27409; Almac Pharma Services – FAO Managing Director, 20 Seagoe Industrial Estate, Craigavon BT63 5QD, United Kingdom, md@almac.com... | Managing Director | 20 Seagoe Industrial Estate | Craigavon |  | `BT63 5QD` | United Kingdom | md@almac.com |  |  |  |  |  |  |  | 2 Business Days |\n\nState empty (UK is not US/Canada). Email populated because the clause permits it. Pramata # and Doc Link reference the **SOW** (the current document), not the parent MSA.\n\n### ✅ Multiple Copy To recipients sharing one address (Superseded contract)\n\n**Input:** Account=`BROADCOM`, Entity=`Dechra Holdings US Inc.`, Pramata #=`8842`, Contract Status=`Superseded`\n\n**Clause:** Section 18.2 — Notices shall be delivered to: Dechra Holdings US Inc. – FAO Legal, 7015 College Blvd, Overland Park, KS 66211; BROADCOM – FAO General Counsel, 1320 Ridder Park Drive, San Jose, CA 95131, with copies to Wilson Sonsini Goodrich & Rosati – FAO Mark Anderson, manderson@wsgr.com; FAO Sarah Lee; and FAO Tom Chen, tchen@wsgr.com, all at 650 Page Mill Road, Palo Alto, CA 94304. Notice may be given by email and is effective 5 business days after mailing.\n\n| Account | Entity | Pramata # | Doc Link | Contract Status | Clause Text | Recipient FAO | Recipient Street | Recipient City | Recipient State | Recipient Zip | Recipient Country | Recipient Email | Copy To FAO | Copy To Street | Copy To City | Copy To State | Copy To Zip | Copy To Country | Copy To Email | Timing Requirements |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n| BROADCOM | Dechra Holdings US Inc. | 8842 | [Link](https://dechra.pramata.com/contracts/8842/pdf_download) | Superseded | Section 18.2 Notices shall be delivered to: Dechra Holdings US Inc. – FAO Legal, 7015 College Blvd, Overland Park, KS 66211; BROADCOM – FAO General Counsel, 1320 Ridder Park Drive, San Jose, CA 95131, with copies to Wilson Sonsini Goodrich & Rosati – FAO Mark Anderson... | General Counsel | 1320 Ridder Park Drive | San Jose | CA | 95131 |  |  | Mark Anderson; Sarah Lee; Tom Chen | 650 Page Mill Road | Palo Alto | CA | 94304 |  | manderson@wsgr.com; tchen@wsgr.com | 5 Business Days |\n\nThree Copy To contacts share one address — populate address columns once, concatenate FAO list with `; `. Sarah Lee has no email, so she's omitted from the Email list (no placeholder). Contract Status is `Superseded` because the input metadata indicated this version was replaced by a later amendment — the clause itself is still extracted on its own merits.\n\n---\n\n## Appendix — Architecture note: Contract Status computation\n\n> **This appendix is design context, not active runtime instructions.** The active rules for resolving Contract Status — including in-prompt Stage 3 computation — are defined in the Field rules table and the \"Contract Status — Stage 3 computation rules\" section. Follow those. The text below explains *why* Stage 3 exists, the tradeoffs of doing computation inside an extraction prompt, and what the better long-term architecture would look like if upstream changes ever become possible.\n\n### Current implementation — computation lives in the prompt\n\nThis prompt currently performs Contract Status computation in Stage 3 because no upstream pipeline writes a computed `Contract Status` into the metadata block. The Stage 3 rules are deliberately bounded: a small input set, a short ordered decision list, and an explicit `Unknown` fallback when inputs are ambiguous. This is the correct design *for the constraint we're operating under*, but it carries known costs:\n\n- **Auditability is reduced.** A single LLM call both extracts the inputs and decides the outcome — there's no separable trace of \"here are the dates I read; here's the rule I applied.\"\n- **Date arithmetic can drift across runs.** LLMs are imperfect at adding 72 months to a date; expect occasional off-by-one or off-by-month errors.\n- **Edge cases are inconsistent.** Multi-SOW contracts, partial terminations, evergreen-until-terminated language, and cross-document supersession will produce variable results because the prompt sees only one document at a time.\n- **Token cost is higher.** Stage 3 reasoning runs on every contract whose metadata lacks a status, even when most cases would resolve to \"Active\" trivially.\n\n### Long-term aspiration — extraction and computation should be separated\n\nIf upstream changes ever become possible, the cleanest pattern is:\n\n1. **LLM** for extraction of term/renewal/termination data points.\n2. **Code** (rule engine) for the status computation.\n3. **LLM** (optional) for a human-readable rationale.\n\nContract Status is a **state derived from dates and flags**, not a fact written into the contract. That math belongs in deterministic logic so it's auditable, consistent across runs, and reproducible. The LLM's job in this target architecture is to reliably pull the inputs out of the clause text — which it's already doing in Stage 3 — and to hand them off to deterministic code rather than deciding the outcome itself.\n\n### Stage 1 — What the LLM extracts (per contract)\n\nThis is exactly the kind of structured extraction a CAM with mandatory data elements is designed for, and the `clause-rollup` pattern collapses multi-instance tags down to one row per contract so the rule engine has a clean input.\n\n- Effective Date\n- Initial Term End Date (or Initial Term Length)\n- Auto-Renewal? (yes/no)\n- Renewal Term Length\n- Non-Renewal Notice Period (e.g., 60 days)\n- Termination/Cancellation events (from amendments or termination notices)\n- Linked relationships — superseding agreements, signed renewals/extensions\n\n### Stage 2 — Rule engine computes status against today's date\n\nEvaluate in order; first match wins:\n\n1. Today < Effective Date → **Pending / Future Effective**\n2. Termination event exists → **Terminated**\n3. Superseded by newer agreement → **Superseded**\n4. Today > Expiration AND no auto-renewal → **Expired**\n5. Today > Expiration AND auto-renewal AND no non-renewal notice → roll forward by renewal term, then re-evaluate (loop)\n6. Today inside the notice window before next expiration → **Pending Renewal Decision**\n7. Otherwise → **Active** (Initial Term or Renewal Term N)\n\nEach computed status should carry the **as-of date** used and the **next decision date** — those are what CSMs and ops actually need for reporting and reminders.\n\n### Stage 3 — Where the LLM adds value beyond extraction\n\n- Generating the human-readable rationale (e.g., \"Active under 2nd renewal term; expires 3/15/27; non-renewal notice due by 1/15/27\").\n- Catching weird cases the rules miss — partial terminations, contracts with multiple SOWs on different cycles, \"evergreen until terminated\" language.\n- Flagging low-confidence extractions back to a reviewer.\n\n### Mapping back to this prompt's five values\n\nA future rule engine would output richer states (Pending, Pending Renewal Decision, Active under Renewal Term N, etc.) than this prompt's enumerated set. When such a pipeline writes `Contract Status` into the metadata block consumed here, it should collapse to the closest of the five permitted values:\n\n| Rule engine state | `Contract Status` value passed to this prompt |\n|---|---|\n| Active (Initial Term or any Renewal Term) | `Active` |\n| Pending / Future Effective | `Active` (or hold back from extraction until effective) |\n| Pending Renewal Decision | `Active` |\n| Expired | `Inactive` |\n| Terminated | `Terminated` |\n| Superseded | `Superseded` |\n| Cannot be computed (missing inputs) | `Unknown` |\n\nThe richer state, as-of date, and next decision date should live in their own metadata fields downstream — not in the `Contract Status` cell of this AITable.\n"
      }
    ],
    "config": {
      "llmTier": "Balanced",
      "model": "Haiku (8K)",
      "notes": ""
    },
    "version": "1.0",
    "createdAt": "2026-07-22",
    "updatedAt": "2026-07-22",
    "clientTags": [
      "Dechra"
    ],
    "agentType": "Custom Agentic Solutions"
  }
];
 
const SK = {
  agents:      "agentlib-v9-agents",
  solutions:   "agentlib-v9-solutions",
  clientNames: "agentlib-v9-clientnames",
};
 
// ── Firebase Realtime Database Config ─────────────────────────────────────────
// Use Vite environment variables so the Firebase backend can be changed per deploy.
// RTDB REST API is plain JSON — no type wrapping needed like Firestore.
const FIREBASE_DB_URL = import.meta.env.VITE_FIREBASE_DB_URL || "https://pravesh-97f6a-default-rtdb.firebaseio.com";
const FIREBASE_DB_PATH = import.meta.env.VITE_FIREBASE_DB_PATH || "";

// Firebase Web config is not a secret (it identifies the project, it doesn't
// authorize anything by itself) — safe to ship in the client bundle.
const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB-X-ovL_mDqFxVCfJpPQuFeqcpn4GmQNc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pravesh-97f6a.firebaseapp.com",
  databaseURL: FIREBASE_DB_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pravesh-97f6a",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:867497360490:web:10d39925af3d4a392fde13",
});
const firebaseAuth = getAuth(firebaseApp);
// Every visitor (admin or not) signs in anonymously so RTDB requests carry an
// ID token — security rules require `auth != null` to write.
const authReady = signInAnonymously(firebaseAuth).catch(e => {
  console.error("Firebase anonymous sign-in failed:", e.message, e);
  return null;
});

async function getIdToken() {
  try {
    await authReady;
    return (await firebaseAuth.currentUser?.getIdToken()) || null;
  } catch (e) {
    console.error("Firebase getIdToken failed:", e.message, e);
    return null;
  }
}

function withAuth(url, token) {
  if (!token) return url;
  return `${url}${url.includes("?") ? "&" : "?"}auth=${token}`;
}

// Security rules only grant .read/.write on the named top-level collections
// (agents, solutions, clientNames), not on the DB root — so reads must hit
// each collection path individually, never `/.json`.
const RTDB_COLLECTIONS = ["agents", "solutions", "clientNames"];

function rtdbUrl(child) {
  const path = FIREBASE_DB_PATH ? `${FIREBASE_DB_PATH}/${child}` : child;
  return `${FIREBASE_DB_URL}/${path}.json`;
}

function rtdbRootUrl() {
  return FIREBASE_DB_PATH
    ? `${FIREBASE_DB_URL}/${FIREBASE_DB_PATH}.json`
    : `${FIREBASE_DB_URL}/.json`;
}

// Lightweight reachability check — separate from fbLoad so we can tell
// "connected but empty" apart from "actually unreachable"
async function fbPing() {
  if (!FIREBASE_DB_URL) return false;
  try {
    const token = await getIdToken();
    const r = await fetch(withAuth(`${rtdbUrl("agents")}?shallow=true`, token));
    return r.ok;
  } catch (e) {
    console.error("Firebase ping error:", e.message, e);
    return false;
  }
}

async function fbLoad() {
  if (!FIREBASE_DB_URL) return null;
  try {
    const token = await getIdToken();
    const responses = await Promise.all(RTDB_COLLECTIONS.map(c => fetch(withAuth(rtdbUrl(c), token))));
    if (responses.some(r => !r.ok)) {
      console.error("Firebase load failed:", responses.map(r => r.status).join(","));
      return null;
    }
    const [agents, solutions, clientNames] = await Promise.all(responses.map(r => r.json()));
    if (agents == null && solutions == null && clientNames == null) return null;
    return { agents, solutions, clientNames };
  } catch (e) {
    console.error("Firebase load error:", e.message, e);
    return null;
  }
}

// Uses PATCH (multi-location update) instead of PUT: Realtime Database
// evaluates security rules per affected child path for a PATCH, so this
// works with rules scoped to agents/solutions/clientNames and no root grant.
async function fbSave(data) {
  if (!FIREBASE_DB_URL) return { ok: false, error: "No database URL configured" };
  try {
    const token = await getIdToken();
    const r = await fetch(withAuth(rtdbRootUrl(), token), {
      method: "PATCH",
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
 
async function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
async function persist(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
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
  tag:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41 11 3.83 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>,
  clock:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  message: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  book:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  sliders: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  tagSolid: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M20.83 11.59 12.41 3.17A2 2 0 0 0 11 2.59H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.41l8.42 8.42a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.83zM7 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>,
  calendar: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2.5"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/><rect x="6.5" y="13" width="3" height="3" rx="0.6" fill="currentColor" stroke="none"/><rect x="10.5" y="13" width="3" height="3" rx="0.6" fill="currentColor" stroke="none"/><rect x="14.5" y="13" width="3" height="3" rx="0.6" fill="currentColor" stroke="none"/></svg>,
  messageDots: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none"/></svg>,
  downloadTray: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v11.5"/><path d="M7 10.5 12 15.5 17 10.5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/></svg>,
  stack:  () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="M2.5 12 12 17l9.5-5"/><path d="M2.5 16 12 21l9.5-5"/></svg>,
  brain:  () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 3.5a3 3 0 0 0-3 3v.3A3 3 0 0 0 4.5 12a3 3 0 0 0 1 5.5 3 3 0 0 0 3 3.2A2.5 2.5 0 0 0 11 18.5v-12A2.8 2.8 0 0 0 9 3.5z"/><path d="M15 3.5a3 3 0 0 1 3 3v.3A3 3 0 0 1 19.5 12a3 3 0 0 1-1 5.5 3 3 0 0 1-3 3.2 2.5 2.5 0 0 1-2.5-2.7v-12A2.8 2.8 0 0 1 15 3.5z"/><path d="M11 8.2H8.7M11 12H8M11 15.8H8.5M13 8.2h2.3M13 12h3M13 15.8h2.5"/></svg>,
};
 
// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:        { fontFamily: "'ProximaNova', sans-serif", minHeight: "100vh", background: LIGHT, color: NAVY },
  hdr:        { background: NAVY, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, borderBottom: `3px solid ${CORAL}` },
  logoText:   { color: WHITE, fontWeight: 700, fontSize: 19 },
  logoSub:    { color: TAN, fontSize: 14 },
  badge:      { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" },
  badgeName:  { color: WHITE, fontSize: 16 },
  badgeRole:  { fontSize: 13, color: CORAL, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" },
  loginWrap:  { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a1628", position: "relative", overflow: "hidden" },
  loginAppName: { color: WHITE, fontWeight: 800, fontSize: 48, textAlign: "center", letterSpacing: "-0.02em" },
  loginAppSub:  { color: "rgba(255,255,255,0.55)", fontSize: 18, marginTop: 6, textAlign: "center" },
  loginCard:  { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 40px 12px 40px", width: 440, boxShadow: "0 32px 80px rgba(0,0,0,0.5)" },
  lbl:        { fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.07em" },
  inp:        { width: "100%", padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 17, color: NAVY, outline: "none", boxSizing: "border-box" },
  loginBtn:   { width: "100%", padding: "16px", background: CORAL, color: WHITE, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 18, cursor: "pointer", marginTop: 24, letterSpacing: "0.01em", marginBottom: "1rem" },
  adminLink:  { marginTop: 0, textAlign: "center" },
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
  cardFooter: { display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" },
  cardFooterTop: { display: "flex", flexDirection: "column", gap: 5 },
  cardContextText: { fontSize: 13, fontWeight: 600, color: "#475467", letterSpacing: "0.04em" },
  cardFooterDivider: { width: "100%", borderTop: "1px solid #e7eaee" },
  cardFooterBottom: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  cardStats:  { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, color: "#7e8a99", fontSize: 13 },
  metaItem:   { display: "inline-flex", alignItems: "center", gap: 4 },
  metaDivider:{ color: "#d5d8de", fontWeight: 700 },
  openBtn:    { border: "1px solid rgba(0,0,0,0.08)", background: "transparent", color: NAVY, borderRadius: 6, padding: "9px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" },
  tag:        { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: `${STEEL}18`, color: STEEL, borderRadius: 4, fontSize: 14, fontWeight: 600 },
  tagNavy:    { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: `${NAVY}0D`, color: NAVY, borderRadius: 4, fontSize: 14, fontWeight: 600 },
  tagCoral:   { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: `${CORAL}14`, color: CORAL, borderRadius: 4, fontSize: 14, fontWeight: 600 },
  dlCount:    { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, color: "#bbb", fontWeight: 500 },
  ver:        { fontSize: 14, color: "#ccc", fontWeight: 500 },
  backBtn:    { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "none", color: "#777", border: "none", borderRadius: 7, fontWeight: 500, fontSize: 16, cursor: "pointer", marginBottom: 18 },
  detailHdr:  { background: WHITE, borderRadius: 12, border: `1.5px solid ${TAN}`, padding: 28, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  detailLeft: { flex: 1, minWidth: 0 },
  detailRight: { display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" },
  detailDesc: { fontSize: 15, color: "#556", marginTop: 6, marginBottom: 6, lineHeight: 1.4 },
  detailTitle: { fontSize: 27, fontWeight: 700, color: NAVY, marginBottom: 10 },
  detailMeta: { display: "flex", gap: 14, fontSize: 15, color: "#aaa", marginBottom: 14, flexWrap: "wrap", alignItems: "center" },
  metaItemSmall: { display: "flex", alignItems: "center", gap: 14, color: "#053049" },
  metaIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#053049", flexShrink: 0 },
  metaLabel: { fontSize: 15, color: "#053049", fontWeight: 400 },
  metaValue: { fontSize: 17, color: "#053049", fontWeight: 700 },
  detailActs: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 },
  detailBody: { display: "grid", gap: 24 },
  detailGrid: { display: "grid", gap: 24 },
  libraryGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" },
  buildPanel: { background: WHITE, borderRadius: 12, border: `1.5px solid ${TAN}`, padding: 24, position: "sticky", top: 32 },
  buildTitle: { fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 10 },
  buildSubtitle: { fontSize: 14, lineHeight: 1.7, color: "#556", marginBottom: 18 },
  buildField: { marginBottom: 18 },
  buildLabel: { fontSize: 12, fontWeight: 700, color: "#63738e", letterSpacing: "0.08em", marginBottom: 8, display: "block", textTransform: "uppercase" },
  buildInput: { width: "100%", padding: "12px 14px", border: "1.5px solid #ddd", borderRadius: 10, fontSize: 15, color: NAVY, outline: "none", boxSizing: "border-box" },
  buildTextarea: { width: "100%", minHeight: 110, padding: "12px 14px", border: "1.5px solid #ddd", borderRadius: 10, fontSize: 15, color: NAVY, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" },
  buildSelect: { width: "100%", padding: "12px 14px", border: "1.5px solid #ddd", borderRadius: 10, fontSize: 15, color: NAVY, background: WHITE, outline: "none", boxSizing: "border-box" },
  buildHint: { fontSize: 12, color: "#999", marginTop: 4, textAlign: "right" },
  buildButtons: { display: "flex", gap: 12, marginTop: 16 },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 36, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${TAN}` },
  metaSep: { width: 1, height: 28, background: "#eef2f4" },
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
      <div style={S.pinBox} className="pin-box">
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
            stroke="rgba(100,180,255,0.4)" strokeWidth="1" strokeDasharray="4 8" />
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
      <div style={{ ...S.loginCard, position: "relative", zIndex: 1 }} className="login-card">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          {/* AI chip icon */}
          <div style={{ flexShrink: 0, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <rect x="14" y="14" width="24" height="24" rx="5" fill="none" stroke={CORAL} strokeWidth="2"/>
              <rect x="20" y="20" width="12" height="12" rx="2" fill="none" stroke={CORAL} strokeWidth="1.5"/>
              <text x="26" y="30" textAnchor="middle" fontSize="8" fontWeight="800" fill={CORAL} fontFamily="'ProximaNova', sans-serif">AI</text>
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
          Get Started →
        </button>
      </div>
 
      {/* Admin link */}
      <div style={{ ...S.adminLink, position: "relative", zIndex: 1 }}>
        <button style={S.adminLinkBtn} onClick={() => setShowPin(true)}>
          <Ic.lock /> Admin Access
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
function AgentModal({ agent, user, solutions, clientNames, onSave, onClose, onAddSolution, onAddClientName, fullPage }) {
  const isEdit = !!agent?.id;
  const isClient = user?.role === "client";
  if (user?.role !== "admin") return null;
  const blank = {
    id: "", name: "", solution: "", contextMode: "",
    downloads: 0, useCase: "",
    analysisInstructions: "",
    prompts: [{ id: "p1", label: "Primary Prompt", type: "english", content: "" }],
    config: { llmTier: "Balanced", model: "", notes: "" },
    version: "1.0", createdAt: toDay(), updatedAt: toDay(),
    clientTags: [],
  };
 
  const initForm = () => {
    if (!agent) return blank;
    const base = { ...agent };
    if (!Array.isArray(base.clientTags)) base.clientTags = [];
    return base;
  };
 
  const [form, setForm]         = useState(initForm);
  const [ap, setAp]             = useState(0);
  const [err, setErr]           = useState("");
  const [showCat, setShowCat]   = useState(false);
  const [newClient, setNewClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
 
  const title = isEdit ? "Edit Agent" : isClient ? "Build Agent" : "New Agent";
  const actionLabel = isEdit
    ? (form.status === "Draft" ? "Publish Agent" : "Save Changes")
    : isClient ? "Build Agent" : "Create Agent";
 
  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCfg = (k, v) => setForm(f => ({ ...f, config: { ...f.config, [k]: v } }));
  const setPF  = (i, k, v) => {
    const ps = [...form.prompts];
    ps[i] = { ...ps[i], [k]: v };
    setForm(f => ({ ...f, prompts: ps }));
  };
 
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
    const basePrompt = form.prompts[0] || { id: "p1", label: "Primary Prompt", type: "english", content: "" };
    const promptContent = basePrompt.content.trim() || `Analyze contract information using Pramata variables like {{MASTER}} and {{DOCUMENT}}. ${form.analysisInstructions}`.trim();
    const prompts = [
      { ...basePrompt, content: promptContent },
      ...form.prompts.slice(1),
    ];
    onSave({
      ...form,
      prompts,
      status: form.status === "Draft" ? "Published" : form.status || "Published",
      id: form.id || genId(),
      updatedAt: toDay(),
      config: { ...form.config, model: LLM_MODELS[form.config.llmTier] || form.config.model },
    });
  }
 
  const outerStyle = fullPage ? {} : S.overlay;
  const innerStyle = fullPage
    ? { ...S.modal, maxWidth: 900, maxHeight: "none", boxShadow: "none", padding: 0 }
    : S.modal;

  return (
    <div style={outerStyle} onClick={fullPage ? undefined : e => e.target === e.currentTarget && onClose()}>
      <div style={innerStyle} className="app-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          {fullPage ? (
            <button onClick={onClose} style={{ ...S.btnS, display: "inline-flex", alignItems: "center", gap: 6 }}><Ic.back /> Back to Library</button>
          ) : (
            <div style={S.modalTitle}>{title}</div>
          )}
          {!fullPage && <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa" }}><Ic.x /></button>}
        </div>
        {fullPage && <div style={{ ...S.modalTitle, marginTop: 0 }}>{title}</div>}
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
 
        <div style={{ marginBottom: 18, padding: "16px 18px", background: LIGHT, borderRadius: 14, border: `1px solid ${TAN}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Build your agent with Claude-style guidance</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "#444" }}>
            1. Describe your use case.<br />
            2. How would you like your agent to analyze contract information? Use Pramata variables like <code>{"{{MASTER}}"}</code> and <code>{"{{DOCUMENT}}"}</code>.
          </div>
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
 
        <div style={S.fRow}>
          <label style={S.lbl}>Contract analysis guidance</label>
          <textarea
            style={{ ...S.ta, minHeight: 80 }}
            value={form.analysisInstructions}
            onChange={e => set("analysisInstructions", e.target.value)}
            placeholder="e.g. Extract {{MASTER}} and {{DOCUMENT}} values and summarize the key obligations by section..."
          />
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
          <button style={S.btnP} onClick={doSave}>{actionLabel}</button>
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
 
      <div style={{ ...S.detailHdr, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div style={S.detailLeft}>
            {agent.solution && (
              <div style={{ marginBottom: 10 }}>
                <span style={S.tagNavy}><Ic.zap /> {agent.solution}</span>
              </div>
            )}

            <div style={S.detailTitle}>{agent.name}</div>
            <div style={S.detailDesc}>{agent.useCase}</div>
          </div>

          <div style={S.detailRight}>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btnP} onClick={() => onDownload(agent)}><Ic.dl /> Download</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {isAdmin && <button style={S.btnS} onClick={() => onEdit(agent)}><Ic.edit /> Edit</button>}
              {isAdmin && <button style={{ ...S.btnG, color: CORAL, borderColor: `${CORAL}40` }} onClick={() => onDelete(agent.id)}><Ic.trash /> Delete</button>}
            </div>
          </div>
        </div>

      <div style={S.metaRow}>
        <div style={S.metaItemSmall}>
          <span style={S.metaIcon}><Ic.tagSolid /></span>
          <div>
            <div style={S.metaLabel}>Version</div>
            <div style={S.metaValue}>v{agent.version}</div>
          </div>
        </div>

        <div style={S.metaItemSmall}>
          <span style={S.metaIcon}><Ic.calendar /></span>
          <div>
            <div style={S.metaLabel}>Updated</div>
            <div style={S.metaValue}>{agent.updatedAt || "Unknown date"}</div>
          </div>
        </div>

        <div style={S.metaItemSmall}>
          <span style={S.metaIcon}><Ic.messageDots /></span>
          <div>
            <div style={S.metaLabel}>Prompts</div>
            <div style={S.metaValue}>{agent.prompts.length}</div>
          </div>
        </div>

        <div style={S.metaItemSmall}>
          <span style={S.metaIcon}><Ic.downloadTray /></span>
          <div>
            <div style={S.metaLabel}>Downloads</div>
            <div style={S.metaValue}>{agent.downloads || 0}</div>
          </div>
        </div>

        {agent.contextMode && (
          <div style={S.metaItemSmall}>
            <span style={S.metaIcon}><Ic.stack /></span>
            <div>
              <div style={S.metaLabel}>Context</div>
              <div style={S.metaValue}>{agent.contextMode}</div>
            </div>
          </div>
        )}

        {agent.config?.llmTier && (
          <div style={S.metaItemSmall}>
            <span style={S.metaIcon}><Ic.brain /></span>
            <div>
              <div style={S.metaLabel}>LLM Tier</div>
              <div style={S.metaValue}>{agent.config.llmTier}</div>
            </div>
          </div>
        )}
      </div>
      </div>

      <div style={S.detailBody}>
        <div style={S.detailGrid}>
          <div>
            <div style={S.section}>
              <div style={S.secTitle}>Use Case</div>
              <div style={{ fontSize: 17, color: "#444", lineHeight: 1.75 }}>
                {(agent.useCase || "").split("\n").map((line, i) => {
                  const isBullet = line.startsWith("• ") || line.startsWith("- ");
                  const text = isBullet ? line.slice(2) : line;
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
        </div>
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
  const [filterClient,   setFilterClient]  = useState("All");
  const [clientCollapsed,setClientCollapsed] = useState(false);
  const [draftAgent,     setDraftAgent]     = useState({
    name: "", useCase: "", prompt: "", modelSelection: "", knowledgeSource: ""
  });
  const [draftError,     setDraftError]     = useState("");
  const [draftGenerating, setDraftGenerating] = useState(false);
 
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
      setClientNames(cn || SEED_CLIENT_NAMES);
 
      setLoading(false);
    })();
  }, []);
 
  // Agents write to local storage always. Only admins push shared updates to Firebase.
  async function persistAgents(nextAgents) {
    const canSyncRemote = FIREBASE_DB_URL && user?.role === "admin";
    setAgents(nextAgents);
    await persist(SK.agents, nextAgents);
    if (canSyncRemote) {
      setSyncStatus("saving");
      const result = await fbSave({ agents: nextAgents, solutions, clientNames });
      setSyncStatus(result.ok ? "live" : "error");
      setSyncErrorDetail(result.ok ? "" : result.error);
    } else if (FIREBASE_DB_URL) {
      setSyncStatus("local");
    }
  }
 
  async function persistSolutions(s) {
    const canSyncRemote = FIREBASE_DB_URL && user?.role === "admin";
    setSolutions(s);
    await persist(SK.solutions, s);
    if (canSyncRemote) await fbSave({ agents, solutions: s, clientNames });
  }
  async function persistClientNames(n) {
    const canSyncRemote = FIREBASE_DB_URL && user?.role === "admin";
    setClientNames(n);
    await persist(SK.clientNames, n);
    if (canSyncRemote) await fbSave({ agents, solutions, clientNames: n });
  }
 
  function handleDraftChange(key, value) {
    setDraftAgent(prev => ({ ...prev, [key]: value }));
  }
 
  async function callClaudeBuildAgent({ name, useCase, prompt, modelSelection, knowledgeSource }) {
    const instruction = `You are Claude, a generative AI assistant that builds Pramata agent definitions. Create a valid JSON object only, no explanation or markdown. The JSON must include: solution, contextMode, prompts, config. Use the user-provided name, use case, model selection, and knowledge source to generate the agent. Return prompts array items with id, label, type, and content. Use Pramata variables such as {{MASTER}} and {{DOCUMENT}} where appropriate.`;
    const requestBody = {
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      top_p: 1,
      system: instruction,
      messages: [
        { role: "user", content: `Agent Name: ${name}\nUse Case: ${useCase}\nPrompt / Instructions: ${prompt}\nModel Selection: ${modelSelection}\nKnowledge Source: ${knowledgeSource}` }
      ],
    };

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "anthropic-version": "2023-06-01",
    };

    if (CLAUDE_API_KEY) {
      headers["x-api-key"] = CLAUDE_API_KEY;
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    }

    const res = await fetch(CLAUDE_PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude request failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    const content = data?.content?.map?.(item => item?.text || "").join("") || data?.choices?.[0]?.message?.content || data?.completion || "";
    if (!content) throw new Error("No content returned from Claude.");
    const json = extractJsonObject(content);
    return json;
  }

  function extractJsonObject(text) {
    const candidate = text.trim().replace(/^[^\{\[]+/, "").replace(/[^\}\]]+$/, "");
    try {
      return JSON.parse(candidate);
    } catch (err) {
      const match = text.match(/(\{[\s\S]*\})/);
      if (!match) throw err;
      return JSON.parse(match[1]);
    }
  }

  async function createAgentFromDraft() {
    if (user?.role !== "admin") {
      setDraftError("Only admins can create agents.");
      return;
    }
    if (!draftAgent.name.trim())    return setDraftError("Agent name is required.");
    if (!draftAgent.useCase.trim()) return setDraftError("Use case is required.");
    if (!draftAgent.prompt.trim())  return setDraftError("Prompt / Instructions are required.");
    if (!draftAgent.modelSelection.trim()) return setDraftError("Model selection is required.");

    setDraftError("");
    setDraftGenerating(true);
    try {
      const generated = await callClaudeBuildAgent(draftAgent);
      const nextAgent = {
        id: genId(),
        name: draftAgent.name.trim(),
        solution: generated.solution || "",
        contextMode: generated.contextMode || "",
        downloads: 0,
        useCase: draftAgent.useCase.trim(),
        prompts: Array.isArray(generated.prompts) ? generated.prompts : [{ id: "p1", label: "Primary Prompt", type: "english", content: draftAgent.prompt.trim() }],
        config: {
          llmTier: generated.config?.llmTier || "Balanced",
          model: generated.config?.model || draftAgent.modelSelection,
          notes: generated.config?.notes || draftAgent.knowledgeSource.trim(),
        },
        version: "1.0",
        createdAt: toDay(),
        updatedAt: toDay(),
        clientTags: [],
        knowledgeSource: draftAgent.knowledgeSource.trim(),
        status: "Draft",
      };
      const next = [...agents, nextAgent];
      await persistAgents(next);
      setDraftAgent({ name: "", useCase: "", prompt: "", modelSelection: "", knowledgeSource: "" });
      setEditAgent(nextAgent);
      setShowModal(true);
    } catch (err) {
      setDraftError(err.message || "Claude generation failed.");
    } finally {
      setDraftGenerating(false);
    }
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
    if (user?.role !== "admin") return;
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
  const taggedClients = clientNames.filter(n => agents.some(a => (a.clientTags || []).includes(n)));
 
  const filtered = agents.filter(a => {
    const ms = !search || (a.name.toLowerCase().includes(search.toLowerCase()) || a.useCase.toLowerCase().includes(search.toLowerCase()) || (a.solution || "").toLowerCase().includes(search.toLowerCase()));
    const mSol    = filterSolution === "All" || a.solution === filterSolution;
    const mClient = filterClient === "All" || (a.clientTags || []).includes(filterClient);
    return ms && mSol && mClient;
  });
 
  if (!user)   return <LoginScreen onLogin={handleLogin} />;
  if (loading) return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div style={{ color: "#aaa", fontSize: 14 }}>Loading…</div></div>;
 
  const isAdmin = user.role === "admin";
  let pageTitle = "All Agents";
  if (filterClient !== "All") pageTitle = filterClient;
  else if (filterSolution !== "All") pageTitle = filterSolution;
 
  const chevron = (collapsed) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="18 15 12 9 6 15" />}
    </svg>
  );
 
  return (
    <div style={S.app} className="app-shell">
      <div style={S.hdr} className="app-header">
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
          <div style={S.badge} onClick={() => { setUser(null); setView("library"); setSelected(null); setSearch(""); setFilterSolution("All"); setFilterClient("All"); }}>
            <div><div style={S.badgeName}>{user.name}</div></div>
            <div style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>Sign out</div>
          </div>
        </div>
      </div>
 
      <div style={S.layout} className="app-layout">
        <div style={S.sidebar} className="app-sidebar">
          <div style={S.sideSec}>
            <div style={S.sideLbl}>Library</div>
            <div style={S.sideItem(view === "library" && filterSolution === "All" && filterClient === "All")}
              onClick={() => { setFilterSolution("All"); setFilterClient("All"); setView("library"); setSelected(null); }}>
              <span>All Agents</span><span style={S.sideCount}>{agents.length}</span>
            </div>
          </div>
 
          {solutions.filter(s => solCounts[s] > 0).length > 0 && (
            <div style={S.sideSec}>
              <div style={S.sideLbl}>By Solution</div>
              {solutions.filter(s => solCounts[s] > 0).map(s => (
                <div key={s} style={S.sideItem(view === "library" && filterSolution === s && filterClient === "All")}
                  onClick={() => { setFilterSolution(s); setFilterClient("All"); setView("library"); setSelected(null); }}>
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
                  onClick={() => { setFilterClient(n); setFilterSolution("All"); setView("library"); setSelected(null); }}>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}
 
 
          {isAdmin && (
            <div style={S.sideSec}>
              <div style={S.sideLbl}>Admin</div>
              <div style={{ padding: "7px 20px", cursor: "pointer", fontSize: 16, fontWeight: 600, color: CORAL, display: "flex", alignItems: "center" }}
                onClick={() => { setEditAgent(null); setView("form"); }}>+ New Agent</div>
            </div>
          )}
        </div>
 
        <div style={S.main} className="app-main">
          {view === "form" ? (
            <AgentModal
              fullPage
              user={user}
              agent={editAgent}
              solutions={solutions}
              clientNames={clientNames}
              onSave={a => { saveAgent(a); setView("library"); }}
              onClose={() => { setView("library"); setEditAgent(null); }}
              onAddSolution={addSolution}
              onAddClientName={addClientName}
            />
          ) : view === "detail" && selected ? (
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
              <div style={S.toolbar} className="app-toolbar">
                <div style={S.searchWrap} className="app-search-wrap">
                  <span style={S.searchIco}><Ic.search /></span>
                  <input style={S.searchInp} placeholder="Search agents or use cases…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {isAdmin && (
                  <button style={S.btnP} className="app-toolbar-button" onClick={() => { setEditAgent(null); setView("form"); }}>
                    <Ic.plus /> New Agent
                  </button>
                )}
              </div>
              <div style={isAdmin ? S.libraryGrid : { ...S.libraryGrid, gridTemplateColumns: "1fr" }}>
                <div>
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
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                            <div style={S.cardTitle}>{agent.name}</div>
                          </div>
                          <div style={S.cardDesc}>{agent.useCase}</div>
                          <div style={S.cardFooter}>
                            <div style={S.cardFooterDivider} />
                            <div style={S.cardFooterBottom}>
                              <div style={S.cardStats}>
                                <span style={S.metaItem}>v{agent.version}</span>
                                <span style={S.metaDivider}>·</span>
                                <span style={S.metaItem}>Updated {agent.updatedAt || "Unknown date"}</span>
                                <span style={S.metaDivider}>·</span>
                                <span style={S.metaItem}>{agent.prompts.length} prompt{agent.prompts.length !== 1 ? "s" : ""}</span>
                                <span style={S.metaDivider}>·</span>
                                <span style={S.metaItem}><Ic.dl /> {(agent.downloads || 0)} downloads</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div style={S.buildPanel}>
                    <div style={S.buildTitle}>Create New Agent</div>
                    <div style={S.buildSubtitle}>Build a custom agent to automate tasks and drive outcomes.</div>
                    {draftError && <div style={S.err}>{draftError}</div>}
                    {draftGenerating && <div style={{ marginBottom: 16, fontSize: 14, color: STEEL }}>Generating agent with Claude…</div>}
                    <div style={S.buildField}>
                      <label style={S.buildLabel}>Agent Name *</label>
                      <input style={S.buildInput} value={draftAgent.name} onChange={e => handleDraftChange("name", e.target.value)} placeholder="Enter agent name..." />
                    </div>
                    <div style={S.buildField}>
                      <label style={S.buildLabel}>Use Case *</label>
                      <textarea style={S.buildTextarea} value={draftAgent.useCase} onChange={e => handleDraftChange("useCase", e.target.value)} placeholder="Describe the use case..." />
                    </div>
                    <div style={S.buildField}>
                      <label style={S.buildLabel}>Prompt / Instructions *</label>
                      <textarea style={S.buildTextarea} value={draftAgent.prompt} onChange={e => handleDraftChange("prompt", e.target.value)} placeholder="Describe what the agent should do, how it should behave, and any specific guidelines..." />
                      <div style={S.buildHint}>{draftAgent.prompt.length}/2000</div>
                    </div>
                    <div style={S.buildField}>
                      <label style={S.buildLabel}>Model Selection *</label>
                      <select style={S.buildSelect} value={draftAgent.modelSelection} onChange={e => handleDraftChange("modelSelection", e.target.value)}>
                        <option value="">Select a model...</option>
                        {Object.keys(LLM_MODELS).map(model => <option key={model} value={model}>{model}</option>)}
                      </select>
                    </div>
                    <div style={S.buildField}>
                      <label style={S.buildLabel}>Knowledge Source</label>
                      <input style={S.buildInput} value={draftAgent.knowledgeSource} onChange={e => handleDraftChange("knowledgeSource", e.target.value)} placeholder="Select knowledge source(s)..." />
                    </div>
                    <div style={S.buildButtons}>
                      <button style={{ ...S.btnP, width: "100%" }} type="button" onClick={createAgentFromDraft} disabled={draftGenerating}>
                        {draftGenerating ? "Generating..." : "Generate Agent"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
 
      {showModal && (
        <AgentModal
          user={user}
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
 
