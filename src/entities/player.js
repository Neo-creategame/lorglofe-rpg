// src/entities/player.js
import { Q_SKILL_STATS } from '../config.js';
import { weapon, atkTotal, free } from '../utils.js';

// ★ Qスキル（3段階進化）の状態管理変数
export let qSkillLevel = 1;
export let qSkillHitCount = 0;

export const resetQSkill = () => {
  qSkillLevel = 1;
  qSkillHitCount = 0;
};

export const setQSkillLevel = lv => { qSkillLevel = lv; };
export const setQSkillHitCount = cnt => { qSkillHitCount = cnt; };

// 武器種ごとの通常攻撃・スキル挙動定義
export const BEHAVIORS = {
  sword: {
    attack: (s, dmg) => s.strike(s.ang, Math.PI * 0.55, weapon.range, dmg, 0xffffff),
    skill: (s, dmg) => s.strike(0, Math.PI, 86, Math.round(dmg * 1.5), 0xffd36a)
  },
  dual: {
    attack: (s, dmg) => {
      s.strike(s.ang, Math.PI * 0.4, weapon.range, dmg, 0xffffff);
      s.time.delayedCall(90, () => s.strike(s.ang, Math.PI * 0.4, weapon.range, dmg, 0xbfe3ff));
    },
    skill: (s, dmg) => {
      for (let i = 0; i < 4; i++) s.time.delayedCall(i * 90, () => s.strike(0, Math.PI, 60, Math.round(dmg * 0.8), 0xffd36a));
    }
  },
  bow: {
    attack: (s, dmg) => s.shoot(s.ang, dmg),
    skill: (s, dmg) => [-0.3, 0, 0.3].forEach(o => s.shoot(s.ang + o, dmg))
  },
  greatsword: {
    attack: (s, dmg) => {
      s.cameras.main.shake(100, 0.005);
      s.strike(s.ang, Math.PI * 0.75, weapon.range, dmg, 0xffa07a);
    },
    skill: (s, dmg) => s.strike(s.ang, Math.PI * 0.85, weapon.range + 20, Math.round(dmg * 1.8), 0xff4500, { knockback: 140, stunTime: 1500 })
  },
  spear: {
    attack: (s, dmg) => s.strike(s.ang, Math.PI * 0.2, weapon.range, dmg, 0xe0ffff),
    skill: (s, dmg) => s.spearDash(s.ang, Math.round(dmg * 1.6))
  },
  demon_sword: {
    attack: (s, dmg) => s.strike(s.ang, Math.PI * 0.75, weapon.range, Math.round(dmg * 1.3), 0x220033),
    skill: (s, dmg) => {
      const a = Math.random() * Math.PI * 2, d = 40;
      const mx = s.p.x + Math.cos(a) * d, my = s.p.y + Math.sin(a) * d;
      const m = s.spawnEnemy(mx, my, 50, { r: 12, color: 0xd98cff, speed: 160, touchDmg: 0, aggro: 400 });
      m.isAllyMinion = true;
      m.nextAllyAtk = 0;
      s.floatText(mx, my, '✦ソウルサモン', '#d98cff', '16px', 1000);
    }
  },
  eruption_wand: {
    attack: (s, dmg) => [-0.25, 0, 0.25].forEach(o => s.shoot(s.ang + o, dmg, 0xff4500)),
    skill: (s, dmg) => {
      const cam = s.cameras.main, ptr = s.input.activePointer, wp = cam.getWorldPoint(ptr.x, ptr.y);
      const cx = wp.x, cy = wp.y, radius = 90;
      const preGfx = s.add.graphics();
      preGfx.lineStyle(2, 0xff2200, 0.8).fillStyle(0xff4400, 0.2);
      preGfx.strokeCircle(cx, cy, radius).fillCircle(cx, cy, radius);

      s.time.delayedCall(400, () => {
        preGfx.destroy();
        for (let i = 0; i < 5; i++) {
          s.time.delayedCall(i * 120, () => {
            const ox = (Math.random() - 0.5) * radius * 1.4;
            const oy = (Math.random() - 0.5) * radius * 1.4;
            const ex = cx + ox, ey = cy + oy;
            const fx = s.add.circle(ex, ey, 32, 0xff2200, 0.7).setDepth(2);
            s.tweens.add({ targets: fx, alpha: 0, scale: 1.4, duration: 250, onComplete: () => fx.destroy() });

            s.enemies.forEach(e => {
              if (e.hp > 0 && !e.isAllyMinion && Math.hypot(e.c.x - ex, e.c.y - ey) < e.r + 32) {
                s.damage(e, Math.round(dmg * 0.9));
              }
            });
          });
        }
      });
    }
  },
  dragon_chain: {
    attack: (s, dmg) => s.strike(s.ang, Math.PI * 0.9, weapon.range, dmg, 0xffd36a),
    skill: (s, dmg) => {
      const p = s.p, now = s.time.now;
      const speed = 800, duration = 250, ang = s.ang;
      s.inv = now + duration + 150;

      const hitEnemies = new Set();

      s.time.addEvent({
        delay: 16,
        repeat: Math.floor(duration / 16),
        callback: () => {
          const sec = 0.016;
          const nx = p.x + Math.cos(ang) * speed * sec;
          const ny = p.y + Math.sin(ang) * speed * sec;
          if (free(nx, p.y, 11)) p.x = nx;
          if (free(p.x, ny, 11)) p.y = ny;

          const gh = s.add.circle(p.x, p.y, 16, 0xffd36a, 0.6).setDepth(1);
          s.tweens.add({ targets: gh, alpha: 0, duration: 200, onComplete: () => gh.destroy() });

          s.enemies.forEach(e => {
            if (e.hp > 0 && !e.isAllyMinion && !hitEnemies.has(e) && Math.hypot(e.c.x - p.x, e.c.y - p.y) < e.r + 28) {
              hitEnemies.add(e);
              s.damage(e, Math.round(dmg * 2.0));
            }
          });
        }
      });
    }
  },
  lightning_staff: {
    attack: (s, dmg) => s.shoot(s.ang, dmg, 0xffff00),
    skill: (s, dmg) => {
      const areaGfx = s.add.graphics().setDepth(2);
      let ticks = 0;

      s.time.addEvent({
        delay: 100,
        repeat: 9,
        callback: () => {
          ticks++;
          areaGfx.clear();
          const color = (ticks % 2 === 0) ? 0x00ffff : 0xffff00;
          areaGfx.lineStyle(3, color, 0.8).fillStyle(color, 0.15);
          areaGfx.strokeCircle(s.p.x, s.p.y, 80).fillCircle(s.p.x, s.p.y, 80);

          s.enemies.forEach(e => {
            if (e.hp > 0 && !e.isAllyMinion && Math.hypot(e.c.x - s.p.x, e.c.y - s.p.y) < e.r + 80) {
              s.damage(e, Math.round(dmg * 0.3));
            }
          });

          if (ticks >= 10) {
            areaGfx.destroy();
          }
        }
      });

      const targets = s.enemies
        .filter(e => e.hp > 0 && !e.isAllyMinion && Math.hypot(e.c.x - s.p.x, e.c.y - s.p.y) <= 250)
        .sort((a, b) => {
          const distA = Math.hypot(a.c.x - s.p.x, a.c.y - s.p.y);
          const distB = Math.hypot(b.c.x - s.p.x, b.c.y - s.p.y);
          return distA - distB;
        })
        .slice(0, 3);

      if (targets.length > 0) {
        s.cameras.main.shake(80, 0.008);

        targets.forEach(e => {
          const boltGfx = s.add.graphics().setDepth(3);
          boltGfx.lineStyle(6, 0xffffff, 0.9);
          boltGfx.lineBetween(e.c.x, e.c.y - 200, e.c.x, e.c.y);
          boltGfx.lineStyle(2, 0x00ffff, 1.0);
          boltGfx.lineBetween(e.c.x, e.c.y - 200, e.c.x, e.c.y);

          s.time.delayedCall(80, () => boltGfx.destroy());

          s.damage(e, Math.round(dmg * 1.2));
          s.floatText(e.c.x, e.c.y - 20, '⚡落雷!', '#00ffff', '16px', 800);
        });
      }
    }
  }
};
