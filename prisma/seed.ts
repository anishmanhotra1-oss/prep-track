import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user if not exists
  const demoEmail = "demo@prepwise.app";
  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash("Prepwise123!", 10);
    user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        name: "Demo Student",
        timezone: "UTC",
        dayStartHour: 4,
        dailyGoalMinutes: 240,
        weekStart: "monday",
      },
    });
    console.log("Demo user created:", demoEmail);
  }

  // Create Default Revision Sets for User
  const defaultSets = [
    { name: "Default", intervals: JSON.stringify([1, 7, 30]), isDefault: true },
    { name: "Quick recall", intervals: JSON.stringify([1, 3, 7]), isDefault: false },
  ];

  for (const set of defaultSets) {
    const existingSet = await prisma.revisionSet.findFirst({
      where: { userId: user.id, name: set.name },
    });
    if (!existingSet) {
      await prisma.revisionSet.create({
        data: {
          userId: user.id,
          name: set.name,
          intervals: set.intervals,
          isDefault: set.isDefault,
        },
      });
    }
  }

  // Create Default Subjects
  const defaultSubjects = [
    { name: "History", color: "#3B82F6" },
    { name: "Polity", color: "#10B981" },
    { name: "Geography", color: "#F97316" },
    { name: "Economy", color: "#8B5CF6" },
    { name: "Science", color: "#EC4899" },
    { name: "Ethics", color: "#14B8A6" },
  ];

  for (const subj of defaultSubjects) {
    const existingSubj = await prisma.subject.findFirst({
      where: { userId: user.id, name: subj.name, deletedAt: null },
    });
    if (!existingSubj) {
      await prisma.subject.create({
        data: {
          userId: user.id,
          name: subj.name,
          color: subj.color,
        },
      });
    }
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
