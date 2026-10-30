// src/utils.js
import {
  T, W, H, SAVE_KEY, SAVE, PLAYER, POTIONS, GOLD, PLAYER_HP, HP_PER_PT, ATK_PER_PT,
  SLOT_KEYS, RED_CAP, DURABILITY
} from './config.js';
import { rollWeapon, isArtifact, isWeapon, repairCost, upgradeCost, upgradedStats, canUpgrade, armorLabel, sellPrice } from './entities/items.js';

// グローバルインベントリ状態
export const PACK_COLS = 5;
export const PACK_ROWS = 4;
export const EQUIPPED = Object.fromEntries(SLOT_KEYS.map(s => [s, null]));
export const BACKPACK = Array(PACK_COLS * PACK_ROWS).fill(null);
export const STORAGE = Array(PACK_COLS * PACK_ROWS).fill(null);

export let weapon = rollWeapon('sword');
export let artifactEq = null;

export const setWeapon = w => { weapon = w; };
export const setArtifactEq = a => { artifactEq = a; };

// バックパック内のポーション数を POTIONS オブジェクト（UI表示用）に同期させる関数
export function syncPotionCounts() {
  let smallCount = 0;
  let fullCount = 0;
  for (const item of BACKPACK) {
    if (item && item.slot === 'potion') {
      if (item.kind === 'small') smallCount += (item.stack || 1);
      if (item.kind === 'full') fullCount += (item.stack || 1);
    }
  }
  POTIONS.small = smallCount;
  POTIONS.full = fullCount;
}

// バックパックへのアイテム格納
export function addToPack(it) {
  if (it.slot === 'potion') {
    for (let i = 0; i < BACKPACK.length; i++) {
      const slotItem = BACKPACK[i];
      if (slotItem && slotItem.slot === 'potion' && slotItem.kind === it.kind && slotItem.stack < slotItem.maxStack) {
        const space = slotItem.maxStack - slotItem.stack;
        if (it.stack <= space) {
          slotItem.stack += it.stack;
          syncPotionCounts();
          return true;
        } else {
          slotItem.stack = slotItem.maxStack;
          it.stack -= space;
        }
      }
    }
  }

  const emptyIndex = BACKPACK.indexOf(null);
  if (emptyIndex < 0) return false;
  BACKPACK[emptyIndex] = it;
  syncPotionCounts();
  return true;
}

export const getEq = s => s === 'weapon' ? weapon : s === 'artifact' ? artifactEq : EQUIPPED[s];
export const setEq = (s, it) => { if (s === 'weapon') weapon = it; else if (s === 'artifact') artifactEq = it; else EQUIPPED[s] = it; };

