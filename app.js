const DATA_DRAGON_ROOT = 'https://ddragon.leagueoflegends.com';
const FIORA_ID = 'Fiora';
const SKILL_KEYS = ['Q', 'W', 'E', 'R'];
const SHARD_ROWS = [
  {
    label: '攻撃',
    choices: [
      { id: 5005, name: '攻撃速度', icon: 'StatModsAttackSpeedIcon.png' },
      { id: 5008, name: 'アダプティブフォース', icon: 'StatModsAdaptiveForceIcon.png' },
      { id: 5007, name: 'スキルヘイスト', icon: 'StatModsCDRScalingIcon.png' }
    ]
  },
  {
    label: 'フレックス',
    choices: [
      { id: 5008, name: 'アダプティブフォース', icon: 'StatModsAdaptiveForceIcon.png' },
      { id: 5010, name: '移動速度', icon: 'StatModsMovementSpeedIcon.png' },
      { id: 5001, name: '体力自動増加', icon: 'StatModsHealthScalingIcon.png' }
    ]
  },
  {
    label: '防御',
    choices: [
      { id: 5011, name: '体力', icon: 'StatModsHealthPlusIcon.png' },
      { id: 5013, name: '行動妨害耐性', icon: 'StatModsTenacityIcon.png' },
      { id: 5001, name: '体力自動増加', icon: 'StatModsHealthScalingIcon.png' }
    ]
  }
];
let categories = [];
let matchups = {};
let runeStyles = [];
let runeById = new Map();
let summonerSpells = [];
let summonerSpellById = new Map();
let items = [];
let itemById = new Map();
let fioraSpells = [];
let fioraChampion = null;
let primaryStyleId = '';
let secondaryStyleId = '';
let primaryPerkIds = Array(4).fill('');
let secondaryTierPerkIds = Array(3).fill('');
let selectedShardIds = Array(3).fill('');
let selectedSummonerSpellSets = [Array(2).fill('')];
let selectedBuild = {
  start: [],
  early: [],
  core: [],
  options: [{ note: '', items: [] }, { note: '', items: [] }, { note: '', items: [] }]
};
let activeBuildGroup = 'core';
let itemCategoryFilter = 'all';
const FIELDS = [
  ['macroPlan', 'マクロ'],
  ['lanePlan', 'レーン戦'],
  ['micro1', 'Lv1'],
  ['micro2', 'Lv2'],
  ['micro3to5', 'Lv3〜5'],
  ['micro6', 'Lv6']
];
const MATCHUP_RATING_OPTIONS = ['有利', 'やや有利', '五分', 'やや不利', '不利'];
const ITEM_FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'fighter', label: 'ファイター', tags: ['AttackSpeed', 'LifeSteal', 'OnHit', 'Damage'] },
  { id: 'assassin', label: 'アサシン', tags: ['ArmorPenetration', 'MagicPenetration'] },
  { id: 'mage', label: 'メイジ', tags: ['SpellDamage', 'Mana', 'ManaRegen', 'SpellVamp'] },
  { id: 'marksman', label: 'マークスマン', tags: ['AttackSpeed', 'CriticalStrike', 'LifeSteal', 'OnHit'] },
  { id: 'tank', label: 'タンク', tags: ['Health', 'HealthRegen', 'Armor', 'SpellBlock', 'MagicResist', 'Tenacity', 'Slow'] },
  { id: 'support', label: 'サポート', tags: ['GoldPer', 'Vision', 'Aura', 'ManaRegen'] },
  { id: 'boots', label: 'ブーツ', tags: ['Boots'] },
  { id: 'consumable', label: '消耗品', tags: ['Consumable', 'Trinket', 'Vision'] }
];

const championList = document.querySelector('#champion-list');
const searchInput = document.querySelector('#champion-search');
const detail = document.querySelector('#matchup-detail');
const championSelect = document.querySelector('#form-champion');
const summonerSpellPicker = document.querySelector('#summoner-spell-picker');
const editorMode = document.querySelector('#editor-mode');
const categoryField = document.querySelector('#category-field');
const championField = championSelect ? championSelect.closest('.field') : null;
const categoryCheckboxes = document.querySelector('#category-checkboxes');
const genericNamePreview = document.querySelector('#generic-name-preview');
const form = document.querySelector('#guide-form');
const statusMessage = document.querySelector('#form-status');
const editorPreview = document.querySelector('#editor-preview');
const previewJson = document.querySelector('#preview-json');
const previewContent = document.querySelector('#preview-content');
const loadError = document.querySelector('#load-error');
const championCount = document.querySelector('#champion-count');
const pickerResultCount = document.querySelector('#picker-result-count');
let champions = [];
let selectedChampionId = '';
let selectedCategoryId = '';
let patchVersion = '';
let skillOrderValues = Array(18).fill('');
let referenceDataLoaded = false;
let referenceDataPromise = null;
let guideDataLoaded = false;
let editorInitialized = false;
let userHasEditedForm = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function championImage(champion) {
  return `${DATA_DRAGON_ROOT}/cdn/${encodeURIComponent(patchVersion)}/img/champion/${encodeURIComponent(champion.image)}`;
}

function itemImage(item) {
  return `${DATA_DRAGON_ROOT}/cdn/${encodeURIComponent(patchVersion)}/img/item/${encodeURIComponent(item.image.full)}`;
}

function runeImage(rune) {
  return `${DATA_DRAGON_ROOT}/cdn/img/${rune.icon}`;
}

function shardImage(shard) {
  return `${DATA_DRAGON_ROOT}/cdn/img/perk-images/StatMods/${shard.icon}`;
}

function skillImage(spell) {
  return `${DATA_DRAGON_ROOT}/cdn/${encodeURIComponent(patchVersion)}/img/spell/${encodeURIComponent(spell.image.full)}`;
}

function summonerSpellImage(spell) {
  return `${DATA_DRAGON_ROOT}/cdn/${encodeURIComponent(patchVersion)}/img/spell/${encodeURIComponent(spell.image.full)}`;
}

function dataDragonImageError(image) {
  const label = image.dataset.imageLabel || image.alt || 'Data Dragon画像';
  loadError.hidden = false;
  loadError.textContent = `${label}の画像を読み込めませんでした。Data Dragonへの接続と画像ファイルを確認してください。`;
}

function visibleChampions() {
  const query = searchInput.value.trim().toLocaleLowerCase('ja');
  return champions.filter((champion) => {
    const guide = matchups[champion.id];
    if (!hasCounterGuide(guide)) return false;
    return champion.name.toLocaleLowerCase('ja').includes(query)
      || champion.id.toLocaleLowerCase('en').includes(query)
      || champion.title.toLocaleLowerCase('ja').includes(query);
  });
}

function visibleGenericCategories() {
  const query = searchInput.value.trim().toLocaleLowerCase('ja');
  return registeredGenericChampions().filter((profile) =>
    profile.name.toLocaleLowerCase('ja').includes(query)
    || profile.id.toLocaleLowerCase('en').includes(query)
  );
}

function normalizeGenericCategoryIds(categoryIds) {
  const selectedIds = new Set(Array.isArray(categoryIds) ? categoryIds : []);
  return categories.filter((category) => selectedIds.has(category.id)).map((category) => category.id);
}

function genericCategoryIdsFromGuide(guide, id) {
  const assigned = guide && guide.categories;
  return normalizeGenericCategoryIds(Array.isArray(assigned) ? assigned : String(id || '').split('-'));
}

function genericCategoryId(categoryIds) {
  return normalizeGenericCategoryIds(categoryIds).join('-');
}

function genericCategoryName(categoryIds) {
  const selectedIds = new Set(normalizeGenericCategoryIds(categoryIds));
  return categories.filter((category) => selectedIds.has(category.id))
    .map((category) => category.label)
    .join('');
}

function registeredGenericChampions() {
  return Object.entries(matchups).map(([id, guide]) => {
    const categoryIds = genericCategoryIdsFromGuide(guide, id);
    return {
      id,
      name: genericCategoryName(categoryIds),
      categoryIds,
      guide
    };
  }).filter((profile) => profile.name && hasCounterGuide(profile.guide));
}

function selectedGenericCategoryIds() {
  return Array.from(categoryCheckboxes.querySelectorAll('input[name="genericCategory"]:checked'))
    .map((input) => input.value);
}

function updateGenericNamePreview(categoryIds) {
  if (!genericNamePreview) return;
  genericNamePreview.textContent = genericCategoryName(categoryIds || selectedGenericCategoryIds()) || 'カテゴリを選択してください';
}

function hasCounterGuide(guide) {
  if (!guide || typeof guide !== 'object') return false;
  return FIELDS.some(([key]) => typeof guide[key] === 'string' && guide[key].trim())
    || MATCHUP_RATING_OPTIONS.includes(guide.matchupRating)
    || MATCHUP_RATING_OPTIONS.includes(guide.laneRating)
    || hasAnyRuneSelection(guide.runes)
    || (Array.isArray(guide.skillOrder) && guide.skillOrder.length > 0)
    || (Array.isArray(guide.summonerSpells) && guide.summonerSpells.length > 0)
    || hasBuildItems(normalizeBuildSelection(guide.build));
}

function renderChampionList() {
  const filtered = visibleChampions();
  const genericCategories = visibleGenericCategories();
  pickerResultCount.textContent = `${filtered.length} · ${genericCategories.length}`;
  if (!filtered.length && !genericCategories.length) {
    championList.innerHTML = '<p class="no-results">該当するチャンピオン・汎用対面がありません。</p>';
    return;
  }

  championList.innerHTML = `${filtered.map((champion) => `
    <button class="champion-option" type="button" role="option"
      aria-selected="${champion.id === selectedChampionId}"
      data-champion-id="${escapeHtml(champion.id)}">
      <img src="${escapeHtml(championImage(champion))}" alt="" loading="lazy" data-image-label="${escapeHtml(champion.name)}">
      <span>${escapeHtml(champion.name)}</span>
    </button>
  `).join('')}
  ${genericCategories.map((category) => `
    <button class="champion-option category-option" type="button" role="option"
      aria-selected="${category.id === selectedCategoryId}"
      data-category-id="${escapeHtml(category.id)}">
      <span class="category-option-mark" aria-hidden="true">汎</span>
      <span>${escapeHtml(category.name)} <small>汎用対面</small></span>
    </button>
  `).join('')}`;
}

