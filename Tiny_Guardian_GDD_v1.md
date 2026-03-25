# 🛡️ Tiny Guardian — ผู้พิทักษ์ตัวจิ๋ว
## Game Design Document v1.0 (Final)

---

## 1. ภาพรวม (Overview)

| หัวข้อ | รายละเอียด |
|--------|------------|
| **ชื่อเกม** | Tiny Guardian — ผู้พิทักษ์ตัวจิ๋ว |
| **แนวเกม** | Single-screen Elimination Platformer (แบบ Bubble Bobble + Diet Go Go) |
| **กลุ่มเป้าหมาย** | เด็กอายุ 6–12 ปี |
| **แพลตฟอร์ม** | Mobile Web (Touch) + Desktop (Keyboard) |
| **Canvas** | 390 × 720 px (Portrait) |
| **เทคโนโลยี** | Vanilla JS, HTML5 Canvas, ไม่มี dependency |
| **Theme** | Yellow Pastel — น่ารักสดใส สำหรับเด็ก |
| **จำนวนด่าน** | 4 ด่าน |

---

## 2. Game Flow (State Machine)

```
LOADING → INTRO → PLAYING (Stage 1→2→3→4) → TALLY → NAME → RANKING → INTRO
                    ↑                           │
                    └── STAGE_CLEAR (ระหว่างด่าน) ┘
                    └── GAME_OVER (HP หมด) ───────┘
```

| State | รายละเอียด |
|-------|------------|
| **LOADING** | โหลด assets ทั้งหมด, progress bar สีเหลือง, ตัวละครเด้ง |
| **INTRO** | Player ยืนกลางจอ + ข้อความ "ปกป้องโลกจากเหล่าวายร้ายกัน! แตะที่จอหรือกด A เพื่อเริ่มกันเลย" |
| **PLAYING** | เล่นจริง — กำจัดศัตรูให้หมดจอจึงผ่านด่าน, มีเวลาจำกัด 90 วินาที/ด่าน |
| **STAGE_CLEAR** | "ด่าน X ผ่าน!" + Time Bonus + แสดงคะแนน → ด่านถัดไป |
| **GAME_OVER** | HP หมด → จบเกม ไปหน้า TALLY |
| **TALLY** | รวมคะแนนทุกด่าน: enemy killed + items + stage bonus + time bonus |
| **NAME** | กรอกชื่อ 3–8 ตัวอักษร |
| **RANKING** | Leaderboard Top 10 (localStorage) → กด A กลับ INTRO |

---

## 3. ระบบควบคุม (Controls)

### 4 ปุ่ม เรียงซ้ายไปขวา:

| ปุ่ม | ตำแหน่ง | Keyboard | Touch | การทำงาน |
|------|---------|----------|-------|----------|
| **← Left** | ซ้ายสุด | A | ปุ่มซ้ายสุด | เดินซ้าย |
| **→ Right** | ที่ 2 | D | ปุ่มที่ 2 | เดินขวา |
| **B (Attack)** | ที่ 3 | B | ปุ่มที่ 3 | กดสั้น = ยิงปกติ, กดค้าง = Charge → ปล่อย = Power Attack |
| **A (Jump)** | ขวาสุด | Space | ปุ่มขวาสุด | กระโดด (กดค้าง = สูง, กดสั้น = ต่ำ) |

### Charge System (ปุ่ม B):
- **กดปล่อยเร็ว** → กระสุนเล็ก (damage 1, วิถีตรง, cooldown 0.4s)
- **กดค้าง 1.5 วินาที** → Charge เต็ม (HUD bar เต็ม + กระพริบ)
- **ปล่อยตอน Charge เต็ม** → Power Attack (damage 3, กระสุนใหญ่ 2×, ทะลุศัตรูได้ 1 ตัว)

### การเคลื่อนที่:
- ซ้าย-ขวาอิสระ
- **ไม่มี wrap-around** — ชนขอบจอจะหยุด
- กระโดดทะลุ platform ขึ้นได้ (one-way platform) แต่ยืนด้านบนได้
- **Variable Jump Height**: กดค้าง Space = กระโดดสูง, กดสั้น = กระโดดต่ำ
- Jump แรงพอขึ้น platform ชั้นถัดไปได้เสมอ (ไม่มี Double Jump)

