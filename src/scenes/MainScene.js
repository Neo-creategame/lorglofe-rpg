// src/scenes/MainScene.js
import {
  T, W, H, SEED_BASE, CAM, PLAYER_HP, ENEMY, BOSS,
  STAIRS_OPEN, STAIRS_LOCKED, DODGE, DURABILITY,
  PLAYER, EXP_PER_KILL, expNeed, DROP_RATE, ARTIFACT,
  POTION_DEF, POTIONS, DEATH, SAVE, Q_SKILL_STATS, TOWN_SHOPS
} from '../config.js';
import {
  g, rooms, genFloor, genTown, solid, free, setMapData
} from '../map.js';
import {
  weapon, artifactEq, maxHp, atkTotal, saveGame,
  isSub, nextFloor, floorIdx, plus,
  armorStats, wear, wearArmor,
  addToPack, goldFor, bossDmgMult,
  angDiff, takeDamage, durLabel, armorLines, BACKPACK, syncPotionCounts
} from '../utils.js';
import {
  WEAPONS, rollWeapon, rollArmor, rollArtifact,
  randomSlot, armorLabel
} from '../entities/items.js';
import {
  isTenFloor, bossAtkFloorMult, updateBossAi, BOSS_PATTERNS
} from '../entities/enemy.js';
import {
  BEHAVIORS, qSkillLevel, qSkillHitCount, resetQSkill,
  setQSkillLevel, setQSkillHitCount
} from '../entities/player.js';

export class MainScene extends Phaser.Scene {
  constructor() { super('main'); }

  init(data) {
    this.floor = data && data.floor != null ? data.floor : 0;
    this.carryHp = data && data.hp;
    this.notice = data && data.notice;
    resetQSkill();

    if (this.floor === 0) {
      const townData = genTown();
      setMapData(townData.g, townData.rooms);
      return;
    }
    let s = SEED_BASE + floorIdx(this.floor);
    let res = genFloor(s, this.floor);
    while (res.rooms.length < 2) res = genFloor(++s, this.floor);
    this.seed = s;
    setMapData(res.g, res.rooms);
  }

  create() {
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
    this.cameras.main.setBounds(0, 0, W * T, H * T);
    const map = this.add.graphics();
    map.fillStyle(this.floor === 0 ? 0x2f3b2c : 0x222836, 1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (g[y][x] === 0) map.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
      }
    }

    this.stairs = null;
    this.altar = null;
    this.enemies = [];
    this.arrows = [];
    this.boss = null;
    this.smith = null;
    this.services = [];
    this.shots = [];
    this.stairsOpen = true;
    this.stairsGfx = null;

    if (this.floor === 0) this.buildTown();
    else this.buildDungeon();

