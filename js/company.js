(() => {
  const canvas = document.getElementById("hero-canvas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const LOOP = 18;
  const shots = [
    {
      src: "img/company-room.jpg?v=2",
      in: 16.8,
      out: 6.4,
      zoom: [1.08, 1.16],
      pan: [0, 0.02],
      tilt: [0.02, -0.02],
    },
    {
      src: "img/company-press.jpg?v=2",
      in: 5.4,
      out: 11.2,
      zoom: [1.08, 1.14],
      pan: [0.01, -0.01],
      tilt: [0, -0.01],
    },
    {
      src: "img/company-window.jpg?v=2",
      in: 10.2,
      out: 17.4,
      zoom: [1.1, 1.2],
      pan: [0, 0.01],
      tilt: [0.01, -0.04],
    },
  ];

  shots.forEach((shot) => {
    shot.img = new Image();
    shot.img.src = shot.src;
  });

  const dust = Array.from({ length: 48 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.6 + Math.random() * 1.4,
    drift: 0.00012 + Math.random() * 0.0003,
    rise: 0.00008 + Math.random() * 0.00018,
    alpha: 0.04 + Math.random() * 0.08,
  }));

  const rain = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    len: 8 + Math.random() * 14,
    speed: 0.32 + Math.random() * 0.5,
    alpha: 0.04 + Math.random() * 0.08,
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
    const fade = 0.16;
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

  function drawAtmosphere(time) {
    dust.forEach((mote) => {
      mote.x += mote.drift;
      mote.y -= mote.rise;
      if (mote.x > 1.04) mote.x = -0.02;
      if (mote.y < -0.02) mote.y = 1.04;
      ctx.globalAlpha = mote.alpha;
      ctx.fillStyle = "rgba(236, 214, 170, 0.9)";
      ctx.beginPath();
      ctx.arc(mote.x * width, mote.y * height, mote.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const windowWeight = alphaOf(time, shots[2]);
    rain.forEach((drop) => {
      drop.y += drop.speed * 0.016;
      drop.x += 0.0005;
      if (drop.y > 1.1) {
        drop.y = -0.04;
        drop.x = Math.random();
      }
      ctx.globalAlpha = drop.alpha * (0.25 + windowWeight * 0.9);
      ctx.strokeStyle = "rgba(210, 220, 230, 0.7)";
      ctx.beginPath();
      ctx.moveTo(drop.x * width, drop.y * height);
      ctx.lineTo(drop.x * width + 1.5, drop.y * height + drop.len);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function paint(now) {
    if (!startedAt) startedAt = now;
    const time = ((now - startedAt) / 1000) % LOOP;

    ctx.fillStyle = "#07080b";
    ctx.fillRect(0, 0, width, height);

    shots.forEach((shot) => {
      const local = localOf(time, shot);
      const alpha = alphaOf(time, shot);
      if (local < 0 || alpha <= 0) return;
      const zoom = shot.zoom[0] + (shot.zoom[1] - shot.zoom[0]) * local;
      const pan = shot.pan[0] + (shot.pan[1] - shot.pan[0]) * local;
      const tilt = shot.tilt[0] + (shot.tilt[1] - shot.tilt[0]) * local;
      drawCover(shot.img, zoom, pan, tilt, alpha);
    });

    drawAtmosphere(time);

    if (!reduceMotion) {
      frame = requestAnimationFrame(paint);
    }
  }

  function start() {
    if (running) return;
    resize();
    if (reduceMotion) {
      drawCover(shots[0].img, 1.1, 0, 0, 1);
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

  Promise.all(
    shots.map(
      (shot) =>
        new Promise((resolve) => {
          if (shot.img.complete) resolve();
          else shot.img.onload = resolve;
        })
    )
  ).then(start);
})();
