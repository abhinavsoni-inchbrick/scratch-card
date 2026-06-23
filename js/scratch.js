(function () {
  const WINNER = 'DARAAB';
  const REVEAL_THRESHOLD = 40;
  const BRUSH_SIZE = 48;

  const canvas = document.getElementById('scratchCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const zone = document.getElementById('scratchZone');
  const card = document.getElementById('scratchCard');
  const hint = document.getElementById('scratchHint');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const resetBtn = document.getElementById('resetBtn');
  const confettiCanvas = document.getElementById('confetti');
  const confettiCtx = confettiCanvas.getContext('2d');

  let isDrawing = false;
  let revealed = false;
  let lastX = 0;
  let lastY = 0;
  let particles = [];
  let confettiRunning = false;
  let scratchArea = 0;
  let totalArea = 1;
  let progressTimer = null;

  document.getElementById('winnerName').textContent = WINNER;

  function resizeCanvas() {
    const rect = zone.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    totalArea = rect.width * rect.height;
    scratchArea = 0;
    drawScratchLayer(rect.width, rect.height);
  }

  function drawScratchLayer(w, h) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d4b06a');
    grad.addColorStop(0.5, '#B8954A');
    grad.addColorStop(1, '#c9a85a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
    ctx.fillStyle = 'rgba(26, 35, 50, 0.2)';
    ctx.textAlign = 'center';
    for (let y = 28; y < h; y += 44) {
      for (let x = 50; x < w; x += 100) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.25);
        ctx.fillText('INCH & BRICK', 0, 0);
        ctx.restore();
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
    ctx.fillText('SCRATCH HERE', w / 2, h / 2);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  function eraseAt(x, y, x2, y2) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH_SIZE;

    if (x2 !== undefined) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const dist = Math.hypot(x2 - x, y2 - y);
      scratchArea += dist * BRUSH_SIZE;
    }

    ctx.beginPath();
    ctx.arc(x, y, BRUSH_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    scratchArea += Math.PI * (BRUSH_SIZE / 2) * (BRUSH_SIZE / 2) * 0.5;

    ctx.globalCompositeOperation = 'source-over';
  }

  function scratch(x, y) {
    if (revealed) return;

    if (isDrawing) {
      eraseAt(lastX, lastY, x, y);
    } else {
      eraseAt(x, y);
    }

    lastX = x;
    lastY = y;
    hint.classList.add('hidden');
    updateProgress();
  }

  function updateProgress() {
    if (progressTimer) return;
    progressTimer = requestAnimationFrame(() => {
      progressTimer = null;
      measureProgress();
    });
  }

  function measureProgress() {
    let pct = Math.min(100, Math.round((scratchArea / totalArea) * 100));

    try {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      let cleared = 0;
      let samples = 0;
      const stride = 16;

      for (let i = 3; i < data.length; i += stride) {
        samples++;
        if (data[i] < 128) cleared++;
      }

      const pixelPct = Math.round((cleared / samples) * 100);
      pct = Math.max(pct, pixelPct);
    } catch (e) {
      /* fallback to area estimate */
    }

    progressFill.style.width = pct + '%';
    progressText.textContent = pct + '% revealed';

    if (pct >= REVEAL_THRESHOLD && !revealed) {
      finishReveal();
    }
  }

  function finishReveal() {
    revealed = true;
    card.classList.add('revealed');
    canvas.style.transition = 'opacity 0.5s ease';
    canvas.style.opacity = '0';
    canvas.style.pointerEvents = 'none';
    progressFill.style.width = '100%';
    progressText.textContent = 'Winner revealed!';
    resetBtn.classList.remove('hidden');
    launchConfetti();
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  }

  function launchConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const colors = ['#B8954A', '#d4b06a', '#ffffff', '#1A2332', '#D4DCE8'];
    particles = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 220,
        y: confettiCanvas.height * 0.38,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * -11 - 3,
        w: Math.random() * 7 + 4,
        h: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10,
        gravity: 0.2
      });
    }

    if (!confettiRunning) {
      confettiRunning = true;
      animateConfetti();
    }
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = 0;

    particles.forEach((p) => {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      if (p.y < confettiCanvas.height + 20) alive++;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rot * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      confettiCtx.restore();
    });

    if (alive > 0) {
      requestAnimationFrame(animateConfetti);
    } else {
      confettiRunning = false;
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function reset() {
    revealed = false;
    isDrawing = false;
    scratchArea = 0;
    card.classList.remove('revealed');
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
    canvas.style.pointerEvents = 'auto';
    hint.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '0% revealed';
    resetBtn.classList.add('hidden');
    resizeCanvas();
  }

  function onStart(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    scratch(pos.x, pos.y);
  }

  function onMove(e) {
    if (!isDrawing || revealed) return;
    e.preventDefault();
    const pos = getPos(e);
    scratch(pos.x, pos.y);
  }

  function onEnd() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('mouseleave', onEnd);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd);

  resetBtn.addEventListener('click', reset);
  window.addEventListener('resize', () => {
    if (!revealed) resizeCanvas();
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(resizeCanvas);
  } else {
    resizeCanvas();
  }
})();
