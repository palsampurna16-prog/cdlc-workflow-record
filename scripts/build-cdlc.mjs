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
         "different numbers of subtasks depending how far along it is. Topic Corrections is the exception: no rule "+
         "creates it, it is added by hand whenever corrections are needed.",
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
      sub("Topic Corrections","CDLC: Topic Corrections",null,
          "Not automated. Created by hand under a Topic whenever corrections are needed."),
    ] },

  { id:"digitization", name:"Digitization Process", type:"Digitization - Data Sheet Creation", example:"CDLC-9301",
    blurb:"Closes the course. One ticket holding every step that turns finished content into a live product on SkillCat.",
    note:"Taken from the Jira automation rules. Moving the Epic to Digitization creates this ticket and seven of "+
         "its subtasks at once; the remaining five are chained off those. The container is typed Digitization - "+
         "Data Sheet Creation even though Data Sheet Creation is only one of the twelve steps inside it.",
    subtasks: [
      sub("Request Badge and Course Image","Digitization - Badge Creation (Sub-task)","CDLC-9302",
          "Created with the Digitization Process ticket."),
      sub("Upload to AWS + Planning","Digitization - Upload to AWS + Planning (sub-task)","CDLC-9303",
          "Created with the Digitization Process ticket."),
      sub("Review","Digitization - Review (sub-task)","CDLC-9304",
          "Created with the Digitization Process ticket."),
      sub("Restore on SkillCat","Digitization - Restore on SkillCat (sub-task)","CDLC-9305",
          "Created with the Digitization Process ticket."),
      sub("Create Data Sheet","Digitization - Data Sheet Creation (sub-task)","CDLC-9306",
          "Created with the Digitization Process ticket."),
      sub("Course Metadata","CDLC: Content Upkeep (sub-task)","CDLC-9307",
          "Created with the Digitization Process ticket."),
      sub("Create Course Introduction","CDLC: Content Upkeep (sub-task)","CDLC-9308",
          "Created with the Digitization Process ticket."),
      sub("QA – Generate Performance Report","CDLC: Generate Performance Report (sub-task)","CDLC-9405",
          "Created when Review is marked Done."),
      sub("Update Course Catalog","Digitization - Course Catalog Updating (sub-task)","CDLC-9516",
          "Created when Restore on SkillCat is marked Done."),
      sub("Run Image Archiving","CDLC: Run Image Archiving Automation (sub-task)","CDLC-9517",
          "Created when Restore on SkillCat is marked Done."),
      sub("Move Source Files","CDLC: Move Source Files (sub-task)","CDLC-9529",
          "Created when Run Image Archiving is marked Done."),
      sub("Restrict Course Folder","CDLC: Restrict Course Folder (sub-task)","CDLC-9591",
          "Created when Generate Performance Report is marked Done or Suspended."),
    ] },
];


const CERT_STAGES = [
  { id:"template-generation", name:"Template Generation", type:"Certification: Template Generation", example:null,
    blurb:"Opens a certification course. Created with the Epic, in place of Business Specs and Course Brief.",
    note:null, subtasks: [] },

  { id:"topic-cert", name:"Topic 1 … N", type:"CDLC: Topic", example:null,
    blurb:"The body of a certification course. Same Topic work type as other courses, but a different chain beneath it.",
    note:"Every subtask here is created by automation, each when the one before it is marked Done.",
    subtasks: [
      sub("Research Note","Certification: Research Note",null,
          "Created with the Topic itself."),
      sub("Slide Chunks","Certification: Slide Chunks",null,
          "Created when Research Note is marked Done."),
      sub("Graphic Definitions","Certification: Graphic Definitions",null,
          "Created when Slide Chunks is marked Done."),
      sub("PPT generation","CDLC: Topic PPT Generation",null,
          "Created when Graphic Definitions is marked Done."),
      sub("Articulate Creation","Certification: Articulate Creation",null,
          "Created when PPT generation is marked Done, for Certification courses only."),
      sub("Assessment","CDLC: Topic Assessment",null,
          "Created when Articulate Creation is marked Done."),
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
  branches: [
    { id:"instructional", label:"Instructional / Informational / Practical",
      stageIds: [...STAGES.map(s => s.id)] },
    { id:"certification", label:"Certification",
      stageIds: ["template-generation", "topic-cert", "digitization"] },
  ],
  stages: [...STAGES, ...CERT_STAGES].map(s => ({ ...s, ...join(s.type) })),
};

await writeFile(new URL("../data/cdlc-epic.json", import.meta.url), JSON.stringify(doc, null, 2) + "\n");

const subs = doc.stages.reduce((n, s) => n + s.subtasks.length, 0);
console.log(`built cdlc-epic.json — ${doc.stages.length} stages, ${subs} subtasks, ` +
            `${new Set(doc.stages.flatMap(s => s.subtasks.map(t => t.type))).size} distinct subtask types`);
