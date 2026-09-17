function getRarityRoll(finiteAvailable, isBoss = false) {
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

    const r = Math.random();
    let cumulative = 0;
    for (let rarity of activeRarities) {
        cumulative += probs[rarity];
        if (r < cumulative) return rarity;
    }
    return activeRarities[activeRarities.length - 1]; // safety fallback
}
console.log("ok");
