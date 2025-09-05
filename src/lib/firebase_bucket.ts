import { Storage } from "@google-cloud/storage";
import path from "path";

// const serviceAccount = require("../../test-project-001-5703b-firebase-adminsdk-fbsvc-12982fd266.json");

// // Initialize GCS using service account creds.
// // Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
// const storage = new Storage();
// const bucket = storage.bucket("test-project-001-5703b.firebasestorage.app");
// export default bucket;

// ABSOLUTE path to your JSON key
const keyFile = path.resolve(
  process.cwd(),
  "yoshunengloshproject-firebase-adminsdk-fbsvc-3a90b0a74d.json"
);

// IMPORTANT: bucket name = without "gs://"
const BUCKET = "yoshunengloshproject.firebasestorage.app";

const storage = new Storage({ keyFilename: keyFile });
const bucket = storage.bucket(BUCKET);

export default bucket;

export async function readJson(path: string) {
  const [buf] = await bucket.file(path).download();
  return JSON.parse(buf.toString("utf8"));
}

export function isoForFilename(d = new Date()): string {
  // @ts-expect-error
  return d.toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

export async function getDownloadUrl(
  path: string,
  expiresInMilliSeconds: number = 24 * 60 * 60 * 1000
) {
  const [signedUrl] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMilliSeconds,
  });
  return signedUrl;
}
