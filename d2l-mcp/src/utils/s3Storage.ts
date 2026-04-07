/**
 * Shared S3 helpers for browser storage state persistence.
 * Used by BrowserSessionManager (VNC flow) and sessionRefresher (headless auto-refresh).
 *
 * In local mode (no S3_BUCKET configured), falls back to local filesystem at SESSIONS_PATH.
 */

import path from "path";
import os from "os";
import fs from "fs/promises";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || "us-east-1";

// Local filesystem fallback path — always use homedir (/root), which is the mounted volume
const LOCAL_STATE_DIR = os.homedir();

function localStatePath(userId: string): string {
  return path.join(LOCAL_STATE_DIR, `browser-state-${userId}.json`);
}

/** Download browser storage state from S3 (or local filesystem in local mode). Returns path or undefined. */
export async function loadStorageStateFromS3(userId: string): Promise<string | undefined> {
  if (!S3_BUCKET) {
    // Local mode fallback
    const localPath = localStatePath(userId);
    try {
      await fs.access(localPath);
      console.error(`[LOCAL] Loaded browser storage state for user ${userId}`);
      return localPath;
    } catch {
      console.error(`[LOCAL] No saved browser state for user ${userId}`);
      return undefined;
    }
  }

  const s3 = new S3Client({ region: S3_REGION });
  const key = `browser-state/${userId}/storage-state.json`;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const body = await res.Body?.transformToString();
    if (!body) return undefined;
    const tmpPath = path.join(os.tmpdir(), `browser-state-${userId}.json`);
    await fs.writeFile(tmpPath, body);
    console.error(`[S3] Loaded browser storage state for user ${userId}`);
    return tmpPath;
  } catch (e: any) {
    if (e?.name === "NoSuchKey") {
      console.error(`[S3] No saved browser state for user ${userId}`);
    } else {
      console.error(`[S3] Failed to load browser state: ${e?.message}`);
    }
    return undefined;
  }
}

/** Upload full browser storage state to S3 (or local filesystem in local mode). */
export async function saveStorageStateToS3(userId: string, statePath: string): Promise<void> {
  if (!S3_BUCKET) {
    // Local mode fallback
    const localPath = localStatePath(userId);
    try {
      const body = await fs.readFile(statePath, "utf-8");
      await fs.writeFile(localPath, body);
      console.error(`[LOCAL] Saved browser storage state for user ${userId}`);
    } catch (e: any) {
      console.error(`[LOCAL] Failed to save browser state: ${e?.message}`);
    }
    return;
  }

  const s3 = new S3Client({ region: S3_REGION });
  const key = `browser-state/${userId}/storage-state.json`;
  try {
    const body = await fs.readFile(statePath, "utf-8");
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/json",
    }));
    console.error(`[S3] Saved browser storage state for user ${userId}`);
  } catch (e: any) {
    console.error(`[S3] Failed to save browser state: ${e?.message}`);
  }
}