    this.bars = this.add.graphics().setDepth(5);
    this.setupPlayer();
    if (this.notice) this.popup(this.notice, '#ff9a8a');
  }

  buildTown() {
    const st = { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e8eaf0' };
    TOWN_SHOPS.forEach(([name, bx, by]) => {
      this.add.rectangle((bx + 3) * T, (by + 2) * T, 6 * T - 2, 4 * T - 2, 0x4a3f35).setStrokeStyle(2, 0x8a7a66);
      this.add.text((bx + 3) * T, (by + 2) * T, name, st).setOrigin(0.5);
    });
    this.stairs = { x: 36 * T + T / 2, y: 22 * T + T / 2 };
    this.add.circle(this.stairs.x, this.stairs.y, 16, 0x7c5cff).setStrokeStyle(2, 0xffffff);
    this.add.text(this.stairs.x, this.stairs.y - 30, `${nextFloor(SAVE.cleared)}F 入口`, st).setOrigin(0.5);

    this.altar = { x: 20 * T + T / 2, y: 14 * T + T / 2 };
    this.add.rectangle(this.altar.x, this.altar.y, 20, 20, 0x4fd1c5).setAngle(45).setStrokeStyle(2, 0xffffff);
    this.add.text(this.altar.x, this.altar.y - 28, 'ステータス台', st).setOrigin(0.5);

    this.smith = { x: 31 * T + T / 2, y: 10 * T + T / 2 };
    this.add.rectangle(this.smith.x, this.smith.y, 20, 20, 0xe08a3c).setStrokeStyle(2, 0xffffff);
    this.add.text(this.smith.x, this.smith.y - 28, '鍛冶台', st).setOrigin(0.5);

    this.services = [
      { key: 'shop', tx: 9, ty: 9, label: 'お店' },
      { key: 'inn', tx: 20, ty: 9, label: '宿屋' },
      { key: 'storage', tx: 9, ty: 18, label: '倉庫' }
    ].map(s => ({ ...s, x: s.tx * T + T / 2, y: s.ty * T + T / 2 }));

    this.services.forEach(s => {
      this.add.rectangle(s.x, s.y, 20, 20, 0xc9a24a).setStrokeStyle(2, 0xffffff);
      this.add.text(s.x, s.y - 28, s.label, st).setOrigin(0.5);
    });
  }

  buildDungeon() {
    const ctr = o => ({ x: (o.x + (o.w >> 1)) * T + T / 2, y: (o.y + (o.h >> 1)) * T + T / 2 });
    const s0 = ctr(rooms[0]);
    const dist0 = o => Math.hypot(ctr(o).x - s0.x, ctr(o).y - s0.y);
    this.stairs = ctr(rooms.slice(1).reduce((a, b) => dist0(b) > dist0(a) ? b : a));
    this.stairsOpen = !isSub(this.floor) || this.floor <= SAVE.cleared;
    this.stairsGfx = this.add.rectangle(this.stairs.x, this.stairs.y, 22, 22, this.stairsOpen ? STAIRS_OPEN : STAIRS_LOCKED).setStrokeStyle(2, 0xffffff);
    this.add.text(this.stairs.x, this.stairs.y, '↑', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#1d2230' }).setOrigin(0.5);

    const eh = Math.round(ENEMY.hp * (1 + 0.25 * (this.floor - 1)));
    this.enemies = [];

    if (!isSub(this.floor)) {
      rooms.slice(1).forEach(rm => {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          const tx = rm.x + 1 + Math.floor(Math.random() * (rm.w - 2));
          const ty = rm.y + 1 + Math.floor(Math.random() * (rm.h - 2));
          this.spawnEnemy(tx * T + T / 2, ty * T + T / 2, eh);
        }
      });
    }

    if (isSub(this.floor)) {
      const hpMult = isTenFloor(this.floor) ? BOSS.hpMultSpecial : BOSS.hpMult;
      this.boss = this.spawnEnemy(this.stairs.x, this.stairs.y, Math.round(eh * hpMult), BOSS, true);
    }
  }

  spawnEnemy(x, y, hp, def = ENEMY, boss = false) {
    const c = this.add.circle(x, y, def.r, def.color).setDepth(boss ? 1 : 0);
    if (boss) c.setStrokeStyle(3, 0xffffff);
    const e = {
      c, hp, max: hp, r: def.r, speed: def.speed, aggro: def.aggro, touch: def.touchDmg, boss,
      ai: boss ? { state: 'chase', next: this.time.now + BOSS.firstDelay, last: null, rage: false } : null,
      stunUntil: 0
    };
    this.enemies.push(e);
    return e;
  }

  spawnMagicCrystals() {
    const rm = rooms[1] || rooms[0];
    const corners = [
      { x: (rm.x + 2) * T, y: (rm.y + 2) * T },
      { x: (rm.x + rm.w - 2) * T, y: (rm.y + 2) * T },
      { x: (rm.x + 2) * T, y: (rm.y + rm.h - 2) * T },
      { x: (rm.x + rm.w - 2) * T, y: (rm.y + rm.h - 2) * T }
    ];

    const crystalHp = Math.round(ENEMY.hp * (1 + 0.25 * (this.floor - 1)) * 2.5);
    corners.forEach(c => {
      const e = this.spawnEnemy(c.x, c.y, crystalHp, { r: 14, color: 0x4fd1c5, speed: 0, aggro: 0, touchDmg: 5 });
      e.isCrystal = true;
    });
  }

  hitEffect(x, y, color = 0xffffff) {
    const flash = this.add.circle(x, y, 16, color, 0.9).setDepth(5);
    this.tweens.add({
      targets: flash, scale: 1.8, alpha: 0, duration: 120,
      onComplete: () => flash.destroy()
    });

    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const ang = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5);
      const dist = 15 + Math.random() * 20;
      const px = x + Math.cos(ang) * 4;
      const py = y + Math.sin(ang) * 4;

      const p = this.add.circle(px, py, 3, color, 1).setDepth(5);
      this.tweens.add({
        targets: p,
        x: px + Math.cos(ang) * dist,
        y: py + Math.sin(ang) * dist,
        scale: 0.2, alpha: 0, duration: 150 + Math.random() * 50,
        onComplete: () => p.destroy()
      });
    }
  }

  muzzleFlash(x, y, ang, color = 0xffe08a) {
    const flash = this.add.graphics().setDepth(3);
    flash.fillStyle(color, 0.9).beginPath().moveTo(x, y);
    const spread = Math.PI * 0.35, len = 24;
    flash.lineTo(x + Math.cos(ang - spread) * len, y + Math.sin(ang - spread) * len);
    flash.lineTo(x + Math.cos(ang) * (len * 1.4), y + Math.sin(ang) * (len * 1.4));
    flash.lineTo(x + Math.cos(ang + spread) * len, y + Math.sin(ang + spread) * len);
    flash.closePath().fillPath();

    this.tweens.add({
      targets: flash, alpha: 0, scale: 1.3, duration: 90,
      onComplete: () => flash.destroy()
    });
  }

  setupPlayer() {
    const r0 = rooms[0];
    this.start = { x: (r0.x + (r0.w >> 1)) * T + T / 2, y: (r0.y + (r0.h >> 1)) * T + T / 2 };
    this.p = this.add.circle(this.start.x, this.start.y, 11, 0x6fb6ff).setDepth(2);
    this.hp = this.carryHp != null ? this.carryHp : maxHp();
    this.inv = this.time.now + 800;
    this.dodge = null; this.dodgeUntil = 0; this.nextDodge = 0; this.leaving = false;
    this.cameras.main.fadeIn(300);
    this.fx = this.add.graphics();
    this.warn = this.add.graphics().setDepth(1);
    this.aim = this.add.graphics();
    this.cameras.main.setZoom(CAM.zoom);
    this.cameras.main.startFollow(this.p, true, 0.12, 0.12);

    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      atk: 'SPACE', skill: 'E', bag: 'I', dodge: 'SHIFT', use: 'F', pause: 'TAB',
      subSkill: 'Q', potF: 'R', bossWeapon1: 'ONE', bossWeapon2: 'TWO', bossWeapon3: 'THREE', bossWeapon4: 'FOUR'
    });

    this.input.on('pointerdown', () => this.attack());
    this.nextAtk = 0; this.nextSkill = 0; this.ang = 0;
    this.hud = this.scene.get('hud');
  }

  obtainBossWeapon(type) {
    const item = rollWeapon(type, Math.max(10, this.floor));
    if (addToPack(item)) {
      this.popup(`✦ボス武器入手:${item.name}`, '#ffd36a');
    } else {
      this.popup('バッグが満杯です', '#ff9a8a');
    }
  }

  spearDash(ang, dmg) {
    const p = this.p, now = this.time.now;
    const speed = 650, duration = 220;
    this.inv = now + duration + 100;
    const hitEnemies = new Set();
    this.time.addEvent({
      delay: 16,
      repeat: Math.floor(duration / 16),
      callback: () => {
        const sec = 0.016;
        const nx = p.x + Math.cos(ang) * speed * sec;
        const ny = p.y + Math.sin(ang) * speed * sec;
        if (free(nx, p.y, 11)) p.x = nx;
        if (free(p.x, ny, 11)) p.y = ny;

        const gh = this.add.rectangle(p.x, p.y, 20, 6, 0xe0ffff, 0.5).setRotation(ang).setDepth(1);
        this.tweens.add({ targets: gh, alpha: 0, duration: 200, onComplete: () => gh.destroy() });

        for (const e of this.enemies) {
          if (e.hp > 0 && !e.isAllyMinion && !hitEnemies.has(e) && Math.hypot(e.c.x - p.x, e.c.y - p.y) < e.r + 20) {
            hitEnemies.add(e);
            this.damage(e, dmg);
          }
        }
      }
    });
  }

  update(t, dt) {
    const k = this.keys, p = this.p, cam = this.cameras.main, now = this.time.now;
    if (Phaser.Input.Keyboard.JustDown(k.pause) && !this.leaving) {
      this.scene.pause();
      this.scene.launch('pause', { floor: this.floor });
      return;
    }

    if (this.floor !== 0 && artifactEq && artifactEq.typeKey === 'regen' && this.hp < maxHp()) {
      this.regenTimer = (this.regenTimer || 0) + dt;
      if (this.regenTimer >= 1000) {
        this.regenTimer -= 1000;
        this.hp = Math.min(maxHp(), this.hp + artifactEq.val);
        this.floatText(p.x, p.y - 10, `+${artifactEq.val}`, '#7cf0a0', '12px', 500);
      }
    }

    const dx = (k.right.isDown || k.right2.isDown) - (k.left.isDown || k.left2.isDown);
    const dy = (k.down.isDown || k.down2.isDown) - (k.up.isDown || k.up2.isDown);
    if (Phaser.Input.Keyboard.JustDown(k.dodge) && !this.dodge && now >= this.nextDodge && !this.leaving) {
      let ux = dx, uy = dy;
      if (!ux && !uy) { ux = Math.cos(this.ang); uy = Math.sin(this.ang); }
      const m = Math.hypot(ux, uy);
      this.dodge = { vx: ux / m, vy: uy / m, end: now + DODGE.time };
      this.dodgeUntil = now + DODGE.time + DODGE.grace;
      this.nextDodge = now + DODGE.cd;
    }

    const moveSpeedMult = weapon ? (weapon.speedMult || 1.0) : 1.0;

    if (this.dodge) {
      const v = DODGE.dist / DODGE.time * (Math.min(dt, 50) / 1000);
      const nx = p.x + this.dodge.vx * v, ny = p.y + this.dodge.vy * v;
      if (free(nx, p.y, 11)) p.x = nx;
      if (free(p.x, ny, 11)) p.y = ny;
      const gh = this.add.circle(p.x, p.y, 11, 0x6fb6ff, 0.4).setDepth(1);
      this.tweens.add({ targets: gh, alpha: 0, duration: 250, onComplete: () => gh.destroy() });
      if (now >= this.dodge.end) this.dodge = null;
    } else if ((dx || dy) && !this.leaving) {
      const v = 190 * moveSpeedMult * (dt / 1000) / Math.hypot(dx, dy);
      const nx = p.x + dx * v, ny = p.y + dy * v;
      if (free(nx, p.y, 11)) p.x = nx;
      if (free(p.x, ny, 11)) p.y = ny;
    }

    const ptr = this.input.activePointer;
    const wp = cam.getWorldPoint(ptr.x, ptr.y);
    this.ang = Math.atan2(wp.y - p.y, wp.x - p.x);
    this.aim.clear().lineStyle(2, 0xffffff, 0.5).lineBetween(p.x, p.y, p.x + Math.cos(this.ang) * 20, p.y + Math.sin(this.ang) * 20);

    if (Phaser.Input.Keyboard.JustDown(k.atk)) this.attack();
    if (Phaser.Input.Keyboard.JustDown(k.skill)) this.skill();

    if (Phaser.Input.Keyboard.JustDown(k.bossWeapon1)) this.obtainBossWeapon('demon_sword');
    if (Phaser.Input.Keyboard.JustDown(k.bossWeapon2)) this.obtainBossWeapon('eruption_wand');
    if (Phaser.Input.Keyboard.JustDown(k.bossWeapon3)) this.obtainBossWeapon('dragon_chain');
    if (Phaser.Input.Keyboard.JustDown(k.bossWeapon4)) this.obtainBossWeapon('lightning_staff');

    if (Phaser.Input.Keyboard.JustDown(k.subSkill)) this.subSkill();
    if (Phaser.Input.Keyboard.JustDown(k.potF)) this.usePotion('full');
    if (Phaser.Input.Keyboard.JustDown(k.bag) && !this.leaving) {
      this.scene.pause();
      this.scene.launch('backpack');
      return;
    }

    this.updateArrows(dt);
    this.updateShots(dt, now);

    const nearStairs = Math.hypot(p.x - this.stairs.x, p.y - this.stairs.y) < 24;
    if (nearStairs && Phaser.Input.Keyboard.JustDown(k.use) && !this.leaving) {
      if (this.stairsOpen) this.goUp();
      else this.popup('階段は閉じている。ボスを倒そう', '#ff9a8a');
    }

    const nearAltar = this.altar && Math.hypot(p.x - this.altar.x, p.y - this.altar.y) < 28;
    if (nearAltar && Phaser.Input.Keyboard.JustDown(k.use) && !this.leaving) {
      this.scene.pause();
      this.scene.launch('stats');
    }

    const nearSmith = this.smith && Math.hypot(p.x - this.smith.x, p.y - this.smith.y) < 28;
    if (nearSmith && Phaser.Input.Keyboard.JustDown(k.use) && !this.leaving) {
      this.scene.pause();
      this.scene.launch('blacksmith');
    }

    const near = this.services.find(s => Math.hypot(p.x - s.x, p.y - s.y) < 28);
    if (near && Phaser.Input.Keyboard.JustDown(k.use) && !this.leaving) {
      this.scene.pause();
      this.scene.launch(near.key);
    }

    // 敵・味方ミニオンの行動処理
    for (const e of this.enemies) {
      if (e.stunUntil && now < e.stunUntil) continue;

      if (e.isAllyMinion) {
        const targets = this.enemies.filter(x => x !== e && !x.isAllyMinion && x.hp > 0);
        if (targets.length > 0) {
          const target = targets.reduce((nearest, curr) => {
            const d1 = Math.hypot(nearest.c.x - e.c.x, nearest.c.y - e.c.y);
            const d2 = Math.hypot(curr.c.x - e.c.x, curr.c.y - e.c.y);
            return d2 < d1 ? curr : nearest;
          });
          const tx = target.c.x - e.c.x, ty = target.c.y - e.c.y, td = Math.hypot(tx, ty);
          if (td > 1) {
            const v = e.speed * (dt / 1000) / td;
            const nx = e.c.x + tx * v, ny = e.c.y + ty * v;
            if (free(nx, e.c.y, e.r)) e.c.x = nx;
            if (free(e.c.x, ny, e.r)) e.c.y = ny;
          }

          if (td < e.r + target.r && now >= (e.nextAllyAtk || 0)) {
            e.nextAllyAtk = now + 500;
            const allyAtk = Math.round(atkTotal(this) * 0.6);
            this.damage(target, allyAtk);
            this.floatText(e.c.x, e.c.y - 10, '攻撃!', '#d98cff', '12px', 400);
          }
        }
        continue;
      }

      const allyTargets = [
        { obj: p, r: 11, isPlayer: true, x: p.x, y: p.y },
        ...this.enemies.filter(x => x.isAllyMinion && x.hp > 0).map(x => ({ obj: x, r: x.r, isPlayer: false, x: x.c.x, y: x.c.y }))
      ];

      const nearestTarget = allyTargets.reduce((nearest, curr) => {
        const d1 = Math.hypot(nearest.x - e.c.x, nearest.y - e.c.y);
        const d2 = Math.hypot(curr.x - e.c.x, curr.y - e.c.y);
        return d2 < d1 ? curr : nearest;
      });

      const ex = nearestTarget.x - e.c.x, ey = nearestTarget.y - e.c.y, d = Math.hypot(ex, ey);
      const busy = e.boss && updateBossAi(this, e, now, dt, ex, ey, d);

      if (!busy && d < e.aggro && d > 1) {
        const v = e.speed * (dt / 1000) / d;
        const nx = e.c.x + ex * v, ny = e.c.y + ey * v;
        if (free(nx, e.c.y, e.r)) e.c.x = nx;
        if (free(e.c.x, ny, e.r)) e.c.y = ny;
      }

      let touch = e.boss && e.ai.state === 'dash' ? Math.round(e.touch * BOSS.dashMult) : e.touch;
      if (e.boss) touch = Math.round(touch * bossAtkFloorMult(this.floor));

      if (d < nearestTarget.r + e.r) {
        if (nearestTarget.isPlayer && now > this.inv && now > this.dodgeUntil) {
          this.hurtPlayer(touch);
          this.inv = now + 600;
        } else if (!nearestTarget.isPlayer) {
          const minion = nearestTarget.obj;
          if (now > (minion.invUntil || 0)) {
            minion.invUntil = now + 400;
            minion.hp -= touch;
            this.floatText(minion.c.x, minion.c.y - 10, String(touch), '#ff9a8a', '12px', 500);

            if (minion.hp <= 0) {
              this.onKill(minion);
            }
          }
        }
      }
    }

    if (this.hp <= 0 && !this.leaving) this.die();
    p.setAlpha(this.dodge || now < this.dodgeUntil ? 0.35 : now < this.inv ? 0.5 : 1);

    // HPバーの描画
    this.bars.clear();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const w = e.r * 2.8, bx = e.c.x - w / 2, by = e.c.y - e.r - 10;
      this.bars.fillStyle(0x000000, 0.6).fillRect(bx, by, w, 4);
      const barColor = e.isAllyMinion ? 0xd98cff : (e.stunUntil && now < e.stunUntil ? 0xffff00 : (e.boss ? BOSS.color : ENEMY.color));
      this.bars.fillStyle(barColor, 1).fillRect(bx, by, Math.max(0, w * e.hp / e.max), 4);
    }

    this.warn.clear();
    const b = this.boss;
    if (b && b.hp > 0) {
      const winding = b.ai.state === 'windup';
      if (winding) BOSS_PATTERNS[b.ai.pat].telegraph(this.warn, b, 1 - (b.ai.until - now) / b.ai.winds);
      b.c.setAlpha(winding ? 0.55 + 0.45 * Math.abs(Math.sin(now / 50)) : 1);
    }

    const cd = Math.max(0, this.nextSkill - now), dcd = Math.max(0, this.nextDodge - now);
    this.hud.setLines([
      `${this.floor === 0 ? '町' : `${this.floor}F  シード ${this.seed}`}  HP ${Math.max(0, this.hp)}/${maxHp()}  敵の残り ${this.enemies.filter(e => !e.boss).length}体`,
      ...(this.boss ? [`ボス ${this.boss.hp > 0 ? `HP ${Math.ceil(this.boss.hp)}/${this.boss.max}` : '撃破済み'}  階段 ${this.stairsOpen ? '開' : '閉'}`] : []),
      `Lv ${PLAYER.lv}  EXP ${PLAYER.exp}/${expNeed(PLAYER.lv)}  ポイント ${PLAYER.pts}  所持金 ${PLAYER.gold}G`,
      `${weapon.name}${plus(weapon)}  攻撃力 ${atkTotal(this)}(武器${weapon.atk}+振り分け${PLAYER.atkPts * 5})  ${durLabel(weapon)}`,
      `${weapon.skill.name}[E] ${cd ? `あと${(cd / 1000).toFixed(1)}秒` : '使える'}`,
      `回避[Shift] ${dcd ? `あと${(dcd / 1000).toFixed(1)}秒` : '使える'}`,
      ...armorLines(),
      `遺物 ${artifactEq ? `${artifactEq.name} (${artifactEq.desc})` : 'なし(ボスを倒すと稀に落ちる)'}`,
      ...(nearStairs ? [this.floor === 0 ? `▲ 入口:[F]で${nextFloor(SAVE.cleared)}Fへ入る` : this.stairsOpen ? `▲ 階段:[F]で${nextFloor(this.floor)}Fへ上る` : '▲ 階段:ボスを倒すと開く'] : []),
      ...(nearAltar ? ['✦ ステータス台:[F]でポイントを振る'] : []),
      ...(nearSmith ? ['⚒ 鍛冶台:[F]で修理・強化'] : []),
      ...(near ? [`▲ ${near.label}:[F]で入る`] : []),
      ...(this.floor ? [`消耗品 [Q]小回復×${POTIONS.small} [R]全回復×${POTIONS.full}`] : [])
    ]);
  }

  die() {
    PLAYER.pts = 0;
    saveGame();
    this.clearShots();
    this.travel(0, Math.max(1, Math.round(maxHp() * DEATH.respawnHpPct)), '倒れた…町で復活(未割り振りポイント没収・耐久半減)');
  }

  usePotion(kind) {
    if (this.floor === 0 || this.leaving) return;
    if (this.hp >= maxHp()) return this.popup('HPは満タンです', '#a0a7b8');

    const index = BACKPACK.findIndex(it => it && it.slot === 'potion' && it.kind === kind);
    if (index < 0) return this.popup(`${POTION_DEF[kind].name}を持っていません`, '#a0a7b8');

    const pot = BACKPACK[index];
    pot.stack--;
    if (pot.stack <= 0) BACKPACK[index] = null;

    syncPotionCounts();

    const healHp = Math.ceil(maxHp() * POTION_DEF[kind].pct);
    this.hp = Math.min(maxHp(), this.hp + healHp);
    this.floatText(this.p.x, this.p.y - 20, `+${healHp} HP`, '#7cf0a0', '16px', 1000);
    saveGame();
  }

  goUp() {
    this.travel(this.floor === 0 ? nextFloor(SAVE.cleared) : nextFloor(this.floor));
  }

  travel(floor, hp = this.hp, notice = null) {
    saveGame();
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(300);
    cam.once('camerafadeoutcomplete', () => this.scene.restart({ floor, hp: Math.max(1, hp), notice }));
  }

  attack() {
    const n = this.time.now;
    if (n < this.nextAtk || this.dodge || this.leaving) return;
    this.nextAtk = n + weapon.cd;
    BEHAVIORS[weapon.type].attack(this, atkTotal(this));
    this.useWeapon(DURABILITY.weaponAttack);
  }

  skill() {
    const n = this.time.now;
    if (n < this.nextSkill || this.dodge || this.leaving) return;
    this.nextSkill = n + weapon.skill.cd;
    BEHAVIORS[weapon.type].skill(this, atkTotal(this));
    this.useWeapon(DURABILITY.weaponSkill);
  }

  subSkill() {
    const n = this.time.now;
    this.nextSubSkill = this.nextSubSkill || 0;
    if (n < this.nextSubSkill || this.dodge || this.leaving) return;

    const stats = Q_SKILL_STATS[qSkillLevel];
    this.nextSubSkill = n + stats.cd;

    const dmg = Math.round(atkTotal(this) * stats.dmgMult);
    this.cameras.main.shake(120, 0.008 * qSkillLevel);

    this.strike(0, Math.PI, stats.range, dmg, stats.color, {
      knockback: stats.knockback,
      stunTime: stats.stunTime,
      isQSkill: true
    });

    this.floatText(this.p.x, this.p.y - 20, stats.name, stats.color === 0xc084fc ? '#c084fc' : '#4fd1c5', '16px', 800);
  }

  useWeapon(n) {
    if (wear(weapon, n)) this.popup(`${weapon.name}が壊れた!攻撃力が下がる`, '#ff9a8a');
  }

  hurtPlayer(raw) {
    this.hp -= takeDamage(raw);
    wearArmor(DURABILITY.armorHit).forEach((it, i) => this.popup(`${it.label}が壊れた!`, '#ff9a8a', i + 1));
    this.hp = Math.min(this.hp, maxHp());
  }

  fireShot(x, y, a, speed) {
    const o = this.add.circle(x, y, 6, 0xff6a6a).setStrokeStyle(2, 0xffffff).setDepth(1);
    this.shots.push({ o, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, left: 520 });
  }

  updateShots(dt, now) {
    const sec = Math.min(dt, 50) / 1000, p = this.p;
    this.shots = this.shots.filter(b => {
      const dx = b.vx * sec, dy = b.vy * sec;
      b.o.x += dx; b.o.y += dy; b.left -= Math.hypot(dx, dy);
      const hit = Math.hypot(p.x - b.o.x, p.y - b.o.y) < 11 + 6 && now > this.inv && now > this.dodgeUntil;
      if (hit) {
        const dmg = Math.round(BOSS.shotDmg * bossAtkFloorMult(this.floor));
        this.hurtPlayer(dmg);
        this.inv = now + 600;
      }
      const gone = hit || b.left <= 0 || solid(b.o.x, b.o.y);
      if (gone) b.o.destroy();
      return !gone;
    });
  }

  clearShots() { this.shots.forEach(b => b.o.destroy()); this.shots = []; }

  gainGold(e) {
    const n = goldFor(this.floor, e.boss);
    PLAYER.gold += n;
    this.floatText(e.c.x, e.c.y - 8, `+${n}G`, '#ffd36a', '16px', 1000);
  }

  floatText(x, y, text, color, size = '16px', dur = 600) {
    const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: size, color }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: dur, onComplete: () => t.destroy() });
  }

  giveArmor(slot, row = 0) {
    const it = rollArmor(slot, this.floor);
    if (!addToPack(it)) { this.popup('バッグが満杯です', '#a0a7b8', row); return; }
    this.popup(`入手:${armorLabel(it)}`, '#7cf0a0', row);
  }

  giveWeapon(row = 0) {
    const types = Object.keys(WEAPONS);
    const it = rollWeapon(types[Math.floor(Math.random() * types.length)], this.floor);
    if (!addToPack(it)) { this.popup('バッグが満杯です', '#a0a7b8', row); return; }
    this.popup(`入手:${it.name} 攻撃力${it.atk}`, '#ffd36a', row);
  }

  giveArtifact(row = 0) {
    const it = rollArtifact();
    if (!addToPack(it)) { this.popup('バッグが満杯です', '#a0a7b8', row); return; }
    this.popup(`遺物入手:${it.name} (${it.desc})`, '#d98cff', row);
  }

  popup(text, color, row = 0) {
    const t = this.add.text(this.p.x, this.p.y - 36 - row * 20, text, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }

  gainExp(n) {
    PLAYER.exp += n;
    while (PLAYER.exp >= expNeed(PLAYER.lv)) {
      PLAYER.exp -= expNeed(PLAYER.lv); PLAYER.lv++; PLAYER.pts++;
      const t = this.add.text(this.p.x, this.p.y - 30, `LEVEL UP! Lv${PLAYER.lv}`, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#7cf0a0' }).setOrigin(0.5).setDepth(6);
      this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    }
  }

  strike(a, half, r, dmg, col, opts = {}) {
    this.wedge(a, half, r, col);

    const wave = this.add.graphics().setDepth(2);
    wave.lineStyle(4, col, 0.8);
    wave.beginPath().arc(this.p.x, this.p.y, r * 0.5, a - half, a + half, false).strokePath();
    this.tweens.add({ targets: wave, scale: 1.3, alpha: 0, duration: 140, onComplete: () => wave.destroy() });

    const p = this.p;
    let hitCountInThisStrike = 0;

    for (const e of this.enemies) {
      if (e.isAllyMinion) continue;
      const dx = e.c.x - p.x, dy = e.c.y - p.y;
      if (Math.hypot(dx, dy) > r + e.r) continue;
      if (half < Math.PI && Math.abs(angDiff(Math.atan2(dy, dx), a)) > half) continue;

      hitCountInThisStrike++;
      this.damage(e, dmg);

      if (opts.knockback && e.hp > 0) {
        const kLen = opts.knockback;
        const kAng = Math.atan2(dy, dx);
        const kx = e.c.x + Math.cos(kAng) * kLen;
        const ky = e.c.y + Math.sin(kAng) * kLen;
        if (free(kx, e.c.y, e.r)) e.c.x = kx;
        if (free(e.c.x, ky, e.r)) e.c.y = ky;
      }

      if (opts.stunTime && e.hp > 0) {
        e.stunUntil = this.time.now + opts.stunTime;
        this.floatText(e.c.x, e.c.y - 34, 'スタン!', '#ffff00', '14px', 800);
      }
    }

    if (opts.isQSkill && hitCountInThisStrike > 0) {
      const newHitCount = qSkillHitCount + hitCountInThisStrike;
      setQSkillHitCount(newHitCount);
      if (qSkillLevel < 3 && newHitCount >= 3) {
        setQSkillLevel(qSkillLevel + 1);
        setQSkillHitCount(0);
        this.floatText(p.x, p.y - 45, `✦ Qスキルレベルアップ！ [Lv.${qSkillLevel}]`, '#ffd36a', '18px', 1200);
      }
    }

    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  damage(e, dmg) {
    if (e.hp <= 0) return;
    if (e.boss && e.isShielded) {
      this.floatText(e.c.x, e.c.y - 24, 'GUARD!', '#4fd1c5', '14px', 400);
      return;
    }

    this.hitEffect(e.c.x, e.c.y, e.boss ? 0xb15cff : 0xffe08a);

    const originalColor = e.c.fillColor;
    e.c.fillColor = 0xffffff;
    this.time.delayedCall(70, () => {
      if (e.c && e.c.active) e.c.fillColor = originalColor;
    });

    const angleFromPlayer = Math.atan2(e.c.y - this.p.y, e.c.x - this.p.x);
    const pushDist = e.boss ? 2 : 6;
    const kx = e.c.x + Math.cos(angleFromPlayer) * pushDist;
    const ky = e.c.y + Math.sin(angleFromPlayer) * pushDist;
    if (free(kx, e.c.y, e.r)) e.c.x = kx;
    if (free(e.c.x, ky, e.r)) e.c.y = ky;

    if (e.boss) dmg = Math.round(dmg * bossDmgMult());
    e.hp -= dmg;
    this.floatText(e.c.x, e.c.y - 24, String(dmg), '#ffe08a');
    if (e.hp <= 0) this.onKill(e);
  }

  onKill(e) {
    e.c.destroy();
    this.gainExp((EXP_PER_KILL + 10 * this.floor) * (e.boss ? BOSS.expMult : 1));
    this.gainGold(e);

    if (e.isCrystal) {
      const remainingCrystals = this.enemies.filter(x => x.isCrystal && x.hp > 0 && x !== e).length;
      if (remainingCrystals === 0 && this.boss) {
        this.boss.isShielded = false;
        this.boss.stunUntil = this.time.now + 2500;
        this.floatText(this.boss.c.x, this.boss.c.y - 30, 'バリア破壊！スタン！', '#4fd1c5', '20px', 1200);
      }
    }

    if (e.isAllyMinion) {
      const healAmt = Math.round(maxHp() * 0.15);
      this.hp = Math.min(maxHp(), this.hp + healAmt);
      this.floatText(this.p.x, this.p.y - 20, `+${healAmt} HP`, '#d98cff', '16px', 1000);
    }

    if (!e.boss && !e.isAllyMinion && !e.isCrystal && this.floor >= 10 && this.boss && this.boss.hp > 0) {
      const healAmount = Math.round(this.boss.max * 0.05);
      this.boss.hp = Math.min(this.boss.max, this.boss.hp + healAmount);
      this.floatText(this.boss.c.x, this.boss.c.y - this.boss.r - 20, '+15%', '#7cf0a0', '18px', 1000);
    }

    if (e.boss) this.onBossDefeated();
    else if (!e.isAllyMinion && !e.isCrystal && !e.isMinion && Math.random() < DROP_RATE) this.giveArmor(randomSlot());
  }

  onBossDefeated() {
    SAVE.cleared = Math.max(SAVE.cleared, this.floor);
    saveGame();
    const first = !this.stairsOpen;
    this.stairsOpen = true;
    this.stairsGfx.setFillStyle(STAIRS_OPEN);
    this.clearShots();
    this.popup(first ? `${this.floor}Fのボス撃破!階段が開いた` : 'ボス撃破!', '#ffd36a', 0);
    if (this.floor >= 10 && Math.random() < 0.15) {
      const bossKeys = ['demon_sword', 'eruption_wand', 'dragon_chain'];
      const chosenType = bossKeys[Math.floor(Math.random() * bossKeys.length)];
      const bossWeapon = rollWeapon(chosenType, this.floor);
      if (addToPack(bossWeapon)) {
        this.popup(`★レア武器ドロップ:${bossWeapon.name}!`, '#ffd36a', 1);
      } else {
        this.popup('バッグ満杯のためレア武器を逃した!', '#ff9a8a', 1);
      }
    } else if (Math.random() < BOSS.weaponDropRate) this.giveWeapon(1);
    if (Math.random() < ARTIFACT.dropRate) this.giveArtifact(2);
  }

  shoot(a, dmg, color = 0xe9d8a6) {
    const p = this.p;
    this.muzzleFlash(p.x, p.y, a, color);
    const o = this.add.rectangle(p.x, p.y, 14, 4, color).setRotation(a).setDepth(2);
    this.arrows.push({
      o, vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed,
      left: weapon.range, dmg, color, lastTrail: 0
    });
  }

  updateArrows(dt) {
    const s = Math.min(dt, 50) / 1000;
    const now = this.time.now;

    this.arrows = this.arrows.filter(r => {
      const dx = r.vx * s, dy = r.vy * s;
      r.o.x += dx; r.o.y += dy; r.left -= Math.hypot(dx, dy);

      if (now - r.lastTrail > 25) {
        r.lastTrail = now;
        const trail = this.add.circle(r.o.x, r.o.y, 3, r.color, 0.7).setDepth(1);
        this.tweens.add({ targets: trail, scale: 0.1, alpha: 0, duration: 180, onComplete: () => trail.destroy() });

        if (r.color === 0xffff00) {
          const spark = this.add.line(0, 0, r.o.x, r.o.y, r.o.x + (Math.random() - 0.5) * 16, r.o.y + (Math.random() - 0.5) * 16, 0xffff00).setLineWidth(2).setDepth(2);
          this.tweens.add({ targets: spark, alpha: 0, duration: 80, onComplete: () => spark.destroy() });
        }
      }

      const hit = this.enemies.find(e => e.hp > 0 && !e.isAllyMinion && Math.hypot(e.c.x - r.o.x, e.c.y - r.o.y) < e.r + 4);
      if (hit) this.damage(hit, r.dmg);

      const gone = hit || r.left <= 0 || solid(r.o.x, r.o.y);
      if (gone) r.o.destroy();
      return !gone;
    });
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  wedge(a, half, r, col) {
    const p = this.p, f = this.add.graphics();
    f.clear().fillStyle(col, 0.35).lineStyle(2, col, 0.9).beginPath().moveTo(p.x, p.y);
    for (let i = 0; i <= 16; i++) {
      const q = a - half + half * 2 * i / 16;
      f.lineTo(p.x + Math.cos(q) * r, p.y + Math.sin(q) * r);
    }
    f.closePath().fillPath().strokePath();
    this.time.delayedCall(130, () => f.destroy());
  }
}
