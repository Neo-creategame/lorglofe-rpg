// src/scenes/MenuScenes.js
import {
  SAVE, PLAYER, POTION_DEF, POTIONS, TOWN_INN_COST,
  ARMOR_TYPES, SLOT_KEYS
} from '../config.js';
import {
  isArtifact, armorLabel, weapon, artifactEq, getEq, setEq,
  BACKPACK, STORAGE, PACK_COLS, PACK_ROWS,
  saveGame, spendGold, sellPrice, sellFromPack,
  repairCost, repairItem, repairAllCost, repairAll,
  canUpgrade, upgradeCost, upgradeText, upgradedStats,
  maxHp, armorStats, expNeed, floorList, plus, durLabel,
  addToPack
} from '../utils.js';
import { createPotion } from '../entities/items.js';

const TIER_COLORS = [0x8a6a4a, 0x9aa5b1, 0x4f8fd1, 0x7cf0d0];

const itemColor = it => {
  if (!it) return 0x1d2230;
  if (it.slot === 'potion') return it.kind === 'full' ? 0xe53e3e : 0x38a169;
  if (it.slot === 'weapon') {
    return it.isBossItem ? 0xd98cff : 0xc9a24a;
  }
  return isArtifact(it) ? 0xb15cff : (TIER_COLORS[it.tier] || 0x8a6a4a);
};

const itemChar = it => {
  if (!it) return '';
  if (it.slot === 'potion') return '薬';
  if (it.slot === 'weapon' || isArtifact(it)) {
    return it.name ? it.name[0] : '?';
  }
  return (ARMOR_TYPES[it.slot] && ARMOR_TYPES[it.slot].slot) || '?';
};

const itemInfo = it => {
  if (!it) return '';
  if (it.slot === 'weapon') return `${it.name}${plus(it)}  攻撃力 ${it.atk}  スキル:${it.skill ? it.skill.name : 'なし'}`;
  if (isArtifact(it)) return `${it.name} (${it.desc})`;
  return armorLabel(it);
};

const SLOT_ORDER = ['weapon', ...SLOT_KEYS, 'artifact'];
const slotItem = l => l.kind === 'pack' ? BACKPACK[l.key] : getEq(l.key);
const slotLayout = () => [
  ...BACKPACK.map((_, i) => ({ kind: 'pack', key: i, x: 92 + (i % PACK_COLS) * 70, y: 140 + Math.floor(i / PACK_COLS) * 70 })),
  ...SLOT_ORDER.map((s, i) => ({ kind: 'eq', key: s, x: 520, y: 110 + i * 70 }))
];

const drawSlots = (scene, slots, st) => {
  const gr = scene.add.graphics().lineStyle(2, 0x596072, 1).fillStyle(0x1d2230, 1);
  slots.forEach(s => gr.fillRect(s.x - 32, s.y - 32, 64, 64).strokeRect(s.x - 32, s.y - 32, 64, 64));
  SLOT_ORDER.forEach((s, i) => scene.add.text(562, 110 + i * 70, s === 'weapon' ? '武器' : s === 'artifact' ? '遺物' : ARMOR_TYPES[s].slot, st).setOrigin(0, 0.5));
};

