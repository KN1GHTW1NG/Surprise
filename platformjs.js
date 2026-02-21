// ===== Portrait Platformer (Stable) – NO CROP avatar + jumpable pits =====

const wrap = document.getElementById("wrap");
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");

// Make canvas crisp on iPhone (devicePixelRatio scaling)
function setupCanvasDPR(){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const cssW = cv.clientWidth || 1;
  const cssH = cv.clientHeight || 1;

  // Keep internal portrait aspect from HTML attributes (540x960) but scale to DPR
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);

  if (cv.width !== targetW || cv.height !== targetH){
    cv.width = targetW;
    cv.height = targetH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
}
window.addEventListener("resize", setupCanvasDPR);

function focusGame(){ try{ wrap.focus({preventScroll:true}); }catch(e){} }
window.addEventListener("load", ()=>{ focusGame(); setupCanvasDPR(); });
wrap.addEventListener("pointerdown", focusGame);
cv.addEventListener("pointerdown", focusGame);

// UI
const uiFill = document.getElementById("fill");
const uiPct = document.getElementById("pct");
const uiM = document.getElementById("m");

// Win overlay
const win = document.getElementById("win");
document.getElementById("replay").onclick = () => reset();
document.getElementById("continue").onclick = () => alert("Next: open your car-traffic game page here.");

// Input
const input = { left:false, right:false, jump:false, jumpLatch:false };

// Keyboard
document.addEventListener("keydown", (e)=>{
  const k = e.key;
  if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(k)) e.preventDefault();
  if(k==="ArrowLeft" || k==="a" || k==="A") input.left = true;
  if(k==="ArrowRight"|| k==="d" || k==="D") input.right = true;
  if(k==="ArrowUp"   || k==="w" || k==="W" || k===" ") input.jump = true;
}, true);

document.addEventListener("keyup", (e)=>{
  const k = e.key;
  if(k==="ArrowLeft" || k==="a" || k==="A") input.left = false;
  if(k==="ArrowRight"|| k==="d" || k==="D") input.right = false;
  if(k==="ArrowUp"   || k==="w" || k==="W" || k===" ") input.jump = false;
}, true);

