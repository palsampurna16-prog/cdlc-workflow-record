#!/usr/bin/env node
// Rewrites data/worktypes.json statuses+workflow and data/transitions.json from
// data/jira-workflows-export.json, which is Jira's own workflow configuration.
// Usage counts, family and change references are preserved, they are not in the export.
import { readFile, writeFile } from "node:fs/promises";

const read = async f => JSON.parse(await readFile(new URL(`../data/${f}`, import.meta.url), "utf8"));
const X = await read("jira-workflows-export.json");
const W = await read("worktypes.json");
const { S, WF, M } = X;
const nm = id => S[id] ?? `?${id}`;

// [name, kind, from[], to]  ->  our shape.  i = initial, g = global, d = directed
const KIND = { i: "start", g: "any", d: "edge" };
const transitions = Object.fromEntries(Object.entries(WF).map(([w, ts]) => [w,
  ts.map(([label, k, from, to]) => {
    const kind = KIND[k] ?? "edge";
    if (kind === "start") return { kind, to: nm(to) };
    if (kind === "any")   return { kind, to: nm(to), label };
    return { kind, from: (from ?? []).map(nm), to: nm(to), label };
  })]));

const statusesOf = w => [...new Set((WF[w] ?? []).flatMap(([, f, t]) =>
  [...(f ?? []).map(nm), nm(t)]))];

let wfFixed = 0, stFixed = 0, unmapped = [];
const worktypes = W.map(t => {
  const wf = M[t.name];
  if (!wf) { unmapped.push(t.name); return t; }
  const st = statusesOf(wf);
  if (wf !== t.workflow) wfFixed++;
  if ([...new Set(t.statuses)].sort().join("|") !== [...st].sort().join("|")) stFixed++;
  return { ...t, workflow: wf, statuses: st };
});

await writeFile(new URL("../data/transitions.json", import.meta.url), JSON.stringify(transitions, null, 2) + "\n");
await writeFile(new URL("../data/worktypes.json", import.meta.url), JSON.stringify(worktypes, null, 2) + "\n");
console.log(`synced from export, ${Object.keys(transitions).length} workflows, ${worktypes.length} work types`);
console.log(`  workflow mappings corrected: ${wfFixed}`);
console.log(`  status sets corrected:       ${stFixed}`);
if (unmapped.length) console.log(`  not in export (left alone):  ${unmapped.join(", ")}`);
