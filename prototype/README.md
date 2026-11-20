# SplitSmart

Create groups, add members, and record shared expenses. The dashboard shows each expense and the resulting balance for every member.

## Local setup

Use Node.js 22 and run these commands from the repository root.

```sh
cd prototype
npm ci
test -f .env || printf 'DATABASE_URL="file:./dev.db"\n' > .env
npx prisma db push
npm run dev
```

Open http://localhost:3000. The example URL stores SQLite data in `prisma/dev.db`. Keep your existing `.env` and database URL if you already have a database. The schema additions can be applied with `prisma db push` without resetting it or removing `EnvironmentCheck` records.

Expenses are split in integer cents. When the amount does not divide evenly, the earliest-added selected members each receive one extra cent of the cost until all cents are assigned.

Run `npm run lint` and `npm run build` from `prototype/`.
