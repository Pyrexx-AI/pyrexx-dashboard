import { createClient } from "@/lib/supabase/client";

export interface LegalDocument {
  type: "msa" | "sow" | "baa" | "dpa" | "privacy_policy" | "terms_of_service";
  title: string;
  version: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
}

export const FALLBACK_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    type: "msa",
    title: "Master Service Agreement",
    version: "v1.0.0",
    content: `# Master Service Agreement\n\nThis Master Service Agreement ("Agreement") is entered into by and between PyrexxAI and the subscribing healthcare clinic ("Client").\n\n## 1. Scope of Services\nPyrexxAI provisions custom-trained AI Voice Receptionist agents and associated scheduling tools to manage inbound patient calls.\n\n## 2. Term & Termination\nServices continue on a monthly subscription basis until canceled by Client in accordance with account management terms.`,
  },
  {
    type: "sow",
    title: "Statement of Work",
    version: "v1.0.0",
    content: `# Statement of Work\n\nThis Statement of Work ("SOW") defines the technical setup and deployment scope for the PyrexxAI Voice Receptionist.\n\n## 1. Deployment Timeline\nPyrexxAI shall configure, test, and connect the AI receptionist within 14 business days of credential submission.\n\n## 2. EMR Calendar Integration\nPyrexxAI will integrate with the specified EMR scheduling provider.`,
  },
  {
    type: "baa",
    title: "Business Associate Agreement",
    version: "v1.0.0",
    content: `# Business Associate Agreement (HIPAA Compliance)\n\nThis Business Associate Agreement ("BAA") satisfies the requirements of HIPAA, HITECH, and Omnibus Rule regulations.\n\n## 1. Protection of PHI\nPyrexxAI warrants that all Protected Health Information ("PHI") is encrypted at rest and in transit using TLS 1.3 and AES-256 encryption standards.\n\n## 2. Zero AI Model Training\nClient PHI is never utilized to train public foundation models.`,
  },
  {
    type: "dpa",
    title: "Data Processing Agreement",
    version: "v1.0.0",
    content: `# Data Processing Agreement\n\nThis Data Processing Agreement ("DPA") governs the secure collection, transfer, and processing of user data.\n\n## 1. Subprocessors\nPyrexxAI engages Retell AI (voice pipeline), Dodo Payments (billing), and Supabase (database storage) as subprocessors under strict data privacy agreements.`,
  },
  {
    type: "privacy_policy",
    title: "Privacy Policy",
    version: "v1.0.0",
    content: `# Privacy Policy\n\nPyrexxAI respects client and patient privacy. We do not sell, rent, or monetize personal or health information to any third party under any circumstances.`,
  },
  {
    type: "terms_of_service",
    title: "Terms of Service",
    version: "v1.0.0",
    content: `# Terms of Service\n\nBy subscribing to PyrexxAI, Client agrees to comply with all acceptable use policies, telemarketing regulations, and call disclosure requirements in their operating jurisdiction.`,
  },
];

/**
 * Dynamically fetches active legal documents from Supabase `legal_documents` table.
 * Falls back to local static definitions if database table is unpopulated or offline.
 */
export async function getLegalDocuments(): Promise<LegalDocument[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("legal_documents")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_LEGAL_DOCUMENTS;
    }

    return data.map((doc) => ({
      type: doc.type as LegalDocument["type"],
      title: doc.title,
      version: doc.version,
      content: doc.content_markdown,
      fileUrl: doc.file_url,
      fileType: doc.file_type,
    }));
  } catch (err) {
    console.warn("Could not fetch dynamic legal documents from Supabase — using static fallbacks.", err);
    return FALLBACK_LEGAL_DOCUMENTS;
  }
}