const makeIcon = (scene, it, x, y) => {
  if (!it) {
    return scene.add.container(x, y, [
      scene.add.rectangle(0, 0, 56, 56, 0x1d2230)
    ]);
  }

  const durMax = (it.durMax && it.durMax > 0) ? it.durMax : 1;
  const dur = (it.dur != null) ? it.dur : durMax;
  const r = Math.min(1, Math.max(0, dur / durMax));
  const col = r > 0.5 ? 0x7cf0a0 : r > 0.2 ? 0xffd36a : 0xe5534b;
  const f = { fontFamily: 'system-ui, sans-serif', color: '#ffffff' };

  const isPot = it.slot === 'potion';
  const subText = isPot ? `x${it.stack || 1}` : (isArtifact(it) ? '' : String(dur));

  return scene.add.container(x, y, [
    scene.add.rectangle(0, 0, 56, 56, itemColor(it)),
    scene.add.text(0, -8, itemChar(it), { ...f, fontSize: '24px' }).setOrigin(0.5),
    scene.add.text(0, 10, subText, { ...f, fontSize: '11px', color: isPot ? '#ffd36a' : '#ffffff' }).setOrigin(0.5),
    ...(!isPot && !isArtifact(it) ? [
      scene.add.rectangle(-26, 23, 52, 5, 0x000000, 0.6).setOrigin(0, 0.5),
      scene.add.rectangle(-26, 23, 52 * r, 5, col).setOrigin(0, 0.5)
    ] : []),
    ...(it.lv ? [scene.add.text(26, -26, `+${it.lv}`, { ...f, fontSize: '11px', color: '#ffd36a' }).setOrigin(1, 0)] : [])
  ]);
};

// メニュー共通親クラス
export class MenuScene extends Phaser.Scene {
  btn(x, y, label, fn, on = true) {
    const t = this.add.text(x, y, label, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: on ? '#ffffff' : '#8a93a8', backgroundColor: '#2a3142', padding: { x: 14, y: 8 } }).setOrigin(0.5);
    if (on) t.setInteractive({ useHandCursor: true }).on('pointerdown', fn);
    this.items.push(t);
  }

  close() { this.scene.resume('main'); this.scene.stop(); }
}

// ステータス割り振り画面
export class StatScene extends MenuScene {
  constructor() { super('stats'); }

  create() {
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.65);
    this.items = [];
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.render();
  }

  spend(key) {
    if (PLAYER.pts <= 0) return;
    PLAYER.pts--; PLAYER[key]++;
    saveGame();
    this.render();
  }

  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    const cx = this.scale.width / 2, has = PLAYER.pts > 0;
    this.btn(cx, 80, `ステータス台  Lv ${PLAYER.lv}  EXP ${PLAYER.exp}/${expNeed(PLAYER.lv)}  残りポイント ${PLAYER.pts}`, null, false);
    this.btn(cx - 130, 180, `最大HP  ${maxHp()}`, null, false);
    this.btn(cx + 130, 180, `+1  (最大HP +10)`, () => this.spend('hpPts'), has);
    this.btn(cx - 130, 250, `攻撃力ボーナス  +${PLAYER.atkPts * 5}`, null, false);
    this.btn(cx + 130, 250, `+1  (攻撃力 +5)`, () => this.spend('atkPts'), has);
    this.btn(cx, 340, '閉じる', () => this.close());
  }
}

// ポーズ画面
export class PauseScene extends MenuScene {
  constructor() { super('pause'); }
  init(data) { this.floor = data.floor; this.page = 0; }

  create() {
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.65);
    this.keyTab = this.input.keyboard.addKey('TAB');
    this.t0 = this.time.now; this.items = [];
    this.show('top');
  }

  update() {
    if (this.time.now - this.t0 > 250 && Phaser.Input.Keyboard.JustDown(this.keyTab)) this.close();
  }

  show(mode) {
    this.items.forEach(o => o.destroy()); this.items = [];
    const cx = this.scale.width / 2, cleared = SAVE.cleared;
    this.btn(cx, 90, `ポーズ中  攻略済み:${cleared}F  (Tabで再開)`, null, false);
    if (mode === 'top') {
      this.btn(cx, 190, '町へ戻る', () => this.go(0), this.floor !== 0);
      this.btn(cx, 250, '攻略済みの階層を選ぶ', () => this.show('floors'), cleared > 0);
      this.btn(cx, 310, '手動セーブ', () => {
        if (saveGame()) this.btn(cx, 430, 'セーブしました！', null, false);
      });
      this.btn(cx, 370, '再開', () => this.close());
      return;
    }
    const per = 6, list = floorList(cleared), pages = Math.ceil(list.length / per);
    list.slice(this.page * per, this.page * per + per).forEach((f, i) => {
      this.btn(cx - 110 + (i % 2) * 220, 170 + Math.floor(i / 2) * 60, `${f}F`, () => this.go(f));
    });
    if (this.page > 0) this.btn(cx - 150, 390, '◀', () => { this.page--; this.show('floors'); });
    this.btn(cx, 390, '戻る', () => this.show('top'));
    if (this.page + 1 < pages) this.btn(cx + 150, 390, '▶', () => { this.page++; this.show('floors'); });
  }

  go(floor) { saveGame(); const m = this.scene.get('main'); this.close(); m.travel(floor); }
}

