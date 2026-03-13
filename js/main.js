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
    this.currentLevel = 1; // 当前关卡

    // 通关状态
    this.isVictory = false;
    this.confetti = []; // 撒花粒子
    this.victoryTime = 0;

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

    // 多种露出形态 - 方形纸巾的角
    const tipShapes = ['singleCorner', 'cornerLeft', 'cornerRight', 'diamond', 'foldedCorner', 'twoCorners', 'crumpled'];

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
      const touch = e.touches[0];

      // 检测主页按钮点击
      const btnX = 20;
      const btnY = 40;
      const btnSize = 36;
      if (touch.clientX >= btnX && touch.clientX <= btnX + btnSize &&
          touch.clientY >= btnY && touch.clientY <= btnY + btnSize) {
        this.onHomeClick();
        return;
      }

      if (!this.currentTissue || this.currentTissue.pulled) return;

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

  onHomeClick() {
    // 返回主页逻辑（暂时弹出提示）
    wx.showModal({
      title: '返回主页',
      content: '确定要返回主页吗？',
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到主页，暂时重置游戏
          this.tissueCount = this.totalTissues;
          this.pulledCount = 0;
          this.fallingTissues = [];
          this.confetti = [];
          this.isVictory = false;
          this.createTissue();
        }
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

    // 左上角主页按钮
    this.drawHomeButton();

    // 标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 26px PingFang SC, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('抽纸巾', screenWidth / 2, 75);

    // 绘制顺序（落下的纸巾在盒子后面）
    this.drawFallingTissues();
    this.drawBoxBody();
    this.drawBoxTop();
    this.drawSlotDepth();
    this.drawCurrentTissue();
    this.drawSlotRim();
    this.drawTissueCounter();

    if (this.tissueCount > 0 && !this.isDragging) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = '14px PingFang SC, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('向上滑动抽纸巾', screenWidth / 2, screenHeight - 32);
    }

    if (this.tissueCount <= 0 && !this.currentTissue) {
      this.drawVictory();
    }
  }

  drawHomeButton() {
    const btnX = 20;
    const btnY = 40;
    const btnSize = 36;

    // 按钮背景
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // 房子图标
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const hx = btnX + btnSize / 2;
    const hy = btnY + btnSize / 2;

    // 屋顶
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy - 2);
    ctx.lineTo(hx, hy - 10);
    ctx.lineTo(hx + 10, hy - 2);
    ctx.stroke();

    // 房体
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 2);
    ctx.lineTo(hx - 8, hy + 8);
    ctx.lineTo(hx + 8, hy + 8);
    ctx.lineTo(hx + 8, hy - 2);
    ctx.stroke();

    // 门
    ctx.beginPath();
    ctx.moveTo(hx - 2, hy + 8);
    ctx.lineTo(hx - 2, hy + 2);
    ctx.lineTo(hx + 2, hy + 2);
    ctx.lineTo(hx + 2, hy + 8);
    ctx.stroke();

    // 关卡数字（在按钮下方）
    ctx.fillStyle = '#666';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`第${this.currentLevel}关`, btnX + btnSize / 2, btnY + btnSize + 18);
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
    let hlX = cx;
    if (t.tipShape === 'cornerLeft') hlX = cx - w * 0.1;
    else if (t.tipShape === 'cornerRight') hlX = cx + w * 0.1;
    ctx.beginPath();
    ctx.ellipse(hlX, tipY + 18, 6, 3, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 绘制纸巾轮廓形状 - 方形纸巾的角露出
  drawTissueShape(shape, cx, w, tipY, exposed, baseY) {
    // 纸巾是方形的，露出来的是角或边
    switch (shape) {
      case 'cornerLeft':
        // 左边角露出 - 斜着的方形角
        ctx.lineTo(cx - w * 0.38, tipY + exposed * 0.6);
        ctx.lineTo(cx - w * 0.35, tipY + exposed * 0.15);
        ctx.lineTo(cx - w * 0.1, tipY);
        ctx.lineTo(cx + w * 0.15, tipY + exposed * 0.08);
        ctx.lineTo(cx + w * 0.35, tipY + exposed * 0.4);
        ctx.lineTo(cx + w * 0.38, baseY);
        break;
      case 'cornerRight':
        // 右边角露出
        ctx.lineTo(cx - w * 0.38, tipY + exposed * 0.4);
        ctx.lineTo(cx - w * 0.15, tipY + exposed * 0.08);
        ctx.lineTo(cx + w * 0.1, tipY);
        ctx.lineTo(cx + w * 0.35, tipY + exposed * 0.15);
        ctx.lineTo(cx + w * 0.38, tipY + exposed * 0.6);
        ctx.lineTo(cx + w * 0.38, baseY);
        break;
      case 'diamond':
        // 菱形角露出 - 中间尖
        ctx.lineTo(cx - w * 0.35, tipY + exposed * 0.55);
        ctx.lineTo(cx - w * 0.2, tipY + exposed * 0.2);
        ctx.lineTo(cx, tipY);
        ctx.lineTo(cx + w * 0.2, tipY + exposed * 0.2);
        ctx.lineTo(cx + w * 0.35, tipY + exposed * 0.55);
        ctx.lineTo(cx + w * 0.38, baseY);
        break;
      case 'foldedCorner':
        // 折叠的角 - 一个角折过来
        ctx.lineTo(cx - w * 0.38, tipY + exposed * 0.5);
        ctx.lineTo(cx - w * 0.25, tipY + exposed * 0.12);
        ctx.lineTo(cx - w * 0.05, tipY + exposed * 0.05);
        ctx.lineTo(cx + w * 0.1, tipY);
        ctx.lineTo(cx + w * 0.25, tipY + exposed * 0.15);
        ctx.lineTo(cx + w * 0.38, tipY + exposed * 0.45);
        ctx.lineTo(cx + w * 0.38, baseY);
        break;
      case 'twoCorners':
        // 两个角露出
        ctx.lineTo(cx - w * 0.38, tipY + exposed * 0.4);
        ctx.lineTo(cx - w * 0.22, tipY + exposed * 0.05);
        ctx.lineTo(cx - w * 0.05, tipY + exposed * 0.18);
        ctx.lineTo(cx + w * 0.05, tipY + exposed * 0.18);
        ctx.lineTo(cx + w * 0.22, tipY + exposed * 0.05);
        ctx.lineTo(cx + w * 0.38, tipY + exposed * 0.4);
        ctx.lineTo(cx + w * 0.38, baseY);
        break;
      case 'crumpled':
        // 皱巴巴的 - 但还是有棱角
        ctx.lineTo(cx - w * 0.36, tipY + exposed * 0.5);
        ctx.lineTo(cx - w * 0.28, tipY + exposed * 0.25);
        ctx.lineTo(cx - w * 0.12, tipY + exposed * 0.1);
        ctx.lineTo(cx + w * 0.05, tipY);
        ctx.lineTo(cx + w * 0.18, tipY + exposed * 0.15);
        ctx.lineTo(cx + w * 0.32, tipY + exposed * 0.35);
        ctx.lineTo(cx + w * 0.38, tipY + exposed * 0.55);
        ctx.lineTo(cx + w * 0.38, baseY);
        break;
      default: // singleCorner - 单角露出
        ctx.lineTo(cx - w * 0.35, tipY + exposed * 0.5);
        ctx.lineTo(cx - w * 0.15, tipY + exposed * 0.15);
        ctx.lineTo(cx, tipY);
        ctx.lineTo(cx + w * 0.15, tipY + exposed * 0.15);
        ctx.lineTo(cx + w * 0.35, tipY + exposed * 0.5);
        ctx.lineTo(cx + w * 0.38, baseY);
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

  drawVictory() {
    // 初始化通关状态
    if (!this.isVictory) {
      this.isVictory = true;
      this.victoryTime = 0;
      this.createConfetti();
    }

    this.victoryTime += 0.016;

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 撒花动画
    this.updateConfetti();
    this.drawConfetti();

    const centerY = screenHeight * 0.4;

    // 大拇指
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 大拇指弹跳动画
    const bounce = Math.sin(this.victoryTime * 3) * 5;
    ctx.fillText('👍', screenWidth / 2, centerY - 20 + bounce);

    // 通关文字
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px PingFang SC, Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillText('通关', screenWidth / 2, centerY + 70);
    ctx.shadowColor = 'transparent';

    // 提示文字
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '16px PingFang SC, Arial';
    ctx.fillText('点击屏幕继续', screenWidth / 2, centerY + 130);

    ctx.textBaseline = 'alphabetic';

    // 绑定重新开始
    if (!this.restartBound) {
      this.restartBound = true;
      const handler = () => {
        this.tissueCount = this.totalTissues;
        this.pulledCount = 0;
        this.fallingTissues = [];
        this.confetti = [];
        this.isVictory = false;
        this.createTissue();
        this.restartBound = false;
        wx.offTouchStart(handler);
      };
      setTimeout(() => wx.onTouchStart(handler), 500);
    }
  }

  createConfetti() {
    this.confetti = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'];

    for (let i = 0; i < 80; i++) {
      this.confetti.push({
        x: Math.random() * screenWidth,
        y: -20 - Math.random() * 200,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 3,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  updateConfetti() {
    this.confetti.forEach(c => {
      c.y += c.vy;
      c.x += c.vx + Math.sin(c.wobble) * 0.5;
      c.wobble += 0.1;
      c.rotation += c.rotationSpeed;
      c.vx *= 0.99;

      // 循环
      if (c.y > screenHeight + 20) {
        c.y = -20;
        c.x = Math.random() * screenWidth;
      }
    });
  }

  drawConfetti() {
    this.confetti.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;

      if (c.shape === 'rect') {
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  loop() {
    this.update();
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
}
