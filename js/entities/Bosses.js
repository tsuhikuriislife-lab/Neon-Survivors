import { state } from '../engine/gameState.js';
import { dist, drawPolygon } from '../engine/Utils.js';
import { spawnExplosion, FloatingText, HazardArea } from './Effects.js';
import { Gem } from './Collectibles.js';
import { Projectile, AcceleratingProjectile, FallingProjectile } from './Projectiles.js';

export class KyrenBoss {
  constructor() {
    this.name = "Kyren";
    this.x = state.width / 2;
    this.y = state.height / 2 - 180;
    this.radius = 150;
    this.maxHp = 22000;
    this.hp = 22000;
    this.color = "#00ffcc";
    this.orbitAngle = 0;
    this.orbitRadius = Math.min(state.width, state.height) * 0.50;
    this.angle = 0;
    this.innerAngle = 0;

    this.state = 0;
    this.stateTimer = 0;
    this.chargeTargetX = 0;
    this.chargeTargetY = 0;
    this.chargeStartX = 0;
    this.chargeStartY = 0;

    this.isSplit = false;
    this.denzel = null;
    this.dead = false;
  }

  getTargetables() {
    const list = [];
    if (!this.dead) list.push(this);
    if (this.denzel && !this.denzel.dead) list.push(this.denzel);
    return list;
  }

  takeDamage(amt, damageColor = "#00ffcc") {
    this.hp -= amt;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, Math.round(amt), damageColor, 16));

    if (!this.isSplit && this.hp <= this.maxHp * 0.5) {
      this.split();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      spawnExplosion(this.x, this.y, this.color, 40, 6);
      for (let i = 0; i < 15; i++) state.gems.push(new Gem(this.x + (Math.random()*40-20), this.y + (Math.random()*40-20), 10));
    }
  }

  split() {
    this.isSplit = true;
    const sharedHp = this.hp / 2;
    this.hp = sharedHp;
    this.maxHp = this.maxHp / 2;
    this.denzel = new DenzelBoss(this.x, this.y, sharedHp, sharedHp);
  }

  update(player) {
    this.angle += 0.02;
    this.innerAngle -= 0.04;

    if (this.denzel && !this.denzel.dead) {
      this.denzel.update(player);
    }

    if (this.dead) return;

    this.stateTimer++;
    const cx = state.width / 2;
    const cy = state.height / 2;

    if (this.state === 0) {
      this.orbitAngle += 0.015;
      this.x = cx + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = cy + Math.sin(this.orbitAngle) * this.orbitRadius;

      if (this.stateTimer % 75 === 0) {
        this.fireWave();
      }

      if (this.stateTimer >= 380) {
        this.state = 1;
        this.stateTimer = 0;
        const oppositeAngle = this.orbitAngle + Math.PI;
        this.chargeStartX = this.x;
        this.chargeStartY = this.y;
        this.chargeTargetX = cx + Math.cos(oppositeAngle) * this.orbitRadius;
        this.chargeTargetY = cy + Math.sin(oppositeAngle) * this.orbitRadius;
      }
    } else if (this.state === 1) {
      if (this.stateTimer >= 90) {
        this.state = 2;
        this.stateTimer = 0;
      }
    } else if (this.state === 2) {
      const progress = Math.min(1, this.stateTimer / 25);
      this.x = this.chargeStartX + (this.chargeTargetX - this.chargeStartX) * progress;
      this.y = this.chargeStartY + (this.chargeTargetY - this.chargeStartY) * progress;

      if (progress >= 1) {
        this.state = 0;
        this.stateTimer = 0;
        this.orbitAngle = Math.atan2(this.y - cy, this.x - cx);
      }
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(35, this.color);
    }
  }

  fireWave() {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count;
      state.enemyProjectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 4, Math.sin(a) * 4, 15, "#00ffcc", 5, true));
    }
  }

  draw(ctx) {
    if (this.denzel && !this.denzel.dead) {
      this.denzel.draw(ctx);
    }

    if (this.dead) return;

    if (this.state === 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.chargeStartX, this.chargeStartY);
      ctx.lineTo(this.chargeTargetX, this.chargeTargetY);
      ctx.strokeStyle = `rgba(0, 255, 204, ${Math.abs(Math.sin(this.stateTimer * 0.15))})`;
      ctx.lineWidth = 6;
      ctx.setLineDash([12, 8]);
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();
    }

    drawPolygon(ctx, this.x, this.y, this.radius, 8, this.angle, this.color, 18, "rgba(0, 255, 204, 0.1)");
    if (!this.isSplit) {
      drawPolygon(ctx, this.x, this.y, this.radius * 0.52, 8, this.innerAngle, "#ffffff", 10, "rgba(255, 255, 255, 0.2)");
    }
  }
}

