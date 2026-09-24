import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import mammoth from "mammoth";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB limit

/**
 * Polyfill browser-native globals required by pdfjs-dist / pdf-parse v2 in
 * serverless Node.js environments where @napi-rs/canvas is not installed.
 * These stubs provide the coordinate matrix and path constructs needed for
 * text content extraction without crashing during module evaluation.
 */
function ensurePdfGlobals() {
  const g = globalThis as any;

  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      m11 = 1; m12 = 0; m13 = 0; m14 = 0;
      m21 = 0; m22 = 1; m23 = 0; m24 = 0;
      m31 = 0; m32 = 0; m33 = 1; m34 = 0;
      m41 = 0; m42 = 0; m43 = 0; m44 = 1;
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      is2D = true;
      isIdentity = true;

      inverse() { return new g.DOMMatrix(); }
      multiply() { return new g.DOMMatrix(); }
      translate() { return new g.DOMMatrix(); }
      scale() { return new g.DOMMatrix(); }
      rotate() { return new g.DOMMatrix(); }
      transformPoint(point: any) { return point || { x: 0, y: 0, z: 0, w: 1 }; }
    };
  }

  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      addPath() {}
      closePath() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
    };
  }

  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      width: number;
      height: number;
      data: Uint8ClampedArray;
      colorSpace: string = "srgb";

      constructor(wOrData: any, hOrW?: any, h?: any) {
        if (typeof wOrData === "number") {
          this.width = wOrData;
          this.height = hOrW || 0;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
          this.data = wOrData;
          this.width = hOrW;
          this.height = h || (wOrData.length / (4 * hOrW));
        }
      }
    };
  }
}

/**
 * Converts mammoth's DOCX->HTML output into the markdown subset that
 * DocumentSigner.tsx understands.
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
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Normalizes extracted PDF text into clean paragraph-separated markdown.
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
    const adminSupabase = createAdminClient();

    // Verify caller is an authenticated administrator (supports Bearer header and session cookie)
    let callerUser: any = null;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (token) {
      const { data: { user } } = await adminSupabase.auth.getUser(token);
      callerUser = user;
    }

    if (!callerUser) {
      const cookieSupabase = await createClient();
      const { data: { user } } = await cookieSupabase.auth.getUser();
      callerUser = user;
    }

    if (!callerUser) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing session." }, { status: 401 });
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data payload." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;
    const title = formData.get("title") as string;
    const version = (formData.get("version") as string) || "v1.0.0";
    const manualMarkdown = formData.get("manualMarkdown") as string | null;

    if (!documentType || !title) {
      return NextResponse.json({ error: "Missing documentType or title." }, { status: 400 });
    }

    if (file && file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large — maximum limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    let markdownContent = manualMarkdown || "";
    let fileUrl: string | null = null;
    let fileType: string | null = null;

    if (file) {
      fileType = file.name.split(".").pop()?.toLowerCase() || null;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileType === "txt" || fileType === "md") {
        markdownContent = buffer.toString("utf-8");
      } else if (fileType === "docx") {
        try {
          const { value: html, messages } = await mammoth.convertToHtml({ buffer });
          if (messages.some((m) => m.type === "error")) {
            console.warn(`DOCX conversion warning for "${file.name}":`, messages);
          }
          markdownContent = docxHtmlToMarkdown(html);
        } catch (docxErr) {
          console.error(`DOCX extraction failed for "${file.name}":`, docxErr);
          return NextResponse.json(
            { error: "Could not parse this .docx file. It may be corrupted or password-protected." },
            { status: 422 }
          );
        }

        if (!markdownContent.trim()) {
          return NextResponse.json(
            { error: "No readable text content found in this .docx file." },
            { status: 422 }
          );
        }
      } else if (fileType === "pdf") {
        // Apply globals first to ensure Node.js can safely evaluate the PDF.js legacy engine
        ensurePdfGlobals();

        let parserInstance: any = null;
        try {
          let CanvasFactory: any = undefined;
          try {
            const workerModule = await import("pdf-parse/worker");
            CanvasFactory = workerModule.CanvasFactory;
          } catch {
            // Worker is optional when globals are directly shimmed on globalThis
          }

          const { PDFParse } = await import("pdf-parse");
          const parseConfig = CanvasFactory
            ? { data: new Uint8Array(buffer), CanvasFactory }
            : { data: new Uint8Array(buffer) };

          parserInstance = new PDFParse(parseConfig);
          const result = await parserInstance.getText();
          markdownContent = pdfTextToMarkdown(title, result?.text || "");
        } catch (pdfErr: any) {
          console.error(`PDF extraction failed for "${file.name}":`, pdfErr);
          return NextResponse.json(
            {
              error:
                pdfErr?.message ||
                "Could not extract text from this PDF. It may be a scanned image without an OCR layer or encrypted.",
            },
            { status: 422 }
          );
        } finally {
          if (parserInstance && typeof parserInstance.destroy === "function") {
            try {
              await parserInstance.destroy();
            } catch {
              // Non-fatal cleanup
            }
          }
        }

        if (!markdownContent.trim()) {
          return NextResponse.json(
            {
              error:
                "No extractable text found in this PDF (it may be a rasterized image). Please use the Markdown editor below.",
            },
            { status: 422 }
          );
        }
      }

      // Upload the raw document binary to Supabase Storage if the bucket exists
      try {
        const fileName = `${documentType}-${Date.now()}.${fileType}`;
        const { data: storageData, error: storageErr } = await adminSupabase.storage
          .from("agreements-vault")
          .upload(fileName, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });

        if (!storageErr && storageData) {
          fileUrl = storageData.path;
        }
      } catch (storageEx) {
        console.warn("Storage upload notice (falling back to database record only):", storageEx);
      }
    }

    if (!markdownContent.trim()) {
      return NextResponse.json(
        { error: "No content provided. Please upload a valid document or paste Markdown clauses." },
        { status: 400 }
      );
    }

    // Upsert into legal_documents table
    const { data: updatedDoc, error: dbError } = await adminSupabase
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
    return NextResponse.json(
      { error: err?.message || "Internal server error occurred while processing document." },
      { status: 500 }
    );
  }
}