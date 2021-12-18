// We have to use ts enums instead of Prisma enums, because sqlite does not support enums

enum ETargetType {
  SMS,
  EMAIL,
}

enum EIncidentStatus {
  OPEN,
  AKNOWLEDGED,
  CLOSED,
}
