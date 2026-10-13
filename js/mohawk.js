(() => {
  const canvas = document.getElementById("hero-canvas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const hero = canvas.closest(".hero");
  const LOOP = 32;
  const FLASH = 18.42;
  const shots = [
    {
      src: "img/hero.jpg",
      in: 0,
      out: 4.6,
      zoom: [1.08, 1.28],
      pan: [0, 0.02],
      tilt: [0.04, -0.08],
      weather: true,
    },
    {
      src: "img/mohawk-approach.jpg",
      in: 3.6,
      out: 7.4,
      zoom: [1.1, 1.22],
      pan: [0.01, 0],
      tilt: [0.02, -0.05],
      weather: true,
    },
    {
      src: "img/mohawk-office-room.jpg",
      in: 6.6,
      out: 10.6,
      zoom: [1.08, 1.18],
      pan: [0, 0.02],
      tilt: [0.01, -0.02],
      weather: true,
    },
    {
      src: "img/mohawk-writer.jpg",
      in: 9.8,
      out: 13.6,
      zoom: [1.08, 1.14],
      pan: [0.01, 0],
      tilt: [0, -0.01],
      weather: true,
    },
    {
      src: "img/mohawk-window-desk.jpg",
      in: 12.8,
      out: 16.4,
      zoom: [1.04, 1.08],
      pan: [0, 0.01],
      tilt: [0, 0],
      weather: false,
    },
    {
      kind: "title",
      in: 16.15,
      out: 18.7,
      fade: 0.42,
    },
    {
      src: "img/app/art.png",
      in: 18.55,
      out: 20.85,
      zoom: [1, 1.02],
      fade: 0.14,
      present: true,
    },
    {
      src: "img/app/gaming.png",
      in: 20.72,
      out: 23.02,
      zoom: [1, 1.02],
      fade: 0.12,
      present: true,
    },
    {
      src: "img/app/fashion.png",
      in: 22.9,
      out: 25.2,
      zoom: [1, 1.02],
      fade: 0.12,
      present: true,
    },
    {
      src: "img/app/tech.png",
      in: 25.08,
      out: 27.38,
      zoom: [1, 1.02],
      fade: 0.12,
      present: true,
    },
    {
      src: "img/app/search.png",
      in: 27.26,
      out: 29.56,
      zoom: [1, 1.02],
      fade: 0.12,
      present: true,
    },
    {
      src: "img/app/news.png",
      in: 29.44,
      out: 32,
      zoom: [1, 1.018],
      fade: 0.12,
      present: true,
    },
  ];

  shots.forEach((shot) => {
    if (!shot.src) return;
    shot.img = new Image();
    shot.img.src = shot.src;
  });

  const crowd = new Image();
  crowd.src = "img/mohawk-upturned.jpg";

  const rain = Array.from({ length: 140 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: 10 + Math.random() * 16,
    speed: 0.4 + Math.random() * 0.65,
    alpha: 0.06 + Math.random() * 0.12,
  }));

  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;
  let startedAt = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  function spanOf(shot) {
    return shot.out > shot.in ? shot.out - shot.in : LOOP - shot.in + shot.out;
  }

  function localOf(time, shot) {
    if (shot.out > shot.in) {
      if (time < shot.in || time >= shot.out) return -1;
      return (time - shot.in) / spanOf(shot);
    }
    if (time >= shot.in || time < shot.out) {
      const into = time >= shot.in ? time - shot.in : LOOP - shot.in + time;
      return into / spanOf(shot);
    }
    return -1;
  }

  function alphaOf(time, shot) {
    const local = localOf(time, shot);
    if (local < 0) return 0;
    const span = spanOf(shot);
    const fade = (shot.fade ?? span * 0.18) / span;
    return Math.max(0, Math.min(local / fade, (1 - local) / fade, 1));
  }

  function drawCover(img, zoom, panX, panY, alpha) {
    if (!img.naturalWidth || alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const viewRatio = width / height;
    let dw = width * zoom;
    let dh = height * zoom;
    if (imgRatio > viewRatio) dw = dh * imgRatio;
    else dh = dw / imgRatio;
    ctx.drawImage(
      img,
      (width - dw) / 2 + panX * width,
      (height - dh) / 2 + panY * height,
      dw,
      dh
    );
    ctx.restore();
  }

  function drawCrowdBackdrop() {
    if (!crowd.naturalWidth) return;
    drawCover(crowd, 1.02, 0, 0, 1);
  }

  function drawStage(img, zoom, alpha) {
    if (!img?.naturalWidth || alpha <= 0.01) return;
    const margin = Math.min(width, height) * 0.05;
    const fit = 0.46;
    const maxW = (width - margin * 2) * fit;
    const maxH = (height - margin * 2) * fit;
    const ratio = img.naturalWidth / img.naturalHeight;
    let dw = maxW;
    let dh = dw / ratio;
    if (dh > maxH) {
      dh = maxH;
      dw = dh * ratio;
    }
    dw *= zoom;
    dh *= zoom;
    const x = Math.min(width * 0.5, width - dw - margin);
    const y = height * 0.16;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = Math.max(16, width * 0.018);
    ctx.shadowOffsetY = 12;
    ctx.drawImage(img, x, y, dw, dh);
    ctx.restore();
  }

  function drawTitle(alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.04em";
    ctx.fillStyle = "#ece6da";
    ctx.font = `400 ${Math.max(64, height * 0.16)}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText("Mohawk", width / 2, height * 0.5);
    ctx.restore();
  }

  function drawWeather() {
    rain.forEach((drop) => {
      drop.y += drop.speed * 0.016;
      drop.x += 0.0008;
      if (drop.y > 1.1) {
        drop.y = -0.04;
        drop.x = Math.random();
      }
      ctx.globalAlpha = drop.alpha;
      ctx.strokeStyle = "rgba(210, 220, 230, 0.65)";
      ctx.beginPath();
      ctx.moveTo(drop.x * width, drop.y * height);
      ctx.lineTo(drop.x * width + 2, drop.y * height + drop.len);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function drawFlash(time) {
    const t = time - FLASH;
    if (t < 0 || t > 0.38) return;
    const alpha = t < 0.07 ? t / 0.07 : 1 - (t - 0.07) / 0.31;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha) * 0.92;
    ctx.fillStyle = "#f4ecde";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawTimed(shot, time) {
    const local = localOf(time, shot);
    const alpha = alphaOf(time, shot);
    if (local < 0 || alpha <= 0) return false;
    if (shot.kind === "title") {
      drawTitle(alpha);
      return false;
    }
    const zoom = shot.zoom[0] + (shot.zoom[1] - shot.zoom[0]) * local;
    if (shot.present) {
      drawStage(shot.img, zoom, alpha);
      return false;
    }
    const pan = shot.pan[0] + (shot.pan[1] - shot.pan[0]) * local;
    const tilt = shot.tilt[0] + (shot.tilt[1] - shot.tilt[0]) * local;
    drawCover(shot.img, zoom, pan, tilt, alpha);
    return Boolean(shot.weather);
  }

  function paint(now) {
    if (!startedAt) startedAt = now;
    const time = ((now - startedAt) / 1000) % LOOP;

    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, width, height);

    let weather = false;
    shots.forEach((shot) => {
      if (shot.present || shot.kind === "title") return;
      if (drawTimed(shot, time)) weather = true;
    });
    if (weather) drawWeather();

    const productOn = shots.some((shot) => shot.present && alphaOf(time, shot) > 0.01);
    if (productOn) drawCrowdBackdrop();

    shots.forEach((shot) => {
      if (!shot.present && shot.kind !== "title") return;
      drawTimed(shot, time);
    });
    drawFlash(time);

    hero?.classList.toggle("reel-product", time >= 15.9 && time < 31.72);
    hero?.classList.toggle("reel-sky", productOn);

    if (!reduceMotion) {
      frame = requestAnimationFrame(paint);
    }
  }

  function start() {
    if (running) return;
    resize();
    if (reduceMotion) {
      const app = shots.find((shot) => shot.present);
      hero?.classList.add("reel-product", "reel-sky");
      drawCrowdBackdrop();
      if (app?.img?.naturalWidth) drawStage(app.img, 1, 1);
      else drawCover(shots[0].img, 1.1, 0, 0, 1);
      return;
    }
    running = true;
    startedAt = 0;
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

  Promise.all([
    new Promise((resolve) => {
      if (crowd.complete) resolve();
      else {
        crowd.onload = resolve;
        crowd.onerror = resolve;
      }
    }),
    ...shots.filter((shot) => shot.img).map(
      (shot) =>
        new Promise((resolve) => {
          if (shot.img.complete) resolve();
          else {
            shot.img.onload = resolve;
            shot.img.onerror = resolve;
          }
        })
    ),
    document.fonts.ready,
  ]).then(start);
})();
