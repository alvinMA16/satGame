const screenWidth = wx.getSystemInfoSync().screenWidth;
const screenHeight = wx.getSystemInfoSync().screenHeight;
const ctx = canvas.getContext('2d');

/**
 * 抽纸巾小游戏
 */
export default class Main {
  constructor() {
    // 纸巾盒
    this.boxWidth = screenWidth * 0.72;
    this.boxHeight = this.boxWidth * 0.38;
    this.boxX = (screenWidth - this.boxWidth) / 2;
    this.boxY = screenHeight * 0.48;
    this.boxDepth = 22;

    // 出纸口
    this.slotWidth = this.boxWidth * 0.48;
    this.slotHeight = 14;
    this.slotX = this.boxX + (this.boxWidth - this.slotWidth) / 2;
    this.slotY = this.boxY - this.boxDepth / 2;

    // 纸巾参数
    this.tissueWidth = this.slotWidth * 0.65;
    this.tissueHeight = this.tissueWidth * 0.75;
    this.tissueExposed = 32;
    this.tissueMaxPull = this.tissueHeight * 1.1;

    // 20张纸巾
    this.totalTissues = 20;
    this.tissueCount = this.totalTissues;
    this.pulledCount = 0;

    // 露出纸巾的样式（不规则形状）
    this.exposedStyles = [
      // 每个样式定义：左边缘点、顶部点、右边缘点（相对偏移）
      {
        name: 'crumpled-left',
        leftEdge: [{ x: 0, y: 0 }, { x: -3, y: 0.3 }, { x: 2, y: 0.5 }, { x: -2, y: 0.7 }, { x: 0, y: 1 }],
        topShape: [{ x: 0.1, y: 8 }, { x: 0.3, y: 3 }, { x: 0.5, y: 0 }, { x: 0.7, y: 5 }, { x: 0.9, y: 6 }],
        rightEdge: [{ x: 0, y: 0 }, { x: 2, y: 0.25 }, { x: -1, y: 0.55 }, { x: 3, y: 0.8 }, { x: 0, y: 1 }],
        folds: [0.35, 0.65]
      },
      {
        name: 'peaked',
        leftEdge: [{ x: 0, y: 0 }, { x: -2, y: 0.4 }, { x: 1, y: 0.7 }, { x: 0, y: 1 }],
        topShape: [{ x: 0.15, y: 10 }, { x: 0.4, y: 4 }, { x: 0.5, y: -2 }, { x: 0.6, y: 4 }, { x: 0.85, y: 8 }],
        rightEdge: [{ x: 0, y: 0 }, { x: 1, y: 0.35 }, { x: -2, y: 0.65 }, { x: 0, y: 1 }],
        folds: [0.3, 0.55, 0.8]
      },
      {
        name: 'folded-corner',
        leftEdge: [{ x: 0, y: 0 }, { x: -4, y: 0.2 }, { x: -6, y: 0.35 }, { x: -2, y: 0.6 }, { x: 0, y: 1 }],
        topShape: [{ x: 0.05, y: 12 }, { x: 0.2, y: 6 }, { x: 0.5, y: 3 }, { x: 0.8, y: 5 }, { x: 0.95, y: 9 }],
        rightEdge: [{ x: 0, y: 0 }, { x: 2, y: 0.4 }, { x: 1, y: 0.7 }, { x: 0, y: 1 }],
        folds: [0.4, 0.7]
      },
      {
        name: 'wavy',
        leftEdge: [{ x: 0, y: 0 }, { x: -2, y: 0.25 }, { x: 1, y: 0.5 }, { x: -2, y: 0.75 }, { x: 0, y: 1 }],
        topShape: [{ x: 0.1, y: 6 }, { x: 0.25, y: 2 }, { x: 0.4, y: 5 }, { x: 0.6, y: 1 }, { x: 0.75, y: 4 }, { x: 0.9, y: 7 }],
        rightEdge: [{ x: 0, y: 0 }, { x: 1, y: 0.3 }, { x: -1, y: 0.6 }, { x: 2, y: 0.85 }, { x: 0, y: 1 }],
        folds: [0.25, 0.5, 0.75]
      },
      {
        name: 'tilted-right',
        leftEdge: [{ x: 0, y: 0 }, { x: 1, y: 0.4 }, { x: -1, y: 0.7 }, { x: 0, y: 1 }],
        topShape: [{ x: 0.1, y: 5 }, { x: 0.35, y: 8 }, { x: 0.5, y: 6 }, { x: 0.7, y: 2 }, { x: 0.9, y: -1 }],
        rightEdge: [{ x: 0, y: 0 }, { x: 3, y: 0.3 }, { x: 1, y: 0.6 }, { x: 0, y: 1 }],
        folds: [0.35, 0.6]
      },
      {
        name: 'bunched',
        leftEdge: [{ x: 0, y: 0 }, { x: -3, y: 0.3 }, { x: -5, y: 0.5 }, { x: -3, y: 0.7 }, { x: 0, y: 1 }],
        topShape: [{ x: 0.15, y: 4 }, { x: 0.35, y: -1 }, { x: 0.5, y: 2 }, { x: 0.65, y: -1 }, { x: 0.85, y: 5 }],
        rightEdge: [{ x: 0, y: 0 }, { x: 3, y: 0.3 }, { x: 5, y: 0.5 }, { x: 3, y: 0.7 }, { x: 0, y: 1 }],
        folds: [0.3, 0.5, 0.7]
      }
    ];

    // 抽出来纸巾的样式（不规则矩形）
    this.fallenStyles = [
      {
        name: 'curled-corners',
        // 四个角的卷曲程度
        corners: { tl: { x: 5, y: 8 }, tr: { x: -3, y: 6 }, bl: { x: 4, y: -5 }, br: { x: -6, y: -4 } },
        edges: { top: 3, right: 2, bottom: 4, left: 2 },
        creases: [{ y: 0.3, curve: 4 }, { y: 0.6, curve: -3 }]
      },
      {
        name: 'folded-edge',
        corners: { tl: { x: 3, y: 4 }, tr: { x: -8, y: 12 }, bl: { x: 2, y: -3 }, br: { x: -4, y: -6 } },
        edges: { top: 5, right: 4, bottom: 2, left: 3 },
        creases: [{ y: 0.4, curve: 5 }, { y: 0.7, curve: 2 }]
      },
      {
        name: 'crinkled',
        corners: { tl: { x: 4, y: 5 }, tr: { x: -5, y: 4 }, bl: { x: 6, y: -4 }, br: { x: -4, y: -5 } },
        edges: { top: 4, right: 3, bottom: 5, left: 4 },
        creases: [{ y: 0.25, curve: 3 }, { y: 0.5, curve: -4 }, { y: 0.75, curve: 3 }]
      },
      {
        name: 'rolled-top',
        corners: { tl: { x: 8, y: 15 }, tr: { x: -8, y: 14 }, bl: { x: 2, y: -2 }, br: { x: -2, y: -3 } },
        edges: { top: 8, right: 3, bottom: 2, left: 3 },
        creases: [{ y: 0.2, curve: 6 }, { y: 0.5, curve: 2 }]
      },
      {
        name: 'loose',
        corners: { tl: { x: 2, y: 3 }, tr: { x: -3, y: 4 }, bl: { x: 3, y: -3 }, br: { x: -2, y: -2 } },
        edges: { top: 2, right: 2, bottom: 3, left: 2 },
        creases: [{ y: 0.35, curve: 2 }, { y: 0.65, curve: -2 }]
      }
    ];

    this.currentTissue = null;
    this.currentPull = 0;
    this.fallingTissues = [];

    this.isDragging = false;
    this.dragStartY = 0;

    this.time = 0;

    this.colors = {
      boxMain: '#3498DB',
      boxTop: '#5DADE2',
      boxSide: '#2471A3',
      boxHighlight: '#85C1E9',
      slotDeep: '#08080D',
      tissue: '#FEFEFE',
      tissueShadow: '#F8F6F1',
      tissueFold: '#E8E4DC'
    };

    this.init();
    this.loop();
  }

