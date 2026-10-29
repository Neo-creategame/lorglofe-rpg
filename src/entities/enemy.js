// src/entities/enemy.js
import { T, BOSS, ENEMY } from '../config.js';
import { rooms, solid } from '../map.js';

// 10の倍数階（15F含む特殊階層）の判定関数
export const isTenFloor = f => Math.floor(f) === 15 || (Math.floor(f) >= 15 && Math.floor(f) % 10 === 0);

// ボス攻撃力の階層補正計算
export const bossAtkFloorMult = floor => {
  const baseMult = 1 + 0.15 * (Math.max(1, floor) - 1);
  if (isTenFloor(floor)) {
    return baseMult * BOSS.specialBossAtkMult;
  }
  return baseMult;
};

const FAN_SPREAD = 0.9;
const ringPath = (g, x, y, r) => {
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (i) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.closePath().strokePath();
};

// ボスの攻撃パターン定義
export const BOSS_PATTERNS = {
  ring: {
    name: '全方位弾', windup: 800,
    telegraph: (g, e, t) => { g.lineStyle(3, 0xff4444, 0.4 + 0.5 * t); ringPath(g, e.c.x, e.c.y, e.r + 10 + 50 * t); },
    start: (s, e, rage) => { const n = rage ? 18 : 12, off = Math.random() * Math.PI * 2; for (let i = 0; i < n; i++) s.fireShot(e.c.x, e.c.y, off + (i * Math.PI * 2) / n, 170); }
  },
  fan: {
    name: '扇状射撃', windup: 600,
    telegraph: (g, e, t) => { g.lineStyle(2, 0xff4444, 0.3 + 0.5 * t); for (const o of [-1, 0, 1]) { const q = e.ai.aim + (o * FAN_SPREAD) / 2; g.lineBetween(e.c.x, e.c.y, e.c.x + Math.cos(q) * 300, e.c.y + Math.sin(q) * 300); } },
    start: (s, e, rage) => { const n = rage ? 7 : 5; for (let i = 0; i < n; i++) s.fireShot(e.c.x, e.c.y, e.ai.aim + (i / (n - 1) - 0.5) * FAN_SPREAD, 240); }
  },
  charge: {
    name: '突進', windup: 900,
    telegraph: (g, e, t) => { const len = (BOSS.dashSpeed * BOSS.dashTime) / 1000, a = e.ai.aim; g.lineStyle(e.r * 2, 0xff4444, 0.12 + 0.25 * t).lineBetween(e.c.x, e.c.y, e.c.x + Math.cos(a) * len, e.c.y + Math.sin(a) * len); },
    start: (s, e) => { const ai = e.ai; ai.state = 'dash'; ai.vx = Math.cos(ai.aim) * BOSS.dashSpeed; ai.vy = Math.sin(ai.aim) * BOSS.dashSpeed; ai.dashEnd = s.time.now + BOSS.dashTime; }
  },
  call: {
    name: '手下召喚', windup: 1000,
    telegraph: (g, e, t) => { g.lineStyle(2, 0xb15cff, 0.4 + 0.5 * t); ringPath(g, e.c.x, e.c.y, e.r + 30 + 20 * Math.sin(t * Math.PI * 4)); },
    start: (s, e, rage) => {
      const cnt = rage ? 2 : 1, eh = Math.round(ENEMY.hp * (1 + 0.25 * (s.floor - 1)));
      for (let i = 0; i < cnt; i++) {
        if (s.enemies.filter(x => !x.boss).length >= BOSS.maxMinions) break;
        const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 40;
        const sx = e.c.x + Math.cos(a) * d, sy = e.c.y + Math.sin(a) * d;
        const minion = s.spawnEnemy(sx, sy, eh);
        minion.isMinion = true;
        s.floatText(sx, sy, '✦召喚', '#b15cff', '14px', 800);
      }
    }
  },
  homing: {
    name: '追尾弾', windup: 700,
    telegraph: (g, e, t) => { g.lineStyle(2, 0xffa500, 0.3 + 0.6 * t); ringPath(g, e.c.x, e.c.y, e.r + 20); },
    start: (s, e) => {
      const speed = 120, dur = 3500;
      const o = s.add.circle(e.c.x, e.c.y, 9, 0xffa500).setStrokeStyle(2, 0xffffff).setDepth(1);
      const startTime = s.time.now;

      const timer = s.time.addEvent({
        delay: 30, repeat: Math.floor(dur / 30),
        callback: () => {
          if (!o || !o.active) return;
          const p = s.p, now = s.time.now;
          const a = Math.atan2(p.y - o.y, p.x - o.x);
          o.x += Math.cos(a) * (speed * 0.03);
          o.y += Math.sin(a) * (speed * 0.03);

          if (Math.hypot(p.x - o.x, p.y - o.y) < 11 + 9 && now > s.inv && now > s.dodgeUntil) {
            const dmg = Math.round(BOSS.shotDmg * 1.3 * bossAtkFloorMult(s.floor));
            s.hurtPlayer(dmg);
            s.inv = now + 600;
            o.destroy();
            timer.destroy();
          } else if (now - startTime >= dur || solid(o.x, o.y)) {
            o.destroy();
            timer.destroy();
          }
        }
      });
    }
  },
  stomp: {
    name: '衝撃波', windup: 1100,
    telegraph: (g, e, t) => {
      g.fillStyle(0xff2222, 0.15 + 0.25 * t);
      g.fillCircle(e.c.x, e.c.y, 130 * t);
      g.lineStyle(3, 0xff2222, 0.6 + 0.4 * t);
      ringPath(g, e.c.x, e.c.y, 130);
    },
    start: (s, e) => {
      const radius = 130;
      s.cameras.main.shake(150, 0.01);
      const fx = s.add.circle(e.c.x, e.c.y, radius, 0xff4444, 0.5).setDepth(1);
      s.tweens.add({ targets: fx, alpha: 0, duration: 300, onComplete: () => fx.destroy() });

      const d = Math.hypot(s.p.x - e.c.x, s.p.y - e.c.y);
      if (d < radius + 11 && s.time.now > s.inv && s.time.now > s.dodgeUntil) {
        const dmg = Math.round(BOSS.touchDmg * 1.8 * bossAtkFloorMult(s.floor));
        s.hurtPlayer(dmg);
        s.inv = s.time.now + 800;
      }
    }
  },
  eruption: {
    name: '大噴火', windup: 1800,
    telegraph: (g, e, t) => {
      const rm = rooms[1] || rooms[0];
      const safeRadius = 220;
      if (!e.ai.safeX) {
        e.ai.safeX = g.scene.p.x;
        e.ai.safeY = g.scene.p.y;
      }
      g.fillStyle(0xff2222, 0.1 + 0.3 * t);
      g.lineStyle(1, 0xff4444, 0.3 + 0.5 * t);
      for (let y = rm.y; y < rm.y + rm.h; y++) {
        for (let x = rm.x; x < rm.x + rm.w; x++) {
          const cx = x * T + T / 2, cy = y * T + T / 2;
          if (Math.hypot(cx - e.ai.safeX, cy - e.ai.safeY) > safeRadius) {
            g.fillRect(x * T + 2, y * T + 2, T - 4, T - 4);
          }
        }
      }
    },
    start: (s, e) => {
      s.cameras.main.shake(400, 0.02);
      const rm = rooms[1] || rooms[0];
      const safeRadius = 220;
      const fxGroup = [];

      const sx = e.ai.safeX || s.p.x;
      const sy = e.ai.safeY || s.p.y;

      for (let y = rm.y; y < rm.y + rm.h; y++) {
        for (let x = rm.x; x < rm.x + rm.w; x++) {
          const cx = x * T + T / 2, cy = y * T + T / 2;
          if (Math.hypot(cx - sx, cy - sy) > safeRadius) {
            const fx = s.add.rectangle(cx, cy, T - 2, T - 2, 0xff2200, 0.8).setDepth(1);
            fxGroup.push(fx);
          }
        }
      }

      s.tweens.add({
        targets: fxGroup, alpha: 0, duration: 500,
        onComplete: () => fxGroup.forEach(f => f.destroy())
      });

      const distFromSafe = Math.hypot(s.p.x - sx, s.p.y - sy);
      if (distFromSafe > safeRadius && s.time.now > s.inv && s.time.now > s.dodgeUntil) {
        const dmg = Math.round(BOSS.touchDmg * 2.5 * bossAtkFloorMult(s.floor));
        s.hurtPlayer(dmg);
        s.inv = s.time.now + 1000;
      }

      delete e.ai.safeX;
      delete e.ai.safeY;
    }
  },
  blasterLaser: {
    name: 'ガスターブラスター', windup: 1200,
    telegraph: (g, e, t) => {
      const now = g.scene.time.now;
      if (!e.ai.blasters) return;

      g.lineStyle(25, 0xff0044, 0.2 + 0.3 * t);
      e.ai.blasters.forEach(b => {
        if (now - b.startTime < 700) {
          b.aim = Math.atan2(g.scene.p.y - b.y, g.scene.p.x - b.x);
        }
        const lx = b.x + Math.cos(b.aim) * 800;
        const ly = b.y + Math.sin(b.aim) * 800;
        g.lineBetween(b.x, b.y, lx, ly);

        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(b.x, b.y, 14);
      });
    },
    start: (s, e) => {
      const blasters = e.ai.blasters || [];
      s.cameras.main.shake(300, 0.015);

      blasters.forEach(b => {
        const lx = b.x + Math.cos(b.aim) * 800;
        const ly = b.y + Math.sin(b.aim) * 800;

        const beam = s.add.line(0, 0, b.x, b.y, lx, ly, 0xff2266).setOrigin(0, 0).setLineWidth(26, 26).setDepth(2);
        s.tweens.add({ targets: beam, alpha: 0, duration: 450, onComplete: () => beam.destroy() });

        const p = s.p;
        const dx = lx - b.x, dy = ly - b.y;
        const lenSq = dx * dx + dy * dy;
        const tVal = Math.max(0, Math.min(1, ((p.x - b.x) * dx + (p.y - b.y) * dy) / lenSq));
        const projX = b.x + tVal * dx, projY = b.y + tVal * dy;

        if (Math.hypot(p.x - projX, p.y - projY) < 13 + 11 && s.time.now > s.inv && s.time.now > s.dodgeUntil) {
          const dmg = Math.round(BOSS.shotDmg * 2.2 * bossAtkFloorMult(s.floor));
          s.hurtPlayer(dmg);
          s.inv = s.time.now + 600;
        }
      });

      delete e.ai.blasters;
    }
  }
};

