// src/map.js
import { T, W, H } from './config.js';
import { rng, isSub } from './utils.js';

// マップのグローバル状態（現在のダンジョン構造）
export let g = Array.from({ length: H }, () => Array(W).fill(1));
export let rooms = [];

// マップ状態のセット関数
export function setMapData(newG, newRooms) {
  g = newG;
  rooms = newRooms;
}

// 街のマップ生成
export function genTown() {
  const TOWN_SHOPS = [['お店', 6, 5], ['宿屋', 17, 5], ['鍛冶屋', 28, 5], ['倉庫', 6, 14]];
  const t = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 1 : 0))
  );
  TOWN_SHOPS.forEach(([, bx, by]) => {
    for (let y = by; y < by + 4; y++) {
      for (let x = bx; x < bx + 6; x++) {
        t[y][x] = 1;
      }
    }
  });
  return { g: t, rooms: [{ x: 17, y: 19, w: 6, h: 6 }] };
}

// ダンジョンフロア生成
export function genFloor(seed, floor = 1) {
  const r = rng(seed);
  const grid = Array.from({ length: H }, () => Array(W).fill(1));
  const generatedRooms = [];

  // 中間ボス階（X.5F）の特殊マップ
  if (isSub(floor)) {
    generatedRooms.push({ x: 3, y: 11, w: 8, h: 8 });
    generatedRooms.push({ x: 15, y: 5, w: 22, h: 20 });
    generatedRooms.forEach(o => {
      for (let j = o.y; j < o.y + o.h; j++) {
        for (let k = o.x; k < o.x + o.w; k++) grid[j][k] = 0;
      }
    });
    for (let x = 11; x <= 15; x++) {
      grid[15][x] = 0;
      grid[16][x] = 0;
    }
    return { g: grid, rooms: generatedRooms };
  }

  // 通常階の部屋＆通路生成
  for (let i = 0; i < 80 && generatedRooms.length < 9; i++) {
    const w = 5 + Math.floor(r() * 7);
    const h = 4 + Math.floor(r() * 5);
    const x = 1 + Math.floor(r() * (W - w - 2));
    const y = 1 + Math.floor(r() * (H - h - 2));

    if (generatedRooms.some(o => x < o.x + o.w + 1 && x + w + 1 > o.x && y < o.y + o.h + 1 && y + h + 1 > o.y)) continue;

    generatedRooms.push({ x, y, w, h });
    for (let j = y; j < y + h; j++) {
      for (let k = x; k < x + w; k++) grid[j][k] = 0;
    }
  }

  const c = o => [o.x + (o.w >> 1), o.y + (o.h >> 1)];
  for (let i = 1; i < generatedRooms.length; i++) {
    const [ax, ay] = c(generatedRooms[i - 1]);
    const [bx, by] = c(generatedRooms[i]);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) grid[ay][x] = 0;
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) grid[y][bx] = 0;
  }

  return { g: grid, rooms: generatedRooms };
}

// 壁（障害物）判定
export function solid(x, y) {
  const tx = Math.floor(x / T);
  const ty = Math.floor(y / T);
  return tx < 0 || ty < 0 || tx >= W || ty >= H || g[ty][tx] === 1;
}

// 指定半径内に壁がないかの移動可能判定
export function free(x, y, r) {
  return !(solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r));
}
