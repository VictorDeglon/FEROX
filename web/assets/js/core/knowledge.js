/**
 * The knowledge base: a hundred things people ask a gym for, answered.
 *
 * There are exactly 100 entries and a test holds it there, so adding one
 * means retiring one. That is on purpose: the list is "the hundred that
 * matter", not everything anyone has ever asked.
 *
 * Every entry is a question somebody actually types — "how do I get abs",
 * "what is progressive overload" — with a plain answer, the papers it rests
 * on, and, where FEROX acts on it, a note saying exactly how. Entries with a
 * `ferox` field are the app's own working theory, written down in one place;
 * the docs page renders those with a badge so a reader can see which ideas
 * are built in and which are just good advice.
 *
 * Conventions, same as core/research.js:
 *  - Links are PubMed searches, not DOIs, so they keep resolving when a
 *    publisher moves things. `q` is the search string.
 *  - Summaries are hedged where the evidence is. "Probably" is doing work.
 *  - `tags` are the words somebody might search *instead* of the title. The
 *    search on the docs page matches title, summary, body and tags, so a tag
 *    only needs to cover vocabulary the text does not already contain.
 *
 * This is a data file. It has no DOM and no imports, so it is tested in node.
 */

export const pubmed = q => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`;

/** Categories, in the order the docs page lists them. */
export const CATEGORIES = [
  { id: 'fat-loss',   label: 'Fat loss' },
  { id: 'muscle',     label: 'Building muscle' },
  { id: 'strength',   label: 'Strength' },
  { id: 'programming',label: 'Programming' },
  { id: 'nutrition',  label: 'Nutrition' },
  { id: 'cardio',     label: 'Cardio & conditioning' },
  { id: 'recovery',   label: 'Recovery' },
  { id: 'technique',  label: 'Technique & safety' },
  { id: 'mindset',    label: 'Habits & mindset' },
];

const E = (cite, q) => ({ cite, q, link: pubmed(q) });

export const KNOWLEDGE = [

  /* ================================================================ fat loss */

  {
    id: 'calorie-deficit', cat: 'fat-loss',
    title: 'What a calorie deficit is, and why it is the only way fat comes off',
    tags: ['energy balance', 'cico', 'lose weight', 'how to lose fat', 'eat less'],
    summary: 'You lose fat when you burn more energy than you eat, over weeks. Everything else is a way of making that happen.',
    body:
      'Body fat is stored energy. It is only drawn down when the energy you take in from food is less than the ' +
      'energy you spend — resting metabolism, digestion, movement and training together. A deficit of roughly ' +
      '300–500 kcal a day is sustainable for most people and produces around 0.3–0.5 kg a week once water has settled. ' +
      'Low-carb, fasting, keto, "clean eating" and cardio all work exactly as far as they produce that deficit, and ' +
      'no further. Controlled feeding studies that hold calories equal find the same fat loss whichever foods ' +
      'supply them. The body does adapt to a deficit by spending a little less, which is why the loss slows, but it ' +
      'never reverses the arithmetic.',
    evidence: [
      E('Hall et al. (2012), American Journal of Clinical Nutrition — energy balance and body weight', 'Hall energy balance and its components implications for body weight regulation'),
      E('Hall & Guo (2017), Gastroenterology — obesity energetics and diet composition', 'Hall Guo obesity energetics body weight regulation and the effects of diet composition'),
    ],
    ferox: 'The Cut season sets intake about 20% under maintenance and caps the deficit so it never drops below resting metabolism. Checkpoints then measure the loss actually happening and offer a correction.',
  },
  {
    id: 'abs', cat: 'fat-loss',
    title: 'How to get visible abs',
    tags: ['six pack', 'core', 'crunches', 'belly fat', 'spot reduction', 'toning'],
    summary: 'Everyone has abs. They show when body fat is low enough — roughly 10–14% for men and 18–22% for women — and no amount of crunches changes that.',
    body:
      'The abdominal muscles sit under a layer of fat, and you cannot burn fat from one place by working the muscle ' +
      'beneath it. Six weeks of daily abdominal exercise in a controlled trial produced no change in belly fat at ' +
      'all; a trial of one-leg training found the fat came off the arms and trunk as much as the trained leg. Fat ' +
      'leaves the body in an order set by genetics, and for most people the lower belly goes last. So the recipe ' +
      'is: a calorie deficit for as long as it takes, enough protein and heavy lifting to keep muscle, and some ' +
      'direct ab work so that there is something to see when the fat is gone. The rest is patience.',
    evidence: [
      E('Vispute et al. (2011), Journal of Strength and Conditioning Research — abdominal exercise and abdominal fat', 'Vispute effect of abdominal exercise on abdominal fat'),
      E('Ramírez-Campillo et al. (2013), Journal of Strength and Conditioning Research — regional fat loss from single-leg training', 'Ramirez-Campillo regional fat changes induced by localized muscle endurance resistance training'),
    ],
  },
  {
    id: 'rate-of-loss', cat: 'fat-loss',
    title: 'How fast to lose weight',
    tags: ['how much per week', 'crash diet', 'aggressive cut', 'slow cut', 'muscle loss'],
    summary: 'About 0.5–1% of bodyweight a week. Faster than that and a growing share of what you lose is muscle.',
    body:
      'Athletes losing around 0.7% of bodyweight a week gained lean mass and strength while dieting; a group losing ' +
      '1.4% a week lost the same fat and no muscle gain at all. The slower rate costs more weeks but keeps the thing ' +
      'you were training for. Very aggressive deficits also drive hunger, poor sleep and bad sessions, which is ' +
      'usually what ends the diet. If you have a lot to lose the upper end is fine; the leaner you are, the slower ' +
      'you should go.',
    evidence: [
      E('Garthe et al. (2011), International Journal of Sport Nutrition and Exercise Metabolism — slow vs fast weight loss in athletes', 'Garthe effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes'),
    ],
    ferox: 'Weight checkpoints are set every fortnight at roughly this rate, and a calorie adjustment is never larger than 250 kcal.',
  },
  {
    id: 'protein-in-a-deficit', cat: 'fat-loss',
    title: 'Why protein goes up, not down, when you cut',
    tags: ['keep muscle', 'lean mass', 'high protein diet', 'cutting diet'],
    summary: 'In a deficit, high protein is what decides whether the weight you lose is fat or muscle.',
    body:
      'Two groups of young men ate a 40% deficit for four weeks and trained hard. The group at 2.4 g of protein per ' +
      'kilo lost more fat and actually gained lean mass; the group at 1.2 g/kg lost fat and held muscle but gained ' +
      'none. Protein is also the most filling macronutrient per calorie and costs the most energy to digest, so it ' +
      'helps with the two things that make a diet hard: hunger and the slowing metabolism. Aim for the top of the ' +
      'normal range — around 2 g/kg or a little more — when calories are short.',
    evidence: [
      E('Longland et al. (2016), American Journal of Clinical Nutrition — higher vs lower protein during energy deficit', 'Longland higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss'),
    ],
    ferox: 'Protein is set per kilo and is highest in the Cut season at 2.3 g/kg.',
  },
  {
    id: 'lift-while-cutting', cat: 'fat-loss',
    title: 'Keep lifting heavy while you diet',
    tags: ['cardio for fat loss', 'light weights high reps', 'cutting workout'],
    summary: 'Resistance training during a diet roughly halves the muscle you would otherwise lose. Do not swap it for cardio.',
    body:
      'When dieting, the muscle you already have is the thing most at risk, and the signal that tells the body to ' +
      'keep it is heavy lifting. Meta-analyses of diet-with-training versus diet-alone consistently find the ' +
      'training group loses as much fat and keeps far more lean mass. The common instinct — drop the weight, chase ' +
      'reps and a burn — removes exactly the stimulus that protects the muscle. Loads should stay close to what you ' +
      'lifted before the diet, with volume trimmed if recovery suffers. Expect strength to plateau; that is fine.',
    evidence: [
      E('Sardeli et al. (2018), Nutrients — resistance training prevents muscle loss during caloric restriction', 'Sardeli resistance training prevents muscle loss induced by caloric restriction in obese elderly individuals meta-analysis'),
      E('Helms, Aragon & Fitschen (2014), JISSN — contest preparation review', 'Helms Aragon Fitschen evidence-based recommendations natural bodybuilding contest preparation nutrition'),
    ],
    ferox: 'The Cut season keeps rep ranges and loads heavy and lists "Keep loads heavy" first in its emphasis.',
  },
  {
    id: 'neat', cat: 'fat-loss',
    title: 'NEAT: the calories you burn without training',
    tags: ['non-exercise activity', 'fidgeting', 'standing', 'daily movement', 'why am I not losing weight'],
    summary: 'Walking, standing, fidgeting and chores can differ by over 2,000 kcal a day between people. It is the biggest variable in energy out that you control.',
    body:
      'When volunteers were overfed by 1,000 kcal a day for eight weeks, the amount of fat they gained varied ' +
      'tenfold, and the difference was almost entirely explained by how much they moved outside the gym. Those who ' +
      'unconsciously stood, paced and fidgeted more gained the least. Formal exercise is typically 5–10% of a day\'s ' +
      'energy; movement outside it can be two or three times that. When a diet stalls, the usual culprit is that ' +
      'NEAT has quietly dropped — a tired body sits down more. Counting steps makes the drop visible.',
    evidence: [
      E('Levine, Eberhardt & Jensen (1999), Science — role of NEAT in resistance to fat gain', 'Levine role of nonexercise activity thermogenesis in resistance to fat gain in humans'),
    ],
  },
  {
    id: 'steps', cat: 'fat-loss',
    title: 'How many steps a day actually matter',
    tags: ['10000 steps', 'walking', 'step count'],
    summary: 'Benefits rise steeply up to about 7,000–8,000 steps a day and keep climbing more slowly past that. Ten thousand is a marketing number, but it is not a bad one.',
    body:
      'A pooled analysis of fifteen cohorts found mortality risk fell with each extra thousand steps and levelled ' +
      'off around 6,000–8,000 a day for older adults and 8,000–10,000 for younger ones. The original 10,000 figure ' +
      'came from a 1960s Japanese pedometer advert, not a study, but it happens to land near the top of the useful ' +
      'range. For fat loss, walking is the cheapest possible way to raise energy out without taxing recovery from ' +
      'lifting, and it is the one that people keep doing.',
    evidence: [
      E('Paluch et al. (2022), Lancet Public Health — daily steps and all-cause mortality meta-analysis', 'Paluch daily steps and all-cause mortality meta-analysis of 15 international cohorts'),
    ],
  },
  {
    id: 'metabolic-adaptation', cat: 'fat-loss',
    title: 'Why weight loss slows down, and whether your metabolism is "damaged"',
    tags: ['adaptive thermogenesis', 'plateau', 'starvation mode', 'metabolism slow'],
    summary: 'Your body spends less as you get lighter and leaner, by a few hundred calories at most. It never spends so little that a deficit stops working.',
    body:
      'A smaller body costs less to run, and on top of that a deficit lowers resting metabolism by a further ' +
      '100–300 kcal a day in most people — more in the extreme cases. Biggest Loser contestants were still spending ' +
      'around 500 kcal a day less than predicted six years later. That is real, and it is why the same intake that ' +
      'worked in month one stalls in month four. But "starvation mode" in the popular sense — eating too little ' +
      'makes you gain — does not exist; the men in the Minnesota semi-starvation experiment became skeletal on ' +
      '1,500 kcal. The fix for a stall is a smaller intake or more movement, a diet break, or both.',
    evidence: [
      E('Fothergill et al. (2016), Obesity — persistent metabolic adaptation six years after The Biggest Loser', 'Fothergill persistent metabolic adaptation 6 years after The Biggest Loser competition'),
      E('Müller et al. (2015), American Journal of Clinical Nutrition — metabolic adaptation revisited, Minnesota re-analysis', 'Muller metabolic adaptation to caloric restriction and subsequent refeeding the Minnesota Starvation Experiment revisited'),
    ],
    ferox: 'Maintenance is re-measured from your weigh-ins and food log rather than fixed at the day-one estimate, so the slowdown shows up as a smaller number instead of a mystery.',
  },
  {
    id: 'diet-breaks', cat: 'fat-loss',
    title: 'Diet breaks: two weeks at maintenance, on purpose',
    tags: ['refeed', 'maintenance phase', 'intermittent dieting', 'matador'],
    summary: 'Alternating two weeks in a deficit with two weeks at maintenance lost more fat than dieting straight through, with less metabolic slowdown.',
    body:
      'In the MATADOR trial, men who alternated fortnights of a 33% deficit with fortnights at maintenance lost ' +
      'about 50% more fat over the same number of deficit weeks than a group that dieted continuously, and kept more ' +
      'of it off six months later. Resting metabolism fell less. The breaks are not a licence to overeat — intake ' +
      'goes to measured maintenance, not above it — and they cost calendar time. For a long cut, a planned week or ' +
      'two at maintenance every six to eight weeks is a reasonable default.',
    evidence: [
      E('Byrne et al. (2018), International Journal of Obesity — the MATADOR study', 'Byrne intermittent energy restriction improves weight loss efficiency in obese men the MATADOR study'),
    ],
  },
  {
    id: 'refeeds', cat: 'fat-loss',
    title: 'Refeed days',
    tags: ['high carb day', 'cheat day', 'leptin'],
    summary: 'A day or two of higher carbs at maintenance helps training and keeps muscle a little better. The hormonal "reset" people promise is small.',
    body:
      'Trained lifters who took two consecutive maintenance-calorie, carbohydrate-focused days a week during a ' +
      'seven-week cut lost the same fat as continuous dieters and retained more lean mass and resting metabolism. ' +
      'Leptin rises briefly with a carbohydrate refeed and falls back within a day, so the main benefit is probably ' +
      'practical: full glycogen for the heavy sessions and a psychological break. A refeed is extra carbohydrate up ' +
      'to maintenance; it is not a cheat day, which usually erases the week\'s deficit in an afternoon.',
    evidence: [
      E('Campbell et al. (2020), Journal of Functional Morphology and Kinesiology — intermittent energy restriction in resistance-trained individuals', 'Campbell intermittent energy restriction attenuates the loss of fat free mass in resistance trained individuals'),
    ],
  },
  {
    id: 'scale-noise', cat: 'fat-loss',
    title: 'Why the scale jumps around, and how to read it',
    tags: ['weight fluctuation', 'water weight', 'weigh in', 'trend', 'daily weighing'],
    summary: 'Day-to-day weight moves by a kilo or two from water, salt, carbs and what is in your gut. Only the trend over weeks means anything.',
    body:
      'A gram of stored carbohydrate holds about three grams of water, a salty meal holds more, a hard session ' +
      'causes inflammation that holds more still, and the menstrual cycle can add two kilos. None of that is fat. ' +
      'Weigh at the same time under the same conditions, as often as daily — people who weigh more often lose more, ' +
      'because they see the trend sooner — and judge by a rolling average over two to three weeks. A single bad ' +
      'reading is information about yesterday\'s dinner, not about the diet.',
    evidence: [
      E('Zheng et al. (2015), Obesity — self-weighing frequency and weight outcomes, systematic review', 'Zheng self-weighing in weight management a systematic literature review'),
    ],
    ferox: 'The weight trend is a least-squares line through all your weigh-ins, never first-minus-last, and nothing is concluded from fewer than 14 days of readings.',
  },
  {
    id: 'exercise-alone', cat: 'fat-loss',
    title: 'Why exercise on its own is a weak way to lose weight',
    tags: ['outrun your fork', 'cardio to lose weight', 'burn calories'],
    summary: 'Exercise without a change in eating produces a few kilos at most over a year. Diet drives the deficit; training decides what the deficit is made of.',
    body:
      'A review of trials prescribing aerobic exercise with no diet change found an average loss of about 1.6 kg ' +
      'at a year, because an hour of hard cardio burns roughly what a muffin contains and most people eat a little ' +
      'more to compensate. That is not an argument against training — the fat-loss and health effects of exercise ' +
      'are real and the muscle-sparing effect of lifting is essential — it is an argument for not treating the ' +
      'treadmill as the lever. Eat for the deficit; train for the body you want to keep.',
    evidence: [
      E('Thorogood et al. (2011), American Journal of Medicine — isolated aerobic exercise and weight loss', 'Thorogood isolated aerobic exercise and weight loss a systematic review and meta-analysis of randomized controlled trials'),
    ],
  },
  {
    id: 'fasted-cardio', cat: 'fat-loss',
    title: 'Fasted cardio does not burn more fat',
    tags: ['empty stomach', 'morning cardio', 'fat burning zone'],
    summary: 'You burn more fat during a fasted session and less for the rest of the day. Over 24 hours it comes out the same.',
    body:
      'Fasted exercise does draw more on fat for fuel while it is happening. The body then burns proportionally more ' +
      'carbohydrate and less fat afterwards, so total fat oxidation across the day is unchanged. A four-week trial ' +
      'of fasted versus fed morning cardio under matched calories found identical fat loss. Train fasted if you ' +
      'prefer it and it does not hurt your sessions; eat first if you want to push harder. Neither choice moves the ' +
      'result.',
    evidence: [
      E('Schoenfeld et al. (2014), JISSN — body composition changes with fasted vs non-fasted aerobic exercise', 'Schoenfeld body composition changes associated with fasted versus non-fasted aerobic exercise'),
    ],
  },
  {
    id: 'intermittent-fasting', cat: 'fat-loss',
    title: 'Intermittent fasting works exactly as well as any other way of eating less',
    tags: ['16:8', 'time restricted eating', 'omad', 'skip breakfast', 'fasting'],
    summary: 'When calories are matched, fasting windows and ordinary diets lose the same weight. Pick whichever makes you eat less without noticing.',
    body:
      'A year-long trial of alternate-day fasting against daily calorie restriction found the same weight loss and ' +
      'a higher dropout rate in the fasting group. A trial of 16:8 time-restricted eating with no calorie target ' +
      'produced a small loss that was not different from controls — and a hint of extra lean mass loss. Fasting is ' +
      'a scheduling tool: some people find a shorter eating window makes under-eating effortless, others find it ' +
      'makes them ravenous and then overeat. There is no metabolic magic either way.',
    evidence: [
      E('Trepanowski et al. (2017), JAMA Internal Medicine — alternate-day fasting vs daily restriction', 'Trepanowski effect of alternate-day fasting on weight loss weight maintenance and cardioprotection'),
      E('Lowe et al. (2020), JAMA Internal Medicine — the TREAT trial', 'Lowe effects of time-restricted eating on weight loss and other metabolic parameters TREAT randomized clinical trial'),
    ],
  },
  {
    id: 'meal-frequency', cat: 'fat-loss',
    title: 'Meal frequency does not change your metabolism',
    tags: ['six small meals', 'stoke the fire', 'eating often', 'how many meals'],
    summary: 'Six small meals and two large ones burn the same energy. Eat on whatever schedule controls your hunger.',
    body:
      'The thermic effect of food is proportional to how much you eat, not how often. A meta-analysis found no ' +
      'effect of meal frequency on fat loss once a single outlier study was removed. Where frequency matters is ' +
      'protein: spreading intake across three or four meals is a little better for muscle than one or two, and for ' +
      'many people more meals means more opportunities to overeat. Choose the pattern you can keep.',
    evidence: [
      E('Schoenfeld, Aragon & Krieger (2015), Nutrition Reviews — meal frequency and weight loss meta-analysis', 'Schoenfeld Aragon Krieger effects of meal frequency on weight loss and body composition a meta-analysis'),
    ],
  },
  {
    id: 'low-carb-vs-low-fat', cat: 'fat-loss',
    title: 'Low carb or low fat? It does not matter for fat loss',
    tags: ['keto', 'carbs make you fat', 'insulin', 'which diet is best'],
    summary: 'Across a year, healthy low-carb and healthy low-fat diets lost the same weight. Genetics and insulin did not predict which suited whom.',
    body:
      'The DIETFITS trial randomised 609 adults to a healthy low-fat or a healthy low-carbohydrate diet for twelve ' +
      'months. Average loss was about 6 kg in both, with enormous spread inside each group and none of it explained ' +
      'by genotype or insulin secretion. Metabolic-ward studies comparing matched-calorie diets find tiny ' +
      'differences in fat loss that, if anything, favour higher carbohydrate. Carbohydrate restriction works for the ' +
      'people it works for because it reduces their intake; the insulin story is not what is doing it.',
    evidence: [
      E('Gardner et al. (2018), JAMA — the DIETFITS randomized trial', 'Gardner effect of low-fat vs low-carbohydrate diet on 12-month weight loss DIETFITS'),
      E('Hall & Guo (2017), Gastroenterology — diet composition and energy expenditure', 'Hall Guo obesity energetics body weight regulation and the effects of diet composition'),
    ],
    ferox: 'Diets in the profile — balanced, lower carb, keto, higher carb, high protein — change how calories are split, never the calorie target itself.',
  },
  {
    id: 'tracking-food', cat: 'fat-loss',
    title: 'Why logging food works, and why people under-count by a third',
    tags: ['food diary', 'calorie counting', 'self monitoring', 'macros'],
    summary: 'Self-monitoring is the single most consistent predictor of weight-loss success. Untrained estimates of intake are typically 20–50% low.',
    body:
      'Across dozens of trials, people who keep a food record lose more, and the more consistently they record the ' +
      'more they lose. The reason is not the arithmetic but attention: you cannot drift past a number you are ' +
      'looking at. The failure mode is accuracy. People who were certain they could not lose weight on 1,200 kcal ' +
      'were found, by doubly-labelled water, to be eating 2,000 — under-reporting by 47% while over-reporting ' +
      'activity by half. Weigh food for a couple of weeks until your eye is calibrated; after that, estimating is fine.',
    evidence: [
      E('Burke, Wang & Sevick (2011), Journal of the American Dietetic Association — self-monitoring in weight loss review', 'Burke self-monitoring in weight loss a systematic review of the literature'),
      E('Lichtman et al. (1992), New England Journal of Medicine — discrepancy between self-reported and actual intake', 'Lichtman discrepancy between self-reported and actual caloric intake and exercise in obese subjects'),
    ],
    ferox: 'The plate builder logs by grams or servings against a 450-food database, and the maintenance estimate explicitly refuses to run on fewer than 8 logged food days.',
  },
  {
    id: 'liquid-calories', cat: 'fat-loss',
    title: 'Drinks do not fill you up',
    tags: ['sugary drinks', 'juice', 'alcohol calories', 'smoothie', 'latte'],
    summary: 'Calories drunk barely register with appetite, so they get added to what you eat rather than replacing it.',
    body:
      'Volunteers given 450 kcal a day as jelly beans ate less at other meals and did not gain weight; the same ' +
      'calories as soft drink were not compensated for at all, and they gained. Liquid energy — juice, lattes, beer, ' +
      'sports drinks, smoothies — slips past the satiety system. Swapping drinks for water or anything without ' +
      'calories is the highest-return, lowest-effort change most people can make to a diet.',
    evidence: [
      E('DiMeglio & Mattes (2000), International Journal of Obesity — liquid vs solid carbohydrate', 'DiMeglio Mattes liquid versus solid carbohydrate effects on food intake and body weight'),
      E('Mourao et al. (2007), International Journal of Obesity — satiety from liquid and solid foods', 'Mourao effects of food form on appetite and energy intake in lean and obese young adults'),
    ],
  },
  {
    id: 'sugar', cat: 'fat-loss',
    title: 'Sugar makes you fat only through calories',
    tags: ['added sugar', 'fructose', 'is sugar bad', 'sweets'],
    summary: 'Swapping sugar for the same calories from other carbohydrate changes nothing. Swapping it for nothing does.',
    body:
      'A meta-analysis commissioned for the WHO found that adding sugar to the diet increases weight and removing it ' +
      'reduces weight — but that when sugar is exchanged for other carbohydrate at equal calories, body weight does ' +
      'not change. Sugar is easy to overconsume because it is palatable, calorie-dense and often liquid, which is a ' +
      'good reason to limit it. It is not a reason to fear a piece of fruit or the sugar in a flavoured yoghurt that ' +
      'fits your day.',
    evidence: [
      E('Te Morenga, Mallard & Mann (2013), BMJ — dietary sugars and body weight', 'Te Morenga dietary sugars and body weight systematic review and meta-analyses'),
    ],
  },
  {
    id: 'recomp', cat: 'fat-loss',
    title: 'Body recomposition: losing fat and gaining muscle at once',
    tags: ['recomp', 'maintenance', 'cut or bulk', 'skinny fat'],
    summary: 'Possible for beginners, people returning from a layoff, and the overweight. Rarer and slower the more trained and leaner you are.',
    body:
      'Fat and muscle respond to different signals — an energy deficit and a training stimulus — and in the right ' +
      'person both can run at once: new lifters, people with plenty of fat to spare, and anyone who used to be ' +
      'muscular. The ingredients are protein at the high end, calories at or very slightly under maintenance, and ' +
      'training that is progressing. The scale often does not move for months while clothes change, so measure ' +
      'strength and waist rather than weight. A trained, lean person is usually better off alternating a surplus and ' +
      'a deficit.',
    evidence: [
      E('Barakat et al. (2020), Strength and Conditioning Journal — body recomposition in trained individuals', 'Barakat body recomposition can trained individuals build muscle and lose fat at the same time'),
    ],
    ferox: 'The Recomp season holds calories at maintenance with protein high — the exact conditions above.',
  },
  {
    id: 'flexible-dieting', cat: 'fat-loss',
    title: 'Flexible beats rigid: why "nothing is forbidden" works better',
    tags: ['iifym', 'if it fits your macros', 'cheat meal', 'all or nothing', 'clean eating'],
    summary: 'People who treat foods as allowed-in-amounts rather than banned keep weight off better and binge less than those on strict rules.',
    body:
      'Rigid restraint — lists of forbidden foods, all-or-nothing days — is consistently associated with more ' +
      'overeating, more weight regain and more disordered eating than flexible restraint, where any food is fine ' +
      'inside a calorie and protein budget. A twenty-week comparison in trained adults found a flexible approach ' +
      'lost the same fat as a rigid one and recovered better afterwards. The practical version: hit protein and the ' +
      'calorie target, eat mostly whole food because it is filling, and let the remainder be whatever you like.',
    evidence: [
      E('Conlin et al. (2021), JISSN — flexible vs rigid dieting in resistance-trained individuals', 'Conlin flexible vs rigid dieting in resistance-trained individuals seeking to optimize their physiques'),
      E('Smith et al. (1999), Appetite — flexible vs rigid dieting strategies', 'Smith flexible vs rigid dieting strategies relationship with adverse behavioral outcomes'),
    ],
  },
  {
    id: 'satiety', cat: 'fat-loss',
    title: 'How to be less hungry on a diet',
    tags: ['hunger', 'appetite', 'full', 'fibre', 'volume eating', 'energy density'],
    summary: 'Protein, fibre, water-rich food and eating slowly all reduce how much you eat without you having to try.',
    body:
      'When volunteers were switched to a diet of 30% protein with no instruction to eat less, they spontaneously ate ' +
      '440 kcal a day fewer and lost weight. Low energy density — food with a lot of water and fibre per calorie, ' +
      'like vegetables, fruit, potatoes, lean meat, soups — lets you eat a large weight of food for few calories, ' +
      'and people eat a fairly constant weight. A controlled inpatient trial found people ate 500 kcal a day more on ' +
      'ultra-processed food than on matched unprocessed meals. Build meals around protein and plants and the deficit ' +
      'mostly takes care of itself.',
    evidence: [
      E('Weigle et al. (2005), American Journal of Clinical Nutrition — high-protein diet and spontaneous intake', 'Weigle high-protein diet induces sustained reductions in appetite ad libitum caloric intake and body weight'),
      E('Hall et al. (2019), Cell Metabolism — ultra-processed diets cause excess intake', 'Hall ultra-processed diets cause excess calorie intake and weight gain inpatient randomized controlled trial'),
    ],
  },

  /* ================================================================= muscle */

  {
    id: 'progressive-overload', cat: 'muscle',
    title: 'Progressive overload: the one rule of getting bigger and stronger',
    tags: ['add weight', 'more reps', 'how to progress', 'plateau'],
    summary: 'Muscle grows in response to doing more than it is used to. Add weight, reps or sets over time, or nothing changes.',
    body:
      'The body adapts to a demand and then stops adapting unless the demand rises. That rise can be weight on the ' +
      'bar, reps at the same weight, sets, or a harder version of the movement — a controlled trial found adding ' +
      'reps and adding load produced the same growth over eight weeks. What does not work is doing the same workout ' +
      'for a year. Track your lifts, and make sure the numbers trend up over months even when a single week does ' +
      'not. Beginners can progress every session; after a year or two, progress is counted in fortnights.',
    evidence: [
      E('Plotkin et al. (2022), PeerJ — progressive overload via load vs repetitions', 'Plotkin progressive overload without progressing load effects of exercise volume and intensity on hypertrophy and strength'),
      E('American College of Sports Medicine (2009) position stand — progression models in resistance training', 'American College of Sports Medicine position stand progression models in resistance training for healthy adults'),
    ],
    ferox: 'Every exercise carries a suggested load. Hit every prescribed rep and it goes up next session by one increment — two for lower-body barbell lifts. Miss by more than two reps and it holds or comes back.',
  },
  {
    id: 'mechanical-tension', cat: 'muscle',
    title: 'What actually makes a muscle grow',
    tags: ['hypertrophy mechanism', 'metabolic stress', 'muscle damage', 'pump', 'time under tension'],
    summary: 'Tension in the muscle fibres under load, close to their limit, is the primary signal. The pump and the soreness are side effects, not causes.',
    body:
      'The older idea was three drivers — mechanical tension, metabolic stress and muscle damage. The current view, ' +
      'after a decade of trying to isolate each, is that tension does the work: fibres that are recruited and ' +
      'contracting hard, for enough total reps per week, grow. That explains why heavy sets of five and lighter ' +
      'sets of twenty-five produce similar growth if both go near failure, why the pump is not required, and why ' +
      'soreness is a poor guide. Chase hard sets with good form across a full range; do not chase a feeling.',
    evidence: [
      E('Wackerhage et al. (2019), Journal of Applied Physiology — stimuli and sensors of hypertrophy', 'Wackerhage stimuli and sensors that initiate skeletal muscle hypertrophy following resistance exercise'),
    ],
  },
  {
    id: 'frequency', cat: 'muscle',
    title: 'Train each muscle at least twice a week',
    tags: ['bro split', 'how often', 'split routine', 'once a week'],
    summary: 'Hitting a muscle twice a week beats once for the same total sets. Beyond twice, it is mostly about how you prefer to spread the work.',
    body:
      'A meta-analysis comparing training frequencies with weekly volume held equal found twice-weekly ' +
      'significantly outgrew once-weekly. Three or more has not shown a clear further benefit at matched volume. ' +
      'The mechanism is that muscle protein synthesis after a session is elevated for a day or two; one hard session ' +
      'a week leaves five days with no signal. The traditional "chest day, back day" split is the single most common ' +
      'reason people train hard and stall.',
    evidence: [
      E('Schoenfeld, Ogborn & Krieger (2016), Sports Medicine — training frequency and hypertrophy meta-analysis', 'Schoenfeld Ogborn Krieger effects of resistance training frequency muscle hypertrophy meta-analysis'),
    ],
    ferox: 'Every split FEROX builds hits each muscle group two to three times a week. It is the first rule in the split builder.',
  },
  {
    id: 'volume', cat: 'muscle',
    title: 'How many sets a week',
    tags: ['sets per muscle', 'junk volume', 'how much training', 'dose response'],
    summary: 'Growth rises with weekly hard sets up to a point — around 10–20 per muscle for most — and then flattens or turns down as recovery runs out.',
    body:
      'There is a dose–response relationship between weekly sets per muscle group and growth. Ten or more sets ' +
      'outperform fewer; some studies find benefits into the twenties. The ceiling varies with training age, sleep, ' +
      'food and genetics, and the cost of going past it is fatigue that eats into every other session. Start around ' +
      'ten hard sets a week per muscle, and add a few when progress stalls and recovery is good — not before.',
    evidence: [
      E('Schoenfeld, Ogborn & Krieger (2017), Journal of Sports Sciences — dose–response of weekly volume', 'Schoenfeld dose-response relationship between weekly resistance training volume and increases in muscle mass'),
      E('Baz-Valle et al. (2022), Journal of Human Kinetics — weekly set volume meta-analysis', 'Baz-Valle a systematic review of the effects of different resistance training volumes on muscle hypertrophy'),
    ],
    ferox: 'Set counts scale with your stated experience, with today\'s readiness, and with the week of the block. A muscle that is lagging in the log gets a set added; one that is ahead does not.',
  },
  {
    id: 'rep-ranges', cat: 'muscle',
    title: 'Rep ranges: 5 to 30 all build muscle',
    tags: ['how many reps', 'hypertrophy range', '8-12', 'light weights', 'heavy weights'],
    summary: 'Anywhere from about 5 to 30 reps a set grows muscle equally if the set is taken near failure. Heavy builds more strength; light costs more fatigue.',
    body:
      'A meta-analysis comparing loads above and below 60% of max found similar hypertrophy and a clear strength ' +
      'advantage for heavy loads. The classic 8–12 range is not magic — it is simply the efficient middle, where ' +
      'sets are heavy enough to need few reps and light enough not to beat up the joints. Very light sets work but ' +
      'must go to the edge of failure and are miserable; very heavy sets work but accumulate joint stress. Use the ' +
      'middle for most work and the ends for variety and specific goals.',
    evidence: [
      E('Schoenfeld et al. (2017), Journal of Strength and Conditioning Research — low vs high load meta-analysis', 'Schoenfeld strength and hypertrophy adaptations between low- vs high-load resistance training a systematic review and meta-analysis'),
    ],
    ferox: 'Each season sets its own rep range: 1–5 in Iron Base, 6–12 in Winter Fire, 10–15 in Reset.',
  },
  {
    id: 'reps-in-reserve', cat: 'muscle',
    title: 'Reps in reserve: how close to failure to train',
    tags: ['rir', 'rpe', 'go to failure', 'how hard', 'leave reps in the tank'],
    summary: 'Stopping one to three reps short of failure grows muscle about as well as going all the way, with less fatigue and lower injury risk.',
    body:
      'Training to failure is not required for growth and makes recovery worse set for set. A review of ' +
      'failure-versus-non-failure trials found similar hypertrophy; strength actually favoured stopping short. ' +
      'Because fatigue limits how much quality work a week can hold, leaving a rep or two usually means more total ' +
      'productive sets. Use failure sparingly — last set of an isolation exercise, say — and never on a heavy ' +
      'barbell lift where a missed rep has consequences. Be honest, though: "two in reserve" for most beginners is ' +
      'closer to six.',
    evidence: [
      E('Grgic et al. (2022), Journal of Sport and Health Science — training to failure vs non-failure', 'Grgic effects of resistance training performed to repetition failure or non-failure muscular strength hypertrophy'),
      E('Refalo et al. (2023), Sports Medicine — proximity to failure and hypertrophy', 'Refalo influence of resistance training proximity-to-failure on skeletal muscle hypertrophy a systematic review with meta-analysis'),
    ],
    ferox: 'Sessions prescribe reps in reserve rather than failure — three for a beginner, one for someone very advanced — and the suggested weight is chosen to land there.',
  },
  {
    id: 'rest-between-sets', cat: 'muscle',
    title: 'Rest longer between sets than you think',
    tags: ['rest time', 'how long to rest', 'short rest', 'rest period'],
    summary: 'Three-minute rests produced more growth and strength than one-minute rests. Short rests are a conditioning tool, not a growth tool.',
    body:
      'The old advice to keep rests under a minute for hypertrophy came from hormone studies that did not pan out. ' +
      'Trained men resting three minutes outgrew and out-lifted those resting one, because they could do more work ' +
      'per set. The rule of thumb: rest until you can do the next set properly — two to three minutes on compound ' +
      'lifts, one to two on isolation work, more on heavy singles. If you are short on time, superset unrelated ' +
      'muscles rather than cutting rests.',
    evidence: [
      E('Schoenfeld et al. (2016), Journal of Strength and Conditioning Research — longer inter-set rest periods', 'Schoenfeld longer interset rest periods enhance muscle strength hypertrophy resistance-trained men'),
    ],
    ferox: 'Compound lifts rest 90–240 seconds depending on the season; isolation work rests 60.',
  },
  {
    id: 'mind-muscle', cat: 'muscle',
    title: 'Mind–muscle connection',
    tags: ['focus on the muscle', 'internal focus', 'feel the muscle'],
    summary: 'Thinking about the muscle rather than the weight increased biceps growth in one trial. Useful for isolation work; use external cues on heavy compounds.',
    body:
      'Trainees told to "squeeze the muscle" during curls grew their biceps about twice as much over eight weeks as ' +
      'those told to "get the weight up", with no difference in the quads on leg extensions. The internal focus ' +
      'seems to help on single-joint movements where you can plausibly steer which muscle does the work. On a squat ' +
      'or deadlift, an external cue — push the floor away, drive the bar up — produces better technique and more ' +
      'force, so save the introspection for the accessory work.',
    evidence: [
      E('Schoenfeld et al. (2018), European Journal of Sport Science — attentional focus and hypertrophy', 'Schoenfeld differential effects of attentional focus strategies during long-term resistance training'),
    ],
  },
  {
    id: 'range-of-motion', cat: 'muscle',
    title: 'Full range of motion, and why the stretched half matters most',
    tags: ['partial reps', 'lengthened partials', 'deep squat', 'rom', 'stretch'],
    summary: 'Full range beats partial range for growth, and the growth comes mostly from the stretched part of the movement. Go deep; do not cut the bottom.',
    body:
      'A meta-analysis found full-range training produced more hypertrophy than partials, and newer work shows the ' +
      'reason: training a muscle at long lengths — the bottom of a squat, the stretched position of a curl or ' +
      'calf raise — produces more growth than the same work at short lengths. Partial reps in the stretched half ' +
      'match or beat full range in several trials; partials at the top do not. Practical reading: get all the way ' +
      'down, pause there if anything, and treat the lockout as the least important part of the rep.',
    evidence: [
      E('Pallarés et al. (2021), Scandinavian Journal of Medicine & Science in Sports — range of motion meta-analysis', 'Pallares effects of range of motion on resistance training adaptations a systematic review and meta-analysis'),
      E('Pedrosa et al. (2022), European Journal of Sport Science — partial range at long muscle length', 'Pedrosa partial range of motion training elicits favorable improvements in muscular adaptations when carried out at long muscle lengths'),
    ],
  },
  {
    id: 'tempo', cat: 'muscle',
    title: 'Rep speed and time under tension',
    tags: ['slow reps', 'eccentric', 'negatives', 'tut', 'tempo training'],
    summary: 'Anything from half a second to about eight seconds a rep grows muscle the same. Deliberately slow reps mostly mean less weight.',
    body:
      'A review of rep-duration studies found no difference in hypertrophy across repetitions lasting 0.5 to 8 ' +
      'seconds, with very slow training (10 s or more per rep) inferior. Time under tension is not a target in ' +
      'itself; tension that is high enough is. Lower the weight under control, lift it with intent, and let the ' +
      'load determine the speed. Slow eccentrics have a place for learning a movement or working around a joint, ' +
      'not as a growth hack.',
    evidence: [
      E('Schoenfeld, Ogborn & Krieger (2015), Sports Medicine — repetition duration and hypertrophy', 'Schoenfeld effect of repetition duration during resistance training on muscle hypertrophy a systematic review and meta-analysis'),
    ],
    ferox: 'The Tempo season uses slow eccentrics as a deliberate skill-and-joint block, not as the main way to grow.',
  },
  {
    id: 'compound-vs-isolation', cat: 'muscle',
    title: 'Compound lifts first; isolation to fill the gaps',
    tags: ['big lifts', 'accessories', 'curls', 'squat bench deadlift', 'do I need isolation'],
    summary: 'Multi-joint lifts give the most muscle per minute. Adding isolation work on top helps the muscles the big lifts miss; it does not replace them.',
    body:
      'A trial comparing a programme of compound lifts alone against the same lifts plus isolation exercises found ' +
      'no extra growth from the additions in untrained men over eight weeks, and a review of the question ' +
      'concludes that compounds are the efficient core. Isolation work still earns its place for muscles that are ' +
      'hard to load in a compound lift — lateral delts, calves, biceps, hamstrings in knee flexion — and for ' +
      'bringing up a lagging body part. Build around the big movements, then add what the log says is missing.',
    evidence: [
      E('Gentil et al. (2015), Asian Journal of Sports Medicine — single vs multi-joint exercises', 'Gentil effects of equal-volume resistance training performed with single-joint and multi-joint exercises'),
      E('Paoli et al. (2017), Frontiers in Physiology — multi-joint vs multi-joint plus single-joint', 'Paoli resistance training with single vs multi-joint exercises at equal total load volume'),
    ],
    ferox: 'Each training day is filled by movement pattern — press, pull, hinge, squat — before accessories, so a muscle is never trained only by its isolation exercise.',
  },
  {
    id: 'exercise-order', cat: 'muscle',
    title: 'Do what matters most first',
    tags: ['workout order', 'which exercise first', 'priority'],
    summary: 'Whatever you do first in a session gets the best performance and the most growth. Put your priority lift at the front.',
    body:
      'A meta-analysis of exercise-order studies found that strength improves most in whichever exercise is ' +
      'performed first, and hypertrophy follows the same pattern with a smaller effect. The conventional ' +
      '"compounds before isolation" rule is sensible for safety and for the big lifts, but if your arms are the ' +
      'thing you want to grow, curling before squatting on an arm-priority day is a legitimate choice. Order ' +
      'expresses priority; be deliberate about it.',
    evidence: [
      E('Nunes et al. (2021), Journal of Sports Sciences — exercise order and strength and hypertrophy', 'Nunes what influence does resistance exercise order have on muscular strength gains and muscle hypertrophy a systematic review and meta-analysis'),
    ],
  },
  {
    id: 'exercise-variation', cat: 'muscle',
    title: 'Muscle confusion is a myth, but some variety helps',
    tags: ['change workout', 'muscle confusion', 'same exercises', 'how often to change'],
    summary: 'Rotating exercises for the same muscle grew it a little more evenly than one exercise; changing everything every week just interrupts progression.',
    body:
      'Training the quads with a mix of squat variations produced more uniform growth across the heads of the ' +
      'muscle than the back squat alone, at equal volume. But the muscle does not get "confused" — it adapts to ' +
      'load, and constant novelty prevents you from loading anything progressively because every week is a new ' +
      'skill. The useful version: keep two or three movements per muscle for a block of eight to twelve weeks, ' +
      'progress them, then rotate a few at the next block.',
    evidence: [
      E('Fonseca et al. (2014), Journal of Strength and Conditioning Research — exercise variation and quadriceps hypertrophy', 'Fonseca changes in exercises are more effective than in loading schemes to improve muscle strength'),
      E('Kassiano et al. (2022), Journal of Strength and Conditioning Research — exercise variation review', 'Kassiano which ROMs lead to Rome a systematic review of the effects of range of motion on muscle hypertrophy'),
    ],
    ferox: 'Seasons are 2–4 month blocks. Exercises change at the boundary, not inside it, so a load progression has time to run.',
  },
  {
    id: 'soreness', cat: 'muscle',
    title: 'Soreness is not the goal',
    tags: ['doms', 'not sore', 'did I train hard enough', 'muscle damage'],
    summary: 'Delayed soreness mostly means something was new. It is a poor measure of a good session and growth happens without it.',
    body:
      'Volunteers who were eased into cycling-based leg training so that they never got sore gained the same ' +
      'muscle as a group that was thrown in and hurt for weeks. Soreness peaks when a movement is unfamiliar or ' +
      'heavily eccentric and fades as you repeat it — the repeated-bout effect — while growth continues. If you are ' +
      'progressing in the log you trained hard enough; if you are so sore the next session suffers, you did too much ' +
      'too soon.',
    evidence: [
      E('Flann et al. (2011), Journal of Experimental Biology — muscle hypertrophy without damage', 'Flann muscle damage and muscle remodeling no pain no gain'),
      E('Damas et al. (2016), Journal of Physiology — early hypertrophy and muscle damage', 'Damas resistance training-induced changes in integrated myofibrillar protein synthesis are related to hypertrophy only after attenuation of muscle damage'),
    ],
  },
  {
    id: 'newbie-gains', cat: 'muscle',
    title: 'Newbie gains, and why the first month\'s "size" is mostly swelling',
    tags: ['beginner gains', 'first year', 'how much muscle can I gain', 'rate of muscle gain'],
    summary: 'Beginners can add several kilos of muscle in year one. Much of the very early change is water and swelling; real tissue follows from week four or so.',
    body:
      'Muscle protein synthesis is highest in the first weeks of training, but so is muscle damage, and the ' +
      'thickening visible in the first three weeks is largely oedema. Real growth tracks synthesis only once the ' +
      'damage response has calmed, around week three to four. The realistic rate of gain for a man is about ' +
      '0.5–1 kg of muscle a month in the first year, half that in the second, and less again after — women about ' +
      'half those figures. Anyone promising more is selling a surplus of body fat.',
    evidence: [
      E('Damas et al. (2016), Journal of Physiology — time course of hypertrophy and oedema', 'Damas resistance training-induced changes in integrated myofibrillar protein synthesis are related to hypertrophy only after attenuation of muscle damage'),
    ],
    ferox: 'Week one of a block runs about 15% above steady state because that is when motivation is highest, then settles by week four — when the real growth is starting.',
  },
  {
    id: 'muscle-memory', cat: 'muscle',
    title: 'Muscle memory is real',
    tags: ['taking a break', 'detraining', 'coming back', 'lose muscle', 'layoff'],
    summary: 'Muscle you have had before comes back far faster than it was built. Nuclei gained from training persist through long layoffs.',
    body:
      'Muscle fibres acquire extra nuclei when they grow, and in animal studies those nuclei survive months of ' +
      'disuse and atrophy. Humans retraining after a break regain size and strength in a fraction of the original ' +
      'time. Strength holds up for two to three weeks of complete rest with almost no loss; size begins to drop ' +
      'after about three or four. The practical point is that a holiday, an illness or a busy month costs far less ' +
      'than it feels like, and that even one session a week keeps most of what you have.',
    evidence: [
      E('Bruusgaard et al. (2010), PNAS — myonuclei acquired by overload persist', 'Bruusgaard myonuclei acquired by overload exercise precede hypertrophy and are not lost on detraining'),
      E('Psilander et al. (2019), Journal of Applied Physiology — muscle memory in humans', 'Psilander effects of training retraining and detraining on myonuclear number in human skeletal muscle'),
    ],
  },
  {
    id: 'supersets', cat: 'muscle',
    title: 'Supersets save time without costing gains',
    tags: ['paired sets', 'antagonist', 'time efficient', 'short on time'],
    summary: 'Pairing exercises for different muscles roughly halves session time with no loss of growth. Avoid pairing the same muscle on heavy lifts.',
    body:
      'Agonist–antagonist supersets — a row between sets of bench, a curl between sets of pushdowns — let the ' +
      'resting muscle recover while you work the other, and reviews of time-efficient training find equal strength ' +
      'and hypertrophy at about half the duration. Same-muscle supersets and drop sets are fine for accessory work ' +
      'but reduce performance on the second exercise. If the gym is crowded or you have forty minutes, pair ' +
      'everything that can be paired.',
    evidence: [
      E('Iversen et al. (2021), Sports Medicine — time-efficient resistance training review', 'Iversen no time to lift designing time-efficient training programs for strength and hypertrophy a narrative review'),
      E('Weakley et al. (2017), European Journal of Applied Physiology — superset and tri-set training effects', 'Weakley the effects of traditional superset and tri-set resistance training structures on perceived intensity and physiological responses'),
    ],
  },
  {
    id: 'drop-sets', cat: 'muscle',
    title: 'Drop sets: same growth in less time',
    tags: ['intensity techniques', 'rest pause', 'myo reps'],
    summary: 'Drop sets produce similar hypertrophy to straight sets in a third of the time. They are a fatigue-heavy tool, so use them on isolation work.',
    body:
      'A meta-analysis of drop-set trials found no difference in muscle growth against conventional sets, with ' +
      'sessions taking much less time. The catch is fatigue: a drop set to failure on leg press costs more ' +
      'recovery than three straight sets, and on a barbell lift it is a technique breakdown waiting to happen. ' +
      'Reserve them for the last exercise of a session, on a machine or a dumbbell movement, when time is short.',
    evidence: [
      E('Sødal et al. (2023), Sports Medicine – Open — drop set vs traditional training meta-analysis', 'Sodal effects of drop sets on skeletal muscle hypertrophy a systematic review and meta-analysis'),
    ],
  },
  {
    id: 'machines-vs-free-weights', cat: 'muscle',
    title: 'Machines versus free weights',
    tags: ['are machines bad', 'smith machine', 'cables', 'functional'],
    summary: 'For growing muscle they are equally effective. Free weights transfer more to free-weight strength; machines are easier to load safely near failure.',
    body:
      'A meta-analysis of free-weight versus machine training found similar hypertrophy and similar general strength, ' +
      'with each modality producing more strength on its own tests. Free weights train balance and the stabilisers ' +
      'that carry over to sport; machines let you push a set to its edge without a spotter and are kinder to ' +
      'beginners and injured joints. A good programme uses both: barbells for the main lifts, machines and cables to ' +
      'chase volume on the muscles those lifts under-serve.',
    evidence: [
      E('Haugen et al. (2023), Sports Medicine – Open — free weights vs machines meta-analysis', 'Haugen effect of free-weight vs machine-based strength training on maximal strength hypertrophy and jump performance'),
    ],
    ferox: 'The suggested weight for a machine or dumbbell version of a lift is derived from the barbell number by a gear factor, so switching equipment does not reset your progression.',
  },
  {
    id: 'genetics', cat: 'muscle',
    title: 'Why your friend grows faster than you',
    tags: ['hard gainer', 'responders', 'individual variation', 'genetic potential'],
    summary: 'Response to identical training varies enormously — from no growth to a 50% size increase in one trial. You can only find out which you are by doing it consistently.',
    body:
      'Nearly six hundred people did the same twelve-week arm programme. Upper-arm size changes ranged from a 2% ' +
      'loss to a 59% gain, and strength from 0% to 250%. Genetics, sleep, food and age all contribute, and almost ' +
      'none of it is visible in advance. What this means in practice: compare yourself to your own log, not to the ' +
      'person next to you, and expect to need more volume or more patience than the programme that worked for ' +
      'them. "Low responder" is almost always "not yet, and not with that sleep".',
    evidence: [
      E('Hubal et al. (2005), Medicine & Science in Sports & Exercise — variability in muscle size and strength gain', 'Hubal variability in muscle size and strength gain after unilateral resistance training'),
    ],
  },
  {
    id: 'anabolic-window', cat: 'muscle',
    title: 'The post-workout "anabolic window" is a few hours, not thirty minutes',
    tags: ['protein shake after workout', 'protein timing', 'when to eat protein'],
    summary: 'Total daily protein matters far more than when you drink the shake. Eat a protein meal within a few hours either side of training and you are covered.',
    body:
      'A meta-analysis of protein-timing studies found that the apparent benefit of immediate post-workout ' +
      'protein disappeared once total daily intake was controlled for. The sensitivity to protein after a session ' +
      'lasts at least a day, and a meal eaten before training is still being absorbed afterwards. The rule: hit ' +
      'your daily total, spread it over three to five meals, and do not train fasted for hours then skip the next ' +
      'meal. The post-workout shake is convenient, not essential.',
    evidence: [
      E('Schoenfeld, Aragon & Krieger (2013), JISSN — protein timing meta-analysis', 'Schoenfeld Aragon Krieger the effect of protein timing on muscle strength and hypertrophy a meta-analysis'),
      E('Aragon & Schoenfeld (2013), JISSN — nutrient timing revisited', 'Aragon Schoenfeld nutrient timing revisited is there a post-exercise anabolic window'),
    ],
  },
  {
    id: 'protein-per-meal', cat: 'muscle',
    title: 'How much protein per meal',
    tags: ['30 grams', 'protein absorption', 'can you absorb', 'protein distribution'],
    summary: 'About 0.4 g per kilo per meal across four meals is a sensible pattern. Larger doses are not wasted; they are used more slowly.',
    body:
      'The idea that the body can only absorb 20–30 g at a sitting is wrong: everything is absorbed, and larger ' +
      'doses extend the period of muscle protein synthesis rather than being burned. A review concludes that ' +
      'spreading daily protein over roughly four meals of around 0.4 g/kg each — about 30–40 g for most adults — is ' +
      'the practical optimum, with the daily total still the dominant factor. If you only manage two meals a day, ' +
      'put plenty of protein in both; it is better than hitting the number in smaller pieces you will not keep up.',
    evidence: [
      E('Schoenfeld & Aragon (2018), JISSN — how much protein can the body use per meal', 'Schoenfeld Aragon how much protein can the body use in a single meal for muscle-building'),
    ],
  },
  {
    id: 'protein-total', cat: 'muscle',
    title: 'How much protein a day',
    tags: ['grams per kg', 'protein intake', 'how much protein', '1g per pound'],
    summary: 'Around 1.6 g per kilo of bodyweight a day captures nearly all the benefit for muscle; up to 2.2 g/kg is a safe upper margin, and more when dieting.',
    body:
      'A meta-analysis of 49 trials found protein supplementation improved strength and lean mass gains from ' +
      'training, with benefits plateauing around 1.6 g/kg/day. The old "one gram per pound" (2.2 g/kg) is a ' +
      'reasonable ceiling with no harm shown in healthy adults, just no extra return. Higher intakes are protective ' +
      'in a deficit. Protein above the target is not dangerous for healthy kidneys; it is just expensive food that ' +
      'could have been carbohydrate for training.',
    evidence: [
      E('Morton et al. (2018), British Journal of Sports Medicine — protein supplementation meta-analysis', 'Morton systematic review meta-analysis protein supplementation resistance training muscle mass strength'),
    ],
    ferox: 'Protein is set between 1.8 and 2.3 g/kg depending on the season, before the calories are divided between fat and carbohydrate.',
  },
  {
    id: 'surplus-size', cat: 'muscle',
    title: 'How big a bulk should be',
    tags: ['bulking', 'dirty bulk', 'lean bulk', 'how many calories to build muscle', 'surplus'],
    summary: 'A surplus of roughly 10–20% above maintenance builds muscle about as fast as a larger one, with far less fat to cut afterwards.',
    body:
      'Elite athletes on a 600 kcal surplus gained no more lean mass over twelve weeks than athletes eating to ' +
      'appetite, but gained significantly more fat. Muscle is built slowly and the rate is capped by training ' +
      'and genetics, not by food; calories beyond what that rate needs are stored. A modest surplus — around ' +
      '200–400 kcal a day, scaled with bodyweight — with protein high and progressive training is the efficient ' +
      'version. If you are gaining more than about 0.5% of bodyweight a week after month one, most of it is fat.',
    evidence: [
      E('Garthe et al. (2013), European Journal of Sport Science — effect of nutritional intervention on body composition in athletes', 'Garthe effect of nutritional intervention on body composition and performance in elite athletes'),
    ],
    ferox: 'Winter Fire runs a 12% surplus and Clean Bulk 18%, with a fortnightly checkpoint that flags gain running ahead of plan.',
  },
  {
    id: 'women-lifting', cat: 'muscle',
    title: 'Women should train the same way as men',
    tags: ['bulky', 'toning', 'female training', 'women lifting weights'],
    summary: 'Women gain relative strength and size at the same rate as men, with the same programming. Getting "bulky" by accident takes a decade of effort and a surplus.',
    body:
      'A meta-analysis of sex differences found women gain relative upper-body strength slightly faster than men ' +
      'and hypertrophy at a similar rate per unit of muscle. The training that works is identical: heavy compounds, ' +
      'progressive overload, enough protein. Because women start with less muscle and about a fifteenth of the ' +
      'testosterone, the visible result of a year of serious lifting is the "toned" look people ask for. Bulk ' +
      'requires years of pursuing it on purpose.',
    evidence: [
      E('Roberts, Nuckols & Krieger (2020), Journal of Strength and Conditioning Research — sex differences in resistance training', 'Roberts Nuckols Krieger sex differences in resistance training a systematic review and meta-analysis'),
    ],
    ferox: 'Starting loads are scaled by sex because the strength gap is real; the programme itself is identical.',
  },
  {
    id: 'age', cat: 'muscle',
    title: 'You can build muscle at any age',
    tags: ['too old', 'over 40', 'over 60', 'sarcopenia', 'older adults'],
    summary: 'Adults over 50 gain around a kilo of lean mass from a few months of resistance training, and the strength gains are proportionally larger.',
    body:
      'A meta-analysis of 49 trials in people over 50 found an average lean-mass gain of about 1.1 kg over roughly ' +
      'twenty weeks, rising with volume. Muscle is lost at roughly 3–8% a decade from the thirties onward, faster ' +
      'after sixty, and lifting is the only intervention that reliably reverses it. Older lifters need slightly more ' +
      'protein per meal to get the same response, a longer warm-up and a bit more recovery between hard sessions; ' +
      'they do not need a different kind of training.',
    evidence: [
      E('Peterson, Sen & Gordon (2011), Medicine & Science in Sports & Exercise — resistance exercise and lean mass in aging adults', 'Peterson influence of resistance exercise on lean body mass in aging adults a meta-analysis'),
    ],
  },
  {
    id: 'muscle-longevity', cat: 'muscle',
    title: 'Muscle is a health organ, not just a look',
    tags: ['longevity', 'live longer', 'strength and mortality', 'why lift'],
    summary: 'More muscle and more strength predict living longer and dying of less. An hour or two of lifting a week cuts all-cause mortality by around 10–20%.',
    body:
      'In a national cohort, muscle mass was a stronger predictor of survival than body-mass index. A meta-analysis of ' +
      'sixteen studies found that 30–60 minutes a week of muscle-strengthening activity was associated with a ' +
      '10–20% lower risk of death from any cause, cardiovascular disease, diabetes and cancer, independent of aerobic ' +
      'exercise. Muscle is where most of your glucose is stored and burned, and strength is what keeps you ' +
      'independent at eighty. The aesthetic reasons are fine; these are better.',
    evidence: [
      E('Srikanthan & Karlamangla (2014), American Journal of Medicine — muscle mass index as a predictor of longevity', 'Srikanthan Karlamangla muscle mass index as a predictor of longevity in older adults'),
      E('Momma et al. (2022), British Journal of Sports Medicine — muscle-strengthening activities and mortality', 'Momma muscle-strengthening activities are associated with lower risk and mortality in major non-communicable diseases'),
    ],
  },
  {
    id: 'creatine', cat: 'muscle',
    title: 'Creatine: the one supplement worth taking',
    tags: ['creatine monohydrate', 'loading', 'supplements', 'does creatine work'],
    summary: 'Three to five grams of creatine monohydrate a day reliably adds a few percent to strength and training volume, and is as safe as any supplement studied.',
    body:
      'Hundreds of trials over thirty years agree: creatine monohydrate increases the energy available for short, ' +
      'hard efforts, which lets you do an extra rep or two per set, which over months becomes extra muscle. Expect ' +
      'a kilo or so of water weight in the first fortnight, which is in the muscle and is not fat. Loading phases ' +
      'speed saturation but are not needed; 3–5 g daily reaches the same place in a month. It does not harm healthy ' +
      'kidneys, does not cause cramping, and the fancy forms are not better than the cheapest powder.',
    evidence: [
      E('Kreider et al. (2017), JISSN — position stand on creatine supplementation', 'Kreider International Society of Sports Nutrition position stand safety efficacy creatine supplementation'),
    ],
    ferox: 'FEROX does not sell supplements and will not. This entry exists because it is the most-asked question in any gym.',
  },

  /* =============================================================== strength */

  {
    id: 'specificity', cat: 'strength',
    title: 'Specificity: you get good at what you practise',
    tags: ['said principle', 'train for your sport', 'carryover', 'transfer'],
    summary: 'Strength is partly a skill. Heavy sets in the lift you want to improve beat light sets, and the lift itself beats any substitute.',
    body:
      'When low and high loads are compared, hypertrophy is similar but one-rep-max strength clearly favours the ' +
      'heavy group, because lifting near maximum is a coordination skill the nervous system has to rehearse. The ' +
      'same applies between exercises: leg press strength transfers to the squat only partially. If the goal is a ' +
      'number on a specific bar, that lift needs to be in the programme, heavy, most weeks. If the goal is size or ' +
      'health, specificity matters much less and comfort and variety matter more.',
    evidence: [
      E('Schoenfeld et al. (2017), Journal of Strength and Conditioning Research — low vs high load, strength outcomes', 'Schoenfeld strength and hypertrophy adaptations between low- vs high-load resistance training a systematic review and meta-analysis'),
    ],
    ferox: 'Iron Base and Peak Week keep the squat, bench, deadlift and press in every week at 1–6 reps, because the goal of those seasons is the number.',
  },
  {
    id: 'one-rep-max', cat: 'strength',
    title: 'Estimating your one-rep max without testing it',
    tags: ['1rm', 'epley', 'brzycki', 'max calculator', 'how strong am I'],
    summary: 'Weight × (1 + reps ÷ 30) gives a usable estimate from any set of ten or fewer. It is good to about 5% and worse the more reps you use.',
    body:
      'The Epley formula — and Brzycki, which gives almost the same answer below ten reps — predicts a one-rep max ' +
      'from a submaximal set within a few percent for trained lifters on the bench and squat; the deadlift is less ' +
      'predictable and high-rep sets inflate the estimate. Testing a true max is a skill in itself, carries injury ' +
      'risk, and is a bad use of a training day for anyone not competing. An estimate updated from every hard set ' +
      'is more useful than a number from one brave afternoon.',
    evidence: [
      E('LeSuer et al. (1997), Journal of Strength and Conditioning Research — accuracy of 1RM prediction equations', 'LeSuer the accuracy of prediction equations for estimating 1-RM performance in the bench press squat and deadlift'),
    ],
    ferox: 'Estimated maxes use Epley, taken from the best set in your log, and the records page shows them as estimates. The terms say so too: never load an estimate onto a bar untested.',
  },
  {
    id: 'linear-progression', cat: 'strength',
    title: 'Why beginners should add weight every session',
    tags: ['starting strength', 'novice', 'linear periodization', 'how fast to add weight'],
    summary: 'Untrained people adapt to almost anything and recover between sessions, so the simplest possible rule — hit the reps, add weight — works for a year or more.',
    body:
      'A meta-analysis of dose–response for strength found untrained people made their best gains at about 60% of ' +
      'max, three days a week — far less intensity than trained lifters need — and that the optimum rises with ' +
      'training age. The novice can therefore progress every session and should: anything more elaborate is ' +
      'leaving gains on the table. Linear progression ends when the added weight stops going up for two or three ' +
      'sessions in a row despite good sleep and food, which is the point to move to weekly progress, then to blocks.',
    evidence: [
      E('Rhea et al. (2003), Medicine & Science in Sports & Exercise — dose–response for strength development', 'Rhea a meta-analysis to determine the dose response for strength development'),
    ],
    ferox: 'Load progression is linear for everyone below "very advanced": complete every rep and the weight rises by one increment next time, with small-muscle lifts stepping in 1 kg and big barbell lifts in 5.',
  },
  {
    id: 'conservative-start', cat: 'strength',
    title: 'Start lighter than you think',
    tags: ['first session', 'how much weight should I lift', 'starting weight', 'beginner weight'],
    summary: 'A first session that is 10 kg too light costs thirty seconds. One that is 10 kg too heavy costs a missed rep, a tweaked joint, or the habit.',
    body:
      'Population tables of what an "intermediate" lifts at a given bodyweight are averages with a huge spread, and ' +
      'any individual can be far below them for reasons that have nothing to do with effort. The asymmetry is the ' +
      'argument: under-guessing is corrected on the next set, over-guessing is corrected in physiotherapy or by ' +
      'quitting. Begin around 60–70% of what you think you could manage, learn the movement, and let progression ' +
      'find the real number in two or three sessions.',
    evidence: [
      E('Rhea et al. (2003), Medicine & Science in Sports & Exercise — untrained lifters respond at lower intensities', 'Rhea a meta-analysis to determine the dose response for strength development'),
      E('Keogh & Winwood (2017), Sports Medicine — injury epidemiology in strength sports', 'Keogh Winwood the epidemiology of injuries across the weight-training sports'),
    ],
    ferox: 'Predicted starting loads sit in the middle of the published intermediate bands and are then deliberately undershot. Rounding is always downward.',
  },
  {
    id: 'periodisation', cat: 'strength',
    title: 'Periodisation: planning in blocks',
    tags: ['training blocks', 'mesocycle', 'program design', 'block periodization', 'undulating'],
    summary: 'Varying the training emphasis over weeks and months beats doing the same thing indefinitely, for strength. Which pattern you vary with matters less.',
    body:
      'A meta-analysis found periodised programmes produced greater strength gains than non-periodised ones of ' +
      'matched volume, and that linear and undulating models performed similarly. The mechanism is partly fatigue ' +
      'management — concentrating one quality at a time lets you recover from the others — and partly that the ' +
      'body stops responding to an unchanging stimulus. For a non-competitor, the simple version is enough: an ' +
      'eight-to-twelve-week block with a focus, a deload, and a new focus.',
    evidence: [
      E('Williams et al. (2017), Sports Medicine — periodised vs non-periodised resistance training meta-analysis', 'Williams comparison of periodized and non-periodized resistance training on maximal strength a meta-analysis'),
    ],
    ferox: 'Seasons are the periodisation. The default year runs an athletic block, a transition, a mass block and a recomp, each with its own rep range, rest and calorie shift.',
  },
  {
    id: 'deload', cat: 'strength',
    title: 'Deloads: the easy week that lets the hard weeks work',
    tags: ['rest week', 'taper', 'back off week', 'fatigue', 'when to deload'],
    summary: 'Dropping volume by about half for a week every four to eight sheds accumulated fatigue and lets strength express itself. Keep the weight on, cut the sets.',
    body:
      'Fitness and fatigue both build during hard training and fatigue masks fitness. Tapering studies in strength ' +
      'athletes find that cutting volume 30–70% for a week or so while keeping intensity high produces a strength ' +
      'peak of a few percent, and surveys of coaches converge on a deload every four to eight weeks. The common ' +
      'mistake is deloading the intensity — lifting light for a week loses the groove without resting anything. ' +
      'Same weights, half the sets, and come back feeling like you missed it.',
    evidence: [
      E('Pritchard et al. (2015), Journal of Strength and Conditioning Research — tapering practices of strength athletes', 'Pritchard effects and mechanisms of tapering in maximizing muscular strength'),
      E('Bell et al. (2023), Sports Medicine – Open — deloading practices in strength and physique sports', 'Bell an exploration of deload practices in competitive strength sports and physique athletes'),
    ],
    ferox: 'Every block ends in a deload week, and the Bridge season is built as a whole-block version of one.',
  },
  {
    id: 'warm-up', cat: 'strength',
    title: 'How to warm up for lifting',
    tags: ['warm up sets', 'ramp up', 'mobility before workout', 'how long to warm up'],
    summary: 'Five minutes of easy movement, then ramping sets of the first lift. A proper warm-up improves performance in most studies and takes less time than people spend scrolling.',
    body:
      'A review of warm-up studies found a performance benefit in nearly 80% of comparisons when the warm-up was ' +
      'specific to the task and did not fatigue. For lifting that means raising body temperature briefly — a few ' +
      'minutes of bike or rowing — then two to four progressively heavier sets of the first exercise, with reps ' +
      'dropping as weight rises: empty bar for ten, 50% for five, 70% for three, 85% for one, then work. Later ' +
      'exercises in the session need one feeder set at most. Long static stretching beforehand is not a warm-up.',
    evidence: [
      E('Fradkin, Zazryn & Smoliga (2010), Journal of Strength and Conditioning Research — effects of warming-up on performance', 'Fradkin effects of warming-up on physical performance a systematic review with meta-analysis'),
    ],
  },
  {
    id: 'static-stretching', cat: 'strength',
    title: 'Static stretching before lifting makes you weaker',
    tags: ['stretch before workout', 'flexibility', 'dynamic stretching', 'mobility'],
    summary: 'Holding stretches before training reduces strength and power by a few percent for the session. Stretch after, or at a different time, if you want flexibility.',
    body:
      'A meta-analysis of over a hundred studies found static stretching immediately before exercise reduced ' +
      'strength by about 5% and explosive performance by about 2–3%, with longer holds worse. The deficit is small ' +
      'and short-lived, but it is in the wrong direction for a heavy session. Dynamic movement — leg swings, ' +
      'bodyweight squats, arm circles — prepares the range you need without the cost. Stretching done separately, ' +
      'or after training, does improve flexibility and does not interfere with growth.',
    evidence: [
      E('Simic, Sarabon & Markovic (2013), Scandinavian Journal of Medicine & Science in Sports — acute effects of static stretching', 'Simic does pre-exercise static stretching inhibit maximal muscular performance a meta-analytical review'),
    ],
  },
  {
    id: 'bracing', cat: 'strength',
    title: 'Bracing and the Valsalva manoeuvre',
    tags: ['breathing while lifting', 'hold your breath', 'core stability', 'brace'],
    summary: 'Taking a breath and holding it against a tight midsection stiffens the spine and lets you lift more, safely, for healthy people. Breathe between reps on heavy sets.',
    body:
      'Breath-holding during a heavy lift raises intra-abdominal pressure, which stabilises the trunk and reduces ' +
      'the load the spine takes. Blood pressure spikes briefly, which is why people with hypertension, heart ' +
      'conditions or a history of hernia should be cautious and breathe through the rep, but for healthy lifters ' +
      'the review evidence considers it both effective and safe. Big breath into the belly, brace as if about to be ' +
      'punched, lift, exhale through the top. Never hold across multiple reps on the edge of fainting.',
    evidence: [
      E('Hackett & Chow (2013), Journal of Strength and Conditioning Research — the Valsalva maneuver and resistance exercise', 'Hackett Chow the Valsalva maneuver its effect on intra-abdominal pressure and safety issues during resistance exercise'),
    ],
  },
  {
    id: 'lifting-belt', cat: 'strength',
    title: 'Do you need a lifting belt?',
    tags: ['weightlifting belt', 'back support', 'belt weak core'],
    summary: 'A belt lets you brace harder and lift a little more on heavy squats and deadlifts. It does not weaken your core, and you do not need one until the weights are heavy.',
    body:
      'Belts increase intra-abdominal pressure and bar speed on near-maximal lifts, and electromyography shows the ' +
      'trunk muscles work as hard or harder with a belt on, not less. The common worry that a belt lets the core go ' +
      'soft is not supported. The sensible pattern is no belt for warm-ups and accessory work, belt for sets above ' +
      'about 80% on the big lifts, which is when the few percent matters and the fatigue-related form breakdown ' +
      'begins. Below that, it is a fashion accessory.',
    evidence: [
      E('Lander, Hundley & Simonton (1992), Medicine & Science in Sports & Exercise — weight belts during multiple repetitions', 'Lander the effectiveness of weight-belts during multiple repetitions of the squat exercise'),
      E('Zink et al. (2001), Journal of Strength and Conditioning Research — belts and trunk muscle activity', 'Zink the effects of a weight belt on trunk and leg muscle activity and joint kinematics during the squat'),
    ],
  },
  {
    id: 'squat-depth', cat: 'strength',
    title: 'How deep to squat',
    tags: ['ass to grass', 'parallel', 'deep squat knees', 'half squat'],
    summary: 'Deep squats build more leg muscle than half squats and are not harder on healthy knees. Go as deep as you can with heels down and back flat.',
    body:
      'Twelve weeks of deep squats produced more quadriceps and glute growth and more strength across the whole ' +
      'range than shallow squats, and training depth transferred to jumping too. Knee-joint forces in a deep squat ' +
      'are within what the structures tolerate; the "do not go past parallel" rule came from a 1960s study with ' +
      'methods nobody would accept now. The constraint is mobility, not safety: squat to where you can keep ' +
      'position, and work on the ankle and hip range if that is above parallel.',
    evidence: [
      E('Bloomquist et al. (2013), European Journal of Applied Physiology — effect of range of motion in heavy squats', 'Bloomquist effect of range of motion in heavy load squatting on muscle and tendon adaptations'),
      E('Kubo, Ikebukuro & Yata (2019), European Journal of Applied Physiology — full vs half squat and muscle volume', 'Kubo effects of squat training with different depths on lower limb muscle volumes'),
    ],
  },
  {
    id: 'knees-past-toes', cat: 'strength',
    title: 'Knees over toes is fine',
    tags: ['knee pain squat', 'knee travel', 'lunges knees', 'knee safety'],
    summary: 'Letting the knees travel forward in a squat slightly raises knee load and dramatically lowers hip and back load. The rule against it was a mistake.',
    body:
      'When squatters were prevented from letting their knees pass their toes, knee torque fell by about 20% while ' +
      'hip torque rose by more than ten times — the force has to go somewhere, and it went into the lower back. ' +
      'Knees that move forward are how the ankle and hip share the work. For healthy knees, forward travel over the ' +
      'toes in squats, lunges and step-ups is normal, and strengthening the knee in that range is protective. Pain ' +
      'is the signal to adjust, not geometry.',
    evidence: [
      E('Fry, Smith & Schilling (2003), Journal of Strength and Conditioning Research — effect of knee position on hip and knee torques', 'Fry effect of knee position on hip and knee torques during the barbell squat'),
    ],
  },
  {
    id: 'back-rounding', cat: 'strength',
    title: 'A rounded back is not automatically an injury',
    tags: ['deadlift back', 'neutral spine', 'lower back pain lifting', 'posture'],
    summary: 'Lifting with a perfectly neutral spine is a reasonable coaching default, but the evidence that some lumbar flexion causes back pain is weak. Load progression matters more than geometry.',
    body:
      'A systematic review found no consistent evidence that lifting with a more flexed spine predicts low back ' +
      'pain, and world-class deadlifters round to some degree at maximal loads. What does predict injury in ' +
      'lifters is spikes in load and volume beyond what the tissues are prepared for. The practical advice: brace, ' +
      'keep the spine from changing shape during the rep, keep the bar close, and add weight gradually. Then stop ' +
      'being frightened of a slightly rounded upper back on a heavy pull.',
    evidence: [
      E('Saraceni et al. (2020), Journal of Orthopaedic & Sports Physical Therapy — lumbar spine posture during lifting and back pain', 'Saraceni to flex or not to flex is there a relationship between lumbar spine flexion during lifting and low back pain'),
    ],
  },
  {
    id: 'grip', cat: 'strength',
    title: 'Grip strength predicts how long you live',
    tags: ['hand grip', 'forearms', 'straps', 'grip strength health'],
    summary: 'Grip is a strong, simple marker of whole-body strength and of mortality risk. Train it, and use straps when grip would otherwise limit a back exercise.',
    body:
      'In a cohort of nearly 140,000 adults across seventeen countries, each 5 kg less grip strength predicted a ' +
      '16% higher risk of death from any cause — a better predictor than blood pressure. Grip itself is a proxy for ' +
      'total muscle and for having trained it, so the answer is to lift, not to buy a grip gadget. In the gym, if ' +
      'your hands give out before your back on a row or deadlift, straps let you train the muscle you came to train; ' +
      'leave them off for the warm-ups and some pulls so the hands keep up.',
    evidence: [
      E('Leong et al. (2015), Lancet — prognostic value of grip strength, the PURE study', 'Leong prognostic value of grip strength findings from the Prospective Urban Rural Epidemiology PURE study'),
    ],
  },
  {
    id: 'caffeine', cat: 'strength',
    title: 'Caffeine before training works',
    tags: ['pre workout', 'coffee', 'stimulant', 'energy drink'],
    summary: 'Around 3–6 mg per kilo of bodyweight an hour before training reliably improves strength, power and endurance. A strong coffee is most of a pre-workout.',
    body:
      'The ISSN position stand reviews hundreds of trials: caffeine at 3–6 mg/kg improves muscular endurance, ' +
      'strength, sprint and aerobic performance, with effects on the order of a few percent. Most pre-workout ' +
      'products are caffeine plus things with much weaker evidence. The costs are real: a half-life of five hours ' +
      'means an evening dose damages sleep, which does more harm than the dose did good, and tolerance builds. ' +
      'Use it for sessions that matter, before noon, and not every day.',
    evidence: [
      E('Guest et al. (2021), JISSN — position stand on caffeine and exercise performance', 'Guest International Society of Sports Nutrition position stand caffeine and exercise performance'),
    ],
  },

  /* ============================================================ programming */

  {
    id: 'minimum-dose', cat: 'programming',
    title: 'The minimum that still works',
    tags: ['how little can I train', 'busy', 'two days a week', 'short workouts', 'efficient'],
    summary: 'Four hard sets a week per muscle, in two short sessions, produces most of the growth of a much larger programme. The best plan is the one that happens.',
    body:
      'A review of time-efficient training concludes that around four weekly sets per muscle group, taken close to ' +
      'failure in the 6–15 rep range, is enough to produce meaningful growth and strength in most people, and that ' +
      'two full-body sessions of about thirty minutes cover it. Returns diminish quickly beyond that for anyone who ' +
      'is not already advanced. If life allows two sessions a week, two sessions a week is an excellent programme, ' +
      'and far better than a four-day plan abandoned in March.',
    evidence: [
      E('Iversen et al. (2021), Sports Medicine — minimal-dose resistance training review', 'Iversen no time to lift designing time-efficient training programs for strength and hypertrophy a narrative review'),
      E('Androulakis-Korakakis et al. (2020), Sports Medicine — minimum effective dose for strength', 'Androulakis-Korakakis the minimum effective training dose required to increase 1RM strength in resistance-trained men'),
    ],
    ferox: 'Splits exist for two to six training days, and every one of them still hits each muscle twice.',
  },
  {
    id: 'full-body-vs-split', cat: 'programming',
    title: 'Full body, upper/lower, or push/pull/legs?',
    tags: ['best split', 'ppl', 'bro split', 'which program', 'workout split'],
    summary: 'They all work if weekly sets and frequency match. Pick by how many days you have: full body for two or three, upper/lower for four, push/pull/legs for five or six.',
    body:
      'Trials comparing split routines with full-body training at equal volume and frequency find no difference in ' +
      'growth or strength. What a split determines is practical: how long each session runs, how fatigued a muscle ' +
      'is when it gets trained, and whether every muscle is reached twice in the week. Full body on three days ' +
      'does that neatly; a push/pull/legs rotation needs six days to do it, or three days to fail at it. Choose for ' +
      'your calendar and your recovery, then stop worrying about it.',
    evidence: [
      E('Evangelista et al. (2021), Journal of Strength and Conditioning Research — split vs full-body at equal volume', 'Evangelista split or full-body workout routine which is best to increase muscle strength and hypertrophy'),
    ],
    ferox: 'Setup asks how many days you have and picks the template — full body up to three days, upper/lower at four, push/pull/legs beyond — then fills it by movement pattern.',
  },
  {
    id: 'autoregulation', cat: 'programming',
    title: 'Autoregulation: adjusting the day to how you feel',
    tags: ['rpe training', 'bad day', 'flexible training', 'readiness', 'listen to your body'],
    summary: 'Scaling load and volume to today\'s readiness matches or beats fixed prescriptions, and prevents the all-or-nothing skipped session.',
    body:
      'Strength on any given day varies by several percent with sleep, stress, food and the last session, so a ' +
      'fixed percentage of max is sometimes too heavy and sometimes too light. Trials comparing autoregulated ' +
      'training — adjusting load by rating of effort or by how the warm-ups move — against fixed loading find equal ' +
      'or better strength gains. The bigger win is behavioural: a plan that shrinks to fit a bad day gets done, and ' +
      'a session at 60% keeps a habit that a cancelled one erodes.',
    evidence: [
      E('Larsen et al. (2021), Sports Medicine — autoregulated vs fixed-load resistance training meta-analysis', 'Larsen the effects of autoregulated versus fixed-load resistance training on strength a systematic review and meta-analysis'),
      E('Helms et al. (2018), Journal of Strength and Conditioning Research — RPE-based load prescription', 'Helms RPE vs percentage 1RM loading in periodized programs matched for sets and repetitions'),
    ],
    ferox: 'The daily check-in asks for a one-to-ten readiness score and scales sets and loads to it. Readiness goes in before the session is built, not as an afterthought.',
  },
  {
    id: 'training-log', cat: 'programming',
    title: 'Why you have to write it down',
    tags: ['track workouts', 'logging', 'notebook', 'app'],
    summary: 'Progressive overload is impossible without a record of what you did last time. A log is the whole mechanism, not a nice-to-have.',
    body:
      'Memory for numbers across a week is poor and biased upward, so lifters who do not log tend to repeat the ' +
      'same weights for months while believing they are progressing. Self-monitoring is the most consistent predictor ' +
      'of behaviour change in every domain it has been studied in, from diet to exercise, and the effect is largely ' +
      'attentional: a number you look at is a number you act on. Record weight, reps and how hard each set felt; ' +
      'then next session has a target instead of a guess.',
    evidence: [
      E('Burke, Wang & Sevick (2011), Journal of the American Dietetic Association — self-monitoring review', 'Burke self-monitoring in weight loss a systematic review of the literature'),
      E('Michie et al. (2009), Health Psychology — effective techniques in physical activity interventions', 'Michie effective techniques in healthy eating and physical activity interventions a meta-regression'),
    ],
    ferox: 'Every set is logged, and the next session\'s suggested weight is computed from the last one for that exact exercise. No log, no progression.',
  },
  {
    id: 'cardio-and-lifting', cat: 'programming',
    title: 'Doing cardio and lifting in the same programme',
    tags: ['interference effect', 'concurrent training', 'does cardio kill gains', 'hybrid'],
    summary: 'Cardio interferes with muscle and strength gains only when it is frequent, long, high-intensity and stacked against lifting. Separated and moderate, it does not.',
    body:
      'A meta-analysis of concurrent training found reductions in hypertrophy and strength when endurance work was ' +
      'added, growing with the frequency and duration of the cardio and worse for running than cycling. The ' +
      'practical fixes remove most of it: keep hard cardio and heavy legs on different days or at least six hours ' +
      'apart, keep easy sessions genuinely easy, prefer cycling or incline walking if running beats up your legs, ' +
      'and eat enough to cover both. Two or three moderate cardio sessions a week do not hurt a lifting programme.',
    evidence: [
      E('Wilson et al. (2012), Journal of Strength and Conditioning Research — concurrent training meta-analysis', 'Wilson concurrent training meta-analysis hypertrophy power strength adaptations'),
      E('Schumann et al. (2022), Sports Medicine — compatibility of concurrent training, updated meta-analysis', 'Schumann compatibility of concurrent aerobic and strength training for skeletal muscle size and function an updated systematic review and meta-analysis'),
    ],
    ferox: 'The Hybrid season schedules hard conditioning and heavy lifting on separate days. Winter Fire and Iron Base keep cardio minimal on purpose.',
  },
  {
    id: 'weak-points', cat: 'programming',
    title: 'Bringing up a lagging muscle',
    tags: ['small arms', 'weak point', 'imbalance', 'lagging body part', 'calves'],
    summary: 'Put it first, give it a few more sets a week, train it from more angles, and accept that some muscles simply grow slowly. Nothing else is needed.',
    body:
      'The order effect and the volume dose–response are the two tools: whatever is trained first gets the best ' +
      'performance and most growth, and more weekly sets grow a muscle more up to a limit. So the lagging part ' +
      'moves to the start of the session and gains two to four sets a week, taken from a part that is ahead. ' +
      'Vary the angle of attack — incline and flat, overhead and lateral — for even development. Then give it a ' +
      'block before judging. Calves and forearms are famously slow in most people, and that is genetics, not failure.',
    evidence: [
      E('Nunes et al. (2021), Journal of Sports Sciences — exercise order', 'Nunes what influence does resistance exercise order have on muscular strength gains and muscle hypertrophy a systematic review and meta-analysis'),
      E('Schoenfeld, Ogborn & Krieger (2017), Journal of Sports Sciences — volume dose–response', 'Schoenfeld dose-response relationship between weekly resistance training volume and increases in muscle mass'),
    ],
    ferox: 'The split builder reads muscle trends from your log and adds a set to a group that is behind the others, and takes one from a group that is well ahead.',
  },

  /* ============================================================== nutrition */

  {
    id: 'maintenance-estimate', cat: 'nutrition',
    title: 'How your maintenance calories are estimated, and how wrong that is',
    tags: ['tdee', 'bmr', 'mifflin st jeor', 'how many calories should I eat', 'calorie calculator'],
    summary: 'Mifflin–St Jeor times an activity factor is the most accurate simple equation and still misses by 10% or more for a third of people. Treat it as a first guess.',
    body:
      'Resting metabolism from the Mifflin–St Jeor equation lands within 10% of the measured value for about ' +
      '70–80% of people, which is the best of the published formulas and still means one person in four is off by ' +
      'a few hundred calories before the activity multiplier adds its own error. The equation cannot see how much of ' +
      'your weight is muscle, how much you fidget, or your genetics. Use the number to start, then let two or three ' +
      'weeks of weigh-ins tell you what your real maintenance is.',
    evidence: [
      E('Frankenfield, Roth-Yousey & Compher (2005), Journal of the American Dietetic Association — comparison of predictive equations', 'Frankenfield comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults'),
    ],
    ferox: 'Day one uses Mifflin–St Jeor and an activity multiplier of 1.2 to 1.55. The onboarding says it is a baseline, and every number is editable.',
  },
  {
    id: 'measured-maintenance', cat: 'nutrition',
    title: 'Measuring your real maintenance from the scale and the food log',
    tags: ['reverse engineer', 'actual tdee', 'adaptive calorie target', 'checkpoints'],
    summary: 'Energy out equals energy in minus energy stored. With a few weeks of weigh-ins and food logs you can compute your maintenance directly instead of guessing.',
    body:
      'If you ate an average of 2,400 kcal a day over three weeks and lost 0.3 kg a week, you stored about ' +
      '−330 kcal a day, so your maintenance was around 2,730. This is the same arithmetic metabolic researchers use, ' +
      'and it beats any equation because it includes everything — your NEAT, your digestion, your genetics. It needs ' +
      'a long enough window to average out water weight, honest logging, and the 7,700 kcal/kg convention for what a ' +
      'kilo of change is worth. It also shows you metabolic adaptation as it happens.',
    evidence: [
      E('Hall et al. (2011), Lancet — quantification of the effect of energy imbalance on bodyweight', 'Hall quantification of the effect of energy imbalance on bodyweight'),
      E('Hall (2008), International Journal of Obesity — energy deficit per unit weight loss', 'Hall what is the required energy deficit per unit weight loss'),
    ],
    ferox: 'core/metabolism.js does exactly this. It refuses to answer below 14 days of weigh-ins and 8 logged food days, clamps the result to ±30% of the prediction, and recomputes at every checkpoint.',
  },
  {
    id: '3500-rule', cat: 'nutrition',
    title: 'The 3,500-calories-per-pound rule is wrong in a useful way',
    tags: ['7700 kcal per kg', 'calories per pound of fat', 'weight loss math'],
    summary: 'A kilo of fat holds about 7,700 kcal, but the body spends less as it shrinks, so a fixed deficit loses about half what the rule predicts over a year.',
    body:
      'The old rule says cut 500 kcal a day and lose a pound a week indefinitely. The first half is roughly right: ' +
      'adipose tissue is about 87% fat, so a kilo stores around 7,700 kcal. The second half ignores that a lighter, ' +
      'leaner body with a slower metabolism closes the deficit as you go. Dynamic models predict the real curve: fast ' +
      'at first, then flattening, reaching a new stable weight rather than falling forever. The rule is fine for a ' +
      'fortnight and badly wrong for a year — which is why the target has to be re-measured.',
    evidence: [
      E('Hall et al. (2011), Lancet — the dynamic model of weight change', 'Hall quantification of the effect of energy imbalance on bodyweight'),
      E('Thomas et al. (2014), Journal of the Academy of Nutrition and Dietetics — time to correctly predict weight loss', 'Thomas time to correctly predict the amount of weight loss with dieting'),
    ],
    ferox: 'The 7,700 figure is used for the energy-stored term, over windows long enough for water noise to average out, and the target is recomputed every fortnight rather than set once.',
  },
  {
    id: 'carbs-for-training', cat: 'nutrition',
    title: 'Carbohydrate is fuel for lifting',
    tags: ['carbs before workout', 'glycogen', 'low carb training', 'pre workout meal'],
    summary: 'Hard training runs on muscle glycogen. Very low carbohydrate reduces the reps you can do in a session, which over months is less growth.',
    body:
      'Glycogen is the primary fuel for sets of more than a few reps, and depleted muscles produce fewer reps at a ' +
      'given weight. Carbohydrate restriction has a small, inconsistent cost to strength and a clearer cost to ' +
      'volume and to how training feels. A review of carbohydrate and resistance training suggests around 3–5 g/kg ' +
      'a day covers most lifters, with a carbohydrate-containing meal in the hours before a session. Keto diets can ' +
      'work for fat loss, but they are a worse way to train hard.',
    evidence: [
      E('Henselmans et al. (2022), Nutrients — carbohydrate intake and resistance training performance', 'Henselmans the effect of carbohydrate intake on strength and resistance training performance a systematic review'),
      E('Burke et al. (2011), Journal of Sports Sciences — carbohydrates for training and competition', 'Burke Hawley Wong Jeukendrup carbohydrates for training and competition'),
    ],
    ferox: 'After protein and fat are set, carbohydrate takes the rest of the calories, so it rises automatically in the surplus seasons where the training is heaviest.',
  },
  {
    id: 'dietary-fat', cat: 'nutrition',
    title: 'Do not cut fat too low',
    tags: ['low fat diet', 'testosterone', 'hormones', 'how much fat'],
    summary: 'Below about 0.5 g of fat per kilo a day, sex hormones fall and food becomes miserable. Around 20–30% of calories is the comfortable range.',
    body:
      'Men switched from a 40%-fat to a 20%-fat diet dropped total and free testosterone measurably; the change ' +
      'reversed when fat came back. Fat also carries the fat-soluble vitamins and makes a diet palatable enough to ' +
      'follow. Reviews of physique athletes recommend keeping fat at 0.5–1.5 g/kg a day, which for most people is ' +
      'about a quarter of calories. The hormonal effect is modest and probably irrelevant for muscle at normal ' +
      'intakes; the adherence effect of a very low-fat diet is not.',
    evidence: [
      E('Dorgan et al. (1996), American Journal of Clinical Nutrition — dietary fat and sex hormones in men', 'Dorgan effects of dietary fat and fiber on plasma and urine androgens and estrogens in men'),
      E('Helms, Aragon & Fitschen (2014), JISSN — contest preparation nutrition review', 'Helms Aragon Fitschen evidence-based recommendations natural bodybuilding contest preparation nutrition'),
    ],
    ferox: 'The balanced diet puts 27% of calories into fat; even the high-carb option keeps 20%.',
  },
  {
    id: 'protein-sources', cat: 'nutrition',
    title: 'Plant protein builds muscle too',
    tags: ['vegan protein', 'vegetarian', 'animal vs plant', 'soy', 'complete protein'],
    summary: 'With enough total protein, plant and animal sources produce the same strength and muscle gains. Plant eaters should aim a little higher and mix sources.',
    body:
      'A meta-analysis of trials comparing animal and plant protein found no difference in strength gains and ' +
      'only a small advantage to animal protein for lean mass in younger people, which disappeared when total intake ' +
      'was adequate. Most plant proteins are lower in leucine and slightly less digestible, so a vegan lifter does ' +
      'well to eat about 10–20% more protein than the standard target and to combine sources — legumes with grains, ' +
      'soy, seitan, pea or rice protein powder. The muscle cannot tell where the amino acids came from.',
    evidence: [
      E('Lim et al. (2021), Nutrients — animal vs plant protein and lean mass and strength meta-analysis', 'Lim animal protein versus plant protein in supporting lean mass and muscle strength a systematic review and meta-analysis of randomized controlled trials'),
    ],
  },
  {
    id: 'whole-foods', cat: 'nutrition',
    title: 'Why whole foods make dieting easier',
    tags: ['processed food', 'clean eating', 'junk food', 'ultra processed', 'healthy eating'],
    summary: 'People eat about 500 kcal a day more on an ultra-processed diet than on a matched whole-food one, without meaning to. The foods are not evil; they are easy.',
    body:
      'In a tightly controlled inpatient trial, the same people ate ultra-processed and unprocessed diets matched for ' +
      'calories offered, sugar, fat, fibre and macronutrients for two weeks each. On the ultra-processed diet they ' +
      'ate 500 kcal a day more and gained weight; on the other they lost it. Processed foods are energy-dense, soft, ' +
      'fast to eat and engineered to be hard to stop. Basing most meals on meat, fish, eggs, dairy, legumes, fruit, ' +
      'vegetables and potatoes is not moral purity; it is a way of hitting a deficit while feeling full.',
    evidence: [
      E('Hall et al. (2019), Cell Metabolism — ultra-processed diets and ad libitum intake', 'Hall ultra-processed diets cause excess calorie intake and weight gain inpatient randomized controlled trial'),
    ],
  },
  {
    id: 'fibre', cat: 'nutrition',
    title: 'Fibre: 25–30 grams a day',
    tags: ['fiber', 'vegetables', 'gut health', 'constipation', 'how much fibre'],
    summary: 'High fibre intake is associated with 15–30% lower mortality and keeps you full. Most people get half of what they need.',
    body:
      'A series of meta-analyses commissioned for the WHO found that people eating 25–29 g of fibre a day had ' +
      'substantially lower rates of heart disease, diabetes, bowel cancer and death than those eating the least, ' +
      'with the benefit still rising above 30 g. Fibre slows digestion, feeds the gut bacteria, and adds bulk ' +
      'without calories, which is why high-fibre meals are filling. Beans, lentils, oats, fruit, vegetables and ' +
      'whole grains get you there; a protein-heavy diet that forgets them is a common cause of a miserable gut.',
    evidence: [
      E('Reynolds et al. (2019), Lancet — carbohydrate quality and human health', 'Reynolds carbohydrate quality and human health a series of systematic reviews and meta-analyses'),
    ],
  },
  {
    id: 'vitamin-d', cat: 'nutrition',
    title: 'Vitamin D, if you live somewhere dark',
    tags: ['supplements', 'deficiency', 'winter', 'bone health'],
    summary: 'A large share of athletes in northern latitudes are deficient in winter. Correcting a deficiency helps bone and muscle function; megadoses do not help anyone.',
    body:
      'Across studies of athletes, more than half were insufficient in vitamin D, with the proportion highest in ' +
      'winter and at higher latitudes. Deficiency impairs muscle function and bone remodelling, and correcting it ' +
      'restores them; supplementing people who are already sufficient produces nothing measurable. The sensible ' +
      'approach is a blood test, or failing that a modest daily dose — around 1,000–2,000 IU — from October to March ' +
      'if you live far from the equator and work indoors. It is cheap and the downside is small.',
    evidence: [
      E('Farrokhyar et al. (2015), Sports Medicine — prevalence of vitamin D inadequacy in athletes', 'Farrokhyar prevalence of vitamin D inadequacy in athletes a systematic review and meta-analysis'),
    ],
  },
  {
    id: 'alcohol', cat: 'nutrition',
    title: 'Alcohol and training',
    tags: ['drinking', 'beer', 'hangover workout', 'does alcohol affect gains'],
    summary: 'A heavy session of drinking after training cut muscle protein synthesis by about a quarter even with protein on board. A drink or two is noise; a night out is not.',
    body:
      'Athletes who drank the equivalent of about seven standard drinks after training, with protein, showed a 24% ' +
      'drop in muscle protein synthesis over the following hours; with carbohydrate instead of protein it was 37%. ' +
      'Alcohol also disrupts the deep sleep that recovery runs on, dehydrates, and carries 7 kcal a gram that nobody ' +
      'logs. Moderate drinking — a glass of wine with dinner — has no measurable effect on gains. Binges do, and ' +
      'the weekend binge is the most common reason a Friday leg day does not pay off.',
    evidence: [
      E('Parr et al. (2014), PLoS One — alcohol ingestion impairs post-exercise protein synthesis', 'Parr alcohol ingestion impairs maximal post-exercise rates of myofibrillar protein synthesis following a single bout of concurrent training'),
    ],
  },
  {
    id: 'hydration', cat: 'nutrition',
    title: 'Hydration and strength',
    tags: ['drink water', 'dehydrated', 'electrolytes', 'how much water'],
    summary: 'Losing 3–4% of bodyweight in water cuts strength by a few percent and endurance by more. Drink to thirst, more in heat, and do not obsess.',
    body:
      'A review of hydration and resistance exercise found that moderate dehydration reduced strength by about 2% ' +
      'and high-intensity endurance by around 10%, with effects growing at larger deficits. The simple test is urine ' +
      'colour — pale straw is fine — and a weigh-in before and after a sweaty session tells you how much to replace. ' +
      'Electrolyte drinks matter for long or very hot sessions, not for an hour of lifting. Water with meals and a ' +
      'bottle in the gym covers almost everyone.',
    evidence: [
      E('Judelson et al. (2007), Sports Medicine — hydration and muscular performance', 'Judelson hydration and muscular performance does fluid balance affect strength power and high-intensity endurance'),
    ],
  },
  {
    id: 'body-fat-measurement', cat: 'nutrition',
    title: 'Why your scale\'s body fat reading is unreliable',
    tags: ['bia', 'body composition', 'dexa', 'how to measure body fat', 'calipers'],
    summary: 'Home bioimpedance scales can be off by 5–8 percentage points and swing with hydration. Use them for trend only, or use a tape measure.',
    body:
      'Bioelectrical impedance estimates fat by running a small current through you and assuming a water content, ' +
      'so breakfast, a workout, or a salty dinner changes the reading by several points. Against DEXA, consumer ' +
      'devices show individual errors of up to 8% body fat even when the group average looks fine. A waist ' +
      'measurement at the navel, taken weekly under the same conditions, tracks fat loss more reliably and costs ' +
      'nothing. Photos every few weeks catch what neither number does.',
    evidence: [
      E('Kyle et al. (2004), Clinical Nutrition — bioelectrical impedance analysis, ESPEN review', 'Kyle bioelectrical impedance analysis part II utilization in clinical practice'),
    ],
    ferox: 'Weigh-ins accept an optional body-fat figure, and lean mass is derived from it, but every checkpoint is judged on the weight trend rather than on that number.',
  },

  /* ================================================================= cardio */

  {
    id: 'zone-2', cat: 'cardio',
    title: 'Zone 2: most of your cardio should be easy',
    tags: ['liss', 'steady state', 'conversational pace', 'polarised', '80/20', 'heart rate zones'],
    summary: 'Endurance athletes do about 80% of their training at a pace where they can talk, and it is the easy volume that builds the aerobic base.',
    body:
      'Analyses of elite endurance training find a polarised pattern: roughly four-fifths of sessions at low ' +
      'intensity, a sliver in the middle, and the rest genuinely hard. The easy work builds mitochondria, ' +
      'capillaries and fat-burning capacity without the recovery cost of intervals, which means it can be done ' +
      'often and alongside lifting. For a lifter, two or three sessions of 30–45 minutes of brisk walking, cycling ' +
      'or rowing at a pace you could hold a conversation at is the whole prescription. If you cannot talk, it is ' +
      'not zone 2.',
    evidence: [
      E('Seiler (2010), International Journal of Sports Physiology and Performance — intensity distribution in endurance athletes', 'Seiler what is best practice for training intensity and duration distribution in endurance athletes'),
    ],
    ferox: 'Cut and Recomp prescribe steady-state cardio and walking, not intervals, because they recover cheaply next to heavy lifting.',
  },
  {
    id: 'hiit', cat: 'cardio',
    title: 'HIIT versus steady cardio for fat loss',
    tags: ['intervals', 'tabata', 'sprints', 'afterburn', 'epoc', 'moderate intensity'],
    summary: 'Intervals and steady cardio produce the same fat loss when the work is matched. Intervals save time; steady is easier to recover from. The "afterburn" is small.',
    body:
      'A meta-analysis in overweight adults found HIIT and moderate continuous training produced similar reductions ' +
      'in body fat and waist, with HIIT taking about 40% less time. The post-exercise oxygen consumption that ' +
      'marketing calls the afterburn is real but adds perhaps 6–15% to the session\'s cost — tens of calories. ' +
      'Intervals are an efficient fitness tool and a demanding one; done hard, they compete with leg training for ' +
      'recovery. Use them when time is short and legs are fresh, and use steady work the rest of the time.',
    evidence: [
      E('Wewege et al. (2017), Obesity Reviews — HIIT vs MICT and body composition meta-analysis', 'Wewege effects of high-intensity interval training vs moderate-intensity continuous training on body composition in overweight and obese adults'),
      E('LaForgia, Withers & Gore (2006), Journal of Sports Sciences — exercise intensity and EPOC', 'LaForgia effects of exercise intensity and duration on the excess post-exercise oxygen consumption'),
    ],
  },
  {
    id: 'vo2max', cat: 'cardio',
    title: 'Cardiorespiratory fitness is the strongest predictor of lifespan we have',
    tags: ['vo2 max', 'aerobic fitness', 'longevity', 'why do cardio', 'heart health'],
    summary: 'Across 122,000 people, being in the top fitness group was associated with the lowest mortality, and there was no level of fitness at which the benefit stopped.',
    body:
      'In a large cohort tested on a treadmill, all-cause mortality fell steadily with each step up in aerobic ' +
      'fitness, and the elite group had lower risk still — no ceiling. Low fitness carried a risk comparable to ' +
      'or greater than smoking, diabetes or heart disease. For a lifter who dislikes cardio the message is ' +
      'uncomfortable but clear: strength is one organ of health and the heart and lungs are another, and a couple ' +
      'of hours a week of real aerobic work is not optional if the goal includes being alive at eighty.',
    evidence: [
      E('Mandsager et al. (2018), JAMA Network Open — cardiorespiratory fitness and long-term mortality', 'Mandsager association of cardiorespiratory fitness with long-term mortality among adults undergoing exercise treadmill testing'),
    ],
  },

  /* =============================================================== recovery */

  {
    id: 'sleep', cat: 'recovery',
    title: 'Sleep is where the training is turned into muscle',
    tags: ['how much sleep', 'sleep and gains', 'recovery', '8 hours'],
    summary: 'Extending sleep improved speed, accuracy and mood in athletes. Cutting it during a diet shifted the weight lost from fat to muscle. Seven to nine hours is the target.',
    body:
      'College basketball players who extended sleep toward ten hours sprinted faster, shot better and reported ' +
      'better mood. In a separate crossover study, dieters sleeping 5.5 hours lost 55% less fat and 60% more lean ' +
      'mass than the same people sleeping 8.5 hours on the same calories. Growth hormone pulses, muscle protein ' +
      'synthesis and glycogen restoration all run during sleep, and appetite hormones go wrong without it. ' +
      'No supplement or programme survives chronic short sleep.',
    evidence: [
      E('Mah et al. (2011), Sleep — sleep extension and basketball performance', 'Mah effects of sleep extension on the athletic performance of collegiate basketball players'),
      E('Nedeltcheva et al. (2010), Annals of Internal Medicine — insufficient sleep undermines dietary fat loss', 'Nedeltcheva insufficient sleep undermines dietary efforts to reduce adiposity'),
    ],
    ferox: 'Several seasons list sleep under "watch". The readiness check-in is where a bad night turns into a lighter session instead of a skipped one.',
  },
  {
    id: 'overtraining', cat: 'recovery',
    title: 'Overreaching, overtraining, and the difference',
    tags: ['overtrained', 'burnout', 'too much training', 'fatigue', 'under recovery'],
    summary: 'Short-term overreaching is a normal part of a hard block and resolves with a deload. True overtraining syndrome takes months to produce and months to recover from, and is rare in recreational lifters.',
    body:
      'The joint consensus of the European and American colleges of sport science distinguishes functional ' +
      'overreaching — a planned dip in performance that rebounds within a couple of weeks of reduced load — from ' +
      'overtraining syndrome, a months-long collapse in performance with mood, sleep and hormonal disturbance that ' +
      'almost always involves heavy endurance volume, life stress and inadequate food. The warning signs are a ' +
      'persistent drop in performance, elevated resting heart rate, poor sleep, irritability and getting every cold. ' +
      'For most gym-goers, what feels like overtraining is under-eating and under-sleeping.',
    evidence: [
      E('Meeusen et al. (2013), Medicine & Science in Sports & Exercise — joint consensus statement on overtraining syndrome', 'Meeusen prevention diagnosis and treatment of the overtraining syndrome joint consensus statement'),
    ],
  },
  {
    id: 'stress', cat: 'recovery',
    title: 'Life stress slows recovery',
    tags: ['work stress', 'cortisol', 'mental stress', 'recovery from training'],
    summary: 'Students under high life stress recovered strength and energy after a hard session far more slowly than low-stress peers. Stress is a training load; budget for it.',
    body:
      'Undergraduates were tested after a heavy leg session over four days. Those reporting high chronic stress ' +
      'recovered maximal strength, energy and soreness markedly more slowly than those reporting low stress, with ' +
      'the same workout. The nervous and endocrine systems do not distinguish an exam from a squat day; both draw ' +
      'from the same recovery budget. In a stressful month, cut volume rather than intensity, keep the habit, and ' +
      'do not read a stalled lift as a failed programme.',
    evidence: [
      E('Stults-Kolehmainen, Bartholomew & Sinha (2014), Journal of Strength and Conditioning Research — chronic stress and recovery', 'Stults-Kolehmainen chronic psychological stress impairs recovery of muscular function and somatic sensations over a 96-hour period'),
    ],
    ferox: 'The readiness score is how stress reaches the plan. A six instead of an eight shaves sets and load for that day without touching the programme.',
  },
  {
    id: 'cold-water', cat: 'recovery',
    title: 'Ice baths blunt muscle growth',
    tags: ['cold plunge', 'cryotherapy', 'cold shower', 'ice bath after workout'],
    summary: 'Cold-water immersion after lifting reduced strength and muscle gains over twelve weeks compared with an active cool-down. Save the cold for competition recovery, not training.',
    body:
      'Men who took a ten-minute cold bath after each session gained less muscle and strength over twelve weeks ' +
      'than those who cycled gently instead, and the cold suppressed the signalling and satellite-cell response that ' +
      'training is supposed to trigger. The inflammation after a session is part of the adaptation, and cold ' +
      'suppresses it. Cold immersion still has a place for reducing soreness between competitions or heavy ' +
      'back-to-back days, and some people simply enjoy it; it is just not a recovery aid for someone trying to grow.',
    evidence: [
      E('Roberts et al. (2015), Journal of Physiology — post-exercise cold water immersion attenuates training adaptations', 'Roberts post-exercise cold water immersion attenuates acute anabolic signalling and long-term adaptations in muscle to strength training'),
    ],
  },
  {
    id: 'foam-rolling', cat: 'recovery',
    title: 'Foam rolling, massage and stretching for recovery',
    tags: ['foam roller', 'massage gun', 'myofascial release', 'sore muscles'],
    summary: 'Foam rolling and massage modestly reduce soreness and briefly improve range of motion. They do not speed up tissue repair. Harmless, mildly useful, not essential.',
    body:
      'A meta-analysis of foam rolling found small improvements in sprint performance and flexibility when used ' +
      'before training, and small reductions in soreness when used after. A broader review of recovery techniques ' +
      'found massage the most effective for soreness and perceived fatigue, with active recovery and compression ' +
      'next, and stretching doing little. None of them changes the rate of muscle repair; they change how it feels. ' +
      'If rolling makes you more willing to train, it has done its job.',
    evidence: [
      E('Wiewelhove et al. (2019), Frontiers in Physiology — foam rolling meta-analysis', 'Wiewelhove a meta-analysis of the effects of foam rolling on performance and recovery'),
      E('Dupuy et al. (2018), Frontiers in Physiology — recovery techniques for DOMS and fatigue', 'Dupuy an evidence-based approach for choosing post-exercise recovery techniques to reduce markers of muscle damage soreness fatigue and inflammation'),
    ],
  },
  {
    id: 'hrv', cat: 'recovery',
    title: 'Resting heart rate and HRV as readiness signals',
    tags: ['heart rate variability', 'whoop', 'garmin readiness', 'recovery score', 'wearables'],
    summary: 'A rising resting heart rate or a falling heart-rate-variability trend over a week is a decent signal of accumulated fatigue. A single morning\'s number is noise.',
    body:
      'Heart rate variability reflects the balance of the autonomic nervous system and falls with fatigue, illness, ' +
      'alcohol and stress. Research in endurance athletes finds that a seven-day rolling average is a useful guide to ' +
      'whether to push or back off, while day-to-day values swing too much to act on. Wearables that produce a daily ' +
      '"recovery score" are reporting that noisy number dressed up. Use the trend, combine it with how you actually ' +
      'feel, and never let a watch cancel a session you are ready for.',
    evidence: [
      E('Plews et al. (2013), Sports Medicine — training adaptation and heart rate variability', 'Plews training adaptation and heart rate variability in elite endurance athletes opening the door to effective monitoring'),
    ],
    ferox: 'The check-in asks a human question — how much is in the tank — rather than reading a sensor, because the subjective score is the better predictor and everyone has it.',
  },

  /* ============================================================== technique */

  {
    id: 'form-vs-weight', cat: 'technique',
    title: 'Form first, then weight',
    tags: ['ego lifting', 'cheating reps', 'good form', 'technique breakdown'],
    summary: 'Technique that stays the same from the first rep to the last is the condition under which progressive overload is real. A heavier set with worse form is a different exercise.',
    body:
      'Lifting injuries cluster around technical breakdown under loads that rose faster than the tissues adapted, ' +
      'not around any particular exercise. Consistent technique also makes the log honest: ten reps with a strict ' +
      'row and ten with a heave from the hips are not the same number, and progression built on the second is built ' +
      'on sand. Set the standard for a rep — depth, range, pause, control — and only count reps that meet it. Then ' +
      'adding weight means something.',
    evidence: [
      E('Keogh & Winwood (2017), Sports Medicine — injuries across the weight-training sports', 'Keogh Winwood the epidemiology of injuries across the weight-training sports'),
    ],
    ferox: 'The load suggestion only rises when every prescribed rep was completed. The honest way to log a cheated rep is to not count it.',
  },
  {
    id: 'training-around-pain', cat: 'technique',
    title: 'Training around pain, and when to stop',
    tags: ['injury', 'sore joint', 'should I train hurt', 'tendon pain', 'pain scale'],
    summary: 'Mild pain that settles within a day and does not worsen over a week is usually safe to train through at reduced load. Sharp pain, swelling, numbness, or pain that climbs across sessions means stop and get it looked at.',
    body:
      'Modern tendon and back-pain rehabilitation loads the painful tissue deliberately, because complete rest ' +
      'deconditions it and delays recovery. A common guideline accepts pain up to about 3–4 on a 10 scale during ' +
      'and after exercise, provided it returns to baseline by the next day and the trend over weeks is downward. ' +
      'Beyond that, or with any mechanical symptoms — locking, giving way, swelling, pins and needles — the right ' +
      'call is a physiotherapist, not a lighter set. Everything else in the body can still be trained meanwhile.',
    evidence: [
      E('Silbernagel et al. (2007), American Journal of Sports Medicine — continued sports activity using a pain-monitoring model in Achilles tendinopathy', 'Silbernagel continued sports activity using a pain-monitoring model during rehabilitation in patients with Achilles tendinopathy'),
    ],
    ferox: 'Limitations in the profile — a bad knee, no overhead pressing — remove exercises from every future plan rather than leaving you to skip them.',
  },

  /* ================================================================ mindset */

  {
    id: 'consistency', cat: 'mindset',
    title: 'Missing a day does not matter. Missing the habit does.',
    tags: ['missed workout', 'fell off', 'streak', 'motivation'],
    summary: 'A single missed day had no measurable effect on habit formation. Judge yourself on months, not days.',
    body:
      'When researchers tracked people forming a daily habit over twelve weeks, a single missed repetition made no ' +
      'measurable difference to how automatic the behaviour became; what mattered was repetition over weeks. ' +
      'Automaticity plateaued at a median of 66 days, with a range from 18 to 254 — enormous variation between ' +
      'people and behaviours. The useful read is that the week you missed is not a failure to recover from; the ' +
      'session you do next is just the next session.',
    evidence: [
      E('Lally et al. (2010), European Journal of Social Psychology — how are habits formed', 'Lally how are habits formed modelling habit formation in the real world'),
    ],
    ferox: 'Streaks are shown to motivate and never to punish, and a scaled session counts exactly as much as a full one.',
  },
  {
    id: 'implementation-intentions', cat: 'mindset',
    title: '"When X, I will Y": the most reliable trick for actually training',
    tags: ['make it a habit', 'planning', 'schedule workouts', 'motivation hacks'],
    summary: 'Writing down exactly when and where you will train roughly doubled the proportion of people who did, in a classic trial. Intentions without a cue rarely survive the week.',
    body:
      'Participants who were asked to write "During the next week I will exercise on [day] at [time] in [place]" ' +
      'trained at a rate of 91%, against 35% for a motivational leaflet alone. Meta-analyses across hundreds of ' +
      'studies find the same medium-to-large effect: a concrete if-then plan hands the decision to the cue instead ' +
      'of to willpower at 6 pm. Put the sessions in the calendar as appointments, pack the bag the night before, and ' +
      'decide in advance what the fallback is on the day something goes wrong.',
    evidence: [
      E('Milne, Orbell & Sheeran (2002), British Journal of Health Psychology — implementation intentions and exercise', 'Milne combining motivational and volitional interventions to promote exercise participation protection motivation theory and implementation intentions'),
      E('Gollwitzer & Sheeran (2006), Advances in Experimental Social Psychology — implementation intentions meta-analysis', 'Gollwitzer Sheeran implementation intentions and goal achievement a meta-analysis of effects and processes'),
    ],
    ferox: 'Setup asks which days you train, and the plan is laid out on those days rather than as a list to fit in somewhere.',
  },
  {
    id: 'goal-setting', cat: 'mindset',
    title: 'Set goals you can act on this week',
    tags: ['smart goals', 'outcome vs process', 'motivation', 'lose 10kg'],
    summary: 'Specific, challenging goals outperform "do your best", and process goals you control — sessions done, protein hit — beat outcome goals the scale controls.',
    body:
      'Decades of goal-setting research show specific, difficult goals produce better performance than vague or easy ' +
      'ones, as long as the person is committed and gets feedback. The catch for fitness is that outcome goals — a ' +
      'bodyweight, a bench number — depend on things you cannot directly do today, so a bad week on the scale feels ' +
      'like failure even when every input was right. Set the outcome, then run the week on process targets: three ' +
      'sessions, 150 g of protein, 8,000 steps. Those you can tick, and the outcome follows them.',
    evidence: [
      E('Locke & Latham (2002), American Psychologist — goal setting theory, 35 years on', 'Locke Latham building a practically useful theory of goal setting and task motivation a 35-year odyssey'),
      E('McEwan et al. (2016), Health Psychology Review — goal setting and physical activity meta-analysis', 'McEwan the effectiveness of multi-component goal setting interventions for changing physical activity behaviour'),
    ],
    ferox: 'Checkpoints express the outcome as a fortnightly target, and the dashboard counts the process — sessions, meals logged, weigh-ins.',
  },
  {
    id: 'enjoyment', cat: 'mindset',
    title: 'The best programme is the one you like',
    tags: ['stick to it', 'adherence', 'boring workouts', 'fun'],
    summary: 'How much people enjoy an activity predicts whether they keep doing it better than how good it is for them. Pick training you look forward to.',
    body:
      'A review of prospective studies found affective response — simply whether exercise felt good — predicted ' +
      'future physical activity consistently, while beliefs about its benefits did not. The physiological ' +
      'differences between sensible programmes are a few percent; the difference between the programme you do and ' +
      'the one you abandon is total. If you hate running, do not run. If a lifting style you find fun is 10% less ' +
      'optimal, it is still the better choice, because you will still be doing it in two years.',
    evidence: [
      E('Rhodes & Kates (2015), Annals of Behavioral Medicine — affective response and future physical activity', 'Rhodes Kates can the affective response to exercise predict future motives and physical activity behavior a systematic review'),
    ],
    ferox: 'Seasons exist partly for this. A whole year of the same block is dull; a year that moves between mass, athleticism and strength stays interesting.',
  },
  {
    id: 'social-support', cat: 'mindset',
    title: 'Training with someone, or at least telling someone',
    tags: ['gym buddy', 'accountability', 'friends', 'community', 'alone'],
    summary: 'Social support is one of the most consistent predictors of sticking with exercise. A partner, a group, or just someone who sees your log all count.',
    body:
      'Meta-analyses of adherence find that support from friends, family and training partners is reliably ' +
      'associated with more physical activity, and that interventions adding a social element retain more people. ' +
      'The mechanisms are mundane and powerful: someone expecting you at seven, someone who will notice a missed ' +
      'week, and someone to compare notes with. Most people train alone; most people who are still training in ' +
      'five years are not entirely.',
    evidence: [
      E('Scarapicchia et al. (2017), Health Psychology Review — social support and physical activity meta-analysis', 'Scarapicchia social support and physical activity participation among healthy adults a systematic review of prospective studies'),
    ],
    ferox: 'Friends can see each other\'s progress, and the pacers on the board are there to be chased — labelled as what they are, because a fake friend motivates nobody for long.',
  },
  {
    id: 'mental-health', cat: 'mindset',
    title: 'Lifting is an antidepressant',
    tags: ['depression', 'anxiety', 'mood', 'mental health exercise', 'stress relief'],
    summary: 'Resistance training reduced depressive symptoms with a moderate effect across 33 trials, regardless of how much strength people gained. It helps whether or not it is working.',
    body:
      'A meta-analysis of randomised trials found resistance training significantly reduced depressive symptoms, ' +
      'with the largest effects in people who started with more symptoms, and no relationship to the amount of ' +
      'strength gained or the total volume done. A companion analysis found the same for anxiety. The effect size is ' +
      'comparable to that of many front-line treatments, and it is additive to them. On the days when the only ' +
      'reason to train is that you feel terrible, that is a sufficient reason.',
    evidence: [
      E('Gordon et al. (2018), JAMA Psychiatry — resistance exercise training and depressive symptoms meta-analysis', 'Gordon association of efficacy of resistance exercise training with depressive symptoms meta-analysis'),
      E('Gordon et al. (2017), Sports Medicine — resistance training and anxiety meta-analysis', 'Gordon the effects of resistance exercise training on anxiety a meta-analysis and meta-regression'),
    ],
  },
];

export const knowledgeById = id => KNOWLEDGE.find(k => k.id === id) ?? null;
export const categoryLabel = id => CATEGORIES.find(c => c.id === id)?.label ?? id;

/**
 * Case-insensitive search across title, summary, body and tags.
 * Every word in the query has to appear somewhere in the entry — "protein
 * cut" finds the deficit-protein entry and not every entry mentioning protein.
 * Matches are ranked: a hit in the title or a tag outranks a hit in the body.
 */
export function searchKnowledge(query, { cat = null } = {}) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const pool = cat ? KNOWLEDGE.filter(k => k.cat === cat) : KNOWLEDGE;
  if (!words.length) return pool;
  const scored = [];
  for (const k of pool) {
    const head = `${k.title} ${k.tags.join(' ')}`.toLowerCase();
    const full = `${head} ${k.summary} ${k.body}`.toLowerCase();
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (head.includes(w)) score += 3;
      else if (full.includes(w)) score += 1;
      else { ok = false; break; }
    }
    if (ok) scored.push([score, k]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map(([, k]) => k);
}
