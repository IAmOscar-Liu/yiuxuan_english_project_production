import cors from "cors";
import express, { Router } from "express";
import { corsOptions } from "../constants/corsOptions";
import { VIDEO_PATHS } from "../constants/courseInfo";
import { getDownloadUrl, readJson } from "../lib/firebase_bucket";
import { completeVideoCourse } from "../lib/firebase_admin";

const router = Router();

router.get("/list", (req, res) => {
  const data = Object.keys(VIDEO_PATHS).map((key) => ({
    title: VIDEO_PATHS[key].title,
    name: key,
  }));
  res.json(data);
});

router.get("/:name", cors(corsOptions), async (req, res) => {
  const name = req.params.name;
  const path = VIDEO_PATHS[name];
  console.log(`[GET video]name: ${name}, path: ${path.videoPath}`);
  if (!path) return res.status(404).json({ error: "Unknown Video" });

  try {
    const [json, downloadUrl] = await Promise.all([
      readJson(path.jsonPath),
      getDownloadUrl(path.videoPath),
    ]);

    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Cache-Control", "public, max-age=60"); // small dev cache
    res.json({
      ...json,
      videoUrl: downloadUrl,
    });
  } catch (err) {
    console.error("Video fetch failed:", err);
    res.status(500).json({ error: "Failed to load video JSON" });
  }
});

router.post("/:name", cors(corsOptions), express.json(), async (req, res) => {
  try {
    const name = req.params.name; // "profile" | "formal_scale_sections"
    const { userId, submittedAt } = req.body || {};

    console.log(
      `[POST video]name: ${name}, userId: ${userId}, submittedAt: ${submittedAt}`
    );

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const path = VIDEO_PATHS[name];

    if (!path) {
      return res.status(400).json({ error: `Unknown name: ${name}` });
    }

    await completeVideoCourse({
      userId,
      entry: {
        name,
        submittedAt,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Save Video failed:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

export default router;