function updateChampionCount() {
  const matchupCount = champions.filter((champion) => hasCounterGuide(matchups[champion.id])).length;
  const genericCount = registeredGenericChampions().length;
  championCount.textContent = `${matchupCount} 対策 · ${genericCount} 汎用`;
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

function selectedStyle(path) {
  const id = path === 'primary' ? primaryStyleId : secondaryStyleId;
  return runeStyles.find((style) => String(style.id) === String(id));
}

function renderStylePickers() {
  for (const path of ['primary', 'secondary']) {
    const container = document.querySelector(`#${path}-style-picker`);
    const selectedId = path === 'primary' ? primaryStyleId : secondaryStyleId;
    const otherId = path === 'primary' ? secondaryStyleId : primaryStyleId;
    container.innerHTML = runeStyles.map((style) => `
      <button class="style-choice${String(style.id) === String(selectedId) ? ' is-selected' : ''}" type="button"
        data-style-path="${path}" data-style-id="${style.id}" aria-pressed="${String(style.id) === String(selectedId)}"
        aria-label="${escapeHtml(style.name)}" title="${escapeHtml(style.name)}"
        ${String(style.id) === String(otherId) ? 'disabled' : ''}>
        <img src="${escapeHtml(runeImage(style))}" alt="" data-image-label="${escapeHtml(style.name)}">
        <span>${escapeHtml(style.name)}</span>
      </button>
    `).join('');
  }
}

function runeChoiceButton(rune, path, slotIndex, selectedId, disabled) {
  const selected = String(rune.id) === String(selectedId);
  return `
    <button class="rune-choice${selected ? ' is-selected' : ''}" type="button"
      data-rune-path="${path}" data-rune-slot="${slotIndex}" data-rune-id="${rune.id}"
      aria-pressed="${selected}" aria-label="${escapeHtml(rune.name)}" title="${escapeHtml(rune.name)}"
      ${disabled ? 'disabled' : ''}>
      <img src="${escapeHtml(runeImage(rune))}" alt="" data-image-label="${escapeHtml(rune.name)}">
      <span>${escapeHtml(rune.name)}</span>
    </button>
  `;
}

function runeDescriptionText(rune) {
  const markup = String(rune.longDesc || rune.shortDesc || '').replace(/<[^>]*>/g, ' ');
  const decoder = document.createElement('textarea');
  decoder.innerHTML = markup;
  return decoder.value.replace(/\s+/g, ' ').trim();
}

function renderRuneDescription(rune) {
  const container = document.querySelector('#rune-description');
  if (!container) return;
  if (!rune) {
    container.innerHTML = '<span>ルーンにカーソルを合わせるか、選択すると説明が表示されます。</span>';
    return;
  }
  const description = runeDescriptionText(rune);
  container.innerHTML = `
    <strong>${escapeHtml(rune.name)}</strong>
    <p>${escapeHtml(description || '説明はありません。')}</p>
  `;
}

function renderPrimaryRuneSlots() {
  const style = selectedStyle('primary');
  const container = document.querySelector('#primary-rune-slots');
  if (!style) {
    container.innerHTML = '<p class="selection-loading">メインパスを選択してください。</p>';
    return;
  }
  container.innerHTML = style.slots.map((slot, index) => `
    <section class="rune-slot">
      <h4>${index === 0 ? 'キーストーン' : `メインルーン ${index}`}</h4>
      <div class="rune-option-grid">
        ${slot.runes.map((rune) => runeChoiceButton(rune, 'primary', index, primaryPerkIds[index], false)).join('')}
      </div>
    </section>
  `).join('');
}

function renderSecondaryRuneSummary() {
  const selectedRunes = secondaryTierPerkIds.map((id) => runeById.get(String(id))).filter(Boolean);
  document.querySelector('#secondary-rune-count').textContent = `${selectedRunes.length} / 2 選択中`;
  document.querySelector('#secondary-rune-summary').innerHTML = Array.from({ length: 2 }, (_, index) => {
    const rune = selectedRunes[index];
    return `<div class="secondary-rune-pick">
      <span>サブルーン ${index + 1}</span>
      ${rune
        ? `<img src="${escapeHtml(runeImage(rune))}" alt="${escapeHtml(rune.name)}" data-image-label="${escapeHtml(rune.name)}"><strong>${escapeHtml(rune.name)}</strong>`
        : '<span class="empty-rune-pick">未選択</span>'}
    </div>`;
  }).join('');
}

function renderSecondaryRuneSlots() {
  const style = selectedStyle('secondary');
  const container = document.querySelector('#secondary-rune-slots');
  if (!style) {
    container.innerHTML = '<p class="selection-loading">サブパスを選択してください。</p>';
    renderSecondaryRuneSummary();
    return;
  }
  const selectedCount = secondaryTierPerkIds.filter(Boolean).length;
  container.innerHTML = style.slots.slice(1).map((slot, index) => {
    const tierSelected = Boolean(secondaryTierPerkIds[index]);
    return `
      <section class="secondary-tier">
        <h4>段 ${index + 1}${tierSelected ? ' · 選択中' : ''}</h4>
        <div class="rune-option-grid">
          ${slot.runes.map((rune) => runeChoiceButton(
            rune, 'secondary', index, secondaryTierPerkIds[index], selectedCount >= 2 && !tierSelected
          )).join('')}
        </div>
      </section>
    `;
  }).join('');
  renderSecondaryRuneSummary();
}

function renderShardEditor() {
  document.querySelector('#shard-slots').innerHTML = SHARD_ROWS.map((row, index) => `
    <section class="shard-slot">
      <h4>${escapeHtml(row.label)}</h4>
      <div class="shard-choice-grid">
        ${row.choices.map((shard) => {
          const selected = Number(selectedShardIds[index]) === shard.id;
          return `
            <button class="shard-choice${selected ? ' is-selected' : ''}" type="button"
              data-shard-slot="${index}" data-shard-id="${shard.id}" aria-pressed="${selected}"
              aria-label="${escapeHtml(shard.name)}" title="${escapeHtml(shard.name)}">
              <img src="${escapeHtml(shardImage(shard))}" alt="" data-image-label="${escapeHtml(shard.name)}">
              <span>${escapeHtml(shard.name)}</span>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `).join('');
}

function renderSummonerSpellEditor() {
  if (!summonerSpellPicker) return;
  if (!summonerSpells.length) {
    summonerSpellPicker.innerHTML = '<p class="selection-loading">サモナースペル情報を読み込み中…</p>';
    return;
  }
  summonerSpellPicker.innerHTML = `
    <div class="summoner-spell-patterns">
      ${selectedSummonerSpellSets.map((spellSet, patternIndex) => `
        ${patternIndex ? '<div class="summoner-spell-or">OR</div>' : ''}
        <section class="summoner-spell-pattern">
          <div class="summoner-spell-pattern-heading">
            <span>パターン ${patternIndex + 1} · ${spellSet.filter(Boolean).length} / 2 選択中</span>
            ${patternIndex ? `<button class="summoner-spell-remove" type="button" data-remove-summoner-pattern="${patternIndex}">このパターンを削除</button>` : ''}
          </div>
          <div class="summoner-spell-choices">
            ${summonerSpells.map((spell) => {
              const selected = spellSet.includes(String(spell.key));
              return `
                <button class="summoner-spell-choice${selected ? ' is-selected' : ''}" type="button"
                  data-summoner-spell-pattern="${patternIndex}" data-summoner-spell-id="${escapeHtml(spell.key)}"
                  aria-pressed="${selected}" aria-label="${escapeHtml(spell.name)}" title="${escapeHtml(spell.name)}">
                  <img src="${escapeHtml(summonerSpellImage(spell))}" alt="" data-image-label="${escapeHtml(spell.name)}">
                  <span>${escapeHtml(spell.name)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>
      `).join('')}
    </div>
    <button class="summoner-spell-add" type="button" data-add-summoner-pattern>＋ ORパターンを追加</button>
  `;
}

function renderRuneEditor(runes) {
  primaryStyleId = runes && runes.primaryStyleId ? String(runes.primaryStyleId) : '';
  secondaryStyleId = runes && runes.secondaryStyleId ? String(runes.secondaryStyleId) : '';
  primaryPerkIds = runes && Array.isArray(runes.primaryPerkIds)
    ? Array.from({ length: 4 }, (_, index) => String(runes.primaryPerkIds[index] || ''))
    : Array(4).fill('');
  secondaryTierPerkIds = Array(3).fill('');
  if (runes && Array.isArray(runes.secondaryPerkIds)) {
    const style = selectedStyle('secondary');
    if (style) {
      for (const id of runes.secondaryPerkIds) {
        const tierIndex = style.slots.slice(1).findIndex((slot) => slot.runes.some((rune) => rune.id === Number(id)));
        if (tierIndex >= 0) secondaryTierPerkIds[tierIndex] = String(id);
      }
    }
  }
  selectedShardIds = runes && Array.isArray(runes.shardIds)
    ? Array.from({ length: 3 }, (_, index) => String(runes.shardIds[index] || ''))
    : Array(3).fill('');
  renderStylePickers();
  renderPrimaryRuneSlots();
  renderSecondaryRuneSlots();
  renderShardEditor();
  const selectedRuneId = [...primaryPerkIds, ...secondaryTierPerkIds].find(Boolean);
  renderRuneDescription(selectedRuneId ? runeById.get(String(selectedRuneId)) : null);
}

function normalizeSummonerSpellSets(spellSets) {
  if (!Array.isArray(spellSets) || !spellSets.length) return [];
  const normalized = spellSets.every((spell) => !Array.isArray(spell)) ? [spellSets] : spellSets.filter(Array.isArray);
  return normalized.map((spellSet) => spellSet.slice(0, 2).map((id) => id == null ? '' : String(id)));
}

function setSummonerSpells(spellSets) {
  selectedSummonerSpellSets = normalizeSummonerSpellSets(spellSets).map((spellSet) =>
    Array.from({ length: 2 }, (_, index) => {
      const id = spellSet[index] || '';
      return summonerSpellById.has(String(id)) ? String(id) : '';
    })
  );
  if (!selectedSummonerSpellSets.length) selectedSummonerSpellSets = [Array(2).fill('')];
  renderSummonerSpellEditor();
}

function collectSummonerSpells() {
  return selectedSummonerSpellSets
    .map((spellSet) => spellSet.filter(Boolean).map(Number))
    .filter((spellSet) => spellSet.length);
}

function emptyBuildSelection() {
  return {
    start: [],
    early: [],
    core: [],
    options: [{ note: '', items: [] }, { note: '', items: [] }, { note: '', items: [] }]
  };
}

function normalizeBuildSelection(build) {
  if (Array.isArray(build)) {
    return { ...emptyBuildSelection(), core: build.map(String) };
  }
  if (!build || typeof build !== 'object') return emptyBuildSelection();
  return {
    start: Array.isArray(build.start) ? build.start.map(String) : [],
    early: Array.isArray(build.early) ? build.early.map(String) : [],
    core: Array.isArray(build.core) ? build.core.map(String) : [],
    options: Array.from({ length: 3 }, (_, index) => {
      const option = build.options && build.options[index];
      if (Array.isArray(option)) return { note: '', items: option.map(String) };
      return {
        note: option && typeof option.note === 'string' ? option.note : '',
        items: option && Array.isArray(option.items) ? option.items.map(String) : []
      };
    })
  };
}

function buildGroupItems(groupId, build) {
  const selection = build || selectedBuild;
  if (groupId === 'start' || groupId === 'early') return selection[groupId];
  if (groupId === 'core') return selection.core;
  const optionIndex = Number(groupId.replace('option', '')) - 1;
  return selection.options[optionIndex]?.items || [];
}

function buildGroupLabel(groupId) {
  if (groupId === 'start') return 'スタートアイテム';
  if (groupId === 'early') return '序盤アイテム';
  return groupId === 'core' ? 'コアアイテム' : `オプション${groupId.replace('option', '')}`;
}

function buildItemIds(build) {
  const selection = normalizeBuildSelection(build);
  return [...selection.start, ...selection.early, ...selection.core, ...selection.options.flatMap((option) => option.items)];
}

function hasBuildItems(build) {
  return buildItemIds(build).length > 0;
}

function renderBuildGroupPicker() {
  const groups = [
    { id: 'start', label: 'スタートアイテム', count: selectedBuild.start.length },
    { id: 'early', label: '序盤アイテム', count: selectedBuild.early.length },
    { id: 'core', label: 'コアアイテム', count: selectedBuild.core.length },
    ...selectedBuild.options.map((option, index) => ({
      id: `option${index + 1}`,
      label: `オプション${index + 1}`,
      count: option.items.length
    }))
  ];
  document.querySelector('#build-group-picker').innerHTML = groups.map((group) => `
    <button class="build-group-button${group.id === activeBuildGroup ? ' is-selected' : ''}" type="button"
      data-build-group="${group.id}" aria-pressed="${group.id === activeBuildGroup}">
      ${group.label}<span>${group.count}</span>
    </button>
  `).join('');
}

function renderBuildItemGroup(groupId, items, emptySlots) {
  const itemCards = items.map((id) => {
    const item = itemById.get(String(id));
    return item
      ? `<button class="build-selected-item" type="button" data-remove-item-id="${escapeHtml(item.id)}"
          data-remove-build-group="${groupId}" aria-label="${escapeHtml(item.name)}を${buildGroupLabel(groupId)}から削除">
          <img src="${escapeHtml(itemImage(item))}" alt="" data-image-label="${escapeHtml(item.name)}">
          <span>${escapeHtml(item.name)}</span><b aria-hidden="true">×</b>
        </button>`
      : `<div class="build-empty-slot"><small>未取得: ${escapeHtml(id)}</small></div>`;
  }).join('');
  const placeholders = Array.from({ length: Math.max(0, emptySlots) }, (_, index) =>
    `<div class="build-empty-slot"><span>${items.length + index + 1}</span><small>アイテム</small></div>`
  ).join('');
  return `<section class="build-item-group">
    <h4>${escapeHtml(buildGroupLabel(groupId))}${groupId === 'core' ? ' · 必須' : ''}</h4>
    <div class="build-selected-row">${itemCards}${placeholders}</div>
  </section>`;
}

function renderSelectedBuild() {
  const container = document.querySelector('#build-selected');
  const activeItems = buildGroupItems(activeBuildGroup);
  if (activeBuildGroup === 'start' || activeBuildGroup === 'early' || activeBuildGroup === 'core') {
    container.innerHTML = renderBuildItemGroup(activeBuildGroup, activeItems, 6 - activeItems.length);
    document.querySelector('#item-result-count').textContent = `${buildGroupLabel(activeBuildGroup)} ${activeItems.length} / 6`;
    return;
  }
  const combinedCount = selectedBuild.core.length + activeItems.length;
  container.innerHTML = `
    ${renderBuildItemGroup('core', selectedBuild.core, 0)}
    ${renderBuildItemGroup(activeBuildGroup, activeItems, 6 - combinedCount)}
  `;
  document.querySelector('#item-result-count').textContent =
    `コア ${selectedBuild.core.length} + ${buildGroupLabel(activeBuildGroup)} ${activeItems.length} = ${combinedCount} / 6`;
}

function renderBuildOptionNote() {
  const field = document.querySelector('#build-option-note-field');
  const input = document.querySelector('#build-option-note');
  const isOption = activeBuildGroup.startsWith('option');
  field.hidden = !isOption;
  input.value = isOption ? selectedBuild.options[Number(activeBuildGroup.replace('option', '')) - 1].note : '';
}

function itemMatchesCategory(item, categoryId) {
  if (categoryId === 'all') return true;
  const category = ITEM_FILTERS.find((filter) => filter.id === categoryId);
  return Boolean(category && (item.tags || []).some((tag) => category.tags.includes(tag)));
}

function renderItemFilters() {
  document.querySelector('#item-category-filters').innerHTML = ITEM_FILTERS.map((filter) => `
    <button class="item-category-button${filter.id === itemCategoryFilter ? ' is-selected' : ''}" type="button"
      data-item-category="${filter.id}" aria-pressed="${filter.id === itemCategoryFilter}">
      ${escapeHtml(filter.label)}
    </button>
  `).join('');
}

function renderItemGallery() {
  const query = document.querySelector('#item-search').value.trim().toLocaleLowerCase('ja');
  const activeItems = buildGroupItems(activeBuildGroup);
  const filtered = items.filter((item) => itemMatchesCategory(item, itemCategoryFilter)
    && (!query || item.name.toLocaleLowerCase('ja').includes(query)
      || item.id.includes(query) || (item.tags || []).some((tag) => tag.toLocaleLowerCase('ja').includes(query))));
  const gallery = document.querySelector('#item-gallery');
  if (!filtered.length) {
    gallery.innerHTML = '<p class="selection-loading">該当するアイテムがありません。</p>';
    return;
  }
  gallery.innerHTML = filtered.map((item) => {
    const selected = activeItems.includes(item.id);
    const includedInCore = activeBuildGroup.startsWith('option') && selectedBuild.core.includes(item.id);
    return `
      <button class="item-card${selected ? ' is-selected' : ''}${includedInCore ? ' is-in-core' : ''}" type="button"
        data-item-id="${escapeHtml(item.id)}" aria-pressed="${selected}" ${includedInCore ? 'disabled' : ''}
        title="${escapeHtml(item.name)}${includedInCore ? ' · コアに含まれています' : item.gold?.total ? ` · ${item.gold.total}G` : ''}">
        <img src="${escapeHtml(itemImage(item))}" alt="" loading="lazy" data-image-label="${escapeHtml(item.name)}">
        <span>${escapeHtml(item.name)}</span>
      </button>
    `;
  }).join('');
}

function renderBuildEditor(build) {
  selectedBuild = normalizeBuildSelection(build);
  activeBuildGroup = 'start';
  renderBuildGroupPicker();
  renderBuildOptionNote();
  renderSelectedBuild();
  renderItemFilters();
  renderItemGallery();
}

function maximumBasicSkillRank(level) {
  return Math.min(5, Math.floor((level + 1) / 2));
}

function maximumUltimateSkillRank(level) {
  if (level >= 16) return 3;
  if (level >= 11) return 2;
  if (level >= 6) return 1;
  return 0;
}

function canAssignSkill(level, skill, previousSelections) {
  const currentRank = previousSelections.filter((selected) => selected === skill).length;
  const maximumRank = skill === 'R'
    ? maximumUltimateSkillRank(level)
    : maximumBasicSkillRank(level);
  return currentRank < maximumRank;
}

function renderSkillOrderEditor() {
  const container = document.querySelector('#skill-order-editor');
  if (fioraSpells.length !== 4) {
    container.innerHTML = '<p class="selection-loading">Fioraのスキル情報を読み込めません。</p>';
    return;
  }
  const levels = Array.from({ length: 18 }, (_, index) => index + 1);
  const headings = levels.map((level) => `<th scope="col">${level}</th>`).join('');
  const rows = SKILL_KEYS.map((key, skillIndex) => `
    <tr>
      <th scope="row" class="skill-icon-heading" title="${escapeHtml(fioraSpells[skillIndex].name)}">
        <img src="${escapeHtml(skillImage(fioraSpells[skillIndex]))}" alt="${key}" data-image-label="Fiora ${key}">
      </th>
      ${levels.map((level, index) => {
        const disabled = !canAssignSkill(level, key, skillOrderValues.slice(0, index));
        const selected = skillOrderValues[index] === key;
        return `<td><button class="skill-cell${selected ? ' is-selected' : ''}" type="button"
          data-skill-level="${level}" data-skill="${key}" aria-label="Lv${level} ${key}"
          aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>${selected ? level : ''}</button></td>`;
      }).join('')}
    </tr>
  `).join('');
  container.innerHTML = `
    <div class="skill-order-scroll">
      <table class="skill-order-grid">
        <thead><tr><th scope="col" aria-label="スキル"></th>${headings}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function setSkillOrder(order) {
  skillOrderValues = Array(18).fill('');
  if (Array.isArray(order)) {
    order.slice(0, 18).forEach((skill, index) => {
      skillOrderValues[index] = SKILL_KEYS.includes(skill) ? skill : '';
    });
  }
  renderSkillOrderEditor();
}

function hasAnyRuneSelection(runes) {
  return Boolean(runes && (
    runes.primaryStyleId || runes.secondaryStyleId
    || (Array.isArray(runes.primaryPerkIds) && runes.primaryPerkIds.some(Boolean))
    || (Array.isArray(runes.secondaryPerkIds) && runes.secondaryPerkIds.some(Boolean))
    || (Array.isArray(runes.shardIds) && runes.shardIds.some(Boolean))
  ));
}

function hasAnySummonerSpellSelection(spellIds) {
  return normalizeSummonerSpellSets(spellIds).some((spellSet) => spellSet.some(Boolean));
}

function collectRuneSelection() {
  return {
    primaryStyleId: Number(primaryStyleId) || '',
    primaryPerkIds: primaryPerkIds.map((id) => Number(id) || ''),
    secondaryStyleId: Number(secondaryStyleId) || '',
    secondaryPerkIds: secondaryTierPerkIds.filter(Boolean).map((id) => Number(id)),
    shardIds: selectedShardIds.map((id) => Number(id) || '')
  };
}

function collectSkillOrder() {
  return skillOrderValues.some(Boolean) ? [...skillOrderValues] : null;
}

function collectBuild() {
  return {
    start: [...selectedBuild.start],
    early: [...selectedBuild.early],
    core: [...selectedBuild.core],
    options: selectedBuild.options.map((option) => ({
      note: option.note.trim(),
      items: [...option.items]
    }))
  };
}

function runeChoiceMarkup(rune, label) {
  if (!rune) return '';
  return `
    <span class="guide-icon-choice">
      <img src="${escapeHtml(runeImage(rune))}" alt="" data-image-label="${escapeHtml(rune.name)}">
      <span>${escapeHtml(label || rune.name)}</span>
    </span>
  `;
}

function renderRuneGuide(runes) {
  if (typeof runes === 'string') {
    return `<article class="guide-card"><h4>ルーン・シャード</h4><p>${escapeHtml(runes)}</p></article>`;
  }
  if (!runes || typeof runes !== 'object') return '';
  const primaryStyle = runeStyles.find((style) => style.id === Number(runes.primaryStyleId));
  const secondaryStyle = runeStyles.find((style) => style.id === Number(runes.secondaryStyleId));
  const primary = Array.isArray(runes.primaryPerkIds) ? runes.primaryPerkIds : [];
  const secondary = Array.isArray(runes.secondaryPerkIds) ? runes.secondaryPerkIds : [];
  const shards = Array.isArray(runes.shardIds) ? runes.shardIds : [];
  const primaryMarkup = primary.map((id) => runeChoiceMarkup(runeById.get(String(id)))).join('');
  const secondaryMarkup = secondary.map((id) => runeChoiceMarkup(runeById.get(String(id)))).join('');
  const shardMarkup = shards.map((id, index) => {
    const shard = SHARD_ROWS[index]?.choices.find((choice) => choice.id === Number(id));
    if (!shard) return '';
    return `
      <span class="guide-icon-choice">
        <img src="${escapeHtml(shardImage(shard))}" alt="" data-image-label="${escapeHtml(shard.name)}">
        <span>${escapeHtml(shard.name)}</span>
      </span>
    `;
  }).join('');
  return `
    <article class="guide-card structured-guide-card">
      <h4>ルーン・シャード</h4>
      <div class="guide-rune-groups">
        ${primaryMarkup ? `<div><strong>メイン · ${escapeHtml(primaryStyle ? primaryStyle.name : '')}</strong><div class="guide-icon-list">${primaryMarkup}</div></div>` : ''}
        ${secondaryMarkup ? `<div><strong>サブ · ${escapeHtml(secondaryStyle ? secondaryStyle.name : '')}</strong><div class="guide-icon-list">${secondaryMarkup}</div></div>` : ''}
        ${shardMarkup ? `<div><strong>シャード</strong><div class="guide-icon-list">${shardMarkup}</div></div>` : ''}
      </div>
    </article>
  `;
}

function renderSummonerSpellGuide(spellIds) {
  const spellSets = normalizeSummonerSpellSets(spellIds)
    .map((spellSet) => spellSet.map((id) => summonerSpellById.get(String(id))).filter(Boolean))
    .filter((spellSet) => spellSet.length);
  if (!spellSets.length) return '';
  const patterns = spellSets.map((spellSet, patternIndex) => {
    const choices = spellSet.map((spell) => `
        <span class="guide-icon-choice">
          <img src="${escapeHtml(summonerSpellImage(spell))}" alt="" data-image-label="${escapeHtml(spell.name)}">
          <span>${escapeHtml(spell.name)}</span>
        </span>
      `).join('');
    return `${patternIndex ? '<div class="guide-summoner-spell-or">OR</div>' : ''}
      <div class="guide-icon-list">${choices}</div>`;
  }).join('');
  return `<article class="guide-card"><h4>サモナースペル</h4><div class="guide-summoner-spell-patterns">${patterns}</div></article>`;
}

function renderSkillGuide(skillOrder) {
  if (typeof skillOrder === 'string') {
    return `<article class="guide-card"><h4>スキルオーダー</h4><p>${escapeHtml(skillOrder)}</p></article>`;
  }
  if (!Array.isArray(skillOrder) || !skillOrder.length) return '';
  const rows = SKILL_KEYS.map((key, skillIndex) => {
    const spell = fioraSpells[skillIndex];
    const cells = Array.from({ length: 18 }, (_, index) => {
      const selected = skillOrder[index] === key;
      return `<td><span class="guide-skill-cell${selected ? ' is-selected' : ''}"
        aria-label="Lv${index + 1} ${key}" title="Lv${index + 1} ${key}">${selected ? index + 1 : ''}</span></td>`;
    }).join('');
    return `<tr>
      <th scope="row" class="guide-skill-icon-heading" title="${escapeHtml(spell ? spell.name : key)}">
        ${spell ? `<img src="${escapeHtml(skillImage(spell))}" alt="${key}" data-image-label="Fiora ${key}">` : escapeHtml(key)}
      </th>${cells}
    </tr>`;
  }).join('');
  return `<article class="guide-card structured-guide-card">
    <h4>スキルオーダー · Fiora</h4>
    <div class="guide-skill-order-scroll">
      <table class="guide-skill-order-grid" aria-label="Fioraのレベル別スキルオーダー"><tbody>${rows}</tbody></table>
    </div>
  </article>`;
}

function renderBuildGuide(build) {
  if (typeof build === 'string') {
    return `<article class="guide-card"><h4>ビルド</h4><p>${escapeHtml(build)}</p></article>`;
  }
  const selection = normalizeBuildSelection(build);
  if (!hasBuildItems(selection)) return '';
  const renderGroup = (label, ids, note) => {
    if (!ids.length && !note) return '';
    const icons = ids.map((id) => {
      const item = itemById.get(String(id));
      return item ? `
        <span class="guide-icon-choice">
          <img src="${escapeHtml(itemImage(item))}" alt="" data-image-label="${escapeHtml(item.name)}">
          <span>${escapeHtml(item.name)}</span>
        </span>
      ` : `<span class="guide-missing-item">アイテム ${escapeHtml(id)} (未取得)</span>`;
    }).join('');
    return `<div class="guide-build-group"><strong>${escapeHtml(label)}</strong>
      ${note ? `<p class="build-option-note">${escapeHtml(note)}</p>` : ''}
      <div class="guide-icon-list">${icons}</div></div>`;
  };
  const options = selection.options.map((option, index) =>
    renderGroup(`オプション${index + 1}`, option.items, option.note.trim())
  ).join('');
  return `<article class="guide-card structured-guide-card"><h4>ビルド</h4>
    ${renderGroup('スタートアイテム', selection.start)}
    ${renderGroup('序盤アイテム', selection.early)}
    ${renderGroup('コアアイテム · 必須', selection.core)}${options}</article>`;
}

function renderPlaystyleGuide(guide) {
  if (!guide) return '';
  const macro = typeof guide.macroPlan === 'string' ? guide.macroPlan.trim() : '';
  const lanePlan = typeof guide.lanePlan === 'string' ? guide.lanePlan.trim() : '';
  const levels = [
    ['Lv1', guide.micro1],
    ['Lv2', guide.micro2],
    ['Lv3〜5', guide.micro3to5],
    ['Lv6', guide.micro6]
  ].filter(([, value]) => typeof value === 'string' && value.trim());
  if (!macro && !lanePlan && !levels.length) return '';
  const paragraph = (label, text) => `
    <section class="playstyle-entry">
      <h5>${escapeHtml(label)}</h5>
      <p>${escapeHtml(text)}</p>
    </section>
  `;
  return `
    <article class="guide-card playstyle-guide-card">
      <h4>立ち回り</h4>
      ${macro ? paragraph('マクロ', macro) : ''}
      ${lanePlan || levels.length ? `<section class="playstyle-micro">
        <h5>ミクロ</h5>
        ${lanePlan ? paragraph('レーン戦', lanePlan) : ''}
        ${levels.length ? `<div class="playstyle-guide-levels">${levels.map(([label, text]) => paragraph(label, text)).join('')}</div>` : ''}
      </section>` : ''}
    </article>
  `;
}

function renderGuide(guide) {
  if (!guide) {
    return '<div class="guide-empty"><strong>個別の対策はまだありません</strong></div>';
  }

  const skill = renderSkillGuide(guide.skillOrder);
  const leftColumn = [
    renderSummonerSpellGuide(guide.summonerSpells),
    renderRuneGuide(guide.runes),
    renderBuildGuide(guide.build)
  ].filter(Boolean);
  const playstyle = renderPlaystyleGuide(guide);
  if (!skill && !leftColumn.length && !playstyle) {
    return '<div class="guide-empty"><strong>個別の対策はまだありません</strong></div>';
  }

  return `<div class="guide-sections">
    ${skill ? `<div class="guide-skill-row">${skill}</div>` : ''}
    ${leftColumn.length || playstyle
      ? `<div class="guide-left-column">${leftColumn.join('')}</div><div class="guide-right-column">${playstyle || ''}</div>`
      : ''}
  </div>`;
}

function renderDetail(champion) {
  if (!champion) {
    detail.innerHTML = '<div class="empty-state"><span class="empty-sigil" aria-hidden="true">✳</span><h3>対面を選んでください</h3><p>チャンピオンまたは登録済みの汎用対面を選ぶと、対策が表示されます。</p></div>';
    return;
  }

  const guide = matchups[champion.id];
  const matchupRatings = renderMatchupRatings(guide);

  detail.innerHTML = `
    <div class="detail-header">
      <img class="detail-portrait" src="${escapeHtml(championImage(champion))}" alt="${escapeHtml(champion.name)}" data-image-label="${escapeHtml(champion.name)}">
      <div>
        <div class="detail-heading-row">
          <h3 class="detail-name">${escapeHtml(champion.name)}</h3>
          ${matchupRatings}
        </div>
        <p class="detail-title">${escapeHtml(champion.title)}</p>
      </div>
      ${form ? '<button class="edit-matchup" type="button">この対面を編集</button>' : ''}
    </div>
    <div class="guide-content">
      ${renderGuide(guide)}
      ${guide && guide.updatedAt ? `<p class="updated-line">${formatUpdatedAt(guide)}</p>` : ''}
    </div>
  `;
}

function renderMatchupRatings(guide) {
  if (!guide || typeof guide !== 'object') return '';
  const ratings = [
    ['マッチアップ', guide.matchupRating],
    ['レーン', guide.laneRating]
  ].filter(([, value]) => MATCHUP_RATING_OPTIONS.includes(value));
  if (!ratings.length) return '';
  return `<div class="matchup-ratings">${ratings.map(([label, value]) => `
    <span><span class="matchup-rating-label">${label}：</span><strong>${value}</strong></span>
  `).join('')}</div>`;
}

function renderGenericDetail(category) {
  const guide = category.guide;
  const guideContent = guide
    ? `${renderGuide(guide)}<p class="updated-line">${formatUpdatedAt(guide)}</p>`
    : '<div class="guide-empty"><strong>汎用対策がありません</strong></div>';
  const categoryLabels = category.categoryIds
    .map((id) => categories.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => `<span class="category-tag">${escapeHtml(item.label)}</span>`)
    .join('');
  detail.innerHTML = `
    <div class="detail-header generic-detail-header">
      <span class="generic-detail-mark" aria-hidden="true">汎</span>
      <div>
        <p class="generic-detail-label">汎用対面</p>
        <h3 class="detail-name">${escapeHtml(category.name)}</h3>
        <div class="category-tags">${categoryLabels}</div>
      </div>
    </div>
    <div class="guide-content">${guideContent}</div>
  `;
}

function setSelectedChampion(id, focusDetail) {
  const champion = champions.find((item) => item.id === id);
  if (!champion) return;
  selectedChampionId = id;
  selectedCategoryId = '';
  renderChampionList();
  renderDetail(champion);
  if (focusDetail) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setSelectedCategory(id) {
  const category = registeredGenericChampions().find((item) => item.id === id);
  if (!category) return;
  selectedChampionId = '';
  selectedCategoryId = id;
  renderChampionList();
  renderGenericDetail(category);
}

function renderCategoryOptions() {
  if (categoryCheckboxes) {
    categoryCheckboxes.innerHTML = categories.length
      ? categories.map((category) => `
        <label class="category-checkbox">
          <input type="checkbox" name="genericCategory" value="${escapeHtml(category.id)}">
          <span>${escapeHtml(category.label)}</span>
        </label>
      `).join('')
      : '<span class="category-loading">カテゴリを読み込めません。</span>';
  }
  updateGenericNamePreview([]);
}

function updateEditorMode() {
  if (!form) return;
  const isMatchup = editorMode.value === 'matchup';
  championField.hidden = !isMatchup;
  categoryField.hidden = isMatchup;
  document.querySelector('#matchup-rating-fields').hidden = !isMatchup;
  championSelect.required = isMatchup;
}

function setFormValues(guide, mode, targetId, selectedGenericCategories) {
  const selectedMode = mode || editorMode.value;
  editorMode.value = selectedMode;
  updateEditorMode();
  for (const [key] of FIELDS) {
    const field = form.elements.namedItem(key);
    field.value = guide && typeof guide[key] === 'string' ? guide[key] : '';
  }
  form.elements.namedItem('matchupRating').value =
    guide && MATCHUP_RATING_OPTIONS.includes(guide.matchupRating) ? guide.matchupRating : '';
  form.elements.namedItem('laneRating').value =
    guide && MATCHUP_RATING_OPTIONS.includes(guide.laneRating) ? guide.laneRating : '';
  const genericCategoryIds = selectedMode === 'category'
    ? selectedGenericCategories || genericCategoryIdsFromGuide(guide, targetId)
    : [];
  for (const input of categoryCheckboxes.querySelectorAll('input[name="genericCategory"]')) {
    input.checked = genericCategoryIds.includes(input.value);
  }
  updateGenericNamePreview(genericCategoryIds);
  renderRuneEditor(guide && typeof guide.runes === 'object' ? guide.runes : null);
  setSummonerSpells(guide && guide.summonerSpells);
  setSkillOrder(guide && Array.isArray(guide.skillOrder) ? guide.skillOrder : null);
  renderBuildEditor(guide ? guide.build : null);
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
  const assignedCategories = isMatchup ? [] : selectedGenericCategoryIds();
  const genericId = isMatchup ? '' : genericCategoryId(assignedCategories);
  const guide = {
    mode: editorMode.value,
    targetId: champion ? champion.id : genericId,
    targetName: champion ? champion.name : genericCategoryName(assignedCategories),
    updatedAt: document.querySelector('#form-updated').value.trim(),
    patch: document.querySelector('#form-patch').value.trim()
  };
  for (const [key] of FIELDS) guide[key] = form.elements.namedItem(key).value.trim();
  if (isMatchup) {
    guide.matchupRating = form.elements.namedItem('matchupRating').value;
    guide.laneRating = form.elements.namedItem('laneRating').value;
  } else {
    guide.categories = assignedCategories;
  }
  guide.runes = collectRuneSelection();
  guide.summonerSpells = collectSummonerSpells();
  guide.skillOrder = collectSkillOrder();
  guide.build = collectBuild();
  return guide;
}

function validateGuide(guide) {
  const errors = [];
  if (!guide.targetId) errors.push(guide.mode === 'matchup' ? '対面チャンピオンを選択してください。' : '汎用対面カテゴリを1つ以上選択してください。');
  if (!guide.updatedAt || !/^\d{4}-\d{2}-\d{2}$/.test(guide.updatedAt)) errors.push('有効な更新日を入力してください。');
  if (!guide.patch) errors.push('更新時のパッチを入力してください。');
  const buildItems = buildItemIds(guide.build);
  if (!FIELDS.some(([key]) => guide[key]) && !hasAnyRuneSelection(guide.runes) && !guide.skillOrder && !buildItems.length
      && !hasAnySummonerSpellSelection(guide.summonerSpells)
      && !(guide.mode === 'matchup' && (guide.matchupRating || guide.laneRating))
      ) {
    errors.push('対策情報を1つ以上入力してください。');
  }
  for (const [label, value] of [
    ['マッチアップ', guide.matchupRating],
    ['レーン', guide.laneRating]
  ]) {
    if (value && !MATCHUP_RATING_OPTIONS.includes(value)) errors.push(`${label}評価が正しくありません。`);
  }
  const spellSets = normalizeSummonerSpellSets(guide.summonerSpells).filter((spellSet) => spellSet.some(Boolean));
  if (spellSets.some((spellSet) => spellSet.length !== 2
      || new Set(spellSet).size !== 2
      || spellSet.some((id) => !summonerSpellById.has(String(id))))) {
    errors.push('サモナースペルは異なる2つを選択してください。');
  }
  if (hasAnyRuneSelection(guide.runes)) {
    const primaryStyle = runeStyles.find((style) => style.id === Number(guide.runes.primaryStyleId));
    const secondaryStyle = runeStyles.find((style) => style.id === Number(guide.runes.secondaryStyleId));
    const primaryIsComplete = primaryStyle && guide.runes.primaryPerkIds.length === primaryStyle.slots.length
      && guide.runes.primaryPerkIds.every((id, index) => primaryStyle.slots[index].runes.some((rune) => rune.id === Number(id)));
    const secondarySlots = secondaryStyle ? secondaryStyle.slots.slice(1) : [];
    const secondaryIsComplete = secondaryStyle && guide.runes.secondaryPerkIds.length === 2
      && guide.runes.secondaryPerkIds.every((id) => secondarySlots.some((slot) => slot.runes.some((rune) => rune.id === Number(id))))
      && new Set(guide.runes.secondaryPerkIds.map((id) =>
        secondarySlots.findIndex((slot) => slot.runes.some((rune) => rune.id === Number(id)))
      )).size === 2;
    if (!primaryIsComplete || !secondaryIsComplete || !primaryStyle || !secondaryStyle
        || primaryStyle.id === secondaryStyle.id || guide.runes.shardIds.length !== 3
        || guide.runes.shardIds.some((id, index) => !SHARD_ROWS[index].choices.some((shard) => shard.id === Number(id)))) {
      errors.push('ルーンはメイン4つ、異なる段からサブ2つ、各段のシャード1つを選択してください。');
    }
  }
  if (guide.skillOrder) {
    if (guide.skillOrder.length !== 18 || guide.skillOrder.some((skill) => !SKILL_KEYS.includes(skill))) {
      errors.push('スキルオーダーはLv1〜Lv18をすべて選択してください。');
    } else {
      const invalidLevel = guide.skillOrder.findIndex((skill, index) =>
        !canAssignSkill(index + 1, skill, guide.skillOrder.slice(0, index))
      );
      if (invalidLevel >= 0) errors.push(`Lv${invalidLevel + 1}のスキルは、そのレベルでの習得上限を超えています。`);
    }
  }
  const build = normalizeBuildSelection(guide.build);
  const hasSelectedBuild = hasBuildItems(build);
  if (hasSelectedBuild && !build.core.length) errors.push('コアアイテムを1つ以上選択してください。');
  if (build.start.length > 6) errors.push('スタートアイテムは6個まで選択できます。');
  if (build.early.length > 6) errors.push('序盤アイテムは6個まで選択できます。');
  if (build.core.length > 6) errors.push('コアは6アイテムまで選択できます。');
  for (let index = 0; index < build.options.length; index += 1) {
    const combined = [...build.core, ...build.options[index].items];
    if (combined.length > 6) errors.push(`コアとオプション${index + 1}の合計は6アイテムまでです。`);
    if (new Set(combined).size !== combined.length) errors.push(`コアとオプション${index + 1}に同じアイテムを重複して登録できません。`);
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
  if (hasAnyRuneSelection(guide.runes)) content.runes = guide.runes;
  if (hasAnySummonerSpellSelection(guide.summonerSpells)) content.summonerSpells = guide.summonerSpells;
  if (guide.skillOrder) content.skillOrder = guide.skillOrder;
  if (MATCHUP_RATING_OPTIONS.includes(guide.matchupRating)) content.matchupRating = guide.matchupRating;
  if (MATCHUP_RATING_OPTIONS.includes(guide.laneRating)) content.laneRating = guide.laneRating;
  if (guide.mode === 'category' && guide.categories.length) content.categories = guide.categories;
  if (hasBuildItems(guide.build)) content.build = normalizeBuildSelection(guide.build);
  return {
    [guide.targetId]: content
  };
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function runeAssetsForGuide(guide, addAsset) {
  if (!guide.runes || typeof guide.runes !== 'object') return;
  for (const styleId of [guide.runes.primaryStyleId, guide.runes.secondaryStyleId]) {
    const style = runeStyles.find((item) => item.id === Number(styleId));
    if (style) addAsset(runeImage(style), style.name);
  }
  for (const id of [...(guide.runes.primaryPerkIds || []), ...(guide.runes.secondaryPerkIds || [])]) {
    const rune = runeById.get(String(id));
    if (rune) addAsset(runeImage(rune), rune.name);
  }
  (guide.runes.shardIds || []).forEach((id, index) => {
    const shard = SHARD_ROWS[index]?.choices.find((item) => item.id === Number(id));
    if (shard) addAsset(shardImage(shard), shard.name);
  });
}

function offlineImage(url, label, assets, className) {
  const asset = assets.get(url);
  if (!asset) throw new Error(`${label}の画像データを作成できませんでした。`);
  return `<img class="${className || ''}" src="${escapeHtml(asset.dataUri)}" alt="${escapeHtml(label)}">`;
}

function renderOfflineGuide(guide, assets) {
  const opponent = guide.mode === 'matchup' ? champions.find((item) => item.id === guide.targetId) : null;
  const title = opponent ? opponent.name : guide.targetName;
  const championCard = opponent
    ? offlineImage(championImage(opponent), opponent.name, assets, 'portrait')
    : `<span class="generic-mark" aria-hidden="true">汎</span>`;
  const spellSets = normalizeSummonerSpellSets(guide.summonerSpells).filter((spellSet) => spellSet.some(Boolean));
  const summonerSpellMarkup = spellSets.length
    ? `<section><h2>サモナースペル</h2><div class="offline-summoner-spell-patterns">
      ${spellSets.map((spellSet, patternIndex) => `
        ${patternIndex ? '<div class="offline-summoner-spell-or">OR</div>' : ''}
        <div class="icon-list">${spellSet.map((id) => {
          const spell = summonerSpellById.get(String(id));
          return spell ? `<figure>${offlineImage(summonerSpellImage(spell), spell.name, assets)}<figcaption>${escapeHtml(spell.name)}</figcaption></figure>` : '';
        }).join('')}</div>
      `).join('')}
    </div></section>`
    : '';
  const runeMarkup = guide.runes && typeof guide.runes === 'object'
    ? `<section><h2>ルーン・シャード</h2>
        <div class="rune-path">${runeChoiceMarkupOffline(guide.runes.primaryStyleId, guide.runes.primaryPerkIds, assets, true)}</div>
        <div class="rune-path">${runeChoiceMarkupOffline(guide.runes.secondaryStyleId, guide.runes.secondaryPerkIds, assets, true)}</div>
        <div class="icon-list">${(guide.runes.shardIds || []).map((id, index) => {
          const shard = SHARD_ROWS[index]?.choices.find((item) => item.id === Number(id));
          return shard ? `<figure>${offlineImage(shardImage(shard), shard.name, assets)}<figcaption>${escapeHtml(shard.name)}</figcaption></figure>` : '';
        }).join('')}</div>
      </section>`
    : '';
  const skillMarkup = guide.skillOrder
    ? `<section class="skill-order-card"><h2>スキルオーダー</h2><div class="skill-order-scroll"><table class="skill-order-table"><tbody>
      ${SKILL_KEYS.map((key, skillIndex) => `<tr>
        <th class="skill-order-icon" scope="row">${offlineImage(skillImage(fioraSpells[skillIndex]), key, assets)}</th>
        ${Array.from({ length: 18 }, (_, index) => {
          const selected = guide.skillOrder[index] === key;
          return `<td><span class="skill-order-cell${selected ? ' is-selected' : ''}">${selected ? index + 1 : ''}</span></td>`;
        }).join('')}
      </tr>`).join('')}
    </tbody></table></div></section>`
    : '';
  const buildSelection = normalizeBuildSelection(guide.build);
  const offlineBuildGroup = (label, ids, note) => ids.length || note
    ? `<div class="build-group"><h3>${escapeHtml(label)}</h3>${note ? `<p>${escapeHtml(note)}</p>` : ''}
      <div class="icon-list">${ids.map((id) => {
      const item = itemById.get(String(id));
      return item ? `<figure>${offlineImage(itemImage(item), item.name, assets)}<figcaption>${escapeHtml(item.name)}</figcaption></figure>` : '';
    }).join('')}</div></div>`
    : '';
  const buildStart = offlineBuildGroup('スタートアイテム', buildSelection.start);
  const buildEarly = offlineBuildGroup('序盤アイテム', buildSelection.early);
  const buildOptions = buildSelection.options
    .map((option, index) => offlineBuildGroup(`オプション${index + 1}`, option.items, option.note.trim())).join('');
  const buildMarkup = hasBuildItems(buildSelection)
    ? `<section><h2>ビルド</h2>${buildStart}${buildEarly}${offlineBuildGroup('コアアイテム · 必須', buildSelection.core)}${buildOptions}</section>`
    : '';
  const playstyleMarkup = renderPlaystyleGuide(guide);
  const updatedAt = `更新 ${escapeHtml(guide.updatedAt)} · Patch ${escapeHtml(guide.patch)}`;
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} 対策 · Fiora Counter Guide</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#111714;color:#e5eee8;font:15px/1.6 "Segoe UI","Yu Gothic UI",Meiryo,sans-serif}
main{max-width:1100px;margin:auto}header{display:flex;align-items:center;gap:14px;padding-bottom:18px;border-bottom:1px solid #2a3730}
h1{margin:0;font-size:24px}small{color:#8d9c93}section{margin-top:20px;padding:14px;border:1px solid #2a3730;background:#171f1b}
.portrait,.generic-mark{width:64px;height:64px;flex:0 0 64px;border:1px solid #526448;object-fit:cover}.generic-mark{display:grid;place-items:center;color:#c9ee87;font-size:24px}
.header-copy{min-width:0}.header-copy p{margin:2px 0 0;color:#8d9c93;font-size:11px}.header-copy .brand-label{margin:0 0 2px;font:9px/1.4 monospace;letter-spacing:.08em}
.matchup-ratings{display:flex;flex-wrap:wrap;gap:5px 12px;color:#c1ccc4;font-size:10px}.header-copy .matchup-ratings{margin-top:4px}.matchup-rating-label{color:#8d9c93}.matchup-ratings strong{color:#d1ddd4;font-weight:600}
.guide-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);align-items:stretch;gap:10px;margin-top:14px}
.guide-layout>.skill-order-card{grid-column:1/-1;margin-top:0}.guide-left-column,.guide-right-column{min-width:0;display:flex;flex-direction:column;gap:10px}.guide-left-column>:last-child,.guide-right-column>:last-child{flex-grow:1}.guide-layout section{margin-top:0}
h2{margin:0 0 12px;color:#c9ee87;font-size:16px}p{white-space:pre-wrap;margin:0}
.build-group{margin-top:14px}.build-group h3{margin:0 0 7px;color:#aab8ad;font-size:13px;font-weight:500}
.build-group+.build-group{padding-top:10px;border-top:1px solid #2a3730}
.playstyle-guide-card>.playstyle-entry,.playstyle-guide-card>.playstyle-micro{margin:12px 0 0;padding:0 0 0 12px;border:0;border-left:1px solid #2a3730;background:none}
.playstyle-micro>.playstyle-entry{margin:8px 0 0 10px;padding:0 0 0 10px;border:0;border-left:1px solid #2a3730;background:none}
.playstyle-entry h5,.playstyle-micro h5{margin:0 0 5px;color:#c9ee87;font-size:12px;font-weight:500}
.playstyle-entry p{white-space:pre-wrap;margin:0}.playstyle-guide-levels .playstyle-entry{margin:8px 0 0 10px;padding:0 0 0 10px;border:0;border-left:1px solid #2a3730;background:none}
.playstyle-guide-card{margin:0;padding:18px;border:1px solid #2a3730;background:#171f1b}
.playstyle-guide-card>h4{margin:0 0 12px;color:#c9ee87;font-size:16px}
.portrait{width:64px;height:64px;object-fit:cover}.icon-list,.rune-path{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start;gap:10px;margin:10px 0}
.offline-summoner-spell-patterns{display:flex;align-items:center;gap:8px}.offline-summoner-spell-patterns .icon-list{display:flex;flex:1;gap:4px;margin:0}.offline-summoner-spell-patterns figure{min-width:0;flex:1;gap:4px;padding:2px;border:0}.offline-summoner-spell-patterns figure img{width:28px;height:28px;flex:0 0 28px}.offline-summoner-spell-patterns figcaption{font-size:8px;overflow-wrap:anywhere}.offline-summoner-spell-or{flex:0 0 auto;color:#c9ee87;font-weight:700}
figure{display:flex;align-items:center;gap:8px;margin:0;padding:7px;border:1px solid #2a3730}
figure img,.guide-icon{width:40px;height:40px;object-fit:cover}figcaption{font-size:12px}
.skill-order-scroll{overflow-x:auto}.skill-order-table{width:100%;min-width:620px;border-collapse:separate;border-spacing:2px;table-layout:fixed}
.skill-order-icon{width:24px;padding:0}.skill-order-icon img{width:20px;height:20px;object-fit:cover}
.skill-order-table td{height:20px;padding:0;background:#131820;border:1px solid #252b34}
.skill-order-cell{display:grid;height:100%;place-items:center;color:#e5eee8;font-size:10px}
.skill-order-cell.is-selected{background:#1769ed;color:white;font-weight:700}
.updated{margin-left:auto;color:#8d9c93;font-size:10px;white-space:nowrap}@media(max-width:700px){body{padding:14px}.guide-layout{grid-template-columns:1fr}.guide-layout>.skill-order-card{grid-column:auto}.updated{white-space:normal}}
</style></head><body><main>
<header>${championCard}<div class="header-copy"><h1>${escapeHtml(title)}</h1>
  ${opponent ? `<p>${escapeHtml(opponent.title)}</p>` : '<p class="brand-label">汎用対面 · FIORA COUNTER GUIDE</p>'}
  ${renderMatchupRatings(guide)}</div><small class="updated">${updatedAt}</small></header>
<div class="guide-layout">${skillMarkup}
  <div class="guide-left-column">${summonerSpellMarkup}${runeMarkup}${buildMarkup}</div>
  <div class="guide-right-column">${playstyleMarkup}</div>
</div>
</main></body></html>`;
}

function runeChoiceMarkupOffline(styleId, runeIds, assets, includeStyle) {
  const style = runeStyles.find((item) => item.id === Number(styleId));
  const styleIcon = style ? `<figure>${offlineImage(runeImage(style), style.name, assets)}<figcaption>${escapeHtml(style.name)}</figcaption></figure>` : '';
  const runes = (runeIds || []).map((id) => {
    const rune = runeById.get(String(id));
    return rune ? `<figure>${offlineImage(runeImage(rune), rune.name, assets)}<figcaption>${escapeHtml(rune.name)}</figcaption></figure>` : '';
  }).join('');
  return `${includeStyle ? styleIcon : ''}${runes}`;
}

async function imageAsDataUri(url, label) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`${label}の画像取得に失敗しました: ${error.message}`);
  }
  if (!response.ok) throw new Error(`${label}の画像取得に失敗しました (HTTP ${response.status})`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error(`${label}の取得データが画像ではありません。`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`${label}の画像をBase64に変換できませんでした。`));
    reader.readAsDataURL(blob);
  });
}

