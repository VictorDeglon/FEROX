/** Docs — how FEROX works, the knowledge base, the research behind it, privacy and terms. */
import { bootPage, esc } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { RESEARCH } from '../core/research.js';
import { SEASONS } from '../core/seasons.js';
import { KNOWLEDGE, CATEGORIES, categoryLabel, searchKnowledge } from '../core/knowledge.js';

const UPDATED = '29 September 2026';
/*
 * The hash is a tab name or, for a deep link into the knowledge base,
 * `learn/<entry-id>` — docs.html#learn/abs opens that one entry expanded.
 */
const [hashTab, hashEntry] = (location.hash.slice(1) || 'about').split('/');
let tab = hashTab;
let learnQuery = '';
let learnCat = null;
let learnFeroxOnly = false;
let learnOpen = hashEntry || null;

await bootPage({ title: 'Docs' }, render);

const TABS = [
  ['about', 'How it works'],
  ['learn', 'Learn'],
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
  // Cross-links between tabs switch in place rather than reloading the page.
  pane.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    e.preventDefault();
    tab = go.dataset.go;
    history.replaceState(null, '', `#${tab}`);
    render(el);
  });
  (({ about, learn, research, privacy, terms })[tab] ?? about)(pane);
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
      ${p('The whole trainer — every exercise, the programming, nutrition, the charts — is free, with no account and no card. It runs in your browser, so it costs nothing to give away, and the code is public on GitHub for anyone to check.')}
      ${p('There is a paid tier, and it is worth being precise about what it is for. Pro covers the two things that cost real money per person: keeping your log synced across your devices, and reading a meal off a photograph. Nothing that works today will move behind it, there is no advertising, and your training log is never sold or shared — nobody but you has it.')}`)}

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

/* ------------------------------------------------------------------- learn */

/**
 * The knowledge base: a hundred questions people ask a gym, with the papers.
 *
 * Search is instant and client-side — the whole list is already in memory —
 * so there is no debounce and no loading state. Only the list re-renders on a
 * keystroke, so the search box keeps focus and its caret. A hundred cards is
 * well within what the browser does in a frame.
 *
 * Deep links: docs.html#learn/<id> opens that entry expanded and scrolls to
 * it, and opening an entry updates the hash so the link can be copied.
 */
function learn(pane) {
  const feroxCount = KNOWLEDGE.filter(k => k.ferox).length;
  pane.innerHTML = `
    ${h('Learn', `${KNOWLEDGE.length} things people ask a gym, answered with the research. ${feroxCount} of them are built into how FEROX plans your training.`)}

    <label class="search-wrap">
      ${icon('search')}
      <input id="kq" class="input search-input" type="search" autocomplete="off" spellcheck="false"
        placeholder="Search — abs, calorie deficit, progressive overload, how much protein…"
        aria-label="Search the knowledge base" value="${esc(learnQuery)}">
    </label>

    <div class="row wrap" style="gap:7px" id="kcats">
      <button class="chip${learnCat === null ? ' chip-ember' : ''}" data-cat="">All</button>
      ${CATEGORIES.map(c => `<button class="chip${learnCat === c.id ? ' chip-ember' : ''}" data-cat="${c.id}">${esc(c.label)}</button>`).join('')}
      <button class="chip${learnFeroxOnly ? ' chip-ember' : ''}" data-ferox="1" title="Only the ideas FEROX acts on">${icon('sparkle')} Used in FEROX</button>
    </div>

    <div id="klist" class="stack" style="gap:var(--sp-s)"></div>`;

  const q = pane.querySelector('#kq');
  q.addEventListener('input', () => { learnQuery = q.value; renderList(); });
  pane.querySelectorAll('#kcats [data-cat]').forEach(b => b.addEventListener('click', () => {
    learnCat = b.dataset.cat || null;
    learn(pane);
    pane.querySelector('#kq').focus();
  }));
  pane.querySelector('[data-ferox]').addEventListener('click', () => {
    learnFeroxOnly = !learnFeroxOnly;
    learn(pane);
  });

  renderList();
  if (learnOpen) pane.querySelector(`[data-k="${learnOpen}"]`)?.scrollIntoView({ block: 'start' });

  function renderList() {
    let hits = searchKnowledge(learnQuery, { cat: learnCat });
    if (learnFeroxOnly) hits = hits.filter(k => k.ferox);
    const list = pane.querySelector('#klist');
    if (!hits.length) {
      list.innerHTML = card(p(`Nothing matches “${esc(learnQuery)}”. Try a shorter word — “protein”, “sleep”, “squat” — or clear the filters.`));
      return;
    }
    const count = hits.length === KNOWLEDGE.length ? `All ${hits.length}` : `${hits.length} of ${KNOWLEDGE.length}`;
    list.innerHTML = `
      <p class="dim" style="font-size:var(--step--2)">${count}${learnQuery ? ', best match first' : ''}</p>
      ${hits.map(entry).join('')}`;
    list.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
      if (!d.open) return;
      learnOpen = d.dataset.k;
      history.replaceState(null, '', `#learn/${learnOpen}`);
    }));
  }

  function entry(k) {
    const badge = k.ferox
      ? `<span class="chip chip-ember" style="font-size:var(--step--2);padding:2px 8px">${icon('sparkle')} Used in FEROX</span>`
      : '';
    return `
      <details class="card card-pad-lg" data-k="${esc(k.id)}" ${k.id === learnOpen ? 'open' : ''}>
        <summary style="cursor:pointer;list-style:none">
          <div class="row-between" style="gap:12px;align-items:flex-start">
            <div class="stack" style="gap:5px;min-width:0">
              <div class="row wrap" style="gap:7px;align-items:center">
                <span class="eyebrow">${esc(categoryLabel(k.cat))}</span>${badge}
              </div>
              <h3 style="font-size:var(--step-1)">${esc(k.title)}</h3>
              <p class="muted" style="font-size:var(--step--1)">${esc(k.summary)}</p>
            </div>
            <span class="dim" style="flex:none;width:16px;margin-top:4px">${icon('chevron')}</span>
          </div>
        </summary>
        <div class="stack" style="gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
          ${p(esc(k.body))}
          ${k.ferox ? `<div class="onb-note" style="background:var(--surf-3)">${icon('sparkle')}<span><strong>In FEROX:</strong> ${esc(k.ferox)}</span></div>` : ''}
          <div class="stack" style="gap:6px">
            <p class="eyebrow">The evidence</p>
            ${k.evidence.map(e => `
              <div class="row-between wrap" style="gap:10px">
                <span class="dim" style="font-size:var(--step--2);flex:1;min-width:16ch">${esc(e.cite)}</span>
                <a class="btn btn-ghost btn-sm" href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">${icon('link')}<span>Read it</span></a>
              </div>`).join('')}
          </div>
        </div>
      </details>`;
  }
}

