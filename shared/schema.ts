import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ===== TABLE DEFINITIONS =====

// User storage table with role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role", { length: 20 }).notNull().default("support_assistant"), // 'admin' or 'support_assistant'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Statuses table (for dynamic lead statuses)
export const statuses = pgTable("statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  color: varchar("color", { length: 50 }).notNull().default("gray"), // Color for badge display
  isDefault: boolean("is_default").notNull().default(false), // Default statuses can't be deleted
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStatusSchema = createInsertSchema(statuses).omit({
  id: true,
  createdAt: true,
});

export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type Status = typeof statuses.$inferSelect;

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email"),
  phone: varchar("phone").notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  timeSpentOnWorkshop: varchar("time_spent_on_workshop", { length: 255 }),
  location: varchar("location", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("Not Picked"), // Default status for new leads
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Recordings table (for voice memos)
export const recordings = pgTable("recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  recordedById: varchar("recorded_by_id").notNull().references(() => users.id),
  audioUrl: varchar("audio_url").notNull(), // Object storage path
  duration: varchar("duration"), // Duration in seconds or formatted string
  transcript: text("transcript"), // Optional summary/transcript
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

// Comments table (for lead interaction notes)
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Schedules table (for callback scheduling)
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  notes: text("notes"),
  completed: timestamp("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
  completed: true,
});

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

// Notifications table (for real-time alerts)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // 'new_lead', 'lead_assigned', 'lead_reassigned'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: 'cascade' }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ===== RELATIONS =====

export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  assignedLeads: many(leads),
  recordings: many(recordings),
  comments: many(comments),
  schedules: many(schedules),
  notifications: many(notifications),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [campaigns.createdById],
    references: [users.id],
  }),
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  assignedTo: one(users, {
    fields: [leads.assignedToId],
    references: [users.id],
  }),
  recordings: many(recordings),
  comments: many(comments),
  schedules: many(schedules),
  notifications: many(notifications),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  lead: one(leads, {
    fields: [recordings.leadId],
    references: [leads.id],
  }),
  recordedBy: one(users, {
    fields: [recordings.recordedById],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  lead: one(leads, {
    fields: [comments.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  lead: one(leads, {
    fields: [schedules.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [notifications.leadId],
    references: [leads.id],
  }),
}));
