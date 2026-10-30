// src/config.js

// マップ基本設定
export const T = 32;
export const W = 40;
export const H = 30;
export const SEED_BASE = 1000;
export const CAM = { zoom: 1.5 };
export const SAVE_KEY = 'alone_rpg_save_data_v1';

// プレイヤー＆成長パラメータ
export const PLAYER_HP = 100;
export const HP_PER_PT = 10;
export const ATK_PER_PT = 5;
export const EXP_PER_KILL = 30;
export const expNeed = lv => 50 + 25 * (lv - 1);

// 敵・ボス・ゴールド設定
export const ENEMY = { hp: 300, speed: 90, aggro: 220, r: 10, touchDmg: 8, color: 0xe5534b };
export const BOSS = {
  hpMult: 6, speed: 70, aggro: 260, r: 20, touchDmg: 20, color: 0xb15cff, expMult: 5, weaponDropRate: 0.10,
  attackRange: 340, firstDelay: 1500, cd: 2200, cdRage: 1400, rageAt: 0.5,
  shotDmg: 12, dashSpeed: 430, dashTime: 600, dashMult: 1.5,
  minCallFloor: 10, maxMinions: 5,
  hpMultSpecial: 50.0,
  specialBossAtkMult: 5.0,
  shieldThresholds: [0.75, 0.50, 0.25]
};
export const GOLD = { start: 100, perKill: 6, perFloor: 4, bossMult: 10 };

// アクション設定
export const DODGE = { dist: 110, time: 180, cd: 900, grace: 120 };
// 防具の最大軽減率（60%）
export const RED_CAP = 0.6;
export const DURABILITY = { weaponAttack: 1, weaponSkill: 2, armorHit: 1, brokenAtkMult: 0.5 };
export const DROP_RATE = 0.2;
export const ARTIFACT = { dropRate: 0.5 };

// 街施設＆ポーション＆鍛冶屋設定
export const TOWN_SHOPS = [['お店', 6, 5], ['宿屋', 17, 5], ['鍛冶屋', 28, 5], ['倉庫', 6, 14]];
export const TOWN_INN_COST = 500;
export const POTION_DEF = { small: { name: '小回復', pct: 0.25, price: 250 }, full: { name: '全回復', pct: 1, price: 1000 } };
export const SHOP = { sellPerAtk: 0.8, sellPerArmor: 2, sellPerArtifactPct: 15 };
export const DEATH = { respawnHpPct: 0.1, durKeep: 0.5 };
export const SMITH = { repairPerPt: 1, weaponRepairMult: 1.5, upMax: 5, upBase: 120, upGrowth: 1.7, weaponUpMult: 1.5, upStep: 0.10 };
// 装備部位のスロットキー一覧
export const SLOT_KEYS = ['helmet', 'chest', 'legs', 'shoes'];

// 描画関係・グローバル状態
export const STAIRS_OPEN = 0xffd36a;
export const STAIRS_LOCKED = 0x555b6b;
export const SAVE = { cleared: 0 };
export const POTIONS = { small: 0, full: 0 };
export const PLAYER = { lv: 1, exp: 0, pts: 0, hpPts: 0, atkPts: 0, gold: GOLD.start };

// Qスキル（衝撃波）設定
export const Q_SKILL_STATS = {
  1: { dmgMult: 1.5, range: 100, knockback: 180, stunTime: 1000, cd: 4000, color: 0x4fd1c5, name: '⚡衝撃波 Lv.1' },
  2: { dmgMult: 3.0, range: 130, knockback: 240, stunTime: 1500, cd: 3500, color: 0x38bdf8, name: '⚡爆裂波 Lv.2' },
  3: { dmgMult: 9.0, range: 160, knockback: 300, stunTime: 2000, cd: 10000, color: 0xc084fc, name: '⚡神雷波 MAX' }
};
