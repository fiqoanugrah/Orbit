import { prisma } from "../src/lib/prisma";
import { seedOrganizationWorkspace } from "../src/lib/seed-organization";

function createSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "tempat-les";
}

async function main() {
  const organizationName = "Orbit Robotics Center";
  const ownerEmail = "owner@orbit.local";

  const organization = await prisma.organization.upsert({
    where: { slug: createSlug(organizationName) },
    update: {},
    create: {
      name: organizationName,
      slug: createSlug(organizationName),
      phone: "0812-0000-0000",
      email: "admin@orbit.local",
      address: "Jl. Orbit No. 1, Jakarta",
      timezone: "Asia/Jakarta",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Orbit Owner" },
    create: {
      name: "Orbit Owner",
      email: ownerEmail,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: "OWNER",
    },
  });

  await seedOrganizationWorkspace(organization.id);

  console.log(`Seeded ${organization.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
