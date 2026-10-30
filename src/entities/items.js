// src/entities/items.js
import { SMITH, POTION_DEF, SHOP, ARTIFACT } from '../config.js';

// 武器マスタ定義
export const WEAPONS = {
  sword: { name: '片手剣', base: 100, cd: 350, range: 64, speedMult: 1.0, skill: { name: '回転斬り', cd: 3000 } },
  dual: { name: '双剣', base: 50, cd: 280, range: 50, speedMult: 1.05, skill: { name: '乱舞', cd: 3000 } },
  bow: { name: '弓', base: 110, cd: 500, range: 440, speedMult: 1.0, speed: 560, skill: { name: '三連射', cd: 3000 } },
  greatsword: { name: '大剣', base: 210, cd: 750, range: 90, speedMult: 0.75, skill: { name: '重撃一閃', cd: 5000 } },
  spear: { name: '槍', base: 85, cd: 240, range: 110, speedMult: 1.0, skill: { name: '突進貫通', cd: 3500 } },
  demon_sword: { name: '魔王の魔剣', base: 280, cd: 380, range: 85, speedMult: 1.1, skill: { name: 'ソウルサモン', cd: 8000 } },
  eruption_wand: { name: '滅びの噴火杖', base: 160, cd: 480, range: 420, speedMult: 1.0, speed: 520, skill: { name: 'エラプションゾーン', cd: 6000 } },
  dragon_chain: { name: '龍王の鎖鎌', base: 140, cd: 300, range: 120, speedMult: 1.15, skill: { name: 'ドラゴンチャージ', cd: 5000 } },
  lightning_staff: { name: '雷神の杖', base: 130, cd: 400, range: 450, speedMult: 1.05, speed: 650, skill: { name: 'サンダークロス', cd: 5000 } }
};

export const WEAPON_VARIATIONS = {
  sword: [
    { name: 'ショートソード', mult: 0.9, cdMult: 0.9 },
    { name: 'ロングソード', mult: 1.0, cdMult: 1.0 },
    { name: 'バスタードソード', mult: 1.25, cdMult: 1.2 }
  ],
  dual: [
    { name: 'ダガー', mult: 0.85, cdMult: 0.8 },
    { name: 'ツインブレード', mult: 1.0, cdMult: 1.0 },
    { name: 'シノビクナイ', mult: 1.15, cdMult: 0.95 }
  ],
  bow: [
    { name: 'ショートボウ', mult: 0.9, cdMult: 0.85 },
    { name: 'コンポジットボウ', mult: 1.0, cdMult: 1.0 },
    { name: 'ヘビィクロスボウ', mult: 1.3, cdMult: 1.3 }
  ],
  greatsword: [
    { name: 'クレイモア', mult: 0.95, cdMult: 0.95 },
    { name: 'ツヴァイハンダー', mult: 1.0, cdMult: 1.0 },
    { name: 'ドラゴンスレイヤー', mult: 1.3, cdMult: 1.2 }
  ],
  spear: [
    { name: 'ショートスピア', mult: 0.9, cdMult: 0.85 },
    { name: 'ランス', mult: 1.0, cdMult: 1.0 },
    { name: 'ハルバード', mult: 1.25, cdMult: 1.15 }
  ]
};

export const WEAPON_SCALE = { perFloor: 0.12 };
export const weaponFloorMult = floor => 1 + WEAPON_SCALE.perFloor * (Math.max(1, floor) - 1);

export function rollWeapon(type, floor = 1) {
  const baseDef = WEAPONS[type];
  let name = baseDef.name;
  let atk = Math.round(baseDef.base * weaponFloorMult(floor));
  let cd = baseDef.cd;

  if (WEAPON_VARIATIONS[type]) {
    const vars = WEAPON_VARIATIONS[type];
    const v = vars[Math.floor(Math.random() * vars.length)];
    name = v.name;
    atk = Math.round(baseDef.base * v.mult * (0.85 + Math.random() * 0.3) * weaponFloorMult(floor));
    cd = Math.round(baseDef.cd * v.cdMult);
  }

  const isBoss = ['demon_sword', 'eruption_wand', 'dragon_chain'].includes(type);

  return {
    type, name, baseAtk: baseDef.base, cd, range: baseDef.range,
    speedMult: baseDef.speedMult, speed: baseDef.speed, skill: baseDef.skill,
    slot: 'weapon', dur: 100, durMax: 100, lv: 0, atk,
    isBossItem: isBoss, rarity: isBoss ? 'boss' : 'normal'
  };
}