// バックパック（インベントリ）画面
export class BackpackScene extends MenuScene {
  constructor() { super('backpack'); }

  create() {
    const w = this.scale.width, h = this.scale.height, st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this.slots = slotLayout();
    drawSlots(this, this.slots, st);
    this.head = this.add.text(60, 40, '', st);
    this.infoText = this.add.text(60, 398, '', { ...st, wordWrap: { width: 400 } });
    this.noteText = this.add.text(60, 478, '', { ...st, color: '#ff9a8a' });
    this.add.text(w / 2, 515, 'ドラッグで装備・外す・入れ替え(武器はバッグ内の武器と交換)/ Esc か I で閉じる', { ...st, color: '#a0a7b8' }).setOrigin(0.5);
    this.items = [];
    this.input.on('drag', (p, o, x, y) => o.setPosition(x, y));
    this.input.on('dragend', (p, o) => this.time.delayedCall(0, () => this.drop(o)));
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.keyI = this.input.keyboard.addKey('I'); this.t0 = this.time.now;
    this.render();
  }

  update() { if (this.time.now - this.t0 > 250 && Phaser.Input.Keyboard.JustDown(this.keyI)) this.close(); }

  get(l) { return slotItem(l); }
  set(l, it) { if (l.kind === 'pack') BACKPACK[l.key] = it; else setEq(l.key, it); }

  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    const a = armorStats();
    this.head.setText(`バッグ    防具:最大HP+${a.hp}  ダメージ軽減${(a.red * 100).toFixed(1)}%`);
    this.infoText.setText('');
    this.slots.forEach(s => {
      const it = this.get(s); if (!it) return;
      const c = makeIcon(this, it, s.x, s.y).setSize(56, 56).setData('loc', s);
      c.setInteractive(); this.input.setDraggable(c);
      c.on('pointerover', () => this.infoText.setText([itemInfo(it), durLabel(it)]));
      c.on('pointerout', () => this.infoText.setText(''));
      c.on('dragstart', () => c.setDepth(10));
      this.items.push(c);
    });
  }

  drop(o) {
    const src = o.getData('loc'), dst = this.slots.find(s => Math.abs(o.x - s.x) <= 32 && Math.abs(o.y - s.y) <= 32);
    if (dst && dst !== src) this.move(src, dst);
    this.render();
  }

  move(src, dst) {
    const a = this.get(src), b = this.get(dst);
    const fits = (l, it) => !it || l.kind === 'pack' || it.slot === l.key;
    if (!fits(dst, a) || !fits(src, b)) return this.noteText.setText('その部位には装備できません');
    if (src.kind === 'eq' && src.key === 'weapon' && !b) return this.noteText.setText('武器は外せません。バッグの別の武器と入れ替えてください');
    this.set(src, b); this.set(dst, a);
    const m = this.scene.get('main'); m.hp = Math.min(m.hp, maxHp());
    this.noteText.setText('');
  }
}

// 鍛冶屋画面
export class BlacksmithScene extends MenuScene {
  constructor() { super('blacksmith'); }

