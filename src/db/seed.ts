import { PrismaClient, Prisma } from "@prisma/client";
import { ETargetType, EIncidentStatus } from "./enums";

const prisma = new PrismaClient();

const incidents: Prisma.IncidentCreateInput[] = [
  {
    message: "Energy output latency",
    service: { connect: { id: 1 } },
    status: EIncidentStatus.CLOSED,
  },
  {
    message: "Child in Monstropolis",
    service: { connect: { id: 3 } },
    escalation: 3,
    status: EIncidentStatus.AKNOWLEDGED,
  },
];
const policies: Prisma.PolicyCreateInput[] = [
  { name: "low-impact" },
  { name: "medium-impact" },
  { name: "high-impact" },
];
const services: Prisma.ServiceCreateInput[] = [
  { name: "Service Alpha", policy: { connect: { id: 1 } } }, // low-impact
  { name: "Service Beta", policy: { connect: { id: 2 } } }, // medium-impact
  { name: "Service Gamma", policy: { connect: { id: 2 } } }, // medium-impact
  { name: "Service Delta", policy: { connect: { id: 3 } } }, // high-impact
];
const levels: Prisma.LevelCreateInput[] = [{ name: "CS-1" }, { name: "CS-2" }, { name: "CS-3" }];
const targets: Prisma.TargetCreateInput[] = [
  { type: ETargetType.EMAIL, contact: "bob@monster.inc", level: { connect: [{ id: 1 }] } }, // CS-1
  {
    type: ETargetType.EMAIL,
    contact: "sully@monster.inc",
    level: { connect: [{ id: 1 }, { id: 2 }] }, // CS-1, CS-2
  },
  {
    type: ETargetType.EMAIL,
    contact: "leon@monster.inc",
    level: { connect: [{ id: 1 }, { id: 2 }] }, // CS-1, CS-2
  },
  // yup this is my personal number... not yet a monsterInc employee sadly, but hopefully an Aircall employee soon
  {
    type: ETargetType.SMS,
    contact: "+33 6 61 51 30 63",
    level: { connect: [{ id: 1 }, { id: 2 }, { id: 3 }] }, // CS-1, CS-2, CS-3 hehe 😎
  },
];
const policiesLevels: Prisma.PolicyLevelCreateInput[] = [
  // low-impact policy can escalate to CS-1
  { escalation: 1, policy: { connect: { id: 1 } }, level: { connect: { id: 1 } } },
  // medium-impact policy can escalate to CS-2
  { escalation: 1, policy: { connect: { id: 2 } }, level: { connect: { id: 1 } } },
  { escalation: 2, policy: { connect: { id: 2 } }, level: { connect: { id: 2 } } },
  // high-impact policy can escalate to CS-3
  { escalation: 1, policy: { connect: { id: 3 } }, level: { connect: { id: 1 } } },
  { escalation: 2, policy: { connect: { id: 3 } }, level: { connect: { id: 2 } } },
  { escalation: 3, policy: { connect: { id: 3 } }, level: { connect: { id: 3 } } },
];

async function seed() {
  console.log("#policies");
  for (const policy of policies) {
    const record = await prisma.policy.create({ data: policy });
    console.log(`\t> created policy ${record.id}`);
  }

  console.log("#services");
  for (const service of services) {
    const record = await prisma.service.create({ data: service });
    console.log(`\t> created service ${record.id}`);
  }

  console.log("#incidents");
  for (const incident of incidents) {
    const record = await prisma.incident.create({ data: incident });
    console.log(`\t> created incident ${record.id}`);
  }

  console.log("#levels");
  for (const level of levels) {
    const record = await prisma.level.create({ data: level });
    console.log(`\t> created level ${record.id}`);
  }

  console.log("#targets");
  for (const target of targets) {
    const record = await prisma.target.create({ data: target });
    console.log(`\t> created target ${record.id}`);
  }

  console.log("#policiesLevels");
  for (const policyLevel of policiesLevels) {
    const record = await prisma.policyLevel.create({ data: policyLevel });
    console.log(`\t> created policyLevel ${record.policyId}-${record.levelId}`);
  }
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
