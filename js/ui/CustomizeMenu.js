import { SaveManager } from '../engine/SaveManager.js';
import { textures, initTextureCache } from '../engine/TextureCache.js';

export function initCustomizeMenu() {
    const btnCustomize = document.getElementById('btn-customize');
    const customizeModal = document.getElementById('customizeModal');
    const btnCancel = document.getElementById('btnCustomizeCancel');
    const btnSave = document.getElementById('btnCustomizeSave');
    
    const inputShip = document.getElementById('color-ship');
    const inputEngine = document.getElementById('color-engine');
    const inputBlaster = document.getElementById('color-blaster');
    const inputBlasterPart = document.getElementById('color-blaster-particle');
    
    const canvas = document.getElementById('customize-preview');
    const ctx = canvas.getContext('2d');
    
    let isPreviewActive = false;
    let time = 0;
    
    // Load initial values
    function loadValues() {
        const profile = SaveManager.loadProfile();
        const c = profile.customization || {
            shipColor: '#00ffff',
            engineColor: '#00ffff',
            blasterColor: '#00ffff',
            blasterParticleColor: '#00ffff'
        };
        inputShip.value = c.shipColor;
        inputEngine.value = c.engineColor;
        inputBlaster.value = c.blasterColor;
        inputBlasterPart.value = c.blasterParticleColor;
    }
    
    btnCustomize.addEventListener('click', () => {
        loadValues();
        customizeModal.style.display = 'flex';
        isPreviewActive = true;
        requestAnimationFrame(previewLoop);
    });
    
    btnCancel.addEventListener('click', () => {
        customizeModal.style.display = 'none';
        isPreviewActive = false;
    });
    
    btnSave.addEventListener('click', () => {
        const profile = SaveManager.loadProfile();
        profile.customization = {
            shipColor: inputShip.value,
            engineColor: inputEngine.value,
            blasterColor: inputBlaster.value,
            blasterParticleColor: inputBlasterPart.value
        };
        SaveManager.saveProfile(profile);
        
        // Rebuild texture cache right away
        initTextureCache();
        
        customizeModal.style.display = 'none';
        isPreviewActive = false;
    });
    
    // Convert hex to rgba
    function hexToRgba(hex, alpha) {
        let h = hex.replace('#', '');
        if (h.length === 3) h = h.split('').map(x => x+x).join('');
        const r = parseInt(h.substring(0,2), 16);
        const g = parseInt(h.substring(2,4), 16);
        const b = parseInt(h.substring(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Preview Loop
    let particles = [];
    let projectiles = [];
    
    function previewLoop(timestamp) {
        if (!isPreviewActive) return;
        
        time++;
        ctx.fillStyle = '#04030a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2 + 30; // Ship placed slightly lower
        
        const shipColor = inputShip.value;
        const engineColor = inputEngine.value;
        const blasterColor = inputBlaster.value;
        const blastPartColor = inputBlasterPart.value;
        
        // Emit engine particles
        if (time % 3 === 0) {
            particles.push({
                x: cx + (Math.random() * 8 - 4),
                y: cy + 10,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 + 2,
                life: 30,
                maxLife: 30,
                type: 'engine'
            });
        }
        
        // Emit projectiles
        if (time % 15 === 0) {
            projectiles.push({
                x: cx,
                y: cy - 20,
                vx: 0,
                vy: -8
            });
        }
        
        // Update and draw projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            p.y += p.vy;
            
            // Draw projectile (circle)
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            ctx.shadowColor = blasterColor;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            ctx.strokeStyle = blasterColor;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Random blast particles
            if (Math.random() < 0.3) {
                particles.push({
                    x: p.x + (Math.random() * 6 - 3),
                    y: p.y + (Math.random() * 6 - 3),
                    vx: Math.random() * 1 - 0.5,
                    vy: Math.random() * 1 - 0.5,
                    life: 15,
                    maxLife: 15,
                    type: 'blast'
                });
            }
            
            if (p.y < 0) projectiles.splice(i, 1);
        }
        
        // Update and draw particles
        ctx.globalCompositeOperation = 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            let alpha = p.life / p.maxLife;
            let color = p.type === 'engine' ? engineColor : blastPartColor;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.type === 'engine' ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(color, alpha);
            ctx.shadowColor = color;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            if (p.life <= 0) particles.splice(i, 1);
        }
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw Ship (similar to createPolygonTexture)
        ctx.save();
        ctx.translate(cx, cy);
        
        ctx.beginPath();
        const sides = 3;
        const radius = 16;
        // Pointing up (-PI/2)
        const offset = -Math.PI / 2;
        for (let i = 0; i < sides; i++) {
            const a = offset + (i * 2 * Math.PI) / sides;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        ctx.shadowColor = shipColor;
        ctx.shadowBlur = 15;
        ctx.fillStyle = hexToRgba(shipColor, 0.2);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = shipColor;
        ctx.stroke();
        
        ctx.restore();
        
        requestAnimationFrame(previewLoop);
    }
}
