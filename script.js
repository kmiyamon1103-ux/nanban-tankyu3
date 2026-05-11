/* =========================================================
   資料を探究！〜南蛮貿易図屏風のひみつを見つけよう〜
   script.js

   【編集ポイント】
   - パスワードの変更             → PASSWORD
   - 資料の画像差し替え           → RESOURCES の image
   - クリックポイントの追加・調整 → CLICK_POINTS の x, y, name, desc
   - AIへの相談リンクの変更       → AI_LINK
   - AIテンプレ文のカスタマイズ   → buildTemplate()

   座標 x, y はパーセント（0〜100）。
   画像の左上が (0, 0)、右下が (100, 100)。
   ========================================================= */

/* ---------------- 1. 設定（編集可） ---------------- */

// 教材を閲覧するためのパスワード（変更したい場合はここを書き換え）
const PASSWORD = '6666';

// AIへの相談リンク（後から変更可）
// 例: 'https://chat.openai.com/' / 'https://gemini.google.com/' / 'https://claude.ai/'
const AI_LINK = 'https://chat.openai.com/';

// 資料の情報。image はローカル画像パス（後から差し替えOK）
const RESOURCES = [
  {
    id: 1,
    label: '資料1',
    image: './images/sample1.png',
    caption: '南蛮貿易図屏風（資料1）',
  },
  {
    id: 2,
    label: '資料2',
    image: './images/sample2.png',
    caption: '南蛮貿易図屏風（資料2）',
  },
];

// クリックポイント（資料ごとに配列で管理）
// x, y は画像内のパーセント位置（0〜100）
// id は内部識別用、name は画面に表示される名前
const CLICK_POINTS = {
  // ========== 資料1 ==========
  1: [
    { id: 'ship',      name: '船',           x: 82, y: 28,
      desc: '遠くから来た大きな船は、多くの人や商品を運んでいました。' },
    { id: 'elephant',  name: '動物（ゾウ）',  x: 9,  y: 75,
      desc: '日本では珍しいゾウが描かれています。遠い国からやって来た動物です。' },
    { id: 'carried',   name: '運ばれている人', x: 19, y: 65,
      desc: 'お神輿のような乗り物に乗って運ばれている人物がいます。特別な立場の人かもしれません。' },
    { id: 'foreigner', name: '外国人',        x: 55, y: 55,
      desc: '中央付近にいる外国人は、日本に新しい文化や商品をもたらしました。' },
    { id: 'blackrobe', name: '黒い服の人',    x: 30, y: 46,
      desc: '黒い服を着た人々は、外国との交流に関わっていました。' },
    { id: 'building',  name: '建物',          x: 21, y: 7,
      desc: '丸い屋根の建物が描かれています。日本には珍しい形をしています。' },
    { id: 'port',      name: '海・港',        x: 65, y: 55,
      desc: '港には多くの人や船が集まり、交流の場となっていました。' },
  ],
  // ========== 資料2 ==========
  2: [
    { id: 'ship',      name: '船',                    x: 12, y: 50,
      desc: '遠くから来た大きな船は、多くの人や商品を運んでいました。' },
    { id: 'animal',    name: '動物',                  x: 14, y: 80,
      desc: '日本では珍しい動物も描かれています。' },
    { id: 'redrobe',   name: '中心人物（赤い服の人）', x: 50, y: 62,
      desc: 'この人物は、周りより目立つように描かれています。' },
    { id: 'foreigner', name: '外国人',                x: 44, y: 72,
      desc: '外国から来た人々は、日本に新しい文化や商品をもたらしました。' },
    { id: 'blackrobe', name: '黒い服の人',            x: 75, y: 65,
      desc: '黒い服を着た人々は、外国との交流に関わっていました。' },
    { id: 'merchant',  name: '商人っぽい人',          x: 88, y: 58,
      desc: '貿易によって利益を得ようとする人々もいました。' },
    { id: 'port',      name: '海・港',                x: 25, y: 55,
      desc: '港には多くの人や船が集まり、交流の場となっていました。' },
    { id: 'tiger',     name: '動物（トラ）',          x: 33, y: 78,
      desc: '日本にはいないトラのような珍しい動物も連れてこられていました。' },
  ],
};

