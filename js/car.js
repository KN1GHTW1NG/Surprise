const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const progressFill = document.getElementById("progressFill");
const percentEl = document.getElementById("percent");
const gameOverEl = document.getElementById("gameOver");
const winEl = document.getElementById("win");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const restartBtn = document.getElementById("restart");
const continueBtn = document.getElementById("continueBtn");

let W = 0, H = 0, DPR = 1;

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
  computeRoad();
}
window.addEventListener("resize", resize);

// ---- Theme ----
const PINK1 = "#FFB6C1";
const PINK2 = "#F8C8DC";
const PINK3 = "#AA336A";

// ---- Road ----
const LANES = 3;
let roadX, roadW, laneW, laneCenters;

function computeRoad() {
  roadW = W * 0.78;
  roadX = (W - roadW) / 2;
  laneW = roadW / LANES;
  laneCenters = Array.from({length: LANES}, (_,i)=> roadX + laneW*i + laneW/2);
}

// ---- Player PNG ----
const playerImg = new Image();
playerImg.src = "https://github.com/KN1GHTW1NG/Surprise/raw/refs/heads/main/IMG_2120.png";

let playerReady = false;
playerImg.onload = ()=> playerReady = true;

// ---- Obstacle PNG ----
const obstacleImg = new Image();
obstacleImg.src = "https://github.com/KN1GHTW1NG/Surprise/raw/refs/heads/main/IMG_2125.png";

let obstacleReady = false;
obstacleImg.onload = ()=> obstacleReady = true;

// ---- Game State ----
const state = {
  running: true,
  won: false,
  distance: 0,
  goal: 1600, // 🔥 LONGER GAME
  lane: 1,
  x: 0,
  vx: 0,
  y: 0,
  carH: 130,
  speed: 380,
  scroll: 0,
  spawnTimer: 0
};

let obstacles = [];

// ---- Reset ----
function resetGame(){
  state.running = true;
  state.won = false;
  state.distance = 0;
  state.lane = 1;
  state.vx = 0;
  state.scroll = 0;
  state.spawnTimer = 0;

  obstacles = [];

  state.x = laneCenters[state.lane];
  state.y = H - 200;

  gameOverEl.classList.add("hidden");
  winEl.classList.add("hidden");

  progressFill.style.width = "0%";
  percentEl.textContent = "0%";
}

// ---- Controls ----
function moveLane(dir){
  if(!state.running) return;
  state.lane = Math.max(0, Math.min(LANES-1, state.lane + dir));
}

leftBtn.onclick = ()=> moveLane(-1);
rightBtn.onclick = ()=> moveLane(1);

document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") moveLane(-1);
  if(e.key==="ArrowRight") moveLane(1);
});

// ---- Spawn ----
function spawn(){
  const lane = Math.floor(Math.random()*LANES);
  obstacles.push({
    lane,
    x: laneCenters[lane],
    y: -140,
    vy: state.speed * (0.9 + Math.random()*0.2)
  });
}

// ---- Collision ----
function hit(a,b){
  return !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h);
}

// ---- Drawing ----
function drawBackground(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,PINK2);
  g.addColorStop(1,PINK1);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
}

function drawRoad(dt){
  state.scroll += state.speed * dt;

  ctx.fillStyle = PINK3;
  ctx.fillRect(roadX,0,roadW,H);

  ctx.fillStyle="rgba(255,255,255,0.15)";
  ctx.fillRect(roadX+8,0,roadW-16,H);

  const dashH=50,gap=40;
  const offset= state.scroll % (dashH+gap);

  ctx.fillStyle="white";
  for(let i=1;i<LANES;i++){
    const x= roadX + i*laneW;
    for(let y=-offset; y<H; y+=dashH+gap){
      ctx.fillRect(x-3,y,6,dashH);
    }
  }
}

function drawPlayer(){
  if(!playerReady) return;

  const ratio = playerImg.width/playerImg.height;
  let drawH = state.carH;
  let drawW = drawH * ratio;

  if(drawW > laneW*0.9){
    drawW = laneW*0.9;
    drawH = drawW/ratio;
  }

  const x = state.x - drawW/2;
  ctx.drawImage(playerImg,x,state.y,drawW,drawH);
}

function drawObstacle(o){
  if(!obstacleReady) return;

  const ratio = obstacleImg.width/obstacleImg.height;
  let drawH = 120;
  let drawW = drawH * ratio;

  if(drawW > laneW*0.9){
    drawW = laneW*0.9;
    drawH = drawW/ratio;
  }

  const x = o.x - drawW/2;
  ctx.drawImage(obstacleImg,x,o.y,drawW,drawH);

  // store hitbox for collision
  o.hitbox = {
    x: x + drawW*0.2,
    y: o.y + 15,
    w: drawW*0.6,
    h: drawH - 30
  };
}

// ---- Game Loop ----
let last=performance.now();

function loop(now){
  const dt=Math.min(0.033,(now-last)/1000);
  last=now;

  ctx.clearRect(0,0,W,H);
  drawBackground();
  drawRoad(dt);

  if(state.running && !state.won){

    state.distance += dt*120;
    const progress = Math.min(state.distance/state.goal,1);
    progressFill.style.width = progress*100+"%";
    percentEl.textContent = Math.floor(progress*100)+"%";

    state.spawnTimer += dt;
    if(state.spawnTimer > 1.2){ // slightly spaced
      state.spawnTimer=0;
      spawn();
    }

    const target = laneCenters[state.lane];
    const dx = target - state.x;
    state.vx += dx*4000*dt;
    state.vx *= 0.85;
    state.x += state.vx*dt;

    obstacles.forEach(o=> o.y += o.vy*dt);

    for(const o of obstacles){
      drawObstacle(o);
    }

    const playerBox = {
      x: state.x-35,
      y: state.y+20,
      w:70,
      h:100
    };

    for(const o of obstacles){
      if(o.hitbox && hit(playerBox,o.hitbox)){
        state.running=false;
        gameOverEl.classList.remove("hidden");
      }
    }

    if(progress>=1){
      state.won=true;
      winEl.classList.remove("hidden");
    }
  }

  drawPlayer();
  requestAnimationFrame(loop);
}

restartBtn.onclick = resetGame;

resize();
computeRoad();
resetGame();
requestAnimationFrame(loop);
