#!/usr/bin/env node
// Injects data/cdlc-epic.json into the CDLC placeholder in src/page.html.
// The page stays a self-contained fragment; data/ stays the single source of truth.
import { readFile, writeFile } from "node:fs/promises";

const tpl  = process.argv[2] ?? new URL("../src/page.html", import.meta.url).pathname;
const data = JSON.parse(await readFile(new URL("../data/cdlc-epic.json", import.meta.url), "utf8"));

let page = await readFile(tpl, "utf8");
const pattern = /\/\*__CDLC_EPIC__\*\/[\s\S]*?\/\*__END__\*\//;
if (!pattern.test(page)) {
  console.error("No /*__CDLC_EPIC__*/ placeholder in the page — aborting rather than guessing.");
  process.exit(1);
}
page = page.replace(pattern, "/*__CDLC_EPIC__*/" + JSON.stringify(data) + "/*__END__*/");
await writeFile(new URL("../src/page.html", import.meta.url), page, "utf8");
console.log(`embedded cdlc-epic.json — ${data.stages.length} stages`);
