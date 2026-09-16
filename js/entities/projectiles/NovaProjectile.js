import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

export class NovaProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, isSpiral = false, customColor = "#0088ff") {
    super(x, y, vx, vy, damage, customColor, 25, false, 0);
    this.isSpiral = isSpiral;
    this.radius = 25;
    this.life = 4000;
    this.color = customColor;

    this.startX = x;
    this.startY = y;
    this.baseX = x;
    this.baseY = y;
    this.time = 0;
    this.spiralRadius = 0;
    this.initialAngle = Math.atan2(vy, vx);
    // Para evitar la aceleracion excesiva, no usamos un math.hypot que se suma siempre
    this.speed = Math.hypot(vx, vy);
    this.pierce = true;
    // Eliminamos el mapa local para que los enemigos gestionen su propio cooldown, previniendo memory leaks.
    
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    this.texture = this.color === "#ffff00" ? textures['proj_nova_lightning'] : textures['proj_nova'];
    if (this.texture) {
      this.sprite = new PIXI.Sprite(this.texture);
      this.sprite.anchor.set(0.5);
      // Ajustar la escala visual según el radio configurado (12 es el radio base original)
      this.sprite.scale.set(this.radius / 12);
    } else {
      this.sprite = new PIXI.Graphics();
      let hexColor = 0x0088ff;
      if (typeof this.color === 'string' && this.color.startsWith('#')) {
        const parsed = parseInt(this.color.replace('#', ''), 16); if (!isNaN(parsed)) hexColor = parsed;
      }
      this.sprite.beginFill(hexColor);
      this.sprite.drawCircle(0, 0, this.radius);
      this.sprite.endFill();
    }
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);
  }

  canHit(target) {
    const actualTarget = target.parent || target;
    // Delega completamente el cooldown (i-frames) en el objetivo, tal y como lo hacen los satélites.
    if (actualTarget.canBeHitBy && actualTarget.canBeHitBy(this, 0.1)) {
      return true;
    }
    return false;
  }

  update() {
    this.life--;
    this.time++;

    if (this.isSpiral) {
      // El radio crece a un ritmo fijo
      this.spiralRadius += this.speed * 0.35; 
      // Calculamos la velocidad angular inversa al radio para mantener la velocidad tangencial constante
      const angularVelocity = this.speed / (this.spiralRadius + 20); 
      this.currentAngle = (this.currentAngle !== undefined ? this.currentAngle : this.initialAngle) + angularVelocity;
      this.x = this.startX + Math.cos(this.currentAngle) * this.spiralRadius;
      this.y = this.startY + Math.sin(this.currentAngle) * this.spiralRadius;
    } else {
      this.baseX += this.vx;
      this.baseY += this.vy;
      this.x = this.baseX;
      this.y = this.baseY;
    }
    
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = this.time * 0.2;
    }

    if (this.time % 2 === 0 && state.particlePool) {
      state.particlePool.acquire(this.x, this.y, this.color, 0.2, 0.08, 3);
    }

    return this.life > 0 && this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
  }
}