// D-pad hold
function bindHold(el, on, off){
  el.addEventListener("pointerdown", (e)=>{ e.preventDefault(); focusGame(); on(); el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointerup", (e)=>{ e.preventDefault(); off(); });
  el.addEventListener("pointercancel", (e)=>{ e.preventDefault(); off(); });
}
bindHold(document.getElementById("leftBtn"),  ()=>input.left=true,  ()=>input.left=false);
bindHold(document.getElementById("rightBtn"), ()=>input.right=true, ()=>input.right=false);
bindHold(document.getElementById("upBtn"),    ()=>input.jump=true,  ()=>input.jump=false);
bindHold(document.getElementById("jumpBtn"),  ()=>input.jump=true,  ()=>input.jump=false);
bindHold(document.getElementById("downBtn"),  ()=>{}, ()=>{});

// --- Game coordinates are in CSS pixels (because we setTransform to DPR) ---
const VIEW = {
  get w(){ return cv.clientWidth || 360; },
  get h(){ return cv.clientHeight || 640; }
};

// World
const WORLD = {
  w: 5200,
  get h(){ return VIEW.h; },
  get groundY(){ return Math.floor(VIEW.h * 0.78); }, // portrait-friendly
  gravity: 1900,
  camX: 0
};

// Level (same X layout; Y uses WORLD.groundY so it adapts to portrait height)
const ground = [
  {x:0,    get y(){return WORLD.groundY;}, w:820, h:400},
  {x:940,  get y(){return WORLD.groundY;}, w:720, h:400},
  {x:1780, get y(){return WORLD.groundY;}, w:760, h:400},
  {x:2660, get y(){return WORLD.groundY;}, w:740, h:400},
  {x:3520, get y(){return WORLD.groundY;}, w:720, h:400},
  {x:4360, get y(){return WORLD.groundY;}, w:760, h:400}
];

// Ledges (relative to ground so portrait works)
function ledgeY(offset){ return WORLD.groundY - offset; }
const ledges = [
  {x:560,  get y(){return ledgeY(220);}, w:220, h:16},
  {x:1320, get y(){return ledgeY(260);}, w:220, h:16},
  {x:2160, get y(){return ledgeY(240);}, w:240, h:16},
  {x:3200, get y(){return ledgeY(250);}, w:220, h:16},
  {x:4100, get y(){return ledgeY(280);}, w:220, h:16}
];

// Crates
const crates = [
  {x:420,  get y(){return WORLD.groundY-46;}, w:44, h:46},
  {x:1180, get y(){return WORLD.groundY-46;}, w:44, h:46},
  {x:2040, get y(){return WORLD.groundY-46;}, w:44, h:46},
  {x:3000, get y(){return WORLD.groundY-46;}, w:44, h:46},
  {x:3940, get y(){return WORLD.groundY-46;}, w:44, h:46}
];

// Checkpoints
function cpY(){ return WORLD.groundY - 96; }
const checkpoints = [
  {x:40,   get y(){return cpY();}},
  {x:1000, get y(){return cpY();}},
  {x:1840, get y(){return cpY();}},
  {x:2720, get y(){return cpY();}},
  {x:3580, get y(){return cpY();}},
  {x:4420, get y(){return cpY();}}
];
let checkpointIndex = 0;

// Car near end
const car = {
  x: 4950,
  get y(){ return WORLD.groundY-60; },
  w: 170,
  h: 60
};

// Player (tall; contain image; no crop)
const player = {
  x: 40,
  get y0(){ return cpY(); },
  w: 46,
  h: 96,
  vx: 0,
  vy: 0,
  onGround: false,
  accel: 1300,
  maxVx: 360,
  jumpV: 900,
  y: 0
};
player.y = player.y0;

// Avatar
const PLAYER_IMG_URL = "https://raw.githubusercontent.com/KN1GHTW1NG/Surprise/main/IMG_2104.PNG";
const avatar = new Image();
avatar.crossOrigin = "anonymous";
let avatarReady = false;
let avatarError = false;
avatar.onload = () => { avatarReady = true; avatarError = false; };
avatar.onerror = () => { avatarReady = false; avatarError = true; };
avatar.src = PLAYER_IMG_URL + "?v=" + Date.now();

// Helpers
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function overlap(a,b){
  return !(a.x+a.w <= b.x || a.x >= b.x+b.w || a.y+a.h <= b.y || a.y >= b.y+b.h);
}
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function solidRect(s){
  return { x:s.x, y:(typeof s.y==="number"? s.y : s.y), w:s.w, h:s.h };
}

// Collisions (X then Y)
function resolve(entity, solids, dt){
  entity.onGround = false;

  entity.x += entity.vx * dt;
  let box = {x:entity.x,y:entity.y,w:entity.w,h:entity.h};
  for(const s0 of solids){
    const s = solidRect(s0);
    if(overlap(box,s)){
      if(entity.vx > 0) entity.x = s.x - entity.w;
      else if(entity.vx < 0) entity.x = s.x + s.w;
      entity.vx = 0;
      box.x = entity.x;
    }
  }

  entity.y += entity.vy * dt;
  box = {x:entity.x,y:entity.y,w:entity.w,h:entity.h};
  for(const s0 of solids){
    const s = solidRect(s0);
    if(overlap(box,s)){
      if(entity.vy > 0){
        entity.y = s.y - entity.h;
        entity.onGround = true;
      } else if(entity.vy < 0){
        entity.y = s.y + s.h;
      }
      entity.vy = 0;
      box.y = entity.y;
    }
  }
}

function updateCheckpoint(){
  for(let i=checkpointIndex; i<checkpoints.length; i++){
    if(player.x >= checkpoints[i].x - 20) checkpointIndex = i;
  }
}

function respawn(){
  const cp = checkpoints[checkpointIndex];
  player.x = cp.x;
  player.y = cp.y;
  player.vx = 0;
  player.vy = 0;
}

function reset(){
  win.classList.add("hidden");
  checkpointIndex = 0;
  player.x = checkpoints[0].x;
  player.y = checkpoints[0].y;
  player.vx = player.vy = 0;
  focusGame();
}

function updateUI(){
  const pct = clamp(player.x / car.x, 0, 1);
  uiFill.style.width = (pct*100).toFixed(0) + "%";
  uiPct.textContent = (pct*100).toFixed(0) + "%";
  uiM.textContent = Math.floor(player.x/10) + "m";
}

// Drawing
function drawSky(){
  const g = ctx.createLinearGradient(0,0,0,VIEW.h);
  g.addColorStop(0, "#74b9ff");
  g.addColorStop(1, "#cfefff");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,VIEW.w,VIEW.h);

  // clouds
  for(let i=0;i<9;i++){
    const x = (i*220 - (WORLD.camX*0.18)%220);
    const y = 70 + (i%3)*28;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.beginPath();
    ctx.ellipse(x,   y+18, 44, 26, 0, 0, Math.PI*2);
    ctx.ellipse(x+42,y+20, 34, 20, 0, 0, Math.PI*2);
    ctx.ellipse(x+18,y+6,  32, 20, 0, 0, Math.PI*2);
    ctx.ellipse(x-30,y+22, 30, 18, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGround(seg){
  const s = solidRect(seg);
  const x = s.x - WORLD.camX;

  ctx.fillStyle = "#8e6b3a";
  rr(x, s.y, s.w, s.h, 16); ctx.fill();

  ctx.fillStyle = "#2ecc71";
  rr(x, s.y-16, s.w, 22, 14); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fillRect(x+10, s.y-12, s.w-20, 3);
}

function drawLedge(p){
  const s = solidRect(p);
  const x = s.x - WORLD.camX;

  ctx.fillStyle = "rgba(0,0,0,.18)";
  rr(x+5, s.y+6, s.w, s.h, 10); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.9)";
  rr(x, s.y, s.w, s.h, 10); ctx.fill();
}

function drawCrate(c){
  const s = solidRect(c);
  const x = s.x - WORLD.camX;

  ctx.fillStyle = "rgba(0,0,0,.22)";
  rr(x+4, s.y+6, s.w, s.h, 10); ctx.fill();
  ctx.fillStyle = "#b07a3c";
  rr(x, s.y, s.w, s.h, 10); ctx.fill();
}

function drawCar(){
  const x = car.x - WORLD.camX;

  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath();
  ctx.ellipse(x + car.w/2, car.y + car.h + 12, 70, 14, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "#ff6b81";
  rr(x, car.y+10, car.w, car.h-10, 16); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.7)";
  rr(x+18, car.y+18, car.w-36, 20, 12); ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.beginPath(); ctx.ellipse(x+34, car.y+car.h+6, 14, 14, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+car.w-34, car.y+car.h+6, 14, 14, 0, 0, Math.PI*2); ctx.fill();
}

function drawPlayer(){
  const x = player.x - WORLD.camX;
  const y = player.y;

  // shadow
  const air = clamp((WORLD.groundY - (y+player.h)), 0, 260);
  const s = clamp(1 - air/300, 0.35, 1);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "rgba(0,0,0,.85)";
  ctx.beginPath();
  ctx.ellipse(x + player.w/2, WORLD.groundY + 10, 28*s, 10*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  if(avatarReady){
    const iw = avatar.naturalWidth || 1;
    const ih = avatar.naturalHeight || 1;

    // contain-fit (no crop)
    const scale = Math.min(player.w / iw, player.h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (player.w - dw)/2;
    const dy = y + (player.h - dh)/2;

    ctx.save();
    rr(x, y, player.w, player.h, 14);
    ctx.clip();
    ctx.drawImage(avatar, dx, dy, dw, dh);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.lineWidth = 2;
    rr(x, y, player.w, player.h, 14);
    ctx.stroke();
  } else {
    ctx.fillStyle = avatarError ? "#ffcccc" : "#ffeaa7";
    rr(x,y,player.w,player.h,14); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.65)";
    ctx.font = "900 10px system-ui";
    ctx.fillText(avatarError ? "IMG ERR" : "LOADING", x+4, y+18);
  }
}

// Loop
let last = performance.now();
function tick(now){
  const dt = Math.min(0.033, (now-last)/1000);
  last = now;

  // movement
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vx += dir * player.accel * dt;
  player.vx = clamp(player.vx, -player.maxVx, player.maxVx);

  // jump
  if(input.jump && player.onGround && !input.jumpLatch){
    player.vy = -player.jumpV;
    input.jumpLatch = true;
  }
  if(!input.jump) input.jumpLatch = false;

  // gravity
  player.vy += WORLD.gravity * dt;
  player.vy = clamp(player.vy, -1600, 1600);

  // friction
  player.vx *= (player.onGround ? 0.86 : 0.97);

  // collisions
  const solids = [...ground, ...ledges, ...crates];
  resolve(player, solids, dt);

  // bounds
  player.x = clamp(player.x, 0, WORLD.w - player.w);

  // fall => respawn
  if(player.y > WORLD.h + 200) respawn();

  updateCheckpoint();

  // camera
  const desired = player.x - VIEW.w * 0.35;
  WORLD.camX = clamp(desired, 0, WORLD.w - VIEW.w);

  // win
  const p = {x:player.x,y:player.y,w:player.w,h:player.h};
  const hit = {x:car.x+18,y:car.y,w:car.w-36,h:car.h};
  if(overlap(p, hit)) win.classList.remove("hidden");

  updateUI();

  // render
  ctx.clearRect(0,0,VIEW.w,VIEW.h);
  drawSky();
  for(const seg of ground) drawGround(seg);
  for(const l of ledges) drawLedge(l);
  for(const c of crates) drawCrate(c);
  drawCar();
  drawPlayer();

  requestAnimationFrame(tick);
}

reset();
requestAnimationFrame(tick);