# Pager system

Domain interfaces:

- Create escalation policy (policy name, service id, sets of targets)
- Close incident (mark service as healthy)
- Create incident (alert message, service id, DI start timer)
- Aknowledgement timeout (incident id)
- Aknowledge incident (target id, incident id)

## Migrations

`npx prisma migrate dev --name init`

## Browse db in web browser

`npx prisma studio`