---

## 4. ระบบ Player

| ค่า | ตัวเลข |
|-----|--------|
| **HP** | 5 (แสดงเป็น ❤️ × 5) |
| **ความเร็วเดิน** | 180 px/s |
| **Jump Velocity** | -780 px/s (แรงพอขึ้น platform ถัดไปเสมอ) |
| **Jump Hold (Variable)** | กดค้าง 200ms = สูงสุด, กดสั้น = ต่ำ |
| **Gravity** | 1500 px/s² |
| **Invincible หลังโดนตี** | 1.5 วินาที (กระพริบ) |
| **ขนาดตัว** | 48 × 56 px |

### สถานะพิเศษ — "อ้วน" (Diet Go Go System):
- โดน Boss โยนอาหารใส่ → เข้าสถานะ **อ้วน**
- **ระดับ 1** (โดน 1 ครั้ง): ความเร็ว -20%, กระโดดต่ำลง -15%
- **ระดับ 2** (โดน 2 ครั้ง): ความเร็ว -40%, กระโดดต่ำลง -30%, ตัวใหญ่ขึ้น 1.3×
- **วิธีลด**: เก็บ item อาหารสุขภาพ 🍎 จะลดอ้วน 1 ระดับ
- **หายเอง**: ถ้าไม่โดนเพิ่ม 8 วินาที จะลดอ้วนลง 1 ระดับ

---

## 5. ออกแบบ 4 ด่าน

### ระบบ Platform ทุกด่าน:
- Single-screen 390 × 720 (ไม่ scroll)
- Platform 3–4 ชั้น + พื้นล่างสุด (Ground)
- One-way platform: กระโดดทะลุขึ้นได้ ยืนบนได้ ตกลงได้ (กดลง+กระโดด หรือเดินออกขอบ)
- ชนขอบจอซ้าย-ขวาหยุด (ไม่ wrap)

---

### ด่าน 1: 🏫 โรงเรียนแสนสนุก

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Background** | โรงเรียนน่ารัก ท้องฟ้าสีฟ้า เมฆปุยๆ |
| **Platform** | 3 ชั้น — โต๊ะเรียน, ชั้นหนังสือ, กระดานดำ |
| **สีหลัก** | เหลืองอ่อน + ฟ้าอ่อน |
| **เวลา** | 90 วินาที |

**ศัตรู:**

| ชื่อ | Emoji | จำนวน | พฤติกรรม | คะแนน |
|------|-------|--------|----------|-------|
| ยางลบซน | 🟥 | 4 | เดินซ้าย-ขวาบน platform, ถึงขอบตก | 100 |
| ดินสอบิน | ✏️ | 2 | บินซิกแซกช้าๆ | 150 |

**Wave System:**
- Wave 1: ยางลบ × 3
- Wave 2: ยางลบ × 1 + ดินสอบิน × 2
- กำจัดหมด = ผ่านด่าน

**Item Drop:** เหรียญดาว ⭐ (50 pts), หนังสือ 📖 (200 pts)

---

### ด่าน 2: 🎪 สวนสนุกมหาสนุก

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Background** | สวนสนุก ชิงช้าสวรรค์ ม่านไฟ |
| **Platform** | 4 ชั้น — ไม่สมมาตร, มีเส้นทางหลายแบบ |
| **สีหลัก** | ชมพูพาสเทล + เหลืองสด |
| **เวลา** | 90 วินาที |

**ศัตรู:**

| ชื่อ | Emoji | จำนวน | พฤติกรรม | คะแนน |
|------|-------|--------|----------|-------|
| ตัวตลก | 🤡 | 4 | เดินซ้าย-ขวา สุ่มกระโดดขึ้น platform บน | 120 |
| ลูกโป่ง | 🎈 | 3 | ลอยขึ้นช้าๆ เลื่อนซ้ายขวา | 150 |
| บูมเมอแรง | 🪃 | 1 | เดินเร็ว + โยน projectile กลับไปกลับมา | 200 |