export class DenzelBoss {
  constructor(x, y, hp, maxHp) {
    this.name = "Denzel";
    this.x = x;
    this.y = y;
    this.targetY = 160; // Lower height than 80
    this.radius = 75;
    this.hp = hp;
    this.maxHp = maxHp;
    this.color = "#ffffff";
    this.vx = 4.2;
    this.angle = 0;
    this.fireTimer = 0;
    this.dead = false;
  }

  takeDamage(amt, damageColor = "#ffffff") {
    this.hp -= amt;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, Math.round(amt), damageColor, 14));
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      spawnExplosion(this.x, this.y, "#ffffff", 25, 5);
    }
  }

  update(player) {
    if (this.dead) return;
    this.angle -= 0.05;

    if (Math.abs(this.y - this.targetY) > 3) {
      this.y += Math.sign(this.targetY - this.y) * 2;
    } else {
      this.y = this.targetY;
    }

    this.x += this.vx;
    if (this.x < 50 || this.x > state.width - 50) {
      this.vx *= -1;
    }

    this.fireTimer++;
    if (this.fireTimer >= 100) {
      this.fireTimer = 0;
      for (let i = -1; i <= 1; i++) {
        state.fallingProjectiles.push(new FallingProjectile(this.x, this.y, i * 2.2, -7, 18, "#ffffff"));
      }
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(22, this.color);
    }
  }

  draw(ctx) {
    if (this.dead) return;
    drawPolygon(ctx, this.x, this.y, this.radius, 8, this.angle, this.color, 12, "rgba(255, 255, 255, 0.3)");
  }
}

export class DevourerOfTaxBoss {
  constructor() {
    this.name = "Devourer of Tax";
    this.segmentCount = 45;
    this.segmentLength = 56;
    this.radius = 56;
    this.maxHp = 33000;
    this.hp = 33000;
    this.dead = false;

    this.x = state.width / 2;
    this.y = -100;
    this.vx = 0;
    this.vy = 2;
    this.speed = 2.7;
    this.maxSpeed = 4.8;
    this.accel = 0.01;

    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }

    this.acidTimer = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0;
    
