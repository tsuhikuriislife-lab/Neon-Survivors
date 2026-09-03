const fs = require('fs');
const path = '/home/Coder/IdeaProjects/juego/js/data/upgrades.js';
let content = fs.readFileSync(path, 'utf8');

const replacements = {
  'hp_regen': "icon: '<img src=\"assets/upgrades/repairing-nanobots.png\" alt=\"icon\">',",
  'iframe_extend': "icon: '<img src=\"assets/upgrades/timewarping-shield2.png\" alt=\"icon\">',",
  'speed_boost': "icon: '<img src=\"assets/upgrades/vector-thrusters.png\" alt=\"icon\">',",
  'magnet_boost': "icon: '<img src=\"assets/upgrades/magnetic-attraction.png\" alt=\"icon\">',",
  'auto_magnet': "icon: '<img src=\"assets/upgrades/quantum-singularity.png\" alt=\"icon\">',",
  'damage_boost': "icon: '<img src=\"assets/upgrades/quantum-amplifier.png\" alt=\"icon\">',",
  'repair_hull': "icon: '<img src=\"assets/upgrades/hull-reinforcement.png\" alt=\"icon\">',"
};

for (const [id, newIcon] of Object.entries(replacements)) {
  const regex = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?icon:\\s*)'.*?'(,)`);
  content = content.replace(regex, `$1'<img src="assets/upgrades/${newIcon.split('assets/upgrades/')[1].split('"')[0]}" alt="icon">'$2`);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
