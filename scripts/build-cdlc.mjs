#!/usr/bin/env node
// Builds data/cdlc-epic.json — the canonical shape of a CDLC course Epic.
//
// Structure and example keys come from two live epics: CDLC-8592 (in flight,
// four topics at four different stages) and CDLC-8999 (complete, so its
// digitization stage is fully populated). Statuses, workflows, usage counts and
// transition graphs are joined in from data/worktypes.json and data/transitions.json.
//
// Everything below the Epic bottoms out at sub-task level: Jira cannot nest
// beneath hierarchyLevel -1, and both leaf stages were confirmed childless.

import { readFile, writeFile } from "node:fs/promises";

const read = async f => JSON.parse(await readFile(new URL(`../data/${f}`, import.meta.url), "utf8"));
const W = await read("worktypes.json");
const T = await read("transitions.json");
const P = await read("process-doc.json");

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function join(name) {
  const w = W.find(x => x.name === name);
  if (!w) throw new Error(`work type not in worktypes.json: ${name}`);
  return { type: name, workflow: w.workflow, statuses: w.statuses,
           usage: w.usage, transitions: T[w.workflow] ?? [] };
}

const sub = (name, type, example, blurb) => ({ id: slug(name), name, example, blurb, ...join(type) });

const STAGES = [
  { id:"business-specs", name:"Business Specs & Outline", type:"Course: Specs", example:"CDLC-8593",
    blurb:"Opens the course. Produces the Scope Doc and Research Doc that everything downstream is built against.",
    note:"Jira describes this type as “Use this to create: Scope Doc & Research Doc”. The type is Course: Specs — "+
         "not the similarly-named CDLC: Course outline work type, which is not used here. It has no subtasks: "+
         "the whole stage is one ticket.",
    subtasks: [] },

  { id:"course-brief", name:"Course Brief", type:"CDLC: Course Brief", example:"CDLC-8594",
    blurb:"The briefing between Instructional Designer and SME, with the Video Director and QA Specialist present.",
    note:"The newest stage in the lifecycle — all 66 of its tickets were created within the last year. "+
         "Like Business Specs, it carries no subtasks.",
    subtasks: [] },

  { id:"topic", name:"Topic 1 … N", type:"CDLC: Topic", example:"CDLC-9313",
    blurb:"The body of the course. One Topic per teaching unit, each carrying the same four production subtasks. "+
          "The number of topics varies by course — the reference epic CDLC-8592 has four.",
    note:"Taken from the Jira automation rules, not from a sample. The chain is strictly sequential: "+
         "Final Slides → PPT generation → Base Articulate file → Graphics → Articulate Review, which then "+
         "creates Translations, Assessment, SME Review and External Review together. A Topic therefore carries "+
         "different numbers of subtasks depending how far along it is. CDLC: Topic Corrections is not listed: "+
         "it exists as a work type with 284 tickets, but no enabled rule creates it.",
    subtasks: [
      sub("Final Slides","CDLC: Topic Final Slides","CDLC-9314",
          "Created with the Topic itself."),
      sub("Graphic Definition","Sub-task",null,
          "Created with the Topic itself. Uses the generic Sub-task type — there is no work type for it."),
      sub("PPT generation","CDLC: Topic PPT Generation","CDLC-9595",
          "Created when Final Slides is marked Done."),
      sub("Base Articulate file","CDLC: Base Articulate file creation","CDLC-9596",
          "Created when PPT generation is marked Done, for Informational, Instructional, Interview and Practical courses only."),
      sub("Graphics","CDLC: Topic Graphics","CDLC-9594",
          "Created when the Base Articulate file is marked Done."),
      sub("Articulate Review","CDLC: Articulate Review",null,
          "Created when Graphics is marked Done."),
      sub("Translations","CDLC: Topic Translations",null,
          "Created when Articulate Review is marked Done."),
      sub("Assessment","CDLC: Topic Assessment","CDLC-9276",
          "Created when Articulate Review is marked Done."),
      sub("SME Review","CDLC: Content Review",null,
          "Created when Articulate Review is marked Done."),
      sub("External Review","CDLC: Content Review",null,
          "Created when Articulate Review is marked Done."),
    ] },

  { id:"digitization", name:"Digitization Process", type:"Digitization - Data Sheet Creation", example:"CDLC-9301",
    blurb:"Closes the course. One ticket holding every step that turns finished content into a live product on SkillCat.",
    note:"The container ticket is typed Digitization - Data Sheet Creation even though Data Sheet Creation is only "+
         "one of the twelve steps inside it — the type name understates what the ticket holds. Five of the twelve "+
         "subtasks borrow work types from outside the Digitization family.",
    subtasks: [
      sub("Request Badge and Course Image","Digitization - Badge Creation (Sub-task)","CDLC-9302",
          "Commissions the course badge and cover image."),
      sub("Upload to AWS + Planning","Digitization - Upload to AWS + Planning (sub-task)","CDLC-9303",
          "Moves the built course into AWS and plans its release."),
      sub("Review","Digitization - Review (sub-task)","CDLC-9304",
          "Checks the uploaded course before it is restored onto the platform."),
      sub("Restore on SkillCat","Digitization - Restore on SkillCat (sub-task)","CDLC-9305",
          "Puts the course onto SkillCat itself."),
      sub("Create Data Sheet","Digitization - Data Sheet Creation (sub-task)","CDLC-9306",
          "Produces the course data sheet."),
      sub("Course Metadata","CDLC: Content Upkeep (sub-task)","CDLC-9307",
          "Fills in the descriptive data the platform lists the course by."),
      sub("Create Course Introduction","CDLC: Content Upkeep (sub-task)","CDLC-9308",
          "Writes the course's introduction."),
      sub("QA – Generate Performance Report","CDLC: Generate Performance Report (sub-task)","CDLC-9405",
          "Generates the QA performance report for the finished course."),
      sub("Update Course Catalog","Digitization - Course Catalog Updating (sub-task)","CDLC-9516",
          "Adds the course to the catalog so learners can find it."),
      sub("Run Image Archiving","CDLC: Run Image Archiving Automation (sub-task)","CDLC-9517",
          "Runs the automation that archives the course's source images."),
      sub("Move Source Files","CDLC: Move Source Files (sub-task)","CDLC-9529",
          "Files the course's source material in its final location."),
      sub("Restrict Course Folder","CDLC: Restrict Course Folder (sub-task)","CDLC-9591",
          "Locks down the course folder now that the course is published."),
    ] },
];

