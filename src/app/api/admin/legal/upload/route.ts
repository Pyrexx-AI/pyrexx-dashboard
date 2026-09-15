import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB — generous for a text-based legal doc, cheap guard against pathological uploads

/**
 * Converts mammoth's DOCX→HTML output into the markdown subset that
 * DocumentSigner.tsx's `renderMarkdown()` already knows how to
 * render (h1/h2/h3 via "#"/"##"/"###", "- " list items, "**bold**",
 * "---" rules, blank-line-separated paragraphs).
 *
 * This is intentionally small and lossy (no nested lists, no
 * tables, no links) — legal documents uploaded here are
 * headings + paragraphs + occasional bold/list text, and that's
 * what the reader actually needs to render correctly.
 */
function docxHtmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "") // strip anything else mammoth emitted (spans, images, etc.)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Turns pdf-parse's raw extracted text into paragraph-separated
 * markdown, stripping the "-- N of M --" page-break markers
 * pdf-parse inserts between pages.
 */
function pdfTextToMarkdown(title: string, rawText: string): string {
  const cleaned = rawText
    .split("\n")
    .filter((line) => !/^--\s*\d+\s*of\s*\d+\s*--$/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) return "";
  return `# ${title}\n\n${cleaned}`;
}

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

    if (file && file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File too large — limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB` }, { status: 413 });
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
        /*
         * REAL EXTRACTION (previously this ran a regex over the raw
         * file bytes as if a .docx were plain XML text — but .docx
         * is a ZIP archive, so that regex could never match real
         * content and silently produced a placeholder every time.
         * mammoth actually unzips the archive and reads
         * word/document.xml properly.
         */
        try {
          const { value: html, messages } = await mammoth.convertToHtml({ buffer });
          if (messages.some((m) => m.type === "error")) {
            console.warn(`DOCX conversion warnings for "${file.name}":`, messages);
          }
          markdownContent = docxHtmlToMarkdown(html);
        } catch (docxErr) {
          console.error(`DOCX extraction failed for "${file.name}":`, docxErr);
          return NextResponse.json(
            { error: "Could not read this .docx file — it may be corrupted or password-protected. Try re-saving it and uploading again." },
            { status: 422 }
          );
        }

        if (!markdownContent.trim()) {
          return NextResponse.json(
            { error: "No readable text found in this .docx file." },
            { status: 422 }
          );
        }
      } else if (fileType === "pdf") {
        /*
         * REAL EXTRACTION (previously this never parsed the PDF at
         * all — it stored a placeholder string telling the reader
         * to "review the official PDF version," meaning nothing was
         * ever actually shown to clients signing this document).
         */
        let parser: PDFParse | null = null;
        try {
          parser = new PDFParse({ data: buffer });
          const result = await parser.getText();
          markdownContent = pdfTextToMarkdown(title, result.text);
        } catch (pdfErr) {
          console.error(`PDF extraction failed for "${file.name}":`, pdfErr);
          return NextResponse.json(
            { error: "Could not read this PDF — it may be a scanned image without a text layer, encrypted, or corrupted." },
            { status: 422 }
          );
        } finally {
          if (parser) await parser.destroy();
        }

        if (!markdownContent.trim()) {
          return NextResponse.json(
            { error: "No extractable text found in this PDF — it may be a scanned image. Try the manual markdown field instead." },
            { status: 422 }
          );
        }
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