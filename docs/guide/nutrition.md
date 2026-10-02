# Food and meals

## Four ways to log something

| | When to use it |
|---|---|
| **Add food** | You know what it is called. Search 450+ foods by name or category |
| **Build a meal** | You know what was on the plate but not what the whole thing is called |
| **Your meals** | You have eaten it before. One tap |
| **Photo** | Read [the honest bit](#photographs) below first |

## The database

About 450 foods across protein, dairy, grains, vegetables, fruit, legumes, nuts
and fats, ready meals, snacks, drinks and condiments.

Macros are **per serving**, not per 100 g. Per 100 g is precise and useless when
the thing in front of you is one egg. Every food also carries what a serving
weighs, so when you do know the grams you can enter those instead — the two
fields are linked and update each other live.

Every row's calories are checked against its macros when the database is built,
and the build fails if any is more than 12% out. A typo in a food database is a
calorie target that is quietly wrong for months.

## Foods of your own

Nothing in the database matching what you eat? **Your foods → New.** Enter the
macros and the calories are worked out from them — 4 per gram of protein and
carbs, 9 per gram of fat — so the two can never disagree. Your foods rank first
in every search from then on.

## Meals that save themselves

This is the part you do not have to do anything to get.

Every time you log two or more foods together, FEROX fingerprints the
combination and counts it. Nothing is saved and you are not asked anything. The
**second** time the same combination shows up, it offers to save it as a named
meal.

Being asked to name your breakfast the first time you eat it is an interruption.
Being asked the second time is a shortcut.

The fingerprint is the set of foods, not the portions — the same plate with the
portions nudged is still the same plate, and somebody who has two eggs one day
and three the next should not end up with two different saved breakfasts.

Saved meals log in one tap and sort themselves by how often you use them.

## Water

Tap a glass or half a litre. The target is 35 ml per kilo of bodyweight plus
half a litre on a day you trained. It is a rule of thumb, not a prescription —
thirst and pale urine beat any number.

## Photographs

The honest version, because this is where fitness apps tend to be least honest.

**FEROX cannot look at a plate and tell you what is on it.** Recognising food and
estimating a portion needs a vision model; the smallest useful ones are many
times the size of this entire app, and they would have to be downloaded before
you could take your first photo. There is no way to do it offline in plain
JavaScript. An app that offers it anyway is either shipping that download or
sending your photograph somewhere without telling you.

So the photo button does two things that are actually true:

1. **It reads and shrinks the photo on your device** and keeps it with the meal.
   Your phone never sends it anywhere. A picture of what you ate is a better
   memory aid than a number you half-guessed, and this part always works.
2. **It offers an estimate only if this copy of FEROX has been configured with
   an estimator**, the same way Google sign-in only appears once a client id is
   set. It is off by default. When it is on, you are told the photo is leaving
   your device and where it is going, and asked, before it goes.

Whatever an estimator returns opens in the plate builder for you to correct. It
is never logged silently. Portion size from one photograph is genuinely hard —
the same bowl of rice is 200 or 400 kcal depending how deep it is, and a
photograph does not show depth.

If you run your own estimator, point `config.visionEndpoint` at it.

## Why your calorie target is what it is

Nutrition → the **Why N kcal** card shows the whole chain: what the equation
predicted, what your own log actually measured, what your season shifts it by,
and how consistently you have been hitting it. See
[Weigh-ins and checkpoints](progress.md).
