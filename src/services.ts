import { Incident, PrismaClient, Service } from ".prisma/client";
import { NotifierAdapter, TimerAdapter } from "./adapters";
import { ETargetType, EIncidentStatus } from "./db/enums";

// If schema.prisma is updated, you will need to re-generate the PrismaClient
// to reflect new types/models with `npx prisma migrate`
const prisma = new PrismaClient();

// The controllers should have validated the following:
// - escalations are greather than 0
// - escalations are continuous
interface Target {
  type: ETargetType;
  contact: string;
}

interface Level {
  escalation: number;
  name: string;
  targets: Target[];
}

export const upsertPolicy = async (policyName: string, serviceName: string, levels: Level[]) => {
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

export const listIncidents = async (serviceId: number) => {
  const incidents = await prisma.incident.findMany({ where: { serviceId: serviceId } });
  return incidents;
};

export const closeIncident = async (incidentId: number) => {
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: { status: EIncidentStatus.CLOSED },
    include: { service: true },
  });
  let service = incident.service;

  const remainingIncidents = await prisma.incident.findMany({
    where: {
      NOT: { status: EIncidentStatus.CLOSED },
      serviceId: incident.serviceId,
    },
  });

  // If all incidents are closed, then set service to healthy state
  if (remainingIncidents.length === 0) {
    service = await prisma.service.update({
      where: { id: incident.serviceId },
      data: { healthy: true },
    });
  }

  return { incident, service };
};

export const aknowledgeIncident = async (incidentId: number, targetId: number) => {
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: { status: EIncidentStatus.AKNOWLEDGED, targetId: targetId },
  });

  return incident;
};

export const createIncident = async (
  message: string,
  serviceId: number,
  timer: TimerAdapter,
  notifier: NotifierAdapter
) => {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  const incident = await prisma.incident.create({
    data: {
      message: message,
      serviceId: serviceId,
      status: EIncidentStatus.OPEN,
    },
  });

  // Escalate and notify only healthy service
  if (service?.healthy) {
    escalateAndNotify(service, incident, timer, notifier);
  }

  return { incident, service };
};

// should prevent escalation to unknown policy
const escalateAndNotify = async (
  service: Service,
  incident: Incident,
  timer: TimerAdapter,
  notifier: NotifierAdapter
) => {
  // Set service status to unhealthy
  service = await prisma.service.update({
    where: { id: service.id },
    data: { healthy: false },
  });

  // Check if escalated policy exists
  const policy = await prisma.policyLevel.findFirst({
    where: { escalation: incident.escalation + 1, policyId: service.policyId },
    include: { level: { include: { targets: true } } },
  });

  // Should escalate because the escalted policy exists
  if (policy) {
    // Escalate incident (+ set updatedAt at now)
    await prisma.incident.update({
      where: { id: incident.id },
      data: { escalation: { increment: 1 } },
    });

    // Notify targets
    const targets = policy.level.targets || [];
    targets.forEach((target) => notifier.notify(target));

    // Trigger aknowldegement timeout in 15 minutes
    const now = incident.updatedAt.getTime();
    timer.setTimer(new Date(now + 15 * 60000), aknowledgeTimeout);
  }
};

export const aknowledgeTimeout = async (
  incidentId: number,
  timer: TimerAdapter,
  notifier: NotifierAdapter
) => {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { service: true },
  });
  if (!incident) {
    return;
  }

  const service = incident.service;

  // No escalation if the service already recovered
  if (service?.healthy) {
    return;
  }

  // No escalation if the incident is already aknowledged or closed
  if (
    incident.status === EIncidentStatus.AKNOWLEDGED ||
    incident.status === EIncidentStatus.CLOSED
  ) {
    return;
  }

  // Then escalate to next level
  escalateAndNotify(service, incident, timer, notifier);
};
