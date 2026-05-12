# 🛡️ Tiny Guardian — ผู้พิทักษ์ตัวจิ๋ว

> เกม Platform Action บน HTML5 Canvas สำหรับมือถือและเดสก์ท็อป  
> รองรับ 1 คน, Local Co-op 2 คน (เครื่องเดียว) และ Online Co-op 2 คน

---

## 📱 ข้อมูลเกม

| รายการ | รายละเอียด |
|---|---|
| Platform | HTML5 Canvas (390×720 px) |
| รองรับ | Mobile Browser, Desktop Browser |
| ภาษา | ไทย |
| จำนวน Stage | 4 Stage |
| Online Server | Render.com (WebSocket) |

---

## 🎮 โหมดการเล่น

### 1. เล่นคนเดียว (Solo)
ผู้เล่น P1 เล่นคนเดียว ผ่าน 4 Stage เอาตัวรอดให้ครบ

### 2. 2 คน เครื่องเดียว (Local Co-op)
P1 และ P2 เล่นบนเครื่องเดียวกัน ใช้คนละชุด Keyboard

### 3. 2 คน Online (Online Co-op)
P1 (Host) สร้างห้อง → ส่ง Room Code ให้ P2 (Guest) เข้าร่วม  
Host รัน Physics ทั้งหมด — Guest เป็น renderer ผ่าน WebSocket

---

## ⌨️ การควบคุม

### Virtual Joypad (Touch / Mouse)
| ปุ่ม | หน้าที่ |
|---|---|
| ◀ | เดินซ้าย |
| ▶ | เดินขวา |
| **B** | ยิง (กดค้างเพื่อ Charge) |
| **A** | กระโดด / ยืนยัน |

### Keyboard — P1
| ปุ่ม | หน้าที่ |
|---|---|
| `A` | เดินซ้าย |
| `D` | เดินขวา |
| `R` | ยิง / Charge |
| `T` | กระโดด / ยืนยัน |

### Keyboard — P2 (Local Co-op เท่านั้น)
| ปุ่ม | หน้าที่ |
|---|---|
| `J` | เดินซ้าย |
| `L` | เดินขวา |
| `O` | ยิง / Charge |
| `P` | กระโดด |

> ใช้ได้ทั้ง Upper และ Lower case

### Intro Screen Navigation (Keyboard/Joypad)
1. `◀ ▶` เลือกระดับความยาก → `A` ยืนยัน
2. `◀ ▶` เลือกโหมดการเล่น → `A` เริ่มเกม  
> Touch screen: แตะปุ่มเพื่อเลือกได้เลยโดยไม่ต้อง confirm 2 ครั้ง

---

## 🗺️ Stage และศัตรู

| Stage | ศัตรู | บอส |
|---|---|---|
| 1 | ERASER 🟥, PENCIL ✏️ | — |
| 2 | CLOWN 🤡, BALLOON 🎈, BOOMER 🪃 | — |
| 3 | CANDY 🍭, COOKIE 🍪, JELLY 🟢 | มินิบอส 🧁 |
| 4 | ทุกประเภท | มินิบอส 🧁 + บอสใหญ่ 👿 |

### รายละเอียดศัตรู
| ชื่อ | ประเภท | คะแนน | พิเศษ |
|---|---|---|---|
| ERASER | ภาคพื้น | 100 | — |
| PENCIL | บิน | 150 | — |
| CLOWN | ภาคพื้น | 120 | — |
| BALLOON | บิน | 150 | — |
| BOOMER | ภาคพื้น | 200 | ยิงกระสุน |
| CANDY | ภาคพื้น | 120 | — |
| COOKIE | บิน | 180 | — |
| JELLY | กระเด้ง | 150 | — |
| มินิบอส (บอสลึกลับ) | บอส | 800 | มี Angry Phase |
| จอมวายร้ายจิ๋ว | บอสใหญ่ | 2,000 | 2 Phase, ยิง Food |

---

## ⚔️ ระบบการต่อสู้

- **ยิงธรรมดา** — กด B
- **Charge Attack** — กดค้าง B จนเต็ม แล้วปล่อย → กระสุนพลังสูง
- **Combo** — กำจัดศัตรูต่อเนื่องภายใน 2 วินาที สูงสุด 8x multiplier
- **Invincibility Frames** — โดนตีแล้วมีกรอบปกป้อง 1.5 วินาที

---

## 💎 ระดับความยาก

| ระดับ | HP (Solo) | HP (Co-op) | ศัตรู | บอส |
|---|---|---|---|---|
| 🐣 มือใหม่ | 12 | 10 | ช้า / อ่อน | อ่อน |
| ⭐ นักผจญภัย | 10 | 8 | ปกติ | ปกติ |
| 🏆 ผู้พิทักษ์ | 8 | 5 | เร็ว / แข็ง | แข็ง |

