(function () {
  const WINNER = 'DARAAB';
  const REVEAL_THRESHOLD = 60;
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
  const flashOverlay = document.getElementById('flashOverlay');
  const sparkleRing = document.getElementById('sparkleRing');

  let isDrawing = false;
  let revealed = false;
  let lastX = 0;
  let lastY = 0;
  let particles = [];
  let confettiRunning = false;
  let scratchArea = 0;
  let totalArea = 1;
  let progressTimer = null;
  let audioCtx = null;

  const CONFETTI_COLORS = ['#B8954A', '#d4b06a', '#ffffff', '#1A2332', '#D4DCE8'];
  const SILVER_COLORS = ['#ffffff', '#e8e8f5', '#c0c0d8', '#d4d4e8', '#f5f5ff', '#a8a8c0'];

  document.getElementById('winnerName').textContent = WINNER;
  buildSparkleRing();

  function buildSparkleRing() {
    sparkleRing.innerHTML = '';
    const stars = ['✦', '✧', '★', '·'];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('span');
      const isStar = i % 3 === 0;
      el.className = isStar ? 'spark star' : 'spark';
      if (isStar) el.textContent = stars[i % stars.length];
      const angle = (i / 24) * Math.PI * 2;
      const radius = 38 + (i % 5) * 8;
      el.style.left = (50 + Math.cos(angle) * radius) + '%';
      el.style.top = (50 + Math.sin(angle) * radius * 0.7) + '%';
      el.style.animationDelay = (i * 0.08) + 's';
      sparkleRing.appendChild(el);
    }
  }

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPopperSound() {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    const pop = audioCtx.createOscillator();
    const popGain = audioCtx.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(180, now);
    pop.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    popGain.gain.setValueAtTime(0.5, now);
    popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    pop.connect(popGain);
    popGain.connect(audioCtx.destination);
    pop.start(now);
    pop.stop(now + 0.15);

    const noise = audioCtx.createBufferSource();
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.2);

    [523, 659, 784, 1047].forEach((freq, i) => {
      const chime = audioCtx.createOscillator();
      const chimeGain = audioCtx.createGain();
      chime.type = 'triangle';
      chime.frequency.value = freq;
      const t = now + 0.05 + i * 0.07;
      chimeGain.gain.setValueAtTime(0, t);
      chimeGain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      chime.connect(chimeGain);
      chimeGain.connect(audioCtx.destination);
      chime.start(t);
      chime.stop(t + 0.35);
    });
  }

  function flashScreen() {
    flashOverlay.classList.add('active');
    setTimeout(() => flashOverlay.classList.remove('active'), 200);
  }

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
      scratchArea += Math.hypot(x2 - x, y2 - y) * BRUSH_SIZE;
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

      for (let i = 3; i < data.length; i += 16) {
        samples++;
        if (data[i] < 128) cleared++;
      }

      pct = Math.max(pct, Math.round((cleared / samples) * 100));
    } catch (e) {
      /* area estimate fallback */
    }

    progressFill.style.width = pct + '%';
    progressText.textContent = pct + '% revealed';

    if (pct >= REVEAL_THRESHOLD && !revealed) {
      finishReveal();
    }
  }

  function getBurstOrigin() {
    const zoneRect = zone.getBoundingClientRect();
    return {
      x: zoneRect.left + zoneRect.width / 2,
      y: zoneRect.top + zoneRect.height / 2
    };
  }

  function createPopperBurst(ox, oy) {
    particles = [];

    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 6;
      particles.push({
        type: 'confetti',
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 6,
        w: Math.random() * 9 + 4,
        h: Math.random() * 6 + 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 14,
        gravity: 0.22 + Math.random() * 0.08,
        life: 1,
        drag: 0.985
      });
    }

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 16 + 8;
      particles.push({
        type: 'silver',
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 8,
        size: Math.random() * 4 + 2,
        color: SILVER_COLORS[Math.floor(Math.random() * SILVER_COLORS.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        gravity: 0.12,
        life: 1,
        twinkle: Math.random() * Math.PI * 2,
        drag: 0.98
      });
    }

    for (let i = 0; i < 40; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = Math.random() * 18 + 10;
      particles.push({
        type: 'streamer',
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: Math.random() * 4 + 2,
        h: Math.random() * 22 + 12,
        color: Math.random() > 0.5 ? '#B8954A' : SILVER_COLORS[i % SILVER_COLORS.length],
        rot: (angle * 180) / Math.PI + 90,
        rotV: (Math.random() - 0.5) * 4,
        gravity: 0.28,
        life: 1,
        drag: 0.99
      });
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

    flashScreen();
    playPopperSound();
    launchPopper();

    resetBtn.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 150]);
  }

  function launchPopper() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const origin = getBurstOrigin();
    createPopperBurst(origin.x, origin.y);

    if (!confettiRunning) {
      confettiRunning = true;
      animateParticles();
    }
  }

  function drawStar(cx, cy, size, color, alpha) {
    confettiCtx.save();
    confettiCtx.translate(cx, cy);
    confettiCtx.fillStyle = color;
    confettiCtx.globalAlpha = alpha;
    confettiCtx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      confettiCtx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      confettiCtx.lineTo(Math.cos(a + 0.4) * size * 0.25, Math.sin(a + 0.4) * size * 0.25);
    }
    confettiCtx.closePath();
    confettiCtx.fill();
    confettiCtx.restore();
  }

  function animateParticles() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = 0;

    particles.forEach((p) => {
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.life -= 0.004;

      if (p.y < confettiCanvas.height + 40 && p.life > 0) alive++;

      confettiCtx.save();

      if (p.type === 'silver') {
        const twinkle = 0.5 + Math.sin(p.twinkle + Date.now() * 0.02) * 0.5;
        confettiCtx.globalAlpha = p.life * twinkle;
        confettiCtx.fillStyle = p.color;
        confettiCtx.shadowColor = '#ffffff';
        confettiCtx.shadowBlur = 10;
        confettiCtx.beginPath();
        confettiCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        confettiCtx.fill();
        if (Math.random() > 0.7) {
          drawStar(p.x, p.y, p.size * 1.8, '#ffffff', p.life * 0.8);
        }
      } else if (p.type === 'streamer') {
        confettiCtx.globalAlpha = p.life;
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rot * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        confettiCtx.globalAlpha = p.life;
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rot * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      confettiCtx.restore();
    });

    if (alive > 0) {
      requestAnimationFrame(animateParticles);
    } else {
      confettiRunning = false;
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function reset() {
    revealed = false;
    isDrawing = false;
    scratchArea = 0;
    particles = [];
    confettiRunning = false;
    card.classList.remove('revealed');
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
    canvas.style.pointerEvents = 'auto';
    hint.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = '0% revealed';
    resetBtn.classList.add('hidden');
    flashOverlay.classList.remove('active');
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    resizeCanvas();
  }

  function onStart(e) {
    e.preventDefault();
    initAudio();
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
