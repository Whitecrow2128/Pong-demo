const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// 游戏对象
const paddle = {
  w: 12, h: 100,
  leftX: 30,
  rightX: W - 30 - 12,
  speed: 6
};

const ballInitSpeed = 5;
const ball = {
  x: W/2, y: H/2, r: 8,
  vx: ballInitSpeed * (Math.random() > 0.5 ? 1 : -1),
  vy: (Math.random()*2 - 1) * ballInitSpeed
};

let leftY = H/2 - paddle.h/2;
let rightY = H/2 - paddle.h/2;

let keys = { up: false, down: false };
let paused = false;
let score = { left: 0, right: 0 };
const winScore = 10;

// 工具函数
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function resetBall(dir = 0) {
  ball.x = W/2;
  ball.y = H/2;
  const speed = ballInitSpeed + Math.min(score.left + score.right, 12) * 0.4;
  const angle = (Math.random() * 0.6 - 0.3); // -0.3 ~ 0.3弧度
  const sign = dir !== 0 ? dir : (Math.random() > 0.5 ? 1 : -1);
  ball.vx = Math.cos(angle) * speed * sign;
  ball.vy = Math.sin(angle) * speed;
}

function drawNet() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.setLineDash([8, 14]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.restore();
}

function drawPaddle(x, y) {
  ctx.fillStyle = '#e8e8ee';
  ctx.fillRect(x, y, paddle.w, paddle.h);
}

function drawBall() {
  ctx.fillStyle = '#e8e8ee';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD() {
  document.getElementById('scoreLeft').textContent = score.left;
  document.getElementById('scoreRight').textContent = score.right;
  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('已暂停 · 按 P 继续', W/2, H/2);
  }
  if (score.left >= winScore || score.right >= winScore) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px system-ui';
    ctx.textAlign = 'center';
    const winner = score.left > score.right ? '你赢了！' : 'AI 赢了！';
    ctx.fillText(`${winner} 按 R 重开`, W/2, H/2);
  }
}

// 物理与碰撞
function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // 上下边界
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }
  if (ball.y + ball.r > H) {
    ball.y = H - ball.r;
    ball.vy *= -1;
  }

  // 左拍碰撞
  if (ball.x - ball.r < paddle.leftX + paddle.w &&
      ball.y > leftY && ball.y < leftY + paddle.h &&
      ball.vx < 0) {
    const hitPos = (ball.y - (leftY + paddle.h/2)) / (paddle.h/2); // -1~1
    const speed = Math.hypot(ball.vx, ball.vy) * 1.04; // 轻微加速
    const angle = hitPos * 0.6; // 控制反射角
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.x = paddle.leftX + paddle.w + ball.r + 0.5;
  }

  // 右拍碰撞
  if (ball.x + ball.r > paddle.rightX &&
      ball.y > rightY && ball.y < rightY + paddle.h &&
      ball.vx > 0) {
    const hitPos = (ball.y - (rightY + paddle.h/2)) / (paddle.h/2);
    const speed = Math.hypot(ball.vx, ball.vy) * 1.04;
    const angle = hitPos * 0.6;
    ball.vx = -Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.x = paddle.rightX - ball.r - 0.5;
  }

  // 进球判定
  if (ball.x + ball.r < 0) {
    score.right++;
    resetBall(1);
  }
  if (ball.x - ball.r > W) {
    score.left++;
    resetBall(-1);
  }
}

// 玩家输入
window.addEventListener('keydown', e => {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = true;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = true;
  if (e.key === 'p' || e.key === 'P') paused = !paused;
  if (e.key === 'r' || e.key === 'R') {
    score.left = 0; score.right = 0;
    leftY = H/2 - paddle.h/2; rightY = H/2 - paddle.h/2;
    resetBall();
  }
});

window.addEventListener('keyup', e => {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = false;
});

// 玩家移动
function updatePlayer() {
  if (keys.up) leftY -= paddle.speed;
  if (keys.down) leftY += paddle.speed;
  leftY = clamp(leftY, 0, H - paddle.h);
}

// 简易AI：跟随球但带延迟与速度限制
function updateAI() {
  const targetY = ball.y - paddle.h/2;
  const aiSpeedBase = 5.2;
  const difficultyBoost = Math.min((score.left + score.right) * 0.12, 2.2);
  const aiSpeed = aiSpeedBase + difficultyBoost;
  if (rightY + paddle.h/2 < ball.y - 6) rightY += aiSpeed;
  else if (rightY + paddle.h/2 > ball.y + 6) rightY -= aiSpeed;
  rightY = clamp(rightY, 0, H - paddle.h);
}

