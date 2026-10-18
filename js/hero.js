(() => {
  const canvas = document.getElementById("hero-canvas");
  const form = document.querySelector(".contact-form");
  const status = document.querySelector(".form-status");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const plates = [
    "img/mohawk-far-signal.jpg",
    "img/mohawk-far-crosswalk.jpg",
    "img/mohawk-far-avenue.jpg",
    "img/mohawk-night-corner.jpg",
    "img/mohawk-night-avenue.jpg",
    "img/mohawk-day-market.jpg",
  ].map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });

  const HOLD = 8;
  const FADE = 1.6;
  let plateIndex = Math.floor(Math.random() * plates.length);
  let nextIndex = (plateIndex + 1) % plates.length;
  let elapsed = 0;
  let lastTime = 0;
  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawPlateImage(img, t, alpha) {
    if (!img || !img.naturalWidth || alpha <= 0) return;
    const zoom = 1.06 + Math.sin(t * 0.018) * 0.012;
    const panX = Math.sin(t * 0.03) * 0.012;
    const panY = Math.cos(t * 0.022) * 0.008;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const viewRatio = width / height;
    let dw = width * zoom;
    let dh = height * zoom;
    if (imgRatio > viewRatio) dw = dh * imgRatio;
    else dh = dw / imgRatio;

    const dx = (width - dw) / 2 + panX * width;
    const dy = (height - dh) / 2 + panY * height;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawPlate(t) {
    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, width, height);

    const current = plates[plateIndex];
    const next = plates[nextIndex];
    if (!current?.naturalWidth && !next?.naturalWidth) {
      drawFallbackTower(t);
      return;
    }

    if (reduceMotion || elapsed <= HOLD) {
      drawPlateImage(current, t, 1);
      return;
    }

    const blend = Math.min(1, (elapsed - HOLD) / FADE);
    drawPlateImage(current, t, 1 - blend);
    drawPlateImage(next, t, blend);
    if (blend >= 1) {
      plateIndex = nextIndex;
      nextIndex = (plateIndex + 1) % plates.length;
      elapsed = 0;
    }
  }

  function drawFallbackTower(t) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#141820");
    sky.addColorStop(0.55, "#1a1714");
    sky.addColorStop(1, "#0b0c0e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const baseY = height * 0.7;
    const towerW = width * 0.16;
    const towerX = width * 0.62;
    const towerH = height * 1.05;
    const towerY = baseY - towerH * 0.78;

    ctx.fillStyle = "#161311";
    ctx.beginPath();
    ctx.moveTo(towerX, towerY);
    ctx.lineTo(towerX + towerW, towerY + 20);
    ctx.lineTo(towerX + towerW * 1.08, baseY);
    ctx.lineTo(towerX - towerW * 0.08, baseY);
    ctx.closePath();
    ctx.fill();

    const cols = 9;
    const rows = 110;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const on = ((row * 17 + col * 13) % 7) > 3;
        if (!on) continue;
        const flicker = 0.45 + Math.abs(Math.sin(t * 2 + row * 0.2 + col)) * 0.55;
        ctx.fillStyle = `rgba(232, 196, 120, ${0.18 * flicker})`;
        const wx = towerX + 10 + col * ((towerW - 20) / cols);
        const wy = towerY + 30 + row * ((towerH * 0.72) / rows);
        ctx.fillRect(wx, wy, 3, 5);
      }
    }

    ctx.fillStyle = "#0e1013";
    ctx.fillRect(0, baseY, width, height - baseY);
    ctx.fillStyle = "#18160f";
    ctx.fillRect(0, baseY - 70, width * 0.28, 80);
    ctx.fillRect(width * 0.22, baseY - 120, width * 0.12, 130);
    ctx.fillRect(width * 0.78, baseY - 90, width * 0.18, 100);
  }

  function paint(time) {
    const t = time * 0.001;
    if (!lastTime) lastTime = t;
    const dt = Math.min(0.05, t - lastTime);
    lastTime = t;
    if (!reduceMotion) elapsed += dt;
    drawPlate(t);

    if (!reduceMotion) {
      frame = requestAnimationFrame(paint);
    }
  }

  function start() {
    if (running) return;
    resize();
    if (reduceMotion) {
      paint(0);
      return;
    }
    running = true;
    frame = requestAnimationFrame(paint);
  }

  window.addEventListener("resize", resize);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(frame);
      return;
    }
    start();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!status) return;
    status.hidden = false;
    status.textContent = "Noted. This form stays on the page.";
    form.reset();
  });

  resize();
  const first = plates[plateIndex];
  if (first.complete) start();
  else {
    first.addEventListener("load", start, { once: true });
    first.addEventListener("error", start, { once: true });
  }
})();
