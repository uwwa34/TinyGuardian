// ═══════════════════════════════════════════════════
//  js/settings.js — Tiny Guardian (Yellow Pastel)
//  Single source of truth
// ═══════════════════════════════════════════════════
const WIDTH=390, HEIGHT=720;

const STATE={LOADING:'LOADING',INTRO:'INTRO',PLAYING:'PLAYING',STAGE_CLEAR:'STAGE_CLEAR',GAME_OVER:'GAME_OVER',TALLY:'TALLY',NAME:'NAME',RANKING:'RANKING',BREAK:'BREAK',SELECT:'SELECT'};

// ── Yellow Pastel Palette ────────────────────────────
const COL={
  PRIMARY:'#FFD54F',PRIMARY_L:'#FFF8E1',PRIMARY_D:'#F9A825',PRIMARY_MID:'#FFE082',
  WARM_ORANGE:'#FFB74D',SOFT_PINK:'#F8BBD0',MINT:'#A5D6A7',SKY_BLUE:'#81D4FA',
  LAVENDER:'#CE93D8',CREAM:'#FFFDE7',COCOA:'#4E342E',SOFT_RED:'#EF9A9A',GOLD:'#FFD700',WHITE:'#FFFFFF',
  HEART_ON:'#EF5350',HEART_OFF:'#FFE0B2',BOSS_HP1:'#EF5350',BOSS_HP2:'#FFD54F',
  HUD_BG:'rgba(255,224,130,0.92)',HUD_TEXT:'#5D4037',
  PANEL_BG:'rgba(255,248,225,0.95)',PANEL_BORDER:'#FFD54F',
  JOYPAD_BG:'rgba(255,236,179,0.90)',
  JOYPAD_LEFT:'#81D4FA',JOYPAD_RIGHT:'#81D4FA',JOYPAD_BTN_B:'#FFB74D',JOYPAD_BTN_A:'#FFD54F',
};

const STAGE_COL=[null,
  {bg:'#E3F2FD',bg2:'#BBDEFB',platform:'#A5D6A7',accent:'#FFD54F',ground:'#81C784'},
  {bg:'#FCE4EC',bg2:'#F8BBD0',platform:'#F8BBD0',accent:'#FFB74D',ground:'#F48FB1'},
  {bg:'#FFF8E1',bg2:'#FFE0B2',platform:'#CE93D8',accent:'#A5D6A7',ground:'#BA68C8'},
  {bg:'#EDE7F6',bg2:'#D1C4E9',platform:'#CE93D8',accent:'#FFD700',ground:'#9575CD'},
];

const FONT={MAIN:'"Fredoka One","Segoe UI Emoji",cursive',BODY:'"Nunito","Segoe UI Emoji",sans-serif'};

// ── Physics ──────────────────────────────────────────
const GRAVITY=1500, JUMP_VEL=-620, JUMP_VEL_MIN=-340, JUMP_HOLD_MS=180;

// ── Player ───────────────────────────────────────────
const PLAYER_W=52, PLAYER_H=60, PLAYER_SPEED=180, PLAYER_HP=10, INVINCIBLE_MS=1500;

// ── Difficulty Settings ──────────────────────────────
// Current = MEDIUM. Apply multipliers in game.js based on selection.
const DIFFICULTY = {
  EASY:   { label:'🐣 มือใหม่',  labelEn:'Beginner', enemyHpMult:0.7, enemySpeedMult:0.8, playerHp:12, coopHp:10, bossHpMult:0.6, spawnDelayMult:1.4 },
  MEDIUM: { label:'⭐ นักผจญภัย', labelEn:'Explorer', enemyHpMult:1.0, enemySpeedMult:1.0, playerHp:10, coopHp:8,  bossHpMult:1.0, spawnDelayMult:1.0 },
  HARD:   { label:'🏆 ผู้พิทักษ์', labelEn:'Guardian', enemyHpMult:1.4, enemySpeedMult:1.2, playerHp:8,  coopHp:5,  bossHpMult:1.5, spawnDelayMult:0.7 },
};

// ── Play Area ────────────────────────────────────────
const HUD_H=64, JOYPAD_H=140;
const PLAY_TOP=HUD_H, PLAY_BOTTOM=HEIGHT-JOYPAD_H;
const GROUND_Y=PLAY_BOTTOM-26, GROUND_H=26;

