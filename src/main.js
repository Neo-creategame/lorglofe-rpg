// src/main.js
import { loadGame } from './utils.js';
import { MainScene } from './scenes/MainScene.js';
import { HudScene } from './scenes/HudScene.js';
import {
  PauseScene, StatScene, BackpackScene,
  BlacksmithScene, ShopScene, InnScene, StorageScene
} from './scenes/MenuScenes.js';

// ゲーム起動時にセーブデータが存在すれば自動ロード
loadGame();

// Phaserゲームの設定と起動
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 540,
  backgroundColor: '#0b0d12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
  },
  scene: [
    MainScene,
    HudScene,
    PauseScene,
    StatScene,
    BackpackScene,
    BlacksmithScene,
    ShopScene,
    InnScene,
    StorageScene
  ]
});