// 画面遷移の順番（progress表示・「前に戻る」の制御に使う）
// 認証画面は含めない（進行状況の対象外）
const SCREEN_ORDER = [
  'screen-title',
  'screen-select',
  'screen-explore-1',
  'screen-memo-pre-1',
  'screen-template-1',
  'screen-memo-post-1',
  'screen-explore-2',
  'screen-memo-pre-2',
  'screen-template-2',
  'screen-memo-post-2',
  'screen-summary',
  'screen-relation',
  'screen-final',
  'screen-result',
];

const STORAGE_KEY = 'nanban-tankyu-state-v1';
// 認証状態（sessionStorage: ブラウザのタブを閉じるまで有効）
const AUTH_KEY = 'nanban-tankyu-auth-v1';

/* ---------------- 2. 状態管理 ---------------- */

// 入力内容を保持する1つの大きなオブジェクト
// localStorage に保存することでページ遷移しても消えない
const defaultState = () => ({
  selectedResource: null, // 1 or 2
  exp1: {
    pointId: null, pointName: '',
    firstNotice: '', whereLooked: '',
    afterAI: '', changedMind: '',
  },
  exp2: {
    pointId: null, pointName: '',
    firstNotice: '', whereLooked: '',
    afterAI: '', changedMind: '',
  },
  relation: '',
  finalSummary: '',
  currentScreen: 'screen-title',
  history: [], // 戻るボタン用
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    console.warn('状態の復元に失敗。初期化します。', e);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('保存に失敗', e);
  }
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
}

/* ---------------- 認証 ---------------- */

function isAuthenticated() {
  try { return sessionStorage.getItem(AUTH_KEY) === '1'; }
  catch (e) { return false; }
}
function setAuthenticated() {
  try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (e) {}
}

function initAuth() {
  const form = document.getElementById('auth-form');
  const input = document.getElementById('auth-input');
  const errorEl = document.getElementById('auth-error');
  if (!form || !input || !errorEl) return;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const value = (input.value || '').trim();

    if (value === PASSWORD) {
      setAuthenticated();
      errorEl.textContent = '';
      input.value = '';
      // タイトル画面へ（または中断していた画面へ）
      const restoreTarget =
        state.currentScreen && state.currentScreen !== 'screen-auth'
          ? state.currentScreen
          : 'screen-title';
      state.history = [];
      showScreen(restoreTarget, { pushHistory: false });
    } else {
      errorEl.textContent = 'パスワードが違います';
      input.classList.remove('shake');
      // 強制的にリフロー→アニメ再生
      void input.offsetWidth;
      input.classList.add('shake');
      input.focus();
      input.select();
    }
  });

  // エラー表示は入力し直したら消す
  input.addEventListener('input', () => {
    if (errorEl.textContent) errorEl.textContent = '';
  });
}

/* ---------------- 3. 画面切り替え ---------------- */

function showScreen(id, opts = {}) {
  const { pushHistory = true } = opts;

  // 履歴に積む
  if (pushHistory && state.currentScreen && state.currentScreen !== id) {
    state.history.push(state.currentScreen);
  }

  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });

  state.currentScreen = id;
  saveState();

  // ヘッダー表示制御（認証画面とタイトル画面では非表示）
  const header = document.getElementById('app-header');
  if (id === 'screen-title' || id === 'screen-auth') header.classList.add('hidden');
  else header.classList.remove('hidden');

  // 進行状況とサブタイトルの更新
  updateProgress(id);
  updateHeaderSubtitle(id);

  // 画面ごとの追加処理
  onEnterScreen(id);

  // スクロールを上に
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ヘッダー左の「○つ目の探究」サブタイトルを画面に応じて切り替え
function updateHeaderSubtitle(id) {
  const sub = document.getElementById('header-subtitle');
  if (!sub) return;
  // 1つ目の探究フェーズ（資料を観察→AI前メモ→AIテンプレ→AI後メモ）
  const phase1 = ['screen-explore-1', 'screen-memo-pre-1', 'screen-template-1', 'screen-memo-post-1'];
  // 2つ目の探究フェーズ
  const phase2 = ['screen-explore-2', 'screen-memo-pre-2', 'screen-template-2', 'screen-memo-post-2'];

  if (phase1.includes(id))       sub.textContent = '1つ目の探究';
  else if (phase2.includes(id))  sub.textContent = '2つ目の探究';
  else if (id === 'screen-summary')   sub.textContent = '2つの探究をふり返る';
  else if (id === 'screen-relation')  sub.textContent = '関連性を考える';
  else if (id === 'screen-final')     sub.textContent = '最終まとめ';
  else if (id === 'screen-result')    sub.textContent = '探究結果';
  else                                sub.textContent = '';
}