// ── Platform Layouts ─────────────────────────────────
// Rule: ชิดขอบจอ (x=0/end=390) หรือ gap ≥ 60px
const PLAT_PRESETS={
  1:[
    {x:0,y:GROUND_Y-90,w:135},{x:255,y:GROUND_Y-90,w:135},
    {x:65,y:GROUND_Y-180,w:260},
    {x:0,y:GROUND_Y-270,w:135},{x:255,y:GROUND_Y-270,w:135},
  ],
  2:[
    {x:0,y:GROUND_Y-85,w:130},{x:260,y:GROUND_Y-85,w:130},
    {x:95,y:GROUND_Y-170,w:200},
    {x:0,y:GROUND_Y-255,w:145},{x:245,y:GROUND_Y-255,w:145},
    {x:65,y:GROUND_Y-340,w:260},
  ],
  3:[
    {x:0,y:GROUND_Y-85,w:130},{x:260,y:GROUND_Y-85,w:130},
    {x:0,y:GROUND_Y-170,w:130},{x:260,y:GROUND_Y-170,w:130},
    {x:0,y:GROUND_Y-255,w:150},{x:240,y:GROUND_Y-255,w:150},
    {x:75,y:GROUND_Y-340,w:240},
    {x:95,y:GROUND_Y-130,w:110,moving:true,moveRange:120,moveSpeed:45},
  ],
  4:[
    {x:0,y:GROUND_Y-90,w:140},{x:250,y:GROUND_Y-90,w:140},
    {x:100,y:GROUND_Y-145,w:120,moving:true,moveRange:100,moveSpeed:50},
    {x:0,y:GROUND_Y-200,w:130,disappear:true,onTime:5000,offTime:1500},
    {x:260,y:GROUND_Y-200,w:130,disappear:true,onTime:5000,offTime:1500,phase:2500},
    {x:100,y:GROUND_Y-280,w:130,moving:true,moveRange:90,moveSpeed:40},
  ],
};

// ── Weapon ───────────────────────────────────────────
const WEAPON_CHARGE_MS=1500,PROJ_SPEED=500;
const PROJ_W=14,PROJ_H=14,PROJ_DMG_NORMAL=1,PROJ_DMG_CHARGE=3;
const PROJ_CHARGE_W=24,PROJ_CHARGE_H=24,PROJ_COOLDOWN_MS=200;

// ── Enemy Types (width ≈ player 52px) ────────────────
const ENEMY={
  ERASER :{key:'eraser', emoji:'🟥',w:50,h:50,speed:90, points:100,type:'ground',color:'#EF5350',imgKey:'enemy_ground'},
  PENCIL :{key:'pencil', emoji:'✏️',w:46,h:54,speed:70, points:150,type:'fly',   color:'#FFA726',imgKey:'enemy_air'},
  CLOWN  :{key:'clown',  emoji:'🤡',w:52,h:56,speed:100,points:120,type:'ground',color:'#AB47BC',imgKey:'enemy_ground'},
  BALLOON:{key:'balloon',emoji:'🎈',w:44,h:52,speed:65, points:150,type:'fly',   color:'#EF5350',imgKey:'enemy_air'},
  BOOMER :{key:'boomer', emoji:'🪃',w:50,h:52,speed:120,points:200,type:'ground',color:'#42A5F5',imgKey:'enemy_ground',shoots:true},
  CANDY  :{key:'candy',  emoji:'🍭',w:50,h:50,speed:110,points:120,type:'ground',color:'#EC407A',imgKey:'enemy_ground'},
  COOKIE :{key:'cookie', emoji:'🍪',w:46,h:46,speed:85, points:180,type:'fly',   color:'#8D6E63',imgKey:'enemy_air'},
  JELLY  :{key:'jelly',  emoji:'🟢',w:50,h:50,speed:80, points:150,type:'bounce',color:'#66BB6A',imgKey:'enemy_ground'},
};

const ANGRY_TIME_MS=20000, ANGRY_SPEED_MULT=1.6;

const STAGE_WAVES={
  1:[[{t:'ERASER',n:3}],[{t:'ERASER',n:1},{t:'PENCIL',n:2}]],
  2:[[{t:'CLOWN',n:2},{t:'BALLOON',n:2}],[{t:'CLOWN',n:2},{t:'BALLOON',n:1},{t:'BOOMER',n:1}]],
  3:[[{t:'CANDY',n:2},{t:'COOKIE',n:2}],[{t:'CANDY',n:2},{t:'JELLY',n:2},{t:'COOKIE',n:1}],'MINIBOSS'],
  4:[[{t:'ERASER',n:1},{t:'CLOWN',n:2},{t:'CANDY',n:1},{t:'COOKIE',n:1},{t:'JELLY',n:1}],'BOSS'],
};

const STAGE_TIME={1:90,2:90,3:90,4:120};

const MINIBOSS={name:'บอสลึกลับ',emoji:'🧁',w:96,h:96,hp:8,speed:150,points:800,angryHp:3,angrySpeed:210,shootCount:3,angryShootCount:5,color:'#F8BBD0',angryColor:'#EF5350'};

const BOSS={name:'จอมวายร้ายจิ๋ว',emoji:'👿',w:150,h:150,hp:15,speed:120,points:2000,
  phase2hp:10,phase3hp:5,
  p1FoodCount:3,p1SpawnInterval:8000,p1SpawnCount:1,
  p2FoodCount:4,p2SpawnInterval:8000,p2SpawnCount:2,p2Speed:150,
  p3FoodCount:5,p3SpawnInterval:5000,p3SpawnCount:2,p3Speed:200,
  color:'#9575CD',angryColor:'#EF5350'};

