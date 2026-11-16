# ALI

A shared lunch-shopping and finance tracker for the group, replacing the old
spreadsheet.

- **Home**: what's happening now (vote / go shopping), your karma, your
  balance, and what the group is asking for most.
- **Members and profiles**: everyone's ALI karma and rank, favourite
  ingredients, standing order, and recent activity. Admins add members from
  the Members page (names from the team page are suggested; anyone else can
  be typed in).
- **ALI rounds**: opt in, vote on ingredients, then a tap-to-tick shopping
  list rounded to package sizes. Ticks are shared, so two people can shop
  from one list.
- **Receipt scanning**: photograph the Kassenbon after paying; every item and
  the total are read out, matched to ALI ingredients, and logged as your
  expense after you confirm.
- **Finance and stats**: balances, spending log, karma chart, trending
  ingredients.

See `docs/projet-idea.txt` for the original notes.

Stack: Next.js (App Router) on Vercel, Postgres (Neon in production),
Drizzle ORM, Auth.js (Credentials + JWT sessions), Resend for email, the Claude API for reading receipts, Radix UI
primitives with hand-authored CSS Modules (no Tailwind/component kit).

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, RESEND_API_KEY, EMAIL_FROM
npm run db:push        # apply the schema to your database
npm run seed -- "Admin Name" admin@example.com "a-strong-password"
npm run dev
```

`DATABASE_URL` accepts any Postgres connection string — a Neon database, or
a local Postgres for development. Two local options, pick one:

- **No Docker needed:** `npm run db:local` runs a real Postgres in the
  foreground (data persists in `.pgdata/`, gitignored). Use
  `postgresql://ali:ali@localhost:5432/ali` as `DATABASE_URL`.
- **Docker:** `docker compose up -d` starts the same thing via
  `docker-compose.yml`, same connection string.

Without a real `RESEND_API_KEY`, everything works except actually sending
invite/reset emails (the send fails loudly with an error rather than
silently pretending to succeed) — fine for just looking at the app locally,
but you'll want a real key before inviting anyone for real.

There's no public signup in Phase 1, so `npm run seed` is how you create the
first admin account; every other member is added by an admin from
`/admin/members`, which emails them an invite link.

## Database

Schema lives in `lib/db/schema.ts`. During active development, `npm run
db:push` syncs the database straight to the schema (fine for a solo/small
team). Once this ships to a real environment with real data, switch to
migrations instead: `npm run db:generate` to create a migration file, `npm
run db:migrate` to apply it — that path preserves data and is what should
run in CI/deploy rather than `db:push`.

## Testing

Type check and lint:

```bash
npx tsc --noEmit
npm run lint
```

End-to-end smoke tests (`tests/e2e/`) need a running dev server pointed at a
disposable database with a seeded admin:

```bash
DATABASE_URL=... npm run seed -- "Admin" admin@example.com password123
DATABASE_URL=... npm run dev &
npm run test:e2e
```

## Forecast and reviews

When someone opts into an ALI, their vote is pre-filled with what they will
probably want, and they can change anything. Two terms go into it
(`lib/ali/forecast.ts`, tested in `tests/unit/forecast.test.ts`):

- **Personal preference**: a recency-weighted average of what that person
  picked at their last 8 ALIs (each older ALI counts 0.7x the next), plus
  their standing order as one extra observation. Anything they'd more likely
  than not pick is pre-filled at the rounded amount.
- **Reviews**: after an ALI is completed, everyone who took part can mark
  each ingredient "too little / just right / too much" and leave a note. The
  recent average of those verdicts changes how much is bought next time by
  up to 25% either way, and the shopping list says so on the affected line.
  The notes and tallies are shown on the next ALI's page.

It is a transparent weighted formula, not a fitted regression: with a few
ALIs per person there isn't enough data to fit one honestly. The weights are
constants at the top of `lib/ali/forecast.ts`.

`npm run seed:ingredients` adds the group's usual shopping items to the
ingredient list (safe to run again).

## Security

- Passwords are stored as Argon2id hashes; invite and reset links are
  single-use, expire, and are stored hashed.
- No public sign-up: only an admin can add members.
- Sign-in, password-reset emails and receipt scans are throttled.
- Every page and action re-checks the account in the database, so someone
  marked as "left" loses access at once.
- Secrets live only in environment variables (`.env` is not in the repo).

## Trying it with demo data

To see profiles, karma and favourites filled in without waiting for real
ALIs, point the app at an empty database and seed it with made-up people:

```bash
DATABASE_URL=postgresql://ali:ali@localhost:5432/ali_demo npm run db:push
DATABASE_URL=postgresql://ali:ali@localhost:5432/ali_demo npm run seed:demo
DATABASE_URL=postgresql://ali:ali@localhost:5432/ali_demo npm run dev
# log in as admin@example.com / password123
```

`seed:demo` refuses to run on a database that already has users.

## Receipt scanning

Set `ANTHROPIC_API_KEY` to switch it on. The photo is shrunk in the browser,
sent to the Claude API for that one request, and not stored by this app; only
the extracted lines and total are saved, and only after the person reviews
them. Without a key the scan button is replaced by a note and expenses are
typed in by hand as before.

## Hosting: GitHub + Vercel

The code lives on GitHub; the site itself runs on Vercel, which deploys
automatically from the GitHub repo on every push. GitHub Pages alone can't
host this app: Pages only serves static files, and ALI needs a server and a
database for accounts, balances and receipt scanning.

1. Create an empty repository on GitHub and push this folder to it:
   ```bash
   git remote add origin git@github.com:<you>/ali.git
   git push -u origin main
   ```
2. On vercel.com choose "Add New… → Project", import the GitHub repo, and
   accept the detected Next.js settings.
3. In the Vercel project, add a Postgres database (Storage → Neon); this sets
   `DATABASE_URL` for you.
4. Add the environment variables: `AUTH_SECRET` (`openssl rand -base64 32`),
   `APP_URL` (the site's address, e.g. `https://ali-yourname.vercel.app`),
   `RESEND_API_KEY` and `EMAIL_FROM` (a domain verified in Resend) for
   invite emails, and optionally `ANTHROPIC_API_KEY` for receipt scanning.
5. Create the tables and the first admin from your own machine, pointing at
   the production database:
   ```bash
   DATABASE_URL="<the Neon connection string>" npm run db:push
   DATABASE_URL="<the Neon connection string>" npm run seed -- "Your Name" you@example.com "a-strong-password"
   DATABASE_URL="<the Neon connection string>" npm run seed:ingredients
   ```
   Use your real email and a long, unique password here: this account is
   reachable from the internet.
6. Log in and invite everyone else from the Members page.

After that, every `git push` to `main` goes live within a minute or two, and
`.github/workflows/ci.yml` type-checks, lints and builds each push.