**Wave System:**
- Wave 1: ตัวตลก × 2 + ลูกโป่ง × 2
- Wave 2: ตัวตลก × 2 + ลูกโป่ง × 1 + บูมเมอแรง × 1
- กำจัดหมด = ผ่านด่าน

**Item Drop:** ป๊อปคอร์น 🍿 (50 pts), ตั๋วทอง 🎫 (200 pts)

---

### ด่าน 3: 🍬 โลกขนมหวาน + Mini Boss

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Background** | ดินแดนขนม ต้นลอลลี่ป๊อป แม่น้ำช็อกโกแลต |
| **Platform** | 4 ชั้น + platform เคลื่อนที่ 1 อัน (เลื่อนซ้ายขวาช้าๆ) |
| **สีหลัก** | ชมพู + มิ้นท์กรีน + ครีม |
| **เวลา** | 90 วินาที |

**ศัตรู:**

| ชื่อ | Emoji | จำนวน | พฤติกรรม | คะแนน |
|------|-------|--------|----------|-------|
| ลูกอมกลิ้ง | 🍭 | 4 | กลิ้งตามพื้น กระดอนขอบ platform | 120 |
| คุกกี้บิน | 🍪 | 3 | บินซิกแซกเร็ว | 180 |
| เยลลี่ | 🟢 | 2 | กระโดดตลอด ยากกว่าจะยิงโดน | 150 |

**Wave System:**
- Wave 1: ลูกอม × 2 + คุกกี้ × 2
- Wave 2: ลูกอม × 2 + เยลลี่ × 2 + คุกกี้ × 1
- **Wave 3 — Mini Boss: "คัพเค้กยักษ์" 🧁**

**Mini Boss — คัพเค้กยักษ์:**

| ค่า | ตัวเลข |
|-----|--------|
| HP | 8 |
| ขนาด | 80 × 80 px (ใหญ่กว่าศัตรูปกติ ~2×) |
| ความเร็ว | 100 px/s |
| คะแนน kill | 800 |

- Pattern: กระโดดตามเปลี่ยน platform + หยุดสั่น → ยิงครีม 3 ทิศ
- เหลือ HP 3: เร่งสปีด + ยิง 5 ทิศ
- Kill = drop Power-up 1 อัน

**Item Drop:** ไอศกรีม 🍦 (50 pts), เค้ก 🎂 (200 pts)

---

### ด่าน 4: 🏰 ปราสาทจอมวายร้าย + Final Boss

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Background** | ปราสาทมืดน่ารัก (ยังคง pastel) ดาวกระพริบ พระจันทร์ยิ้ม |
| **Platform** | 3 ชั้น กว้าง เหมาะสู้ Boss |
| **สีหลัก** | ม่วงพาสเทล + เหลืองทอง |
| **เวลา** | 120 วินาที (นานกว่าเพราะมี Boss) |

**Wave 1 — ศัตรูผสม (6 ตัว):**

| ชื่อ | จำนวน | มาจากด่าน |
|------|--------|-----------|
| ยางลบซน 🟥 | 1 | ด่าน 1 |
| ตัวตลก 🤡 | 2 | ด่าน 2 |
| ลูกอมกลิ้ง 🍭 | 1 | ด่าน 3 |
| คุกกี้บิน 🍪 | 1 | ด่าน 3 |
| เยลลี่ 🟢 | 1 | ด่าน 3 |

**Wave 2 — Final Boss: "จอมวายร้ายจิ๋ว" 👿 (Diet Go Go Style)**

| ค่า | ตัวเลข |
|-----|--------|
| HP | 15 |
| ขนาด | 96 × 96 px |
| ตำแหน่ง | อยู่กลางจอ บน platform ชั้นบนสุด |
| คะแนน kill | 2000 |

**Boss Pattern (3 Phase):**

