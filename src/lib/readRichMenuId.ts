import * as fs from "fs";
import * as path from "path";

export function readRichMenuBId(key: string) {
  const filePath = path.join(__dirname, "../../richMenuIds.json");
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(data);
    return String(json[key]);
  } catch (err) {
    console.error("Failed to read richMenuIds.json:", err);
    return "";
  }
}