    this.isSplit = false;
    this.carlos = null;
    this.sebastian = null;
  }

  getTargetables() {
    const list = [];
    if (!this.dead) {
      this.segments.forEach(seg => {
        list.push({
          x: seg.x,
          y: seg.y,
          radius: this.radius,
          parent: this,
          takeDamage: (amt, color) => this.takeDamage(amt, color, seg.x, seg.y)
        });
      });
    }
    if (this.carlos && !this.carlos.dead) list.push(...this.carlos.getTargetables());
    if (this.sebastian && !this.sebastian.dead) list.push(...this.sebastian.getTargetables());
    return list;
  }

  takeDamage(amt, damageColor = "#39ff14", hitX = this.x, hitY = this.y) {
    this.hp -= amt;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(hitX + offsetX, hitY + offsetY, Math.round(amt), damageColor, 16));

    if (!this.isSplit && this.hp <= this.maxHp * 0.5) {
      this.split();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      spawnExplosion(this.x, this.y, "#00ff66", 45, 6);
      for (let i = 0; i < 18; i++) state.gems.push(new Gem(this.x + (Math.random()*40-20), this.y + (Math.random()*40-20), 10));
    }
  }

  split() {
    this.isSplit = true;
    const subHp = this.maxHp * 0.25;
    this.hp = this.hp * 0.5;

    this.carlos = new CarlosMinion(this.x - 60, this.y, subHp);
    this.sebastian = new SebastianMinion(this.x + 60, this.y, subHp);
  }

  update(player) {
    if (this.carlos && !this.carlos.dead) this.carlos.update(player);
    if (this.sebastian && !this.sebastian.dead) this.sebastian.update(player);

    if (this.dead) return;

    this.dashTimer++;
    if (!this.isDashing && this.dashTimer >= 300) {
      this.isDashing = true;
      this.dashDuration = 0;
      this.dashTimer = 0;
    }

    const targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const curAngle = Math.atan2(this.vy, this.vx);

    let diff = targetAngle - curAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    let turnSpeed = 0.018;

    if (this.isDashing) {
      this.dashDuration++;
      turnSpeed = 0.002;
      this.speed = 10.0;
      
      if (Math.random() < 0.3) {
        import('./Effects.js').then(({ spawnExplosion }) => {
          spawnExplosion(this.x, this.y, "#ff0000", 2, 1);
        });
      }

      if (this.dashDuration > 70) {
        this.isDashing = false;
        this.speed = this.maxSpeed;
      }
    } else {
      if (Math.abs(diff) > 0.05) {
        this.speed = Math.max(1.5, this.speed - Math.abs(diff) * 0.04);
      } else {
        this.speed = Math.min(this.maxSpeed, this.speed + this.accel * 8);
      }
    }

    const newAngle = curAngle + Math.sign(diff) * Math.min(turnSpeed, Math.abs(diff));

    this.vx = Math.cos(newAngle) * this.speed;
    this.vy = Math.sin(newAngle) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    this.segments[0].angle = newAngle;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * this.segmentLength;
      cur.y = prev.y - Math.sin(ang) * this.segmentLength;
      cur.angle = ang;
    }

    this.acidTimer++;
    if (this.acidTimer >= 180) {
      this.acidTimer = 0;
      state.hazardAreas.push(new HazardArea(this.x, this.y, 65, 400, "rgb(57, 255, 20)", 0.2, true));
    }

    for (let seg of this.segments) {
      if (dist(seg.x, seg.y, player.x, player.y) < this.radius + player.radius) {
        player.takeDamage(24, "#39ff14");
        break;
      }
    }
  }

  draw(ctx) {
    if (this.carlos && !this.carlos.dead) this.carlos.draw(ctx);
    if (this.sebastian && !this.sebastian.dead) this.sebastian.draw(ctx);

    if (this.dead) return;

    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      const hue = (i / this.segmentCount) * 360;
      const color = `hsl(${hue}, 100%, 55%)`;
      drawPolygon(ctx, seg.x, seg.y, this.radius, 3, seg.angle, color, 10, color.replace('hsl', 'hsla').replace(')', ', 0.3)'));
    }
  }
}