  init() {
    this.createTissue();
    this.bindTouch();
  }

  createTissue() {
    if (this.tissueCount <= 0) {
      this.currentTissue = null;
      return;
    }

    const exposedStyle = this.exposedStyles[Math.floor(Math.random() * this.exposedStyles.length)];
    const fallenStyle = this.fallenStyles[Math.floor(Math.random() * this.fallenStyles.length)];

    // 预计算褶皱的随机偏移
    const foldOffsets = exposedStyle.folds.map(() => ({
      leftOffset: 5 + Math.random() * 3,
      rightOffset: 5 + Math.random() * 3,
      curve: (Math.random() - 0.5) * 4
    }));

    this.currentTissue = {
      exposedStyle: exposedStyle,
      fallenStyle: fallenStyle,
      pulled: false,
      offsetX: (Math.random() - 0.5) * 8,
      scale: 0.94 + Math.random() * 0.12,
      tilt: (Math.random() - 0.5) * 0.06,
      foldOffsets: foldOffsets
    };
    this.currentPull = 0;
  }

  bindTouch() {
    wx.onTouchStart((e) => {
      if (!this.currentTissue || this.currentTissue.pulled) return;

      const touch = e.touches[0];
      const cx = this.slotX + this.slotWidth / 2;
      const tipY = this.slotY - this.tissueExposed - this.currentPull;

      // 放宽触摸区域
      if (Math.abs(touch.clientX - cx) < this.tissueWidth + 50 &&
          touch.clientY >= tipY - 50 &&
          touch.clientY <= this.slotY + 50) {
        this.isDragging = true;
        this.dragStartY = touch.clientY;
      }
    });

    wx.onTouchMove((e) => {
      if (!this.isDragging || !this.currentTissue) return;

      const pull = this.dragStartY - e.touches[0].clientY;
      this.currentPull = Math.max(0, Math.min(pull, this.tissueMaxPull));

      if (this.currentPull >= this.tissueMaxPull * 0.95) {
        this.pullOut();
      }
    });

    wx.onTouchEnd(() => {
      if (!this.isDragging) return;
      this.isDragging = false;

      if (!this.currentTissue || this.currentTissue.pulled) return;

      if (this.currentPull > this.tissueMaxPull * 0.7) {
        this.pullOut();
      } else {
        this.currentPull = 0;
      }
    });
  }