// 防具マスタ定義
export const ARMOR_TYPES = { helmet: { slot: '兜' }, chest: { slot: '胸' }, legs: { slot: '脚' }, shoes: { slot: '靴' } };
export const SLOT_KEYS = Object.keys(ARMOR_TYPES);
export const TIERS = [{ mult: 1 }, { mult: 1.7 }, { mult: 2.5 }, { mult: 3.5 }];
export const ARMOR_ROLL = [0.8, 1.2], RED_CAP = 0.6, DROP_RATE = 0.2, FLOORS_PER_TIER = 3;

export const ARMOR_BASE_STATS = {
  helmet: { hp: 12, red: 0.02 }, chest: { hp: 30, red: 0.05 }, legs: { hp: 18, red: 0.03 }, shoes: { hp: 8, red: 0.015 }
};

export const ARMOR_VARIATIONS = {
  helmet: [
    { tier: 0, name: 'ブロンズヘルム', hpMult: 1.0, redMult: 1.0 }, { tier: 0, name: '青銅の額当て', hpMult: 0.7, redMult: 1.4 },
    { tier: 1, name: 'アイアンヘルム', hpMult: 1.0, redMult: 1.0 }, { tier: 1, name: '鉄のカブト', hpMult: 1.3, redMult: 0.8 },
    { tier: 2, name: 'スチールヘルム', hpMult: 1.0, redMult: 1.0 }, { tier: 2, name: '鋼鉄のバイザー', hpMult: 0.8, redMult: 1.3 },
    { tier: 3, name: 'ミスリルヘルム', hpMult: 1.0, redMult: 1.0 }, { tier: 3, name: '聖銀の冠', hpMult: 1.2, redMult: 0.9 }
  ],
  chest: [
    { tier: 0, name: 'ブロンズプレート', hpMult: 1.0, redMult: 1.0 }, { tier: 0, name: 'ブロンズメイル', hpMult: 0.8, redMult: 1.3 },
    { tier: 1, name: 'アイアンプレート', hpMult: 1.0, redMult: 1.0 }, { tier: 1, name: '鉄の胸当て', hpMult: 1.3, redMult: 0.85 },
    { tier: 2, name: 'スチールプレート', hpMult: 1.0, redMult: 1.0 }, { tier: 2, name: '鋼の鎧', hpMult: 0.85, redMult: 1.25 },
    { tier: 3, name: 'ミスリルプレート', hpMult: 1.0, redMult: 1.0 }, { tier: 3, name: 'ミスリルローブ', hpMult: 1.2, redMult: 0.9 }
  ],
  legs: [
    { tier: 0, name: 'ブロンズレギンス', hpMult: 1.0, redMult: 1.0 }, { tier: 0, name: '青銅のグリーブ', hpMult: 0.8, redMult: 1.3 },
    { tier: 1, name: 'アイアンレギンス', hpMult: 1.0, redMult: 1.0 }, { tier: 1, name: '鉄の具足', hpMult: 1.2, redMult: 0.85 },
    { tier: 2, name: 'スチールレギンス', hpMult: 1.0, redMult: 1.0 }, { tier: 2, name: '鋼の脚甲', hpMult: 0.85, redMult: 1.25 },
    { tier: 3, name: 'ミスリルレギンス', hpMult: 1.0, redMult: 1.0 }, { tier: 3, name: '聖銀の脚甲', hpMult: 1.15, redMult: 0.9 }
  ],
  shoes: [
    { tier: 0, name: 'ブロンズシューズ', hpMult: 1.0, redMult: 1.0 }, { tier: 0, name: '青銅のブーツ', hpMult: 0.8, redMult: 1.3 },
    { tier: 1, name: 'アイアンシューズ', hpMult: 1.0, redMult: 1.0 }, { tier: 1, name: '鉄の靴', hpMult: 1.3, redMult: 0.8 },
    { tier: 2, name: 'スチールシューズ', hpMult: 1.0, redMult: 1.0 }, { tier: 2, name: '鋼のブーツ', hpMult: 0.85, redMult: 1.25 },
    { tier: 3, name: 'ミスリルシューズ', hpMult: 1.0, redMult: 1.0 }, { tier: 3, name: '聖銀の靴', hpMult: 1.2, redMult: 0.9 }
  ]
};

