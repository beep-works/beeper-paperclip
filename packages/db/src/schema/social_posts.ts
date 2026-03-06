import { pgTable, uuid, text, timestamp, json, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    text: text("text").notNull(),
    status: text("status").notNull().default("draft"),
    platforms: json("platforms").$type<string[]>().notNull().default([]),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id"),
    createdByAgentId: uuid("created_by_agent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_posts_company_id_idx").on(table.companyId),
    index("social_posts_status_idx").on(table.companyId, table.status),
  ],
);