export class CarlosMinion {
  constructor(x, y, hp) {
    this.name = "Carlos";
    this.segmentCount = 15;
    this.segmentLength = 56;
    this.radius = 56;
    this.hp = hp;
    this.maxHp = hp;
    this.x = x;
    this.y = y;
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }
    this.dead = false;
    this.salvoTimer = 0;
  }

  getTargetables() {
    const list = [];
    if (!this.dead) {
      this.segments.forEach(seg => {
        list.push({
          x: seg.x,
          y: seg.y,
          radius: this.radius,
          parent: this,
          takeDamage: (amt, color) => this.takeDamage(amt, color, seg.x, seg.y)
        });
      });
    }
    return list;
  }

  takeDamage(amt, damageColor = "#00ff66", hitX = this.x, hitY = this.y) {
    this.hp -= amt;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(hitX + offsetX, hitY + offsetY, Math.round(amt), damageColor, 14));
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      spawnExplosion(this.x, this.y, "#00ff66", 20, 4);
    }
  }

  update(player) {
    if (this.dead) return;

    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(a) * 2.2;
    this.y += Math.sin(a) * 2.2;

    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    this.segments[0].angle = a;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * this.segmentLength;
      cur.y = prev.y - Math.sin(ang) * this.segmentLength;
      cur.angle = ang;
    }

    this.salvoTimer++;
    if (this.salvoTimer % 180 < this.segmentCount * 6) {
      const idx = Math.floor((this.salvoTimer % 180) / 6);
      if ((this.salvoTimer % 180) % 6 === 0 && idx < this.segmentCount) {
        const seg = this.segments[idx];
        state.acceleratingProjectiles.push(new AcceleratingProjectile(seg.x, seg.y, player.x, player.y, 14, "#00ff88"));
      }
    }

    for (let seg of this.segments) {
      if (dist(seg.x, seg.y, player.x, player.y) < this.radius + player.radius) {
        player.takeDamage(18, "#00ff66");
        break;
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      drawPolygon(ctx, seg.x, seg.y, this.radius, 3, seg.angle, "#00ff88", 8, "rgba(0, 255, 136, 0.2)");
    }
  }
}

export class SebastianMinion {
  constructor(x, y, hp) {
    this.name = "Sebastian";
    this.segmentCount = 15;
    this.segmentLength = 56;
    this.radius = 56;
    this.hp = hp;
    this.maxHp = hp;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }
    this.dead = false;
    this.smokeTimer = 0;
  }
  getTargetables() {
    const list = [];
    if (!this.dead) {
      this.segments.forEach(seg => {
        list.push({
          x: seg.x,
          y: seg.y,
          radius: this.radius,
          parent: this,
          takeDamage: (amt, color) => this.takeDamage(amt, color, seg.x, seg.y)
        });
      });
    }
    return list;
  }

  takeDamage(amt, damageColor = "#a855f7", hitX = this.x, hitY = this.y) {
    this.hp -= amt;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(hitX + offsetX, hitY + offsetY, Math.round(amt), damageColor, 14));
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      spawnExplosion(this.x, this.y, "#a855f7", 20, 4);
    }
  }

  update(player) {
    if (this.dead) return;

    if (Math.random() < 0.04) {
      this.angle += (Math.random() - 0.5) * 1.5;
    }
    this.x += Math.cos(this.angle) * 3.5;
    this.y += Math.sin(this.angle) * 3.5;

    if (this.x < 30 || this.x > state.width - 30) this.angle = Math.PI - this.angle;
    if (this.y < 30 || this.y > state.height - 30) this.angle = -this.angle;

    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    this.segments[0].angle = this.angle;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * this.segmentLength;
      cur.y = prev.y - Math.sin(ang) * this.segmentLength;
      cur.angle = ang;
    }

    this.smokeTimer++;
    if (this.smokeTimer >= 140) {
      this.smokeTimer = 0;
      for (let seg of this.segments) {
        state.hazardAreas.push(new HazardArea(seg.x, seg.y, 40, 300, "rgb(168, 85, 247)", 0.25, false));
      }
    }

    for (let seg of this.segments) {
      if (dist(seg.x, seg.y, player.x, player.y) < this.radius + player.radius) {
        player.takeDamage(18, "#a855f7");
        break;
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      drawPolygon(ctx, seg.x, seg.y, this.radius, 3, seg.angle, "#a855f7", 8, "rgba(168, 85, 247, 0.2)");
    }
  }
}

export class AmalgamNode {
  constructor(name, x, y, hp, maxHp, stage, vx, vy) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = maxHp;
    this.stage = stage;
    this.dead = false;