export const randomSlot = () => SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)];
export const tierFor = floor => Math.min(TIERS.length - 1, Math.floor((Math.max(1, floor) - 1) / FLOORS_PER_TIER) + (Math.random() < 0.15 ? 1 : 0));

export function rollArmor(slot, floor) {
  const base = ARMOR_BASE_STATS[slot], ti = tierFor(floor);
  const vars = ARMOR_VARIATIONS[slot].filter(v => v.tier === ti);
  const v = vars[Math.floor(Math.random() * vars.length)];
  const roll = ARMOR_ROLL[0] + Math.random() * (ARMOR_ROLL[1] - ARMOR_ROLL[0]);
  const depth = 1 + 0.05 * Math.max(0, floor - TIERS.length * FLOORS_PER_TIER);
  const m = TIERS[ti].mult * roll * depth;

  return {
    slot, tier: ti, label: v.name,
    hp: Math.round(base.hp * v.hpMult * m),
    red: Math.round(base.red * v.redMult * m * 1000) / 1000,
    dur: 50 + 25 * ti, durMax: 50 + 25 * ti, lv: 0
  };
}

// 遺物（アーティファクト）マスタ定義
export const ARTIFACT_LIST = [
  { name: '王家の印章', typeKey: 'bossPct', typeName: 'ボスダメ', val: 25, unit: '%', desc: 'ボスへのダメージ +25%' },
  { name: '竜牙の護符', typeKey: 'regen', typeName: '持続回復(秒)', val: 2, unit: 'HP', desc: '毎秒 HP+2 回復' },
  { name: '深淵の眼', typeKey: 'crisisAtk', typeName: 'ピンチ時攻撃力', val: 30, unit: '%', desc: 'HP30%以下で攻撃力 +30%' },
  { name: '古王の王冠', typeKey: 'hpPct', typeName: '最大HP', val: 20, unit: '%', desc: '最大HP +20%' }
];
export const ARTIFACT = { dropRate: 0.5 };

export function rollArtifact() {
  const fixed = ARTIFACT_LIST[Math.floor(Math.random() * ARTIFACT_LIST.length)];
  return {
    slot: 'artifact', name: fixed.name, typeKey: fixed.typeKey, typeName: fixed.typeName,
    val: fixed.val, unit: fixed.unit, desc: fixed.desc,
    bossPct: fixed.typeKey === 'bossPct' ? fixed.val : 0,
    dur: 1, durMax: 1, lv: 0
  };
}

// ポーション生成
export function createPotion(kind = 'small', count = 1) {
  const def = POTION_DEF[kind];
  return {
    slot: 'potion', kind, name: def.name, pct: def.pct,
    stack: count, maxStack: 5, dur: 1, durMax: 1, lv: 0
  };
}

// 判定ヘルパー・アイテム計算関数
export const isArtifact = it => !!it && it.slot === 'artifact';
export const isWeapon = it => !!it && it.slot === 'weapon';
export const armorScore = it => it.hp + it.red * 500;
export const plus = it => it.lv ? `+${it.lv}` : '';
export const armorLabel = it => `${it.label}${plus(it)}(HP+${it.hp} 軽減${(it.red * 100).toFixed(1)}%)`;

export const sellPrice = it => isArtifact(it) ? (it.val || 10) * SHOP.sellPerArtifactPct : Math.max(1, Math.round((isWeapon(it) ? it.atk * SHOP.sellPerAtk : armorScore(it) * SHOP.sellPerArmor) * (0.5 + 0.5 * it.dur / it.durMax)));
export const repairCost = it => Math.ceil((it.durMax - it.dur) * SMITH.repairPerPt * (isWeapon(it) ? SMITH.weaponRepairMult : 1));
export const canUpgrade = it => !isArtifact(it) && (it.lv || 0) < SMITH.upMax;
export const upgradeCost = it => Math.round(SMITH.upBase * Math.pow(SMITH.upGrowth, it.lv || 0) * (isWeapon(it) ? SMITH.weaponUpMult : 1));

export function upgradedStats(it) {
  const m = 1 + SMITH.upStep;
  return isWeapon(it) ? { atk: Math.max(it.atk + 1, Math.round(it.atk * m)) } : { hp: Math.max(it.hp + 1, Math.round(it.hp * m)), red: Math.round(it.red * m * 1000) / 1000 };
}
