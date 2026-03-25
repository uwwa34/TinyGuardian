// ═══════════════════════════════════════════════════
//  js/settings.js  —  Tiny Guardian (Yellow Pastel)
//  Single source of truth — แก้ที่นี่ที่เดียว
// ═══════════════════════════════════════════════════

const WIDTH  = 390;
const HEIGHT = 720;

const STATE = {
  LOADING:'LOADING', INTRO:'INTRO', PLAYING:'PLAYING',
  STAGE_CLEAR:'STAGE_CLEAR', GAME_OVER:'GAME_OVER',
  TALLY:'TALLY', NAME:'NAME', RANKING:'RANKING',
};

// ── Yellow Pastel Colour Palette ─────────────────────
const COL = {
  PRIMARY     : '#FFD54F',
  PRIMARY_L   : '#FFF8E1',
  PRIMARY_D   : '#F9A825',
  PRIMARY_MID : '#FFE082',
  WARM_ORANGE : '#FFB74D',
  SOFT_PINK   : '#F8BBD0',
  MINT        : '#A5D6A7',
  SKY_BLUE    : '#81D4FA',
  LAVENDER    : '#CE93D8',
  CREAM       : '#FFFDE7',
  COCOA       : '#4E342E',
  SOFT_RED    : '#EF9A9A',
  GOLD        : '#FFD700',
  WHITE       : '#FFFFFF',
  HEART_ON    : '#EF5350',
  HEART_OFF   : '#FFE0B2',
  BOSS_HP1    : '#EF5350',
  BOSS_HP2    : '#FFD54F',
  // ── Yellow Pastel UI (ไม่ใช้น้ำตาลเข้มอีก) ──
  HUD_BG      : 'rgba(255,224,130,0.92)',   // เหลืองพาสเทล semi-transparent
  HUD_TEXT    : '#5D4037',                   // น้ำตาลอ่อน (อ่านง่าย)
  PANEL_BG    : 'rgba(255,248,225,0.95)',    // ครีมพาสเทล
  PANEL_BORDER: '#FFD54F',
  JOYPAD_BG   : 'rgba(255,236,179,0.90)',   // เหลืองอ่อนพาสเทล
  JOYPAD_LEFT : '#81D4FA',
  JOYPAD_RIGHT: '#81D4FA',
  JOYPAD_BTN_B: '#FFB74D',
  JOYPAD_BTN_A: '#FFD54F',
};

const STAGE_COL = [
  null,
  { bg:'#E3F2FD', bg2:'#BBDEFB', platform:'#A5D6A7', accent:'#FFD54F', ground:'#81C784' },
  { bg:'#FCE4EC', bg2:'#F8BBD0', platform:'#F8BBD0', accent:'#FFB74D', ground:'#F48FB1' },
  { bg:'#FFF8E1', bg2:'#FFE0B2', platform:'#CE93D8', accent:'#A5D6A7', ground:'#BA68C8' },
  { bg:'#EDE7F6', bg2:'#D1C4E9', platform:'#CE93D8', accent:'#FFD700', ground:'#9575CD' },
];

const FONT = {
  MAIN: '"Fredoka One","Segoe UI Emoji",cursive',
  BODY: '"Nunito","Segoe UI Emoji",sans-serif',
};

// ── Physics ──────────────────────────────────────────
const GRAVITY      = 1500;
const JUMP_VEL     = -620;   // ลดจาก -780 → กระโดดไม่ทะลุ 2 ชั้น
const JUMP_VEL_MIN = -340;
const JUMP_HOLD_MS = 180;

// ── Player ───────────────────────────────────────────
const PLAYER_W      = 52;    // ใหญ่ขึ้น
const PLAYER_H      = 60;    // ใหญ่ขึ้น
const PLAYER_SPEED  = 180;
const PLAYER_HP     = 5;
const INVINCIBLE_MS = 1500;

// ── Ground & Play Area ───────────────────────────────
const HUD_H       = 64;
const JOYPAD_H    = 140;
const PLAY_TOP    = HUD_H;
const PLAY_BOTTOM = HEIGHT - JOYPAD_H;    // 580
const GROUND_Y    = PLAY_BOTTOM - 26;     // 554
const GROUND_H    = 26;

