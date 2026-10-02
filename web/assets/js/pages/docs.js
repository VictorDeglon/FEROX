/** Docs — how FEROX works, the research behind it, privacy and terms. */
import { bootPage, esc } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { RESEARCH } from '../core/research.js';
import { SEASONS } from '../core/seasons.js';

const UPDATED = '29 September 2026';
let tab = location.hash.slice(1) || 'about';

await bootPage({ title: 'Docs' }, render);

const TABS = [
  ['about', 'How it works'],
  ['research', 'The research'],
  ['privacy', 'Privacy'],
  ['terms', 'Terms'],
];

function render(el) {
  el.innerHTML = `
    <div class="seg" style="align-self:start">
      ${TABS.map(([k, l]) => `<button data-t="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}
    </div>
    <div id="pane" class="stack" style="gap:var(--sp-s);max-width:76ch"></div>`;

  el.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.t;
    history.replaceState(null, '', `#${tab}`);
    render(el);
  }));

  const pane = el.querySelector('#pane');
  ({ about, research, privacy, terms })[tab](pane);
}

const h = (t, s) => `<div><h2 style="font-size:var(--step-2)">${esc(t)}</h2>${s ? `<p class="dim" style="font-size:var(--step--1);margin-top:4px">${esc(s)}</p>` : ''}</div>`;
const card = inner => `<div class="card card-pad-lg stack" style="gap:12px">${inner}</div>`;
const p = t => `<p class="muted" style="font-size:var(--step--1)">${t}</p>`;
const h3 = t => `<h3 style="font-size:var(--step-1);margin-top:4px">${esc(t)}</h3>`;
const ul = items => `<ul class="stack" style="gap:8px;list-style:none;padding:0">${items.map(i =>
  `<li class="row" style="gap:10px;align-items:flex-start">
    <span style="color:var(--ember);width:15px;flex:none;margin-top:3px">${icon('check')}</span>
    <span class="muted" style="font-size:var(--step--1)">${i}</span></li>`).join('')}</ul>`;

/* ------------------------------------------------------------------- about */

function about(pane) {
  pane.innerHTML = `
    ${h('How FEROX works', 'The short version of every decision in this app.')}

    ${card(`${h3('It is free, and it stays free')}
      ${p('There is no subscription, no advertising and nothing is sold. FEROX runs entirely in your browser, and the code is public on GitHub for anyone to read. Nobody is monetising your training log because nobody but you has it.')}`)}

    ${card(`${h3('Your data is on your device')}
      ${p('Every session, meal and weigh-in is stored in your browser. It is not uploaded anywhere by default. You can export the lot as JSON from your profile at any time, and import it on another device. If you sign in with Google, that only adds a name and picture to your profile.')}`)}

    ${card(`${h3('The plan is built from your answers')}
      ${p('Setup asks about your size, experience, goal, available days and equipment. From that FEROX estimates your maintenance calories using the Mifflin–St Jeor equation, sets protein per kilo of bodyweight, and builds a weekly split.')}
      ${ul([
        'Every split hits each muscle group <strong>two to three times a week</strong> — the single biggest lever on progress.',
        'Set counts scale with your stated experience, not a one-size number.',
        'Exercises you cannot do — no equipment, a bad knee — are never programmed.',
        'Week one runs about 15% above your steady state, then settles by week four.',
      ])}`)}

    ${card(`${h3('Seasons')}
      ${p(`The training year is split into blocks, and you choose what runs in each. There are ${SEASONS.length} seasons, each built for a different job — building mass, getting lean, getting strong, getting fast, or recovering from the block before.`)}
      ${p('The default rotation is <strong>Greek Fire → Bridge → Winter Fire → Recomp</strong>, which puts the athletic block over summer and the mass block over winter. You can change any of it, including how many blocks the year has.')}
      <div class="row wrap" style="gap:7px">
        ${SEASONS.slice(0, 6).map(s => `<span class="season-chip" style="--season:${s.accent}">${esc(s.name)}</span>`).join('')}
        <span class="chip">+${SEASONS.length - 6} more</span>
      </div>`)}

    ${card(`${h3('The daily check-in')}
      ${p('Before training, FEROX asks how you feel on a scale of one to ten and scales the session to match — fewer sets and lighter loads on a bad day, an extra set and a finisher on a good one.')}
      ${p('This exists because the alternative to a scaled session is usually no session. Training at 60% keeps the habit; staring at a workout you cannot face does not.')}`)}

    ${card(`${h3('What FEROX is not')}
      ${p('It is not medical advice, and it is not a substitute for a coach or a physiotherapist. The calorie and macro numbers are estimates from population equations — they can be off by a few hundred calories for any individual. Use them as a starting point, watch what actually happens to your weight over two or three weeks, and adjust.')}
      ${p('If something hurts, stop and see a professional. No app can see your knee.')}`)}`;
}