async function downloadOfflineHtml() {
  const guide = collectGuide();
  if (!showValidation(validateGuide(guide))) return;
  if (!referenceDataLoaded || fioraSpells.length !== 4) {
    showValidation(['Data Dragonのルーン・アイテム・スキル情報を読み込めません。再読み込みして確認してください。']);
    return;
  }
  statusMessage.textContent = 'Data Dragonから画像を取得して、オフラインHTMLを作成しています…';
  statusMessage.className = 'form-status';
  try {
    const targetChampion = guide.mode === 'matchup'
      ? champions.find((item) => item.id === guide.targetId)
      : null;
    const requests = new Map();
    const addAsset = (url, label) => {
      if (url && !requests.has(url)) requests.set(url, label);
    };
    if (guide.mode === 'matchup' && !targetChampion) throw new Error('チャンピオン画像情報が見つかりません。');
    if (targetChampion) addAsset(championImage(targetChampion), targetChampion.name);
    fioraSpells.forEach((spell, index) => addAsset(skillImage(spell), `Fiora ${SKILL_KEYS[index]}`));
    normalizeSummonerSpellSets(guide.summonerSpells).flat().forEach((id) => {
      const spell = summonerSpellById.get(String(id));
      if (!spell) throw new Error(`サモナースペル ${id} の画像情報がありません。`);
      addAsset(summonerSpellImage(spell), spell.name);
    });
    runeAssetsForGuide(guide, addAsset);
    buildItemIds(guide.build).forEach((id) => {
      const item = itemById.get(String(id));
      if (!item) throw new Error(`アイテム ${id} の画像情報がありません。`);
      addAsset(itemImage(item), item.name);
    });
    const assets = new Map();
    await Promise.all(Array.from(requests.entries()).map(async ([url, label]) => {
      assets.set(url, { dataUri: await imageAsDataUri(url, label) });
    }));
    downloadTextFile(
      `${guide.mode === 'matchup' ? 'matchup' : 'category'}-${guide.targetId.toLowerCase()}-offline.html`,
      renderOfflineGuide(guide, assets),
      'text/html;charset=utf-8'
    );
    statusMessage.textContent = '画像をBase64で埋め込んだHTMLを書き出しました。ファイル単体でオフライン表示できます。';
    statusMessage.className = 'form-status is-success';
  } catch (error) {
    showValidation([`画像入りHTMLを書き出せませんでした: ${error.message}`]);
  }
}