function goBack() {
  const prev = state.history.pop();
  if (prev) {
    showScreen(prev, { pushHistory: false });
  } else {
    showScreen('screen-title', { pushHistory: false });
  }
}

function updateProgress(id) {
  const idx = SCREEN_ORDER.indexOf(id);
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  if (!fill || !text) return;
  if (idx < 0) {
    // SCREEN_ORDER外（screen-auth等）は進行バーを0に
    fill.style.width = '0%';
    text.textContent = '';
    return;
  }
  const total = SCREEN_ORDER.length - 1;
  const percent = (idx / total) * 100;
  fill.style.width = percent + '%';
  text.textContent = `${idx + 1} / ${SCREEN_ORDER.length}`;
}

// 画面に入ったときの追加処理
function onEnterScreen(id) {
  switch (id) {
    case 'screen-select':
      renderResourceCards();
      break;
    case 'screen-explore-1':
      setupExploreScreen(1);
      break;
    case 'screen-explore-2':
      setupExploreScreen(2);
      break;
    case 'screen-memo-pre-1':
    case 'screen-memo-post-1':
    case 'screen-memo-pre-2':
    case 'screen-memo-post-2':
      bindMemoFields();
      break;
    case 'screen-template-1':
      renderTemplate(1);
      break;
    case 'screen-template-2':
      renderTemplate(2);
      break;
    case 'screen-summary':
      renderSummaryBindings();
      break;
    case 'screen-relation':
    case 'screen-final':
      bindMemoFields();
      break;
    case 'screen-result':
      renderResult();
      break;
  }
}

/* ---------------- 4. 資料選択画面 ---------------- */

function renderResourceCards() {
  const grid = document.querySelector('#screen-select .resource-grid');
  grid.innerHTML = '';
  RESOURCES.forEach((res) => {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.dataset.resourceId = String(res.id);
    if (state.selectedResource === res.id) card.classList.add('selected');

    card.innerHTML = `
      <img class="resource-card-image" src="${res.image}" alt="${res.caption}">
      <div class="resource-card-body">
        <div class="resource-label">
          <span class="resource-badge">${res.label}</span>
          <span>${res.caption}</span>
        </div>
        <div class="resource-check">✓</div>
      </div>
    `;
    card.addEventListener('click', () => selectResource(res.id));
    grid.appendChild(card);
  });
  updateGoExploreButton();
}

function selectResource(id) {
  state.selectedResource = id;
  saveState();
  // カードの見た目を切り替え
  document.querySelectorAll('#screen-select .resource-card').forEach((c) => {
    c.classList.toggle('selected', Number(c.dataset.resourceId) === id);
  });
  updateGoExploreButton();
}

function updateGoExploreButton() {
  const btn = document.getElementById('btn-go-explore-first');
  if (!btn) return;
  btn.disabled = !state.selectedResource;
}

/* ---------------- 5. 資料探索画面（クリックポイント＆ズーム） ---------------- */

// 各探索画面（1=1回目, 2=2回目）の状態
const zoomState = { 1: 1, 2: 1 };
const ZOOM_MIN = 0.6, ZOOM_MAX = 2.5, ZOOM_STEP = 0.2;

