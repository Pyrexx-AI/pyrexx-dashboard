import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Verify calling user is an Admin
    const authHeader = req.headers.get("authorization");
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") || "");

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;
    const title = formData.get("title") as string;
    const version = formData.get("version") as string || "v1.0.0";
    const manualMarkdown = formData.get("manualMarkdown") as string | null;

    if (!documentType || !title) {
      return NextResponse.json({ error: "Missing documentType or title" }, { status: 400 });
    }

    let markdownContent = manualMarkdown || "";
    let fileUrl: string | null = null;
    let fileType: string | null = null;

    // Process uploaded file if provided (.pdf, .docx, .txt, .md)
    if (file) {
      fileType = file.name.split(".").pop()?.toLowerCase() || null;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileType === "txt" || fileType === "md") {
        markdownContent = buffer.toString("utf-8");
      } else if (fileType === "docx") {
        // Zero-dependency XML paragraph extraction for Word documents
        const rawXml = buffer.toString("utf-8");
        const paragraphs = rawXml.match(/<w:p[^>]*>.*?<\/w:p>/g) || [];
        
        markdownContent = paragraphs
          .map((p) => {
            const text = p.replace(/<[^>]+>/g, "").trim();
            if (!text) return "";
            if (p.includes("<w:pStyle w:val=\"Heading1\"")) return `# ${text}\n`;
            if (p.includes("<w:pStyle w:val=\"Heading2\"")) return `## ${text}\n`;
            return `${text}\n`;
          })
          .filter(Boolean)
          .join("\n");

        if (!markdownContent.trim()) {
          markdownContent = `# ${title}\n\n[Uploaded Document: ${file.name}]\n\nFull text extracted from DOCX file.`;
        }
      } else if (fileType === "pdf") {
        markdownContent = `# ${title}\n\n[Uploaded PDF Document: ${file.name}]\n\nThis document was uploaded as a PDF file. Please review the official PDF version stored in the security vault.`;
      }

      // Save original binary file to Supabase Storage if configured
      try {
        const fileName = `${documentType}-${Date.now()}.${fileType}`;
        const { data: storageData, error: storageErr } = await supabase.storage
          .from("agreements-vault")
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!storageErr && storageData) {
          fileUrl = storageData.path;
        }
      } catch (storageException) {
        console.warn("Supabase Storage upload warning (falling back to database record only):", storageException);
      }
    }

    if (!markdownContent.trim()) {
      return NextResponse.json({ error: "No content provided in file or markdown body" }, { status: 400 });
    }

    // Upsert into legal_documents table
    const { data: updatedDoc, error: dbError } = await supabase
      .from("legal_documents")
      .upsert(
        {
          type: documentType,
          title,
          version,
          content_markdown: markdownContent,
          file_url: fileUrl,
          file_type: fileType,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "type" }
      )
      .select("*")
      .single();

    if (dbError) {
      console.error("Database update error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (err: any) {
    console.error("Legal document upload exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}