  create() {
    const w = this.scale.width, h = this.scale.height, st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
    this.slots = slotLayout();
    drawSlots(this, this.slots, st);
    this.head = this.add.text(60, 40, '', st);
    this.infoText = this.add.text(60, 398, '', { ...st, wordWrap: { width: 400 } });
    this.noteText = this.add.text(60, 497, '', { ...st, color: '#ff9a8a' });
    this.add.text(w / 2, 522, '持ち物をクリックで選ぶ / Esc で閉じる', { ...st, color: '#a0a7b8' }).setOrigin(0.5);
    this.selGfx = this.add.graphics();
    this.items = []; this.sel = null;
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.render();
  }

  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    this.selGfx.clear();
    this.head.setText(`鍛冶屋    所持金 ${PLAYER.gold}G`);
    this.slots.forEach(s => {
      const it = slotItem(s); if (!it) return;
      const c = makeIcon(this, it, s.x, s.y).setSize(56, 56).setInteractive();
      c.on('pointerdown', () => { this.sel = s; this.noteText.setText(''); this.time.delayedCall(0, () => this.render()); });
      this.items.push(c);
    });
    const it = this.sel && slotItem(this.sel);
    if (it) this.selGfx.lineStyle(3, 0xffd36a, 1).strokeRect(this.sel.x - 34, this.sel.y - 34, 68, 68);
    this.infoText.setText(it ? [itemInfo(it), durLabel(it), canUpgrade(it) ? upgradeText(it) : (isArtifact(it) ? '遺物は強化できません' : '強化は最大です')] : '修理・強化したい持ち物を選んでください');
    if (it) {
      const rc = repairCost(it), uc = upgradeCost(it), up = canUpgrade(it);
      this.btn(110, 462, rc > 0 ? `修理 ${rc}G` : '修理 不要', () => this.act(() => repairItem(it)), rc > 0);
      this.btn(290, 462, up ? `強化 ${uc}G` : '強化 最大', () => this.act(() => upgradeItem(it)), up);
    }
    const all = repairAllCost();
    this.btn(530, 462, all > 0 ? `全部修理 ${all}G` : '全部修理 不要', () => this.act(repairAll), all > 0);
    this.btn(700, 462, '閉じる', () => this.close());
  }

  act(fn) {
    this.noteText.setText(fn() ? '' : 'ゴールドが足りません');
    saveGame();
    this.render();
  }
}

const packCell = (ox, i) => ({ x: ox + 28 + (i % PACK_COLS) * 66, y: 138 + Math.floor(i / PACK_COLS) * 66 });
const drawPackFrames = (scene, ox) => {
  const gr = scene.add.graphics().lineStyle(2, 0x596072, 1).fillStyle(0x1d2230, 1);
  BACKPACK.forEach((_, i) => { const c = packCell(ox, i); gr.fillRect(c.x - 32, c.y - 32, 64, 64).strokeRect(c.x - 32, c.y - 32, 64, 64); });
};

// 宿屋画面
export class InnScene extends MenuScene {
  constructor() { super('inn'); }

  create() {
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.65);
    this.items = []; this.note = '';
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.render();
  }

  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    const cx = this.scale.width / 2, full = this.scene.get('main').hp >= maxHp();
    this.btn(cx, 150, `宿屋  所持金 ${PLAYER.gold}G`, null, false);
    this.btn(cx, 230, full ? 'HPは満タンです' : `休んで全回復  ${TOWN_INN_COST}G`, () => this.rest(), !full);
    this.btn(cx, 310, '閉じる', () => this.close());
    this.items.push(this.add.text(cx, 380, this.note, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ff9a8a' }).setOrigin(0.5));
  }

  rest() {
    if (!spendGold(TOWN_INN_COST)) { this.note = 'ゴールドが足りません'; return this.render(); }
    saveGame();
    this.scene.get('main').hp = maxHp(); this.note = 'HPが全回復しました'; this.render();
  }
}

// 倉庫画面
export class StorageScene extends MenuScene {
  constructor() { super('storage'); }