  pullOut() {
    if (!this.currentTissue || this.currentTissue.pulled) return;

    const t = this.currentTissue;
    const cx = this.slotX + this.slotWidth / 2 + t.offsetX;
    const tipY = this.slotY - this.tissueExposed - this.currentPull;

    this.fallingTissues.push({
      x: cx,
      y: tipY + this.tissueHeight / 2,
      width: this.tissueWidth * t.scale,
      height: this.tissueHeight * t.scale,
      style: t.fallenStyle,
      rotation: t.tilt,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      vx: (Math.random() - 0.5) * 2,
      vy: -2.5,
      gravity: 0.22
    });

    this.tissueCount--;
    this.pulledCount++;
    this.currentPull = 0;
    this.currentTissue.pulled = true;
    this.isDragging = false;

    setTimeout(() => this.createTissue(), 180);
  }

  update() {
    this.time += 0.016;

    for (let i = this.fallingTissues.length - 1; i >= 0; i--) {
      const t = this.fallingTissues[i];
      t.vy += t.gravity;
      t.x += t.vx;
      t.y += t.vy;
      t.rotation += t.rotationSpeed;
      t.vx += Math.sin(this.time * 2 + i) * 0.04;
      t.vx *= 0.99;

      if (t.y > screenHeight + 100) {
        this.fallingTissues.splice(i, 1);
      }
    }
  }

  render() {
    ctx.fillStyle = '#F2E8DC';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 26px PingFang SC, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('抽纸巾', screenWidth / 2, 48);

    // 绘制顺序
    this.drawBoxBody();
    this.drawBoxTop();
    this.drawSlotDepth();
    this.drawCurrentTissue();
    this.drawSlotRim();
    this.drawTissueCounter(); // 纸巾盒上的计数
    this.drawFallingTissues();

    if (this.tissueCount > 0 && !this.isDragging) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = '14px PingFang SC, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('向上滑动抽纸巾', screenWidth / 2, screenHeight - 32);
    }

