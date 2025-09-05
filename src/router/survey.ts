import cors from "cors";
import express, { Router } from "express";
import { corsOptions } from "../constants/corsOptions";
import { SURVEY_PATHS } from "../constants/courseInfo";
import { completeSurvey } from "../lib/firebase_admin";
import bucket, { isoForFilename, readJson } from "../lib/firebase_bucket";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/list", (req, res) => {
  const data = Object.keys(SURVEY_PATHS).map((key) => ({
    title: SURVEY_PATHS[key].title,
    surveyName: key,
  }));
  res.json(data);
});

router.get("/:name", cors(corsOptions), async (req, res) => {
  const name = req.params.name;
  const path = SURVEY_PATHS[name];
  console.log(`[GET survey]name: ${name}, path: ${path.file}`);
  if (!path) return res.status(404).json({ error: "Unknown survey" });

  try {
    const json = await readJson(path.file);
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Cache-Control", "public, max-age=60"); // small dev cache
    res.json(json);
  } catch (err) {
    console.error("Survey fetch failed:", err);
    res.status(500).json({ error: "Failed to load survey JSON" });
  }
});

router.post("/:name", cors(corsOptions), express.json(), async (req, res) => {
  try {
    const surveyName = req.params.name; // "profile" | "formal_scale_sections"
    const { userId, data, submittedAt } = req.body || {};

    console.log(`[POST survey]name: ${surveyName}, userId: ${userId}`);

    if (!userId || !data) {
      return res.status(400).json({ error: "Missing userId or data" });
    }

    const path = SURVEY_PATHS[surveyName];

    if (!path) {
      return res
        .status(400)
        .json({ error: `Unknown surveyName: ${surveyName}` });
    }

    const filename = `${isoForFilename(new Date())}.json`;
    const objectPath = `${path.baseFolder}/${encodeURIComponent(
      userId
    )}/${filename}`;

    const payload = {
      surveyName,
      userId,
      submittedAt: submittedAt || new Date().toISOString(),
      data, // the full JSON structure with answers
    };

    const token = uuidv4();
    await bucket.file(objectPath).save(JSON.stringify(payload, null, 2), {
      contentType: "application/json; charset=utf-8",
      resumable: false,
      // Add both HTTP and custom metadata
      metadata: {
        cacheControl: "public, max-age=60",
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    // (optional) return a ready-to-use download URL to the client:
    const encodedPath = encodeURIComponent(objectPath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    await completeSurvey({
      userId: payload.userId,
      entry: {
        name: payload.surveyName,
        path: objectPath,
        downloadUrl,
        submittedAt: payload.submittedAt,
      },
    });

    res.json({ ok: true, path: objectPath });
  } catch (err) {
    console.error("Save survey failed:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

export default router;
