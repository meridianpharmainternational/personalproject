/**
 * Search-matching tests: dose tokens must match whole numbers only, and the
 * relaxTokens fallback must only offer a rewrite that finds products.
 * Uses Node's built-in runner (node:test) through tsx, like the other tests.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { esterWord, hasAllTokens, hasToken, norm, relaxTokens, relevanceScore, tokenize } from "@/lib/search-text";

type Row = { name: string; molecule: string; form: string; strengths: string[]; category: string };

/** Same fields and order as buildUniverse() / prepare(). */
const hayOf = (r: Row) => norm([r.name, r.molecule, r.form, r.strengths.join(" "), r.category].join(" "));

const SILDENAFIL = ["25 mg", "50 mg", "100 mg", "120 mg", "130 mg", "150 mg", "200 mg"];
const TADALAFIL = ["2.5 mg", "5 mg", "10 mg", "20 mg", "40 mg", "60 mg", "80 mg"];

/** A slice of the live catalogue, with its real names and strengths. */
const ROWS: Row[] = [
  { name: "Cenforce", molecule: "Sildenafil Citrate", form: "Tablets", strengths: SILDENAFIL, category: "ED Medicines" },
  { name: "Cenforce Soft 100", molecule: "Sildenafil Citrate", form: "Tablets", strengths: ["100 mg"], category: "ED Medicines" },
  { name: "Viagra", molecule: "Sildenafil Citrate", form: "Tablets", strengths: ["50 mg", "100 mg"], category: "ED Medicines" },
  { name: "Vidalista", molecule: "Tadalafil", form: "Tablets", strengths: TADALAFIL, category: "ED Medicines" },
  { name: "ZOP", molecule: "Zopiclone", form: "Tablets", strengths: ["3.75 mg", "7.5 mg"], category: "Sleeping Aids" },
  { name: "ZOPIMAXX", molecule: "Zopiclone", form: "Tablets", strengths: ["20 mg", "25 mg"], category: "Sleeping Aids" },
  { name: "FEBENTEL", molecule: "Fenbendazole", form: "Tablets", strengths: ["150 mg", "250 mg"], category: "Anti-Parasitic" },
  { name: "IVERHEAL", molecule: "Ivermectin", form: "Tablets", strengths: ["3 mg", "6 mg", "12 mg"], category: "Anti-Parasitic" },
  { name: "TEST-E (Vial)", molecule: "Testosterone", form: "Injection", strengths: ["250 mg/ml"], category: "Injectables" },
  { name: "TESTO-C", molecule: "Testosterone", form: "Injection", strengths: ["250 mg/ml"], category: "Injectables" },
  { name: "NANDROLONE DECANOATE", molecule: "Nandrolone", form: "Injection", strengths: ["250 mg/ml"], category: "Injectables" },
  { name: "ARIMIBIX", molecule: "Anastrozole", form: "Tablets", strengths: ["1 mg"], category: "Oral Therapies" },
  { name: "MODAFIL", molecule: "Modafinil", form: "Tablets", strengths: ["100 mg", "200 mg"], category: "Wakefulness" },
  { name: "T3BIX", molecule: "Liothyronine (T3)", form: "Tablets", strengths: ["25 mcg"], category: "Oral Therapies" },
];
const HAYS = ROWS.map(hayOf);

/** Names of the rows a query matches, as every search surface filters. */
const search = (q: string) => {
  const tokens = tokenize(q);
  return ROWS.filter((_, i) => hasAllTokens(HAYS[i], tokens)).map((r) => r.name);
};

describe("hasToken", () => {
  it("keeps plain substring matching for words", () => {
    assert.equal(hasToken("sildenafil citrate", "sild"), true);
    assert.equal(hasToken("ivermectin", "mectin"), true);
    assert.equal(hasToken("liothyronine t3", "t3"), true);
  });

  it("matches a dose or number only where a number starts and ends", () => {
    assert.equal(hasToken("tablets 20mg", "20mg"), true);
    assert.equal(hasToken("120mg 20mg", "20mg"), true, "a later whole match still counts");
    assert.equal(hasToken("cenforce 20", "20"), true);
    assert.equal(hasToken("20mg", "20"), true);
    assert.equal(hasToken("250mg/ml", "250mg"), true);
    assert.equal(hasToken("2.5mg", "2.5mg"), true);
    assert.equal(hasToken("2.5mg", "2.5"), true);
  });

  it("does not match a dose inside a larger or decimal number", () => {
    assert.equal(hasToken("120mg", "20mg"), false);
    assert.equal(hasToken("2.5mg", "5mg"), false);
    assert.equal(hasToken("7.5mg", "5mg"), false);
    assert.equal(hasToken("25mg", "5mg"), false);
    assert.equal(hasToken("150mg 250mg", "50mg"), false);
    assert.equal(hasToken("120mg 200mg", "20"), false);
    assert.equal(hasToken("2.5mg", "2"), false);
    assert.equal(hasToken("12.5mg", "2.5mg"), false);
    assert.equal(hasToken("0.2mg", "2mg"), false);
  });
});

describe("search with dose tokens", () => {
  it("returns only products that list the dose", () => {
    assert.deepEqual(search("sildenafil 20mg"), []);
    assert.deepEqual(search("zopiclone 5mg"), []);
    assert.deepEqual(search("cenforce 20"), []);
    assert.deepEqual(search("50mg"), ["Cenforce", "Viagra"]);
    assert.deepEqual(search("tadalafil 20 mg"), ["Vidalista"]);
    assert.deepEqual(search("zopiclone 7.5mg"), ["ZOP"]);
    assert.deepEqual(search("cenforce100"), ["Cenforce", "Cenforce Soft 100"]);
  });
});

