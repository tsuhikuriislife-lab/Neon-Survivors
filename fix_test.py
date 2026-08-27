content = open('js/ui/UIManager.js', 'r').read()

new_logic = """    }

    // 3. Apply infinite upgrades a few times for testing
    upgradeDatabase.forEach(upg => {
        if (upg.isInfinite) {
            for(let i=0; i<10; i++) {
                // Some infinite upgrades require conditions (like boss alive), but we can just forcefully apply them or check if available.
                // Quick test should just give the player the stats anyway for testing.
                upg.apply(state.player);
                state.player.acquiredUpgrades = state.player.acquiredUpgrades || {};
                state.player.acquiredUpgrades[upg.id] = (state.player.acquiredUpgrades[upg.id] || 0) + 1;
            }
        }
    });

    updateHUD();"""

content = content.replace("    }\n\n    updateHUD();", new_logic)
open('js/ui/UIManager.js', 'w').write(content)
