// src/scenes/HudScene.js
import {
  PLAYER, POTIONS, SLOT_KEYS, ARMOR_TYPES, EQUIPPED, DODGE
} from '../config.js';
import {
  maxHp, weapon, artifactEq, plus, expNeed, HP_PER_PT, ATK_PER_PT
} from '../utils.js';

export class HudScene extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    this.uiGfx = this.add.graphics().setDepth(10);

    // HPテキスト (HPゲージの上に重ねて表示)
    this.hpText = this.add.text(125, 20, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setDepth(11);

    // Lvバッジ表示用テキスト
    this.lvText = this.add.text(38, 38, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#ffd36a',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(12);

    // 割り振りステータス表示用テキスト (EXPバーの下)
    this.statBonusText = this.add.text(72, 52, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#e2e8f0',
      fontWeight: 'bold'
    }).setDepth(11);

    // 画面中央上のボスHP数値テキスト
    const w = this.scale.width, h = this.scale.height;
    this.bossHpText = this.add.text(w / 2, 38, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(12);

    // 左上のテキスト表示（階層・ナビ案内用）
    this.text = this.add.text(10, 95, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#e8eaf0',
      backgroundColor: 'rgba(14,16,21,0.65)',
      padding: { x: 8, y: 6 }
    }).setDepth(10);

    // 画面左下の装備情報用テキストコンテナ
    this.equipTexts = [];
    for (let i = 0; i < 6; i++) {
      const t = this.add.text(20, h - 145 + i * 22, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#e8eaf0'
      }).setDepth(11);
      this.equipTexts.push(t);
    }

    // 右下UIテキスト群（キーガイド＆数値）
    const fontSt = { fontFamily: 'system-ui, sans-serif', fontWeight: 'bold' };

    this.dodgeText = this.add.text(w - 235, h - 78, 'Shift', { ...fontSt, fontSize: '11px', color: '#88aaff' }).setOrigin(0.5).setDepth(12);
    this.dodgeCdText = this.add.text(w - 235, h - 30, '', { ...fontSt, fontSize: '11px' }).setOrigin(0.5).setDepth(12);

    this.potSText = this.add.text(w - 175, h - 78, 'Q', { ...fontSt, fontSize: '12px', color: '#7cf0a0' }).setOrigin(0.5).setDepth(12);
    this.potSCntText = this.add.text(w - 175, h - 30, '', { ...fontSt, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5).setDepth(12);

    this.potFText = this.add.text(w - 115, h - 78, 'R', { ...fontSt, fontSize: '12px', color: '#ff9a8a' }).setOrigin(0.5).setDepth(12);
    this.potFCntText = this.add.text(w - 115, h - 30, '', { ...fontSt, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5).setDepth(12);

    this.skillText = this.add.text(w - 55, h - 78, 'E', { ...fontSt, fontSize: '12px', color: '#ffd36a' }).setOrigin(0.5).setDepth(12);
    this.skillCdText = this.add.text(w - 55, h - 30, '', { ...fontSt, fontSize: '11px' }).setOrigin(0.5).setDepth(12);

    if (this.pending) this.setLines(this.pending);
  }

  setLines(lines) {
    this.pending = lines;
    if (!this.uiGfx) return;

    this.uiGfx.clear();
    const main = this.scene.get('main');
    if (!main) return;

    const now = this.time.now;
    const w = this.scale.width, h = this.scale.height;

    // 1. 左上：ステータス＆HP/EXPパネル
    this.uiGfx.fillStyle(0x0e1015, 0.85);
    this.uiGfx.fillRoundedRect(10, 10, 275, 76, 8);
    this.uiGfx.lineStyle(2, 0x4a5568, 0.8);
    this.uiGfx.strokeRoundedRect(10, 10, 275, 76, 8);

    // Lvバッジ
    this.uiGfx.fillStyle(0x1a202c, 1);
    this.uiGfx.fillCircle(38, 42, 22);
    this.uiGfx.lineStyle(2, 0xffd36a, 0.9);
    this.uiGfx.strokeCircle(38, 42, 22);
    this.lvText.setPosition(38, 42);
    this.lvText.setText(`Lv.${PLAYER.lv}`);

    // HPゲージ
    const curHp = Math.max(0, main.hp);
    const maxHpVal = maxHp();
    const hpRatio = Math.min(1, Math.max(0, curHp / maxHpVal));
    const hpBarWidth = 185;
    const hpBarX = 72;

    this.uiGfx.fillStyle(0x1a202c, 1);
    this.uiGfx.fillRect(hpBarX, 18, hpBarWidth, 14);

    const hpColor = hpRatio > 0.5 ? 0x48bb78 : hpRatio > 0.2 ? 0xecc94b : 0xf56565;
    this.uiGfx.fillStyle(hpColor, 1);
    this.uiGfx.fillRect(hpBarX, 18, hpBarWidth * hpRatio, 14);

    this.uiGfx.lineStyle(1, 0xa0aec0, 0.5);
    this.uiGfx.strokeRect(hpBarX, 18, hpBarWidth, 14);

    // EXPゲージ
    const expNeedVal = expNeed(PLAYER.lv);
    const expRatio = Math.min(1, Math.max(0, PLAYER.exp / expNeedVal));

    this.uiGfx.fillStyle(0x1a202c, 1);
    this.uiGfx.fillRect(hpBarX, 38, hpBarWidth, 6);
    this.uiGfx.fillStyle(0x4299e1, 1);
    this.uiGfx.fillRect(hpBarX, 38, hpBarWidth * expRatio, 6);

    this.hpText.setPosition(hpBarX + 45, 18);
    this.hpText.setText(`HP ${curHp} / ${maxHpVal}`);

    // ステータスボーナス
    const hpBonus = PLAYER.hpPts * HP_PER_PT;
    const atkBonus = PLAYER.atkPts * ATK_PER_PT;
    this.statBonusText.setText(`ボーナス: ❤️+${hpBonus}  ⚔️+${atkBonus}`);

    const filteredLines = lines.filter(l =>
      !l.includes('Lv ') && !l.includes('ボス ') && !l.includes('[E]') && !l.includes('[Shift]') &&
      !l.includes('[Q]') && !l.includes('[R]') && !l.includes('防具 ') && !l.includes('遺物 ') &&
      !SLOT_KEYS.some(s => l.includes(`${ARMOR_TYPES[s].slot}:`)) && !l.includes(weapon.name)
    );
    const hudInfo = [
      `💰 ${PLAYER.gold}G   pt: ${PLAYER.pts}`,
      ...filteredLines.slice(2)
    ];

    if (this.text) {
      this.text.setText(hudInfo.join('\n'));
    }

    // 2. 画面中央上：ボス専用HPバー
    if (main.boss && main.boss.hp > 0) {
      const boss = main.boss;
      const bCurHp = Math.max(0, Math.ceil(boss.hp));
      const bMaxHp = boss.max;
      const bRatio = Math.min(1, Math.max(0, bCurHp / bMaxHp));

      const bBarWidth = 360, bBarHeight = 16;
      const bBarX = (w - bBarWidth) / 2, bBarY = 24;

      this.uiGfx.fillStyle(0x0e1015, 0.85);
      this.uiGfx.fillRoundedRect(bBarX - 12, bBarY - 14, bBarWidth + 24, bBarHeight + 24, 6);
      this.uiGfx.lineStyle(2, 0xb15cff, 0.8);
      this.uiGfx.strokeRoundedRect(bBarX - 12, bBarY - 14, bBarWidth + 24, bBarHeight + 24, 6);

      this.uiGfx.fillStyle(0x1a202c, 1);
      this.uiGfx.fillRect(bBarX, bBarY, bBarWidth, bBarHeight);

      const bColor = boss.isShielded ? 0x4fd1c5 : (boss.ai && boss.ai.rage ? 0xff4444 : 0xb15cff);
      this.uiGfx.fillStyle(bColor, 1);
      this.uiGfx.fillRect(bBarX, bBarY, bBarWidth * bRatio, bBarHeight);

      this.uiGfx.lineStyle(1, 0xffffff, 0.6);
      this.uiGfx.strokeRect(bBarX, bBarY, bBarWidth, bBarHeight);

      this.bossHpText.setText(`BOSS HP ${bCurHp} / ${bMaxHp}${boss.isShielded ? ' [BARRIER]' : ''}`);
    } else {
      this.bossHpText.setText('');
    }

    // 3. 画面左下：現在の装備＆耐久値表示パネル
    const eqList = [
      { label: '武器', item: weapon },
      { label: '兜',   item: EQUIPPED.helmet },
      { label: '胸',   item: EQUIPPED.chest },
      { label: '脚',   item: EQUIPPED.legs },
      { label: '靴',   item: EQUIPPED.shoes },
      { label: '遺物', item: artifactEq }
    ];

    const eqPanelX = 10, eqPanelY = h - 155, eqPanelW = 210, eqPanelH = 145;

    this.uiGfx.fillStyle(0x0e1015, 0.85);
    this.uiGfx.fillRoundedRect(eqPanelX, eqPanelY, eqPanelW, eqPanelH, 6);
    this.uiGfx.lineStyle(1, 0x4a5568, 0.8);
    this.uiGfx.strokeRoundedRect(eqPanelX, eqPanelY, eqPanelW, eqPanelH, 6);

    const getItemName = (it) => {
      if (!it) return '';
      return it.label || it.name || '装備';
    };

    eqList.forEach((eq, i) => {
      const item = eq.item;
      const textObj = this.equipTexts[i];
      const lineY = eqPanelY + 12 + i * 22;

      if (!item) {
        textObj.setText(`${eq.label}: なし`).setColor('#718096');
      } else if (eq.label === '遺物') {
        textObj.setText(`遺物: ${getItemName(item)}`).setColor('#d98cff');
      } else {
        const durRatio = Math.min(1, Math.max(0, item.dur / item.durMax));
        const isBroken = item.dur <= 0;

        const nameText = `${eq.label}:${getItemName(item)}${plus(item)}`;
        textObj.setText(nameText).setColor(isBroken ? '#e5534b' : '#ffffff');

        const barX = eqPanelX + 130, barY = lineY + 3, barW = 65, barH = 8;

        this.uiGfx.fillStyle(0x1a202c, 1);
        this.uiGfx.fillRect(barX, barY, barW, barH);

        const durCol = durRatio > 0.5 ? 0x48bb78 : durRatio > 0.2 ? 0xecc94b : 0xf56565;
        this.uiGfx.fillStyle(durCol, 1);
        this.uiGfx.fillRect(barX, barY, barW * durRatio, barH);

        this.uiGfx.lineStyle(1, 0xa0aec0, 0.4);
        this.uiGfx.strokeRect(barX, barY, barW, barH);
      }
    });

    // 4. 右下：アクション＆アイテムアイコンUI
    const radius = 24, cy = h - 50;

    const dodgeCdLeft = Math.max(0, main.nextDodge - now);
    this.drawCoolDownSlot(w - 235, cy, radius, dodgeCdLeft, DODGE.cd, 0x2563eb, this.dodgeCdText);

    const subSkillCdLeft = Math.max(0, (main.nextSubSkill || 0) - now);
    const subSkillMaxCd = 4000;
    this.drawCoolDownSlot(w - 175, cy, radius, subSkillCdLeft, subSkillMaxCd, 0x4fd1c5, this.potSCntText);

    this.drawItemSlot(w - 115, cy, radius, POTIONS.full, 0xe53e3e, this.potFCntText);

    const skillCdLeft = Math.max(0, main.nextSkill - now);
    this.drawCoolDownSlot(w - 55, cy, radius, skillCdLeft, weapon.skill.cd, 0xd97706, this.skillCdText);
  }

  drawCoolDownSlot(cx, cy, radius, cdLeft, maxCd, bgCol, cdTextObj) {
    const ratio = Math.min(1, Math.max(0, cdLeft / maxCd));

    this.uiGfx.fillStyle(0x0e1015, 0.85);
    this.uiGfx.fillCircle(cx, cy, radius);
    this.uiGfx.lineStyle(2, bgCol, ratio > 0 ? 0.4 : 1.0);
    this.uiGfx.strokeCircle(cx, cy, radius);

    if (ratio > 0) {
      this.uiGfx.fillStyle(0x000000, 0.7);
      this.uiGfx.beginPath();
      this.uiGfx.moveTo(cx, cy);
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * ratio);
      this.uiGfx.arc(cx, cy, radius - 1, startAngle, endAngle, false);
      this.uiGfx.closePath();
      this.uiGfx.fillPath();

      cdTextObj.setText(`${(cdLeft / 1000).toFixed(1)}s`);
      cdTextObj.setColor('#ffd36a');
    } else {
      cdTextObj.setText('READY');
      cdTextObj.setColor('#48bb78');
    }
  }

  drawItemSlot(cx, cy, radius, count, col, cntTextObj) {
    const hasItem = count > 0;

    this.uiGfx.fillStyle(0x0e1015, 0.85);
    this.uiGfx.fillCircle(cx, cy, radius);
    this.uiGfx.lineStyle(2, hasItem ? col : 0x4a5568, hasItem ? 1.0 : 0.4);
    this.uiGfx.strokeCircle(cx, cy, radius);

    cntTextObj.setText(`x${count}`);
    cntTextObj.setColor(hasItem ? '#ffffff' : '#718096');
  }
}
