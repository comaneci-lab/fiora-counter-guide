const DATA_DRAGON_ROOT = 'https://ddragon.leagueoflegends.com';
let categories = [];
let matchups = {};
let categoryGuides = {};
const FIELDS = [
  ['runes', 'ルーン・シャード', 'ルーン・シャード'],
  ['skillOrder', 'スキルオーダー', 'スキルオーダー'],
  ['build', 'ビルド', 'ビルド'],
  ['micro1', 'マイクロ · レベル1', 'マイクロ'],
  ['micro2', 'マイクロ · レベル2', 'マイクロ'],
  ['micro3to5', 'マイクロ · レベル3〜5', 'マイクロ'],
  ['micro6', 'マイクロ · レベル6', 'マイクロ'],
  ['lanePlan', 'ミクロ · レーン戦終了まで', 'ミクロ'],
  ['macroPlan', 'マクロ · レーン戦終了後', 'マクロ']
];

const championList = document.querySelector('#champion-list');
const searchInput = document.querySelector('#champion-search');
const detail = document.querySelector('#matchup-detail');
const championSelect = document.querySelector('#form-champion');
const categorySelect = document.querySelector('#form-category');
const editorMode = document.querySelector('#editor-mode');
const categoryField = document.querySelector('#category-field');
const championField = championSelect ? championSelect.closest('.field') : null;
const categoryFieldset = document.querySelector('#custom-categories');
const categoryCheckboxes = document.querySelector('#category-checkboxes');
const form = document.querySelector('#guide-form');
const statusMessage = document.querySelector('#form-status');
const editorPreview = document.querySelector('#editor-preview');
const previewJson = document.querySelector('#preview-json');
const loadError = document.querySelector('#load-error');
const championCount = document.querySelector('#champion-count');
const pickerResultCount = document.querySelector('#picker-result-count');
let champions = [];
let selectedChampionId = '';
let patchVersion = '';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function championImage(id) {
  return `${DATA_DRAGON_ROOT}/cdn/${patchVersion}/img/champion/${encodeURIComponent(id)}.png`;
}

function visibleChampions() {
  const query = searchInput.value.trim().toLocaleLowerCase('ja');
  return champions.filter((champion) =>
    champion.name.toLocaleLowerCase('ja').includes(query)
    || champion.id.toLocaleLowerCase('en').includes(query)
    || champion.title.toLocaleLowerCase('ja').includes(query)
  );
}

function renderChampionList() {
  const filtered = visibleChampions();
  pickerResultCount.textContent = `${filtered.length}`;
  if (!filtered.length) {
    championList.innerHTML = '<p class="no-results">該当するチャンピオンがいません。</p>';
    return;
  }

  championList.innerHTML = filtered.map((champion) => `
    <button class="champion-option" type="button" role="option"
      aria-selected="${champion.id === selectedChampionId}"
      data-champion-id="${escapeHtml(champion.id)}">
      <img src="${escapeHtml(championImage(champion.id))}" alt="" loading="lazy">
      <span>${escapeHtml(champion.name)}</span>
    </button>
  `).join('');
}

function getChampionCategories(champion) {
  const custom = matchups[champion.id] && Array.isArray(matchups[champion.id].customCategories)
    ? matchups[champion.id].customCategories
    : [];
  const dataDragon = champion.tags || [];
  return {
    assigned: custom.map((id) => categories.find((category) => category.id === id)).filter(Boolean),
    suggestions: dataDragon
  };
}

