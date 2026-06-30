/**
 * Legal Document Content Registry
 * ───────────────────────────────────────────────────────────────
 * ⚠️  PLACEHOLDER CONTENT — DO NOT SHIP TO PRODUCTION AS-IS  ⚠️
 *
 * The actual MSA, SOW, BAA, DPA, Privacy Policy, and Terms of
 * Service text for PyrexxAI was referenced in prior work (legal
 * infrastructure drafted with HIPAA compliance, tiered liability
 * caps, Delaware governing law, AAA arbitration) but the actual
 * document TEXT was never supplied in this conversation. Claude
 * will not fabricate binding legal language — doing so risks
 * shipping unenforceable or actively harmful terms.
 *
 * REPLACE the `content` field of each entry below with your real,
 * lawyer-reviewed document text (markdown is fine — it renders via
 * a simple markdown-to-HTML pass in DocumentSigner.tsx).
 *
 * `version` should change any time the underlying text changes —
 * it's stored alongside each signature in `signed_agreements`, so
 * you always know exactly which version of a document a given
 * clinic agreed to. A simple convention: date-stamp it
 * ("2026-06-20") or hash the content (`crypto.createHash('sha256')`).
 *
 * ⚠️  HIPAA / BAA SPECIFIC WARNING  ⚠️
 * This onboarding flow's signing mechanism (scroll-to-bottom +
 * typed legal name + IP + timestamp) is a lightweight "clickwrap"
 * pattern. It is almost certainly sufficient for the MSA, SOW, DPA,
 * Privacy Policy, and Terms of Service. For the BAA specifically —
 * given its central role in HIPAA compliance and potential liability
 * exposure if a clinic later disputes having agreed to it — strongly
 * consider routing that one document through a dedicated e-signature
 * provider (DocuSign, HelloSign/Dropbox Sign, PandaDoc) instead, which
 * provide audit-trail and legal-enforceability guarantees this
 * lightweight mechanism does not. This is flagged, not decided, here —
 * loop in whoever handles compliance before launch.
 */

export interface LegalDocument {
  type: "msa" | "sow" | "baa" | "dpa" | "privacy_policy" | "terms_of_service";
  title: string;
  version: string;
  /** Markdown content. REPLACE with real text — see warning above. */
  content: string;
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    type: "msa",
    title: "Master Service Agreement",
    version: "PLACEHOLDER-v0",
    content: `# Master Service Agreement\n\n**⚠️ PLACEHOLDER — replace with the real, lawyer-reviewed MSA text before launch.**\n\nThis document should cover the overall terms governing the relationship between PyrexxAI and the clinic, including scope of services, payment terms, term and termination, and liability provisions.`,
  },
  {
    type: "sow",
    title: "Statement of Work",
    version: "PLACEHOLDER-v0",
    content: `# Statement of Work\n\n**⚠️ PLACEHOLDER — replace with the real SOW text before launch.**\n\nThis document should describe the specific AI Receptionist Agent deliverables, setup timeline, and the selected plan tier's scope.`,
  },
  {
    type: "baa",
    title: "Business Associate Agreement",
    version: "PLACEHOLDER-v0",
    content: `# Business Associate Agreement (HIPAA)\n\n**⚠️ PLACEHOLDER — replace with the real BAA text before launch.**\n\n**⚠️ See the HIPAA/BAA warning in src/lib/legal-docs/index.ts — consider a dedicated e-signature provider for this specific document.**\n\nThis document should establish PyrexxAI's obligations as a Business Associate handling Protected Health Information (PHI) on the clinic's behalf.`,
  },
  {
    type: "dpa",
    title: "Data Processing Agreement",
    version: "PLACEHOLDER-v0",
    content: `# Data Processing Agreement\n\n**⚠️ PLACEHOLDER — replace with the real DPA text before launch.**\n\nThis document should cover data handling, processing, storage location, and subprocessor disclosures.`,
  },
  {
    type: "privacy_policy",
    title: "Privacy Policy",
    version: "PLACEHOLDER-v0",
    content: `# Privacy Policy\n\n**⚠️ PLACEHOLDER — replace with the real Privacy Policy text before launch.**`,
  },
  {
    type: "terms_of_service",
    title: "Terms of Service",
    version: "PLACEHOLDER-v0",
    content: `# Terms of Service\n\n**⚠️ PLACEHOLDER — replace with the real Terms of Service text before launch.**`,
  },
];