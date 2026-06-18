// =============================================
// 🚗 CAR DODGE GAME - Chill Break Widget
// =============================================
(function () {
  const openBtn    = document.getElementById("carOpenBtn");
  const modal      = document.getElementById("carModal");
  const closeBtn   = document.getElementById("closeCarModal");
  const canvas     = document.getElementById("carCanvas");
  const scoreEl    = document.getElementById("carScore");
  const bestEl     = document.getElementById("carBest");
  const overlay    = document.getElementById("carGameOverOverlay");
  const restartBtn = document.getElementById("carRestartBtn");
  const soundBtn   = document.getElementById("carSoundBtn");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const LANES = 3;
  const ROAD_MARGIN = 20;
  const ROAD_WIDTH = W - ROAD_MARGIN * 2;
  const LANE_WIDTH = ROAD_WIDTH / LANES;

  const CAR_W = LANE_WIDTH * 0.55;
  const CAR_H = CAR_W * 1.7;

  let carLane, carX, carY;
  let obstacles, score, best, loop, speed, alive, frame;
  let roadOffset;

  // --- Sound ---
  let audioCtx;
  let soundOn = localStorage.getItem("carSound") !== "off";

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, duration, type = "sine", volume = 0.15) {
    if (!soundOn) return;
    try {
      const ac = getAudioCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
      osc.stop(ac.currentTime + duration);
    } catch (e) {}
  }

  function playPointSound() { beep(700, 0.06, "square", 0.08); }
  function playCrashSound() {
    beep(180, 0.2, "sawtooth", 0.18);
    setTimeout(() => beep(110, 0.3, "sawtooth", 0.18), 100);
  }

  function updateSoundBtn() {
    if (soundBtn) soundBtn.textContent = soundOn ? "🔊" : "🔇";
  }
  updateSoundBtn();

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundOn = !soundOn;
      localStorage.setItem("carSound", soundOn ? "on" : "off");
      updateSoundBtn();
    });
  }

  best = parseInt(localStorage.getItem("carBest") || "0", 10);
  if (bestEl) bestEl.textContent = best;

  function laneX(lane) {
    return ROAD_MARGIN + lane * LANE_WIDTH + (LANE_WIDTH - CAR_W) / 2;
  }

  function resetGame() {
    carLane = 1;
    carX = laneX(carLane);
    carY = H - CAR_H - 20;
    obstacles = [];
    score = 0;
    speed = 3.2;
    alive = true;
    frame = 0;
    roadOffset = 0;
    if (scoreEl) scoreEl.textContent = score;
    if (overlay) overlay.style.display = "none";
    if (loop) clearInterval(loop);
    loop = setInterval(tick, 1000 / 60);
    draw();
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * LANES);
    const w = CAR_W;
    const h = CAR_H;
    obstacles.push({
      x: laneX(lane),
      y: -h,
      w, h,
      color: ["#ef4444", "#f59e0b", "#3b82f6", "#a855f7"][Math.floor(Math.random() * 4)],
    });
  }

  function tick() {
    if (!alive) return;
    frame++;

    // Smooth car movement toward target lane
    const targetX = laneX(carLane);
    carX += (targetX - carX) * 0.25;

    // Road stripes scroll
    roadOffset += speed;
    if (roadOffset > 40) roadOffset -= 40;

    // Spawn obstacles
    const spawnRate = Math.max(28, 60 - Math.floor(score / 5));
    if (frame % spawnRate === 0) spawnObstacle();

    // Move obstacles
    obstacles.forEach(o => o.y += speed);

    // Remove passed obstacles + score
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].y > H) {
        obstacles.splice(i, 1);
        score++;
        if (scoreEl) scoreEl.textContent = score;
        playPointSound();

        if (score % 6 === 0 && speed < 9) {
          speed += 0.4;
        }
      }
    }

    // Collision check
    for (const o of obstacles) {
      if (
        carX < o.x + o.w &&
        carX + CAR_W > o.x &&
        carY < o.y + o.h &&
        carY + CAR_H > o.y
      ) {
        return gameOver();
      }
    }

    draw();
  }

  function gameOver() {
    alive = false;
    clearInterval(loop);
    playCrashSound();

    if (score > best) {
      best = score;
      localStorage.setItem("carBest", best);
      if (bestEl) bestEl.textContent = best;
    }

    if (overlay) overlay.style.display = "flex";
  }

  function draw() {
    // Road background
    ctx.fillStyle = "#374151";
    ctx.fillRect(0, 0, W, H);

    // Side grass
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(0, 0, ROAD_MARGIN, H);
    ctx.fillRect(W - ROAD_MARGIN, 0, ROAD_MARGIN, H);

    // Lane dividers (dashed, scrolling)
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 18]);
    ctx.lineDashOffset = -roadOffset;
    for (let i = 1; i < LANES; i++) {
      const x = ROAD_MARGIN + i * LANE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Obstacles (other cars)
    obstacles.forEach(o => drawCar(o.x, o.y, o.w, o.h, o.color));

    // Player car
    drawCar(carX, carY, CAR_W, CAR_H, "#06A56C", true);
  }

  function drawCar(x, y, w, h, color, isPlayer = false) {
    const r = w * 0.18;

    // Body
    ctx.fillStyle = color;
    roundRect(x, y, w, h, r);
    ctx.fill();

    // Windshield + rear window
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    roundRect(x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.22, r * 0.6);
    ctx.fill();
    roundRect(x + w * 0.15, y + h * 0.66, w * 0.7, h * 0.18, r * 0.6);
    ctx.fill();

    // Wheels
    ctx.fillStyle = "#1f2937";
    const wheelW = w * 0.14;
    const wheelH = h * 0.16;
    roundRect(x - wheelW * 0.4, y + h * 0.15, wheelW, wheelH, 2);
    ctx.fill();
    roundRect(x + w - wheelW * 0.6, y + h * 0.15, wheelW, wheelH, 2);
    ctx.fill();
    roundRect(x - wheelW * 0.4, y + h * 0.7, wheelW, wheelH, 2);
    ctx.fill();
    roundRect(x + w - wheelW * 0.6, y + h * 0.7, wheelW, wheelH, 2);
    ctx.fill();

    // Headlights for player
    if (isPlayer) {
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(x + w * 0.22, y + h * 0.06, w * 0.07, 0, Math.PI * 2);
      ctx.arc(x + w * 0.78, y + h * 0.06, w * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // --- Keyboard controls ---
  document.addEventListener("keydown", (e) => {
    if (!modal || modal.style.display !== "flex") return;

    const key = e.key;
    if (["ArrowLeft", "ArrowRight"].includes(key)) e.preventDefault();

    if (key === "ArrowLeft"  && carLane > 0) carLane--;
    if (key === "ArrowRight" && carLane < LANES - 1) carLane++;
  });

  // --- Touch / Swipe controls ---
  let touchStartX = 0;
  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 25 && carLane < LANES - 1) carLane++;
    else if (dx < -25 && carLane > 0) carLane--;
  }, { passive: true });

  // --- On-screen left/right buttons ---
  document.querySelectorAll(".car-dpad-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.dir;
      if (d === "left"  && carLane > 0) carLane--;
      if (d === "right" && carLane < LANES - 1) carLane++;
    });
  });

  // --- Modal open/close ---
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      modal.style.display = "flex";
      resetGame();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      if (loop) clearInterval(loop);
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", resetGame);
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      if (loop) clearInterval(loop);
    }
  });
})();