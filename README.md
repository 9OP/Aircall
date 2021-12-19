# Pager system

- Stack: `TypeScript, Node, Prisma, Jest`
- Tools: `Eslint, Nodemon`

## Domain interfaces

- Create/edit escalation policy (policy name, service id, levels(= set of targets))
- Create/edit levels
- List incidents
- Close incident (mark service as healthy)
- Create incident (alert message, service id, DI start timer)
- Aknowledgement timeout (incident id)
- Aknowledge incident (target id, incident id)

## ER schema

## Setup

Install the project dependancies:

```sh
npm run install
```

Run the test suite:

```sh
npm run test
```

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

## Notes

- Data validation should be handled by the controllers, not the services (I would use json schema and AJV to validate data from clients). Thus, the pager domain interfaces
  expect the data to be validated / formatted correctly (escalations should be continuous and greater than 0).
- The ER schema could have been simplified even more (`PolicyLevel` table is not really required if levels have a fixed escalation rank, I prefered not to so that the same level (= set of targets) can be used as a different escalation depending on the policy)
- The `Service` table is not really part of the pager domain, we could have removed it and simply use a `serviceId` attribute instead.
- The main core entity of the pager domain is the `Incident`.
- Some adapters are mocked and passed as DI services for the sake of simplicity (the implementation is not required, but I had to mock the interfaces of adapters).
