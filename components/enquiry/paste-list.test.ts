/**
 * Tests for Paste-a-list: the lines buyers paste, what each must become, and what an Add
 * does to the enquiry list (and the note it shows).
 * Uses Node's built-in runner (node:test), so it needs no test dependency; run it through a
 * TypeScript loader that maps "@/" and compiles the JSX in ./paste-list.tsx.
 */
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { IndexItem } from "@/lib/catalog-index";
import { enquiryList } from "@/lib/enquiry-list";
import { toAddInput } from "@/lib/enquiry-actions";
import { addPasted, addedNote, leftoverLines, lineText, parsePaste, unreadLines } from "./paste-list";

type Line = ReturnType<typeof parsePaste>[number];

const item = (id: string, name: string, molecule: string, form: string, strengths: string[]): IndexItem => ({
  id,
  name,
  molecule,
  form,
  strengths,
  category: null,
  availability: "in-stock",
  image: null,
});

const SILDENAFIL = ["25 mg", "50 mg", "100 mg", "120 mg", "130 mg", "150 mg", "200 mg"];
const TADALAFIL = ["2.5 mg", "5 mg", "10 mg", "20 mg", "40 mg", "60 mg", "80 mg"];

/** A slice of /api/catalog-index, with the names and strengths the live catalogue uses. */
const INDEX: IndexItem[] = [
  item("cenforce", "Cenforce", "Sildenafil Citrate", "Tablets", SILDENAFIL),
  item("cenforce-d", "Cenforce-D", "Sildenafil Citrate + Dapoxetine", "Tablets", ["On request"]),
  item("cenforce-soft-100", "Cenforce Soft 100", "Sildenafil Citrate", "Tablets", [...SILDENAFIL, "250 mg"]),
  item("kamagra", "Kamagra", "Sildenafil Citrate", "Tablets", ["25 mg", "50 mg", "100 mg"]),
  item("vidalista", "Vidalista", "Tadalafil", "Tablets", TADALAFIL),
  item("tadarise", "Tadarise", "Tadalafil", "Tablets", TADALAFIL),
  item("iverheal", "IVERHEAL", "Ivermectin", "Tablets", ["3 mg", "6 mg", "12 mg"]),
  item("iverheal-cream", "IVERHEAL", "Ivermectin", "Cream / Gel", ["1 % w/w (30 g)"]),
  item("deca-250", "DECA-250", "Nandrolone", "Injection", ["250 mg/ml"]),
  item("t3bix", "T3BIX", "Liothyronine (T3)", "Tablets", ["25 mcg"]),
  item("zunestar", "ZUNESTAR TABLETS", "Eszopiclone", "Tablets", ["3 mg"]),
  item("xyandrol", "XYANDROL", "Oxymetholone", "Tablets", ["50 mg"]),
];

const parse = (text: string) => parsePaste(text, INDEX);

/** What a line is added as: the matched product (null for a custom request), strength, packs. */
const added = (p: Line) => ({ product: p.match?.name ?? null, strength: p.strength, qty: p.qty });

/** Parses text that must give exactly one line. */
function one(text: string): Line {
  const lines = parse(text);
  assert.equal(lines.length, 1, `"${text}" gave ${lines.length} lines: ${JSON.stringify(lines.map((l) => l.raw))}`);
  return lines[0];
}

describe("parsePaste: quantities", () => {
  it("keeps thousands separators inside a quantity", () => {
    assert.deepEqual(added(one("Kamagra 100mg x 2,500")), { product: "Kamagra", strength: "100 mg", qty: 2500 });
    assert.deepEqual(added(one("Cenforce 100 x 1,000")), { product: "Cenforce", strength: "100 mg", qty: 1000 });
    assert.deepEqual(added(one("Vidalista 20 - 5,000 boxes")), { product: "Vidalista", strength: "20 mg", qty: 5000 });
  });

  it("reads a dash quantity after a hyphenated strength", () => {
    assert.deepEqual(added(one("Vidalista-20 - 500 boxes")), { product: "Vidalista", strength: "20 mg", qty: 500 });
  });

  for (const text of ["Cenforce 100 (20 boxes)", "Cenforce 100 qty 20", "20 x Cenforce 100"]) {
    it(`reads the quantity in "${text}"`, () => {
      assert.deepEqual(added(one(text)), { product: "Cenforce", strength: "100 mg", qty: 20 });
    });
  }

  it('reads "qty:" with a colon', () => {
    assert.deepEqual(added(one("Vidalista 20 qty: 50")), { product: "Vidalista", strength: "20 mg", qty: 50 });
  });

  it("gives a quantity on its own to the line before it", () => {
    assert.deepEqual(added(one("Cenforce 100, x 20")), { product: "Cenforce", strength: "100 mg", qty: 20 });
  });

  it("treats leading 1, 2, 3… as list numbering, not quantities", () => {
    assert.deepEqual(parse("1 Cenforce 100\n2 Vidalista 20").map(added), [
      { product: "Cenforce", strength: "100 mg", qty: undefined },
      { product: "Vidalista", strength: "20 mg", qty: undefined },
    ]);
  });
});