    if (this.tissueCount <= 0 && !this.currentTissue) {
      this.drawGameOver();
    }
  }

  drawBoxBody() {
    const { boxX, boxY, boxWidth, boxHeight, boxDepth } = this;

    ctx.fillStyle = this.colors.boxSide;
    ctx.beginPath();
    ctx.moveTo(boxX + boxWidth, boxY);
    ctx.lineTo(boxX + boxWidth + boxDepth, boxY - boxDepth);
    ctx.lineTo(boxX + boxWidth + boxDepth, boxY + boxHeight - boxDepth);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.colors.boxMain;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    const grad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
    grad.addColorStop(0, 'rgba(255,255,255,0.1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SOFT TISSUE', boxX + boxWidth / 2, boxY + boxHeight - 15);
  }

  // 画圆角矩形
  roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // 纸巾盒上的倒计时
  drawTissueCounter() {
    const { boxX, boxY, boxWidth, boxHeight } = this;

    // 计数器背景
    const counterX = boxX + boxWidth / 2;
    const counterY = boxY + boxHeight * 0.35;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.roundRect(counterX - 35, counterY - 18, 70, 36, 8);
    ctx.fill();

    // 数字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.tissueCount.toString(), counterX, counterY);

    // "剩余"文字
    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('剩余', counterX, counterY + 22);

    ctx.textBaseline = 'alphabetic';
  }

  drawBoxTop() {
    const { boxX, boxY, boxWidth, boxDepth } = this;

    ctx.fillStyle = this.colors.boxTop;
    ctx.beginPath();
    ctx.moveTo(boxX, boxY);
    ctx.lineTo(boxX + boxDepth, boxY - boxDepth);
    ctx.lineTo(boxX + boxWidth + boxDepth, boxY - boxDepth);
    ctx.lineTo(boxX + boxWidth, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.colors.boxHighlight;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(boxX + 6, boxY - 2);
    ctx.lineTo(boxX + boxDepth + 6, boxY - boxDepth);
    ctx.lineTo(boxX + boxWidth * 0.28, boxY - boxDepth);
    ctx.lineTo(boxX + boxWidth * 0.28 - boxDepth, boxY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawSlotDepth() {
    const { slotX, slotY, slotWidth, slotHeight } = this;
    const cx = slotX + slotWidth / 2;

    ctx.fillStyle = this.colors.slotDeep;
    ctx.beginPath();
    ctx.ellipse(cx, slotY, slotWidth / 2, slotHeight / 2 + 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSlotRim() {
    const { slotX, slotY, slotWidth, slotHeight } = this;
    const cx = slotX + slotWidth / 2;

    ctx.strokeStyle = '#1a2530';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, slotY, slotWidth / 2 + 1, slotHeight / 2 + 1, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  drawCurrentTissue() {
    if (!this.currentTissue || this.currentTissue.pulled) return;

    const t = this.currentTissue;
    const style = t.exposedStyle;
    const cx = this.slotX + this.slotWidth / 2 + t.offsetX;

    const pullDist = this.currentPull;
    const exposed = this.tissueExposed + pullDist;
    const tissueTop = this.slotY - exposed;
    const tissueBottom = this.slotY + 5;

    const w = this.tissueWidth * t.scale;
    const h = tissueBottom - tissueTop;

    ctx.save();
    ctx.translate(cx, tissueBottom);
    ctx.rotate(t.tilt);
    ctx.translate(-cx, -tissueBottom);

    // 构建不规则纸巾形状
    ctx.beginPath();

    const leftX = cx - w * 0.45;
    const rightX = cx + w * 0.45;

    // 从左下开始
    ctx.moveTo(leftX, tissueBottom);

    // 左边缘（不规则）
    style.leftEdge.forEach((pt, i) => {
      if (i === 0) return;
      const y = tissueBottom - h * pt.y;
      const x = leftX + pt.x;
      ctx.lineTo(x, y);
    });

    // 顶部（不规则形状）
    style.topShape.forEach((pt) => {
      const x = leftX + (rightX - leftX) * pt.x;
      const y = tissueTop + pt.y;
      ctx.lineTo(x, y);
    });

    // 右边缘（不规则）
    style.rightEdge.forEach((pt) => {
      const y = tissueTop + h * pt.y;
      const x = rightX + pt.x;
      ctx.lineTo(x, y);
    });

    ctx.closePath();

    // 填充
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = this.colors.tissue;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 边缘
    ctx.strokeStyle = this.colors.tissueFold;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 褶皱（使用预计算的偏移）
    ctx.strokeStyle = this.colors.tissueFold;
    ctx.lineWidth = 0.6;
    style.folds.forEach((foldY, i) => {
      const y = tissueTop + h * foldY;
      if (y > tissueTop + 8 && y < tissueBottom - 3) {
        const offset = t.foldOffsets[i];
        const foldLeft = leftX + offset.leftOffset;
        const foldRight = rightX - offset.rightOffset;

        ctx.beginPath();
        ctx.moveTo(foldLeft, y);
        ctx.quadraticCurveTo((foldLeft + foldRight) / 2, y + offset.curve, foldRight, y);
        ctx.stroke();
      }
    });

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const hlX = cx - w * 0.1;
    const hlY = tissueTop + h * 0.3;
    ctx.beginPath();
    ctx.ellipse(hlX, hlY, w * 0.12, h * 0.06, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawFallingTissues() {
    this.fallingTissues.forEach(tissue => {
      ctx.save();
      ctx.translate(tissue.x, tissue.y);
      ctx.rotate(tissue.rotation);

      const w = tissue.width;
      const h = tissue.height;
      const style = tissue.style;
      const corners = style.corners;
      const edges = style.edges;

      // 动态波动
      const wave = (base, phase) => base + Math.sin(this.time * 2.5 + phase) * 1.5;

      ctx.beginPath();

      // 左上角
      ctx.moveTo(-w/2 + wave(corners.tl.x, 0), -h/2 + wave(corners.tl.y, 1));

      // 上边（波动）
      const topSteps = 5;
      for (let i = 1; i <= topSteps; i++) {
        const t = i / topSteps;
        const x = -w/2 + w * t + wave(0, i);
        const y = -h/2 + Math.sin(t * Math.PI) * wave(edges.top, i * 0.5);
        ctx.lineTo(x, y);
      }

      // 右上角
      ctx.lineTo(w/2 + wave(corners.tr.x, 2), -h/2 + wave(corners.tr.y, 3));

      // 右边
      const rightSteps = 4;
      for (let i = 1; i < rightSteps; i++) {
        const t = i / rightSteps;
        const x = w/2 + Math.sin(t * Math.PI) * wave(edges.right, i);
        const y = -h/2 + h * t;
        ctx.lineTo(x, y);
      }

      // 右下角
      ctx.lineTo(w/2 + wave(corners.br.x, 4), h/2 + wave(corners.br.y, 5));

      // 下边
      for (let i = topSteps - 1; i >= 0; i--) {
        const t = i / topSteps;
        const x = -w/2 + w * t + wave(0, i + 3);
        const y = h/2 + Math.sin(t * Math.PI) * wave(edges.bottom, i * 0.5 + 2);
        ctx.lineTo(x, y);
      }

      // 左下角
      ctx.lineTo(-w/2 + wave(corners.bl.x, 6), h/2 + wave(corners.bl.y, 7));

      // 左边
      for (let i = rightSteps - 1; i > 0; i--) {
        const t = i / rightSteps;
        const x = -w/2 + Math.sin(t * Math.PI) * wave(edges.left, i + 2);
        const y = -h/2 + h * t;
        ctx.lineTo(x, y);
      }

      ctx.closePath();

      ctx.fillStyle = this.colors.tissue;
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = this.colors.tissueFold;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // 折痕
      ctx.strokeStyle = this.colors.tissueFold;
      ctx.lineWidth = 0.5;
      style.creases.forEach((crease, i) => {
        const y = -h/2 + h * crease.y;
        const curveAmt = wave(crease.curve, i * 2);
        ctx.beginPath();
        ctx.moveTo(-w/2 + 8, y);
        ctx.quadraticCurveTo(0, y + curveAmt, w/2 - 8, y);
        ctx.stroke();
      });

      ctx.restore();
    });
  }

  drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    const bw = screenWidth * 0.65;
    const bh = 105;
    const bx = (screenWidth - bw) / 2;
    const by = (screenHeight - bh) / 2;

    ctx.fillStyle = '#FFF';
    this.roundRect(bx, by, bw, bh, 12);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px PingFang SC, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('纸巾用完啦~', screenWidth / 2, by + 38);

    ctx.fillStyle = '#888';
    ctx.font = '13px PingFang SC, Arial';
    ctx.fillText(`共抽了 ${this.pulledCount} 张`, screenWidth / 2, by + 62);
    ctx.fillText('点击屏幕再来一盒', screenWidth / 2, by + 85);

    if (!this.restartBound) {
      this.restartBound = true;
      const handler = () => {
        this.tissueCount = this.totalTissues;
        this.pulledCount = 0;
        this.fallingTissues = [];
        this.createTissue();
        this.restartBound = false;
        wx.offTouchStart(handler);
      };
      setTimeout(() => wx.onTouchStart(handler), 100);
    }
  }

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
}