**Phase 1 (HP 15–10):** "โยนอาหาร"
- อยู่กลาง platform บน → โยนอาหาร (🍔🍕🍩) ลงมา 2–3 ลูก
- โดนอาหาร = สถานะ "อ้วน" (ช้าลง)
- Boss สุ่ม spawn ลูกสมุน (ยางลบ) 1 ตัวทุก 8 วินาที

**Phase 2 (HP 9–5):** "กระโดดไล่"
- Boss กระโดดไปมาระหว่าง platform + โยนอาหาร 3–4 ลูก
- Spawn ลูกสมุน 2 ตัวทุก 8 วินาที
- Drop item อาหารสุขภาพ 🍎 (ลดอ้วน) เป็นครั้งคราว

**Phase 3 (HP 4–0):** "คลั่ง!"
- Boss เร่งสปีด 1.5× + โยนอาหาร 5 ลูก + สุ่มกระโดดถี่
- เปลี่ยนสีเป็นแดงโกรธ
- Spawn ลูกสมุน 2 ตัวทุก 5 วินาที
- Drop item อาหาร 🍎 ถี่ขึ้น

---

## 6. AI ศัตรู (Bubble Bobble Style)

### Pattern พื้นฐาน (ทุกศัตรูพื้น):
1. **Patrol** — เดินซ้าย-ขวาบน platform ปัจจุบัน
2. **Edge Fall** — ถึงขอบ platform → 60% เลี้ยวกลับ, 40% ตกลงชั้นล่าง
3. **Random Jump** — สุ่ม 15% ต่อวินาทีกระโดดขึ้น platform ชั้นบน (ถ้ามี)
4. **Ground Wrap** — ถ้าอยู่พื้นล่างสุดแล้วตก → teleport ไปบน platform ชั้นบนสุด (เหมือน Bubble Bobble)
5. **Angry Mode** — อยู่นานเกิน 25 วินาที → เปลี่ยนสีเป็นแดง, สปีด ×1.5, กระโดดถี่ขึ้น

### Pattern ศัตรูบิน:
1. **Float** — ลอยซิกแซก ขึ้น-ลง ซ้าย-ขวา
2. **Angry** — 25 วินาที → สปีด ×1.5

### Pattern ศัตรู projectile (บูมเมอแรง, ปลาปักเป้า):
1. ใช้ Pattern พื้นฐาน + หยุดยิงทุก 3–4 วินาที
2. Projectile เคลื่อนที่ตรงหรือโค้ง, หายหลัง 2 วินาที

---

## 7. Power-up System

เมื่อ clear wave หรือ kill Mini Boss/Boss จะ drop Power-up 1 อัน สุ่มจาก:

| Power-up | Emoji | ผล | ระยะเวลา |
|----------|-------|----|----------|
| **Speed Boost** | ⚡ | เคลื่อนที่เร็วขึ้น 40% | 10 วินาที |
| **Shield** | 🛡️ | กันดาเมจ 1 ครั้ง | จนกว่าจะโดนตี |
| **Triple Shot** | 🔱 | ยิง 3 ทิศ (ตรง + เฉียงบน + เฉียงล่าง) | 12 วินาที |
| **Heal** | 💖 | ฟื้น HP 1 หัวใจ | ทันที |
| **Bomb** | 💣 | ศัตรูทุกตัวบนจอรับ damage 2 | ทันที |
| **Magnet** | 🧲 | ดูด item เข้าหาตัวรัศมี 150px | 10 วินาที |

---

## 8. ระบบคะแนน (Scoring)

### คะแนนจากการกำจัดศัตรู:
- แต่ละตัว = ค่า points ตามตาราง (100–200)
- **Combo System**: kill ภายใน 2 วินาที → combo ×2, ×3, ×4... (สูงสุด ×8)
- Combo reset ถ้าไม่ kill ภายใน 2 วินาที

### คะแนนจาก Items:
- เหรียญ/ของเล็ก = 50 pts
- ของพิเศษ = 200 pts

### Stage Clear Bonus:
- ผ่านด่าน = 500 pts
- **Time Bonus** = เวลาที่เหลือ × 10 pts (เช่น เหลือ 45 วิ = 450 pts)

