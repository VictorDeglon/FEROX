/**
 * Onboarding.
 *
 * Nine short steps that produce a real starting plan. The tone matters as much
 * as the data: every step says plainly that this is a baseline and changeable,
 * because the fastest way to lose someone on step three is to make them feel
 * they are being assessed.
 */
import { store } from '../core/store.js';
import { auth } from '../core/auth.js';
import { esc, toast, initTheme } from '../core/ui.js';
import { icon, brandMark } from '../core/icons.js';
import { seasonIcon } from '../core/season-icons.js';
import {
  SEXES, GOALS, LEVELS, ACTIVITY, EQUIPMENT, LIMITS,
  targetsFor, summarise, suggestedSeason,
} from '../core/profile.js';
import { seasonById, defaultYear, DEFAULT_LAYOUT, slotsFor } from '../core/seasons.js';
import { buildWeek, weeklyFrequency, templateFor } from '../core/split.js';

initTheme();

const a = {
  name: '', sex: '', age: 24, heightCm: 178, weightKg: 78,
  activity: 3, level: 3, goal: '', daysPerWeek: 4,
  equipment: 'gym', limits: [],
};

let step = 0;
const view = document.getElementById('view');

/* ------------------------------------------------------------------- steps */

const STEPS = [
  {
    q: 'What should we call you?',
    sub: 'Just for your profile. Nothing leaves this device.',
    valid: () => a.name.trim().length > 0,
    render: () => `
      <div class="field">
        <input class="input" id="nameIn" value="${esc(a.name)}" placeholder="Your name"
          autocomplete="given-name" autocapitalize="words" maxlength="40" style="font-size:var(--step-1);min-height:54px">
      </div>
      ${note('You can change this, and everything else, any time in your profile.')}`,
    wire: el => {
      const i = el.querySelector('#nameIn');
      i.focus();
      i.addEventListener('input', () => { a.name = i.value; refreshFoot(); });
      i.addEventListener('keydown', e => { if (e.key === 'Enter' && a.name.trim()) next(); });
    },
  },
  {
    q: 'A few basics',
    sub: 'These set your calorie baseline. Rough is fine — we only need a starting point.',
    valid: () => Boolean(a.sex),
    render: () => `
      <div class="stack" style="gap:var(--sp-s)">
        <div>
          <p class="eyebrow" style="margin-bottom:9px">Sex</p>
          <div class="choices choices-3">
            ${SEXES.map(s => choice(s.id, s.label, '', a.sex === s.id, 'sex')).join('')}
          </div>
          <p class="dim" style="font-size:var(--step--2);margin-top:8px">
            Used for the metabolic equation only — it changes the calorie estimate by about 160 kcal.</p>
        </div>
        ${slider('age', 'Age', a.age, 14, 80, 'years')}
        ${slider('heightCm', 'Height', a.heightCm, 130, 215, 'cm')}
        ${slider('weightKg', 'Weight', a.weightKg, 35, 200, 'kg')}
      </div>`,
  },
  {
    q: "What are you training for?",
    sub: 'This picks your opening season. You can switch seasons whenever you like.',
    valid: () => Boolean(a.goal),
    render: () => `
      <div class="choices">
        ${GOALS.map(g => choice(g.id, g.label, g.hint, a.goal === g.id, 'goal', g.icon)).join('')}
      </div>`,
  },
  {
    q: 'How much training have you done?',
    sub: 'This sets your starting volume. Under-call it — the plan ramps up fast.',
    valid: () => true,
    render: () => `
      ${slider('level', 'Experience', a.level, 1, 5, '', LEVELS.map(l => l.label))}
      <p class="slider-caption" id="lvlCap">${esc(LEVELS.find(l => l.id === a.level).hint)}</p>
      ${note('Beginners make the fastest progress. Starting lower is never the wrong call.')}`,
    wire: el => {
      el.querySelector('#level')?.addEventListener('input', e => {
        el.querySelector('#lvlCap').textContent = LEVELS.find(l => l.id === +e.target.value).hint;
      });
    },
  },
  {
    q: 'How many days a week can you train?',
    sub: 'Be honest about the worst week, not the best one.',
    valid: () => true,
    render: () => `
      ${slider('daysPerWeek', 'Sessions', a.daysPerWeek, 2, 7, 'per week')}
      <div class="card" style="padding:14px" id="splitPreview"></div>`,
    wire: el => {
      const draw = () => {
        const tpl = templateFor(a.daysPerWeek);
        el.querySelector('#splitPreview').innerHTML = `
          <p class="eyebrow">Your split would be</p>
          <strong style="display:block;font-family:var(--font-display);font-size:var(--step-1);margin:5px 0 4px">${esc(tpl.name)}</strong>
          <p class="dim" style="font-size:var(--step--2)">${esc(tpl.note)}</p>
          <div class="row wrap" style="gap:6px;margin-top:11px">
            ${tpl.days.map(d => `<span class="chip">${esc(d.name)}</span>`).join('')}
          </div>`;
      };
      el.querySelector('#daysPerWeek').addEventListener('input', draw);
      draw();
    },
  },
  {
    q: 'How active are you outside the gym?',
    sub: 'Day job, walking, sport. This moves your calories more than most people expect.',
    valid: () => true,
    render: () => `
      ${slider('activity', 'Daily movement', a.activity, 1, 5, '', ACTIVITY.map(x => x.label))}
      <p class="slider-caption" id="actCap">${esc(ACTIVITY.find(x => x.id === a.activity).label)}</p>`,
    wire: el => {
      el.querySelector('#activity').addEventListener('input', e => {
        el.querySelector('#actCap').textContent = ACTIVITY.find(x => x.id === +e.target.value).label;
      });
    },
  },
  {
    q: 'What can you train with?',
    sub: 'We only programme exercises you can actually do.',
    valid: () => true,
    render: () => `
      <div class="choices choices-2">
        ${EQUIPMENT.map(e => choice(e.id, e.label, e.hint, a.equipment === e.id, 'equipment')).join('')}
      </div>`,
  },
  {
    q: 'Anything to work around?',
    sub: 'Pick any that apply and we will leave those exercises out. Not medical advice — if something hurts, see a professional.',
    valid: () => true,
    render: () => `
      <div class="choices choices-2">
        ${LIMITS.map(l => choice(l.id, l.label, '', a.limits.includes(l.id), 'limits')).join('')}
      </div>`,
  },
  {
    q: 'Here is your starting plan',
    sub: 'Built from what you told us. Nothing here is fixed.',
    valid: () => true,
    render: () => summary(),
  },
];

