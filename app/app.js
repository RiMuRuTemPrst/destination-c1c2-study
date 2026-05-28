/* Destination C1&C2 — Study App */

const UNITS_META = [
  { id:1,  type:'Grammar',    title:'Present time' },
  { id:2,  type:'Vocabulary', title:'Thinking and learning' },
  { id:3,  type:'Grammar',    title:'Past time' },
  { id:4,  type:'Vocabulary', title:'Change and technology' },
  { id:5,  type:'Grammar',    title:'Future time' },
  { id:6,  type:'Vocabulary', title:'Time and work' },
  { id:7,  type:'Grammar',    title:'Passives and causatives' },
  { id:8,  type:'Vocabulary', title:'Movement and transport' },
  { id:9,  type:'Grammar',    title:'Modals and semi-modals' },
  { id:10, type:'Vocabulary', title:'Communication and the media' },
  { id:11, type:'Grammar',    title:'Conditionals' },
  { id:12, type:'Vocabulary', title:'Chance and nature' },
  { id:13, type:'Grammar',    title:'Unreal time' },
  { id:14, type:'Vocabulary', title:'Quantity and money' },
  { id:15, type:'Grammar',    title:'Adjectives and adverbs' },
  { id:16, type:'Vocabulary', title:'Materials and the built environment' },
  { id:17, type:'Grammar',    title:'Clauses' },
  { id:18, type:'Vocabulary', title:'Reactions and health' },
  { id:19, type:'Grammar',    title:'Complex sentences' },
  { id:20, type:'Vocabulary', title:'Power and social issues' },
  { id:21, type:'Grammar',    title:'Noun phrases' },
  { id:22, type:'Vocabulary', title:'Quality and the arts' },
  { id:23, type:'Grammar',    title:'Verbal complements' },
  { id:24, type:'Vocabulary', title:'Relationships and people' },
  { id:25, type:'Grammar',    title:'Reporting' },
  { id:26, type:'Vocabulary', title:'Preference and leisure activities' },
];

// ── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY        = 'dest_c1c2_progress';
const EX_STATE_PREFIX    = 'dest_c1c2_ex_';
const FLASH_STATE_PREFIX = 'dest_c1c2_flash_';
let progress = {};
let currentUnit = null;
let currentData = null;
let exState = {};   // { itemId: { answered, correct, userAnswer } }
let vocabWords = [];
let quizQueue = [];
let quizIdx = 0;
let quizScore = 0;
let flashQueue       = [];
let flashKnown       = new Set();
let flashSection     = 'all';
let _flashKeyHandler = null;

function loadProgress() {
  try { progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { progress = {}; }
}
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
function getUnitProgress(id) {
  return progress[id] || { theory_seen: false, ex_score: null, ex_correct: 0, ex_total: 0, vocab_seen: false };
}
function setUnitProgress(id, data) {
  progress[id] = { ...getUnitProgress(id), ...data };
  saveProgress();
  renderSidebar();
  updateOverallProgress();
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  renderSidebar();
  updateOverallProgress();
  setupTheme();

  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  document.getElementById('btn-reset').addEventListener('click', resetProgress);
  document.getElementById('btn-check-all').addEventListener('click', checkAll);
  document.getElementById('btn-retry').addEventListener('click', retryWrong);
  document.getElementById('btn-retry-all').addEventListener('click', retryAll);
  document.getElementById('btn-show-answers').addEventListener('click', showAllAnswers);
  document.getElementById('btn-clear-all').addEventListener('click', clearAllExercises);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.vocab-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchVocabMode(btn.dataset.mode));
  });

  // Check if running on file:// and warn
  if (location.protocol === 'file:') {
    document.getElementById('load-status').innerHTML =
      '⚠️ Running on <code>file://</code> — use <code>python3 launcher.py</code> to load unit content.';
  }
});

// ── Sidebar ────────────────────────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('unit-list');
  list.innerHTML = '';
  UNITS_META.forEach(u => {
    const p = getUnitProgress(u.id);
    const done = p.theory_seen && p.ex_score !== null;
    const cls = `unit-item ${u.type.toLowerCase()} ${done ? 'done' : ''} ${currentUnit === u.id ? 'active' : ''}`;
    const scoreTxt = p.ex_score !== null ? `${p.ex_score}% — ${p.ex_correct}/${p.ex_total} correct` : '';
    const fillPct = p.ex_total ? Math.round(p.ex_correct / p.ex_total * 100) : 0;

    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = `
      <div class="unit-item-icon">${done ? '✓' : u.id}</div>
      <div class="unit-item-info">
        <div class="unit-item-label">${u.type}</div>
        <div class="unit-item-title">${u.title}</div>
        ${scoreTxt ? `<div class="unit-item-score">${scoreTxt}</div>` : ''}
        <div class="unit-mini-bar"><div class="unit-mini-fill" style="width:${fillPct}%"></div></div>
      </div>`;
    el.addEventListener('click', () => openUnit(u.id));
    list.appendChild(el);
  });
}