describe("parsePaste: strengths", () => {
  for (const text of ["Cenforce 50 mg, 100 mg", "Cenforce 50,100"]) {
    it(`reads "${text}" as two strengths of one product`, () => {
      assert.deepEqual(parse(text).map(added), [
        { product: "Cenforce", strength: "50 mg", qty: undefined },
        { product: "Cenforce", strength: "100 mg", qty: undefined },
      ]);
    });
  }

  it("matches a molecule with two strengths", () => {
    const lines = parse("Tadalafil 20mg, 40mg");
    assert.deepEqual(
      lines.map((p) => ({ molecule: p.match?.molecule ?? null, strength: p.strength, qty: p.qty })),
      [
        { molecule: "Tadalafil", strength: "20 mg", qty: undefined },
        { molecule: "Tadalafil", strength: "40 mg", qty: undefined },
      ],
    );
  });

  for (const text of ["Cenforce-100", "Cenforce100", "Cenforce 100 tablets", "Cenforce 100 mg 10x10"]) {
    it(`reads "${text}" as Cenforce 100 mg`, () => {
      assert.deepEqual(added(one(text)), { product: "Cenforce", strength: "100 mg", qty: undefined });
    });
  }

  it("keeps a strength the product doesn't list, as typed", () => {
    assert.deepEqual(added(one("Cenforce 300")), { product: "Cenforce", strength: "300", qty: undefined });
  });
});

describe("parsePaste: product names", () => {
  // Names with digits, hyphens or form words must not be read as a strength or a form.
  for (const [text, id] of [
    ["Cenforce D", "cenforce-d"],
    ["DECA-250", "deca-250"],
    ["T3BIX", "t3bix"],
    ["Zunestar Tablets", "zunestar"],
    ["Cenforce Soft 100", "cenforce-soft-100"],
  ]) {
    it(`matches "${text}" by its whole name`, () => {
      const p = one(text);
      assert.equal(p.match?.id, id);
      assert.equal(p.strength, null);
    });
  }

  it("prefers the product that offers the strength, and offers the others", () => {
    const p = one("Iverheal 12 mg");
    assert.equal(p.match?.id, "iverheal");
    assert.equal(p.strength, "12 mg");
    assert.deepEqual(
      p.options.map((o) => o.id),
      ["iverheal", "iverheal-cream"],
    );
  });

  it('does not read a lone "x 20" as the start of XYANDROL', () => {
    assert.equal(one("x 20").match, null);
  });
});

describe("parsePaste: suggestions and custom requests", () => {
  it("only suggests a product followed by words it can't read", () => {
    const p = one("Cenforce Professional 100");
    assert.equal(p.match, null);
    assert.equal(p.loose, true);
    assert.deepEqual(
      p.options.map((o) => o.name),
      ["Cenforce"],
    );
  });

  it("sends an unknown line as a custom request, without reading its number as a quantity", () => {
    const p = one("2 in 1 kit");
    assert.equal(p.match, null);
    assert.equal(p.name, "2 in 1 kit");
    assert.equal(p.qty, undefined);
  });
});

/**
 * addPasted and addedNote against the real enquiry-list store. It runs under node because
 * the store's localStorage write is in a try/catch; every case starts from an empty list.
 */