function setupExploreScreen(round) {
  const resource = RESOURCES.find((r) => r.id === state.selectedResource);
  if (!resource) {
    // 資料未選択なら選択画面へ戻す
    showScreen('screen-select');
    return;
  }

  // 画像をセット
  const img = document.querySelector(`.resource-image[data-img="${round}"]`);
  img.src = resource.image;
  img.alt = resource.caption;

  // ズームを初期化
  zoomState[round] = 1;
  applyZoom(round);

  // クリックポイントを生成
  const stage = document.querySelector(`.image-stage[data-stage="${round}"]`);
  // 既存の点を削除
  stage.querySelectorAll('.click-point').forEach((p) => p.remove());

  const points = CLICK_POINTS[resource.id] || [];
  points.forEach((p, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'click-point';
    dot.style.left = p.x + '%';
    dot.style.top = p.y + '%';
    dot.dataset.pointId = p.id;
    dot.textContent = String(i + 1);
    dot.title = p.name;

    // 2回目では1回目に選んだポイントを使用済みに
    if (round === 2 && state.exp1.pointId === p.id) {
      dot.classList.add('used');
      dot.addEventListener('click', () => {
        showToast('そのポイントは1つ目で探究しました。別のポイントを選びましょう。');
      });
    } else {
      dot.addEventListener('click', () => onPointClick(round, p, dot));
    }

    stage.appendChild(dot);
  });

  // 情報パネルをリセット
  resetInfoPanel(round);
}

function onPointClick(round, point, dotEl) {
  // 他の点のactiveを外す
  document
    .querySelectorAll(`.image-stage[data-stage="${round}"] .click-point`)
    .forEach((d) => d.classList.remove('active'));
  dotEl.classList.add('active');

  // 情報パネルを更新
  const panel = document.querySelector(`.info-panel[data-info="${round}"]`);
  panel.querySelector('.info-empty').classList.add('hidden');
  const content = panel.querySelector('.info-content');
  content.classList.remove('hidden');
  panel.querySelector('.info-badge').textContent = point.name;
  panel.querySelector('.info-name').textContent = point.name;
  panel.querySelector('.info-desc').textContent = point.desc;

  // 「探究する！」ボタンに point を覚えさせる
  const btn = panel.querySelector(`[data-action="select-point-${round}"]`);
  btn.dataset.pickPointId = point.id;
  btn.dataset.pickPointName = point.name;
}

function resetInfoPanel(round) {
  const panel = document.querySelector(`.info-panel[data-info="${round}"]`);
  panel.querySelector('.info-empty').classList.remove('hidden');
  panel.querySelector('.info-content').classList.add('hidden');
}

// ズーム
function applyZoom(round) {
  const stage = document.querySelector(`.image-stage[data-stage="${round}"]`);
  const label = document.getElementById(`zoom-level-${round}`);
  const z = zoomState[round];
  stage.style.transform = `scale(${z})`;
  if (label) label.textContent = Math.round(z * 100) + '%';
}

function changeZoom(round, dir) {
  let z = zoomState[round];
  if (dir === 'in')        z = Math.min(ZOOM_MAX, z + ZOOM_STEP);
  else if (dir === 'out')  z = Math.max(ZOOM_MIN, z - ZOOM_STEP);
  else if (dir === 'reset') z = 1;
  zoomState[round] = Math.round(z * 10) / 10;
  applyZoom(round);
}

/* ---------------- 6. メモ入力（双方向バインド） ---------------- */

// data-bind="exp1.firstNotice" 形式で state にひもづける
function bindMemoFields() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = el.dataset.bind; // "exp1.firstNotice" など
    const value = getStateValue(path);

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = value || '';
      // すでにイベントを付けていたら付け直さない
      if (!el.dataset.bound) {
        el.addEventListener('input', () => {
          setStateValue(path, el.value);
          saveState();
        });
        el.dataset.bound = '1';
      }
    } else {
      // pillなどの表示用要素
      el.textContent = value && value.length ? value : '—';
    }
  });
}

function getStateValue(path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), state);
}
function setStateValue(path, value) {
  const keys = path.split('.');
  let o = state;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!o[keys[i]]) o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

/* ---------------- 7. AI相談テンプレ ---------------- */

function buildTemplate(round) {
  const exp = round === 1 ? state.exp1 : state.exp2;
  const name = exp.pointName || '（未選択）';
  const reason = exp.firstNotice || '（最初に気づいたことを記入してください）';
  const where  = exp.whereLooked || '（資料のどこを見たかを記入してください）';

  return (
`私は南蛮貿易図屏風の『${name}』に注目しています。
その理由は、${reason} と感じたからです。
資料では、${where} の部分を見てそう考えました。
この『${name}』がなぜ描かれているのか探究したいです。

答えを教えるのではなく、私が自分で考えるための問いを投げかけてください。
できれば、3つくらいの「考えるきっかけになる質問」を出してください。`
  );
}