/* --------------------------------------------------------------- fragments */

const note = text => `<div class="onb-note">${icon('sparkle')}<span>${esc(text)}</span></div>`;

function choice(id, label, hint, on, group, ico) {
  return `<button type="button" class="choice" aria-pressed="${on}" data-group="${group}" data-id="${esc(id)}">
    ${ico ? `<span class="choice-ico">${icon(ico)}</span>` : ''}
    <span style="min-width:0"><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
    <span class="choice-check">${icon('check')}</span>
  </button>`;
}

function slider(key, label, value, min, max, unit, labels) {
  const pct = ((value - min) / (max - min)) * 100;
  const shown = labels ? labels[value - min] : value;
  return `<div class="stack" style="gap:4px">
    <div class="slider-head">
      <span class="eyebrow">${esc(label)}</span>
      <span class="slider-value" data-out="${key}">${esc(shown)}${unit && !labels ? `<span class="slider-unit">${esc(unit)}</span>` : ''}</span>
    </div>
    <input type="range" class="slider" id="${key}" data-key="${key}" min="${min}" max="${max}"
      value="${value}" style="--pct:${pct}%" aria-label="${esc(label)}">
    <div class="slider-scale"><span>${labels ? labels[0] : min}</span><span>${labels ? labels.at(-1) : `${max}${unit ? ' ' + unit : ''}`}</span></div>
  </div>`;
}

