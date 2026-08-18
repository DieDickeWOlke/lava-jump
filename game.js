const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 900;
const H = 520;
const SKY = [170, 220, 255];
const GROUND = [70, 170, 70];
const LAVA = [235, 70, 20];
const BALL = [0, 0, 255];
const TEXT = [30, 30, 30];

const player = {
  r: 18,
  x: 120,
  y: 320,
  vy: 0,
  speed: 5,
  jump: 13,
  gravity: 0.6,
};

const groundY = 430;
let onGround = false;
let gaps = [];
let nextGapStart = 450;
let ramps = [];
let nextRampX = 650;
const extraJumps = 1;
let jumpsLeft = extraJumps;
let flightItems = [];
let hasFlight = false;
let flightTimer = 0;
let fireballs = [];
let fireballTimer = 0;
let levelFlashTimer = 0;
let spaceWasPressed = false;
let camX = 0;
const totalLevels = 10;
const levelDistance = 5000;
const goalDistance = totalLevels * levelDistance;
let gameOver = false;
let won = false;
const restartButton = { x: 320, y: 260, w: 260, h: 60 };

const keys = { left: false, right: false, space: false };
const CONTROL_ACTIONS = {
  LEFT: 'left',
  RIGHT: 'right',
  JUMP: 'jump',
};
const mobileControls = document.getElementById('mobile-controls');
const hint = document.getElementById('hint');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