function renderTemplate(round) {
  const ta = document.getElementById(`template-${round}`);
  ta.value = buildTemplate(round);
  const link = document.getElementById(`ai-link-${round}`);
  if (link) link.href = AI_LINK;
}

async function copyTemplate(targetId) {
  const ta = document.getElementById(targetId);
  if (!ta) return;
  try {
    await navigator.clipboard.writeText(ta.value);
    showToast('テンプレートをコピーしました！');
  } catch (e) {
    // フォールバック
    ta.select();
    document.execCommand('copy');
    showToast('テンプレートをコピーしました！');
  }
}

/* ---------------- 8. サマリー / 結果 ---------------- */

function renderSummaryBindings() {
  // data-bind で textContent を更新
  document.querySelectorAll('#screen-summary [data-bind]').forEach((el) => {
    const v = getStateValue(el.dataset.bind);
    el.textContent = v && v.length ? v : '—';
  });
}

function renderResult() {
  const resource = RESOURCES.find((r) => r.id === state.selectedResource) || { label: '—', caption: '—' };
  const e1 = state.exp1, e2 = state.exp2;
  const container = document.getElementById('result-content');

  const fallback = (v) => (v && v.length ? v : '（未記入）');

  container.innerHTML = `
    <dl class="result-meta">
      <div class="result-meta-item"><dt>選んだ資料</dt><dd>${escapeHTML(resource.label)}</dd></div>
      <div class="result-meta-item"><dt>1つ目に注目したもの</dt><dd>${escapeHTML(fallback(e1.pointName))}</dd></div>
      <div class="result-meta-item"><dt>2つ目に注目したもの</dt><dd>${escapeHTML(fallback(e2.pointName))}</dd></div>
    </dl>

    <div class="result-section">
      <h4>1つ目の探究で分かったこと</h4>
      <p>${escapeHTML(fallback(e1.afterAI))}</p>
    </div>
    <div class="result-section">
      <h4>1つ目で考えが変わったこと</h4>
      <p>${escapeHTML(fallback(e1.changedMind))}</p>
    </div>
    <div class="result-section">
      <h4>2つ目の探究で分かったこと</h4>
      <p>${escapeHTML(fallback(e2.afterAI))}</p>
    </div>
    <div class="result-section">
      <h4>2つ目で考えが変わったこと</h4>
      <p>${escapeHTML(fallback(e2.changedMind))}</p>
    </div>
    <div class="result-section">
      <h4>2つの関連性</h4>
      <p>${escapeHTML(fallback(state.relation))}</p>
    </div>
    <div class="result-section">
      <h4>最終まとめ</h4>
      <p>${escapeHTML(fallback(state.finalSummary))}</p>
    </div>

    <div class="result-narrative">${buildNarrative(resource, e1, e2)}</div>
  `;
}

// 探究結果を「物語風」にまとめた文章を生成
function buildNarrative(resource, e1, e2) {
  const fb = (v, d='') => (v && v.length ? v : d);
  const p1 = fb(e1.pointName, '（1つ目）');
  const p2 = fb(e2.pointName, '（2つ目）');
  const n1 = fb(e1.firstNotice, '気づいたこと');
  const a1 = fb(e1.afterAI, '');
  const c1 = fb(e1.changedMind, '');
  const a2 = fb(e2.afterAI, '');
  const rel = fb(state.relation, '2つは何らかの形でつながっていると考えました。');
  const fin = fb(state.finalSummary, 'この資料は、当時の人や物の交流を伝えていると考えます。');

  const part1 = `私は南蛮貿易図屏風の<strong>『${escapeHTML(p1)}』</strong>と<strong>『${escapeHTML(p2)}』</strong>に注目しました。`;
  const part2 = `最初、${escapeHTML(p1)}については「${escapeHTML(n1)}」ということに気づきました。`;
  const part3 = a1
    ? `AIとの対話や調査を通して、${escapeHTML(a1)} と考えるようになりました。`
    : '';
  const part3b = c1 ? `（${escapeHTML(c1)}）` : '';
  const part4 = a2
    ? `また、${escapeHTML(p2)}については、${escapeHTML(a2)} ということが分かりました。`
    : '';
  const part5 = `この2つは、${escapeHTML(rel)} という点で関係していると考えます。`;
  const part6 = `そのため、この資料は <strong>${escapeHTML(fin)}</strong>`;

  return [part1, part2, part3, part3b, part4, part5, part6]
    .filter(Boolean)
    .join('\n\n');
}

