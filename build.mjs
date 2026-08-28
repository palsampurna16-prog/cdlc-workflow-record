#!/usr/bin/env node
// Wraps src/page.html (a body fragment, which is also what gets published as the
// Claude artifact) into a complete standalone document at index.html for GitHub Pages.
// Keeping one source avoids the two copies drifting apart.

import { readFile, writeFile } from "node:fs/promises";
import { loadMap, redactWith, findNamesWith } from "./scripts/redact.mjs";

// --redact swaps named individuals for the role they hold. The committed source
// is already redacted; this is the net that catches anything added later.
const REDACT = process.argv.includes("--redact");

const SRC = new URL("./src/page.html", import.meta.url);
const OUT = new URL("./index.html", import.meta.url);

const DESCRIPTION =
  "How a CDLC course Epic is built in Jira: its workflow, every stage beneath it, " +
  "and every subtask beneath those, down to the bottom of the tree.";

let fragment = (await readFile(SRC, "utf8")).trim();

// src/page.html carries a placeholder rather than the data itself, so the source
// stays editable and data/ remains the single source of truth. Injected before
// redaction runs, so the redaction net covers the data too.
const cdlc = JSON.parse(await readFile(new URL("./data/cdlc-epic.json", import.meta.url), "utf8"));
const CDLC_RE = /\/\*__CDLC_EPIC__\*\/[\s\S]*?\/\*__END__\*\//;
if (!CDLC_RE.test(fragment)) {
  console.error("src/page.html is missing the /*__CDLC_EPIC__*/ placeholder — aborting rather than guessing.");
  process.exit(1);
}
fragment = fragment.replace(CDLC_RE, "/*__CDLC_EPIC__*/" + JSON.stringify(cdlc) + "/*__END__*/");

const changes = JSON.parse(await readFile(new URL("./data/changes.json", import.meta.url), "utf8"));
const CH_RE = /\/\*__CHANGES__\*\/[\s\S]*?\/\*__ENDC__\*\//;
if (!CH_RE.test(fragment)) {
  console.error("src/page.html is missing the /*__CHANGES__*/ placeholder — aborting.");
  process.exit(1);
}
fragment = fragment.replace(CH_RE, "/*__CHANGES__*/" + JSON.stringify(changes) + "/*__ENDC__*/");

const pairs = await loadMap();
if (REDACT) {
  if (!pairs) {
    console.error("--redact needs redaction-map.json (see redaction-map.example.json)");
    process.exit(1);
  }
  const { text, hits } = redactWith(fragment, pairs);
  fragment = text;
  console.log(`redacted ${hits} name reference${hits === 1 ? "" : "s"}`);
} else if (pairs) {
  const found = findNamesWith(fragment, pairs);
  if (found.length) {
    console.warn(`warning: source still names ${found.length} individual(s); build with --redact`);
  }
}

// Lift <title> out of the fragment so it sits in <head> where it belongs.
const titleMatch = fragment.match(/^<title>([\s\S]*?)<\/title>\s*/);
if (!titleMatch) throw new Error("src/page.html must begin with a <title> tag");
const title = titleMatch[1].trim();
const body = fragment.slice(titleMatch[0].length).trim();

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${DESCRIPTION}">
<!-- Internal reference. Asks well-behaved crawlers not to index this page.
     This is not access control: the repository is public and so is this file. -->
<meta name="robots" content="noindex, nofollow">
<style>:root { color-scheme: light dark; } body { margin: 0; }</style>
</head>
<body>
${body}
</body>
</html>
`;

await writeFile(OUT, html, "utf8");
console.log(`built index.html — ${html.length.toLocaleString()} bytes, title "${title}"`);
