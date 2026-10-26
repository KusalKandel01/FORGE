# Deploying FORGE to a real website

This app is a Next.js 16 PWA. One codebase serves the website and the
installable mobile app. Everything below uses free tiers only.

## What needs what

| Feature | Needs on the host |
| --- | --- |
| Site, PWA install, offline mode | Nothing. Works out of the box. |
| Free book search and reader (Gutendex, Open Library, Project Gutenberg) | Nothing. Public APIs. |
| Music player (YouTube playlists) | Nothing. |
| Steps, workouts, exercise tutor, progress, interval timer | Nothing. All data lives on the device and works offline. |
| Book writer, AI coach plans, Learn tutor lessons | `AI_API_KEY` (free key from Z.ai, see Step 3). |
| Cloud sync (FORGE sync codes across devices) | A hosted database: Turso (free, recommended). |

## Step 0: get the code onto GitHub

1. Download this project folder from the workspace (or export it) to your computer.
2. Create a free account at github.com, then a new empty repository named `forge` (private is fine).
3. From the project folder run:

```bash
git init
git add .
git commit -m "FORGE one-stop platform"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/forge.git
git push -u origin main
```

## Step 1: create the sync database on Turso (2 minutes)

Turso is free hosted SQLite, which is what the cloud sync feature needs on
serverless hosts. Skip this step if you only want the site and can live
without cross-device sync for now.

```bash
# Install the CLI: https://docs.turso.tech/cli/introduction
turso auth signup
turso db create forge
turso db show forge --url          # copy this: TURSO_DATABASE_URL
turso db tokens create forge       # copy this: TURSO_AUTH_TOKEN
```

Create the tables once (run from the project root, paste your values):

```bash
TURSO_DATABASE_URL=libsql://forge-YOURORG.turso.io \
TURSO_AUTH_TOKEN=YOUR_TOKEN \
bun scripts/turso-init.mjs
```

Already been using the app locally and want to keep your data? Copy it up
once:

```bash
TURSO_DATABASE_URL=libsql://forge-YOURORG.turso.io \
TURSO_AUTH_TOKEN=YOUR_TOKEN \
bun scripts/turso-copy.ts
```

## Step 2: pick a host

| Host | Free tier | Verdict for FORGE |
| --- | --- | --- |
| Vercel | Hobby plan, free forever, HTTPS included | Recommended. Made by the Next.js team, zero config. |
| Netlify | Free tier | Fine alternative, same steps. |
| Cloudflare Pages | Free tier | Fast, fine alternative. |
| Railway / Render / VPS | Trial credits or small monthly cost | Only needed if you insist on keeping the SQLite file instead of Turso. |

## Step 3: deploy on Vercel

1. Go to vercel.com and sign up with your GitHub account.
2. Click **Add New → Project** and import the `forge` repository.
3. Vercel detects Next.js automatically. Before clicking Deploy, open
   **Environment Variables** and add what you created earlier:

| Key | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | your libsql URL from step 1 |
| `TURSO_AUTH_TOKEN` | your Turso token |
| `AI_API_KEY` | your Z.ai key (see below) |
| `AI_BASE_URL` | `https://api.z.ai/api/paas/v4` |
| `AI_MODEL` | `glm-4.5-flash` |

4. Click **Deploy**. Two minutes later your site is live at
   `https://forge-yourname.vercel.app` with HTTPS.

Free AI: the recommended provider is **Z.ai** - create a free API key on
the Z.ai Open Platform, paste it as `AI_API_KEY`, and set `AI_BASE_URL` to
`https://api.z.ai/api/paas/v4` with `AI_MODEL=glm-4.5-flash`. That is the
same model family that powers FORGE in this workspace. Any
OpenAI-compatible provider also works (Groq, Google AI Studio, OpenAI,
OpenRouter).

Deploying on Netlify or Cloudflare Pages is the same idea: import the repo,
add the same environment variables, deploy.

## Step 4: verify the live site

Open your URL and check, in order:

- [ ] The site loads with the FORGE dark theme and volt accent.
- [ ] Steps, workouts and progress pages show zeros (fresh start, no demo data).
- [ ] Book search finds a public domain title and opens the reader.
- [ ] On your phone: open the site, use the browser menu, choose
      **Add to Home Screen**. The installed app opens full screen and works
      offline (airplane mode test: workouts and reading still work).
- [ ] Settings → Cloud Sync: create a sync code on one device, enter it on
      another, and watch progress appear on both.

## Mobile app without an app store (already built in)

FORGE is a PWA, so visiting the URL and choosing **Add to Home Screen**
installs it like a native app, with its own icon, full screen window, and
offline support. No store, no review process, no fee, works on Android,
iOS and desktop Chrome/Edge.

Optional later: wrap the same code with Capacitor to publish to the Play
Store or App Store. That is a build step, not a rewrite.

## Custom domain

In Vercel: Project → Settings → Domains → add `yourdomain.com`, point your
registrar's nameservers (or an A/CNAME record) as instructed. HTTPS is
issued automatically. A `.vercel.app` subdomain is free forever if you
skip this.

## Local development reminder

```bash
bun install        # runs prisma generate automatically
bun run dev        # http://localhost:3000
bun run db:push    # apply prisma/schema.prisma to the local SQLite file
```

Put `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env` and local dev
automatically talks to your Turso database instead of the local file -
same code path as production. `.env` values are documented in
`.env.example`.

## Database modes (how it works)

- No `TURSO_DATABASE_URL`: Prisma uses the local SQLite file at
  `DATABASE_URL`. Good for offline development.
- `TURSO_DATABASE_URL` set: Prisma talks to Turso through the libSQL
  driver adapter (`@prisma/adapter-libsql`). Sync buckets, devices,
  synced records and the shared real-photo cache all live in the cloud,
  shared by every device and every deployment.