---

## 🏆 ระบบคะแนน

| รายการ | คะแนน |
|---|---|
| กำจัดศัตรูแต่ละตัว | ตามประเภท × Combo Multiplier |
| ผ่านแต่ละ Stage | +500 pts |
| Time Bonus | เวลาที่เหลือ × 10 pts/วินาที |
| Combo Multiplier | สูงสุด 8x |

**คะแนนรวม Co-op** = P1 + P2 รวมกัน (ทั้ง 2 หน้าจอเห็นเท่ากัน)  
บันทึก Top 10 ลง LocalStorage

---

## 🎭 เลือกตัวละคร

ก่อนเริ่ม Stage 1 เลือกตัวละครได้ 4 ตัว (player1–player4)  
ใน Co-op ไม่สามารถเลือกตัวซ้ำกันได้

| ปุ่ม | หน้าที่ |
|---|---|
| ◀ / ▶ (Joypad / Keyboard) | เลื่อนเลือก |
| A | ยืนยัน |

---

## 🌐 Online Co-op — Architecture

```
Host ──► WebSocket ──► Render.com ──► Guest
  │      send state (50ms)             │
  │      ◄── receive input ◄───────────┘
  │
  └── รัน Physics, AI, Collision ทั้งหมด
      Guest เป็น pure renderer
```

**Server URL:** `https://tiny-guardian-server-1.onrender.com`  
> Free tier บน Render.com — cold start ครั้งแรกอาจใช้เวลา 30–60 วินาที

---

## ⏱️ ระบบ Screen Time (สุขภาพดวงตา)

| เวลาเล่นสะสม | เหตุการณ์ |
|---|---|
| 0–20 นาที | เล่นปกติ |
| ครบ 20 นาที | **Eye Break 20 วินาที** — หน้าจอมืด แสดง "มองออกไปไกล 20 ฟุต" countdown วงกลม |
| 20–40 นาที | เล่นปกติ |
| ครบ 40 นาที | **พักยาว 20 นาที** — countdown นาที:วินาที หลังครบกลับมาเล่นใหม่ |

- Eye Break **ไม่ Game Over** — เกมหยุด ณ จุดนั้น แล้วกลับมาต่ออัตโนมัติ
- แถบ Progress Bar (2 ชั้น) แสดงเวลาที่เหลือใต้ HUD ตลอดเวลา

---

## 📁 โครงสร้างไฟล์

```
/
├── index.html
├── js/
│   ├── settings.js     ค่าคงที่, Difficulty, ASSET_IMAGES, ASSET_SOUNDS
│   ├── player.js       Player class — movement, physics, draw, charKey
│   ├── world.js        World/Stage — background, platforms
│   ├── enemy.js        Enemy AI, wave spawning
│   ├── projectile.js   Bullet system — player & enemy
│   ├── items.js        Item spawning, pickup
│   ├── boss.js         Boss & Miniboss AI, phases
│   ├── hud.js          HUD — HP hearts, score, stage timer, combo
│   ├── ranking.js      TallyScreen, NameScreen, RankingScreen
│   ├── network.js      NetworkManager — WebSocket client
│   └── game.js         Game loop, state machine, input, screen time
├── assets/
│   ├── images/         PNG sprites (17 ไฟล์ — ดู Asset List)
│   └── sounds/         WAV/MP3 (10 ไฟล์)
└── server/
    └── server.js       Node.js WebSocket relay server
```

---

## 🔄 State Machine

```
LOADING → INTRO → SELECT (เลือกตัวละคร)
                     ↓
                  PLAYING ──► STAGE_CLEAR ──► (วน 4 รอบ)
                     ↓               ↓
                  GAME_OVER       TALLY → NAME → RANKING → INTRO
```

---

## 🚀 การ Deploy

### Client — GitHub Pages
```bash
git push origin main
# GitHub Pages serve index.html อัตโนมัติ
```

### Server — Render.com
```
Root directory : server/
Build Command  : npm install
Start Command  : node server.js
Runtime        : Node.js
```

---

## 📦 Dependencies

| ส่วน | รายละเอียด |
|---|---|
| Client | Vanilla JavaScript + HTML5 Canvas — ไม่มี framework |
| Server | Node.js + `ws` |
| Storage | LocalStorage (ranking, screen time) |
| Fonts | Google Fonts — Noto Sans Thai, Press Start 2P |

---

*Tiny Guardian — สร้างด้วย ❤️ บน HTML5 Canvas*
