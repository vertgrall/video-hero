(() => {
  const canvas = document.getElementById("hero-canvas");
  const form = document.querySelector(".contact-form");
  const status = document.querySelector(".form-status");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const plate = new Image();
  plate.src = "img/hero.jpg";

  const rain = Array.from({ length: 160 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: 10 + Math.random() * 16,
    speed: 0.42 + Math.random() * 0.7,
    alpha: 0.07 + Math.random() * 0.14,
  }));

  const smoke = Array.from({ length: 36 }, (_, i) => ({
    x: 0.08 + (i % 6) * 0.06 + Math.random() * 0.04,
    y: 0.72 + Math.random() * 0.18,
    r: 18 + Math.random() * 40,
    drift: 0.008 + Math.random() * 0.02,
    life: Math.random(),
  }));

  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;
  let ready = false;

  plate.onload = () => {
    ready = true;
    if (!running) start();
  };
  plate.onerror = () => {
    ready = false;
    if (!running) start();
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawPlate(t) {
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, width, height);

    if (!ready || !plate.naturalWidth) {
      drawFallbackTower(t);
      return;
    }

    const zoom = 1.14 + Math.sin(t * 0.018) * 0.03;
    const panX = Math.sin(t * 0.03) * 0.035;
    const panY = Math.cos(t * 0.022) * 0.02;
    const imgRatio = plate.naturalWidth / plate.naturalHeight;
    const viewRatio = width / height;
    let dw = width * zoom;
    let dh = height * zoom;
    if (imgRatio > viewRatio) dw = dh * imgRatio;
    else dh = dw / imgRatio;

    const dx = (width - dw) / 2 + panX * width;
    const dy = (height - dh) / 2 + panY * height;
    ctx.drawImage(plate, dx, dy, dw, dh);
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

  function drawWeather(t) {
    smoke.forEach((puff, i) => {
      puff.life += puff.drift * 0.35;
      if (puff.life > 1) puff.life = 0;
      const x = (puff.x + Math.sin(t * 0.15 + i) * 0.02) * width;
      const y = (puff.y - puff.life * 0.28) * height;
      const r = puff.r * (0.6 + puff.life);
      const fog = ctx.createRadialGradient(x, y, 0, x, y, r);
      fog.addColorStop(0, `rgba(160, 150, 130, ${0.08 * (1 - puff.life)})`);
      fog.addColorStop(1, "rgba(160, 150, 130, 0)");
      ctx.fillStyle = fog;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const bloom = ctx.createRadialGradient(width * 0.48, height * 0.28, 10, width * 0.48, height * 0.28, width * 0.26);
    bloom.addColorStop(0, `rgba(255, 190, 110, ${0.05 + Math.abs(Math.sin(t * 0.7)) * 0.04})`);
    bloom.addColorStop(1, "rgba(255, 190, 110, 0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = "rgba(210, 220, 230, 0.18)";
    ctx.lineWidth = 1;
    rain.forEach((drop) => {
      drop.y += drop.speed * 0.016;
      drop.x += 0.0012;
      if (drop.y > 1.1) {
        drop.y = -0.05;
        drop.x = Math.random();
      }
      ctx.globalAlpha = drop.alpha;
      ctx.beginPath();
      ctx.moveTo(drop.x * width, drop.y * height);
      ctx.lineTo(drop.x * width + 2, drop.y * height + drop.len);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    for (let i = 0; i < 3; i += 1) {
      const y = height * (0.58 + i * 0.12);
      const mist = ctx.createLinearGradient(0, y - 40, 0, y + 80);
      mist.addColorStop(0, "rgba(18, 16, 14, 0)");
      mist.addColorStop(0.5, `rgba(28, 26, 22, ${0.08 + i * 0.04})`);
      mist.addColorStop(1, "rgba(18, 16, 14, 0)");
      ctx.fillStyle = mist;
      ctx.save();
      ctx.translate(Math.sin(t * 0.08 + i) * 40, 0);
      ctx.fillRect(-50, y - 40, width + 100, 140);
      ctx.restore();
    }
  }

  function paint(time) {
    const t = time * 0.001;
    drawPlate(t);
    drawWeather(t);

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
  if (plate.complete && plate.naturalWidth) {
    ready = true;
    start();
  }
})();
