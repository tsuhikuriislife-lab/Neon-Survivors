function getDynamicRarityRoll(finiteAvailable, isBoss = false) {
    let probs = isBoss ? {
        legendary: 0.10,
        rare: 0.30,
        uncommon: 0.60,
        common: 0.0
    } : {
        legendary: 0.05,
        rare: 0.15,
        uncommon: 0.20,
        common: 0.60
    };

    let activeRarities = Object.keys(probs).filter(r => 
        probs[r] > 0 && finiteAvailable.some(u => u.rarity === r)
    );

    if (activeRarities.length === 0) {
        // Fallback to infinite upgrades probabilities if no finite upgrades are left
        activeRarities = Object.keys(probs).filter(r => probs[r] > 0);
    } else {
        // Distribute probabilities of exhausted rarities equally among active ones
        const inactiveRarities = Object.keys(probs).filter(r => probs[r] > 0 && !activeRarities.includes(r));
        let leftoverProb = inactiveRarities.reduce((sum, r) => sum + probs[r], 0);
        
        if (leftoverProb > 0) {
            const addPerActive = leftoverProb / activeRarities.length;
            activeRarities.forEach(r => probs[r] += addPerActive);
        }
    }

    const roll = Math.random();
    let cumulative = 0;
    for (let rarity of activeRarities) {
        cumulative += probs[rarity];
        if (roll < cumulative) return rarity;
    }
    return activeRarities[activeRarities.length - 1]; // safety fallback
}

const db = [
    {id: '1', rarity: 'uncommon', isInfinite: false},
    {id: '2', rarity: 'uncommon', isInfinite: false},
    {id: '3', rarity: 'uncommon', isInfinite: false},
    {id: '4', rarity: 'uncommon', isInfinite: false},
    {id: '5', rarity: 'uncommon', isInfinite: false},
    {id: '6', rarity: 'common', isInfinite: true}
];

let fail = false;
for (let j = 0; j < 100; j++) {
    const choices = [];
    for (let i = 0; i < 3; i++) {
        const finiteAvailable = db.filter(u => !u.isInfinite && !choices.includes(u));
        const r = getDynamicRarityRoll(finiteAvailable, false);
        
        let pool;
        if (finiteAvailable.length > 0) {
           pool = finiteAvailable.filter(u => u.rarity === r);
        } else {
           pool = db.filter(u => u.isInfinite && !choices.includes(u) && u.rarity === r);
           if (pool.length === 0) {
              pool = db.filter(u => u.isInfinite && !choices.includes(u));
           }
        }
        
        if (pool.length > 0) {
          const upg = pool[Math.floor(Math.random() * pool.length)];
          choices.push(upg);
        }
    }
    if (choices.some(c => c.isInfinite)) {
        console.log("MIXED CHOICES:", choices);
        fail = true;
        break;
    }
}
if (!fail) console.log("All good!");
