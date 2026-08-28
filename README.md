# CDLC Workflow Record

A reference for how SkillCat's work is configured in Jira, styled as Jira itself.
Open the [published site](https://palsampurna16-prog.github.io/cdlc-workflow-record/),
or `index.html`.

## What's in it

The landing page lists the four Jira spaces this record covers — **CDLC**, **SGP**,
**CIP** and **QFT** — with their real management style and issue counts.

**CDLC is complete.** Opening it shows the CDLC Epic: one Epic is one course. You get
the Epic's own workflow, then every ticket that hangs beneath it, in work order:

```
Business Specs & Outline → Course Brief → Topic 1 … N → Digitization Process
                                          4 subtasks     12 subtasks
```

Every stage and every subtask has its own page carrying the work type, the workflow,
ticket counts, all statuses, and the workflow drawn as its real transition graph —
where a ticket starts, each labelled edge, and which statuses are reachable from
anywhere. 21 pages in all.

The tree bottoms out at sub-task level. Jira cannot nest beneath `hierarchyLevel -1`,
and both leaf stages were confirmed childless, so every leaf page says so rather than
just ending.

**SGP, CIP and QFT** show honest empty states. They are structurally unlike CDLC —
SGP and CIP use plain Epic/Task/Sub-task, and QFT has a single work type with no
hierarchy at all — so they need their own treatment rather than a copy of the CDLC page.

## Where the structure came from

Live Jira, not the SOP. `CDLC-8592` is the in-flight reference epic — four topics at four
different stages, so the whole pipeline is visible in one ticket. `CDLC-8999` is a
completed epic, used for the digitization stage, which only populates at the end.

## Layout

```
src/page.html          the source — a body fragment with a data placeholder
data/                  the content, and the single source of truth
  cdlc-epic.json         the canonical Epic shape (generated)
  worktypes.json         69 work types with statuses, workflow, usage
  transitions.json       47 workflow transition graphs
  changes.json           40 change tickets, Nov 2025 – Aug 2026
  process.json           7 SOP stages and 5 roles
  fields.json            6 field groups
  epic-reference.json    CDLC-8592 captured as-found
scripts/
  build-cdlc.mjs         rebuilds data/cdlc-epic.json from worktypes + transitions
  refresh-usage.mjs      re-measures usage counts against live Jira
  redact.mjs             swaps named individuals for the role they hold
build.mjs              injects the data and wraps src/page.html into index.html
index.html             built output — this is what GitHub Pages serves
```

Edit `src/page.html` or the files in `data/`. Everything else is generated.

```bash
node scripts/build-cdlc.mjs   # after changing the Epic model
node build.mjs                # always, to regenerate index.html
```

The build is deterministic: running it twice gives a byte-identical `index.html`.

## Refreshing usage counts

`scripts/refresh-usage.mjs` asks Jira how many tickets each work type has and rewrites
the `USAGE` block. It runs server-side with Basic auth, so browser CORS limits don't apply.

```bash
JIRA_BASE_URL=https://skillcatapp.atlassian.net \
JIRA_EMAIL=you@skillcatapp.com \
JIRA_API_TOKEN=... \
node scripts/refresh-usage.mjs && node build.mjs
```

In CI the same three values come from GitHub Secrets — see `.github/workflows/refresh.yml`.
That workflow has no schedule: without the secrets it would just fail weekly. Add them and
uncomment the schedule to run it automatically.

## Two things it does not claim

**Usage counts are a snapshot, not a live feed.** A public static site cannot authenticate
to Jira, and embedding a token would expose it to every viewer. The numbers are baked in at
build time and refreshed on demand.

**The page is a lookalike, not a connection.** It makes no network calls and cannot reach
Jira. Nothing here writes to Jira; the only automated job writes back to this repository.

## Still to do

- SGP, CIP and QFT contents
- A history tab, from `data/changes.json`
