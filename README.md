# Pager system

Domain interfaces:

- Create escalation policy (policy name, service id, sets of targets)
- Close incident (mark service as healthy)
- Create incident (alert message, service id, DI start timer)
- Aknowledgement timeout (incident id)
- Aknowledge incident (target id, incident id)

## Help

I am using Prisma for my data modeling _(https://www.prisma.io/)_. It is a super dev friendly next generation ORM.
You can **generate and seed** the SQLite database from the existing migration folder:

```sh
npx prisma migrate reset # it will prompt your confirmation (y)
```

You can also apply new migrations by modifying `src/db/schema.prisma` and running:

```sh
npx prisma migrate dev --name <MIGRATION_NAME>
```

You can launch the database web-based browser (super convenient, Prisma is a very nice tool indeed) via:

```sh
npx prisma studio # it should open your web browser automatically
```

## ER schema

## Notes

- Data validation should be handled by the controllers, not the services (I would use json schema and AJV to validate data from clients)
- The ER schema could have been simplified even more (`PolicyLevel` table is not really required if level have a fix escalation rank)
- The `Service` table is not really part of the pager domain, we could have removed it and simply use a `serviceId` attribute instead.
