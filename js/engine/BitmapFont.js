export class BitmapFontManager {
  constructor() {
    this.fontFamily = "'Eight-Bit Exposition'";
    this.atlases = {}; 
    this.staticCache = new Map();
    this.batchQueue = []; 
    this.isLoaded = false;
  }

  async load() {
    const font = new FontFace('Eight-Bit Exposition', 'url(assets/fonts/Eight-Bit\\ Exposition.otf)');
    await font.load();
    document.fonts.add(font);
    this.isLoaded = true;
    console.log("Bitmap font loaded");
  }

  getAtlas(size, color, isBold, blur = 0, blurColor = "") {
    const fontStyle = isBold ? `bold ${size}px ${this.fontFamily}` : `${size}px ${this.fontFamily}`;
    const key = `${fontStyle}_${color}_${blur}_${blurColor}`;
    if (this.atlases[key]) return this.atlases[key];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    ctx.font = fontStyle;
    
    let maxW = 0;
    let maxH = size * 1.5; 
    
    const chars = [];
    for (let i = 32; i <= 126; i++) {
        chars.push(String.fromCharCode(i));
    }
    // Add special characters if needed
    chars.push('▲', '◀', '▼', '▶');

    chars.forEach(c => {
        const metrics = ctx.measureText(c);
        const w = metrics.width;
        if (w > maxW) maxW = w;
    });

    const padding = blur + 4;
    const cellW = Math.ceil(maxW) + padding * 2;
    const cellH = Math.ceil(maxH) + padding * 2;
    
    const cols = 10;
    const rows = Math.ceil(chars.length / cols);
    
    canvas.width = cols * cellW;
    canvas.height = rows * cellH;
    
    ctx.font = fontStyle;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    if (blur > 0) {
      ctx.shadowBlur = blur;
      ctx.shadowColor = blurColor;
    }

    const mapping = {};
    
    chars.forEach((c, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellW;
        const y = row * cellH;
        
        ctx.fillText(c, x + padding, y + padding);
        const metrics = ctx.measureText(c);
        
        mapping[c] = {
            x: x,
            y: y,
            w: cellW,
            h: cellH,
            advance: metrics.width,
            pad: padding
        };
    });

    this.atlases[key] = { canvas, mapping, lineHeight: size * 1.2 };
    return this.atlases[key];
  }

  drawCachedText(ctx, text, x, y, size, color, isBold, align, baseline, alpha = 1.0) {
    if (!this.isLoaded) return;
    const cacheKey = `${text}_${size}_${color}_${isBold}_${align}_${baseline}`;
    
    let cachedCanvas = this.staticCache.get(cacheKey);
    if (!cachedCanvas) {
      const atlas = this.getAtlas(size, color, isBold);
      
      let totalW = 0;
      for (let i = 0; i < text.length; i++) {
        const charData = atlas.mapping[text[i]] || atlas.mapping['?'] || atlas.mapping[' '];
        totalW += charData ? charData.advance : 0;
      }
      
      const pad = atlas.mapping['A'] ? atlas.mapping['A'].pad : 4;
      const ch = atlas.mapping['A'] ? atlas.mapping['A'].h : size * 2;
      
      cachedCanvas = document.createElement('canvas');
      cachedCanvas.width = Math.max(1, totalW + pad * 2);
      cachedCanvas.height = ch;
      const cctx = cachedCanvas.getContext('2d');
      
      let cx = pad;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const charData = atlas.mapping[c] || atlas.mapping['?'] || atlas.mapping[' '];
        if (charData) {
          cctx.drawImage(atlas.canvas, charData.x, charData.y, charData.w, charData.h, cx - charData.pad, 0, charData.w, charData.h);
          cx += charData.advance;
        }
      }
      
      this.staticCache.set(cacheKey, {
        canvas: cachedCanvas,
        width: totalW,
        height: ch,
        pad: pad
      });
    }
    
    const cacheData = this.staticCache.get(cacheKey);
    
    let drawX = x;
    let drawY = y;
    
    if (align === 'center') drawX -= cacheData.width / 2;
    else if (align === 'right') drawX -= cacheData.width;
    
    if (baseline === 'middle') drawY -= cacheData.height / 2;
    else if (baseline === 'bottom') drawY -= cacheData.height;
    else if (baseline === 'alphabetic') drawY -= cacheData.height * 0.8;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(cacheData.canvas, drawX - cacheData.pad, drawY);
    ctx.restore();
  }

  queueText(text, x, y, size, color, isBold, align, baseline, alpha, blur = 0, blurColor = "", rotation = 0) {
    if (!this.isLoaded) return;
    this.batchQueue.push({ text, x, y, size, color, isBold, align, baseline, alpha, blur, blurColor, rotation });
  }

  flushBatch(ctx) {
    if (!this.isLoaded || this.batchQueue.length === 0) return;
    
    for (const item of this.batchQueue) {
      const atlas = this.getAtlas(item.size, item.color, item.isBold, item.blur, item.blurColor);
      
      let totalW = 0;
      for (let i = 0; i < item.text.length; i++) {
        const charData = atlas.mapping[item.text[i]] || atlas.mapping['?'] || atlas.mapping[' '];
        totalW += charData ? charData.advance : 0;
      }
      
      let startX = 0;
      let startY = 0;
      
      if (item.align === 'center') startX -= totalW / 2;
      else if (item.align === 'right') startX -= totalW;
      
      const ch = atlas.mapping['A'] ? atlas.mapping['A'].h : item.size * 2;
      
      if (item.baseline === 'middle') startY -= ch / 2;
      else if (item.baseline === 'bottom') startY -= ch;
      else if (item.baseline === 'alphabetic') startY -= ch * 0.8;
      
      ctx.save();
      ctx.translate(item.x, item.y);
      if (item.rotation !== 0) ctx.rotate(item.rotation);
      ctx.globalAlpha = Math.max(0, item.alpha);
      
      let cx = startX;
      for (let i = 0; i < item.text.length; i++) {
        const c = item.text[i];
        const charData = atlas.mapping[c] || atlas.mapping['?'] || atlas.mapping[' '];
        if (charData) {
          ctx.drawImage(atlas.canvas, charData.x, charData.y, charData.w, charData.h, cx - charData.pad, startY, charData.w, charData.h);
          cx += charData.advance;
        }
      }
      ctx.restore();
    }
    
    this.batchQueue = [];
  }
}

export const bitmapFont = new BitmapFontManager();