describe("addPasted: what an Add does to the list", () => {
  /** Store inputs for pasted text whose every line matches the catalogue. */
  const inputsOf = (t: string) => parse(t).map((p) => toAddInput(p.match!, p.strength, p.qty));
  /** The list as [name, strength, packs] rows, in order. */
  const rows = () => enquiryList.getSnapshot().items.map((i) => [i.name, i.strength, i.qty]);
  const CENFORCE = INDEX[0];

  beforeEach(() => enquiryList.clear());

  it("adds new lines and counts a strengthless line for a listed product as already listed", () => {
    enquiryList.add(toAddInput(CENFORCE, "100 mg"));
    const result = addPasted(inputsOf("Cenforce\nIVERHEAL 12 mg"));
    assert.deepEqual(result, { n: 1, custom: 0, updated: 0, dup: 1, cut: 0 });
    assert.equal(addedNote(result), "1 line added · 1 already in your list.");
  });

  it("gives a listed line the packs pasted for it", () => {
    enquiryList.add(toAddInput(CENFORCE, "100 mg"));
    const result = addPasted(inputsOf("Cenforce 100 x 50"));
    assert.deepEqual(result, { n: 0, custom: 0, updated: 1, dup: 0, cut: 0 });
    assert.deepEqual(rows(), [["Cenforce", "100 mg", 50]]);
  });

  it("gives packs pasted with no strength to a product listed on one line", () => {
    enquiryList.add(toAddInput(CENFORCE, "100 mg"));
    const result = addPasted(inputsOf("Cenforce x 20"));
    assert.deepEqual(result, { n: 0, custom: 0, updated: 1, dup: 0, cut: 0 });
    assert.deepEqual(rows(), [["Cenforce", "100 mg", 20]]);
    assert.equal(addedNote(result), "1 line updated to the packs you pasted.");
  });

  it("leaves a product listed on two lines alone when the packs name no strength", () => {
    enquiryList.addMany([toAddInput(CENFORCE, "100 mg"), toAddInput(CENFORCE, "50 mg")]);
    const result = addPasted(inputsOf("Cenforce x 20, IVERHEAL 12 mg x 3"));
    assert.deepEqual(result, { n: 1, custom: 0, updated: 0, dup: 1, cut: 0 });
    assert.deepEqual(rows(), [
      ["Cenforce", "100 mg", 1],
      ["Cenforce", "50 mg", 1],
      ["IVERHEAL", "12 mg", 3],
    ]);
  });

  it("does not update a product this paste gave a second strength", () => {
    enquiryList.add(toAddInput(CENFORCE, "100 mg"));
    const result = addPasted(inputsOf("Cenforce 50 x 10\nCenforce x 20"));
    assert.deepEqual(result, { n: 1, custom: 0, updated: 0, dup: 1, cut: 0 });
    assert.deepEqual(rows(), [
      ["Cenforce", "100 mg", 1],
      ["Cenforce", "50 mg", 10],
    ]);
  });

  it("lets the first pasted line for a listed line win, and counts an unchanged count as already listed", () => {
    enquiryList.add(toAddInput(CENFORCE, "100 mg"));
    const result = addPasted(inputsOf("Cenforce 100 x 1, Cenforce 100 x 9"));
    assert.deepEqual(result, { n: 0, custom: 0, updated: 0, dup: 2, cut: 0 });
    assert.deepEqual(rows(), [["Cenforce", "100 mg", 1]]);
  });

  it("reports lines cut by the list cap apart from listed lines it updated", () => {
    enquiryList.addMany(Array.from({ length: 99 }, (_, k) => toAddInput(CENFORCE, `${k} mg`)));
    const result = addPasted(inputsOf("IVERHEAL 12 mg, IVERHEAL 6 mg, Cenforce 1 mg x 7"));
    assert.deepEqual(result, { n: 1, custom: 0, updated: 1, dup: 0, cut: 1 });
    const list = rows();
    assert.equal(list.length, 100);
    assert.deepEqual(list[1], ["Cenforce", "1 mg", 7]);
    assert.deepEqual(list[99], ["IVERHEAL", "12 mg", 1]);
  });
});

describe("pasting more than the list can take: nothing is silently lost", () => {
  beforeEach(() => enquiryList.clear());

  it("reads only the first 100 lines and hands back the rest, with list numbering dropped", () => {
    const text = Array.from({ length: 130 }, (_, k) => `${k + 1} Custom product ${k}`).join("\n");
    assert.equal(parse(text).length, 100);
    const rest = unreadLines(text);
    assert.equal(rest.length, 30);
    assert.equal(rest[0], "Custom product 100");
    assert.deepEqual(unreadLines("Cenforce 100, Vidalista 20"), []);
  });

  it("keeps the lines the list cap cut, as text that reads back to the same lines", () => {
    enquiryList.addMany(Array.from({ length: 98 }, (_, k) => toAddInput(INDEX[0], `${k} mg`)));
    const lines = parse("Vidalista 20 x 5, Kamagra 100 mg x 3, IVERHEAL 12 mg, Tadarise 40 x 2");
    const inputs = lines.map((p) => toAddInput(p.match!, p.strength, p.qty));
    const result = addPasted(inputs);
    assert.equal(result.n, 2);
    assert.equal(result.cut, 2);
    const kept = leftoverLines(lines, inputs).map(lineText);
    assert.deepEqual(
      kept.map((t) => added(one(t))),
      [
        { product: "IVERHEAL", strength: "12 mg", qty: undefined },
        { product: "Tadarise", strength: "40 mg", qty: 2 },
      ],
    );
  });

  it("keeps nothing when every line was taken or was already listed", () => {
    enquiryList.add(toAddInput(INDEX[0], "100 mg"));
    const lines = parse("Cenforce, Vidalista 20 x 5");
    const inputs = lines.map((p) => toAddInput(p.match!, p.strength, p.qty));
    addPasted(inputs);
    assert.deepEqual(leftoverLines(lines, inputs), []);
  });
});
