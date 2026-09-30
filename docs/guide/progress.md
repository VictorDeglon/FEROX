# Weigh-ins and checkpoints

## Weighing in

FEROX asks for a weigh-in on a schedule you set — **every other day** out of the
box, anything from daily to weekly, or never. Profile → Weigh-ins.

Weight is the only thing it needs. Everything else is offered and never
demanded: body fat, lean mass, waist, resting heart rate, sleep, how you feel,
and a note. Somebody with a tape measure and no calipers should not be blocked
from logging a waist.

Body fat and lean mass fill each other in — enter either and the other appears,
because they are two views of one fact.

Every measure that has data gets its own chart on the Progress page. Ones you
never record simply do not appear.

### Weighing in properly

Same time of day, first thing, after the bathroom, before food. Bodyweight
swings a kilo or two on water and food alone; if the conditions change day to
day the trend line is noise.

## The trend line, not the scale

The bodyweight chart draws two lines. The solid one is what the scale said. The
dashed one is a regression through every reading.

**The dashed one is the only one worth judging a plan by.** Two endpoints can
show a gain across a fortnight of genuine loss, because the second one happened
to land on a day you had a takeaway and slept badly. The regression uses every
point and is not at the mercy of which day you happened to step on.

## Measuring your actual metabolism

Calorie calculators predict your maintenance from a formula fitted to a
population. For any individual they are routinely 10–15% out.

Once you have a few weeks of weigh-ins and a few weeks of food logging, the
question can be answered directly instead:

```
energy out  =  energy in  −  energy stored
```

A kilogram of body mass is taken as 7,700 kcal. So if you are eating 2,300 kcal
a day and losing 0.4 kg a week, your maintenance is about 2,740 — whatever the
equation said.

### When FEROX refuses to answer

It will not guess from too little. Below **14 days of weigh-ins** and **8 days of
logged food** it says "not enough data yet" and stays on the equation. The
estimate is clamped to ±30% of the prediction, and a low-confidence one is
blended back toward it.

A confidently wrong calorie target is worse than an honest "not yet". The
Progress page shows the confidence rather than hiding it.

## Checkpoints

Every fortnight (configurable) FEROX sets a weight goal, worked out from:

- the gap between your calorie target and your **measured** maintenance
- scaled by your **adherence** — a 500 kcal deficit kept half the time is a 250
  kcal deficit, and pretending otherwise just makes the goal wrong
- capped at 1% of bodyweight a week, the rate above which a cut starts costing
  muscle and a bulk starts being mostly fat

Half a kilo either side counts as on track.

**Checkpoints are recomputed every time you look at them.** A goal set six weeks
ago from a metabolism estimate that has since been corrected should not still be
the goal.

### Adherence

Two numbers, because they fail differently:

- **Logging** — how often you recorded food at all
- **On target** — how often a recorded day landed within 10% of the target

The combined score weights logging at 40% and hitting at 60%. A plan is only as
trustworthy as the first and only as effective as the second.

## Adjustments are offered, never applied

If you miss a checkpoint, FEROX suggests a calorie change. It is capped at 250
kcal, rounded to something you can act on, and **nothing happens until you press
the button**.

Somebody who set their calories deliberately should not find them quietly
rewritten because a fortnight of data disagreed.