function previewGuide() {
  const guide = collectGuide();
  if (!showValidation(validateGuide(guide))) return;
  previewJson.textContent = JSON.stringify(guideExport(guide), null, 2);
  previewJson.hidden = false;
  previewContent.innerHTML = renderGuide(guide);
  editorPreview.hidden = false;
  statusMessage.textContent = '入力内容を確認しました。プレビューを表示しています。';
  statusMessage.className = 'form-status is-success';
}

function downloadGuide() {
  const guide = collectGuide();
  if (!showValidation(validateGuide(guide))) return;
  const json = JSON.stringify(guideExport(guide), null, 2);
  downloadTextFile(
    `matchup-${guide.targetId.toLowerCase()}.json`,
    `${json}\n`,
    'application/json'
  );
  previewJson.textContent = json;
  previewJson.hidden = false;
  previewContent.innerHTML = renderGuide(guide);
  editorPreview.hidden = false;
  statusMessage.textContent = 'JSONを書き出しました。data/matchups.json に内容を反映してPRを作成してください。';
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
      tags: item.tags,
      image: item.image.full
    }));

    updateChampionCount();
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
    if (form || (guideDataLoaded && hasStructuredGuideData())) {
      loadReferenceData().catch(reportReferenceDataError);
    }
  } catch (error) {
    championCount.textContent = 'DATA UNAVAILABLE';
    championList.innerHTML = '<p class="no-results">チャンピオン一覧を読み込めません。</p>';
    loadError.hidden = false;
    loadError.textContent = `Data Dragon: ${error.message}。ネットワーク接続を確認して再読み込みしてください。`;
    if (championSelect) championSelect.innerHTML = '<option value="">読み込みに失敗しました</option>';
  }
}