/* ---------------------------------------------------------------- research */

function research(pane) {
  pane.innerHTML = `
    ${h('The research', 'Why FEROX does what it does. Every claim here has a paper behind it.')}

    ${card(`${p('These are summaries, not the papers themselves. Each links to the source so you can read it and disagree. Where the evidence is genuinely uncertain, the summary says so — that is more useful than false confidence.')}`)}

    ${RESEARCH.map(r => `
      <article class="card card-pad-lg stack" style="gap:11px">
        <div>
          <p class="eyebrow">${esc(r.topic)}</p>
          <h3 style="font-size:var(--step-1);margin-top:5px">${esc(r.headline)}</h3>
        </div>
        <p class="muted" style="font-size:var(--step--1)">${esc(r.body)}</p>
        <div class="onb-note" style="background:var(--surf-3)">
          ${icon('sparkle')}<span><strong>In FEROX:</strong> ${esc(r.why)}</span>
        </div>
        <div class="row-between wrap" style="gap:10px;padding-top:4px;border-top:1px solid var(--line)">
          <span class="dim" style="font-size:var(--step--2)">${esc(r.source)}</span>
          <a class="btn btn-ghost btn-sm" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">
            ${icon('link')}<span>Read it</span></a>
        </div>
      </article>`).join('')}

    ${card(`${h3('A note on reading studies')}
      ${p('Most exercise science runs on small samples over short periods, often in untrained young men, and the effect sizes are modest. A single study proves very little. The findings above were chosen because they replicate, appear in meta-analyses, or both — but the honest summary of this entire field is that consistency over years beats optimising any of it.')}`)}`;
}

/* ----------------------------------------------------------------- privacy */

