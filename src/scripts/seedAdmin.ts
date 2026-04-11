import "dotenv/config";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@ecofy.com";
  const rawPassword = process.env.ADMIN_PASSWORD || "admin12345";

  try {
    console.log(`Checking if admin user exists (${adminEmail})...`);
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log("⚠️ Admin user already exists. Operation aborted.");
      process.exit(0);
    }

    console.log("Adding new Admin user to the database...");
    
    // Using 12 salt rounds, consistent with auth.service.ts
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Ecofy Super Admin",
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log(`✅ Successfully seeded Admin user!`);
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${rawPassword}`);
    console.log(`🛡️ Role: ${admin.role}`);

  } catch (error) {
    console.error("❌ Failed to seed Admin user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
