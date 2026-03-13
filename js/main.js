const screenWidth = wx.getSystemInfoSync().screenWidth;
const screenHeight = wx.getSystemInfoSync().screenHeight;
const ctx = canvas.getContext('2d');

/**
 * 抽纸巾小游戏
 */
export default class Main {
  constructor() {
    // 纸巾盒 - 位置靠下
    this.boxWidth = screenWidth * 0.72;
    this.boxHeight = this.boxWidth * 0.38;
    this.boxX = (screenWidth - this.boxWidth) / 2;
    this.boxY = screenHeight * 0.62;
    this.boxDepth = 22;

    // 出纸口
    this.slotWidth = this.boxWidth * 0.48;
    this.slotHeight = 14;
    this.slotX = this.boxX + (this.boxWidth - this.slotWidth) / 2;
    this.slotY = this.boxY - this.boxDepth / 2;

    // 纸巾参数 - 放大
    this.tissueWidth = this.slotWidth * 0.85;
    this.tissueHeight = this.tissueWidth * 0.9;
    this.tissueExposed = 38;
    this.tissueMaxPull = this.tissueHeight * 2.5; // 基础最大拉动距离

    // 20张纸巾
    this.totalTissues = 20;
    this.tissueCount = this.totalTissues;
    this.pulledCount = 0;

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
      slotDeep: '#08080D'
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

    // 多种露出形态
    const tipShapes = ['center', 'left', 'right', 'double', 'leftCurl', 'rightCurl', 'wavy'];

    // 折叠层 - 真正的折叠遮挡效果
    const numFolds = Math.floor(Math.random() * 3); // 0-2个折叠层
    const folds = [];
    for (let i = 0; i < numFolds; i++) {
      folds.push({
        side: Math.random() > 0.5 ? 'left' : 'right', // 从哪边折过来
        startY: 0.1 + Math.random() * 0.3, // 折叠起始位置
        height: 0.15 + Math.random() * 0.25, // 折叠部分的高度
        width: 0.15 + Math.random() * 0.2, // 折叠部分的宽度
        curl: Math.random() * 0.3 // 卷曲程度
      });
    }

    this.currentTissue = {
      pulled: false,
      offsetX: (Math.random() - 0.5) * 5,
      tilt: (Math.random() - 0.5) * 0.02,
      tipShape: tipShapes[Math.floor(Math.random() * tipShapes.length)],
      folds: folds, // 折叠层数组
      softness: 0.8 + Math.random() * 0.4,
      pullScale: 0.6 + Math.random() * 0.8 // 每张纸巾能拉的距离不同 (0.6~1.4倍)
    };
    this.currentPull = 0;
  }

