import { Router } from "express";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { companyTools } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { logActivity } from "../services/index.js";

const createToolSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  url: z.string().min(1).max(500),
  icon: z.string().max(50).optional().default("wrench"),
  status: z.enum(["active", "disabled"]).optional().default("active"),
  sortOrder: z.number().int().min(0).optional().default(0),
  docsFilePath: z.string().max(500).optional().nullable(),
});

const updateToolSchema = createToolSchema.partial();

export function toolRoutes(db: Db) {
  const router = Router();

  // GET /api/companies/:companyId/tools
  router.get("/companies/:companyId/tools", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const tools = await db
      .select()
      .from(companyTools)
      .where(eq(companyTools.companyId, companyId))
      .orderBy(asc(companyTools.sortOrder), asc(companyTools.createdAt));
    res.json(tools);
  });

  // POST /api/companies/:companyId/tools
  router.post("/companies/:companyId/tools", validate(createToolSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    const [tool] = await db
      .insert(companyTools)
      .values({
        companyId,
        ...req.body,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        createdByAgentId: actor.agentId ?? null,
      })
      .returning();

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "tool.created",
      entityType: "tool",
      entityId: tool.id,
      details: { name: tool.name, url: tool.url },
    });

    res.status(201).json(tool);
  });

  // PATCH /api/companies/:companyId/tools/:id
  router.patch("/companies/:companyId/tools/:id", validate(updateToolSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const [tool] = await db
      .update(companyTools)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(companyTools.id, id), eq(companyTools.companyId, companyId)))
      .returning();
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "tool.updated",
      entityType: "tool",
      entityId: tool.id,
      details: { name: tool.name },
    });

    res.json(tool);
  });

  // DELETE /api/companies/:companyId/tools/:id
  router.delete("/companies/:companyId/tools/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const [tool] = await db
      .delete(companyTools)
      .where(and(eq(companyTools.id, id), eq(companyTools.companyId, companyId)))
      .returning();
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "tool.deleted",
      entityType: "tool",
      entityId: tool.id,
      details: { name: tool.name },
    });

    res.json({ deleted: true });
  });

  return router;
}
