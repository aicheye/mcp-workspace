/**
 * Local notes watcher — polls LOCAL_NOTES_DIR for new PDF/DOCX files and
 * ingests them into the database with embeddings.
 *
 * Directory convention:
 *   <LOCAL_NOTES_DIR>/<file>.pdf          → courseId = "default"
 *   <LOCAL_NOTES_DIR>/<CourseId>/<file>.pdf → courseId = "<CourseId>"
 *
 * Processed files are moved to <their_dir>/processed/ to avoid re-ingestion.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { supabase } from "./utils/supabase.js";
import { ingestPdfBuffer, embedNoteSections } from "./study/src/notes.js";

const POLL_INTERVAL_MS = 5_000;

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value.replace(/<[^>]+>/g, " ").trim();
  }
}

async function processFile(
  filePath: string,
  userId: string,
  notesDir: string
): Promise<void> {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();
  const title = path.basename(filename, ext);

  // Subdirectory name becomes the courseId
  const rel = path.relative(notesDir, path.dirname(filePath));
  const courseId = rel && rel !== "." ? rel : "default";

  console.error(`[LOCAL_NOTES] Ingesting: ${filename} → course "${courseId}"`);

  const buffer = await fs.readFile(filePath);

  const { data: note, error: insertErr } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      s3_key: `local/${courseId}/${filename}`,
      title,
      course_id: courseId,
      status: "processing",
    })
    .select("id")
    .single();

  if (insertErr || !note?.id) {
    throw new Error(`DB insert failed: ${insertErr?.message ?? "no id returned"}`);
  }

  if (ext === ".pdf") {
    await ingestPdfBuffer(userId, buffer, {
      courseId,
      title,
      noteId: note.id,
      url: filePath,
    });
  } else {
    // DOCX — extract text then hand off to the same embedding path
    const text = await extractDocxText(buffer);
    if (!text.trim()) throw new Error("No text extracted from DOCX");
    // Re-use the PDF ingest path by encoding extracted text as a minimal PDF-like buffer
    // isn't possible cleanly, so we do the chunking inline here.
    const { chunkText, embedChunks } = await import("./rag/embeddings.js");
    const { upsertChunks } = await import("./rag/vectorStore.js");

    const chunks = chunkText(text, 2500, 250);
    const previewLen = 200;
    const rows = chunks.map((chunk, idx) => ({
      user_id: userId,
      note_id: note.id,
      course_id: courseId,
      title: `${title} — Chunk ${idx + 1}`,
      anchor: `${note.id}-chunk-${idx + 1}`,
      url: filePath,
      preview: chunk.slice(0, previewLen),
      content: chunk,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("note_sections").insert(rows.slice(i, i + 500));
      if (error) throw new Error(`note_sections insert failed: ${error.message}`);
    }

    try {
      const embeddings = await embedChunks(chunks);
      await upsertChunks(userId, note.id, courseId, chunks, embeddings, { title, source: filePath });
    } catch (e) {
      console.error("[LOCAL_NOTES] RAG embed failed (non-fatal):", e instanceof Error ? e.message : e);
    }
  }

  await embedNoteSections(userId, note.id);

  await supabase
    .from("notes")
    .update({ status: "ready" })
    .eq("id", note.id)
    .eq("user_id", userId);

  // Move to processed/ so it won't be picked up again
  const processedDir = path.join(path.dirname(filePath), "processed");
  await fs.mkdir(processedDir, { recursive: true });
  await fs.rename(filePath, path.join(processedDir, filename));

  console.error(`[LOCAL_NOTES] Done: ${filename} (noteId: ${note.id})`);
}

async function scanDir(dir: string, userId: string, notesDir: string): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return; // Directory doesn't exist yet
  }

  for (const entry of entries) {
    if (entry.name === "processed") continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await scanDir(fullPath, userId, notesDir);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") continue;

    try {
      await processFile(fullPath, userId, notesDir);
    } catch (e) {
      console.error(
        `[LOCAL_NOTES] Failed to process ${entry.name}:`,
        e instanceof Error ? e.message : e
      );
    }
  }
}

export function startLocalNotesWatcher(userId: string): void {
  const notesDir = process.env.LOCAL_NOTES_DIR;
  if (!notesDir) return;

  console.error(`[LOCAL_NOTES] Watching ${notesDir} every ${POLL_INTERVAL_MS / 1000}s`);
  console.error(`[LOCAL_NOTES] Drop PDF/DOCX files here to ingest them.`);
  console.error(`[LOCAL_NOTES] Use subdirectories as course IDs, e.g.: ${notesDir}/CS451/lecture1.pdf`);

  setInterval(() => {
    scanDir(notesDir, userId, notesDir).catch((e) => {
      console.error("[LOCAL_NOTES] Scan error:", e instanceof Error ? e.message : e);
    });
  }, POLL_INTERVAL_MS);
}
