import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';

export class CerberoFlameProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color, radius) {
    super(x, y, vx, vy, damage, color, radius, true, 0);
    this.flameLife = 40;
    this.pierce = true; // Para daño continuo sin desaparecer
    
    // Hacemos el sprite base invisible para que solo se vean las partículas
    if (this.sprite) {
      this.sprite.visible = false;
    }
    
    // Variables para oscilación caótica (turbulencia)
    this.time = 0;
    const speed = Math.hypot(vx, vy);
    this.baseAngle = Math.atan2(vy, vx);
    this.speed = speed;
    
    // Cada partícula/llama oscila distinto
    this.frequency = 0.2 + Math.random() * 0.3;
    this.amplitude = (Math.random() - 0.5) * 1.5; 
  }

  update() {
    this.time++;
    
    // Spread caótico: Alteramos la trayectoria con una onda senoidal
    const currentAngle = this.baseAngle + Math.sin(this.time * this.frequency) * this.amplitude;
    
    // Actualizamos las velocidades para que el "super.update()" mueva el proyectil
    this.vx = Math.cos(currentAngle) * this.speed;
    this.vy = Math.sin(currentAngle) * this.speed;
    
    const alive = super.update();
    this.flameLife--;
    
    // Emisión masiva de partículas de fuego verde
    if (state.particlePool && Math.random() < 0.8) {
       // El tamaño crece a medida que la vida disminuye (simulando un cono de expansión)
       const lifeRatio = 1.0 - (this.flameLife / 45); 
       const visualSize = this.radius * (1 + lifeRatio * 1.5);
       
       const pColor = Math.random() < 0.5 ? "#33ff33" : (Math.random() < 0.5 ? "#99ff33" : "#ffff00");
       const p = state.particlePool.acquire(this.x, this.y, pColor, 1.0, 0.04, visualSize);
       if (p) {
         p.vx = this.vx * 0.2 + (Math.random() - 0.5);
         p.vy = this.vy * 0.2 + (Math.random() - 0.5);
       }
    }
    
    // Actualizar también el radio físico real (hitbox crece levemente)
    this.radius = 14 + (1.0 - (this.flameLife / 45)) * 10;
    
    return alive && this.flameLife > 0;
  }
}