function summary() {
  const season = seasonById(suggestedSeason(a));
  const s = summarise(a, season);
  const week = buildWeek(a, season, 8, 0);
  const freq = weeklyFrequency(week);
  const main = ['Chest', 'Back', 'Legs', 'Shoulders'].filter(m => freq[m]);

  return `
    <div class="season-card glow-edge" style="--season:${season.accent};--glow-color:${season.accent}">
      <div class="row" style="gap:var(--sp-s);align-items:center">
        <span class="season-art season-art-lg glow-aura" style="--season:${season.accent};--glow-color:${season.accent}">${seasonIcon(season)}</span>
        <div style="min-width:0">
          <p class="eyebrow">Opening season</p>
          <h3 style="font-size:var(--step-2);margin-top:3px">${esc(season.name)}</h3>
          <p class="dim" style="font-size:var(--step--1);margin-top:2px">${esc(season.tagline)}</p>
        </div>
      </div>
      <p class="muted" style="font-size:var(--step--1)">${esc(season.blurb)}</p>
    </div>

    <div class="card">
      <p class="eyebrow" style="margin-bottom:11px">Your daily targets</p>
      <div class="grid grid-4" style="gap:12px">
        ${[['Calories', s.targets.kcal, 'kcal'], ['Protein', s.targets.protein, 'g'],
           ['Carbs', s.targets.carbs, 'g'], ['Fat', s.targets.fat, 'g']]
          .map(([k, v, u]) => `<div class="stat">
            <span class="stat-label">${k}</span>
            <span class="stat-value" style="font-size:var(--step-1)">${v.toLocaleString()}<span class="stat-unit">${u}</span></span>
          </div>`).join('')}
      </div>
      <ul class="stack" style="gap:7px;list-style:none;padding:0;margin-top:16px">
        ${s.lines.map(l => `<li class="row" style="gap:9px;align-items:flex-start">
          <span style="color:var(--ok);width:15px;flex:none;margin-top:2px">${icon('check')}</span>
          <span class="muted" style="font-size:var(--step--1)">${esc(l)}</span></li>`).join('')}
      </ul>
    </div>

    <div class="card">
      <div class="row-between" style="margin-bottom:11px">
        <p class="eyebrow">Your week — ${esc(week.name)}</p>
        <span class="chip chip-ok">each muscle ${Math.min(...main.map(m => freq[m]))}–${Math.max(...main.map(m => freq[m]))}×</span>
      </div>
      <div class="stack" style="gap:7px">
        ${week.days.map(d => `
          <div class="list-item" style="padding:9px 12px">
            <span class="grow" style="min-width:0">
              <strong>${esc(d.name)}</strong><br>
              <small>${esc(d.entries.map(e => e.name).slice(0, 3).join(', '))}${d.entries.length > 3 ? ` +${d.entries.length - 3}` : ''}</small>
            </span>
            <span class="chip">${d.minutes} min</span>
          </div>`).join('')}
      </div>
      <p class="dim" style="font-size:var(--step--2);margin-top:11px">
        Week one runs about 15% harder than your steady state — you are motivated now, so we use it.
        It settles by week four.</p>
    </div>

    ${note('All of this is a starting point. Change your targets, season, split or anything else in your profile whenever you want.')}`;
}

/* ------------------------------------------------------------------ render */