// ── Platform Layouts ─────────────────────────────────
// gaps ≥ 70px for 52px player, height diff ≤ 95px for jump vel -620
const PLAT_PRESETS = {
  1: [
    { x:10,  y:GROUND_Y-90,  w:145 },
    { x:235, y:GROUND_Y-90,  w:145 },
    { x:80,  y:GROUND_Y-180, w:230 },
    { x:10,  y:GROUND_Y-270, w:145 },
    { x:235, y:GROUND_Y-270, w:145 },
  ],
  2: [
    { x:5,   y:GROUND_Y-85,  w:140 },
    { x:245, y:GROUND_Y-85,  w:140 },
    { x:110, y:GROUND_Y-170, w:170 },
    { x:5,   y:GROUND_Y-255, w:155 },
    { x:230, y:GROUND_Y-255, w:155 },
    { x:80,  y:GROUND_Y-340, w:230 },
  ],
  3: [
    { x:10,  y:GROUND_Y-85,  w:140 },
    { x:240, y:GROUND_Y-85,  w:140 },
    { x:55,  y:GROUND_Y-170, w:130 },
    { x:255, y:GROUND_Y-170, w:125 },
    { x:10,  y:GROUND_Y-255, w:160 },
    { x:220, y:GROUND_Y-255, w:160 },
    { x:90,  y:GROUND_Y-340, w:210 },
    { x:120, y:GROUND_Y-130, w:110, moving:true, moveRange:110, moveSpeed:45 },
  ],
  4: [
    { x:10,  y:GROUND_Y-90,  w:165 },
    { x:215, y:GROUND_Y-90,  w:165 },
    { x:40,  y:GROUND_Y-180, w:310 },
    { x:80,  y:GROUND_Y-270, w:230 },
  ],
};

// ── Weapon / Projectile ──────────────────────────────
const WEAPON_CHARGE_MS = 1500;
const PROJ_SPEED       = 500;
const PROJ_W           = 14;
const PROJ_H           = 14;
const PROJ_DMG_NORMAL  = 1;
const PROJ_DMG_CHARGE  = 3;
const PROJ_CHARGE_W    = 24;
const PROJ_CHARGE_H    = 24;
const PROJ_COOLDOWN_MS = 400;

// ── Enemy Types (เร็วขึ้น ~40-60%) ──────────────────
const ENEMY = {
  ERASER : { key:'eraser',  emoji:'🟥', w:36, h:36, speed:90,  points:100, type:'ground', color:'#EF5350' },
  PENCIL : { key:'pencil',  emoji:'✏️', w:32, h:38, speed:70,  points:150, type:'fly',    color:'#FFA726' },
  CLOWN  : { key:'clown',   emoji:'🤡', w:40, h:44, speed:100, points:120, type:'ground', color:'#AB47BC' },
  BALLOON: { key:'balloon', emoji:'🎈', w:32, h:40, speed:65,  points:150, type:'fly',    color:'#EF5350' },
  BOOMER : { key:'boomer',  emoji:'🪃', w:38, h:40, speed:120, points:200, type:'ground', color:'#42A5F5', shoots:true },
  CANDY  : { key:'candy',   emoji:'🍭', w:36, h:36, speed:110, points:120, type:'ground', color:'#EC407A' },
  COOKIE : { key:'cookie',  emoji:'🍪', w:34, h:34, speed:85,  points:180, type:'fly',    color:'#8D6E63' },
  JELLY  : { key:'jelly',   emoji:'🟢', w:36, h:36, speed:80,  points:150, type:'bounce', color:'#66BB6A' },
};

const ANGRY_TIME_MS    = 20000;  // ลดจาก 25s → 20s
const ANGRY_SPEED_MULT = 1.6;

const STAGE_WAVES = {
  1: [ [{t:'ERASER',n:3}], [{t:'ERASER',n:1},{t:'PENCIL',n:2}] ],
  2: [ [{t:'CLOWN',n:2},{t:'BALLOON',n:2}], [{t:'CLOWN',n:2},{t:'BALLOON',n:1},{t:'BOOMER',n:1}] ],
  3: [ [{t:'CANDY',n:2},{t:'COOKIE',n:2}], [{t:'CANDY',n:2},{t:'JELLY',n:2},{t:'COOKIE',n:1}], 'MINIBOSS' ],
  4: [ [{t:'ERASER',n:1},{t:'CLOWN',n:2},{t:'CANDY',n:1},{t:'COOKIE',n:1},{t:'JELLY',n:1}], 'BOSS' ],
};

const STAGE_TIME = { 1:90, 2:90, 3:90, 4:120 };

const MINIBOSS = {
  name:'คัพเค้กยักษ์', emoji:'🧁', w:72, h:72,
  hp:8, speed:110, points:800,
  angryHp:3, angrySpeed:160,
  shootCount:3, angryShootCount:5,
  color:'#F8BBD0', angryColor:'#EF5350',
};