### Boss/Mini Boss Kill Bonus:
- Mini Boss (ด่าน 3) = 800 pts
- Final Boss (ด่าน 4) = 2000 pts

### สูตรคะแนนรวม:
```
Total = Σ(enemy kill × combo) + Σ(items) + Σ(stage bonus + time bonus) + boss bonus
```

---

## 9. Theme & Color Palette — Yellow Pastel

### สีหลัก:

| ชื่อ | Hex | ใช้กับ |
|------|-----|--------|
| **Primary (Yellow)** | `#FFD54F` | ปุ่ม, UI หลัก, highlight, charge bar |
| **Primary Light** | `#FFF8E1` | พื้นหลัง panel, sky |
| **Primary Dark** | `#F9A825` | ขอบ, text เน้น, warning |
| **Warm Orange** | `#FFB74D` | charge bar เต็ม, กระพริบ |
| **Soft Pink** | `#F8BBD0` | HP heart, enemy blush, ด่าน 2 accent |
| **Mint Green** | `#A5D6A7` | platform ด่าน 1, ground, health item |
| **Sky Blue** | `#81D4FA` | ฟ้า background ด่าน 1 |
| **Lavender** | `#CE93D8` | ด่าน 4 accent, boss arena |
| **Cream White** | `#FFFDE7` | text background, panel |
| **Cocoa Dark** | `#4E342E` | text หลัก, outline |
| **Soft Red** | `#EF9A9A` | damage flash, angry enemy |
| **Gold** | `#FFD700` | combo text, bonus, ranking |

### สีประจำด่าน:

| ด่าน | Background | Platform | Accent |
|------|-----------|----------|--------|
| 1 🏫 | `#E3F2FD` ฟ้าอ่อน | `#A5D6A7` มิ้นท์ | `#FFD54F` เหลือง |
| 2 🎪 | `#FCE4EC` ชมพูอ่อน | `#F8BBD0` ชมพู | `#FFB74D` ส้ม |
| 3 🍬 | `#FFF8E1` ครีม | `#F8BBD0` ชมพู + `#A5D6A7` มิ้นท์ | `#CE93D8` ม่วง |
| 4 🏰 | `#EDE7F6` ม่วงอ่อน | `#CE93D8` ลาเวนเดอร์ | `#FFD700` ทอง |

### ฟอนต์:
- **หัวข้อ**: Fredoka One (กลม น่ารัก)
- **เนื้อหา**: Nunito (อ่านง่าย)
- **Fallback**: Segoe UI Emoji, sans-serif

---

## 10. Layout หน้าจอ (390 × 720)

```
┌───────────────────────────────────┐  ← 0px
│  ❤❤❤❤❤  STAGE 1   ⭐ 12350      │  ← HUD Row 1 (HP, Stage, Score)
│  ⏱ 0:45  [████████░░] Charge     │  ← HUD Row 2 (Timer, Charge bar)
├───────────────────────────────────┤  ← ~70px
│                                   │
│   ═══════════   ═══════════       │  ← Platform ชั้น 3 (~170px)
│                     👾            │
│       ═══════════════             │  ← Platform ชั้น 2 (~290px)
│   👾              👾              │
│   ═══════════   ═══════════       │  ← Platform ชั้น 1 (~400px)
│                                   │
│  🦸                               │  ← Player
│ ═══════════════════════════════   │  ← Ground (~530px)
│                                   │
├───────────────────────────────────┤  ← ~570px
│                                   │
│    [←] [→]           [B]  [A]    │  ← Joypad 4 ปุ่ม
│                                   │
└───────────────────────────────────┘  ← 720px

พื้นที่เกม:    ~70px → ~570px  = 500px สูง
พื้นที่ HUD:   ~0px → ~70px    = 70px
พื้นที่ Joypad: ~570px → 720px = 150px
```