    if (stage === 1) {
      this.radius = 160;
      this.speed = 1.6;
      this.sprayCount = 15;
    } else if (stage === 2) {
      this.radius = 56;
      this.speed = 3.7;
      this.sprayCount = 8;
    } else if (stage === 3) {
      this.radius = 33;
      this.speed = 4.5;
      this.sprayCount = 5;
    } else {
      this.radius = 14;
      this.speed = 6.6;
      this.sprayCount = 3;
    }

    const ang = Math.random() * Math.PI * 2;
    this.vx = vx || Math.cos(ang) * this.speed;
    this.vy = vy || Math.sin(ang) * this.speed;
    this.angle = 0;
    this.color = "#ff0033";
  }

  takeDamage(amt, damageColor = "#ff0033") {
    this.hp -= amt;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, Math.round(amt), damageColor, 15));

    if (this.stage === 1 && this.hp <= this.maxHp * 0.75) {
      this.subdivide();
    } else if ((this.stage === 2 || this.stage === 3) && this.hp <= this.maxHp * 0.5) {
      this.subdivide();
    } else if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      spawnExplosion(this.x, this.y, this.color, 20, 4);
      for (let i = 0; i < 4; i++) state.gems.push(new Gem(this.x + (Math.random()*20-10), this.y + (Math.random()*20-10), 6));
    }
  }

  subdivide() {
    this.dead = true;
    const nextStage = this.stage + 1;
    if (nextStage > 4) return;

    const sharedHp = this.hp / 2;
    const child1 = new AmalgamNode(this.name, this.x - 20, this.y, sharedHp, sharedHp, nextStage, this.vx * 1.2, -this.vy * 1.2);
    const child2 = new AmalgamNode(this.name, this.x + 20, this.y, sharedHp, sharedHp, nextStage, -this.vx * 1.2, this.vy * 1.2);
    
    if (state.currentAmalgamBoss) {
      state.currentAmalgamBoss.nodes.push(child1, child2);
    }
    spawnExplosion(this.x, this.y, "#ff0055", 25, 5);
  }

  update(player) {
    if (this.dead) return;
    this.angle += 0.03;

    this.x += this.vx;
    this.y += this.vy;

    let hitWall = false;
    let sprayDirX = 0;
    let sprayDirY = 0;

    if (this.x <= this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      hitWall = true;
      sprayDirX = 1;
    } else if (this.x >= state.width - this.radius) {
      this.x = state.width - this.radius;
      this.vx = -Math.abs(this.vx);
      hitWall = true;
      sprayDirX = -1;
    }

    if (this.y <= this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      hitWall = true;
      sprayDirY = 1;
    } else if (this.y >= state.height - this.radius) {
      this.y = state.height - this.radius;
      this.vy = -Math.abs(this.vy);
      hitWall = true;
      sprayDirY = -1;
    }

    if (hitWall) {
      this.fireSpray(sprayDirX, sprayDirY);
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(20, this.color);
    }
  }

  fireSpray(dx, dy) {
    const baseAngle = Math.atan2(dy, dx);
    for (let i = 0; i < this.sprayCount; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const a = baseAngle + spread;
      const spd = 3.5 + Math.random() * 1.8;
      state.enemyProjectiles.push(new Projectile(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, 12, "#ff0033", 4, true));
    }
  }

  draw(ctx) {
    if (this.dead) return;
    drawPolygon(ctx, this.x, this.y, this.radius, 10, this.angle, this.color, 14, "rgba(255, 0, 51, 0.2)");
  }
}

export class AmalgamBossRoot {
  constructor() {
    this.name = "Amalgam";
    this.nodes = [new AmalgamNode("Amalgam", state.width / 2, state.height / 2, 70000, 70000, 1, 2, 2)];
  }

  getTargetables() {
    return this.nodes.filter(n => !n.dead);
  }

  update(player) {
    this.nodes = this.nodes.filter(n => !n.dead);
    this.nodes.forEach(n => n.update(player));
  }

  draw(ctx) {
    this.nodes.forEach(n => n.draw(ctx));
  }
}

