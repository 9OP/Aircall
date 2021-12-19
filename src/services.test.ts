import { Incident, Service } from ".prisma/client";
import { aknowledgeIncident, createIncident, listIncidents, upsertPolicy } from ".";
import { NotifierAdapter, TimerAdapter } from "./adapters";
import { prisma } from "./db";
import { EIncidentStatus, ETargetType } from "./db/enums";
import { aknowledgeTimeout, Level } from "./services";

const deleteTable = async (name: string) => {
  await prisma.$executeRawUnsafe(`
  DELETE FROM ${name};    
  UPDATE SQLITE_SEQUENCE SET SEQ=0 WHERE NAME=${name};
  `);
};

beforeEach(async () => {
  // Not the cleanest way to reset the database before each test...
  // But prisma testing is not well documented yet
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

describe("CloseIncidents", () => {
  it.todo("should close incident");

  it.todo("should recover healthy when all incidents are closed");
});

describe("AknowledgeIncident", () => {
  it("should aknowledge incident", async () => {
    const target = await prisma.target.create({
      data: {
        type: ETargetType.EMAIL,
        contact: "bob@monster.inc",
      },
    });
    const service = await prisma.service.create({
      data: { name: "Service", policy: { create: { name: "policy" } } },
    });
    const incident = await prisma.incident.create({
      data: {
        message: "Alert",
        serviceId: service.id,
        status: EIncidentStatus.OPEN,
      },
    });

    const result = await aknowledgeIncident(incident.id, target.id);

    expect(result.status).toEqual(EIncidentStatus.AKNOWLEDGED);
    expect(result.aknowledgerId).toEqual(target.id);
  });
});

describe("CreateIncident", () => {
  let service: Service;
  const timer = new TimerAdapter();
  const notifier = new NotifierAdapter();
  let spyTimer: jest.SpyInstance;
  let spyNotifier: jest.SpyInstance;

  beforeEach(async () => {
    spyTimer = jest.spyOn(timer, "setTimer");
    spyNotifier = jest.spyOn(notifier, "notify");

    service = await prisma.service.create({
      data: {
        name: "Service",
        policy: {
          create: {
            name: "policy",
            policiesLevels: {
              create: {
                escalation: 1,
                level: {
                  create: {
                    name: "CS-1",
                    targets: { create: { type: ETargetType.EMAIL, contact: "bob@monster.inc" } },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("should create incident and escalate and notify", async () => {
    const result = await createIncident("Alert", service.id, timer, notifier);

    expect(result?.incident.status).toEqual(EIncidentStatus.OPEN);
    expect(result?.service.healthy).toBe(false);
    expect(spyTimer).toHaveBeenCalledTimes(1);
    expect(spyNotifier).toHaveBeenCalledTimes(1);
  });

  it("should not escalate and notify when service is not healthy", async () => {
    await prisma.service.update({ where: { id: service.id }, data: { healthy: false } });

    const result = await createIncident("Alert", service.id, timer, notifier);

    expect(result?.incident.status).toEqual(EIncidentStatus.OPEN);
    expect(spyTimer).toHaveBeenCalledTimes(0); // not called because service not healthy
    expect(spyNotifier).toHaveBeenCalledTimes(0); // not called because service not healthy
  });
});

describe("AknowledgeTimeout", () => {
  let service: Service;
  let incident: Incident;
  const timer = new TimerAdapter();
  const notifier = new NotifierAdapter();
  let spyTimer: jest.SpyInstance;
  let spyNotifier: jest.SpyInstance;

  beforeEach(async () => {
    spyTimer = jest.spyOn(timer, "setTimer");
    spyNotifier = jest.spyOn(notifier, "notify");

    service = await prisma.service.create({
      data: {
        name: "Service",
        policy: {
          create: {
            name: "policy",
            policiesLevels: {
              create: {
                escalation: 1,
                level: {
                  create: {
                    name: "CS-1",
                    targets: { create: { type: ETargetType.EMAIL, contact: "bob@monster.inc" } },
                  },
                },
              },
            },
          },
        },
      },
    });

    incident = await prisma.incident.create({
      data: {
        message: "Alert",
        serviceId: service.id,
      },
    });
  });

  it("should not escalate when service is healthy", async () => {
    await aknowledgeTimeout(incident.id, timer, notifier);

    expect(spyTimer).toHaveBeenCalledTimes(0); // not called because service is healthy
    expect(spyNotifier).toHaveBeenCalledTimes(0); // not called because service is healthy
  });

  it("should not escalate when incident is aknowledged", async () => {
    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: EIncidentStatus.AKNOWLEDGED },
    });
    await aknowledgeTimeout(incident.id, timer, notifier);

    expect(spyTimer).toHaveBeenCalledTimes(0); // not called because incident is AKNOWLEDGED
    expect(spyNotifier).toHaveBeenCalledTimes(0); // not called because incident is AKNOWLEDGED
  });

  it("should not escalate when incident is closed", async () => {
    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: EIncidentStatus.CLOSED },
    });
    await aknowledgeTimeout(incident.id, timer, notifier);

    expect(spyTimer).toHaveBeenCalledTimes(0); // not called because incident is CLOSED
    expect(spyNotifier).toHaveBeenCalledTimes(0); // not called because incident is CLOSED
  });

  it("should escalate and notify when service is not healthy and incident is OPEN", async () => {
    await prisma.service.update({ where: { id: service.id }, data: { healthy: false } });
    await prisma.incident.update({
      where: { id: incident.id },
      data: { status: EIncidentStatus.OPEN },
    });

    await aknowledgeTimeout(incident.id, timer, notifier);

    expect(spyTimer).toHaveBeenCalledTimes(1);
    expect(spyNotifier).toHaveBeenCalledTimes(1);
  });
});
