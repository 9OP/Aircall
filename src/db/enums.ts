// We have to use ts enums instead of Prisma enums, because sqlite does not support enums

export enum ETargetType {
  SMS,
  EMAIL,
}

export enum EIncidentStatus {
  OPEN,
  AKNOWLEDGED,
  CLOSED,
}
