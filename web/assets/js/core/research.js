/**
 * Research summaries.
 *
 * Every entry is a real, well-replicated finding with the paper it comes from.
 * Links go to PubMed searches rather than DOIs so they resolve even if a
 * publisher moves things. Summaries are deliberately hedged where the evidence
 * is — "probably" and "for most people" are doing real work in this file.
 */

const pubmed = q => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`;

export const RESEARCH = [
  {
    id: 'frequency',
    topic: 'Training frequency',
    headline: 'Twice a week beats once, for the same weekly volume.',
    body:
      'A meta-analysis of studies comparing training frequencies found that hitting a muscle ' +
      'group twice a week produced more growth than once a week, when total weekly sets were ' +
      'held equal. Going from two to three times a week has not shown a clear further benefit ' +
      'once volume is matched — so the practical answer is at least twice, and after that it ' +
      'is about whatever you can recover from and stick to.',
    why: 'Every FEROX split hits each muscle group two to three times a week. This is the reason.',
    source: 'Schoenfeld, Ogborn & Krieger (2016), Sports Medicine',
    link: pubmed('Schoenfeld Ogborn Krieger effects of resistance training frequency muscle hypertrophy meta-analysis'),
  },
  {
    id: 'volume',
    topic: 'Training volume',
    headline: 'More weekly sets means more growth, up to a point.',
    body:
      'Across studies there is a dose–response relationship between weekly sets per muscle group ' +
      'and hypertrophy. Ten or more sets per muscle per week tends to outperform fewer. The curve ' +
      'flattens and eventually turns down as recovery becomes the limit, and where that happens ' +
      'varies a lot between people.',
    why: 'Set counts scale with your stated experience level rather than being fixed for everyone.',
    source: 'Schoenfeld, Ogborn & Krieger (2017), Journal of Sports Sciences',
    link: pubmed('Schoenfeld dose-response relationship between weekly resistance training volume and increases in muscle mass'),
  },
  {
    id: 'protein',
    topic: 'Protein',
    headline: 'About 1.6 g per kg of bodyweight. More than that adds little.',
    body:
      'A meta-analysis of protein supplementation found benefits to muscle and strength that ' +
      'plateaued around 1.6 g per kg per day, with a plausible upper bound nearer 2.2 g/kg. ' +
      'Going well beyond that is not harmful for healthy people, it just stops helping. In a ' +
      'calorie deficit the higher end is the safer bet, because protein is what protects muscle ' +
      'when energy is short.',
    why: 'FEROX sets protein at 1.8–2.3 g/kg depending on your season, highest during a cut.',
    source: 'Morton et al. (2018), British Journal of Sports Medicine',
    link: pubmed('Morton systematic review meta-analysis protein supplementation resistance training muscle mass strength'),
  },
  {
    id: 'deficit',
    topic: 'Cutting',
    headline: 'Lose slowly and keep lifting heavy, or you lose muscle too.',
    body:
      'Reviews of natural physique athletes converge on a moderate deficit — roughly 0.5–1% of ' +
      'bodyweight per week — with resistance training maintained at or near previous loads, and ' +
      'high protein. Aggressive deficits and dropping the weights to chase a burn both cost lean ' +
      'mass. Expect strength to stall during a cut; that is normal, not a sign of failure.',
    why: 'The Cut season runs a deficit of roughly 20%, keeps loads heavy and pushes protein highest.',
    source: 'Helms, Aragon & Fitschen (2014), Journal of the International Society of Sports Nutrition',
    link: pubmed('Helms Aragon Fitschen evidence-based recommendations natural bodybuilding contest preparation nutrition'),
  },
  {
    id: 'sleep',
    topic: 'Sleep',
    headline: 'Sleep is the most underrated training variable there is.',
    body:
      'When collegiate basketball players extended sleep toward ten hours a night, sprint times ' +
      'and shooting accuracy both improved, along with reaction time and mood. Separately, ' +
      'restricting sleep during a calorie deficit shifts the weight you lose away from fat and ' +
      'toward lean mass. No programme survives chronic short sleep.',
    why: 'Several seasons list sleep as something to watch. It is not filler.',
    source: 'Mah et al. (2011), Sleep · Nedeltcheva et al. (2010), Annals of Internal Medicine',
    link: pubmed('Mah effects of sleep extension on the athletic performance of collegiate basketball players'),
  },
  {
    id: 'proximity',
    topic: 'How hard to push',
    headline: 'Stopping a couple of reps short works about as well as failure.',
    body:
      'Sets taken close to failure — but not to it — produce similar growth to sets taken all the ' +
      'way, with less fatigue and a lower injury risk. That matters because fatigue is what limits ' +
      'how much total work you can do across a week, and weekly work is what drives growth.',
    why: 'Sessions prescribe reps in reserve rather than "go to failure", scaled to your experience.',
    source: 'Grgic et al. (2022), Journal of Sport and Health Science',
    link: pubmed('Grgic effects of resistance training performed to repetition failure or non-failure muscular strength hypertrophy'),
  },
  {
    id: 'rest',
    topic: 'Rest between sets',
    headline: 'Longer rests build more muscle, not less.',
    body:
      'The old advice to keep rests short for hypertrophy did not hold up. Three-minute rests ' +
      'produced greater strength and size gains than one-minute rests, most likely because you ' +
      'can do more quality work per set. Short rests are a conditioning tool, not a growth tool.',
    why: 'Compound lifts get 90–240 seconds depending on the season; strength blocks get the most.',
    source: 'Schoenfeld et al. (2016), Journal of Strength and Conditioning Research',
    link: pubmed('Schoenfeld longer interset rest periods enhance muscle strength hypertrophy resistance-trained men'),
  },
  {
    id: 'concurrent',
    topic: 'Lifting and cardio together',
    headline: 'Cardio only blunts your gains if you let it collide with lifting.',
    body:
      'Concurrent training can interfere with strength and size gains, and the effect gets worse ' +
      'with more frequent, longer, higher-intensity endurance work — running more than cycling. ' +
      'Separating hard sessions, keeping easy sessions genuinely easy, and not putting a hard run ' +
      'the day before a heavy leg session largely handles it.',
    why: 'The Hybrid season schedules hard days apart for exactly this reason.',
    source: 'Wilson et al. (2012), Journal of Strength and Conditioning Research',
    link: pubmed('Wilson concurrent training meta-analysis hypertrophy power strength adaptations'),
  },
  {
    id: 'creatine',
    topic: 'Creatine',
    headline: 'The most studied supplement in sport, and one of very few that works.',
    body:
      'Creatine monohydrate reliably improves performance in short, high-intensity efforts and ' +
      'supports gains in lean mass alongside training. Around 3–5 g a day is the standard dose, ' +
      'loading is optional, and the safety record in healthy adults is long. Most other ' +
      'supplements do not have evidence anywhere near this.',
    why: 'FEROX does not sell supplements and never will. This is here because people ask.',
    source: 'Kreider et al. (2017), Journal of the International Society of Sports Nutrition',
    link: pubmed('Kreider International Society of Sports Nutrition position stand safety efficacy creatine supplementation'),
  },
  {
    id: 'consistency',
    topic: 'Consistency',
    headline: 'Missing one session does not matter. Missing the habit does.',
    body:
      'Work on habit formation found that a single missed day had no measurable effect on the ' +
      'habit forming — what mattered was repetition over weeks. Automaticity took a median of ' +
      'about 66 days to plateau, with enormous variation between people and behaviours. The ' +
      'useful read: judge yourself on months, not days.',
    why: 'Streaks are shown to motivate, never to punish, and a scaled session still counts.',
    source: 'Lally et al. (2010), European Journal of Social Psychology',
    link: pubmed('Lally how are habits formed modelling habit formation in the real world'),
  },
];

export const researchById = id => RESEARCH.find(r => r.id === id) ?? null;
