// We have to use ts enums instead of Prisma enums, because sqlite does not support enums

export enum ETargetType {
  SMS,
  EMAIL,
}

export enum EIncidentStatus {
  OPEN, // when the incident is created
  AKNOWLEDGED, //  when a target aknowledged
  CLOSED, // when the incident is resolved
}