describe("relevanceScore", () => {
  it("keeps the typed molecule ahead of look-alikes when a form or dose is added", () => {
    const t = ["modafinil", "tablet"];
    const w = "modafinil tablets";
    assert.ok(relevanceScore("armo ash", "armodafinil", t, w) > relevanceScore("modafeel", "modafinil", t, w));
    assert.equal(relevanceScore("modafeel", "modafinil", t, w), 3);
    assert.equal(relevanceScore("x", "modafinil + armodafinil", t, w), 3);
  });

  it("ranks single-token queries as before", () => {
    assert.equal(relevanceScore("modafeel", "modafinil", ["modafinil"], "modafinil"), 3);
    assert.equal(relevanceScore("armo ash", "armodafinil", ["modafinil"], "modafinil"), 5);
  });

  it("ranks a product typed by its full name plus a dose above its molecule's look-alikes", () => {
    const ox = ["oxandrol", "10mg"];
    assert.equal(relevanceScore("oxandrol", "oxandrolone", ox, "oxandrol 10mg"), 1);
    assert.ok(relevanceScore("oxandrol", "oxandrolone", ox, "oxandrol 10mg") < relevanceScore("anavar", "oxandrolone", ox, "oxandrol 10mg"));
    const tc = ["test", "250mg"];
    assert.ok(relevanceScore("test c", "testosterone", tc, "test c 250mg") < relevanceScore("test e vial", "testosterone", tc, "test c 250mg"));
  });

  it("does not lift a shorter name when the next typed word is a variant letter", () => {
    assert.equal(relevanceScore("cenforce", "sildenafil citrate", ["cenforce"], "cenforce d"), 2);
    assert.equal(relevanceScore("cenforce d extra power", "sildenafil citrate dapoxetine", ["cenforce"], "cenforce d"), 1);
    assert.equal(relevanceScore("cenforce", "sildenafil citrate", ["cenforce", "100mg"], "cenforce 100mg"), 1);
  });
});

describe("relaxTokens", () => {
  const relax = (q: string) => relaxTokens(tokenize(q), HAYS)?.query ?? null;

  it("returns null when the query already matches", () => {
    assert.equal(relax("ivermectin"), null);
    assert.equal(relax("viagra"), null, "a brand the catalogue sells by name is not rewritten");
    assert.equal(relax("nandrolone decanoate"), null);
  });

  it("shortens a misspelt long word", () => {
    assert.equal(relax("ivermectine"), "ivermectin");
    assert.equal(relax("tadalafilo 20mg"), "tadalafil 20mg");
  });

  it("never offers a rewrite that still matches nothing", () => {
    assert.equal(relax("sildenafill 20mg"), null);
    assert.equal(relax("zopiclonee 5mg"), null);
  });

  it("maps a brand name to the molecule the catalogue lists", () => {
    assert.equal(relax("arimidex"), "anastrozole");
    assert.equal(relax("arimidexx"), "anastrozole");
    assert.equal(relax("cialis 20mg"), "tadalafil 20mg");
    assert.equal(relax("cialis tadalafil"), "tadalafil");
    assert.equal(relax("provigil"), "modafinil");
    assert.equal(relax("modalert 200mg"), "modafinil 200mg");
    assert.equal(relax("cialis 30mg"), null, "no tadalafil lists 30 mg");
    assert.equal(relax("lyrica"), null, "no pregabalin in this slice");
  });

  it("drops a salt or an ester no product carries", () => {
    assert.equal(relax("testosterone enanthate"), "testosterone");
    assert.equal(relax("testosterone cypionate 250mg"), "testosterone 250mg");
    assert.equal(relax("sildenafil hydrochloride"), "sildenafil");
    assert.equal(relax("sildenafil hcl 100 mg"), "sildenafil 100mg");
    assert.equal(relax("hydrochloride"), null, "nothing left to search");
    assert.equal(relax("enanthate"), null, "nothing left to search");
  });

  it("keeps an ester that tells listed products apart", () => {
    assert.equal(relax("testosterone decanoate"), null);
  });

  it("searches the ester once products carry it (esterWord)", () => {
    assert.equal(esterWord("Enanthate"), "enanthate");
    assert.equal(esterWord(" Phenylpropionate "), "phenylpropionate");
    assert.equal(esterWord("A long-acting testosterone ester for export."), null);
    assert.equal(esterWord(null), null);
    const withEster = [
      { ...ROWS[8], ester: "Enanthate" },
      { ...ROWS[9], ester: "Cypionate" },
    ].map((r) => norm([hayOf(r), esterWord(r.ester) ?? ""].join(" ")));
    const hays = [...HAYS, ...withEster];
    const matches = (q: string) => hays.filter((h) => hasAllTokens(h, tokenize(q))).length;
    assert.equal(matches("testosterone enanthate"), 1);
    assert.equal(relaxTokens(tokenize("testosterone cipionate"), hays)?.query, "testosterone cypionate");
    assert.equal(relaxTokens(tokenize("testosterone propionate"), hays)?.query, "testosterone", "no product carries it");
    assert.equal(relaxTokens(tokenize("nandrolone enanthate"), hays), null, "an ester other products carry is kept");
  });

  it("reports every change and never returns empty tokens", () => {
    const r = relaxTokens(tokenize("cialis hcl"), HAYS);
    assert.deepEqual(r, {
      tokens: ["tadalafil"],
      changes: [
        { from: "cialis", to: "tadalafil" },
        { from: "hcl", to: "" },
      ],
      query: "tadalafil",
    });
  });
});