function updateHint() {
  if (isTouchDevice) {
    hint.textContent = 'Tippe auf die Buttons unten, um zu laufen und zu springen.';
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getLevelFromX(px) {
  return Math.min(totalLevels, Math.max(1, Math.floor(px / levelDistance) + 1));
}

function color(r, g, b) {
  return `rgb(${r}, ${g}, ${b})`;
}

function isGap(px) {
  return gaps.some(([start, end]) => start <= px && px <= end);
}

function isSafeGround(px, padding = 120) {
  if (isGap(px)) {
    return false;
  }

  for (const [start, end] of gaps) {
    if (px >= start - padding && px <= end + padding) {
      return false;
    }
  }

  return true;
}

function getSafeSpawnX(startX, maxDistance = 1600) {
  for (let offset = 0; offset <= maxDistance; offset += 1) {
    const rightX = startX + offset;
    if (isSafeGround(rightX, 120)) {
      return rightX;
    }
  }

  for (let x = Math.max(0, startX - maxDistance); x <= startX + maxDistance; x += 1) {
    if (isSafeGround(x, 120)) {
      return x;
    }
  }

  return Math.max(0, startX);
}

function getSafePortalX(level) {
  const targetX = level * levelDistance;
  const startX = Math.max(0, targetX - 800);
  for (let x = targetX; x >= startX; x -= 1) {
    if (isSafeGround(x, 150)) {
      return x;
    }
  }
  return targetX;
}

function isSafeRamp(startX, endX) {
  for (let px = startX; px <= endX; px += 1) {
    if (isGap(px)) {
      return false;
    }
  }
  return true;
}

function growLevel(targetX) {
  while (nextGapStart < targetX) {
    const level = getLevelFromX(nextGapStart + 200);
    const gapW = rand(90 + level * 16, 150 + level * 18);
    const gapEnd = nextGapStart + gapW;
    gaps.push([nextGapStart, gapEnd]);
    const spacingMin = 180 + level * 20;
    const spacingMax = Math.min(1000, 260 + level * 32);
    nextGapStart = gapEnd + rand(spacingMin, spacingMax);
  }
}

function spawnRamps(targetX) {
  while (nextRampX < targetX) {
    const startX = nextRampX;
    const level = getLevelFromX(startX);
    const rampLength = Math.max(90, 140 - (level - 1) * 8);
    const endX = startX + rampLength;
    if (isSafeRamp(startX, endX)) {
      const rampHeight = Math.max(55, 95 - (level - 1) * 6);
      ramps.push([startX, endX, groundY, groundY - rampHeight]);
      flightItems.push([startX + rampLength / 2, groundY - rampHeight - 40]);
    }
    nextRampX += rand(1600, 3000) - Math.min(700, (level - 1) * 120);
  }
}

function spawnFireball() {
  if (gaps.length === 0) {
    return;
  }

  const level = getLevelFromX(player.x);
  const lavaZones = gaps.filter(([start, end]) => end > player.x - 300 && start < player.x + 1800);
  if (lavaZones.length === 0) {
    return;
  }

  const burstCount = level >= 6 ? 2 : 1;
  for (let burst = 0; burst < burstCount; burst += 1) {
    const availableZones = lavaZones.filter(([start, end]) => {
      const center = (start + end) / 2;
      return Math.abs(center - player.x) > 220;
    });

    if (availableZones.length === 0) {
      return;
    }

    const [start, end] = availableZones[rand(0, availableZones.length - 1)];
    const x = rand(start + 18, end - 18);
    if (Math.abs(x - player.x) < 200) {
      continue;
    }

    fireballs.push({
      x,
      y: groundY + 8,
      vx: (rand(-2, 2) * 0.8) + (level - 1) * 0.2,
      vy: -rand(8, 12),
      r: rand(12, 18) + Math.min(8, level - 1),
      life: rand(110, 190) - (level - 1) * 8,
    });
  }
}

function getSurfaceY(px) {
  for (const [startX, endX, startY, endY] of ramps) {
    if (startX <= px && px <= endX) {
      if (endX === startX) {
        return startY;
      }
      const t = (px - startX) / (endX - startX);
      return startY + (endY - startY) * t;
    }
  }
  return groundY;
}

function resetGame() {
  player.x = 120;
  player.y = 320;
  player.vy = 0;
  onGround = false;
  gaps = [];
  nextGapStart = 450;
  ramps = [];
  nextRampX = 650;
  flightItems = [];
  hasFlight = false;
  flightTimer = 0;
  fireballs = [];
  fireballTimer = 0;
  jumpsLeft = extraJumps;
  spaceWasPressed = false;
  camX = 0;
  gameOver = false;
  won = false;

  growLevel(2000);
  spawnRamps(2000);
}

function movePlayer() {
  if (keys.left) {
    player.x -= player.speed;
  }
  if (keys.right) {
    player.x += player.speed;
  }
  player.x = Math.max(0, player.x);
}

function collectFlightItem() {
  for (let i = flightItems.length - 1; i >= 0; i -= 1) {
    const [itemX, itemY] = flightItems[i];
    if (Math.abs(player.x - itemX) < player.r + 12 && Math.abs(player.y - itemY) < player.r + 12) {
      hasFlight = true;
      flightTimer = 240;
      flightItems.splice(i, 1);
      break;
    }
  }
}

function updateFlightState() {
  if (!hasFlight) {
    return;
  }

  if (flightTimer > 0) {
    flightTimer -= 1;
    return;
  }

  hasFlight = false;
}

function handleJumpInput() {
  const spacePressed = keys.space;

  if (spacePressed && !spaceWasPressed) {
    if (onGround) {
      player.vy = -player.jump;
      onGround = false;
      jumpsLeft = extraJumps;
    } else if (hasFlight && flightTimer > 0) {
      player.vy = -player.jump * 0.7;
      flightTimer = Math.max(0, flightTimer - 20);
    } else if (jumpsLeft > 0) {
      player.vy = -player.jump;
      jumpsLeft -= 1;
    }
  } else if (hasFlight && flightTimer > 0 && spacePressed && !onGround) {
    player.vy = Math.max(player.vy - 0.45, -7.5);
    flightTimer = Math.max(0, flightTimer - 1);
  }

  spaceWasPressed = spacePressed;
}

function handleInput() {
  movePlayer();
  collectFlightItem();
  updateFlightState();
  handleJumpInput();
}

function updatePhysics() {
  const previousLevel = getLevelFromX(player.x - 1);
  const currentLevel = getLevelFromX(player.x);

  if (currentLevel > previousLevel) {
    const levelStart = (currentLevel - 1) * levelDistance;
    const safeSpawnX = getSafeSpawnX(levelStart + 120, 500);
    const spawnX = Number.isFinite(safeSpawnX) ? safeSpawnX : levelStart + 100;

    fireballs = [];
    fireballTimer = 180;
    player.x = spawnX + 35;
    player.y = 320;
    player.vy = 0;
    onGround = false;
    levelFlashTimer = 90;
  }

  if (currentLevel >= 2) {
    fireballTimer -= 1;
    if (fireballTimer <= 0) {
      spawnFireball();
      fireballTimer = Math.max(18, rand(50, 100) - (currentLevel - 2) * 10);
    }
  } else {
    fireballTimer = 0;
  }

  for (let i = fireballs.length - 1; i >= 0; i -= 1) {
    const fireball = fireballs[i];
    fireball.x += fireball.vx;
    fireball.y += fireball.vy;
    fireball.vy += 0.22;
    fireball.life -= 1;

    if (fireball.y > groundY + 40 || fireball.life <= 0 || fireball.x < -60 || fireball.x > goalDistance + 200) {
      fireballs.splice(i, 1);
      continue;
    }

    if (Math.hypot(player.x - fireball.x, player.y - fireball.y) < player.r + fireball.r) {
      gameOver = true;
      won = false;
      return;
    }
  }

  player.vy += player.gravity;
  player.y += player.vy;

  const surfaceY = getSurfaceY(player.x);
  if (!isGap(player.x) && player.y + player.r >= surfaceY) {
    player.y = surfaceY - player.r;
    player.vy = 0;
    onGround = true;
    jumpsLeft = extraJumps;
  } else {
    onGround = false;
  }

  if (player.y - player.r > H) {
    gameOver = true;
    won = false;
    return;
  }

  if (player.x >= goalDistance) {
    gameOver = true;
    won = true;
    return;
  }

  growLevel(player.x + 4000);
  spawnRamps(player.x + 4000);
  camX = Math.max(0, player.x - 220);
}

function drawGround() {
  ctx.fillStyle = color(...GROUND);
  ctx.fillRect(0, groundY, W, H - groundY);
}

function drawRamps() {
  for (const [startX, endX, startY, endY] of ramps) {
    const points = [
      [startX - camX, startY],
      [endX - camX, endY],
      [endX - camX, groundY],
      [startX - camX, groundY],
    ];
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    ctx.lineTo(points[1][0], points[1][1]);
    ctx.lineTo(points[2][0], points[2][1]);
    ctx.lineTo(points[3][0], points[3][1]);
    ctx.closePath();
    ctx.fillStyle = color(...GROUND);
    ctx.fill();
  }
}

function drawGaps() {
  for (const [start, end] of gaps) {
    const dx = start - camX;
    const dw = end - start;
    if (dx < W && dx + dw > 0) {
      ctx.fillStyle = color(...LAVA);
      ctx.fillRect(dx, groundY, dw, H - groundY);
    }
  }
}

function drawGoal() {
  const goalScreenX = goalDistance - camX;
  if (goalScreenX >= -30 && goalScreenX <= W + 30) {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(goalScreenX - 3, 300, 6, 130);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(goalScreenX - 20, 290, 40, 10);
    ctx.fillRect(goalScreenX - 20, 420, 40, 10);
  }
}

function drawPortals() {
  for (let level = 1; level < totalLevels; level += 1) {
    const safePortalX = getSafePortalX(level);
    const portalX = safePortalX - camX;
    if (portalX >= -80 && portalX <= W + 80) {
      const tubeX = portalX;
      const tubeY = 200;
      const pulse = 1 + Math.sin(performance.now() * 0.006 + level) * 0.18;
      const tubeW = 52 * pulse;
      const tubeH = 180 * pulse;

      ctx.fillStyle = 'rgba(110, 231, 255, 0.18)';
      ctx.fillRect(tubeX - 70, tubeY - 20, 140, tubeH + 40);

      ctx.fillStyle = '#121a2d';
      ctx.fillRect(tubeX - tubeW / 2, tubeY, tubeW, tubeH);

      ctx.strokeStyle = `rgba(110, 231, 255, ${0.45 + pulse * 0.25})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(tubeX - tubeW / 2 + 5, tubeY + 8, tubeW - 10, tubeH - 16);

      ctx.fillStyle = `rgba(110, 231, 255, ${0.5 + pulse * 0.3})`;
      ctx.fillRect(tubeX - tubeW / 2 + 9, tubeY + 12, tubeW - 18, tubeH - 24);

      ctx.fillStyle = '#d0f8ff';
      ctx.fillRect(tubeX - tubeW / 2 + 18, tubeY + 22, tubeW - 36, tubeH - 44);

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(tubeX - tubeW / 2 + 24, tubeY + 28, tubeW - 48, tubeH - 56);
    }
  }
}

function drawFireballs() {
  for (const fireball of fireballs) {
    const screenX = fireball.x - camX;
    if (screenX >= -40 && screenX <= W + 40) {
      ctx.beginPath();
      ctx.arc(screenX, fireball.y, fireball.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5a1f';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(screenX - fireball.r * 0.35, fireball.y - fireball.r * 0.25, fireball.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd27d';
      ctx.fill();
    }
  }
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x - camX, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = color(...BALL);
  ctx.fill();
}

function drawFlightItems() {
  for (const [itemX, itemY] of flightItems) {
    const screenX = itemX - camX;
    if (screenX >= 0 && screenX <= W) {
      ctx.beginPath();
      ctx.moveTo(screenX, itemY - 10);
      ctx.lineTo(screenX + 8, itemY);
      ctx.lineTo(screenX, itemY + 10);
      ctx.lineTo(screenX - 8, itemY);
      ctx.closePath();
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }
  }
}

function drawHud() {
  const currentLevel = getLevelFromX(player.x);

  ctx.fillStyle = color(...TEXT);
  ctx.font = '20px Arial';
  ctx.fillText('Pfeile: bewegen | Leertaste: springen / fliegen', 14, 28);
  ctx.fillText(`Distanz: ${Math.floor(player.x)} / ${goalDistance}`, 14, 56);
  ctx.fillText(`Level: ${currentLevel} / ${totalLevels}`, 14, 84);
  if (hasFlight && flightTimer > 0) {
    ctx.fillText('Flug aktiv! Halte Leertaste für den Flug', 14, 112);
  } else if (hasFlight) {
    ctx.fillText('Flug bereit!', 14, 112);
  }
}

function drawLevelFlash() {
  if (levelFlashTimer <= 0) {
    return;
  }

  const currentLevel = getLevelFromX(player.x);
  const alpha = Math.min(1, levelFlashTimer / 30);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.6 - alpha * 0.4})`;
  ctx.font = '48px Arial';
  ctx.fillText(`LEVEL ${currentLevel}`, 330, 150);
  levelFlashTimer -= 1;
}

function drawGameOver() {
  if (!gameOver) {
    return;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = won ? '#ffd700' : '#ff4d4d';
  ctx.font = '72px Arial';
  ctx.fillText(won ? 'GEWONNEN!' : 'GAME OVER', 180, 180);
  ctx.font = '28px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(won ? 'Du hast das Ziel erreicht!' : 'Du bist in der Lava gelandet.', 220, 245);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(restartButton.x, restartButton.y, restartButton.w, restartButton.h);
  ctx.strokeRect(restartButton.x + 8, restartButton.y + 8, restartButton.w - 16, restartButton.h - 16);
  ctx.fillText('Neustart', 365, 292);
}

function drawWorld() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = color(...SKY);
  ctx.fillRect(0, 0, W, H);
  drawGround();
  drawRamps();
  drawGaps();
  drawGoal();
  drawPortals();
  drawFireballs();
  drawPlayer();
  drawFlightItems();
  drawHud();
  drawLevelFlash();
  drawGameOver();
}

function loop() {
  if (!gameOver) {
    handleInput();
    updatePhysics();
  }
  drawWorld();
  requestAnimationFrame(loop);
}

function handleKeyDown(event) {
  if (event.code === 'ArrowLeft') {
    keys.left = true;
    event.preventDefault();
  }
  if (event.code === 'ArrowRight') {
    keys.right = true;
    event.preventDefault();
  }
  if (event.code === 'Space') {
    keys.space = true;
    event.preventDefault();
  }
}

function handleKeyUp(event) {
  if (event.code === 'ArrowLeft') {
    keys.left = false;
  }
  if (event.code === 'ArrowRight') {
    keys.right = false;
  }
  if (event.code === 'Space') {
    keys.space = false;
  }
}

document.addEventListener('keydown', (event) => {
  handleKeyDown(event);
  if (gameOver && event.code === 'Enter') {
    resetGame();
  }
});
document.addEventListener('keyup', handleKeyUp);

function setControlState(action, isPressed) {
  if (action === CONTROL_ACTIONS.LEFT) {
    keys.left = isPressed;
  } else if (action === CONTROL_ACTIONS.RIGHT) {
    keys.right = isPressed;
  } else if (action === CONTROL_ACTIONS.JUMP) {
    keys.space = isPressed;
  }
}

if (mobileControls) {
  mobileControls.addEventListener('touchstart', (event) => {
    event.preventDefault();
  }, { passive: false });

  mobileControls.querySelectorAll('.control-btn').forEach((button) => {
    const action = button.dataset.action;

    button.addEventListener('touchstart', () => setControlState(action, true));
    button.addEventListener('touchend', () => setControlState(action, false));
    button.addEventListener('mousedown', () => setControlState(action, true));
    button.addEventListener('mouseup', () => setControlState(action, false));
  });
}

canvas.addEventListener('click', (event) => {
  if (!gameOver) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  if (x >= restartButton.x && x <= restartButton.x + restartButton.w && y >= restartButton.y && y <= restartButton.y + restartButton.h) {
    resetGame();
  }
});
window.addEventListener('blur', () => {
  keys.left = false;
  keys.right = false;
  keys.space = false;
  spaceWasPressed = false;
});

updateHint();
resetGame();
loop();
