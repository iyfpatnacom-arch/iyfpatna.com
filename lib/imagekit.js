/**
 * Server-side ImageKit uploads.
 *
 * Plain `fetch` against the REST API rather than the SDK: this site makes two
 * calls (upload, delete), and a dependency for two requests is a dependency
 * to keep patched for no gain.
 *
 * The private key authenticates as the whole ImageKit account, so this module
 * must only ever run on the server. It is read at call time, not at import, so
 * a key added to .env.production takes effect on the next pm2 restart without
 * a rebuild — and a site with no key still builds and renders.
 *
 * Docs: https://imagekit.io/docs/api-reference/upload-file/upload-file.md
 */

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const FILES_URL = "https://api.imagekit.io/v1/files";

export const imagekitConfigured = () => Boolean(process.env.IMAGEKIT_PRIVATE_KEY);

/** Basic auth: the private key is the username, the password is empty. */
function authHeader() {
  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) throw new Error("IMAGEKIT_PRIVATE_KEY is not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/**
 * Uploads a File/Blob and returns `{ url, fileId, filePath, width, height }`.
 *
 * `useUniqueFileName` stays on: a re-upload for the same day gets a new URL,
 * so no CDN or browser cache can keep serving yesterday's picture under
 * today's address.
 */
export async function uploadToImagekit(file, { fileName, folder, tags = [] }) {
  const body = new FormData();
  body.append("file", file, fileName);
  body.append("fileName", fileName);
  body.append("folder", folder);
  body.append("useUniqueFileName", "true");
  if (tags.length) body.append("tags", tags.join(","));

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: authHeader() },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`ImageKit upload failed (${res.status}): ${data.message || "no message"}`);
  }

  return {
    url: data.url,
    fileId: data.fileId,
    filePath: data.filePath,
    width: data.width || 0,
    height: data.height || 0,
  };
}

/**
 * Deletes a file by id. Best effort: callers use it to tidy up a replaced
 * upload, and a leftover file in the media library is not worth failing a
 * save over — so it logs and returns false rather than throwing.
 */
export async function deleteFromImagekit(fileId) {
  if (!fileId) return false;
  try {
    const res = await fetch(`${FILES_URL}/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: authHeader() },
    });
    return res.ok;
  } catch (err) {
    console.error("[imagekit] delete failed", fileId, err);
    return false;
  }
}
