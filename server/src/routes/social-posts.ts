import { Router } from "express";
import { z } from "zod";
import { eq, and, asc, desc } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { socialPosts } from "@paperclipai/db";
import { validate } from "../middleware/validate.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { logActivity } from "../services/index.js";

const createPostSchema = z.object({
  text: z.string().min(1).max(5000),
  status: z.enum(["draft", "review", "scheduled", "published"]).optional().default("draft"),
  platforms: z.array(z.string()).optional().default([]),
  scheduledFor: z.string().datetime().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
});

const updatePostSchema = createPostSchema.partial();

export function socialPostRoutes(db: Db) {
  const router = Router();

  // GET /api/companies/:companyId/social-posts
  router.get("/companies/:companyId/social-posts", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const statusFilter = req.query.status as string | undefined;
    let query = db
      .select()
      .from(socialPosts)
      .where(
        statusFilter
          ? and(eq(socialPosts.companyId, companyId), eq(socialPosts.status, statusFilter))
          : eq(socialPosts.companyId, companyId),
      )
      .orderBy(desc(socialPosts.createdAt));
    const posts = await query;
    res.json(posts);
  });

  // GET /api/companies/:companyId/social-posts/:id
  router.get("/companies/:companyId/social-posts/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(and(eq(socialPosts.id, id), eq(socialPosts.companyId, companyId)));
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(post);
  });

  // POST /api/companies/:companyId/social-posts
  router.post("/companies/:companyId/social-posts", validate(createPostSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    const { scheduledFor, publishedAt, ...rest } = req.body;
    const [post] = await db
      .insert(socialPosts)
      .values({
        companyId,
        ...rest,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
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
      action: "social_post.created",
      entityType: "social_post",
      entityId: post.id,
      details: { status: post.status, platforms: post.platforms },
    });

    res.status(201).json(post);
  });

  // PATCH /api/companies/:companyId/social-posts/:id
  router.patch("/companies/:companyId/social-posts/:id", validate(updatePostSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const { scheduledFor, publishedAt, ...rest } = req.body;
    const setValues: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (scheduledFor !== undefined) setValues.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    if (publishedAt !== undefined) setValues.publishedAt = publishedAt ? new Date(publishedAt) : null;
    const [post] = await db
      .update(socialPosts)
      .set(setValues)
      .where(and(eq(socialPosts.id, id), eq(socialPosts.companyId, companyId)))
      .returning();
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "social_post.updated",
      entityType: "social_post",
      entityId: post.id,
      details: { status: post.status },
    });

    res.json(post);
  });

  // DELETE /api/companies/:companyId/social-posts/:id
  router.delete("/companies/:companyId/social-posts/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const [post] = await db
      .delete(socialPosts)
      .where(and(eq(socialPosts.id, id), eq(socialPosts.companyId, companyId)))
      .returning();
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      action: "social_post.deleted",
      entityType: "social_post",
      entityId: post.id,
      details: { text: post.text.slice(0, 100) },
    });

    res.json({ deleted: true });
  });

  return router;
}
