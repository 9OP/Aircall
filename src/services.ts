import { PrismaClient } from ".prisma/client";
import { ETargetType, EIncidentStatus } from "./db/enums";

// If schema.prisma is updated, you will need to re-generate the PrismaClient
// to reflect new types/models with `npx prisma migrate`
const prisma = new PrismaClient();

interface Target {
  type: ETargetType;
  contact: string;
}

interface Level {
  escalation: number;
  name: string;
  targets: Target[];
}

// update args to contain list of levels (wth escalation) and list of targets within
export const upsertPolicy = async (policyName: string, serviceName: string, levels: Level[]) => {
  // Data validation in the API controller, here we assume the data to be formated correctly

  const policy = await prisma.policy.upsert({
    where: { name: policyName },
    update: {}, // should update the services, the policiesLevels (escalation)
    create: {
      name: policyName,
      services: {
        // Connect or create if serviceName already exists or not
        connectOrCreate: { where: { name: serviceName }, create: { name: serviceName } },
      },
      policiesLevels: {
        create: levels.map((level) => ({
          escalation: level.escalation,
          level: {
            connectOrCreate: {
              // The existing level's targets is not updated if already existing
              where: { name: level.name },
              // Create targets if the level does not exist yet
              create: {
                name: level.name,
                targets: {
                  create: level.targets.map((target) => ({
                    contact: target.contact,
                    type: target.type,
                  })),
                },
              },
            },
          },
        })),
      },
    },
    // Multi-join on Service, PolicyLevel, Level and Target
    include: {
      services: true,
      policiesLevels: { include: { level: { include: { targets: true } } } },
    },
  });

  return policy;
};

// Update level targets

// Close incident (mark service as healthy)
export const closeIncident = async (incidentId: number) => {
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: { status: EIncidentStatus.CLOSED },
  });
  const service = await prisma.service.update({
    where: { id: incident.serviceId },
    data: { healthy: true },
  });

  return { incident, service };
};

// Create incident (alert message, service id, DI start timer)
export const createIncident = async (message: string, serviceId: number, timer: TimerAdapter) => {
  const incident = await prisma.incident.create({
    data: {
      message,
      serviceId,
    },
  });

  const now = new Date();
  const timeout = new Date(now.getTime() + 15 * 60000);
  timer.setTimer(timeout, aknowledgeTimeout);

  return incident;
};

// Aknowledgement timeout (incident id)
export const aknowledgeTimeout = async (incidentId: number) => {
  // escalate
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: { status: EIncidentStatus.OPEN, escalation: { increment: 1 } },
  });

  // do not escalate if service is healthy
  // do not send email or sms if healthy of aknowledge

  return incident;
};

// Aknowledge incident (target id, incident id)
export const aknowledgeIncident = async (incidentId: number, targetId: number) => {
  // should mark the target id of the arknowledger
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: { status: EIncidentStatus.AKNOWLEDGED },
  });

  return incident;
};
