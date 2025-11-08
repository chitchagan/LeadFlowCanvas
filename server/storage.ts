import {
  users,
  campaigns,
  leads,
  recordings,
  comments,
  schedules,
  notifications,
  statuses,
  type User,
  type UpsertUser,
  type Campaign,
  type InsertCampaign,
  type Lead,
  type InsertLead,
  type Recording,
  type InsertRecording,
  type Comment,
  type InsertComment,
  type Schedule,
  type InsertSchedule,
  type Notification,
  type InsertNotification,
  type Status,
  type InsertStatus,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, sql, desc, or, like, gte, lte, inArray } from "drizzle-orm";
import type { WebSocketService } from "./websocket";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  hasAdmin(): Promise<boolean>;
  
  // Campaign operations
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaigns(): Promise<Campaign[]>;
  getCampaignById(id: string): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;
  
  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  createLeadsBulk(leads: InsertLead[]): Promise<Lead[]>;
  getLeads(): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | undefined>;
  getLeadsByCampaign(campaignId: string): Promise<Lead[]>;
  getUnassignedLeads(): Promise<Lead[]>;
  getLeadsByAssignedTo(userId: string): Promise<Lead[]>;
  assignLead(leadId: string, userId: string): Promise<Lead>;
  updateLead(leadId: string, data: Partial<InsertLead>): Promise<Lead>;
  updateLeadStatus(leadId: string, status: string): Promise<Lead>;
  deleteLead(leadId: string): Promise<void>;
  searchLeads(filters: {
    text?: string;
    status?: string;
    campaignId?: string;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Lead[]>;
  
  // Recording operations
  createRecording(recording: InsertRecording): Promise<Recording>;
  getRecordingsByLead(leadId: string): Promise<Recording[]>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByLead(leadId: string): Promise<(Comment & { user: User })[]>;
  getCommentCounts(leadIds: string[]): Promise<Map<string, number>>;
  
  // Schedule operations
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  getSchedulesByUser(userId: string): Promise<(Schedule & { lead: Lead & { campaign: Campaign } })[]>;
  getUpcomingSchedules(userId: string): Promise<(Schedule & { lead: Lead & { campaign: Campaign } })[]>;
  markScheduleCompleted(scheduleId: string): Promise<Schedule>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<(Notification & { lead?: Lead })[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Stats and analytics
  getAdminStats(dateFrom?: string, dateTo?: string): Promise<any>;
  getSupportStats(userId: string): Promise<any>;
  getAssistants(): Promise<any[]>;
  getAllUsers(): Promise<any[]>;
  createUser(user: UpsertUser): Promise<User>;
  
  // Status operations
  getStatuses(): Promise<Status[]>;
  getStatusById(id: string): Promise<Status | undefined>;
  createStatus(status: InsertStatus): Promise<Status>;
  updateStatus(id: string, data: Partial<InsertStatus>): Promise<Status>;
  deleteStatus(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private wsService?: WebSocketService;

  setWebSocketService(service: WebSocketService) {
    this.wsService = service;
  }

  // Helper method to create and broadcast notifications to support assistants
  private async broadcastNotificationToSupport(
    notificationData: Omit<InsertNotification, 'userId'>
  ): Promise<void> {
    try {
      // Get all support assistants
      const supportAssistants = await db
        .select()
        .from(users)
        .where(eq(users.role, 'support_assistant'));
      
      // Create notification for each support assistant
      for (const assistant of supportAssistants) {
        const [created] = await db.insert(notifications).values({
          ...notificationData,
          userId: assistant.id,
        }).returning();
        
        // Send via WebSocket if service is available
        if (this.wsService && created) {
          this.wsService.sendToUser(assistant.id, created);
        }
      }
    } catch (error) {
      console.error('[Storage] Failed to broadcast notification:', error);
    }
  }

  // Helper method to create and send notification to specific user
  private async createAndSendNotification(
    notification: InsertNotification
  ): Promise<void> {
    try {
      const [created] = await db.insert(notifications).values(notification).returning();
      
      // Send via WebSocket if service is available
      if (this.wsService && created) {
        this.wsService.sendToUser(notification.userId, created);
      }
    } catch (error) {
      console.error('[Storage] Failed to create/send notification:', error);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Handle both id and email conflicts
    // First try to find existing user by id or email
    const existingById = userData.id ? await this.getUser(userData.id) : null;
    const existingByEmail = userData.email 
      ? await db.select().from(users).where(eq(users.email, userData.email)).limit(1)
      : [];
    
    const existing = existingById || existingByEmail[0];
    
    if (existing) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          id: existing.id, // Keep the existing ID
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return user;
    } else {
      // Insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async hasAdmin(): Promise<boolean> {
    const [adminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    return !!adminUser;
  }

  async getAllUsers(): Promise<any[]> {
    const allUsers = await db.select().from(users);
    
    const usersWithCounts = await Promise.all(
      allUsers.map(async (user) => {
        const userLeads = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(eq(leads.assignedToId, user.id));
        
        return {
          ...user,
          leadCount: Number(userLeads[0]?.count || 0),
        };
      })
    );
    
    return usersWithCounts;
  }

  // Campaign operations
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaignById(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async deleteCampaign(id: string): Promise<void> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    
    // Broadcast notification to all support assistants
    const campaign = await this.getCampaignById(newLead.campaignId);
    await this.broadcastNotificationToSupport({
      type: 'new_lead',
      title: 'New Lead Available',
      message: `New lead "${newLead.name}" added to campaign "${campaign?.name || 'Unknown'}"`,
      leadId: newLead.id,
      read: false,
    });
    
    return newLead;
  }

  async createLeadsBulk(leadsData: InsertLead[]): Promise<Lead[]> {
    const newLeads = await db.insert(leads).values(leadsData).returning();
    
    // Broadcast notification for bulk import to all support assistants
    if (newLeads.length > 0) {
      const campaign = await this.getCampaignById(newLeads[0].campaignId);
      await this.broadcastNotificationToSupport({
        type: 'new_lead',
        title: `${newLeads.length} New Leads Available`,
        message: `${newLeads.length} new leads imported to campaign "${campaign?.name || 'Unknown'}"`,
        leadId: newLeads[0].id, // Reference first lead
        read: false,
      });
    }
    
    return newLeads;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadsByCampaign(campaignId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.campaignId, campaignId));
  }

  async getUnassignedLeads(): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(isNull(leads.assignedToId))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByAssignedTo(userId: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.assignedToId, userId))
      .orderBy(desc(leads.updatedAt));
  }

  async assignLead(leadId: string, userId: string): Promise<Lead> {
    // Get the lead before updating to check if it's a reassignment
    const previousLead = await this.getLeadById(leadId);
    
    const [updatedLead] = await db
      .update(leads)
      .set({ assignedToId: userId, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    
    // Send notification to the assigned user
    const campaign = await this.getCampaignById(updatedLead.campaignId);
    const notificationType = previousLead?.assignedToId ? 'lead_reassigned' : 'lead_assigned';
    const notificationTitle = previousLead?.assignedToId ? 'Lead Reassigned to You' : 'New Lead Assigned';
    
    await this.createAndSendNotification({
      userId,
      type: notificationType,
      title: notificationTitle,
      message: `Lead "${updatedLead.name}" from campaign "${campaign?.name || 'Unknown'}" has been assigned to you`,
      leadId: updatedLead.id,
      read: false,
    });
    
    return updatedLead;
  }

  async unassignLead(leadId: string): Promise<Lead> {
    const [updatedLead] = await db
      .update(leads)
      .set({ assignedToId: null, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    return updatedLead;
  }

  async updateLeadStatus(leadId: string, status: string): Promise<Lead> {
    const [updatedLead] = await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    return updatedLead;
  }

  async updateLead(leadId: string, data: Partial<InsertLead>): Promise<Lead> {
    const [updatedLead] = await db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    return updatedLead;
  }

  async deleteLead(leadId: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, leadId));
  }

  async searchLeads(filters: {
    text?: string;
    status?: string;
    campaignId?: string;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Lead[]> {
    const conditions = [];

    // Text search across name, email, phone
    if (filters.text && filters.text.trim().length > 0) {
      const searchTerm = `%${filters.text.trim()}%`;
      conditions.push(
        or(
          like(leads.name, searchTerm),
          like(leads.email, searchTerm),
          like(leads.phone, searchTerm)
        )
      );
    }

    // Filter by status
    if (filters.status) {
      conditions.push(eq(leads.status, filters.status));
    }

    // Filter by campaign
    if (filters.campaignId) {
      conditions.push(eq(leads.campaignId, filters.campaignId));
    }

    // Filter by assigned user
    if (filters.assignedToId) {
      if (filters.assignedToId === "unassigned") {
        conditions.push(isNull(leads.assignedToId));
      } else {
        conditions.push(eq(leads.assignedToId, filters.assignedToId));
      }
    }

    // Filter by date range
    if (filters.dateFrom) {
      conditions.push(gte(leads.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      // Add 1 day to include the full end date
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(leads.createdAt, endDate));
    }

    const query = conditions.length > 0
      ? db.select().from(leads).where(and(...conditions))
      : db.select().from(leads);

    return await query.orderBy(desc(leads.createdAt));
  }

  // Recording operations
  async createRecording(recording: InsertRecording): Promise<Recording> {
    const [newRecording] = await db.insert(recordings).values(recording).returning();
    return newRecording;
  }

  async getRecordingsByLead(leadId: string): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(eq(recordings.leadId, leadId))
      .orderBy(desc(recordings.createdAt));
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getCommentsByLead(leadId: string): Promise<(Comment & { user: User })[]> {
    const results = await db
      .select({
        id: comments.id,
        leadId: comments.leadId,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        user: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.leadId, leadId))
      .orderBy(desc(comments.createdAt));

    return results;
  }

  async getCommentCounts(leadIds: string[]): Promise<Map<string, number>> {
    if (leadIds.length === 0) {
      return new Map();
    }

    const results = await db
      .select({
        leadId: comments.leadId,
        count: sql<number>`count(*)`,
      })
      .from(comments)
      .where(inArray(comments.leadId, leadIds))
      .groupBy(comments.leadId);

    const countMap = new Map<string, number>();
    results.forEach(({ leadId, count }) => {
      countMap.set(leadId, Number(count));
    });

    // Ensure all leadIds are in the map (even if count is 0)
    leadIds.forEach(leadId => {
      if (!countMap.has(leadId)) {
        countMap.set(leadId, 0);
      }
    });

    return countMap;
  }

  // Stats and analytics
  async getAdminStats(dateFrom?: string, dateTo?: string): Promise<any> {
    const conditions: any[] = [];
    
    if (dateFrom) {
      conditions.push(gte(leads.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(leads.createdAt, endDate));
    }

    const [campaignCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns);

    const leadQuery = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(leads).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(leads);
    const [leadCount] = await leadQuery;

    const completedConditions = [...conditions, eq(leads.status, "completed")];
    const [completedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(...completedConditions));

    const [assistantCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "support_assistant"));

    return {
      totalCampaigns: Number(campaignCount?.count || 0),
      activeLeads: Number(leadCount?.count || 0),
      completedLeads: Number(completedCount?.count || 0),
      totalAssistants: Number(assistantCount?.count || 0),
    };
  }

  async getSupportStats(userId: string): Promise<any> {
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.assignedToId, userId));

    const [inProgressCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.assignedToId, userId), eq(leads.status, "in_progress")));

    const [completedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.assignedToId, userId), eq(leads.status, "completed")));

    return {
      totalAssigned: Number(totalCount?.count || 0),
      inProgress: Number(inProgressCount?.count || 0),
      completed: Number(completedCount?.count || 0),
    };
  }

  async getAssistants(): Promise<any[]> {
    const assistants = await db
      .select()
      .from(users)
      .where(eq(users.role, "support_assistant"));

    const assistantsWithCounts = await Promise.all(
      assistants.map(async (assistant) => {
        const [leadCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(eq(leads.assignedToId, assistant.id));

        return {
          ...assistant,
          leadCount: Number(leadCount?.count || 0),
        };
      })
    );

    return assistantsWithCounts;
  }

  // Schedule operations
  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async getSchedulesByUser(userId: string): Promise<(Schedule & { lead: Lead & { campaign: Campaign } })[]> {
    const results = await db
      .select({
        id: schedules.id,
        leadId: schedules.leadId,
        userId: schedules.userId,
        scheduledFor: schedules.scheduledFor,
        notes: schedules.notes,
        completed: schedules.completed,
        createdAt: schedules.createdAt,
        lead: leads,
        campaign: campaigns,
      })
      .from(schedules)
      .innerJoin(leads, eq(schedules.leadId, leads.id))
      .innerJoin(campaigns, eq(leads.campaignId, campaigns.id))
      .where(eq(schedules.userId, userId))
      .orderBy(desc(schedules.scheduledFor));

    return results.map(r => ({
      ...r,
      lead: {
        ...r.lead,
        campaign: r.campaign,
      },
    }));
  }

  async getUpcomingSchedules(userId: string): Promise<(Schedule & { lead: Lead & { campaign: Campaign } })[]> {
    const now = new Date();
    const results = await db
      .select({
        id: schedules.id,
        leadId: schedules.leadId,
        userId: schedules.userId,
        scheduledFor: schedules.scheduledFor,
        notes: schedules.notes,
        completed: schedules.completed,
        createdAt: schedules.createdAt,
        lead: leads,
        campaign: campaigns,
      })
      .from(schedules)
      .innerJoin(leads, eq(schedules.leadId, leads.id))
      .innerJoin(campaigns, eq(leads.campaignId, campaigns.id))
      .where(
        and(
          eq(leads.assignedToId, userId),
          isNull(schedules.completed),
          gte(schedules.scheduledFor, now)
        )
      )
      .orderBy(schedules.scheduledFor);

    return results.map(r => ({
      ...r,
      lead: {
        ...r.lead,
        campaign: r.campaign,
      },
    }));
  }

  async markScheduleCompleted(scheduleId: string): Promise<Schedule> {
    const [schedule] = await db
      .update(schedules)
      .set({ completed: new Date() })
      .where(eq(schedules.id, scheduleId))
      .returning();
    return schedule;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotifications(userId: string): Promise<(Notification & { lead?: Lead })[]> {
    const results = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        leadId: notifications.leadId,
        read: notifications.read,
        createdAt: notifications.createdAt,
        lead: leads,
      })
      .from(notifications)
      .leftJoin(leads, eq(notifications.leadId, leads.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return results.map(r => ({
      ...r,
      lead: r.lead || undefined,
    }));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    return result.count;
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
  }

  // Status operations
  async getStatuses(): Promise<Status[]> {
    return await db.select().from(statuses).orderBy(statuses.name);
  }

  async getStatusById(id: string): Promise<Status | undefined> {
    const [status] = await db.select().from(statuses).where(eq(statuses.id, id));
    return status;
  }

  async createStatus(status: InsertStatus): Promise<Status> {
    const [created] = await db.insert(statuses).values(status).returning();
    return created;
  }

  async updateStatus(id: string, data: Partial<InsertStatus>): Promise<Status> {
    const [updated] = await db
      .update(statuses)
      .set(data)
      .where(eq(statuses.id, id))
      .returning();
    return updated;
  }

  async deleteStatus(id: string): Promise<void> {
    // Check if status is default (can't delete default statuses)
    const status = await this.getStatusById(id);
    if (status?.isDefault) {
      throw new Error("Cannot delete default status");
    }
    await db.delete(statuses).where(eq(statuses.id, id));
  }
}

export const storage = new DatabaseStorage();