const BOSS_FOODS=[{emoji:'🍔',w:24,h:24},{emoji:'🍕',w:24,h:24},{emoji:'🍩',w:24,h:24}];

const FAT={MAX_LEVEL:2,SPEED_PENALTY:[0,0.20,0.40],JUMP_PENALTY:[0,0.15,0.30],SCALE:[1.0,1.0,1.3],DECAY_MS:8000};

const ITEM={
  COIN:   {key:'coin',   emoji:'⭐',points:50, w:24,h:24,imgKey:'item_coin'},
  SPECIAL:{key:'special',emoji:'📖',points:200,w:28,h:28,imgKey:'item_star'},
  FOOD:   {key:'food',   emoji:'🍎',points:0,  w:24,h:24,heals_fat:true},
  HEART:  {key:'heart',  emoji:'💗',points:0,  w:24,h:24,heals_hp:true},
};

const STAGE_ITEMS={
  1:{coin:'⭐',special:'📖'},2:{coin:'🍿',special:'🎫'},
  3:{coin:'🍦',special:'🎂'},4:{coin:'⭐',special:'✨'},
};

// ── Power-ups (disabled) ─────────────────────────────
const POWERUP_TYPES={};

const COMBO_TIMEOUT_MS=2000, COMBO_MAX=8;
const STAGE_CLEAR_BONUS=500, TIME_BONUS_PER_S=10;
const RANKING_KEY='tinyGuardian_ranking_v1', RANKING_MAX=10;

// ── Asset Paths (match actual filenames) ─────────────
const ASSET_IMAGES={
  player:       'assets/images/player.png',
  player2:      'assets/images/player2.png',
  player3:      'assets/images/player3.png',
  player4:      'assets/images/player4.png',
  background:   'assets/images/background.png',      // shared BG
  bg_stage1:    'assets/images/bg_stage1.png',        // optional per-stage BG
  bg_stage2:    'assets/images/bg_stage2.png',
  bg_stage3:    'assets/images/bg_stage3.png',
  bg_stage4:    'assets/images/bg_stage4.png',
  boss:         'assets/images/boss.png',
  miniboss:     'assets/images/miniboss.png',
  enemy_ground: 'assets/images/enemy_ground.png',
  enemy_air:    'assets/images/enemy_air.png',
  item_coin:    'assets/images/item_coin.png',
  item_star:    'assets/images/item_star.png',
  power_up:     'assets/images/power_up.png',
  platform:     'assets/images/platform.png',
};

const ASSET_SOUNDS={
  bgm:'assets/sounds/bgm.mp3',
  jump:'assets/sounds/jump.wav',       attack:'assets/sounds/dash.wav',
  charge_full:'assets/sounds/start.wav', charge_release:'assets/sounds/dash.wav',
  hit:'assets/sounds/hit.wav',         enemy_die:'assets/sounds/boss_hit.wav',
  coin:'assets/sounds/coin.wav',       powerup:'assets/sounds/start.wav',
  stage_clear:'assets/sounds/boss_clear.wav', boss_warning:'assets/sounds/warning.wav',
  boss_hit:'assets/sounds/boss_hit.wav', die:'assets/sounds/die.wav',
  fat:'assets/sounds/hit.wav',         slim:'assets/sounds/coin.wav',
};

// ── Joypad (rectangle buttons with hints) ────────────
const BTN_W=72, BTN_H=60, BTN_GAP=6;
const JOYPAD_PAD=10; // padding from edges
const JPC_Y=HEIGHT-JOYPAD_H/2; // center Y

const JBTN={
  LEFT: {x:JOYPAD_PAD,                              y:JPC_Y-BTN_H/2, w:BTN_W, h:BTN_H, label:'◀', hint:'ซ้าย'},
  RIGHT:{x:JOYPAD_PAD+BTN_W+BTN_GAP,               y:JPC_Y-BTN_H/2, w:BTN_W, h:BTN_H, label:'▶', hint:'ขวา'},
  B:    {x:WIDTH-JOYPAD_PAD-BTN_W*2-BTN_GAP,        y:JPC_Y-BTN_H/2, w:BTN_W, h:BTN_H, label:'B', hint:'ยิง'},
  A:    {x:WIDTH-JOYPAD_PAD-BTN_W,                   y:JPC_Y-BTN_H/2, w:BTN_W, h:BTN_H, label:'A', hint:'กระโดด'},
};

// ── Screen Time ───────────────────────────────────────
const SCREEN_TIME_KEY = 'tinyGuardian_screenTime_v1';
const SCREEN_TIME_LIMIT_MS = 20 * 60 * 1000; // 20 นาที
const SCREEN_TIME_BREAK_MS =  5 * 60 * 1000; // พัก 5 นาที

// ── Audio Volume ─────────────────────────────────────
const BGM_VOLUME = 0.35;
const SFX_VOLUME = 0.6;

// ── Co-op Server ─────────────────────────────────────
// เปลี่ยน URL นี้หลัง deploy server บน Render.com
const COOP_SERVER_URL = 'https://tiny-guardian-server-1.onrender.com';