// セーブ＆ロード処理
export function saveGame() {
  try {
    syncPotionCounts();
    const data = {
      cleared: SAVE.cleared,
      player: { ...PLAYER },
      potions: { ...POTIONS },
      weapon,
      artifactEq,
      equipped: EQUIPPED,
      backpack: BACKPACK,
      storage: STORAGE
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('セーブ失敗:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return false;
    const data = JSON.parse(json);

    SAVE.cleared = data.cleared || 0;
    Object.assign(PLAYER, data.player);
    if (data.weapon) setWeapon(data.weapon);
    if (data.artifactEq) setArtifactEq(data.artifactEq);

    if (data.equipped) Object.keys(EQUIPPED).forEach(k => { EQUIPPED[k] = data.equipped[k]; });
    if (data.backpack) data.backpack.forEach((item, i) => { BACKPACK[i] = item; });
    if (data.storage) data.storage.forEach((item, i) => { STORAGE[i] = item; });

    syncPotionCounts();
    return true;
  } catch (e) {
    console.error('ロード失敗:', e);
    return false;
  }
}

// ステータス計算
export const artifactStat = key => (artifactEq && artifactEq.typeKey === key) ? artifactEq.val : 0;
export const bossDmgMult = () => 1 + artifactStat('bossPct') / 100;

export function armorStats() {
  let hp = 0, red = 0;
  for (const it of Object.values(EQUIPPED)) if (it && it.dur > 0) { hp += it.hp; red += it.red; }

  if (red > RED_CAP) {
    const excessPct = Math.floor((red - RED_CAP) * 100);
    hp += excessPct;
    red = RED_CAP;
  }
  return { hp, red };
}

export const maxHp = () => {
  const base = PLAYER_HP + PLAYER.hpPts * HP_PER_PT + armorStats().hp;
  const mult = 1 + artifactStat('hpPct') / 100;
  return Math.round(base * mult);
};

export const atkTotal = (scene = null) => {
  const base = Math.round((weapon.atk + PLAYER.atkPts * ATK_PER_PT) * (weapon.dur > 0 ? 1 : DURABILITY.brokenAtkMult));
  let mult = 1 + artifactStat('atkPct') / 100;
  if (scene && scene.hp <= maxHp() * 0.3 && artifactEq && artifactEq.typeKey === 'crisisAtk') {
    mult += artifactEq.val / 100;
  }
  return Math.round(base * mult);
};

// 耐久度消耗・修理・強化関数
export const wear = (it, n) => {
  if (!it || it.dur <= 0) return false;
  it.dur = Math.max(0, it.dur - n);
  return it.dur === 0;
};

export const wearArmor = n => Object.values(EQUIPPED).filter(it => wear(it, n));
export const spendGold = n => { if (PLAYER.gold < n) return false; PLAYER.gold -= n; return true; };

export const ownedItems = () => [weapon, ...BACKPACK, ...STORAGE, ...Object.values(EQUIPPED)].filter(it => it && !isArtifact(it));
export const repairItem = it => { const c = repairCost(it); if (c <= 0 || !spendGold(c)) return false; it.dur = it.durMax; return true; };
export const repairAllCost = () => ownedItems().reduce((sum, it) => sum + repairCost(it), 0);
export const repairAll = () => { const c = repairAllCost(); if (c <= 0 || !spendGold(c)) return false; ownedItems().forEach(it => { it.dur = it.durMax; }); return true; };

export const upgradeItem = it => { if (!canUpgrade(it) || !spendGold(upgradeCost(it))) return false; Object.assign(it, upgradedStats(it)); it.lv = (it.lv || 0) + 1; return true; };

export const goldFor = (floor, boss) => (GOLD.perKill + GOLD.perFloor * floor) * (boss ? GOLD.bossMult : 1);
export const sellFromPack = i => {
  const it = BACKPACK[i];
  if (!it) return 0;
  const p = sellPrice(it);
  BACKPACK[i] = null;
  PLAYER.gold += p;
  syncPotionCounts();
  return p;
};

// 算術＆マップ判定ヘルパー
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 耐久度のラベル表示
export const durLabel = it => !it || isArtifact(it) || it.slot === 'potion' ? '' : `耐久 ${it.dur}/${it.durMax}`;

// HUD表示用の防具一覧文字列
export const armorLines = () => {
  return Object.entries(EQUIPPED).map(([slotKey, item]) => {
    const slotName = slotKey === 'helmet' ? '兜' : slotKey === 'chest' ? '胸' : slotKey === 'legs' ? '脚' : '靴';
    if (!item) return `${slotName}: なし`;
    return `${slotName}: ${armorLabel(item)} ${durLabel(item)}`;
  });
};

// ダメージ計算（防御軽減率の適用）
export function takeDamage(rawDmg) {
  const { red } = armorStats();
  const actualDmg = Math.max(1, Math.round(rawDmg * (1 - red)));
  return actualDmg;
}
export const isSub = f => !Number.isInteger(f);
export const nextFloor = f => f === 0 ? 1 : f + 0.5;
export const floorIdx = f => Math.round(f * 2) - 1;
export const floorList = c => { const out = []; for (let f = 1; f <= c + 1e-9; f += 0.5) out.push(f); return out; };
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
