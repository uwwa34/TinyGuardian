// ═══════════════════════════════════════════════════
//  js/player.js  —  Tiny Guardian
//  Player movement, jump (variable height), charge attack, fat system
// ═══════════════════════════════════════════════════

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = WIDTH / 2 - PLAYER_W / 2;
    this.y = GROUND_Y - PLAYER_H;
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.vx = 0;
    this.vy = 0;
    this.hp = PLAYER_HP;
    this.maxHp = PLAYER_HP;
    this.grounded = true;
    this.isP2 = false;   // set true for Player 2
    this.coopActive = false; // set true in co-op mode
    this.onPlatform = null;
    this.facing = 1; // 1=right, -1=left

    // Jump
    this.jumping = false;
    this.jumpHoldTime = 0;

    // Attack / Charge
    this.charging = false;
    this.chargeTime = 0;
    this.chargeFull = false;
    this.attackCooldown = 0;

    // Invincibility
    this.invincible = false;
    this.invincibleTimer = 0;

    // Fat system
    this.fatLevel = 0;
    this.fatDecayTimer = 0;

    // Power-ups
    this.powerups = {};  // key → remaining ms
    this.shieldActive = false;

    // Animation
    this.animFrame = 0;
    this.animTimer = 0;
    this.state = 'idle'; // idle, walk, jump, attack, hurt

    // Score tracking
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.itemsCollected = 0;
  }

  get drawW() { return this.w * FAT.SCALE[this.fatLevel]; }
  get drawH() { return this.h * FAT.SCALE[this.fatLevel]; }
  get speed() { return PLAYER_SPEED * (1 - FAT.SPEED_PENALTY[this.fatLevel]) * (this.powerups.speed ? 1.4 : 1); }
  get jumpVel() { return JUMP_VEL * (1 - FAT.JUMP_PENALTY[this.fatLevel]); }

  // ── Update ──────────────────────────────────────
  update(dt, input, world, game) {
    // Combo decay
    if (this.combo > 0) {
      this.comboTimer -= dt * 1000;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Invincibility
    if (this.invincible) {
      this.invincibleTimer -= dt * 1000;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // Fat decay
    if (this.fatLevel > 0) {
      this.fatDecayTimer -= dt * 1000;
      if (this.fatDecayTimer <= 0) {
        this.fatLevel--;
        this.fatDecayTimer = FAT.DECAY_MS;
        if (game) game.playSfx('slim');
      }
    }

    // Power-up timers
    for (const k in this.powerups) {
      if (this.powerups[k] > 0) {
        this.powerups[k] -= dt * 1000;
        if (this.powerups[k] <= 0) delete this.powerups[k];
      }
    }

    // Attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 1000;

    // ── Movement ──
    this.vx = 0;
    if (input.left)  { this.vx = -this.speed; this.facing = -1; }
    if (input.right) { this.vx =  this.speed; this.facing = 1; }

    // Charge
    if (input.btnB) {
      if (!this.charging) {
        this.charging = true;
        this.chargeTime = 0;
        this.chargeFull = false;
      }
      this.chargeTime += dt * 1000;
      if (this.chargeTime >= WEAPON_CHARGE_MS && !this.chargeFull) {
        this.chargeFull = true;
        if (game) game.playSfx('charge_full');
      }
    } else if (this.charging) {
      // Release
      this.charging = false;
      if (this.chargeFull) {
        this._fireCharge(game);
      } else if (this.attackCooldown <= 0) {
        this._fireNormal(game);
      }
      this.chargeTime = 0;
      this.chargeFull = false;
    }

    // Jump — only initiate on fresh press (jumpPressed), not while held
    if (input.jumpPressed && this.grounded) {
      this.vy = this.jumpVel;
      this.grounded = false;
      this.jumping = true;
      this.jumpHoldTime = 0;
      this.onPlatform = null;
      if (game) game.playSfx('jump');
    }
    // Variable jump height — hold btnA to maintain upward velocity
    if (this.jumping) {
      if (input.btnA) {
        this.jumpHoldTime += dt * 1000;
        if (this.jumpHoldTime >= JUMP_HOLD_MS) {
          this.jumping = false; // max height reached
        }
      } else {
        // Released early → cut velocity for short jump
        this.jumping = false;
        if (this.vy < JUMP_VEL_MIN) {
          this.vy = JUMP_VEL_MIN;
        }
      }
    }

    // Gravity
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
    }

    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wall clamp
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > WIDTH) this.x = WIDTH - this.w;

    // Platform collision
    this._resolvePlatforms(world);

    // Fell below screen → teleport to top (like Bubble Bobble ground wrap for player too)
    if (this.y > PLAY_BOTTOM + 20) {
      this.y = PLAY_TOP;
      this.vy = 0;
    }

    // Animation
    this._updateAnim(dt);

    // Update state
    if (this.invincible && this.invincibleTimer > INVINCIBLE_MS - 200) {
      this.state = 'hurt';
    } else if (!this.grounded) {
      this.state = 'jump';
    } else if (this.vx !== 0) {
      this.state = 'walk';
    } else {
      this.state = 'idle';
    }
  }

  _resolvePlatforms(world) {
    const surfaces = world.getAllSurfaces();
    this.grounded = false;
    this.onPlatform = null;

    if (this.vy < 0) return; // Moving upward → pass through (one-way)

    // Use center-biased overlap: only land if center 60% of player is over platform
    const cx = this.x + this.w * 0.2;  // inner left
    const cw = this.w * 0.6;           // inner width (60%)

    for (const p of surfaces) {
      const feetY = this.y + this.h;
      const threshold = Math.max(14, this.vy * 0.04 + 6);
      if (feetY >= p.y && feetY <= p.y + threshold &&
          cx + cw > p.x && cx < p.x + p.w) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
        this.onPlatform = p;
        break;
      }
    }
  }

  // ── Projectile ──────────────────────────────────
  _fireNormal(game) {
    this.attackCooldown = PROJ_COOLDOWN_MS;
    this.state = 'attack';
    if (game) {
      const px = this.facing > 0 ? this.x + this.w : this.x - PROJ_W;
      const py = this.y + this.h / 2 - PROJ_H / 2;
      game.spawnProjectile(px, py, this.facing, false);
      game.playSfx('attack');
    }
  }

  _fireCharge(game) {
    this.attackCooldown = PROJ_COOLDOWN_MS;
    this.state = 'attack';
    if (game) {
      const px = this.facing > 0 ? this.x + this.w : this.x - PROJ_CHARGE_W;
      const py = this.y + this.h / 2 - PROJ_CHARGE_H / 2;
      game.spawnProjectile(px, py, this.facing, true);
      game.playSfx('charge_release');
    }
  }

  // ── Damage ──────────────────────────────────────
  takeDamage(game) {
    if (this.invincible) return;
    if (this.shieldActive) {
      this.shieldActive = false;
      delete this.powerups.shield;
      this.invincible = true;
      this.invincibleTimer = 500;
      return;
    }
    this.hp--;
    this.invincible = true;
    this.invincibleTimer = INVINCIBLE_MS;
    if (game) game.playSfx('hit');
  }

  getFat(game) {
    if (this.fatLevel < FAT.MAX_LEVEL) {
      this.fatLevel++;
      this.fatDecayTimer = FAT.DECAY_MS;
      if (game) game.playSfx('fat');
    }
  }

  healFat(game) {
    if (this.fatLevel > 0) {
      this.fatLevel--;
      this.fatDecayTimer = FAT.DECAY_MS;
      if (game) game.playSfx('slim');
    }
  }

  addCombo() {
    this.combo = Math.min(this.combo + 1, COMBO_MAX);
    this.comboTimer = COMBO_TIMEOUT_MS;
  }

  getComboMultiplier() {
    return Math.max(1, this.combo);
  }

  // ── Power-up Application ────────────────────────
  applyPowerup(type, game) {
    const pu = POWERUP_TYPES[type];
    if (!pu) return;
    if (type === 'HEAL') {
      this.hp = Math.min(this.hp + 1, this.maxHp);
    } else if (type === 'SHIELD') {
      this.shieldActive = true;
      this.powerups.shield = 999999;
    } else if (type === 'BOMB') {
      if (game) game.bombAllEnemies();
    } else if (type === 'SPEED') {
      this.powerups.speed = pu.duration;
    } else if (type === 'TRIPLE') {
      this.powerups.triple = pu.duration;
    } else if (type === 'MAGNET') {
      this.powerups.magnet = pu.duration;
    }
  }

  // ── Animation ───────────────────────────────────
  _updateAnim(dt) {
    this.animTimer += dt;
    if (this.animTimer > 0.12) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  // ── Draw ────────────────────────────────────────
  draw(ctx, images) {
    if (this.invincible && Math.floor(this.invincibleTimer / 80) % 2 === 0) return;
    // Ghost mode — dead player
    const isGhost = this.hp <= 0;
    if (isGhost && !this.coopActive) return; // solo dead = don't draw

    const dw = this.drawW;
    const dh = this.drawH;
    const dx = this.x + (this.w - dw) / 2;
    const dy = this.y + (this.h - dh);

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.3;

    // Walk animation — bob body up/down + slight lean
    let bobY = 0, leanAngle = 0;
    if (this.state === 'walk' && this.grounded) {
      bobY = Math.sin(this.animFrame * Math.PI * 0.5) * 3.5;
      leanAngle = Math.sin(this.animFrame * Math.PI * 0.5) * 0.06 * this.facing;
    }

    const cx = dx + dw / 2, cy = dy + dh + bobY;

    // Flip if facing left
    if (this.facing < 0) {
      ctx.translate(dx + dw, dy + bobY);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(dx, dy + bobY);
    }
    // Lean
    if (leanAngle !== 0) {
      ctx.translate(dw / 2, dh);
      ctx.rotate(leanAngle);
      ctx.translate(-dw / 2, -dh);
    }

    if (images && images.player) {
      const img = images.player;
      const aspect = img.width / img.height;
      if (aspect > 1.5) {
        const frameW = Math.floor(img.height * (PLAYER_W / PLAYER_H));
        ctx.drawImage(img, 0, 0, frameW, img.height, 0, 0, dw, dh);
      } else {
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, dw, dh);
      }
      // P2 blue tint
      if (this.isP2) {
        ctx.globalAlpha = 0.35;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#42A5F5';
        ctx.fillRect(0, 0, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = isGhost ? 0.3 : 1;
      }
    } else {
      this._drawEmoji(ctx, dw, dh);
    }

    ctx.restore();

    // Shield glow
    if (this.shieldActive) {
      ctx.save();
      ctx.strokeStyle = '#81D4FA';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.3;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, Math.max(dw, dh) / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Fat indicator
    if (this.fatLevel > 0) {
      ctx.save();
      ctx.font = '10px ' + FONT.BODY;
      ctx.fillStyle = '#EF5350';
      ctx.textAlign = 'center';
      ctx.fillText(this.fatLevel === 1 ? '💦' : '💦💦', this.x + this.w / 2, this.y - 4);
      ctx.restore();
    }
  }

  _drawEmoji(ctx, dw, dh) {
    // Body — P2 is blue
    const bodyCol = this.isP2 ? '#81D4FA' : (this.fatLevel >= 2 ? '#FFCC80' : '#FFE082');
    ctx.fillStyle = bodyCol;
    // Rounded body
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(dw - r, 0);
    ctx.quadraticCurveTo(dw, 0, dw, r);
    ctx.lineTo(dw, dh - r);
    ctx.quadraticCurveTo(dw, dh, dw - r, dh);
    ctx.lineTo(r, dh);
    ctx.quadraticCurveTo(0, dh, 0, dh - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    // Face outline
    ctx.strokeStyle = COL.COCOA;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    const eyeY = dh * 0.35;
    const eyeSpacing = dw * 0.18;
    ctx.fillStyle = COL.COCOA;
    // Left eye
    ctx.beginPath();
    ctx.arc(dw / 2 - eyeSpacing, eyeY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(dw / 2 + eyeSpacing, eyeY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(dw / 2 - eyeSpacing + 1, eyeY - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dw / 2 + eyeSpacing + 1, eyeY - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(248,187,208,0.5)';
    ctx.beginPath();
    ctx.ellipse(dw / 2 - eyeSpacing - 5, eyeY + 8, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(dw / 2 + eyeSpacing + 5, eyeY + 8, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = COL.COCOA;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const mouthState = this.state === 'hurt' ? 'sad' : (this.state === 'attack' ? 'open' : 'smile');
    const my = dh * 0.55;
    if (mouthState === 'smile') {
      ctx.arc(dw / 2, my - 2, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    } else if (mouthState === 'open') {
      ctx.arc(dw / 2, my, 4, 0, Math.PI * 2);
      ctx.fillStyle = COL.COCOA;
      ctx.fill();
    } else {
      ctx.arc(dw / 2, my + 4, 5, 1.1 * Math.PI, 1.9 * Math.PI);
    }
    ctx.stroke();

    // Cape (little triangle behind)
    ctx.fillStyle = '#EF5350';
    ctx.beginPath();
    ctx.moveTo(dw * 0.15, dh * 0.2);
    ctx.lineTo(-4, dh * 0.7);
    ctx.lineTo(dw * 0.2, dh * 0.6);
    ctx.closePath();
    ctx.fill();

    // Walk animation — legs stride
    if (this.state === 'walk') {
      const stride = Math.sin(this.animFrame * Math.PI / 2);
      const legW = 9, legH = 8;
      ctx.fillStyle = COL.COCOA;
      // Left leg
      ctx.fillRect(dw * 0.22 + stride * 4, dh - legH + 1, legW, legH);
      // Right leg
      ctx.fillRect(dw * 0.58 - stride * 4, dh - legH + 1, legW, legH);
    } else {
      ctx.fillStyle = COL.COCOA;
      ctx.fillRect(dw * 0.22, dh - 6, 9, 7);
      ctx.fillRect(dw * 0.58, dh - 6, 9, 7);
    }
  }

  // Hitbox
  getHitbox() {
    return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 4 };
  }
}