  bindTouch() {
    wx.onTouchStart((e) => {
      if (!this.currentTissue || this.currentTissue.pulled) return;

      const touch = e.touches[0];
      const cx = this.slotX + this.slotWidth / 2;
      const tipY = this.slotY - this.tissueExposed - this.currentPull;

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
      const maxPull = this.tissueMaxPull * this.currentTissue.pullScale;
      this.currentPull = Math.max(0, Math.min(pull, maxPull));

      if (this.currentPull >= maxPull * 0.95) {
        this.pullOut();
      }
    });

    wx.onTouchEnd(() => {
      if (!this.isDragging) return;
      this.isDragging = false;

      if (!this.currentTissue || this.currentTissue.pulled) return;

      const maxPull = this.tissueMaxPull * this.currentTissue.pullScale;
      if (this.currentPull > maxPull * 0.7) {
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
      width: this.tissueWidth * 1.3,
      height: this.tissueHeight * 1.4,
      rotation: t.tilt,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      vx: (Math.random() - 0.5) * 2,
      vy: -2,
      gravity: 0.18,
      softness: t.softness,
      phase: Math.random() * Math.PI * 2
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
      t.vx += Math.sin(this.time * 2 + i) * 0.03;
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
    this.drawTissueCounter();
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

  drawTissueCounter() {
    const { boxX, boxY, boxWidth, boxHeight } = this;
    const counterX = boxX + boxWidth / 2;
    const counterY = boxY + boxHeight * 0.38;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.tissueCount.toString(), counterX, counterY);
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

  // 绘制纸巾 - 多种形态 + 折叠 + 褶皱
  drawCurrentTissue() {
    if (!this.currentTissue || this.currentTissue.pulled) return;

    const t = this.currentTissue;
    const cx = this.slotX + this.slotWidth / 2 + t.offsetX;
    const pullDist = this.currentPull;
    const exposed = this.tissueExposed + pullDist;

    const tipY = this.slotY - exposed;
    const baseY = this.slotY + 8;
    const w = this.tissueWidth;

    ctx.save();
    ctx.translate(cx, this.slotY);
    ctx.rotate(t.tilt);
    ctx.translate(-cx, -this.slotY);

    // ===== 1. 先画主体纸巾 =====
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.4, baseY);

    // 根据形态绘制轮廓
    this.drawTissueShape(t.tipShape, cx, w, tipY, exposed, baseY);
    ctx.closePath();

    // 渐变填充
    const tissueGrad = ctx.createLinearGradient(cx, tipY, cx, baseY);
    tissueGrad.addColorStop(0, '#FFFFFF');
    tissueGrad.addColorStop(0.4, '#FDFCFA');
    tissueGrad.addColorStop(1, '#F7F6F2');

    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = tissueGrad;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(210, 205, 195, 0.35)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ===== 2. 画折叠层（真正的遮挡效果）=====
    this.drawTissueFolds(t, cx, w, tipY, exposed);

    // ===== 3. 高光 =====
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    let hlX = cx - 3;
    if (t.tipShape === 'left' || t.tipShape === 'leftCurl') hlX = cx - w * 0.12;
    else if (t.tipShape === 'right' || t.tipShape === 'rightCurl') hlX = cx + w * 0.08;
    ctx.beginPath();
    ctx.ellipse(hlX, tipY + 14, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 绘制纸巾轮廓形状
  drawTissueShape(shape, cx, w, tipY, exposed, baseY) {
    switch (shape) {
      case 'left':
        ctx.quadraticCurveTo(cx - w * 0.45, tipY + exposed * 0.5, cx - w * 0.3, tipY + exposed * 0.15);
        ctx.quadraticCurveTo(cx - w * 0.15, tipY - 5, cx - w * 0.05, tipY);
        ctx.quadraticCurveTo(cx + w * 0.1, tipY + 8, cx + w * 0.25, tipY + exposed * 0.35);
        ctx.quadraticCurveTo(cx + w * 0.4, tipY + exposed * 0.55, cx + w * 0.4, baseY);
        break;
      case 'right':
        ctx.quadraticCurveTo(cx - w * 0.4, tipY + exposed * 0.55, cx - w * 0.25, tipY + exposed * 0.35);
        ctx.quadraticCurveTo(cx - w * 0.1, tipY + 8, cx + w * 0.05, tipY);
        ctx.quadraticCurveTo(cx + w * 0.15, tipY - 5, cx + w * 0.3, tipY + exposed * 0.15);
        ctx.quadraticCurveTo(cx + w * 0.45, tipY + exposed * 0.5, cx + w * 0.4, baseY);
        break;
      case 'double':
        ctx.quadraticCurveTo(cx - w * 0.42, tipY + exposed * 0.4, cx - w * 0.28, tipY + exposed * 0.1);
        ctx.quadraticCurveTo(cx - w * 0.15, tipY - 3, cx - w * 0.08, tipY + 5);
        ctx.quadraticCurveTo(cx, tipY + exposed * 0.18, cx + w * 0.08, tipY + 5);
        ctx.quadraticCurveTo(cx + w * 0.15, tipY - 3, cx + w * 0.28, tipY + exposed * 0.1);
        ctx.quadraticCurveTo(cx + w * 0.42, tipY + exposed * 0.4, cx + w * 0.4, baseY);
        break;
      case 'leftCurl':
        ctx.quadraticCurveTo(cx - w * 0.5, tipY + exposed * 0.3, cx - w * 0.35, tipY + exposed * 0.08);
        ctx.bezierCurveTo(cx - w * 0.25, tipY - 8, cx - w * 0.1, tipY - 5, cx, tipY + 3);
        ctx.quadraticCurveTo(cx + w * 0.2, tipY + exposed * 0.25, cx + w * 0.35, tipY + exposed * 0.4);
        ctx.quadraticCurveTo(cx + w * 0.42, tipY + exposed * 0.6, cx + w * 0.4, baseY);
        break;
      case 'rightCurl':
        ctx.quadraticCurveTo(cx - w * 0.42, tipY + exposed * 0.6, cx - w * 0.35, tipY + exposed * 0.4);
        ctx.quadraticCurveTo(cx - w * 0.2, tipY + exposed * 0.25, cx, tipY + 3);
        ctx.bezierCurveTo(cx + w * 0.1, tipY - 5, cx + w * 0.25, tipY - 8, cx + w * 0.35, tipY + exposed * 0.08);
        ctx.quadraticCurveTo(cx + w * 0.5, tipY + exposed * 0.3, cx + w * 0.4, baseY);
        break;
      case 'wavy':
        ctx.quadraticCurveTo(cx - w * 0.42, tipY + exposed * 0.5, cx - w * 0.3, tipY + exposed * 0.2);
        ctx.quadraticCurveTo(cx - w * 0.18, tipY + 2, cx - w * 0.08, tipY + exposed * 0.12);
        ctx.quadraticCurveTo(cx, tipY - 2, cx + w * 0.08, tipY + exposed * 0.12);
        ctx.quadraticCurveTo(cx + w * 0.18, tipY + 2, cx + w * 0.3, tipY + exposed * 0.2);
        ctx.quadraticCurveTo(cx + w * 0.42, tipY + exposed * 0.5, cx + w * 0.4, baseY);
        break;
      default: // center
        ctx.quadraticCurveTo(cx - w * 0.42, tipY + exposed * 0.55, cx - w * 0.25, tipY + exposed * 0.25);
        ctx.quadraticCurveTo(cx - w * 0.1, tipY + 5, cx, tipY);
        ctx.quadraticCurveTo(cx + w * 0.1, tipY + 5, cx + w * 0.25, tipY + exposed * 0.25);
        ctx.quadraticCurveTo(cx + w * 0.42, tipY + exposed * 0.55, cx + w * 0.4, baseY);
    }
  }

  // 绘制折叠层 - 真正的前后遮挡效果
  drawTissueFolds(t, cx, w, tipY, exposed) {
    if (!t.folds || t.folds.length === 0) return;

    t.folds.forEach((fold, index) => {
      const foldY = tipY + exposed * fold.startY;
      const foldH = exposed * fold.height;
      const foldW = w * fold.width;
      const isLeft = fold.side === 'left';

      // 折叠层的位置
      const baseX = isLeft ? cx - w * 0.3 : cx + w * 0.3;
      const foldDir = isLeft ? 1 : -1;

      ctx.save();

      // 折叠层的阴影（表示它在上面）
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = foldDir * 2;
      ctx.shadowOffsetY = 1;

      // 画折叠过来的纸巾部分
      ctx.beginPath();

      // 折叠边缘（弯曲的边）
      ctx.moveTo(baseX, foldY);

      // 折叠过来的曲线
      ctx.quadraticCurveTo(
        baseX + foldDir * foldW * 0.3,
        foldY + foldH * 0.2,
        baseX + foldDir * foldW * (0.5 + fold.curl),
        foldY + foldH * 0.35
      );

      // 折叠的底部
      ctx.quadraticCurveTo(
        baseX + foldDir * foldW * (0.6 + fold.curl * 0.5),
        foldY + foldH * 0.7,
        baseX + foldDir * foldW * 0.4,
        foldY + foldH
      );

      // 返回到折叠边缘
      ctx.quadraticCurveTo(
        baseX + foldDir * foldW * 0.1,
        foldY + foldH * 0.8,
        baseX,
        foldY + foldH * 0.9
      );

      ctx.closePath();

      // 折叠层的渐变填充（稍微暗一点，表示是翻折过来的背面或有阴影）
      const foldGrad = ctx.createLinearGradient(
        baseX, foldY,
        baseX + foldDir * foldW, foldY + foldH
      );
      foldGrad.addColorStop(0, '#FAFAF8');
      foldGrad.addColorStop(0.5, '#F5F4F0');
      foldGrad.addColorStop(1, '#EFEDE8');

      ctx.fillStyle = foldGrad;
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // 折叠边缘的线（折痕）
      ctx.strokeStyle = 'rgba(180, 175, 165, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(baseX, foldY);
      ctx.quadraticCurveTo(
        baseX - foldDir * 2,
        foldY + foldH * 0.5,
        baseX,
        foldY + foldH * 0.9
      );
      ctx.stroke();

      ctx.restore();
    });
  }

  // 飘落的纸巾 - 柔软飘逸
  drawFallingTissues() {
    this.fallingTissues.forEach(tissue => {
      ctx.save();
      ctx.translate(tissue.x, tissue.y);
      ctx.rotate(tissue.rotation);

      const w = tissue.width;
      const h = tissue.height;
      const t = this.time;
      const phase = tissue.phase;
      const soft = tissue.softness;

      // 柔软飘动的形状
      ctx.beginPath();

      // 动态波动参数
      const wave1 = Math.sin(t * 3 + phase) * 4 * soft;
      const wave2 = Math.sin(t * 2.5 + phase + 1) * 3 * soft;
      const wave3 = Math.sin(t * 2 + phase + 2) * 5 * soft;

      // 左上角
      ctx.moveTo(-w/2 + wave1, -h/2 + wave2);

      // 上边 - 柔软波浪
      ctx.bezierCurveTo(
        -w/4, -h/2 - wave1 * 0.5,
        w/4, -h/2 + wave2 * 0.5,
        w/2 + wave2, -h/2 + wave1
      );

      // 右边 - 柔软波浪
      ctx.bezierCurveTo(
        w/2 + wave3 * 0.5, -h/4,
        w/2 - wave1 * 0.5, h/4,
        w/2 + wave1, h/2 - wave2
      );

      // 下边 - 柔软波浪
      ctx.bezierCurveTo(
        w/4, h/2 + wave2 * 0.5,
        -w/4, h/2 - wave1 * 0.5,
        -w/2 + wave3, h/2 + wave1
      );

      // 左边 - 柔软波浪
      ctx.bezierCurveTo(
        -w/2 - wave2 * 0.5, h/4,
        -w/2 + wave1 * 0.5, -h/4,
        -w/2 + wave1, -h/2 + wave2
      );

      ctx.closePath();

      // 柔软的渐变填充
      const grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.5, '#FCFCFA');
      grad.addColorStop(1, '#F7F6F2');

      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;

      // 淡淡的边缘
      ctx.strokeStyle = 'rgba(220, 215, 205, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

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
