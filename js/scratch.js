(function () {
  const WINNER = 'DARAAB';
  const REVEAL_THRESHOLD = 45;
  const BRUSH_SIZE = 42;

  const canvas = document.getElementById('scratchCanvas');
  const ctx = canvas.getContext('2d');
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

  document.getElementById('winnerName').textContent = WINNER;

  function resizeCanvas() {
    const rect = zone.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScratchLayer(rect.width, rect.height);
  }

  function drawScratchLayer(w, h) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d4b84a');
    grad.addColorStop(0.3, '#c9a227');
    grad.addColorStop(0.6, '#a8841a');
    grad.addColorStop(1, '#e8c84a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold 14px Montserrat, sans-serif';
    ctx.fillStyle = 'rgba(10, 22, 40, 0.25)';
    ctx.textAlign = 'center';
    const stepX = 90;
    const stepY = 50;
    for (let y = 30; y < h; y += stepY) {
      for (let x = 45; x < w; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.3);
        ctx.fillText('INCH & BRICK', 0, 0);
        ctx.restore();
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 6) * i);
      ctx.lineTo(w, (h / 6) * i + 20);
      ctx.stroke();
    }
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  function scratch(x, y) {
    if (revealed) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH_SIZE;

    ctx.beginPath();
    if (isDrawing) {
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    lastX = x;
    lastY = y;

    hint.classList.add('hidden');
    updateProgress();
  }

  let progressTimer = null;

  function updateProgress() {
    if (progressTimer) return;
    progressTimer = setTimeout(() => {
      progressTimer = null;
      measureProgress();
    }, 80);
  }

  function measureProgress() {
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    const total = w * h;
    const step = 4;

    for (let i = 3; i < data.length; i += step * 8) {
      if (data[i] === 0) transparent++;
    }

    const sampled = Math.floor(total / 8);
    const pct = Math.min(100, Math.round((transparent / sampled) * 100));
    progressFill.style.width = pct + '%';
    progressText.textContent = pct + '% revealed';

    if (pct >= REVEAL_THRESHOLD && !revealed) {
      finishReveal();
    }
  }

  function finishReveal() {
    revealed = true;
    card.classList.add('revealed');
    canvas.style.transition = 'opacity 0.6s ease';
    canvas.style.opacity = '0';
    progressFill.style.width = '100%';
    progressText.textContent = 'Winner revealed!';
    resetBtn.classList.remove('hidden');
    launchConfetti();
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  }

  function launchConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const colors = ['#c9a227', '#e8c84a', '#ffffff', '#1a3568', '#f5e6a8'];
    particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
        y: confettiCanvas.height * 0.4,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -12 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 12,
        gravity: 0.18 + Math.random() * 0.1
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

    particles.forEach(p => {
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
    card.classList.remove('revealed');
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
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

  resizeCanvas();
})();