  create() {
    const w = this.scale.width, h = this.scale.height, st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
    this.add.text(40, 84, 'バッグ(クリックで倉庫へ)', st);
    this.add.text(440, 84, '倉庫(クリックでバッグへ)', st);
    drawPackFrames(this, 40); drawPackFrames(this, 440);
    this.info = this.add.text(40, 380, '', { ...st, wordWrap: { width: 720 } });
    this.note = this.add.text(40, 430, '', { ...st, color: '#ff9a8a' });
    this.items = [];
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.render();
  }

  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    [[BACKPACK, 40], [STORAGE, 440]].forEach(([list, ox]) => list.forEach((it, i) => {
      if (!it) return;
      const p = packCell(ox, i), c = makeIcon(this, it, p.x, p.y).setSize(56, 56).setInteractive();
      c.on('pointerdown', () => this.time.delayedCall(0, () => this.move(list, i)));
      c.on('pointerover', () => this.info.setText([itemInfo(it), durLabel(it)]));
      c.on('pointerout', () => this.info.setText(''));
      this.items.push(c);
    }));
    this.btn(400, 480, '閉じる', () => this.close());
  }

  move(list, i) {
    const other = list === BACKPACK ? STORAGE : BACKPACK, j = other.indexOf(null);
    if (j < 0) this.note.setText('移動先に空きがありません');
    else { other[j] = list[i]; list[i] = null; this.note.setText(''); saveGame(); }
    this.render();
  }
}

// お店画面
export class ShopScene extends MenuScene {
  constructor() { super('shop'); }

  create() {
    const w = this.scale.width, h = this.scale.height, st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
    this.add.text(40, 84, 'バッグ(持ち物をクリックで選ぶ)', st);
    drawPackFrames(this, 40);
    this.head = this.add.text(560, 110, '', st);
    this.info = this.add.text(40, 380, '', { ...st, wordWrap: { width: 480 } });
    this.note = this.add.text(560, 400, '', { ...st, color: '#ff9a8a' });
    this.items = []; this.sel = null;
    this.input.keyboard.addKey('ESC').on('down', () => this.close());
    this.render();
  }

  render() {
    this.items.forEach(o => o.destroy()); this.items = [];
    this.head.setText(`お店  所持金 ${PLAYER.gold}G`);
    BACKPACK.forEach((it, i) => {
      if (!it) return;
      const p = packCell(40, i), c = makeIcon(this, it, p.x, p.y).setSize(56, 56).setInteractive();
      c.on('pointerdown', () => this.time.delayedCall(0, () => { this.sel = i; this.note.setText(''); this.render(); }));
      this.items.push(c);
    });
    const it = this.sel != null ? BACKPACK[this.sel] : null;
    if (it) { const p = packCell(40, this.sel); this.items.push(this.add.graphics().lineStyle(3, 0xffd36a, 1).strokeRect(p.x - 34, p.y - 34, 68, 68)); }
    this.info.setText(it ? [itemInfo(it), durLabel(it), `売値 ${sellPrice(it)}G`] : '売る持ち物を選んでください');
    this.btn(660, 180, `小回復 ${POTION_DEF.small.price}G(所持${POTIONS.small})`, () => this.buy('small'), PLAYER.gold >= POTION_DEF.small.price);
    this.btn(660, 240, `全回復 ${POTION_DEF.full.price}G(所持${POTIONS.full})`, () => this.buy('full'), PLAYER.gold >= POTION_DEF.full.price);
    this.btn(660, 320, it ? `売却 ${sellPrice(it)}G` : '売却', () => this.sell(), !!it);
    this.btn(660, 430, '閉じる', () => this.close());
  }

  buy(kind) {
    const price = POTION_DEF[kind].price;
    if (PLAYER.gold < price) {
      this.note.setText('ゴールドが足りません');
      return;
    }
    const pot = createPotion(kind, 1);
    if (addToPack(pot)) {
      spendGold(price);
      this.note.setText(`${POTION_DEF[kind].name}を買いました！`);
      saveGame();
    } else {
      this.note.setText('バッグが満杯で購入できません！');
    }
    this.render();
  }

  sell() {
    const p = sellFromPack(this.sel);
    this.note.setText(p ? `${p}G で売りました` : '');
    this.sel = null;
    saveGame();
    this.render();
  }
}
