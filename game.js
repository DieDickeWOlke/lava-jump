const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 900;
const H = 520;
const SKY = [170, 220, 255];
const GROUND = [70, 170, 70];
const LAVA = [235, 70, 20];
const BALL = [0, 255, 0];
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
let lastSafeX = player.x;
let gaps = [];
let nextGapStart = 450;
let ramps = [];
let nextRampX = 650;
const extraJumps = 1;
let jumpsLeft = extraJumps;
let flightItems = [];
let hasFlight = false;
let flightTimer = 0;
let flightActive = false;
let spaceWasPressed = false;
let camX = 0;

const keys = { left: false, right: false, space: false };

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function color(r, g, b) {
  return `rgb(${r}, ${g}, ${b})`;
}

function isGap(px) {
  return gaps.some(([start, end]) => start <= px && px <= end);
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
    const gapW = rand(80, 125);
    const gapEnd = nextGapStart + gapW;
    gaps.push([nextGapStart, gapEnd]);
    nextGapStart = gapEnd + rand(220, 380);
  }
}

function spawnRamps(targetX) {
  while (nextRampX < targetX) {
    const startX = nextRampX;
    const endX = startX + 150;
    if (isSafeRamp(startX, endX)) {
      ramps.push([startX, endX, groundY, groundY - 100]);
      flightItems.push([startX + 75, groundY - 140]);
    }
    nextRampX += rand(2000, 4000);
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

function resetToSafePlace() {
  player.x = Math.max(0, lastSafeX - 20);
  player.y = groundY - player.r;
  player.vy = 0;
  onGround = true;
  jumpsLeft = extraJumps;
}

function handleInput() {
  if (keys.left) {
    player.x -= player.speed;
  }
  if (keys.right) {
    player.x += player.speed;
  }
  player.x = Math.max(0, player.x);

  for (let i = flightItems.length - 1; i >= 0; i -= 1) {
    const [itemX, itemY] = flightItems[i];
    if (Math.abs(player.x - itemX) < player.r + 12 && Math.abs(player.y - itemY) < player.r + 12) {
      hasFlight = true;
      flightTimer = 240;
      flightItems.splice(i, 1);
      break;
    }
  }

  if (hasFlight) {
    if (flightTimer > 0) {
      flightTimer -= 1;
    } else {
      hasFlight = false;
      flightActive = false;
    }
  }

  const spacePressed = keys.space;
  if (spacePressed && !spaceWasPressed) {
    if (onGround) {
      player.vy = -player.jump;
      onGround = false;
      jumpsLeft = extraJumps;
    } else if (hasFlight && flightTimer > 0) {
      flightActive = true;
      player.vy = -player.jump * 0.7;
      flightTimer = Math.max(0, flightTimer - 20);
    } else if (jumpsLeft > 0) {
      player.vy = -player.jump;
      jumpsLeft -= 1;
    }
  } else if (hasFlight && flightTimer > 0 && spacePressed && !onGround) {
    flightActive = true;
    player.vy = Math.max(player.vy - 0.45, -7.5);
    flightTimer = Math.max(0, flightTimer - 1);
  } else {
    flightActive = false;
  }

  spaceWasPressed = spacePressed;
}

function updatePhysics() {
  player.vy += player.gravity;
  player.y += player.vy;

  const surfaceY = getSurfaceY(player.x);
  if (!isGap(player.x) && player.y + player.r >= surfaceY) {
    player.y = surfaceY - player.r;
    player.vy = 0;
    onGround = true;
    lastSafeX = player.x;
    jumpsLeft = extraJumps;
  } else {
    onGround = false;
  }

  if (player.y - player.r > H) {
    resetToSafePlace();
  }

  growLevel(player.x + 4000);
  spawnRamps(player.x + 4000);
  camX = Math.max(0, player.x - 220);
}

function drawWorld() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = color(...SKY);
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = color(...GROUND);
  ctx.fillRect(0, groundY, W, H - groundY);

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

  for (const [start, end] of gaps) {
    const dx = start - camX;
    const dw = end - start;
    if (dx < W && dx + dw > 0) {
      ctx.fillStyle = color(...LAVA);
      ctx.fillRect(dx, groundY, dw, H - groundY);
    }
  }

  ctx.beginPath();
  ctx.arc(player.x - camX, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = color(...BALL);
  ctx.fill();

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

  ctx.fillStyle = color(...TEXT);
  ctx.font = '20px Arial';
  ctx.fillText('Pfeile: bewegen | Leertaste: springen / fliegen', 14, 28);
  ctx.fillText(`Distanz: ${Math.floor(player.x)}`, 14, 56);
  if (hasFlight && flightTimer > 0) {
    ctx.fillText('Flug aktiv! Halte Leertaste für den Flug', 14, 84);
  } else if (hasFlight) {
    ctx.fillText('Flug bereit!', 14, 84);
  }
}

function loop() {
  handleInput();
  updatePhysics();
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

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', () => {
  keys.left = false;
  keys.right = false;
  keys.space = false;
  spaceWasPressed = false;
});

growLevel(2000);
spawnRamps(2000);
loop();