function hasStructuredGuideData() {
  const guides = Object.values(matchups);
  return guides.some((guide) => guide && (
    (guide.runes && typeof guide.runes === 'object')
    || Array.isArray(guide.summonerSpells)
    || Array.isArray(guide.skillOrder)
    || Array.isArray(guide.build)
    || (guide.build && typeof guide.build === 'object')
  ));
}

function loadReferenceData() {
  if (referenceDataLoaded) return Promise.resolve();
  if (!referenceDataPromise) {
    referenceDataPromise = loadReferenceDataInternal().catch((error) => {
      referenceDataPromise = null;
      throw error;
    });
  }
  return referenceDataPromise;
}

async function loadReferenceDataInternal() {
  const base = `${DATA_DRAGON_ROOT}/cdn/${encodeURIComponent(patchVersion)}/data/ja_JP`;
  const [runesResponse, itemsResponse, fioraResponse, summonerSpellsResponse] = await Promise.all([
    fetch(`${base}/runesReforged.json`),
    fetch(`${base}/item.json`),
    fetch(`${base}/champion/${encodeURIComponent(FIORA_ID)}.json`),
    fetch(`${base}/summoner.json`)
  ]);
  for (const [label, response] of [
    ['ルーン', runesResponse],
    ['アイテム', itemsResponse],
    ['Fioraのスキル', fioraResponse],
    ['サモナースペル', summonerSpellsResponse]
  ]) {
    if (!response.ok) throw new Error(`${label}データの取得に失敗しました (HTTP ${response.status})`);
  }
  const [runesPayload, itemsPayload, fioraPayload, summonerSpellsPayload] = await Promise.all([
    runesResponse.json(),
    itemsResponse.json(),
    fioraResponse.json(),
    summonerSpellsResponse.json()
  ]);
  if (!Array.isArray(runesPayload) || !itemsPayload.data || !fioraPayload.data?.[FIORA_ID]
      || !summonerSpellsPayload.data) {
    throw new Error('Data Dragonのルーン・アイテム・スキルJSONの形式が正しくありません。');
  }
  runeStyles = runesPayload;
  runeById = new Map();
  for (const style of runeStyles) {
    style.slots.forEach((slot, slotIndex) => slot.runes.forEach((rune) => {
      runeById.set(String(rune.id), { ...rune, styleId: style.id, slotIndex });
    }));
  }
  summonerSpells = Object.values(summonerSpellsPayload.data)
    .filter((spell) => Array.isArray(spell.modes) && spell.modes.includes('CLASSIC') && spell.image?.full)
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  summonerSpellById = new Map(summonerSpells.map((spell) => [String(spell.key), spell]));
  const seenItemNames = new Set();
  items = Object.entries(itemsPayload.data)
    // Exclude the high-ID alternate-mode copies Data Dragon also marks as map 11.
    .filter(([id, item]) => Number(id) < 10000
      && item.maps?.['11'] === true && item.gold?.purchasable === true && item.image?.full)
    .map(([id, item]) => ({ ...item, id }))
    .sort((a, b) => Number(a.id) - Number(b.id))
    .filter((item) => {
      if (seenItemNames.has(item.name)) return false;
      seenItemNames.add(item.name);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  itemById = new Map(items.map((item) => [item.id, item]));
  fioraChampion = champions.find((item) => item.id === FIORA_ID);
  const fioraDetails = fioraPayload.data[FIORA_ID];
  if (!fioraChampion || !Array.isArray(fioraDetails.spells) || fioraDetails.spells.length !== 4) {
    throw new Error('Fioraのチャンピオンまたはスキル画像情報が見つかりません。');
  }
  fioraSpells = fioraDetails.spells;
  referenceDataLoaded = true;
  if (form) {
    renderRuneEditor(collectRuneSelection());
    renderSummonerSpellEditor();
    setSkillOrder(skillOrderValues);
    renderBuildEditor(selectedBuild);
    if (!userHasEditedForm) maybeInitializeEditor();
  }
  const selected = champions.find((champion) => champion.id === selectedChampionId);
  if (selected) renderDetail(selected);
  const selectedGeneric = registeredGenericChampions().find((profile) => profile.id === selectedCategoryId);
  if (selectedGeneric) renderGenericDetail(selectedGeneric);
}

function reportReferenceDataError(error) {
  loadError.hidden = false;
  const existing = loadError.textContent;
  loadError.textContent = `${existing ? `${existing} ` : ''}Data Dragonのルーン・アイテム・Fioraスキル・サモナースペル情報を読み込めません: ${error.message}`;
}

function maybeInitializeEditor() {
  if (!form || editorInitialized || userHasEditedForm || !guideDataLoaded || !referenceDataLoaded || !champions.length) return;
  const genericId = genericCategoryId(selectedGenericCategoryIds());
  const currentGuide = editorMode.value === 'matchup'
    ? matchups[championSelect.value]
    : matchups[genericId];
  setFormValues(currentGuide, editorMode.value);
  editorInitialized = true;
}

async function loadGuideData() {
  const [categoriesResponse, matchupsResponse] = await Promise.all([
    fetch('./data/categories.json', { cache: 'no-store' }),
    fetch('./data/matchups.json', { cache: 'no-store' })
  ]);
  for (const [name, response] of [
    ['categories.json', categoriesResponse],
    ['matchups.json', matchupsResponse]
  ]) {
    if (!response.ok) throw new Error(`${name} の読み込みに失敗しました (${response.status})`);
  }
  const [categoryData, matchupData] = await Promise.all([
    categoriesResponse.json(),
    matchupsResponse.json()
  ]);
  if (!categoryData || !Array.isArray(categoryData.categories) || !matchupData || Array.isArray(matchupData)) {
    throw new Error('ガイドデータのJSON形式が正しくありません。');
  }
  categories = categoryData.categories;
  matchups = matchupData;
  renderCategoryOptions();
  updateChampionCount();
  renderChampionList();
  guideDataLoaded = true;
  if (!form && hasStructuredGuideData()) {
    loadReferenceData().catch(reportReferenceDataError);
  }
  maybeInitializeEditor();
  const selected = champions.find((champion) => champion.id === selectedChampionId);
  if (selected) renderDetail(selected);
  const selectedGeneric = registeredGenericChampions().find((profile) => profile.id === selectedCategoryId);
  if (selectedGeneric) renderGenericDetail(selectedGeneric);
}

function reportGuideLoadError(error) {
  loadError.hidden = false;
  const existing = loadError.textContent;
  loadError.textContent = `${existing ? `${existing} ` : ''}ガイドデータ: ${error.message}。ローカルサーバーから開いてください。`;
  if (categoryCheckboxes) categoryCheckboxes.innerHTML = '<span class="category-loading">汎用対面カテゴリを読み込めません。</span>';
}

searchInput.addEventListener('input', renderChampionList);
championList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-champion-id]');
  if (button) {
    setSelectedChampion(button.dataset.championId, false);
    return;
  }
  const categoryButton = event.target.closest('[data-category-id]');
  if (categoryButton) setSelectedCategory(categoryButton.dataset.categoryId);
});
championList.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    const button = event.target.closest('[data-champion-id]');
    const categoryButton = event.target.closest('[data-category-id]');
    if (button) setSelectedChampion(button.dataset.championId, false);
    else if (categoryButton) setSelectedCategory(categoryButton.dataset.categoryId);
  }
});
if (form) {
  form.addEventListener('input', () => {
    userHasEditedForm = true;
  });
  form.addEventListener('change', () => {
    userHasEditedForm = true;
  });
  document.querySelector('#primary-style-picker').addEventListener('click', (event) => {
    const button = event.target.closest('[data-style-path="primary"]');
    if (!button || button.disabled) return;
    primaryStyleId = button.dataset.styleId;
    primaryPerkIds = Array(4).fill('');
    userHasEditedForm = true;
    renderStylePickers();
    renderPrimaryRuneSlots();
    renderRuneDescription(null);
  });
  document.querySelector('#secondary-style-picker').addEventListener('click', (event) => {
    const button = event.target.closest('[data-style-path="secondary"]');
    if (!button || button.disabled) return;
    secondaryStyleId = button.dataset.styleId;
    secondaryTierPerkIds = Array(3).fill('');
    userHasEditedForm = true;
    renderStylePickers();
    renderSecondaryRuneSlots();
    renderRuneDescription(null);
  });
  for (const containerId of ['primary-rune-slots', 'secondary-rune-slots']) {
    const container = document.querySelector(`#${containerId}`);
    const showDescription = (event) => {
      const button = event.target.closest('[data-rune-id]');
      if (button) renderRuneDescription(runeById.get(button.dataset.runeId));
    };
    container.addEventListener('pointerover', showDescription);
    container.addEventListener('focusin', showDescription);
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-rune-id]');
      if (!button || button.disabled) return;
      const slotIndex = Number(button.dataset.runeSlot);
      const runeId = button.dataset.runeId;
      if (button.dataset.runePath === 'primary') {
        primaryPerkIds[slotIndex] = primaryPerkIds[slotIndex] === runeId ? '' : runeId;
        renderPrimaryRuneSlots();
      } else {
        const selectedCount = secondaryTierPerkIds.filter(Boolean).length;
        if (!secondaryTierPerkIds[slotIndex] && selectedCount >= 2) {
          statusMessage.textContent = 'サブルーンは異なる2段から選択してください。';
          statusMessage.className = 'form-status is-error';
          return;
        }
        secondaryTierPerkIds[slotIndex] = secondaryTierPerkIds[slotIndex] === runeId ? '' : runeId;
        renderSecondaryRuneSlots();
      }
      userHasEditedForm = true;
      renderRuneDescription(runeById.get(runeId));
    });
  }
  document.querySelector('#shard-slots').addEventListener('click', (event) => {
    const button = event.target.closest('[data-shard-id]');
    if (!button) return;
    selectedShardIds[Number(button.dataset.shardSlot)] = button.dataset.shardId;
    userHasEditedForm = true;
    renderShardEditor();
  });
  summonerSpellPicker.addEventListener('click', (event) => {
    const addPatternButton = event.target.closest('[data-add-summoner-pattern]');
    if (addPatternButton) {
      selectedSummonerSpellSets.push(Array(2).fill(''));
      userHasEditedForm = true;
      renderSummonerSpellEditor();
      return;
    }
    const removePatternButton = event.target.closest('[data-remove-summoner-pattern]');
    if (removePatternButton) {
      selectedSummonerSpellSets.splice(Number(removePatternButton.dataset.removeSummonerPattern), 1);
      userHasEditedForm = true;
      renderSummonerSpellEditor();
      return;
    }
    const button = event.target.closest('[data-summoner-spell-id]');
    if (!button) return;
    const id = button.dataset.summonerSpellId;
    const spellSet = selectedSummonerSpellSets[Number(button.dataset.summonerSpellPattern)];
    if (!spellSet) return;
    const selectedIndex = spellSet.indexOf(id);
    if (selectedIndex >= 0) spellSet[selectedIndex] = '';
    else {
      const emptyIndex = spellSet.indexOf('');
      if (emptyIndex < 0) {
        statusMessage.textContent = '各パターンにサモナースペルは2つまで選択できます。';
        statusMessage.className = 'form-status is-error';
        return;
      }
      spellSet[emptyIndex] = id;
    }
    userHasEditedForm = true;
    renderSummonerSpellEditor();
  });
  document.querySelector('#item-category-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-item-category]');
    if (!button) return;
    itemCategoryFilter = button.dataset.itemCategory;
    renderItemFilters();
    renderItemGallery();
  });
  document.querySelector('#build-group-picker').addEventListener('click', (event) => {
    const button = event.target.closest('[data-build-group]');
    if (!button) return;
    activeBuildGroup = button.dataset.buildGroup;
    renderBuildGroupPicker();
    renderBuildOptionNote();
    renderSelectedBuild();
    renderItemGallery();
  });
  document.querySelector('#build-option-note').addEventListener('input', (event) => {
    if (!activeBuildGroup.startsWith('option')) return;
    const optionIndex = Number(activeBuildGroup.replace('option', '')) - 1;
    selectedBuild.options[optionIndex].note = event.target.value;
    userHasEditedForm = true;
  });
  document.querySelector('#item-search').addEventListener('input', renderItemGallery);
  document.querySelector('#item-gallery').addEventListener('click', (event) => {
    const button = event.target.closest('[data-item-id]');
    if (!button) return;
    const itemId = button.dataset.itemId;
    const activeItems = buildGroupItems(activeBuildGroup);
    if (activeItems.includes(itemId)) {
      activeItems.splice(activeItems.indexOf(itemId), 1);
    } else if (activeBuildGroup === 'start' || activeBuildGroup === 'early') {
      if (activeItems.length >= 6) {
        statusMessage.textContent = `${buildGroupLabel(activeBuildGroup)}は6アイテムまで選択できます。`;
        statusMessage.className = 'form-status is-error';
        return;
      }
      activeItems.push(itemId);
    } else if (activeBuildGroup === 'core') {
      if (selectedBuild.core.length >= 6) {
        statusMessage.textContent = 'コアは6アイテムまで選択できます。';
        statusMessage.className = 'form-status is-error';
        return;
      }
      if (selectedBuild.options.some((option) => option.items.includes(itemId))) {
        statusMessage.textContent = 'オプションに登録済みのアイテムはコアに重複して追加できません。';
        statusMessage.className = 'form-status is-error';
        return;
      }
      const overflowingOption = selectedBuild.options.findIndex((option) =>
        selectedBuild.core.length + 1 + option.items.length > 6
      );
      if (overflowingOption >= 0) {
        statusMessage.textContent = `コアを追加するとオプション${overflowingOption + 1}が6アイテムを超えます。先にそのオプションを調整してください。`;
        statusMessage.className = 'form-status is-error';
        return;
      }
      selectedBuild.core.push(itemId);
    } else if (selectedBuild.core.includes(itemId)) {
      return;
    } else if (selectedBuild.core.length + activeItems.length < 6) {
      activeItems.push(itemId);
    } else {
      statusMessage.textContent = `${buildGroupLabel(activeBuildGroup)}はコアと合わせて6アイテムまで選択できます。`;
      statusMessage.className = 'form-status is-error';
      return;
    }
    userHasEditedForm = true;
    renderBuildGroupPicker();
    renderSelectedBuild();
    renderItemGallery();
  });
  document.querySelector('#build-selected').addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-item-id]');
    if (!button) return;
    const groupItems = buildGroupItems(button.dataset.removeBuildGroup);
    const index = groupItems.indexOf(button.dataset.removeItemId);
    if (index >= 0) groupItems.splice(index, 1);
    userHasEditedForm = true;
    renderBuildGroupPicker();
    renderSelectedBuild();
    renderItemGallery();
  });
  document.querySelector('#skill-order-editor').addEventListener('click', (event) => {
    const button = event.target.closest('[data-skill-level]');
    if (!button || button.disabled) return;
    const index = Number(button.dataset.skillLevel) - 1;
    const nextOrder = [...skillOrderValues];
    nextOrder[index] = button.dataset.skill;
    for (let nextIndex = index + 1; nextIndex < nextOrder.length; nextIndex += 1) {
      const selected = nextOrder[nextIndex];
      if (selected && !canAssignSkill(nextIndex + 1, selected, nextOrder.slice(0, nextIndex))) {
        nextOrder[nextIndex] = '';
      }
    }
    skillOrderValues = nextOrder;
    userHasEditedForm = true;
    renderSkillOrderEditor();
  });
  championSelect.addEventListener('change', () => {
    const id = championSelect.value;
    setFormValues(matchups[id], 'matchup');
    setSelectedChampion(id, false);
  });
  categoryCheckboxes.addEventListener('change', () => {
    const categoryIds = selectedGenericCategoryIds();
    const id = genericCategoryId(categoryIds);
    setFormValues(matchups[id], 'category', id, categoryIds);
    userHasEditedForm = true;
  });
  editorMode.addEventListener('change', () => {
    const isMatchup = editorMode.value === 'matchup';
    const categoryIds = selectedGenericCategoryIds();
    const id = genericCategoryId(categoryIds);
    setFormValues(isMatchup ? matchups[championSelect.value] : matchups[id], editorMode.value, id, categoryIds);
  });
  detail.addEventListener('click', (event) => {
    if (event.target.closest('.edit-matchup')) editMatchup();
  });
  document.querySelector('#preview-button').addEventListener('click', previewGuide);
  document.querySelector('#download-button').addEventListener('click', downloadGuide);
  document.querySelector('#offline-html-button').addEventListener('click', downloadOfflineHtml);
  document.querySelector('#close-preview').addEventListener('click', () => {
    editorPreview.hidden = true;
  });
}
document.addEventListener('error', (event) => {
  if (event.target instanceof HTMLImageElement && (event.target.dataset.imageLabel || event.target.alt)) {
    dataDragonImageError(event.target);
  }
}, true);
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

updateEditorMode();
loadGuideData().catch(reportGuideLoadError);
loadChampions();
