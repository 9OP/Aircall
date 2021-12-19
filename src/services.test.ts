import { listIncidents, upsertPolicy } from ".";
import { prisma } from "./db";
import { ETargetType } from "./db/enums";
import { Level } from "./services";

const deleteTable = async (name: string) => {
  await prisma.$executeRawUnsafe(`
  DELETE FROM ${name};    
  UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME=${name};
  `);
};

beforeEach(async () => {
  // Not the cleanest way to reset the database before each test...
  // But prisma testing is not well documented yet
  console.log("beforeearch");
  await deleteTable("policies_levels");
  await deleteTable("incidents");
  await deleteTable("services");
  await deleteTable("targets");
  await deleteTable("levels");
  await deleteTable("policies");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("UpsertPolicy", () => {
  it("should create a new policy", async () => {
    const policyName = "Critical";
    const serviceName = "Service Alpha";
    const levels: Level[] = [
      {
        escalation: 1,
        name: "CS-3",
        targets: [
          { type: ETargetType.EMAIL, contact: "bob@monster.inc" },
          { type: ETargetType.SMS, contact: "+33 6 61 51 30 63" },
        ],
      },
    ];

    const result = await upsertPolicy(policyName, serviceName, levels);

    expect(await prisma.policy.count()).toBe(1);
    expect(await prisma.service.count()).toBe(1);
    expect(await prisma.level.count()).toBe(1);
    expect(await prisma.target.count()).toBe(2);

    expect(result.name).toBe(policyName);
    expect(result.policiesLevels.length).toBe(1);
    expect(result.policiesLevels[0]?.escalation).toBe(levels[0]?.escalation);
    expect(result.policiesLevels[0]?.level.name).toBe(levels[0]?.name);
    expect(result.policiesLevels[0]?.level.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining(levels[0]?.targets[0]),
        expect.objectContaining(levels[0]?.targets[1]),
      ])
    );
  });

  it("should update an existing policy", async () => {
    await prisma.policy.create({
      data: {
        name: "Critical",
        services: { create: { name: "Service Alpha" } },
        policiesLevels: {
          create: {
            escalation: 2,
            level: {
              create: {
                name: "CS-3",
                targets: { create: [{ contact: "bob@monster.inc", type: ETargetType.EMAIL }] },
              },
            },
          },
        },
      },
    });

    await prisma.level.create({
      data: {
        name: "CS-2",
        targets: { create: [{ contact: "sully@monster.inc", type: ETargetType.EMAIL }] },
      },
    });

    // Apply existing policy to new service
    const result = await upsertPolicy("Critical", "Service Beta", [
      { name: "CS-2", targets: [], escalation: 1 },
    ]);

    expect(await prisma.policy.count()).toBe(1);
    expect(await prisma.service.count()).toBe(2);
    expect(await prisma.level.count()).toBe(2);
    expect(await prisma.target.count()).toBe(2);

    expect(result.policiesLevels.length).toBe(2);
  });
});

describe("UpsertLevel", () => {
  it.todo("should create a new level");

  it.todo("should update an existing level");
});

describe("ListIncidents", () => {
  it("should list incidents", async () => {
    // SQLite does not support bulk insert
    const service1 = await prisma.service.create({
      data: { name: "Service 1", policy: { create: { name: "policy 1" } } },
    });
    const service2 = await prisma.service.create({
      data: { name: "Service 2", policy: { create: { name: "policy 2" } } },
    });
    await prisma.incident.create({
      data: { message: "Alert 1", serviceId: service1.id },
    });
    await prisma.incident.create({
      data: { message: "Alert 2", serviceId: service2.id },
    });
    await prisma.incident.create({
      data: { message: "Alert 3", serviceId: service2.id },
    });

    let incidents = await listIncidents(service1.id);
    expect(incidents.length).toBe(1);
    expect(incidents).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: "Alert 1" })])
    );

    incidents = await listIncidents(service2.id);
    expect(incidents.length).toBe(2);
    expect(incidents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Alert 2" }),
        expect.objectContaining({ message: "Alert 3" }),
      ])
    );
  });
});
