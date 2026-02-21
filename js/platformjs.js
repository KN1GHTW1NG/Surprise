const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
  DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  const cssW = Math.min(420, window.innerWidth - 20);
  const cssH = Math.min(window.innerHeight * 0.78, 780);

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  canvas.width = cssW * DPR;
  canvas.height = cssH * DPR;

  W = cssW;
  H = cssH;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);

// ---------------- PHYSICS ----------------

const gravity = 2200;
const moveSpeed = 320;
const jumpForce = 780;
const friction = 0.85;

let keys = {
  left: false,
  right: false,
  jump: false
};

const player = {
  x: 80,
  y: 0,
  w: 90,      // 50% larger
  h: 135,     // 50% larger
  vx: 0,
  vy: 0,
  grounded: false
};

// ---------------- CHARACTER IMAGE ----------------

const playerImg = new Image();
playerImg.src = "https://github.com/KN1GHTW1NG/Surprise/raw/refs/heads/main/IMG_2116.png";

let imgReady = false;
playerImg.onload = () => imgReady = true;

// ---------------- LEVEL ----------------

let groundY = 0;
let platforms = [];

function buildLevel() {
  groundY = H - 140;

  platforms = [
    { x: 0, width: 300 },
    { x: 380, width: 260 },
    { x: 720, width: 260 },
    { x: 1060, width: 260 },
    { x: 1400, width: 260 },
    { x: 1740, width: 320 }
  ];
}

// Goal Car (placeholder box)
const goal = {
  x: 2050,
  w: 120,
  h: 80
};

// ---------------- CONTROLS ----------------

document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  if (e.key === " " || e.key === "ArrowUp") keys.jump = true;
});

document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
  if (e.key === " " || e.key === "ArrowUp") keys.jump = false;
});

// D-pad (if exists)
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

if (leftBtn) leftBtn.onclick = () => keys.left = true;
if (rightBtn) rightBtn.onclick = () => keys.right = true;
if (jumpBtn) jumpBtn.onclick = () => {
  if (player.grounded) {
    player.vy = -jumpForce;
    player.grounded = false;
  }
};

// ---------------- GAME LOOP ----------------

let cameraX = 0;
let last = performance.now();

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt) {

  // Horizontal
  if (keys.left) player.vx = -moveSpeed;
  else if (keys.right) player.vx = moveSpeed;
  else player.vx *= friction;

  // Jump
  if (keys.jump && player.grounded) {
    player.vy = -jumpForce;
    player.grounded = false;
  }

  // Gravity
  player.vy += gravity * dt;

  // Apply movement
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.grounded = false;

  // Platform collision
  for (let p of platforms) {
    if (
      player.x + player.w > p.x &&
      player.x < p.x + p.width &&
      player.y + player.h > groundY &&
      player.y + player.h < groundY + 40 &&
      player.vy >= 0
    ) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Fall reset
  if (player.y > H + 200) {
    player.x = 80;
    player.y = groundY - player.h;
    player.vy = 0;
  }

  // Camera follow
  cameraX = player.x - 150;

  // Win
  if (player.x > goal.x) {
    window.location.href = "cargame.html";
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Sky
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-cameraX, 0);

  // Ground
  ctx.fillStyle = "#3CB371";
  for (let p of platforms) {
    ctx.fillRect(p.x, groundY, p.width, 140);
  }

  // Goal car placeholder
  ctx.fillStyle = "pink";
  ctx.fillRect(goal.x, groundY - goal.h, goal.w, goal.h);

  // Player
  drawPlayer();

  ctx.restore();
}

// ---- Clean Drawing (No Halo / No Crop) ----

function drawPlayer() {

  if (!imgReady) {
    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    return;
  }

  const ratio = playerImg.width / playerImg.height;

  let drawH = player.h;
  let drawW = drawH * ratio;

  if (drawW > player.w) {
    drawW = player.w;
    drawH = drawW / ratio;
  }

  const x = Math.round(player.x);
  const y = Math.round(player.y);

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    playerImg,
    x,
    y,
    Math.round(drawW),
    Math.round(drawH)
  );
}

// ---------------- INIT ----------------

resize();
buildLevel();
player.y = H - 140 - player.h;
requestAnimationFrame(loop);
