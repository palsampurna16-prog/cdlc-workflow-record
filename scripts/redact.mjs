#!/usr/bin/env node
// Replaces named individuals with the role they hold.
//
// The repository is public, so the committed source carries roles rather than
// names. The mapping itself is deliberately NOT committed, a file pairing each
// name with their role would publish exactly what this removes. It lives in
// redaction-map.json, which is gitignored; redaction-map.example.json shows the
// shape. Only the mechanism is public.
//
//   node scripts/redact.mjs <file>          rewrite in place
//   node scripts/redact.mjs <in> <out>      write elsewhere
//
// Entries are applied in file order, so list longer forms before shorter ones
// ("Firstname Lastname" before "Firstname") and whole phrases before either.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const MAP_PATH = new URL("../redaction-map.json", import.meta.url);

export function mapAvailable() {
  return existsSync(MAP_PATH);
}

export async function loadMap() {
  if (!mapAvailable()) return null;
  const raw = JSON.parse(await readFile(MAP_PATH, "utf8"));
  if (!Array.isArray(raw)) throw new Error("redaction-map.json must be an array of [find, replace] pairs");
  return raw;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function redactWith(text, pairs) {
  let out = text;
  let hits = 0;
  for (const [name, role] of pairs) {
    const re = new RegExp(`\\b${escapeRe(name)}\\b`, "g");
    out = out.replace(re, () => {
      hits++;
      return role;
    });
  }
  // Recapitalise where a replacement landed at the start of a sentence or attribute.
  out = out.replace(/([.!?]\s+|>|")the ([A-Z])/g, (_m, lead, ch) => `${lead}The ${ch}`);
  return { text: out, hits };
}

export function findNamesWith(text, pairs) {
  return pairs.map(([name]) => name).filter((n) => new RegExp(`\\b${escapeRe(n)}\\b`).test(text));
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output] = process.argv.slice(2);
  if (!input) {
    console.error("usage: node scripts/redact.mjs <file> [out]");
    process.exit(1);
  }
  const pairs = await loadMap();
  if (!pairs) {
    console.error("redaction-map.json not found. Copy redaction-map.example.json and fill it in.");
    process.exit(1);
  }
  const src = await readFile(input, "utf8");
  const { text, hits } = redactWith(src, pairs);
  await writeFile(output ?? input, text, "utf8");
  const left = findNamesWith(text, pairs);
  console.log(`${hits} replacement${hits === 1 ? "" : "s"} -> ${output ?? input}`);
  if (left.length) {
    console.error(`still present: ${left.length} entr${left.length === 1 ? "y" : "ies"}`);
    process.exit(1);
  }
  console.log("no mapped names remain");
}
