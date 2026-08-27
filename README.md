# CDLC Workflow Record

A single reference for how the SkillCat Content Development Life Cycle is configured in
Jira, how it is meant to run, and how it got that way. Three views:

| View | What it holds |
| --- | --- |
| **Current state** | All 69 CDLC work types, the full set of statuses in each one's workflow, and how heavily each is used |
| **Change history** | 40 top-level changes across 90 tickets, November 2025 to August 2026, with before and after states |
| **The process** | The seven lifecycle stages, who owns each, what each triggers next, and where the SOP disagrees with Jira |

The views cross-link: a work type leads to the changes that touched it and to its process
stage, and back again.

## Reading it

The page is a single self-contained HTML file with no external dependencies, no build
step at view time, and no network calls. Open `index.html`, or use the published site.

**Two things it deliberately does not claim.**

Statuses are a **set, not a sequence**. The Jira endpoint this is built from returns which
statuses belong to a workflow, not the transitions between them or their order. Drawing the
arrows needs Jira administrator rights, which this was built without.

Usage counts are a **snapshot**, not a live feed. A public static site cannot authenticate
to Jira — Jira Cloud blocks cross-origin authenticated calls, and embedding an API token in
the page would expose it to every viewer. So the numbers are baked in and refreshed on a
schedule instead. See below.

## Layout

```
src/page.html   the source: a body fragment, also what gets published as the Claude artifact
build.mjs       wraps that fragment into a standalone index.html
index.html      built output — this is what GitHub Pages serves
scripts/        refresh-usage.mjs re-measures usage; redact.mjs swaps names for roles
.github/        the weekly refresh workflow
```

`src/page.html` is the only file to edit by hand. Everything else is generated.

```bash
node build.mjs      # rebuild index.html after editing src/page.html
```

## Refreshing the usage counts

`scripts/refresh-usage.mjs` asks Jira how many tickets each work type has, rewrites the
`USAGE` block in `src/page.html`, and updates the snapshot date. It runs server-side with
Basic auth, so none of the browser restrictions apply.

Locally:

```bash
JIRA_BASE_URL=https://skillcatapp.atlassian.net \
JIRA_EMAIL=you@skillcatapp.com \
JIRA_API_TOKEN=... \
node scripts/refresh-usage.mjs && node build.mjs
```

In CI it runs every Monday at 06:00 UTC and commits any change. It needs three repository
secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `JIRA_BASE_URL` | `https://skillcatapp.atlassian.net` |
| `JIRA_EMAIL` | the Atlassian account the token belongs to |
| `JIRA_API_TOKEN` | created at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) |

The token inherits that account's permissions, so use one with read access and nothing
more. It is never written into the page — only the resulting counts are.

## Names, and what is public

This repository is public, so this file, the page and the whole history are readable by
anyone who finds them. The page therefore carries **roles rather than people**: "the ID Team
Manager" instead of a name.

The name-to-role mapping is the sensitive part — a file pairing each person with their role
would publish exactly what the redaction removes — so it is **not committed**. It lives in
`redaction-map.json`, which is gitignored. `redaction-map.example.json` shows the shape.

```bash
cp redaction-map.example.json redaction-map.json   # then fill it in
node scripts/redact.mjs src/page.html              # roles replace names, in place
node build.mjs                                     # rebuild
```

The committed source is already redacted, so a normal `node build.mjs` is all CI needs.
`node build.mjs --redact` runs the pass again at build time as a net, for anyone working
from a named copy locally; without the map file it refuses rather than publishing names.
Building without `--redact` warns if it spots a name it recognises.

What is still public, by design: the process itself, the Jira instance name, roughly ninety
ticket IDs, and operational detail such as which work types are unused and where the SOP
contradicts Jira. The `noindex` tag asks search engines to stay away, which reduces
discovery but is not access control. If any of that is unwanted, the repository needs to be
private and served from a plan that supports private Pages.

## Sources

- Work types and statuses: Jira `/rest/api/3/project/CDLC/statuses`, live at build time
- Usage: Jira `/rest/api/3/search/approximate-count`, refreshed weekly
- Change history: reconstructed from the tickets under epic `SGP-9551`, since Jira keeps no
  audit trail of workflow configuration itself
- Process stages: CDLC Process Documentation v1.0, Content Team SOP, 30 May 2026