function updateOverallProgress() {
  const done = UNITS_META.filter(u => {
    const p = getUnitProgress(u.id);
    return p.theory_seen && p.ex_score !== null;
  }).length;
  const pct = Math.round(done / UNITS_META.length * 100);
  document.getElementById('overall-fill').style.width = pct + '%';
  document.getElementById('overall-label').textContent = `${done} / ${UNITS_META.length} units`;
}

// ── Theme ──────────────────────────────────────────────────────────────────
function setupTheme() {
  const saved = localStorage.getItem('dest_theme') || 'dark';
  document.body.className = saved;
  document.getElementById('btn-theme').textContent = saved === 'dark' ? '☀' : '🌙';
}
function toggleTheme() {
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  document.body.className = next;
  localStorage.setItem('dest_theme', next);
  document.getElementById('btn-theme').textContent = next === 'dark' ? '☀' : '🌙';
}

function resetProgress() {
  if (!confirm('Reset ALL progress? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.keys(localStorage)
    .filter(k => k.startsWith(EX_STATE_PREFIX) || k.startsWith(FLASH_STATE_PREFIX))
    .forEach(k => localStorage.removeItem(k));
  loadProgress();
  renderSidebar();
  updateOverallProgress();
}

function saveExState(unitId) {
  localStorage.setItem(EX_STATE_PREFIX + unitId, JSON.stringify(exState));
}
function loadExState(unitId) {
  try { return JSON.parse(localStorage.getItem(EX_STATE_PREFIX + unitId) || '{}'); }
  catch { return {}; }
}
function saveFlashKnown(unitId) {
  localStorage.setItem(FLASH_STATE_PREFIX + unitId, JSON.stringify([...flashKnown]));
}
function loadFlashKnown(unitId) {
  try {
    const s = localStorage.getItem(FLASH_STATE_PREFIX + unitId);
    return s ? new Set(JSON.parse(s)) : new Set();
  } catch { return new Set(); }
}

// ── Load Unit ──────────────────────────────────────────────────────────────
async function openUnit(id) {
  currentUnit = id;
  renderSidebar();

  document.getElementById('welcome').classList.remove('active');
  document.getElementById('unit-screen').classList.add('active');

  const meta = UNITS_META.find(u => u.id === id);
  document.getElementById('unit-badge').textContent = meta.type;
  document.getElementById('unit-badge').className = `badge-${meta.type.toLowerCase()}`;
  document.getElementById('unit-title').textContent = `Unit ${id}: ${meta.title}`;

  // Show vocab tab only for vocabulary units
  const vocabTab = document.getElementById('tab-vocab-btn');
  vocabTab.style.display = meta.type === 'Vocabulary' ? '' : 'none';

  // Default tab
  switchTab(meta.type === 'Vocabulary' ? 'theory' : 'theory');

  document.getElementById('theory-content').innerHTML = '<div class="loading-msg">Loading unit content…</div>';
  document.getElementById('exercises-content').innerHTML = '';
  document.getElementById('vocab-content').innerHTML = '';

  currentData = null;
  exState = {};

  // 1. Try bundled data (works offline / file://)
  if (window.IELTS_DATA && window.IELTS_DATA[id]) {
    currentData = window.IELTS_DATA[id];
    renderTheory(currentData);
    renderExercises(currentData);
    exState = loadExState(id);
    restoreExStateUI();
    if (meta.type === 'Vocabulary') renderVocabBrowse(currentData);
    setUnitProgress(id, { theory_seen: true });
    updateScoreDisplay();
    return;
  }

  // 2. Try fetch (when served via HTTP)
  try {
    const res = await fetch(`../data/units/unit_${String(id).padStart(2, '0')}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentData = await res.json();
    renderTheory(currentData);
    renderExercises(currentData);
    exState = loadExState(id);
    restoreExStateUI();
    if (meta.type === 'Vocabulary') renderVocabBrowse(currentData);
    setUnitProgress(id, { theory_seen: true });
    updateScoreDisplay();
  } catch (e) {
    document.getElementById('theory-content').innerHTML = `
      <div class="error-msg">
        <strong>Unit ${id} chưa có nội dung.</strong><br>
        Chạy lệnh sau để generate:<br>
        <code>export GEMINI_API_KEY="your_key"</code><br>
        <code>python3 scripts/generate_content.py --unit ${id}</code><br>
        Sau đó rebuild bundle:<br>
        <code>python3 scripts/bundle.py</code>
      </div>`;
  }
}

function updateScoreDisplay() {
  const p = getUnitProgress(currentUnit);
  const el = document.getElementById('unit-score-display');
  el.textContent = p.ex_score !== null ? `Score: ${p.ex_score}% (${p.ex_correct}/${p.ex_total})` : '';
}

// ── Tabs ───────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}

// ── Theory Rendering ───────────────────────────────────────────────────────
function renderTheory(data) {
  const container = document.getElementById('theory-content');
  if (data.unit_type === 'Grammar' || (data.grammar_topics && data.grammar_topics.length)) {
    container.innerHTML = renderGrammarTheory(data);
  } else {
    container.innerHTML = renderVocabTheory(data);
  }
  // Collapsible sections
  container.querySelectorAll('.grammar-section-header').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
  });
}

function renderGrammarTheory(data) {
  const topics = data.grammar_topics || [];
  if (!topics.length) return '<div class="loading-msg">No theory content found.</div>';

  return topics.map((t, i) => `
    <div class="grammar-section">
      <div class="grammar-section-header">
        <h3>${esc(t.topic)}</h3>
        <span class="collapse-btn">▾</span>
      </div>
      <div class="grammar-section-body">
        <div class="lang-en">
          <div class="lang-label">🇬🇧 English</div>
          <div>${esc(t.explanation_en).replace(/\n/g, '<br>')}</div>
        </div>
        ${t.explanation_vi ? `
        <div class="lang-vi">
          <div class="lang-label">🇻🇳 Tiếng Việt</div>
          <div>${esc(t.explanation_vi).replace(/\n/g, '<br>')}</div>
        </div>` : ''}
        ${t.rules && t.rules.length ? `
        <ul class="rules-list">
          ${t.rules.map(r => `<li>${esc(r)}</li>`).join('')}
        </ul>` : ''}
        ${t.examples && t.examples.length ? `
        <div class="examples-block">
          <h4>Examples</h4>
          ${t.examples.map(e => `
            <div class="example-item">
              <div class="example-en">${esc(e.sentence)}</div>
              ${e.translation ? `<div class="example-vi">${esc(e.translation)}</div>` : ''}
            </div>`).join('')}
        </div>` : ''}
        ${t.watch_out && t.watch_out.length ? `
        <div class="watch-out">
          <div class="watch-out-title">⚠ Watch out!</div>
          <ul>${t.watch_out.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    </div>`).join('');
}

function renderVocabTheory(data) {
  const sections = data.vocabulary_sections || [];
  if (!sections.length) return '<div class="loading-msg">No vocabulary content found.</div>';
  return sections.map(s => `
    <div class="vocab-section-block">
      <div class="vocab-section-header">${esc(s.section_name)}</div>
      <table class="vocab-table">
        <thead><tr>
          <th>Word</th><th>Definition EN</th><th>Tiếng Việt</th><th>Example</th>
        </tr></thead>
        <tbody>
          ${(s.words || []).map(w => `
            <tr>
              <td><span class="vocab-word">${esc(w.word)}</span><span class="vocab-pos">${esc(w.pos||'')}</span></td>
              <td>${esc(w.definition_en||'')}</td>
              <td class="vocab-def-vi">${esc(w.definition_vi||'')}</td>
              <td class="vocab-example">${esc(w.example||'')}${w.example_vi ? `<div class="vocab-example-vi">${esc(w.example_vi)}</div>` : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

// ── Exercises Rendering ────────────────────────────────────────────────────
function renderExercises(data) {
  const container = document.getElementById('exercises-content');
  const exercises = data.exercises || [];
  if (!exercises.length) {
    container.innerHTML = '<div class="loading-msg">No exercises found in this unit.</div>';
    return;
  }
  container.innerHTML = exercises.map(ex => renderExerciseBlock(ex)).join('');
  updateExProgress();
}

function renderExerciseBlock(ex) {
  const items = (ex.items || []).map((item, idx) => renderExItem(ex.id, ex.type, item, idx)).join('');
  const typeLabel = ex.type ? ex.type.replace(/_/g, ' ') : '';
  const wordBankHTML = (ex.word_bank && ex.word_bank.length)
    ? `<div class="word-bank"><span class="word-bank-label">Word bank:</span>${ex.word_bank.map(w => `<span class="word-bank-item">${esc(w)}</span>`).join('')}</div>`
    : '';
  return `
    <div class="exercise-block" data-exid="${esc(ex.id)}">
      <div class="exercise-block-header">
        <div class="exercise-label">${esc(ex.label || ex.id)}</div>
        <div class="exercise-instruction">${esc(ex.instruction || '')}</div>
        <div class="exercise-header-right">
          <div class="exercise-type-badge">${esc(typeLabel)}</div>
          <button class="retry-block-btn" data-exid="${esc(ex.id)}">Retry ✗</button>
          <button class="check-block-btn" data-exid="${esc(ex.id)}">Check</button>
        </div>
      </div>
      ${wordBankHTML}
      <div class="exercise-items">${items}</div>
    </div>`;
}

function renderExItem(exId, type, item, idx) {
  const itemId = `${exId}_${idx}`;
  const num = item.number || (idx + 1);

  if (type === 'multiple_choice') {
    const opts = (item.options || []).map((opt, oi) => `
      <div class="mc-option" data-itemid="${itemId}" data-opt="${esc(opt)}">${esc(opt)}</div>`).join('');
    return `
      <div class="ex-item" data-itemid="${itemId}">
        <div class="ex-item-row">
          <span class="ex-num">${num}</span>
          <span class="ex-sentence">${esc(item.sentence || '')}</span>
        </div>
        <div class="mc-options">${opts}</div>
        <div class="ex-feedback" id="fb_${itemId}"></div>
      </div>`;
  }

  // fill_blank, error_correction, transformation, word_form — all use text input
  const sentence = renderSentenceWithInput(item.sentence || '', itemId);
  return `
    <div class="ex-item" data-itemid="${itemId}">
      <div class="ex-item-row">
        <span class="ex-num">${num}</span>
        <span class="ex-sentence">${sentence}</span>
      </div>
      <div class="ex-feedback" id="fb_${itemId}"></div>
    </div>`;
}

function renderSentenceWithInput(sentence, itemId) {
  if (sentence.includes('___')) {
    return sentence.replace(/_{2,}/g,
      `<input class="blank-input" data-itemid="${itemId}" placeholder="…" autocomplete="off" spellcheck="false">`);
  }
  return `${esc(sentence)} <input class="blank-input" data-itemid="${itemId}" placeholder="…" autocomplete="off" spellcheck="false">`;
}

function checkExerciseBlock(exId) {
  if (!currentData) return;
  const ex = (currentData.exercises || []).find(e => e.id === exId);
  if (!ex) return;
  (ex.items || []).forEach((item, idx) => {
    const itemId = `${exId}_${idx}`;
    if (!exState[itemId]?.answered) checkItemAnswer(ex.id, ex.type, item, idx);
  });
  updateExProgress();
}

function findExerciseItem(itemId) {
  if (!currentData) return null;
  for (const ex of currentData.exercises || []) {
    for (let idx = 0; idx < (ex.items || []).length; idx++) {
      if (`${ex.id}_${idx}` === itemId) return { ex, item: ex.items[idx], idx };
    }
  }
  return null;
}

// ── Exercise Grading ───────────────────────────────────────────────────────
const CONTRACTIONS = {
  "don't": "do not", "doesn't": "does not", "didn't": "did not",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "won't": "will not", "wouldn't": "would not", "can't": "cannot", "couldn't": "could not",
  "shouldn't": "should not", "mustn't": "must not", "needn't": "need not",
  "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
  "you're": "you are", "you've": "you have", "you'll": "you will", "you'd": "you would",
  "he's": "he is", "he'd": "he would", "he'll": "he will",
  "she's": "she is", "she'd": "she would", "she'll": "she will",
  "it's": "it is", "it'll": "it will",
  "we're": "we are", "we've": "we have", "we'll": "we will", "we'd": "we would",
  "they're": "they are", "they've": "they have", "they'll": "they will", "they'd": "they would",
  "that's": "that is", "that'll": "that will", "there's": "there is",
  "who's": "who is", "who've": "who have", "who'll": "who will",
  "what's": "what is", "where's": "where is", "when's": "when is",
};

function splitAnswer(answer) {
  if (answer.includes(' / ')) return answer.split(' / ');
  if (answer.includes(' ... ')) return answer.split(' ... ');
  return [answer];
}

function expandContractions(s) {
  return s.replace(/[\w'']+/g, w => CONTRACTIONS[w.toLowerCase()] || w);
}

function normalizeAnswer(s) {
  s = (s || '').toLowerCase().trim().replace(/['']/g, "'");
  s = expandContractions(s);
  // also try reverse: expand contractions in expanded form back (handles both directions)
  return s.replace(/\s+/g, ' ');
}

function answersMatch(userRaw, correctRaw) {
  const user    = normalizeAnswer(userRaw);
  const correct = normalizeAnswer(correctRaw);
  if (user === correct) return true;
  // Also accept if one is contraction of the other (e.g. "I've" vs "I have")
  const userExp    = expandContractions(user);
  const correctExp = expandContractions(correct);
  return userExp === correctExp;
}

function checkItemAnswer(exId, type, item, idx) {
  const itemId = `${exId}_${idx}`;
  const correct = normalizeAnswer(item.answer);

  let userAnswer = '';
  let isCorrect = false;

  if (type === 'multiple_choice') {
    const selected = document.querySelector(`.mc-option[data-itemid="${itemId}"].selected`);
    userAnswer = selected ? normalizeAnswer(selected.dataset.opt) : '';
    isCorrect = answersMatch(userAnswer, correct);
    // Style options
    document.querySelectorAll(`.mc-option[data-itemid="${itemId}"]`).forEach(el => {
      el.classList.remove('correct', 'wrong', 'reveal-correct');
      if (normalizeAnswer(el.dataset.opt) === correct) el.classList.add('correct');
      else if (el.classList.contains('selected')) el.classList.add('wrong');
    });
  } else {
    const inputs = [...document.querySelectorAll(`input.blank-input[data-itemid="${itemId}"]`)];
    const answerParts = splitAnswer(correct);
    if (inputs.length > 1 && answerParts.length > 1) {
      const blankResults = inputs.map((inp, i) =>
        answersMatch(normalizeAnswer(inp.value), answerParts[i] || ''));
      isCorrect = blankResults.every(Boolean);
      userAnswer = inputs.map(i => normalizeAnswer(i.value)).join(' / ');
      inputs.forEach((inp, i) => {
        inp.classList.remove('correct', 'wrong');
        inp.classList.add(blankResults[i] ? 'correct' : 'wrong');
        inp.disabled = true;
      });
    } else {
      userAnswer = inputs[0] ? normalizeAnswer(inputs[0].value) : '';
      isCorrect = answersMatch(userAnswer, correct);
      inputs.forEach(inp => {
        inp.classList.remove('correct', 'wrong');
        inp.classList.add(isCorrect ? 'correct' : 'wrong');
        inp.disabled = true;
      });
    }
  }

  // Feedback
  const fb = document.getElementById(`fb_${itemId}`);
  if (fb) {
    fb.className = `ex-feedback show ${isCorrect ? 'correct-fb' : 'wrong-fb'}`;
    const resetBtn = `<button class="reset-item-btn" data-itemid="${itemId}" title="Làm lại">↺</button>`;
    fb.innerHTML = isCorrect
      ? `✓ Correct ${resetBtn}`
      : `✗ <span class="correct-answer">Answer: ${esc(item.answer)}</span>${item.explanation ? `<div class="explanation">${esc(item.explanation)}</div>` : ''} ${resetBtn}`;
  }

  exState[itemId] = { answered: true, correct: isCorrect, userAnswer };
  saveExState(currentUnit);
  return isCorrect;
}

function checkAll() {
  if (!currentData) return;
  let correct = 0, total = 0;
  (currentData.exercises || []).forEach(ex => {
    (ex.items || []).forEach((item, idx) => {
      const itemId = `${ex.id}_${idx}`;
      if (!exState[itemId]?.answered) {
        const ok = checkItemAnswer(ex.id, ex.type, item, idx);
        if (ok) correct++;
        total++;
      } else {
        if (exState[itemId].correct) correct++;
        total++;
      }
    });
  });

  // MC click handlers — make sure they work
  setupMCHandlers();

  const score = total ? Math.round(correct / total * 100) : 0;
  setUnitProgress(currentUnit, { ex_score: score, ex_correct: correct, ex_total: total });
  updateScoreDisplay();
  showResult(score, correct, total);
  updateExProgress();
}

function retryWrongBlock(exId) {
  if (!currentData) return;
  const ex = (currentData.exercises || []).find(e => e.id === exId);
  if (!ex) return;
  (ex.items || []).forEach((item, idx) => {
    const itemId = `${exId}_${idx}`;
    if (exState[itemId]?.answered && !exState[itemId].correct) resetItem(ex.type, itemId);
  });
  saveExState(currentUnit);
  updateExProgress();
}

function retryWrong() {
  if (!currentData) return;
  (currentData.exercises || []).forEach(ex => {
    (ex.items || []).forEach((item, idx) => {
      const itemId = `${ex.id}_${idx}`;
      if (exState[itemId]?.answered && !exState[itemId].correct) resetItem(ex.type, itemId);
    });
  });
  saveExState(currentUnit);
  document.getElementById('exercises-result').classList.add('hidden');
  updateExProgress();
}

function retryAll() {
  if (!currentData) return;
  exState = {};
  saveExState(currentUnit);
  renderExercises(currentData);
  document.getElementById('exercises-result').classList.add('hidden');
  setupMCHandlers();
}

function clearAllExercises() {
  if (!currentData) return;
  exState = {};
  saveExState(currentUnit);
  setUnitProgress(currentUnit, { ex_score: null, ex_correct: 0, ex_total: 0 });
  // Clear all inputs directly
  document.querySelectorAll('#exercises-content .blank-input').forEach(inp => {
    inp.value = ''; inp.classList.remove('correct', 'wrong'); inp.disabled = false;
  });
  // Clear all MC options
  document.querySelectorAll('#exercises-content .mc-option').forEach(el => {
    el.classList.remove('selected', 'correct', 'wrong', 'reveal-correct');
  });
  // Clear all feedback + reset buttons
  document.querySelectorAll('#exercises-content .ex-feedback').forEach(fb => {
    fb.className = 'ex-feedback'; fb.innerHTML = '';
  });
  document.getElementById('exercises-result').classList.add('hidden');
  updateExProgress();
  updateScoreDisplay();
}

function showAllAnswers() {
  if (!currentData) return;
  (currentData.exercises || []).forEach(ex => {
    (ex.items || []).forEach((item, idx) => {
      const itemId = `${ex.id}_${idx}`;
      if (ex.type === 'multiple_choice') {
        document.querySelectorAll(`.mc-option[data-itemid="${itemId}"]`).forEach(el => {
          el.classList.remove('correct', 'wrong');
          if (normalizeAnswer(el.dataset.opt) === normalizeAnswer(item.answer))
            el.classList.add('reveal-correct');
        });
      } else {
        const inputs = [...document.querySelectorAll(`input.blank-input[data-itemid="${itemId}"]`)];
        if (inputs.length && !inputs[0].disabled) {
          const parts = splitAnswer(item.answer);
          inputs.forEach((inp, i) => { inp.value = parts[i] ?? item.answer; inp.classList.add('correct'); });
        }
      }
      const fb = document.getElementById(`fb_${itemId}`);
      if (fb && !exState[itemId]?.answered) {
        fb.className = 'ex-feedback show correct-fb';
        fb.innerHTML = `Answer: <span class="correct-answer">${esc(item.answer)}</span>${item.explanation ? `<div class="explanation">${esc(item.explanation)}</div>` : ''}`;
      }
    });
  });
}

function resetItem(type, itemId) {
  delete exState[itemId];
  if (type === 'multiple_choice') {
    document.querySelectorAll(`.mc-option[data-itemid="${itemId}"]`).forEach(el => {
      el.classList.remove('selected', 'correct', 'wrong', 'reveal-correct');
    });
  } else {
    document.querySelectorAll(`input.blank-input[data-itemid="${itemId}"]`).forEach(inp => {
      inp.value = ''; inp.classList.remove('correct', 'wrong'); inp.disabled = false;
    });
  }
  const fb = document.getElementById(`fb_${itemId}`);
  if (fb) { fb.className = 'ex-feedback'; fb.innerHTML = ''; }
}

function showResult(score, correct, total) {
  const res = document.getElementById('exercises-result');
  res.classList.remove('hidden');
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)';
  document.getElementById('result-score').innerHTML = `<span style="color:${color}">${score}%</span>`;
  document.getElementById('result-breakdown').textContent = `${correct} correct out of ${total} items`;
}

function updateExProgress() {
  if (!currentData) return;
  let answered = 0, correct = 0, total = 0;
  (currentData.exercises || []).forEach(ex => {
    (ex.items || []).forEach((_, idx) => {
      total++;
      const s = exState[`${ex.id}_${idx}`];
      if (s?.answered) { answered++; if (s.correct) correct++; }
    });
  });
  document.getElementById('ex-progress-label').textContent =
    total ? `${answered}/${total} answered — ${correct} correct` : '';
}

function restoreExStateUI() {
  if (!currentData) return;
  (currentData.exercises || []).forEach(ex => {
    (ex.items || []).forEach((item, idx) => {
      const itemId = `${ex.id}_${idx}`;
      const saved = exState[itemId];
      if (!saved?.answered) return;

      const correct = normalizeAnswer(item.answer);
      if (ex.type === 'multiple_choice') {
        document.querySelectorAll(`.mc-option[data-itemid="${itemId}"]`).forEach(el => {
          el.classList.remove('selected', 'correct', 'wrong', 'reveal-correct');
          const optNorm = normalizeAnswer(el.dataset.opt);
          if (optNorm === correct) el.classList.add('correct');
          else if (normalizeAnswer(saved.userAnswer) === optNorm) el.classList.add('wrong');
        });
      } else {
        const inputs = [...document.querySelectorAll(`input.blank-input[data-itemid="${itemId}"]`)];
        const parts = saved.userAnswer.split(' / ');
        inputs.forEach((inp, i) => {
          inp.value = parts[i] ?? saved.userAnswer;
          inp.classList.add(saved.correct ? 'correct' : 'wrong');
          inp.disabled = true;
        });
      }
      const fb = document.getElementById(`fb_${itemId}`);
      if (fb) {
        fb.className = `ex-feedback show ${saved.correct ? 'correct-fb' : 'wrong-fb'}`;
        const resetBtn = `<button class="reset-item-btn" data-itemid="${itemId}" title="Làm lại">↺</button>`;
        fb.innerHTML = saved.correct
          ? `✓ Correct ${resetBtn}`
          : `✗ <span class="correct-answer">Answer: ${esc(item.answer)}</span>${item.explanation ? `<div class="explanation">${esc(item.explanation)}</div>` : ''} ${resetBtn}`;
      }
    });
  });
  updateExProgress();
}

function setupMCHandlers() {
  document.querySelectorAll('.mc-option').forEach(el => {
    el.addEventListener('click', function() {
      if (this.classList.contains('correct') || this.classList.contains('wrong')) return;
      const itemId = this.dataset.itemid;
      document.querySelectorAll(`.mc-option[data-itemid="${itemId}"]`).forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}

// Per-item check handlers (delegated)
document.addEventListener('click', e => {
  // MC option: select then immediately check
  if (e.target.classList.contains('mc-option')) {
    const el = e.target;
    if (el.classList.contains('correct') || el.classList.contains('wrong')) return;
    const itemId = el.dataset.itemid;
    document.querySelectorAll(`.mc-option[data-itemid="${itemId}"]`).forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    const found = findExerciseItem(itemId);
    if (found) { checkItemAnswer(found.ex.id, found.ex.type, found.item, found.idx); updateExProgress(); }
  }
  // Check button on exercise block header
  if (e.target.classList.contains('check-block-btn')) {
    checkExerciseBlock(e.target.dataset.exid);
  }
  // Retry wrong on exercise block
  if (e.target.classList.contains('retry-block-btn')) {
    retryWrongBlock(e.target.dataset.exid);
  }
  // ↺ reset single item
  if (e.target.classList.contains('reset-item-btn')) {
    const itemId = e.target.dataset.itemid;
    const found = findExerciseItem(itemId);
    if (found) { resetItem(found.ex.type, itemId); saveExState(currentUnit); updateExProgress(); }
  }
});

// Enter key: check the whole exercise block
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('blank-input')) {
    const itemId = e.target.dataset.itemid;
    const found = findExerciseItem(itemId);
    if (found) checkExerciseBlock(found.ex.id);
  }
});

// ── Vocabulary ─────────────────────────────────────────────────────────────
function getAllVocabWords(data) {
  const words = [];
  (data.vocabulary_sections || []).forEach(s => {
    (s.words || []).forEach(w => words.push({ ...w, section: s.section_name }));
  });
  return words;
}

function renderVocabBrowse(data) {
  const container = document.getElementById('vocab-content');
  container.innerHTML = renderVocabTheory(data);
}

function switchVocabMode(mode) {
  document.querySelectorAll('.vocab-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  if (!currentData) return;
  vocabWords = getAllVocabWords(currentData);

  if (mode !== 'flashcard') _removeFlashKeys();

  const container = document.getElementById('vocab-content');
  if (mode === 'browse') {
    renderVocabBrowse(currentData);
  } else if (mode === 'flashcard') {
    flashKnown   = loadFlashKnown(currentUnit);
    flashSection = 'all';
    initFlashSession('all');
    renderFlashcard(container);
  } else if (mode === 'quiz') {
    startVocabQuiz(container);
  }
}

// ── Flashcard (enhanced) ──────────────────────────────────────────────────
function _removeFlashKeys() {
  if (_flashKeyHandler) {
    document.removeEventListener('keydown', _flashKeyHandler);
    _flashKeyHandler = null;
  }
}

function initFlashSession(section) {
  flashSection = section;
  const pool = vocabWords
    .map((_, i) => i)
    .filter(i => section === 'all' || vocabWords[i].section === section);
  // shuffle
  flashQueue = pool.sort(() => Math.random() - 0.5);
}

function renderFlashcard(container) {
  _removeFlashKeys();
  if (!vocabWords.length) { container.innerHTML = '<div class="loading-msg">No vocabulary data.</div>'; return; }

  const sections = [...new Set(vocabWords.map(w => w.section))];
  const sectionTotal = flashSection === 'all'
    ? vocabWords.length
    : vocabWords.filter(w => w.section === flashSection).length;
  const knownCount = flashKnown.size;

  const tabsHTML = `
    <div class="fc-section-tabs">
      <button class="fc-section-tab ${flashSection === 'all' ? 'active' : ''}" data-section="all">
        All (${vocabWords.length})
      </button>
      ${sections.map(s => {
        const cnt  = vocabWords.filter(w => w.section === s).length;
        const lbl  = s.replace(/^Topic vocabulary:\s*/i, '').replace('Phrases, patterns and collocations', 'Phrases & Collocations');
        return `<button class="fc-section-tab ${flashSection === s ? 'active' : ''}" data-section="${esc(s)}">${esc(lbl)} (${cnt})</button>`;
      }).join('')}
    </div>`;

  if (!flashQueue.length) {
    container.innerHTML = `
      ${tabsHTML}
      <div class="fc-done">
        <div class="fc-done-icon">🎉</div>
        <div class="fc-done-text">Xong ${sectionTotal} từ!</div>
        <div class="fc-done-sub">${knownCount} đã nhớ · 0 còn lại</div>
        <button class="btn-primary" id="fc-restart">Học lại</button>
      </div>`;
    _setupFlashTabs(container);
    document.getElementById('fc-restart')?.addEventListener('click', () => {
      flashKnown = new Set();
      saveFlashKnown(currentUnit);
      initFlashSession(flashSection);
      renderFlashcard(container);
    });
    setUnitProgress(currentUnit, { vocab_seen: true });
    return;
  }

  const idx = flashQueue[0];
  const w   = vocabWords[idx];

  const extraBack = [];
  if (w.synonyms && w.synonyms.length)
    extraBack.push(`<div class="fc-synonyms">≈ ${w.synonyms.slice(0, 4).map(esc).join(', ')}</div>`);
  if (w.collocations && w.collocations.length)
    extraBack.push(`<div class="fc-collocations">${w.collocations.slice(0, 3).map(esc).join(' · ')}</div>`);

  container.innerHTML = `
    ${tabsHTML}
    <div class="fc-progress-row">
      <span class="fc-known-count">✓ ${knownCount} đã nhớ</span>
      <span class="fc-remaining-count">${flashQueue.length} còn lại</span>
    </div>
    <div class="flashcard" id="fc-card">
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="flashcard-section-tag">${esc(w.section || '')}</div>
          <div class="flashcard-word">${esc(w.word)}</div>
          <div class="flashcard-pos">${esc(w.pos || '')}</div>
          <div class="flashcard-hint">Space / click để lật</div>
        </div>
        <div class="flashcard-back">
          <div class="flashcard-def-en">${esc(w.definition_en || '')}</div>
          <div class="flashcard-def-vi">${esc(w.definition_vi || '')}</div>
          ${w.example ? `<div class="flashcard-example-fc">${esc(w.example)}${w.example_vi ? `<div class="flashcard-example-vi">${esc(w.example_vi)}</div>` : ''}</div>` : ''}
          ${extraBack.join('')}
        </div>
      </div>
    </div>
    <div class="fc-actions">
      <button class="fc-dontknow-btn" id="fc-dontknow">✗ Chưa nhớ</button>
      <button class="fc-flip-btn"     id="fc-flip">Lật thẻ</button>
      <button class="fc-know-btn"     id="fc-know">✓ Đã nhớ</button>
    </div>
    <div class="fc-keyboard-hint">Space: lật · ←: chưa nhớ · →: đã nhớ</div>`;

  _setupFlashTabs(container);

  document.getElementById('fc-card')?.addEventListener('click', () =>
    document.getElementById('fc-card').classList.toggle('flipped'));
  document.getElementById('fc-flip')?.addEventListener('click', () =>
    document.getElementById('fc-card').classList.toggle('flipped'));
  document.getElementById('fc-know')?.addEventListener('click', () => {
    flashKnown.add(flashQueue.shift());
    saveFlashKnown(currentUnit);
    renderFlashcard(container);
  });
  document.getElementById('fc-dontknow')?.addEventListener('click', () => {
    flashQueue.push(flashQueue.shift());
    renderFlashcard(container);
  });

  _flashKeyHandler = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      document.getElementById('fc-card')?.classList.toggle('flipped');
    } else if (e.code === 'ArrowRight' || e.key === 'k') {
      flashKnown.add(flashQueue.shift());
      saveFlashKnown(currentUnit);
      renderFlashcard(container);
    } else if (e.code === 'ArrowLeft' || e.key === 'j') {
      flashQueue.push(flashQueue.shift());
      renderFlashcard(container);
    }
  };
  document.addEventListener('keydown', _flashKeyHandler);
}

function _setupFlashTabs(container) {
  container.querySelectorAll('.fc-section-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      // flashKnown carries over (same vocabWords indices across sections)
      initFlashSession(btn.dataset.section);
      renderFlashcard(container);
    });
  });
}

// Vocab Quiz
function startVocabQuiz(container) {
  if (vocabWords.length < 4) { container.innerHTML = '<div class="loading-msg">Need at least 4 words for quiz.</div>'; return; }
  quizQueue = [...vocabWords].sort(() => Math.random() - 0.5);
  quizIdx = 0;
  quizScore = 0;
  renderQuizQuestion(container);
}

function renderQuizQuestion(container) {
  if (quizIdx >= quizQueue.length) {
    const pct = Math.round(quizScore / quizQueue.length * 100);
    container.innerHTML = `
      <div id="vocab-quiz-area">
        <div class="quiz-score-bar">Quiz complete!</div>
        <div class="quiz-question" style="text-align:center">
          <div class="quiz-q-word" style="font-size:40px">${pct}%</div>
          <div class="quiz-q-hint">${quizScore}/${quizQueue.length} correct</div>
          <button class="btn-primary" onclick="startVocabQuiz(document.getElementById('vocab-content'))">Retry</button>
        </div>
      </div>`;
    setUnitProgress(currentUnit, { vocab_seen: true });
    return;
  }

  const word = quizQueue[quizIdx];
  const distractors = vocabWords.filter(w => w.word !== word.word)
    .sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...distractors, word].sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div id="vocab-quiz-area">
      <div class="quiz-score-bar">${quizIdx + 1}/${quizQueue.length} — Score: ${quizScore}</div>
      <div class="quiz-question">
        <div class="quiz-q-word">${esc(word.word)}</div>
        <div class="quiz-q-hint">${esc(word.pos || '')} — ${esc(word.section || '')}</div>
        <div class="quiz-options">
          ${options.map(opt => `
            <div class="quiz-opt" data-correct="${opt.word === word.word}">${esc(opt.definition_en || opt.definition_vi || opt.word)}</div>
          `).join('')}
        </div>
        <button id="btn-next-quiz">Next →</button>
      </div>
    </div>`;

  document.querySelectorAll('.quiz-opt').forEach(el => {
    el.addEventListener('click', function() {
      document.querySelectorAll('.quiz-opt').forEach(o => o.setAttribute('disabled', true));
      const correct = this.dataset.correct === 'true';
      this.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        document.querySelectorAll('.quiz-opt').forEach(o => {
          if (o.dataset.correct === 'true') o.classList.add('correct');
        });
      } else {
        quizScore++;
      }
      document.getElementById('btn-next-quiz').style.display = 'inline-block';
    });
  });

  document.getElementById('btn-next-quiz')?.addEventListener('click', () => {
    quizIdx++;
    renderQuizQuestion(container);
  });
}

// ── Utils ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