// 主循环
function loop() {
  if (!paused && score.left < winScore && score.right < winScore) {
    updatePlayer();
    updateAI();
    updateBall();
  }

  // 渲染
  ctx.clearRect(0,0,W,H);
  drawNet();
  drawPaddle(paddle.leftX, leftY);
  drawPaddle(paddle.rightX, rightY);
  drawBall();
  drawHUD();

  requestAnimationFrame(loop);
}

resetBall();
loop();

// ========== 触屏支持 ==========
function getCanvasRect() { return canvas.getBoundingClientRect(); }

// 将屏幕坐标转换为画布坐标（考虑缩放）
function toCanvasY(clientY) {
  const rect = getCanvasRect();
  const scaleY = H / rect.height;
  return (clientY - rect.top) * scaleY;
}

// 触摸状态
let touching = false;

function handleTouchStart(e) {
  touching = true;
  // 阻止页面滚动
  e.preventDefault();
  const t = e.touches[0];
  const y = toCanvasY(t.clientY);
  // 将球拍中心对齐到触摸点
  leftY = clamp(y - paddle.h / 2, 0, H - paddle.h);
}

function handleTouchMove(e) {
  if (!touching) return;
  e.preventDefault();
  const t = e.touches[0];
  const y = toCanvasY(t.clientY);
  leftY = clamp(y - paddle.h / 2, 0, H - paddle.h);
}

function handleTouchEnd() {
  touching = false;
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// ========== 移动端 UI 按钮（可选）==========
function createMobileButtons() {
  const wrap = document.createElement('div');
  wrap.style.position = 'fixed';
  wrap.style.left = '12px';
  wrap.style.bottom = '12px';
  wrap.style.display = 'flex';
  wrap.style.gap = '10px';
  wrap.style.zIndex = '20';
  wrap.style.userSelect = 'none';

  const btnStyle = `
    width:64px;height:64px;border-radius:10px;border:1px solid #333;
    background:#20232b;color:#fff;opacity:.85;font:600 18px system-ui;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 6px 16px rgba(0,0,0,.35);
    touch-action:none;
  `;

  const up = document.createElement('button');
  up.textContent = '上';
  up.style.cssText = btnStyle;

  const down = document.createElement('button');
  down.textContent = '下';
  down.style.cssText = btnStyle;

  const pause = document.createElement('button');
  pause.textContent = 'P';
  pause.style.cssText = btnStyle;

  const reset = document.createElement('button');
  reset.textContent = 'R';
  reset.style.cssText = btnStyle;

  // 长按连续移动
  let upHold = null, downHold = null;
  const startHold = (dir) => {
    const step = () => {
      if (dir === 'up') leftY = clamp(leftY - paddle.speed * 1.1, 0, H - paddle.h);
      if (dir === 'down') leftY = clamp(leftY + paddle.speed * 1.1, 0, H - paddle.h);
      if ((dir === 'up' && upHold) || (dir === 'down' && downHold)) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // 触摸事件优先，兼容点击
  up.addEventListener('touchstart', e => { e.preventDefault(); upHold = true; startHold('up'); }, { passive: false });
  up.addEventListener('touchend', () => { upHold = false; });
  up.addEventListener('mousedown', () => { upHold = true; startHold('up'); });
  up.addEventListener('mouseup', () => { upHold = false; });
  up.addEventListener('mouseleave', () => { upHold = false; });

  down.addEventListener('touchstart', e => { e.preventDefault(); downHold = true; startHold('down'); }, { passive: false });
  down.addEventListener('touchend', () => { downHold = false; });
  down.addEventListener('mousedown', () => { downHold = true; startHold('down'); });
  down.addEventListener('mouseup', () => { downHold = false; });
  down.addEventListener('mouseleave', () => { downHold = false; });

  pause.addEventListener('click', () => { paused = !paused; });
  reset.addEventListener('click', () => {
    score.left = 0; score.right = 0;
    leftY = H/2 - paddle.h/2; rightY = H/2 - paddle.h/2;
    resetBall();
  });

  wrap.appendChild(up);
  wrap.appendChild(down);
  wrap.appendChild(pause);
  wrap.appendChild(reset);
  document.body.appendChild(wrap);
}

// 判断是否为触屏环境，创建按钮
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  createMobileButtons();
}

// ========== 画布自适应屏幕（可选）==========
// 将画布按比例缩放以适配小屏幕，同时保持游戏逻辑基于固定分辨率 W×H
function fitCanvas() {
  const margin = 16;
  const maxW = Math.min(window.innerWidth - margin * 2, W);
  const scale = Math.min(
    maxW / W,
    (window.innerHeight - 120) / H // 留出 UI 区域
  );
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);
fitCanvas();
