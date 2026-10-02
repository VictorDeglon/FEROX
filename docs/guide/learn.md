# Learn: the knowledge base

Docs → **Learn** is a hundred questions people ask a gym, answered in plain
language with the research behind each one. How to get abs. What a calorie
deficit is. What progressive overload means and how FEROX applies it. How much
protein, how deep to squat, whether fasted cardio does anything, why the scale
jumped a kilo overnight.

## Finding something

Type into the search box. It matches as you type, across the title, the
summary, the full text and a set of hidden tags written for the words people
actually use — "six pack" finds the abs entry, "1g per pound" finds the protein
entry, "bro split" finds the frequency entry. Every word you type has to appear
somewhere, so "protein cut" narrows to protein *during a cut* rather than
everything that mentions protein. Hits in the title or tags rank above hits
buried in the text.

The chips under the search box filter by topic — fat loss, building muscle,
strength, programming, nutrition, cardio, recovery, technique, habits — and the
**Used in FEROX** chip shows only the entries the app acts on.

## Reading an entry

Each card opens to show:

- **The answer**, a paragraph or two. Hedged where the evidence is hedged.
- **In FEROX**, where it applies: exactly how the app uses the idea. "Every
  split hits each muscle twice a week." "Protein is 2.3 g/kg in the Cut
  season." "The maintenance estimate refuses to run on fewer than 14 days of
  weigh-ins." These are the app's working theory written down in one place.
- **The evidence**: the paper or papers, with author, year and journal, each
  linking to a PubMed search so the link keeps working if a publisher moves
  things.

Opening a card puts its address in the URL bar — `docs.html#learn/abs`, say —
so a single entry can be sent to someone.

## What it is not

The entries are summaries of research, not the research, and not medical
advice. Exercise science mostly runs on small, short studies in young men, and
the honest summary of the field is that consistency over years beats
optimising any of it. The entries say so where it matters, and the
[research tab](../../web/docs.html#research) says it once more at the bottom.

## For whoever maintains it

The data lives in `web/assets/js/core/knowledge.js`. There are exactly a
hundred entries and `test/knowledge.test.js` holds it there, so adding one
means retiring one — the list is "the hundred that matter", not everything.
The test also checks that every entry has tags, a body of real length, at
least one citation with a year, and a PubMed link, and that each of the ten
short-list summaries in `core/research.js` is cited by at least one entry.