const doc = {
  generated: new Date().toISOString().slice(0, 10),
  evidence: "CDLC-8592 (in-flight reference epic) and CDLC-8999 (complete epic, digitization stage)",
  bottomsOut: "Sub-task level. Jira cannot nest beneath hierarchyLevel -1, and both leaf stages were "+
              "confirmed to have no children.",
  epic: {
    name: "CDLC Epic", ...join("Epic"),
    blurb: "One Epic is one course. Everything needed to take that course from a business brief to a "+
           "published product hangs beneath it.",
  },
  courseTypeFork: P.courseTypeFork,
  sop: { version: P.version, effective: P.effective, status: P.status,
         stages: P.stages.map(({ n, name, owner, what, automation }) => ({ n, name, owner, what, automation })),
         roles: P.roles },
  stages: STAGES.map(s => ({ ...s, ...join(s.type) })),
};

await writeFile(new URL("../data/cdlc-epic.json", import.meta.url), JSON.stringify(doc, null, 2) + "\n");

const subs = doc.stages.reduce((n, s) => n + s.subtasks.length, 0);
console.log(`built cdlc-epic.json — ${doc.stages.length} stages, ${subs} subtasks, ` +
            `${new Set(doc.stages.flatMap(s => s.subtasks.map(t => t.type))).size} distinct subtask types`);
