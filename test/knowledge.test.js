import test from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE, CATEGORIES, searchKnowledge, knowledgeById, categoryLabel } from '../web/assets/js/core/knowledge.js';
import { RESEARCH } from '../web/assets/js/core/research.js';

test('there are exactly one hundred entries', () => {
  assert.equal(KNOWLEDGE.length, 100);
});

test('ids are unique, kebab-case, and categories are known', () => {
  const ids = new Set();
  for (const k of KNOWLEDGE) {
    assert.match(k.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, k.id);
    assert.ok(!ids.has(k.id), `duplicate id ${k.id}`);
    ids.add(k.id);
    assert.ok(CATEGORIES.some(c => c.id === k.cat), `${k.id}: unknown category ${k.cat}`);
  }
});

test('every entry is complete and every claim has at least one source', () => {
  for (const k of KNOWLEDGE) {
    assert.ok(k.title.length > 10, `${k.id}: title`);
    assert.ok(k.summary.length > 30, `${k.id}: summary`);
    assert.ok(k.body.length > 200, `${k.id}: body too thin`);
    assert.ok(k.tags.length >= 2, `${k.id}: needs search tags`);
    assert.ok(k.evidence.length >= 1, `${k.id}: no evidence`);
    for (const e of k.evidence) {
      assert.ok(/\(\d{4}\)/.test(e.cite), `${k.id}: citation needs a year — ${e.cite}`);
      assert.match(e.link, /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\?term=/, `${k.id}: link`);
    }
  }
});

test('every category has entries and a label', () => {
  for (const c of CATEGORIES) {
    assert.ok(KNOWLEDGE.some(k => k.cat === c.id), `${c.id} is empty`);
    assert.equal(categoryLabel(c.id), c.label);
  }
});

test('the ten research summaries are all represented in the knowledge base', () => {
  // research.js is the short list; everything on it should be findable here too.
  const titles = KNOWLEDGE.map(k => `${k.title} ${k.tags.join(' ')} ${k.body}`.toLowerCase()).join('\n');
  for (const r of RESEARCH) {
    const author = r.source.split(/[ ,(]/)[0].toLowerCase();
    const allCites = KNOWLEDGE.flatMap(k => k.evidence.map(e => e.cite.toLowerCase())).join('\n');
    assert.ok(allCites.includes(author), `research "${r.id}" (${author}) has no knowledge entry citing it`);
  }
  assert.ok(titles.length > 0);
});

test('about half the entries say how FEROX uses them', () => {
  const n = KNOWLEDGE.filter(k => k.ferox).length;
  assert.ok(n >= 40 && n <= 70, `${n} entries carry a FEROX note`);
});

test('search needs every word, ranks title and tag hits first, and respects the category filter', () => {
  assert.equal(searchKnowledge('').length, 100);
  assert.equal(searchKnowledge('abs')[0].id, 'abs');
  assert.equal(searchKnowledge('progressive overload')[0].id, 'progressive-overload');
  assert.equal(searchKnowledge('calorie deficit')[0].id, 'calorie-deficit');
  assert.equal(searchKnowledge('six pack')[0].id, 'abs', 'tags are searched');
  assert.ok(searchKnowledge('protein cut').some(k => k.id === 'protein-in-a-deficit'));
  assert.equal(searchKnowledge('xylophone').length, 0);
  for (const k of searchKnowledge('protein', { cat: 'nutrition' })) assert.equal(k.cat, 'nutrition');
  assert.equal(knowledgeById('creatine').cat, 'muscle');
  assert.equal(knowledgeById('nope'), null);
});
