import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";

/**
 * Returns absolute path to data/sprint-reviews/ directory
 * @returns {string}
 */
export function getNotesDir() {
  return fileURLToPath(new URL("../../../data/sprint-reviews", import.meta.url));
}

/**
 * Saves a sprint review note as a markdown file
 * @param {string} date - YYYY-MM-DD format
 * @param {string} content - markdown content
 * @returns {Promise<string>} absolute path of written file
 */
export async function saveNote(date, content) {
  const filePath = join(getNotesDir(), date + ".md");
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

/**
 * Loads the most recent N note files, newest first
 * @param {number} [n=3]
 * @returns {Promise<Array<{ date: string, content: string, filename: string }>>}
 */
export async function loadPriorNotes(n = 3) {
  try {
    const files = await readdir(getNotesDir());
    const mdFiles = files.filter(f => f.endsWith(".md")).sort().reverse();
    const selected = mdFiles.slice(0, n);
    return Promise.all(
      selected.map(async filename => {
        const content = await readFile(join(getNotesDir(), filename), "utf-8");
        const date = filename.replace(".md", "");
        return { date, content, filename };
      })
    );
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
