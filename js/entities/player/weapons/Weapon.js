export class Weapon {
  constructor(player) {
    this.player = player;
    // Common properties to be overridden
    this.level = 0;
    this.timer = 0;
    this.cooldown = 100;
    this.cooldownMult = 1.0;
  }

  update(dt) {
    // To be implemented by subclasses
  }

  fire() {
    // To be implemented by subclasses
  }
}

