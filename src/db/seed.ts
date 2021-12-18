import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const policies: Prisma.PolicyCreateInput[] = [];
const services: Prisma.ServiceCreateInput[] = [];
const levels: Prisma.LevelCreateInput[] = [];
const targets: Prisma.TargetCreateInput[] = [];
const incidents: Prisma.IncidentCreateInput[] = [];

async function seed() {
  //   console.log(`Start seeding ...`);
  //   for (const u of userData) {
  //     const user = await prisma.user.create({
  //       data: u,
  //     });
  //     console.log(`Created user with id: ${user.id}`);
  //   }
  //   console.log(`Seeding finished.`);
}

(async function () {
  try {
    await seed();
  } catch (err) {
    console.log(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
