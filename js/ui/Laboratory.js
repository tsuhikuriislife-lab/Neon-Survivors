import { metaUpgradesTree } from '../data/metaUpgrades.js';
import { SaveManager } from '../engine/SaveManager.js';
import { enterFullscreen } from '../engine/Utils.js';

export class Laboratory {
  static panX = 0;
  static panY = 0;
  static scale = 1;
  static isDragging = false;
  static startX = 0;
  static startY = 0;
  static hasDragged = false;
  static initialPinchDistance = null;
  static initialScale = 1;

  static init() {
    this.modal = document.getElementById("labModal");
    this.btnOpen = document.getElementById("btnLaboratory");
    this.btnClose = document.getElementById("btnLabClose");
    this.viewport = document.getElementById("labViewport");
    this.treeContainer = document.getElementById("labTreeContainer");
    this.svgLines = document.getElementById("labLinesSvg");
    this.chipsText = document.getElementById("labChipsTotal");

    this.profile = SaveManager.loadProfile();
    if (this.btnOpen) {
      this.btnOpen.addEventListener("click", () => this.open());
      this.btnOpen.addEventListener("click", () => {
        enterFullscreen();
        this.open();
      });
    }
    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.close());
    }
    
    // Zoom & Pan logic (Mouse & Touch)
    if (this.viewport) {
      this.viewport.addEventListener("wheel", (e) => {
        if (this.modal.style.display === "none") return;
        e.preventDefault();
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        this.scale = Math.min(Math.max(0.3, this.scale + delta), 3.0);
        this.updateTransform();
      }, { passive: false });

      // Mouse Pan
      this.viewport.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.hasDragged = false;
        this.startX = e.clientX - this.panX;
        this.startY = e.clientY - this.panY;
      });

      window.addEventListener("mousemove", (e) => {
        if (!this.isDragging) return;
        
        const newPanX = e.clientX - this.startX;
        const newPanY = e.clientY - this.startY;
        
        if (Math.abs(newPanX - this.panX) > 5 || Math.abs(newPanY - this.panY) > 5) {
          this.hasDragged = true;
        }
        
        this.panX = newPanX;
        this.panY = newPanY;
        this.updateTransform();
      });

      window.addEventListener("mouseup", () => {
        this.isDragging = false;
      });

      // Touch Zoom & Pan
      this.viewport.addEventListener("touchstart", (e) => {
        if (this.modal.style.display === "none") return;
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.hasDragged = false;
          this.startX = e.touches[0].clientX - this.panX;
          this.startY = e.touches[0].clientY - this.panY;
        } else if (e.touches.length === 2) {
          this.isDragging = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
          this.initialScale = this.scale;
        }
      }, { passive: false });

      window.addEventListener("touchmove", (e) => {
        if (this.modal.style.display === "none") return;
        if (e.touches.length === 1 && this.isDragging) {
          e.preventDefault();
          const newPanX = e.touches[0].clientX - this.startX;
          const newPanY = e.touches[0].clientY - this.startY;
          if (Math.abs(newPanX - this.panX) > 5 || Math.abs(newPanY - this.panY) > 5) {
            this.hasDragged = true;
          }
          this.panX = newPanX;
          this.panY = newPanY;
          this.updateTransform();
        } else if (e.touches.length === 2 && this.initialPinchDistance) {
          e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDistance = Math.sqrt(dx * dx + dy * dy);
          const scaleChange = currentDistance / this.initialPinchDistance;
          this.scale = Math.min(Math.max(0.3, this.initialScale * scaleChange), 3.0);
          this.updateTransform();
        }
      }, { passive: false });

      window.addEventListener("touchend", (e) => {
        if (e.touches.length < 2) {
          this.initialPinchDistance = null;
        }
        if (e.touches.length === 0) {
          this.isDragging = false;
        } else if (e.touches.length === 1) {
          this.startX = e.touches[0].clientX - this.panX;
          this.startY = e.touches[0].clientY - this.panY;
          this.isDragging = true;
        }
      });
    }

    // Close popover when clicking outside nodes (but not if we were dragging)
    this.viewport.addEventListener("click", (e) => {
      if (this.hasDragged) return;
      if (e.target === this.viewport || e.target === this.treeContainer || e.target === this.svgLines) {
        this.closePopover();
      }
    });
  }

  static updateTransform() {
    if (this.treeContainer) {
      this.treeContainer.style.transform = `translate(-50%, -50%) translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
  }

  static open() {
    this.panX = 0;
    this.panY = 0;
    this.scale = 1;
    this.updateTransform();
    
    this.profile = SaveManager.loadProfile();
    this.chipsText.innerText = this.profile.chips || 0;
    this.modal.style.display = "flex";
    this.renderTree();
  }

  static close() {
    this.modal.style.display = "none";
    this.closePopover();
  }

  static renderTree() {
    // Clear existing
    this.svgLines.innerHTML = '';
    const existingNodes = this.treeContainer.querySelectorAll('.lab-node, .lab-popover');
    existingNodes.forEach(n => n.remove());

    const center = { x: 400, y: 400 };

    // Draw lines first so they are underneath
    for (const key in metaUpgradesTree) {
      const nodeData = metaUpgradesTree[key];
      if (nodeData.requires && nodeData.requires.length > 0) {
        nodeData.requires.forEach(req => {
          const parentData = metaUpgradesTree[req.id];
          if (parentData) {
            // A line is visually active only if the requirement is MET.
            const reqMet = req.id === "root_core" || (this.profile.upgrades[req.id] || 0) >= req.level;
            this.drawLine(
              center.x + parentData.x, center.y + parentData.y,
              center.x + nodeData.x, center.y + nodeData.y,
              reqMet,
              req.level
            );
          }
        });
      }
    }

    // Draw nodes
    for (const key in metaUpgradesTree) {
      const nodeData = metaUpgradesTree[key];
      this.createNode(nodeData, center);
    }
  }

  static drawLine(x1, y1, x2, y2, isActive, reqLevel = 1) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;

    // Node radius is 30px (60px width/2) + 3px border. We use 33px so the line touches exactly the outer edge.
    const radius = 33;

    // Offset start and end coordinates by the radius along the vector
    const startX = x1 + (dx / distance) * radius;
    const startY = y1 + (dy / distance) * radius;
    const endX = x2 - (dx / distance) * radius;
    const endY = y2 - (dy / distance) * radius;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", startX);
    line.setAttribute("y1", startY);
    line.setAttribute("x2", endX);
    line.setAttribute("y2", endY);
    line.setAttribute("stroke", isActive ? "#00ffff" : "#333");
    line.setAttribute("stroke-width", isActive ? "4" : "2");
    if (isActive) {
      line.setAttribute("filter", "drop-shadow(0 0 5px #00ffff)");
    }
    this.svgLines.appendChild(line);

    // Draw requirement indicator if level > 1 and it's not yet unlocked
    if (reqLevel > 1 && !isActive) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", midX);
      circle.setAttribute("cy", midY);
      circle.setAttribute("r", "12");
      circle.setAttribute("fill", "#04030a");
      circle.setAttribute("stroke", "#333");
      circle.setAttribute("stroke-width", "2");
      this.svgLines.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY);
      text.setAttribute("fill", "#666");
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("font-family", "Arial, sans-serif");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.textContent = reqLevel;
      this.svgLines.appendChild(text);
    }
  }

  static createNode(data, center) {
    const level = this.profile.upgrades[data.id] || 0;
    const isLocked = !this.canUnlock(data);
    const isMaxed = level >= data.maxLevel;
    const isUnlocked = level > 0 || data.id === "root_core";

    const node = document.createElement("div");
    node.className = "lab-node";
    if (isLocked) node.classList.add("locked");
    else if (isMaxed) node.classList.add("maxed");
    else if (isUnlocked) node.classList.add("unlocked");

    node.style.left = (center.x + data.x) + "px";
    node.style.top = (center.y + data.y) + "px";
    
    // Custom ID attribute
    node.dataset.id = data.id;

    // Image
    const img = document.createElement("img");
    img.src = data.icon;
    node.appendChild(img);

    // Limit text
    const limit = document.createElement("div");
    limit.className = "lab-level";
    limit.innerText = `${level}/${data.maxLevel}`;
    node.appendChild(limit);

    node.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.hasDragged) return;
      this.showPopover(data, node);
    });

    this.treeContainer.appendChild(node);
  }

  static canUnlock(data) {
    if (data.id === "root_core") return true;
    if (!data.requires || data.requires.length === 0) return true;
    return data.requires.every(req => {
      if (req.id === "root_core") return true;
      return (this.profile.upgrades[req.id] || 0) >= req.level;
    });
  }

  static isUnlocked(nodeId) {
    if (nodeId === "root_core") return true;
    return (this.profile.upgrades[nodeId] || 0) > 0;
  }

  static calculateTotalInvested() {
    let total = 0;
    for (const key in metaUpgradesTree) {
      if (key === "root_core") continue;
      const data = metaUpgradesTree[key];
      const currentLevel = this.profile.upgrades[key] || 0;
            const sobornoLevel = this.profile.upgrades.soborno_sistema || 0;
      const discount = 1 - (sobornoLevel * 0.01);
      for (let i = 0; i < currentLevel; i++) {
        total += Math.floor(data.baseCost * Math.pow(data.costMultiplier, i) * discount);
      }
    }
    return total;
  }

  static resetTree(refundAmount) {
    this.profile.chips = (this.profile.chips || 0) + refundAmount;
    this.profile.upgrades = {};
    SaveManager.saveProfile(this.profile);
    this.chipsText.innerText = this.profile.chips;
    this.renderTree();
    this.closePopover();
  }

  static showPopover(data, nodeElement) {
    this.closePopover();
    const level = this.profile.upgrades[data.id] || 0;
    const isLocked = !this.canUnlock(data);
    const isMaxed = level >= data.maxLevel;
        const sobornoLevel = this.profile.upgrades.soborno_sistema || 0;
    const discount = 1 - (sobornoLevel * 0.01);
    const currentCost = Math.floor(data.baseCost * Math.pow(data.costMultiplier, level) * discount);
    const canAfford = (this.profile.chips || 0) >= currentCost;

    const popover = document.createElement("div");
    popover.className = "lab-popover";
    popover.id = "activeLabPopover";

    // Position relative to node
    popover.style.left = nodeElement.style.left;
    popover.style.top = (parseFloat(nodeElement.style.top) + 40) + "px";

    popover.innerHTML = `
      <h3>${data.name}</h3>
      <p>${data.description}</p>
      <div class="lab-progress-bg">
        <div class="lab-progress-fill" style="width: ${(level / data.maxLevel) * 100}%;"></div>
      </div>
    `;

    if (data.id !== "root_core") {
      if (isMaxed) {
        popover.innerHTML += `<div class="lab-price affordable">MAXED OUT</div>`;
      } else if (isLocked) {
        popover.innerHTML += `<div class="lab-price expensive">LOCKED</div>`;
      } else {
        popover.innerHTML += `
          <div class="lab-price ${canAfford ? 'affordable' : 'expensive'}">
            <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: text-bottom; filter: drop-shadow(0 0 6px #ffaa00); margin-right: 5px;"><polygon points="12 2 22 12 12 22 2 12" fill="#ffaa00" stroke="#ffffff" stroke-width="2"></polygon></svg>${currentCost}
          </div>
          <button class="lab-btn-buy" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? 'BUY' : 'INSUFFICIENT'}
          </button>
        `;
      }
    } else {
      popover.innerHTML += `<div class="lab-price affordable">ACTIVE</div>`;
      const totalInvested = this.calculateTotalInvested();
      const refund = Math.floor(totalInvested * 0.7);
      
      if (totalInvested > 0) {
        popover.innerHTML += `
          <div class="lab-price affordable">
            REFUND: <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: text-bottom; filter: drop-shadow(0 0 6px #ffaa00); margin-right: 5px;"><polygon points="12 2 22 12 12 22 2 12" fill="#ffaa00" stroke="#ffffff" stroke-width="2"></polygon></svg>${refund}
          </div>
          <div id="resetBtnArea" style="position: relative; margin-top: 10px; width: 100%; height: 35px; background: rgba(255,0,0,0.1); border: 2px solid #ff0055; border-radius: 4px; overflow: hidden; cursor: pointer; user-select: none;">
            <div id="resetProgressBar" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: rgba(255,0,85,0.5); pointer-events: none; transition: none;"></div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #ff0055; font-weight: bold; font-size: 14px; pointer-events: none; text-shadow: 0 0 5px #ff0055; z-index: 2;">HOLD TO RESET</div>
          </div>
        `;
      } else {
        popover.innerHTML += `<div class="lab-price expensive">NO INVESTMENT</div>`;
      }
    }

    this.treeContainer.appendChild(popover);

    // Buy action
    const buyBtn = popover.querySelector('.lab-btn-buy');
    if (buyBtn && canAfford && !isMaxed && !isLocked) {
      buyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.buyUpgrade(data, currentCost);
      });
    }

    // Reset action
    const resetBtnArea = popover.querySelector('#resetBtnArea');
    if (resetBtnArea) {
      let resetTimer = null;
      const bar = popover.querySelector('#resetProgressBar');
      const refund = Math.floor(this.calculateTotalInvested() * 0.7);

      const startReset = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (resetTimer) clearTimeout(resetTimer);
        
        // Reset state
        bar.style.transition = 'none';
        bar.style.width = '0%';
        void bar.offsetWidth; // Force reflow
        
        // Start animation (ease-out)
        bar.style.transition = 'width 5s ease-out';
        bar.style.width = '100%';
        
        resetTimer = setTimeout(() => {
          this.resetTree(refund);
        }, 5000);
      };

      const cancelReset = (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = null;
        bar.style.transition = 'width 0.3s ease';
        bar.style.width = '0%';
      };

      resetBtnArea.addEventListener('mousedown', startReset);
      resetBtnArea.addEventListener('touchstart', startReset);
      
      resetBtnArea.addEventListener('mouseup', cancelReset);
      resetBtnArea.addEventListener('mouseleave', cancelReset);
      resetBtnArea.addEventListener('touchend', cancelReset);
      resetBtnArea.addEventListener('touchcancel', cancelReset);
    }
  }

  static buyUpgrade(data, cost) {
    this.profile.chips -= cost;
    this.profile.upgrades[data.id] = (this.profile.upgrades[data.id] || 0) + 1;
    SaveManager.saveProfile(this.profile);
    this.chipsText.innerText = this.profile.chips;
    this.renderTree();
    // Re-show popover to update state
    const node = this.treeContainer.querySelector(`[data-id="${data.id}"]`);
    if (node) this.showPopover(data, node);
  }

  static closePopover() {
    const pop = document.getElementById("activeLabPopover");
    if (pop) pop.remove();
  }
}