### Joypad Layout (4 ปุ่ม):
```
[  ←  ] [  →  ]                [  B  ] [  A  ]
  Left    Right                 Attack   Jump
  ← ซ้ายมือ →              ← ขวามือ →
```
- ปุ่ม Left/Right: มุมซ้ายล่าง ติดกัน
- ปุ่ม B/A: มุมขวาล่าง ติดกัน
- ทุกปุ่มกลม เส้นผ่านศูนย์กลาง ~56px
- สี: B = `#F9A825` (ส้มเหลือง), A = `#FFD54F` (เหลือง), ←→ = `#81D4FA` (ฟ้า)

---

## 11. โครงสร้างโปรเจกต์

```
tiny-guardian/
├── index.html              # entry point + boot + PWA + canvas scaling
├── manifest.json           # PWA manifest
├── js/
│   ├── settings.js         # ⚙️  ALL config — สี, ค่าทุกอย่าง, stage data
│   ├── player.js           # Player: เคลื่อนที่, กระโดด (variable height), charge, อ้วน
│   ├── world.js            # Platform layout per stage, background
│   ├── enemy.js            # Enemy AI (Bubble Bobble style), spawn, wave
│   ├── boss.js             # Mini Boss (ด่าน 3) + Final Boss (ด่าน 4)
│   ├── projectile.js       # กระสุนปกติ + charge shot + enemy projectile
│   ├── items.js            # Item drop, Power-up, scoring
│   ├── hud.js              # HUD: HP, Score, Stage, Timer, Charge bar
│   ├── ranking.js          # TallyScreen, NameEntry, Leaderboard
│   └── game.js             # Main loop, State machine, Input, Audio
└── assets/
    ├── images/             # Sprite sheets (fallback → emoji)
    └── sounds/             # SFX + BGM (fallback → เล่นได้ไม่มีเสียง)
```

---

## 12. Assets List

### รูปภาพ (assets/images/):

| ไฟล์ | ขนาดแนะนำ | Frames | ใช้กับ |
|------|-----------|--------|--------|
| `player.png` | 48×56 × 8 frames | idle(2), walk(4), jump(1), attack(1) | Player |
| `bg_stage1.png` | 390×500 | 1 | Background ด่าน 1 |
| `bg_stage2.png` | 390×500 | 1 | Background ด่าน 2 |
| `bg_stage3.png` | 390×500 | 1 | Background ด่าน 3 |
| `bg_stage4.png` | 390×500 | 1 | Background ด่าน 4 |
| `platform.png` | 64×16 × 4 | 4 (1 per stage theme) | Platform tile |
| `enemy_eraser.png` | 40×40 × 3 | walk(2), die(1) | ยางลบ |
| `enemy_pencil.png` | 36×42 × 3 | fly(2), die(1) | ดินสอบิน |
| `enemy_clown.png` | 44×48 × 3 | walk(2), die(1) | ตัวตลก |
| `enemy_balloon.png` | 36×44 × 3 | float(2), die(1) | ลูกโป่ง |
| `enemy_candy.png` | 40×40 × 3 | roll(2), die(1) | ลูกอม |
| `enemy_cookie.png` | 38×38 × 3 | fly(2), die(1) | คุกกี้ |
| `enemy_jelly.png` | 40×40 × 3 | bounce(2), die(1) | เยลลี่ |
| `miniboss_cupcake.png` | 80×80 × 4 | idle(1), attack(1), angry(1), die(1) | คัพเค้กยักษ์ |
| `boss.png` | 96×96 × 5 | idle(1), attack(1), jump(1), angry(1), die(1) | Final Boss |
| `projectile.png` | 16×16 × 2 | normal(1), charge(1) | กระสุน Player |
| `item_coin.png` | 24×24 | 1 | เหรียญ |
| `item_special.png` | 28×28 | 1 | ของพิเศษ |
| `item_food.png` | 24×24 | 1 | อาหารสุขภาพ |
| `power_up.png` | 32×32 | 1 | Power-up glow ring |
| `boss_food.png` | 24×24 × 3 | 🍔🍕🍩 | อาหารที่ Boss โยน |

> **Fallback**: ทุก asset ถ้าโหลดไม่ได้ → ใช้ emoji แทนอัตโนมัติ