const BOSS = {
  name:'จอมวายร้ายจิ๋ว', emoji:'👿', w:88, h:88,
  hp:15, speed:75, points:2000,
  phase2hp:10, phase3hp:5,
  p1FoodCount:3, p1SpawnInterval:8000, p1SpawnCount:1,
  p2FoodCount:4, p2SpawnInterval:8000, p2SpawnCount:2, p2Speed:110,
  p3FoodCount:5, p3SpawnInterval:5000, p3SpawnCount:2, p3Speed:150,
  color:'#9575CD', angryColor:'#EF5350',
};

const BOSS_FOODS = [
  { emoji:'🍔', w:24, h:24 }, { emoji:'🍕', w:24, h:24 }, { emoji:'🍩', w:24, h:24 },
];

const FAT = {
  MAX_LEVEL:2, SPEED_PENALTY:[0,0.20,0.40], JUMP_PENALTY:[0,0.15,0.30],
  SCALE:[1.0,1.0,1.3], DECAY_MS:8000,
};

const ITEM = {
  COIN:    { key:'coin',    emoji:'⭐', points:50,  w:24, h:24 },
  SPECIAL: { key:'special', emoji:'📖', points:200, w:28, h:28 },
  FOOD:    { key:'food',    emoji:'🍎', points:0,   w:24, h:24, heals_fat:true },
};

const STAGE_ITEMS = {
  1:{ coin:'⭐', special:'📖' }, 2:{ coin:'🍿', special:'🎫' },
  3:{ coin:'🍦', special:'🎂' }, 4:{ coin:'⭐', special:'✨' },
};

const POWERUP_TYPES = {
  SPEED:  { key:'speed',  emoji:'⚡', label:'Speed!',  duration:10000 },
  SHIELD: { key:'shield', emoji:'🛡️', label:'Shield!', duration:0 },
  TRIPLE: { key:'triple', emoji:'🔱', label:'Triple!', duration:12000 },
  HEAL:   { key:'heal',   emoji:'💖', label:'Heal!',   duration:0 },
  BOMB:   { key:'bomb',   emoji:'💣', label:'Bomb!',   duration:0 },
  MAGNET: { key:'magnet', emoji:'🧲', label:'Magnet!', duration:10000 },
};

const COMBO_TIMEOUT_MS  = 2000;
const COMBO_MAX         = 8;
const STAGE_CLEAR_BONUS = 500;
const TIME_BONUS_PER_S  = 10;
const RANKING_KEY       = 'tinyGuardian_ranking_v1';
const RANKING_MAX       = 10;

const ASSET_IMAGES = {
  player:'assets/images/player.png', bg_stage1:'assets/images/bg_stage1.png',
  bg_stage2:'assets/images/bg_stage2.png', bg_stage3:'assets/images/bg_stage3.png',
  bg_stage4:'assets/images/bg_stage4.png', boss:'assets/images/boss.png',
  miniboss:'assets/images/miniboss.png', platform:'assets/images/platform.png',
};

const ASSET_SOUNDS = {
  bgm:'assets/sounds/bgm.mp3', jump:'assets/sounds/jump.wav',
  attack:'assets/sounds/attack.wav', charge_full:'assets/sounds/charge_full.wav',
  charge_release:'assets/sounds/charge_release.wav', hit:'assets/sounds/hit.wav',
  enemy_die:'assets/sounds/enemy_die.wav', coin:'assets/sounds/coin.wav',
  powerup:'assets/sounds/powerup.wav', stage_clear:'assets/sounds/stage_clear.wav',
  boss_warning:'assets/sounds/boss_warning.wav', boss_hit:'assets/sounds/boss_hit.wav',
  die:'assets/sounds/die.wav', fat:'assets/sounds/fat.wav', slim:'assets/sounds/slim.wav',
};

// ── Joypad ───────────────────────────────────────────
const BTN_SIZE = 64;
const BTN_GAP  = 10;
const JPC_Y    = HEIGHT - JOYPAD_H/2;

const JBTN = {
  LEFT:  { x:18,                          y:JPC_Y-BTN_SIZE/2, r:BTN_SIZE/2, label:'◀' },
  RIGHT: { x:18+BTN_SIZE+BTN_GAP,        y:JPC_Y-BTN_SIZE/2, r:BTN_SIZE/2, label:'▶' },
  B:     { x:WIDTH-18-BTN_SIZE*2-BTN_GAP, y:JPC_Y-BTN_SIZE/2, r:BTN_SIZE/2, label:'B' },
  A:     { x:WIDTH-18-BTN_SIZE,           y:JPC_Y-BTN_SIZE/2, r:BTN_SIZE/2, label:'A' },
};