function escapeHTML(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------------- 9. トースト ---------------- */

let toastTimer = null;
function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  // 次のフレームでshow（フェードイン）
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 350);
  }, 2200);
}

/* ---------------- 10. アクションハンドラ ---------------- */

function handleAction(action, target) {
  switch (action) {
    case 'go-select':
      showScreen('screen-select');
      break;

    case 'go-explore-first':
      if (!state.selectedResource) {
        showToast('資料を選んでください');
        return;
      }
      showScreen('screen-explore-1');
      break;

    case 'select-point-1': {
      const pid = target.dataset.pickPointId;
      const pname = target.dataset.pickPointName;
      if (!pid) { showToast('ポイントを選んでください'); return; }
      state.exp1.pointId = pid;
      state.exp1.pointName = pname;
      saveState();
      showScreen('screen-memo-pre-1');
      break;
    }

    case 'select-point-2': {
      const pid = target.dataset.pickPointId;
      const pname = target.dataset.pickPointName;
      if (!pid) { showToast('ポイントを選んでください'); return; }
      if (pid === state.exp1.pointId) {
        showToast('1つ目と別のポイントを選びましょう。');
        return;
      }
      state.exp2.pointId = pid;
      state.exp2.pointName = pname;
      saveState();
      showScreen('screen-memo-pre-2');
      break;
    }

    case 'go-template-1':
      showScreen('screen-template-1');
      break;
    case 'go-template-2':
      showScreen('screen-template-2');
      break;

    case 'go-memo-post-1':
      showScreen('screen-memo-post-1');
      break;
    case 'go-memo-post-2':
      showScreen('screen-memo-post-2');
      break;

    case 'go-explore-2':
      showScreen('screen-explore-2');
      break;

    case 'go-summary':
      showScreen('screen-summary');
      break;

    case 'go-relation':
      showScreen('screen-relation');
      break;

    case 'go-final':
      showScreen('screen-final');
      break;

    case 'go-result':
      showScreen('screen-result');
      break;

    case 'back':
      goBack();
      break;

    case 'copy-template':
      copyTemplate(target.dataset.target);
      break;

    case 'print':
      window.print();
      break;

    case 'restart':
      if (confirm('入力したすべての内容を消して最初に戻ります。よろしいですか？')) {
        resetState();
        location.reload();
      }
      break;
  }
}

/* ---------------- 11. 初期化 ---------------- */

function initEventDelegation() {
  // data-action 属性を持つ要素のクリックを一括処理
  document.body.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    handleAction(action, el);
  });

  // ズームボタン（押されたボタンが属する画面=1回目/2回目を判定）
  document.querySelectorAll('.btn-zoom').forEach((btn) => {
    btn.addEventListener('click', () => {
      const screen = btn.closest('.screen');
      const round = screen && screen.id === 'screen-explore-2' ? 2 : 1;
      changeZoom(round, btn.dataset.zoom);
    });
  });

  // ヘッダーの「最初に戻る」
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('入力した内容を消して最初に戻ります。よろしいですか？')) {
        resetState();
        location.reload();
      }
    });
  }
}

function init() {
  initEventDelegation();
  initAuth();

  // 未認証なら、まずパスワード入力画面を表示
  if (!isAuthenticated()) {
    showScreen('screen-auth', { pushHistory: false });
    // 入力欄にフォーカス
    setTimeout(() => {
      const input = document.getElementById('auth-input');
      if (input) input.focus();
    }, 50);
    return;
  }

  // 認証済み: 中断ページから再開（authに居た場合はタイトルへ）
  let restoreTarget = state.currentScreen || 'screen-title';
  if (restoreTarget === 'screen-auth') restoreTarget = 'screen-title';
  showScreen(restoreTarget, { pushHistory: false });
}

document.addEventListener('DOMContentLoaded', init);