### เสียง (assets/sounds/):

| ไฟล์ | เหตุการณ์ |
|------|-----------|
| `bgm_stage1.mp3` | BGM ด่าน 1 (สนุกสดใส) |
| `bgm_stage2.mp3` | BGM ด่าน 2 (คึกคัก) |
| `bgm_stage3.mp3` | BGM ด่าน 3 (ครึกครื้น) |
| `bgm_stage4.mp3` | BGM ด่าน 4 (ตื่นเต้นลึกลับ) |
| `bgm_boss.mp3` | BGM ตอนสู้ Boss |
| `jump.wav` | กระโดด |
| `attack.wav` | ยิงกระสุน |
| `charge_full.wav` | Charge เต็ม |
| `charge_release.wav` | ปล่อย Power Attack |
| `hit.wav` | โดนตี |
| `enemy_die.wav` | ศัตรูตาย |
| `coin.wav` | เก็บ item |
| `powerup.wav` | ได้ Power-up |
| `stage_clear.wav` | ผ่านด่าน |
| `boss_warning.wav` | Boss ปรากฏตัว |
| `boss_hit.wav` | ยิงโดน Boss |
| `die.wav` | Player ตาย |
| `fat.wav` | โดนอาหาร (อ้วน) |
| `slim.wav` | ลดอ้วน |

> **Fallback**: ไม่มีไฟล์เสียง → เกมยังเล่นได้ปกติ

---

## 13. แผนการพัฒนา (Build Order)

| ลำดับ | งาน | ไฟล์ | ประมาณบรรทัด |
|-------|------|------|------------|
| 1 | settings.js — Config ทุกอย่าง, สี, stage data, enemy data | settings.js | ~250 |
| 2 | index.html — Layout, Loading, Canvas scaling, iOS audio | index.html | ~180 |
| 3 | world.js — Platform system, background per stage | world.js | ~200 |
| 4 | player.js — เคลื่อนที่, กระโดด (variable height), charge, อ้วน | player.js | ~400 |
| 5 | projectile.js — กระสุนปกติ + charge + enemy projectile | projectile.js | ~200 |
| 6 | enemy.js — AI Bubble Bobble, patrol, fall, jump, angry, wave | enemy.js | ~400 |
| 7 | items.js — Item drop, power-up effects | items.js | ~250 |
| 8 | boss.js — Mini Boss + Final Boss (Diet Go Go) | boss.js | ~450 |
| 9 | hud.js — HP, Score, Stage, Timer, Charge bar, Combo | hud.js | ~250 |
| 10 | ranking.js — Tally, Name entry, Leaderboard | ranking.js | ~400 |
| 11 | game.js — State machine, main loop, input, audio, stages | game.js | ~800 |
| 12 | Polish — particles, screen shake, juice | ทุกไฟล์ | ~200 |
| | **รวมประมาณ** | | **~4,000** |

---

## 14. สรุปข้อแตกต่างจากตัวอย่าง Endless Runner

| Endless Runner (ตัวอย่าง) | Tiny Guardian (ใหม่) |
|---|---|
| จอเลื่อน scroll ตลอด | จอนิ่ง single-screen |
| Player อยู่ซ้ายวิ่งไปขวา | Player เคลื่อนที่อิสระ ซ้าย-ขวา |
| ศัตรูมาจากขวา | ศัตรู spawn บน platform เดินไปมา (Bubble Bobble AI) |
| ไม่มีด่าน (วิ่งไม่รู้จบ) | 4 ด่าน + Mini Boss + Final Boss |
| ปุ่ม 2 ปุ่ม (Jump, Fire) | ปุ่ม 4 ปุ่ม (←, →, B, A) |
| ไม่มี Charge | มี Charge attack system |
| Parallax background scroll | Static background per stage |
| ไม่มีระบบเวลา | 90 วินาที/ด่าน + Time Bonus |
| ไม่มีระบบอ้วน | Diet Go Go "อ้วน" system (ด่าน 4 Boss) |
| Green Pastel theme | **Yellow Pastel** theme — น่ารักสดใส |
