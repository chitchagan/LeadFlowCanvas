import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { insertCampaignSchema, insertLeadSchema, insertRecordingSchema, insertCommentSchema, insertStatusSchema } from "@shared/schema";
import { wsNotificationService } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes setup (sets up /api/login, /api/register, /api/logout, /api/user)
  setupAuth(app);

  // Campaign routes
  app.post("/api/campaigns", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.json(campaign);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      res.status(400).json({ message: error.message || "Failed to create campaign" });
    }
  });

  app.get("/api/campaigns", isAuthenticated, async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      
      // Add lead counts
      const campaignsWithCounts = await Promise.all(
        campaigns.map(async (campaign) => {
          const leads = await storage.getLeadsByCampaign(campaign.id);
          return {
            ...campaign,
            leadCount: leads.length,
          };
        })
      );
      
      res.json(campaignsWithCounts);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.delete("/api/campaigns/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.get("/api/campaigns/:id/leads", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const leads = await storage.getLeadsByCampaign(req.params.id);
      const users = await storage.getAllUsers();
      
      const leadsWithAssignedUser = leads.map((lead) => ({
        ...lead,
        assignedUser: lead.assignedToId ? users.find((u) => u.id === lead.assignedToId) : null,
      }));
      
      res.json(leadsWithAssignedUser);
    } catch (error) {
      console.error("Error fetching campaign leads:", error);
      res.status(500).json({ message: "Failed to fetch campaign leads" });
    }
  });

  app.post("/api/campaigns/:id/leads", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const campaignId = req.params.id;
      const leadData = {
        ...req.body,
        campaignId,
      };
      
      const validatedLead = insertLeadSchema.parse(leadData);
      const newLead = await storage.createLead(validatedLead);
      res.json(newLead);
    } catch (error: any) {
      console.error("Error creating lead:", error);
      res.status(400).json({ message: error.message || "Failed to create lead" });
    }
  });

  // Lead routes
  app.post("/api/leads/bulk", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { leads: leadsData, campaignId } = req.body;
      if (!Array.isArray(leadsData) || leadsData.length === 0) {
        return res.status(400).json({ message: "Invalid leads data" });
      }
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID is required" });
      }

      // Add campaignId to all leads
      const leadsWithCampaign = leadsData.map((lead) => ({
        ...lead,
        campaignId,
      }));

      const validatedLeads = leadsWithCampaign.map((lead) => insertLeadSchema.parse(lead));
      const newLeads = await storage.createLeadsBulk(validatedLeads);
      res.json(newLeads);
    } catch (error: any) {
      console.error("Error creating leads:", error);
      res.status(400).json({ message: error.message || "Failed to create leads" });
    }
  });

  app.post("/api/leads/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const lead = await storage.assignLead(req.params.id, userId);
      res.json(lead);
    } catch (error) {
      console.error("Error assigning lead:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  app.patch("/api/leads/:id/unassign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const lead = await storage.getLeadById(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Support assistants can only unassign their own leads
      if (req.user.role === "support_assistant" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You can only unassign your own leads" });
      }
      
      const unassignedLead = await storage.unassignLead(req.params.id);
      res.json(unassignedLead);
    } catch (error) {
      console.error("Error unassigning lead:", error);
      res.status(500).json({ message: "Failed to unassign lead" });
    }
  });

  app.patch("/api/leads/:id/reassign", isAuthenticated, async (req: any, res) => {
    try {
      const { assignedToId } = req.body;
      if (!assignedToId) {
        return res.status(400).json({ message: "Assigned user ID is required" });
      }
      
      const userId = req.user.id;
      const lead = await storage.getLeadById(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Support assistants can only reassign their own leads
      if (req.user.role === "support_assistant" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You can only reassign your own leads" });
      }
      
      // Verify target user exists and is a support assistant
      const targetUser = await storage.getUser(assignedToId);
      if (!targetUser) {
        return res.status(400).json({ message: "Target user not found" });
      }
      if (targetUser.role !== "support_assistant") {
        return res.status(400).json({ message: "Target user must be a support assistant" });
      }
      
      const reassignedLead = await storage.assignLead(req.params.id, assignedToId);
      res.json(reassignedLead);
    } catch (error) {
      console.error("Error reassigning lead:", error);
      res.status(500).json({ message: "Failed to reassign lead" });
    }
  });

  app.patch("/api/leads/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const lead = await storage.updateLeadStatus(req.params.id, status);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const leadData = req.body;
      const lead = await storage.updateLead(req.params.id, leadData);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  app.get("/api/leads/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { text, status, campaignId, assignedToId, dateFrom, dateTo } = req.query;
      
      // Get user from database to verify role (don't trust session data)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const filters = {
        text: text as string | undefined,
        status: status as string | undefined,
        campaignId: campaignId as string | undefined,
        assignedToId: assignedToId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      };

      // If support assistant, only show their assigned leads
      if (user.role === "support_assistant") {
        // Override assignedToId filter for support assistants
        filters.assignedToId = userId;
      }

      const leads = await storage.searchLeads(filters);
      const campaigns = await storage.getCampaigns();
      
      // Get comment counts for all leads
      const leadIds = leads.map(lead => lead.id);
      const commentCounts = await storage.getCommentCounts(leadIds);
      
      // Get assigned users for all leads (for admin view)
      const assignedUserIds = [...new Set(leads.map(lead => lead.assignedToId).filter(Boolean))];
      const assignedUsersData = await Promise.all(
        assignedUserIds.map(id => storage.getUser(id as string))
      );
      // Sanitize user data - only include safe fields, exclude password hash
      const assignedUsersMap = new Map(
        assignedUsersData.filter(Boolean).map(user => [
          user!.id,
          {
            id: user!.id,
            username: user!.username,
            firstName: user!.firstName,
            lastName: user!.lastName,
            email: user!.email,
            role: user!.role,
            createdAt: user!.createdAt,
            updatedAt: user!.updatedAt,
          }
        ])
      );
      
      const leadsWithDetails = leads.map((lead) => ({
        ...lead,
        campaign: campaigns.find((c) => c.id === lead.campaignId),
        commentCount: commentCounts.get(lead.id) || 0,
        assignedTo: lead.assignedToId ? assignedUsersMap.get(lead.assignedToId) : null,
      }));
      
      res.json(leadsWithDetails);
    } catch (error) {
      console.error("Error searching leads:", error);
      res.status(500).json({ message: "Failed to search leads" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const stats = await storage.getAdminStats(
        dateFrom as string | undefined,
        dateTo as string | undefined
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/recent-leads", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const campaigns = await storage.getCampaigns();
      
      const leadsWithCampaigns = leads.slice(0, 10).map((lead) => ({
        ...lead,
        campaign: campaigns.find((c) => c.id === lead.campaignId),
      }));
      
      res.json(leadsWithCampaigns);
    } catch (error) {
      console.error("Error fetching recent leads:", error);
      res.status(500).json({ message: "Failed to fetch recent leads" });
    }
  });

  app.get("/api/admin/assistants", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const assistants = await storage.getAssistants();
      res.json(assistants);
    } catch (error) {
      console.error("Error fetching assistants:", error);
      res.status(500).json({ message: "Failed to fetch assistants" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, role } = req.body;
      
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        email,
        firstName,
        lastName,
        role,
      });
      
      res.json(user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  // Public statuses endpoint (for all authenticated users to see status colors)
  app.get("/api/statuses", isAuthenticated, async (req, res) => {
    try {
      const statuses = await storage.getStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ message: "Failed to fetch statuses" });
    }
  });

  // Status management routes (admin only)
  app.get("/api/admin/statuses", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const statuses = await storage.getStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ message: "Failed to fetch statuses" });
    }
  });

  app.post("/api/admin/statuses", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertStatusSchema.parse(req.body);
      const status = await storage.createStatus(validatedData);
      res.json(status);
    } catch (error: any) {
      console.error("Error creating status:", error);
      res.status(400).json({ message: error.message || "Failed to create status" });
    }
  });

  app.patch("/api/admin/statuses/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = await storage.updateStatus(req.params.id, req.body);
      res.json(status);
    } catch (error: any) {
      console.error("Error updating status:", error);
      res.status(400).json({ message: error.message || "Failed to update status" });
    }
  });

  app.delete("/api/admin/statuses/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteStatus(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting status:", error);
      res.status(400).json({ message: error.message || "Failed to delete status" });
    }
  });

  // Helper function to escape CSV field values (RFC 4180)
  const escapeCsvField = (value: string): string => {
    // Replace any line breaks with spaces
    const normalized = value.replace(/[\r\n]+/g, ' ');
    // Escape double quotes by doubling them
    const escaped = normalized.replace(/"/g, '""');
    // Always wrap in quotes for safety
    return `"${escaped}"`;
  };

  app.get("/api/admin/export/leads", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { text, status, campaignId, assignedToId, dateFrom, dateTo } = req.query;
      
      const filters = {
        text: text as string | undefined,
        status: status as string | undefined,
        campaignId: campaignId as string | undefined,
        assignedToId: assignedToId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      };

      const leads = await storage.searchLeads(filters);
      const campaigns = await storage.getCampaigns();
      const users = await storage.getAllUsers();
      
      // Build CSV content
      const headers = "Name,Email,Phone,Status,Campaign,Assigned To,Created At\n";
      const rows = leads.map(lead => {
        const campaign = campaigns.find(c => c.id === lead.campaignId);
        const assignedUser = users.find(u => u.id === lead.assignedToId);
        return [
          escapeCsvField(lead.name),
          escapeCsvField(lead.email || ""),
          escapeCsvField(lead.phone),
          escapeCsvField(lead.status),
          escapeCsvField(campaign?.name || ""),
          escapeCsvField(assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : ""),
          escapeCsvField(lead.createdAt?.toISOString() || "")
        ].join(",");
      }).join("\n");
      
      const csv = headers + rows;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="leads-export.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting leads:", error);
      res.status(500).json({ message: "Failed to export leads" });
    }
  });

  app.get("/api/admin/export/analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const stats = await storage.getAdminStats(
        dateFrom as string | undefined,
        dateTo as string | undefined
      );
      
      // Build CSV content
      const headers = "Metric,Value\n";
      const rows = [
        ["Total Campaigns", stats.totalCampaigns],
        ["Active Leads", stats.activeLeads],
        ["Completed Leads", stats.completedLeads],
        ["Total Assistants", stats.totalAssistants],
      ].map(([metric, value]) => `${escapeCsvField(String(metric))},${escapeCsvField(String(value))}`).join("\n");
      
      const csv = headers + rows;
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="analytics-export.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Failed to export analytics" });
    }
  });

  // Support routes
  app.get("/api/support/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getSupportStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching support stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/support/my-leads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const leads = await storage.getLeadsByAssignedTo(userId);
      const campaigns = await storage.getCampaigns();
      
      const leadsWithCampaigns = leads.map((lead) => ({
        ...lead,
        campaign: campaigns.find((c) => c.id === lead.campaignId),
      }));
      
      res.json(leadsWithCampaigns);
    } catch (error) {
      console.error("Error fetching my leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/support/unassigned-leads", isAuthenticated, async (req, res) => {
    try {
      const leads = await storage.getUnassignedLeads();
      const campaigns = await storage.getCampaigns();
      
      const leadsWithCampaigns = leads.map((lead) => ({
        ...lead,
        campaign: campaigns.find((c) => c.id === lead.campaignId),
      }));
      
      res.json(leadsWithCampaigns);
    } catch (error) {
      console.error("Error fetching unassigned leads:", error);
      res.status(500).json({ message: "Failed to fetch unassigned leads" });
    }
  });

  app.get("/api/support/assistants", isAuthenticated, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // Filter to only return support assistants
      const supportAssistants = allUsers.filter(user => user.role === "support_assistant");
      res.json(supportAssistants);
    } catch (error) {
      console.error("Error fetching support assistants:", error);
      res.status(500).json({ message: "Failed to fetch support assistants" });
    }
  });

  // Recording routes
  app.post("/api/recordings", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertRecordingSchema.parse(req.body);
      const recording = await storage.createRecording(validatedData);
      res.json(recording);
    } catch (error: any) {
      console.error("Error creating recording:", error);
      res.status(400).json({ message: error.message || "Failed to create recording" });
    }
  });

  app.get("/api/leads/:id/recordings", isAuthenticated, async (req, res) => {
    try {
      const recordings = await storage.getRecordingsByLead(req.params.id);
      res.json(recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      res.status(500).json({ message: "Failed to fetch recordings" });
    }
  });

  // Comment routes
  app.post("/api/leads/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { content } = req.body;
      
      // Get user from database to verify role (don't trust session data)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Verify user has access to this lead
      const lead = await storage.getLeadById(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Only assigned support assistant or admin can add comments
      if (user.role !== "admin" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You don't have access to this lead" });
      }
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const commentData = {
        leadId: req.params.id,
        userId,
        content: content.trim(),
      };

      const validatedData = insertCommentSchema.parse(commentData);
      const comment = await storage.createComment(validatedData);
      res.json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(400).json({ message: error.message || "Failed to create comment" });
    }
  });

  app.get("/api/leads/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user from database to verify role (don't trust session)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Verify user has access to this lead
      const lead = await storage.getLeadById(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Only assigned support assistant or admin can view comments
      if (user.role !== "admin" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You don't have access to this lead" });
      }
      
      const comments = await storage.getCommentsByLead(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Schedule routes
  app.post("/api/schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { leadId, scheduledFor, notes } = req.body;

      if (!leadId || !scheduledFor) {
        return res.status(400).json({ message: "Lead ID and scheduled time are required" });
      }

      // Get user from database to verify role (don't trust session data)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify user has access to this lead
      const lead = await storage.getLeadById(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Only assigned support assistant or admin can schedule callbacks
      if (user.role !== "admin" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You don't have access to this lead" });
      }

      const schedule = await storage.createSchedule({
        leadId,
        userId,
        scheduledFor: new Date(scheduledFor),
        notes: notes || null,
      });

      res.json(schedule);
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      res.status(400).json({ message: error.message || "Failed to create schedule" });
    }
  });

  app.get("/api/schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const schedules = await storage.getSchedulesByUser(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.get("/api/schedules/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const schedules = await storage.getUpcomingSchedules(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching upcoming schedules:", error);
      res.status(500).json({ message: "Failed to fetch upcoming schedules" });
    }
  });

  app.patch("/api/schedules/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.markScheduleCompleted(req.params.id);
      res.json(schedule);
    } catch (error) {
      console.error("Error completing schedule:", error);
      res.status(500).json({ message: "Failed to complete schedule" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notification = await storage.markNotificationAsRead(req.params.id, userId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket service for real-time notifications
  wsNotificationService.initialize(httpServer);
  
  // Connect WebSocket service to storage for notifications
  storage.setWebSocketService(wsNotificationService);

  return httpServer;
}