function formatUpdatedAt(guide) {
  if (!guide || !guide.updatedAt || !guide.patch) return '';
  return `更新 ${escapeHtml(guide.updatedAt)} · Patch ${escapeHtml(guide.patch)}`;
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function renderGuide(guide) {
  const availableFields = FIELDS.filter(([key]) => guide && typeof guide[key] === 'string' && guide[key].trim());
  if (!availableFields.length) {
    return '<div class="guide-empty"><strong>個別の対策はまだありません</strong><p>カテゴリ別の汎用対策がある場合は、下に表示されます。</p></div>';
  }

  return `<div class="guide-sections">${availableFields.map(([key, title]) => `
    <article class="guide-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(guide[key])}</p></article>
  `).join('')}</div>`;
}

function renderCategoryGuide(category) {
  const guide = categoryGuides[category.id];
  if (!guide) return '';
  const content = renderGuide(guide);
  return `<section class="category-guide"><h5>${escapeHtml(category.label)}の汎用対策</h5>${content}<p class="updated-line">${formatUpdatedAt(guide)}</p></section>`;
}

function renderDetail(champion) {
  if (!champion) {
    detail.innerHTML = '<div class="empty-state"><span class="empty-sigil" aria-hidden="true">✳</span><h3>対面を選んでください</h3><p>チャンピオンを選ぶと、個別の対策とカテゴリ別のヒントが表示されます。</p></div>';
    return;
  }

  const guide = matchups[champion.id];
  const categories = getChampionCategories(champion);
  const categoryLabels = categories.assigned.length
    ? categories.assigned.map((category) => `<span class="category-tag">${escapeHtml(category.label)}</span>`).join('')
    : '<span class="category-tag unclassified">独自分類なし</span>';
  const dragonTags = categories.suggestions.length
    ? `Data Dragon: ${categories.suggestions.map(escapeHtml).join(' / ')}`
    : 'Data Dragonタグなし';
  const categoryGuide = categories.assigned.map(renderCategoryGuide).join('');

  detail.innerHTML = `
    <div class="detail-header">
      <img class="detail-portrait" src="${escapeHtml(championImage(champion.id))}" alt="">
      <div>
        <h3 class="detail-name">${escapeHtml(champion.name)}</h3>
        <p class="detail-title">${escapeHtml(champion.title)}</p>
      </div>
      ${form ? '<button class="edit-matchup" type="button">この対面を編集</button>' : ''}
    </div>
    <div class="guide-content">
      ${renderGuide(guide)}
      <div class="category-hints">
        <h4>対面カテゴリ · 独自分類</h4>
        <div class="category-tags">${categoryLabels}</div>
        <p class="category-placeholder">${escapeHtml(dragonTags)}（参考情報）</p>
        ${categoryGuide || '<p class="category-placeholder">カテゴリ別の汎用対策はまだ登録されていません。</p>'}
      </div>
      ${guide && guide.updatedAt ? `<p class="updated-line">${formatUpdatedAt(guide)}</p>` : ''}
    </div>
  `;
}

function setSelectedChampion(id, focusDetail) {
  const champion = champions.find((item) => item.id === id);
  if (!champion) return;
  selectedChampionId = id;
  renderChampionList();
  renderDetail(champion);
  if (focusDetail) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderCategoryOptions() {
  if (!categorySelect || !categoryCheckboxes) return;
  categorySelect.innerHTML = '<option value="">カテゴリを選択</option>' + categories.map((category) =>
    `<option value="${escapeHtml(category.id)}">${escapeHtml(category.label)}</option>`
  ).join('');
  categorySelect.disabled = categories.length === 0;
  categoryCheckboxes.innerHTML = categories.length
    ? categories.map((category) => `
      <label class="category-checkbox">
        <input type="checkbox" name="customCategory" value="${escapeHtml(category.id)}">
        <span>${escapeHtml(category.label)}</span>
      </label>
    `).join('')
    : '<span class="category-loading">カテゴリを読み込めません。</span>';
}

function updateEditorMode() {
  if (!form) return;
  const isMatchup = editorMode.value === 'matchup';
  championField.hidden = !isMatchup;
  categoryField.hidden = isMatchup;
  categoryFieldset.hidden = !isMatchup;
  championSelect.required = isMatchup;
  categorySelect.required = !isMatchup;
}

function setFormValues(guide, mode) {
  const selectedMode = mode || editorMode.value;
  editorMode.value = selectedMode;
  updateEditorMode();
  for (const [key] of FIELDS) {
    const field = form.elements.namedItem(key);
    field.value = guide && typeof guide[key] === 'string' ? guide[key] : '';
  }
  if (selectedMode === 'matchup') {
    const assigned = guide && Array.isArray(guide.customCategories) ? guide.customCategories : [];
    for (const input of categoryCheckboxes.querySelectorAll('input[name="customCategory"]')) {
      input.checked = assigned.includes(input.value);
    }
  }
  document.querySelector('#form-updated').value = guide && guide.updatedAt
    ? guide.updatedAt
    : localDateString();
  document.querySelector('#form-patch').value = guide && guide.patch ? guide.patch : patchVersion;
  statusMessage.textContent = '';
  statusMessage.className = 'form-status';
}

function selectedChampion() {
  return champions.find((champion) => champion.id === championSelect.value);
}

function collectGuide() {
  const isMatchup = editorMode.value === 'matchup';
  const champion = isMatchup ? selectedChampion() : null;
  const category = isMatchup ? null : categories.find((item) => item.id === categorySelect.value);
  const guide = {
    mode: editorMode.value,
    targetId: champion ? champion.id : category ? category.id : '',
    targetName: champion ? champion.name : category ? category.label : '',
    updatedAt: document.querySelector('#form-updated').value.trim(),
    patch: document.querySelector('#form-patch').value.trim()
  };
  for (const [key] of FIELDS) guide[key] = form.elements.namedItem(key).value.trim();
  if (isMatchup) {
    guide.customCategories = Array.from(categoryCheckboxes.querySelectorAll('input[name="customCategory"]:checked'))
      .map((input) => input.value);
  }
  return guide;
}

function validateGuide(guide) {
  const errors = [];
  if (!guide.targetId) errors.push(guide.mode === 'matchup' ? '対面チャンピオンを選択してください。' : '対象カテゴリを選択してください。');
  if (!guide.updatedAt || !/^\d{4}-\d{2}-\d{2}$/.test(guide.updatedAt)) errors.push('有効な更新日を入力してください。');
  if (!guide.patch) errors.push('更新時のパッチを入力してください。');
  if (!FIELDS.some(([key]) => guide[key]) && !(guide.mode === 'matchup' && guide.customCategories.length)) {
    errors.push('対策情報または独自カテゴリを1つ以上入力してください。');
  }
  return errors;
}

function showValidation(errors) {
  statusMessage.textContent = errors.join(' ');
  statusMessage.className = 'form-status is-error';
  return errors.length === 0;
}

function guideExport(guide) {
  const content = {
    updatedAt: guide.updatedAt,
    patch: guide.patch,
    source: 'manual'
  };
  for (const [key] of FIELDS) {
    if (guide[key]) content[key] = guide[key];
  }
  if (guide.mode === 'matchup' && guide.customCategories.length) {
    content.customCategories = guide.customCategories;
  }
  return {
    [guide.targetId]: content
  };
}

function previewGuide() {
  const guide = collectGuide();
  if (!showValidation(validateGuide(guide))) return;
  previewJson.textContent = JSON.stringify(guideExport(guide), null, 2);
  editorPreview.hidden = false;
  statusMessage.textContent = '入力内容を確認しました。プレビューを表示しています。';
  statusMessage.className = 'form-status is-success';
}

function downloadGuide() {
  const guide = collectGuide();
  if (!showValidation(validateGuide(guide))) return;
  const json = JSON.stringify(guideExport(guide), null, 2);
  const blob = new Blob([`${json}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${guide.mode === 'matchup' ? 'matchup' : 'category'}-${guide.targetId.toLowerCase()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  previewJson.textContent = json;
  editorPreview.hidden = false;
  statusMessage.textContent = `JSONを書き出しました。data/${guide.mode === 'matchup' ? 'matchups' : 'category-guides'}.json に内容を反映してPRを作成してください。`;
  statusMessage.className = 'form-status is-success';
}

function editMatchup() {
  if (!selectedChampionId) return;
  editorMode.value = 'matchup';
  championSelect.value = selectedChampionId;
  setFormValues(matchups[selectedChampionId], 'matchup');
  document.querySelector('#editor-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadChampions() {
  try {
    const versionsResponse = await fetch(`${DATA_DRAGON_ROOT}/api/versions.json`);
    if (!versionsResponse.ok) throw new Error(`バージョン取得に失敗しました (${versionsResponse.status})`);
    const versions = await versionsResponse.json();
    patchVersion = versions[0];
    if (!patchVersion) throw new Error('Data Dragonのパッチ情報が空です。');

    const championResponse = await fetch(`${DATA_DRAGON_ROOT}/cdn/${encodeURIComponent(patchVersion)}/data/ja_JP/champion.json`);
    if (!championResponse.ok) throw new Error(`チャンピオン一覧の取得に失敗しました (${championResponse.status})`);
    const payload = await championResponse.json();
    champions = Object.values(payload.data).sort((a, b) => a.name.localeCompare(b.name, 'ja')).map((item) => ({
      id: item.id,
      name: item.name,
      title: item.title,
      tags: item.tags
    }));

    championCount.textContent = `${champions.length} CHAMPIONS · PATCH ${patchVersion}`;
    if (championSelect) {
      championSelect.innerHTML = '<option value="">チャンピオンを選択</option>' + champions.map((champion) =>
        `<option value="${escapeHtml(champion.id)}">${escapeHtml(champion.name)}</option>`
      ).join('');
      championSelect.disabled = false;
      document.querySelector('#form-patch').placeholder = `例: ${patchVersion}`;
      document.querySelector('#form-patch').value = patchVersion;
    }
    championList.innerHTML = '';
    renderChampionList();
  } catch (error) {
    championCount.textContent = 'DATA UNAVAILABLE';
    championList.innerHTML = '<p class="no-results">チャンピオン一覧を読み込めません。</p>';
    loadError.hidden = false;
    loadError.textContent = `Data Dragon: ${error.message}。ネットワーク接続を確認して再読み込みしてください。`;
    if (championSelect) championSelect.innerHTML = '<option value="">読み込みに失敗しました</option>';
  }
}

async function loadGuideData() {
  const [categoriesResponse, matchupsResponse, categoryGuidesResponse] = await Promise.all([
    fetch('./data/categories.json', { cache: 'no-store' }),
    fetch('./data/matchups.json', { cache: 'no-store' }),
    fetch('./data/category-guides.json', { cache: 'no-store' })
  ]);
  for (const [name, response] of [
    ['categories.json', categoriesResponse],
    ['matchups.json', matchupsResponse],
    ['category-guides.json', categoryGuidesResponse]
  ]) {
    if (!response.ok) throw new Error(`${name} の読み込みに失敗しました (${response.status})`);
  }
  const [categoryData, matchupData, categoryGuideData] = await Promise.all([
    categoriesResponse.json(),
    matchupsResponse.json(),
    categoryGuidesResponse.json()
  ]);
  if (!categoryData || !Array.isArray(categoryData.categories) || !matchupData || Array.isArray(matchupData)
      || !categoryGuideData || Array.isArray(categoryGuideData)) {
    throw new Error('ガイドデータのJSON形式が正しくありません。');
  }
  categories = categoryData.categories;
  matchups = matchupData;
  categoryGuides = categoryGuideData;
  renderCategoryOptions();
  const selected = champions.find((champion) => champion.id === selectedChampionId);
  if (selected) renderDetail(selected);
}

function reportGuideLoadError(error) {
  loadError.hidden = false;
  const existing = loadError.textContent;
  loadError.textContent = `${existing ? `${existing} ` : ''}ガイドデータ: ${error.message}。ローカルサーバーから開いてください。`;
  if (categoryCheckboxes) categoryCheckboxes.innerHTML = '<span class="category-loading">カテゴリを読み込めません。</span>';
}

searchInput.addEventListener('input', renderChampionList);
championList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-champion-id]');
  if (button) setSelectedChampion(button.dataset.championId, false);
});
championList.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    const button = event.target.closest('[data-champion-id]');
    if (button) setSelectedChampion(button.dataset.championId, false);
  }
});
if (form) {
  championSelect.addEventListener('change', () => {
    const id = championSelect.value;
    setFormValues(matchups[id], 'matchup');
    setSelectedChampion(id, false);
  });
  categorySelect.addEventListener('change', () => setFormValues(categoryGuides[categorySelect.value], 'category'));
  editorMode.addEventListener('change', () => {
    const isMatchup = editorMode.value === 'matchup';
    setFormValues(isMatchup ? matchups[championSelect.value] : categoryGuides[categorySelect.value], editorMode.value);
  });
  detail.addEventListener('click', (event) => {
    if (event.target.closest('.edit-matchup')) editMatchup();
  });
  document.querySelector('#preview-button').addEventListener('click', previewGuide);
  document.querySelector('#download-button').addEventListener('click', downloadGuide);
  document.querySelector('#close-preview').addEventListener('click', () => {
    editorPreview.hidden = true;
  });
}
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

updateEditorMode();
loadGuideData().catch(reportGuideLoadError);
loadChampions();