/* ---------------------------------------------------------------- research */

function research(pane) {
  pane.innerHTML = `
    ${h('The research', 'The ten findings that shaped FEROX most. Every claim here has a paper behind it.')}

    ${card(`${p('These are summaries, not the papers themselves. Each links to the source so you can read it and disagree. Where the evidence is genuinely uncertain, the summary says so — that is more useful than false confidence.')}
      ${p('Looking for something specific — abs, protein, how deep to squat? The <a href="#learn" data-go="learn">Learn tab</a> has a searchable hundred.')}`)}

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
      ${p('The source is public and MIT-licensed: fork it, change it, run your own. What you may not do is pass off a modified version as official FEROX, or use the name or mark to imply an endorsement that does not exist.')}`)}

    ${card(`${h3('You must be 13 or older')}
      ${p('FEROX has accounts, public profiles and private messaging, so there is an age limit: <strong>you must be at least 13 to claim a handle</strong>. Under 13, use it as a guest — every training feature works, nothing is published, and nobody can contact you.')}
      ${p('Thirteen is the minimum the law allows, not a line that is right everywhere. The UK sets the digital age of consent at 13, and so does US federal law, but several EU countries set it at 16 — Ireland, Germany and the Netherlands among them. If you live somewhere with a higher age and you are under it, you need a parent or guardian to agree before you create an account.')}
      ${p('If we learn an account belongs to somebody below the age that applies to them it is deleted along with its messages. If you are a parent or guardian and believe your child has created one, use the contact address below and it will be removed.')}`)}

    ${card(`${h3('How to behave towards other people')}
      ${p('Messages are private between two people who have both agreed to connect, and they are encrypted so nobody at FEROX can read them. That is not a licence. Do not use FEROX to harass, threaten, bully or abuse anybody; to send sexual content, especially to or about a minor; to spam, scam or advertise; to impersonate another person; or to share anything unlawful.')}
      ${p('<strong>You control who can reach you.</strong> Nobody can message you until you accept their request, and removing a friend ends the connection and the ability to message in both directions immediately. Blocking someone this way needs no permission and no explanation.')}
      ${p('Accounts used for any of the above may be removed without notice. Because messages are end-to-end encrypted, FEROX cannot read a conversation to adjudicate a dispute — which means the remedy available to you is to disconnect, and, where a crime may have been committed, to contact the police rather than us.')}`)}

    ${card(`${h3('What other people post')}
      ${p('Handles, display names, pictures and messages are created by the people using FEROX, not by FEROX. We do not pre-screen them and are not responsible for them. A handle or display name that impersonates somebody, or that is offensive, may be reclaimed or removed.')}`)}

    ${card(`${h3('If you pay for Pro')}
      ${p('Pro is optional and everything described in these guides works without it. When it launches: it is billed as a recurring subscription until cancelled, you can cancel at any time and keep access until the end of the period already paid for, and prices may change with notice before your next renewal. Statutory cancellation rights are unaffected. Losing Pro never deletes your training log or locks you out of the free app.')}`)}

    ${card(`${h3('Ending your account')}
      ${p('You can erase everything from your profile at any time: it clears your log, releases your handle for somebody else to use and removes your public profile. We may suspend or remove an account that breaks these terms, is used to abuse other people, or is being used to attack the service.')}`)}

    ${card(`${h3('Law, changes and complaints')}
      ${p('These terms are governed by the law of England and Wales, and the courts there have jurisdiction — this does not remove any protection you have under the mandatory consumer law of the country you live in.')}
      ${p('These terms may change. Material changes will be shown in the app before they take effect, and the date at the top of this page always says when it was last revised. Continuing to use FEROX after a change means accepting it.')}
      ${p('Questions, complaints, data requests and anything concerning a child\'s account: <strong>victor.deglon@gmail.com</strong>.')}`)}

    ${card(`${h3('A note on all of the above')}
      ${p('FEROX is made by one person, not a legal department. These terms are written to be clear and fair rather than to be exhaustive, and they are not a substitute for advice from a solicitor in your jurisdiction.')}`)}`;
}