// ボスのAI実行ロジック
export function updateBossAi(scene, e, now, dt, ex, ey, d) {
  const ai = e.ai;
  const rage = e.hp <= e.max * BOSS.rageAt;
  const cd = rage ? BOSS.cdRage : BOSS.cd;

  if (rage && !ai.rage) {
    ai.rage = true;
    scene.floatText(e.c.x, e.c.y - e.r - 30, '激昂!', '#ff6a6a', '20px', 1400);
  }

  // 特殊階層でのバリア＆結晶発生処理
  if (isTenFloor(scene.floor) && !e.isShielded) {
    ai.nextShieldIdx = ai.nextShieldIdx || 0;
    if (ai.nextShieldIdx < BOSS.shieldThresholds.length) {
      const thresholdHp = e.max * BOSS.shieldThresholds[ai.nextShieldIdx];
      if (e.hp <= thresholdHp) {
        e.isShielded = true;
        ai.nextShieldIdx++;
        scene.spawnMagicCrystals();
        scene.popup('★ボスが魔力バリアを展開！四隅の結晶を破壊せよ！', '#4fd1c5', 1);
      }
    }
  }

  // シールドエフェクト更新
  if (e.isShielded) {
    if (!e.shieldGfx) e.shieldGfx = scene.add.graphics().setDepth(2);
    e.shieldGfx.clear().lineStyle(4, 0x4fd1c5, 0.9).strokeCircle(e.c.x, e.c.y, e.r + 8);
  } else if (e.shieldGfx) {
    e.shieldGfx.destroy();
    delete e.shieldGfx;
  }

  if (ai.state === 'chase') {
    if (now < ai.next || d > BOSS.attackRange) return false;

    let names = Object.keys(BOSS_PATTERNS).filter(k => k !== ai.last);

    if (scene.floor < 3.5 || scene.enemies.filter(x => !x.boss).length >= BOSS.maxMinions) {
      names = names.filter(k => k !== 'call');
    }
    if (scene.floor < 3.5) {
      names = names.filter(k => k !== 'homing');
    }
    if (scene.floor < 5.5) {
      names = names.filter(k => k !== 'stomp');
    }
    if (scene.floor < 10) {
      names = names.filter(k => k !== 'eruption');
    }
    if (scene.floor < 15) {
      names = names.filter(k => k !== 'blasterLaser');
    }

    if (names.length === 0) names = ['ring', 'fan', 'charge'];

    ai.pat = ai.last = names[Math.floor(Math.random() * names.length)];
    ai.aim = Math.atan2(ey, ex);
    ai.winds = BOSS_PATTERNS[ai.pat].windup * (rage ? 0.7 : 1);
    ai.until = now + ai.winds;
    ai.state = 'windup';

    if (ai.pat === 'blasterLaser') {
      const count = rage ? 4 : 3;
      ai.blasters = [];
      const rm = rooms[1] || rooms[0];
      for (let i = 0; i < count; i++) {
        const bx = (rm.x + 2 + Math.floor(Math.random() * (rm.w - 4))) * T;
        const by = (rm.y + 2 + Math.floor(Math.random() * (rm.h - 4))) * T;
        ai.blasters.push({ x: bx, y: by, aim: 0, startTime: now });
      }
    }
    scene.floatText(e.c.x, e.c.y - e.r - 20, BOSS_PATTERNS[ai.pat].name, '#ffb07a', '16px', 900);
    return true;
  }

  if (ai.state === 'windup') {
    if (now >= ai.until) {
      ai.state = 'chase';
      ai.next = now + cd;
      BOSS_PATTERNS[ai.pat].start(scene, e, rage);
    }
    return true;
  }

  // 突進（charge）状態の移動計算
  const sec = Math.min(dt, 50) / 1000;
  const nx = e.c.x + ai.vx * sec;
  const ny = e.c.y + ai.vy * sec;
  let moved = false;

  if (scene.free(nx, e.c.y, e.r)) { e.c.x = nx; moved = true; }
  if (scene.free(e.c.x, ny, e.r)) { e.c.y = ny; moved = true; }

  if (!moved || now >= ai.dashEnd) {
    ai.state = 'chase';
    ai.next = now + cd;
  }
  return true;
}
