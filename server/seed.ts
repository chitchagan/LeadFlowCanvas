import { hashPassword } from "./auth";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database with default users...");

  try {
    // Create default admin user
    const adminExists = await storage.getUserByUsername("admin");
    if (!adminExists) {
      await storage.createUser({
        username: "admin",
        password: await hashPassword("admin123"),
        email: "admin@leadmanager.com",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      });
      console.log("✓ Created admin user (admin/admin123)");
    } else {
      console.log("✓ Admin user already exists");
    }

    // Create default support user
    const supportExists = await storage.getUserByUsername("support");
    if (!supportExists) {
      await storage.createUser({
        username: "support",
        password: await hashPassword("support123"),
        email: "support@leadmanager.com",
        firstName: "Support",
        lastName: "Assistant",
        role: "support_assistant",
      });
      console.log("✓ Created support user (support/support123)");
    } else {
      console.log("✓ Support user already exists");
    }

    // Create default statuses
    const defaultStatuses = [
      { name: "Not Picked", description: "Lead has not been contacted yet", color: "gray", isDefault: true },
      { name: "Call Back Later", description: "Lead requested to be contacted later", color: "yellow", isDefault: true },
      { name: "Completed", description: "Lead conversion completed", color: "green", isDefault: true },
      { name: "Not Interested", description: "Lead is not interested", color: "red", isDefault: true },
      { name: "Interested in Free Only", description: "Lead is interested only in free courses", color: "purple", isDefault: true },
      { name: "Interested in Recorded Course", description: "Lead is interested in recorded courses", color: "orange", isDefault: true },
      { name: "In Progress", description: "Lead is being worked on", color: "blue", isDefault: true },
    ];

    for (const statusData of defaultStatuses) {
      const existing = await storage.getStatuses();
      const statusExists = existing.some(s => s.name === statusData.name && s.isDefault);
      
      if (!statusExists) {
        await storage.createStatus(statusData);
        console.log(`✓ Created default status: ${statusData.name}`);
      } else {
        console.log(`✓ Default status ${statusData.name} already exists`);
      }
    }

    console.log("\nSeeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
