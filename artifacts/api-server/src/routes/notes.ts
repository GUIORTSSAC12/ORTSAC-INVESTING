import { Router } from "express";
import { db, notesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/notes/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const rows = await db.select().from(notesTable).where(eq(notesTable.key, key));
    res.json({ content: rows[0]?.content ?? "" });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

router.put("/notes/:key", async (req, res) => {
  try {
    const { key } = req.params as { key: string };
    const { content } = req.body as { content: string };
    await db
      .insert(notesTable)
      .values({ key, content: content ?? "" })
      .onConflictDoUpdate({ target: notesTable.key, set: { content: content ?? "" } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

export default router;