function privacy(pane) {
  pane.innerHTML = `
    ${h('Privacy policy', `Last updated ${UPDATED}`)}

    ${card(`${h3('The short version')}
      ${p('FEROX does not collect your data, sell it or look at it. There is no analytics, no tracking, no advertising and no session recording. As a guest, your training log never leaves your device. If you sign in with Google, it is stored in your own account so it follows you between devices — that is what signing in is for, and it is the only thing that changes.')}`)}

    ${card(`${h3('What is stored, and where')}
      ${ul([
        '<strong>As a guest — on your device only.</strong> Sessions, meals, weigh-ins, medals, friends, your season plan and your profile are kept in your browser’s local storage, and nowhere else. No account is created for you, anonymous or otherwise.',
        '<strong>Signed in — in your own Google account.</strong> The same log is stored as a single document in Firestore, readable and writable only by the account that wrote it. Your browser keeps a copy too, so the app still works offline.',
        '<strong>Which one you are in is shown to you.</strong> Profile → Storage says either “This device” or “Your Google account”.',
        '<strong>Nothing is sent to us.</strong> There is no FEROX server. Signed in, your data goes to Google’s infrastructure under your account — not to a system anyone operates on your behalf.',
        '<strong>You can export or delete it all</strong> at any time from your profile. Erasing while signed in empties the cloud copy too, not just this device’s.',
      ])}`)}

    ${card(`${h3('Third parties')}
      ${ul([
        '<strong>Firebase Hosting</strong> serves the site. Google may log standard web-server information such as IP addresses.',
        '<strong>Google Fonts</strong> serves two typefaces. Google may receive your IP address when the fonts load.',
        '<strong>Firebase Authentication</strong> is optional and off unless you sign in. If you do, it confirms who you are with Google and gives the app your name, email and profile picture.',
        '<strong>Cloud Firestore</strong> stores your log, and only while you are signed in. Google operates it and can technically access what is in it, under their privacy policy. Stay a guest if that is not a trade you want to make — nothing is withheld from guests.',
      ])}
      ${p('There is no analytics package, no advertising network, no session recording and no cookies beyond what your browser needs to remember your preferences.')}`)}

    ${card(`${h3('If you sign in with Google')}
      ${p('Signing in is entirely optional and every feature works as a guest. If you do, Firebase verifies you with Google and your log starts syncing to your account, so you can log a session on your phone and see it on your laptop.')}
      ${p('Access is enforced by twenty lines of Firestore rules, published in the repository, which say one thing: you can read and write the document named after your own account, and nothing else. There is no admin path and no sharing.')}
      ${p('Signing out stops the sync and returns you to this device’s log. It does not delete the cloud copy — sign back in and it is there. To remove it, use “Erase everything” while signed in.')}`)}

    ${card(`${h3('Children')}
      ${p('FEROX is not directed at children under 13, and we do not knowingly collect information from them. Since we do not collect information from anyone, this is largely academic — but training advice generated for adults may not be appropriate for a growing body, and young people should train under supervision.')}`)}

    ${card(`${h3('Changes and contact')}
      ${p('If this policy changes in a way that matters, the date above changes and the change appears in the public commit history on GitHub. Questions go to the repository’s issue tracker.')}`)}`;
}

/* ------------------------------------------------------------------- terms */

function terms(pane) {
  pane.innerHTML = `
    ${h('Terms of service', `Last updated ${UPDATED}`)}

    ${card(`${h3('Not medical advice')}
      ${p('<strong>FEROX is an information and tracking tool, not a medical device and not a healthcare provider.</strong> Nothing in this app is medical, nutritional or physiotherapeutic advice, and no part of it is personalised by a qualified professional who has assessed you.')}
      ${p('Consult a doctor before starting a training programme, particularly if you have a heart condition, are pregnant, are recovering from injury or surgery, take medication that affects heart rate or blood pressure, or have not exercised in a long time.')}`)}

    ${card(`${h3('Estimates are estimates')}
      ${p('Calorie and macronutrient targets come from population-level equations. For an individual they can be meaningfully wrong. Treat them as a starting point, measure what actually happens over two to three weeks, and adjust. The same applies to estimated one-rep maxes, which are calculated from a formula and should never be loaded onto a bar untested.')}`)}

    ${card(`${h3('Train within your limits')}
      ${p('You are responsible for your own safety. Warm up, use a spotter or safety pins on heavy lifts, and stop if something hurts in a way that is not ordinary training discomfort. If an exercise is programmed that you should not be doing, do not do it — mark the limitation in your profile and it will stop appearing.')}`)}

    ${card(`${h3('The software comes as it is')}
      ${p('FEROX is provided under the MIT licence, without warranty of any kind. It may contain bugs, may lose data if your browser storage is cleared, and may stop working. Export your data if it matters to you. To the extent the law allows, nobody involved in making FEROX is liable for any loss arising from using it.')}`)}

    ${card(`${h3('Your data, your responsibility')}
      ${p('Because your log lives in your browser, only you have a copy. Clearing site data, using private browsing or losing the device means losing the log. The export button exists for this reason — use it occasionally.')}`)}

    ${card(`${h3('Acceptable use')}
      ${p('The source is public and MIT-licensed: fork it, change it, run your own. What you may not do is pass off a modified version as official FEROX, or use the name or mark to imply an endorsement that does not exist.')}`)}`;
}