function paint() {
  const s = STEPS[step];
  const pct = (step / (STEPS.length - 1)) * 100;
  const last = step === STEPS.length - 1;

  view.innerHTML = `
    <div class="onb">
      <div class="onb-head">
        <div class="row-between">
          <span class="brand">${brandMark(28)}<span class="brand-word">Ferox</span></span>
          <span class="dim" style="font-size:var(--step--2)">Step ${step + 1} of ${STEPS.length}</span>
        </div>
        <div class="onb-bar"><i style="width:${pct}%"></i></div>
      </div>

      <div class="onb-body">
        <div class="onb-step" id="stepBody">
          <div>
            <h1 class="onb-q">${esc(s.q)}</h1>
            <p class="onb-sub" style="margin-top:7px">${esc(s.sub)}</p>
          </div>
          ${s.render()}
        </div>
      </div>

      <div class="onb-foot">
        ${step > 0 ? `<button class="btn btn-ghost" id="back">Back</button>` : '<span></span>'}
        <button class="btn btn-primary grow ${last ? 'glow-cta' : ''}" id="next">
          <span>${last ? 'Start training' : 'Continue'}</span>${icon(last ? 'bolt' : 'chevron')}
        </button>
      </div>
    </div>`;

  const body = view.querySelector('#stepBody');

  body.querySelectorAll('.slider').forEach(el => {
    el.addEventListener('input', () => {
      const min = +el.min, max = +el.max, v = +el.value;
      el.style.setProperty('--pct', `${((v - min) / (max - min)) * 100}%`);
      a[el.dataset.key] = v;
      const out = body.querySelector(`[data-out="${el.dataset.key}"]`);
      if (out) {
        const labels = { level: LEVELS.map(l => l.label), activity: ACTIVITY.map(x => x.label) }[el.dataset.key];
        const unit = { age: 'years', heightCm: 'cm', weightKg: 'kg', daysPerWeek: 'per week' }[el.dataset.key];
        out.innerHTML = labels ? esc(labels[v - min]) : `${v}${unit ? `<span class="slider-unit">${unit}</span>` : ''}`;
      }
    });
  });

  body.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => {
    const { group, id } = btn.dataset;
    if (group === 'limits') {
      if (id === 'none') a.limits = ['none'];
      else a.limits = a.limits.filter(x => x !== 'none').includes(id)
        ? a.limits.filter(x => x !== id)
        : [...a.limits.filter(x => x !== 'none'), id];
      body.querySelectorAll('[data-group="limits"]').forEach(b =>
        b.setAttribute('aria-pressed', String(a.limits.includes(b.dataset.id))));
    } else {
      a[group] = id;
      body.querySelectorAll(`[data-group="${group}"]`).forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    }
    refreshFoot();
  }));

  s.wire?.(body);
  view.querySelector('#back')?.addEventListener('click', () => { step--; paint(); });
  view.querySelector('#next').addEventListener('click', next);
  refreshFoot();
}

function refreshFoot() {
  const btn = view.querySelector('#next');
  if (btn) btn.disabled = !STEPS[step].valid();
}

async function next() {
  if (!STEPS[step].valid()) return;
  if (step < STEPS.length - 1) { step++; paint(); window.scrollTo(0, 0); return; }
  await finish();
}

async function finish() {
  const seasonId = suggestedSeason(a);
  const season = seasonById(seasonId);
  const year = defaultYear(DEFAULT_LAYOUT);

  // Their goal season takes the block they are standing in right now; the rest
  // of the year keeps the default rotation.
  const { currentSlot } = await import('../core/seasons.js');
  year[currentSlot(DEFAULT_LAYOUT).id] = seasonId;

  await store.completeOnboarding({
    profile: {
      name: a.name.trim(),
      handle: a.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) || 'athlete',
      sex: a.sex, age: a.age, heightCm: a.heightCm, weightKg: a.weightKg,
      activity: a.activity, level: a.level, goal: a.goal,
      daysPerWeek: a.daysPerWeek, equipment: a.equipment, limits: a.limits,
    },
    goals: targetsFor(a, season),
    seasons: year,
    layout: DEFAULT_LAYOUT,
  });

  await store.logWeight(a.weightKg);
  if (!auth.signedIn) auth.signInAsGuest(a.name.trim());
  toast(`Welcome, ${a.name.trim().split(' ')[0]}`, 'ok');
  location.href = 'dashboard.html';
}

await store.init({ token: auth.token });
if (store.data.onboarded) location.replace('dashboard.html');
else paint();
