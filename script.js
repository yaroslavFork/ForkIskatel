const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.onresize = resize; resize();

const TIERS = ["Обычный", "Бронзовый", "Никелевый", "Серебряный", "Золотой", "Алмазный", "Изумрудный", "Титановый"];
const TIER_COLORS = ["#888", "#cd7f32", "#A9A9A9", "#C0C0C0", "#FFD700", "#b9f2ff", "#50C878", "#333"];

const ITEMS_DATA = [
  { name: "Доски", price: 1, color: "#8B4513" },
  { name: "Руда никель", price: 2, color: "#A9A9A9" },
  { name: "Старая лопата", price: 2, color: "#555" },
  { name: "Диван", price: 15, color: "#ff6347" },
  { name: "Золото", price: 50, color: "#ffd700" },
  { name: "Корона", price: 200, color: "#ffff00" },
  { name: "Трон", price: 1000, color: "#9400d3" }
];

// --- ЗАГРУЗКА ДАННЫХ ---
let savedMoney = parseInt(localStorage.getItem('fork_money')) || 0;
let savedTier = parseInt(localStorage.getItem('fork_tier')) || 0;

let state = {
  money: savedMoney,
  tierIdx: savedTier,
  inventory: [],
  player: { x: 300, y: 300, speed: 4, vx: 0, vy: 0 },
  buyer: { x: 80, y: 80 },
  items: []
};

// --- СОХРАНЕНИЕ ДАННЫХ ---
function saveGame() {
    localStorage.setItem('fork_money', state.money);
    localStorage.setItem('fork_tier', state.tierIdx);
}

function resetGame() {
    localStorage.clear();
    location.reload();
}

// --- БЕСКОНЕЧНЫЙ СПАВН ---
function spawnItems() {
  state.items = [];
  for(let i=0; i<60; i++) {
    state.items.push({
      x: Math.random()*(canvas.width-100)+50,
      y: Math.random()*(canvas.height-100)+50,
      type: ITEMS_DATA[Math.floor(Math.random()*ITEMS_DATA.length)],
      found: false
    });
  }
}

// Проверка: если предметов осталось мало — спавним новые
function checkSpawn() {
    let activeItems = state.items.filter(i => !i.found).length;
    if (activeItems < 5) {
        spawnItems();
    }
}

function tryDig() {
    let digRadius = 30 + (state.tierIdx * 15);
    let found = false;
    state.items.forEach(item => {
        if(!item.found) {
            let d = Math.hypot(state.player.x - item.x, state.player.y - item.y);
            if(d < digRadius && state.inventory.length < (5 + state.tierIdx * 8)) {
                item.found = true;
                state.inventory.push(item.type);
                found = true;
            }
        }
    });
    if(found) { updateUI(); checkSpawn(); }
}

canvas.addEventListener('mousedown', tryDig);
canvas.addEventListener('touchstart', (e) => { if(!e.target.closest('#joystick-container')) tryDig(); });

// --- NPC И МАГАЗИН ---
window.sellItems = () => {
  state.money += state.inventory.reduce((acc, i) => acc + i.price, 0);
  state.inventory = [];
  saveGame(); // Сохраняем после продажи
  updateUI();
};

window.buyUpgrade = () => {
  // ЦЕНЫ СТАЛИ ОЧЕНЬ ВЫСОКИМИ
  let cost = Math.pow(state.tierIdx + 1, 3) * 5000; 
  if(state.money >= cost && state.tierIdx < TIERS.length - 1) {
    state.money -= cost;
    state.tierIdx++;
    saveGame(); // Сохраняем после покупки
    updateUI();
  }
};

function updateUI() {
  document.getElementById('money').innerText = state.money;
  document.getElementById('bagCount').innerText = state.inventory.length;
  document.getElementById('bagMax').innerText = 5 + (state.tierIdx * 8);
  document.getElementById('tier-name').innerText = "Тир: " + TIERS[state.tierIdx];
  let nextCost = Math.pow(state.tierIdx + 1, 3) * 5000;
  document.getElementById('upgradeCost').innerText = nextCost;
  document.getElementById('nextTierText').innerText = TIERS[state.tierIdx + 1] || "МАКС";
}

// --- УПРАВЛЕНИЕ И ЦИКЛ ---
let keys = {};
window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;

// (Код джойстика из прошлого сообщения оставить тут же)
const stick = document.getElementById('joystick-stick');
let isMoving = false;
document.addEventListener('touchstart', e => { if(e.target.closest('#joystick-container')) isMoving = true; });
document.addEventListener('touchmove', e => {
  if(!isMoving) return;
  let t = e.touches[0];
  let rect = document.getElementById('joystick-container').getBoundingClientRect();
  let dx = t.clientX - (rect.left + 50), dy = t.clientY - (rect.top + 50);
  let dist = Math.min(Math.hypot(dx, dy), 40);
  let angle = Math.atan2(dy, dx);
  stick.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
  state.player.vx = Math.cos(angle) * (dist/40);
  state.player.vy = Math.sin(angle) * (dist/40);
});
document.addEventListener('touchend', () => { isMoving = false; stick.style.transform = "translate(0,0)"; state.player.vx = 0; state.player.vy = 0; });

function update() {
  ctx.fillStyle = "#2d4a3e"; ctx.fillRect(0,0, canvas.width, canvas.height);
  let smithX = canvas.width - 100, smithY = canvas.height - 100;

  let s = state.player.speed;
  if(keys['KeyW']) state.player.y -= s; if(keys['KeyS']) state.player.y += s;
  if(keys['KeyA']) state.player.x -= s; if(keys['KeyD']) state.player.x += s;
  state.player.x += state.player.vx * s; state.player.y += state.player.vy * s;

  ctx.fillStyle = "#0066ff"; ctx.fillRect(state.buyer.x, state.buyer.y, 45, 45);
  ctx.fillStyle = "#ff6600"; ctx.fillRect(smithX, smithY, 45, 45);

  let dBuyer = Math.hypot(state.player.x - state.buyer.x, state.player.y - state.buyer.y);
  let dSmith = Math.hypot(state.player.x - smithX, state.player.y - smithY);
  document.getElementById('buyer-zone').style.display = dBuyer < 70 ? "block" : "none";
  document.getElementById('smith-zone').style.display = dSmith < 70 ? "block" : "none";

  let radar = 120 + (state.tierIdx * 20);
  let digRange = 30 + (state.tierIdx * 15);

  ctx.beginPath(); ctx.strokeStyle = "rgba(0, 255, 204, 0.1)";
  ctx.arc(state.player.x, state.player.y, radar, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.strokeStyle = TIER_COLORS[state.tierIdx];
  ctx.lineWidth = 3; ctx.arc(state.player.x, state.player.y, digRange, 0, Math.PI*2); ctx.stroke();
  ctx.lineWidth = 1;

  state.items.forEach(item => {
    if(!item.found) {
      let d = Math.hypot(state.player.x - item.x, state.player.y - item.y);
      if(d < radar) {
        ctx.fillStyle = item.type.color;
        ctx.globalAlpha = 1 - (d/radar);
        ctx.beginPath(); ctx.arc(item.x, item.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  });

  ctx.fillStyle = TIER_COLORS[state.tierIdx];
  ctx.fillRect(state.player.x-15, state.player.y-15, 30, 30);
  requestAnimationFrame(update);
}

spawnItems(); updateUI(); update();