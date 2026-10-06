import { useEffect, useRef } from "react";

const GENE_SYMBOLS = ["BRCA1", "TP53", "EGFR", "KRAS", "CFTR", "APOE"];
const DNA_COUNT = 3;
const PARTICLE_COUNT = 20;
const LABEL_SLOTS = 2;
const BURST_POOL = 15;
const LINK_DIST = 140;
const DNA_PARTICLE_LINK_POOL = 10;
const COLLIDE_PAD = 1.15;
const DAMPING = 0.988;
const AMBIENT_BLEND = 0.06;

function rand(min, max) { return min + Math.random() * (max - min); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pairIdx(i, j) { return i * DNA_COUNT + j; }

export default function GeneticBackground({ paused = false }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);
  const dnaRef = useRef([]);
  const particlesRef = useRef([]);
  const labelsRef = useRef([]);
  const burstRef = useRef([]);
  const burstCursorRef = useRef(0);
  const pairStateRef = useRef([]);
  const dnaParticleLinksRef = useRef([]);
  const linkCountRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const parallaxRef = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });
  const dragRef = useRef({ index: -1, offX: 0, offY: 0, samples: [] });
  const reducedMotionRef = useRef(false);
  const pausedRef = useRef(paused);
  const isInputFocusedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function handleFocusIn(e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) {
        isInputFocusedRef.current = true;
      }
    }
    function handleFocusOut(e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) {
        isInputFocusedRef.current = false;
      }
    }
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
      const w = wrap.clientWidth, h = wrap.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initEntities() {
      const { w, h } = sizeRef.current;
      const dna = [];
      for (let i = 0; i < DNA_COUNT; i++) {
        const z = rand(0.15, 1);
        const ambientAngle = rand(0, Math.PI * 2);
        const ambientSpeed = rand(0.01, 0.035);
        dna.push({
          x: rand(0, w), y: rand(0, h), z,
          size: rand(14, 30) * (0.5 + z * 0.7),
          rot: rand(0, Math.PI * 2),
          rotSpeed: (Math.random() < 0.5 ? -1 : 1) * rand(0.05, 0.22) * (0.4 + (1 - z) * 0.3),
          baseRotSpeed: 0,
          vx: rand(-0.06, 0.06), vy: rand(-0.05, -0.015),
          ambientVx: Math.cos(ambientAngle) * ambientSpeed,
          ambientVy: Math.sin(ambientAngle) * ambientSpeed,
          hue: Math.random() < 0.5 ? "cyan" : (Math.random() < 0.5 ? "emerald" : "blue"),
          baseHue: null,
          alpha: 0.28 + z * 0.5,
          blur: (1 - z) * 3.2,
          dragging: false,
          mutateUntil: 0, mutateStrength: 0,
          orbitDriveUntil: 0,
        });
        dna[i].baseRotSpeed = dna[i].rotSpeed;
      }
      dnaRef.current = dna;

      const pairState = new Array(DNA_COUNT * DNA_COUNT);
      for (let i = 0; i < DNA_COUNT; i++) {
        for (let j = i + 1; j < DNA_COUNT; j++) {
          pairState[pairIdx(i, j)] = {
            closeSince: 0, cooldownUntil: 0, interactionType: -1, interactionUntil: 0,
            orbitCx: 0, orbitCy: 0, orbitR: 0, orbitA: 0, orbitOmega: 0, burstDone: false,
          };
        }
      }
      pairStateRef.current = pairState;

      const particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: rand(0, w), y: rand(0, h),
          baseVx: rand(-0.045, 0.045), baseVy: rand(-0.07, -0.015),
          swirlVx: 0, swirlVy: 0,
          size: rand(0.8, 2.2), baseAlpha: rand(0.25, 0.75),
          pulsePhase: rand(0, Math.PI * 2), pulseSpeed: rand(0.6, 1.6),
          brightPhase: rand(0, Math.PI * 2), brightSpeed: rand(0.3, 0.9),
        });
      }
      particlesRef.current = particles;

      const burst = [];
      for (let i = 0; i < BURST_POOL; i++) {
        burst.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: "#7ED7C1" });
      }
      burstRef.current = burst;

      const dnaParticleLinks = [];
      for (let i = 0; i < DNA_PARTICLE_LINK_POOL; i++) {
        dnaParticleLinks.push({ x1: 0, y1: 0, z: 0, x2: 0, y2: 0, alpha: 0 });
      }
      dnaParticleLinksRef.current = dnaParticleLinks;

      const labels = [];
      for (let i = 0; i < LABEL_SLOTS; i++) {
        labels.push({ state: "idle", timer: rand(1, 6), x: 0, y: 0, vx: 0, vy: 0, alpha: 0, text: "" });
      }
      labelsRef.current = labels;
    }

    resize();
    initEntities();

    function onResize() { resize(); }
    window.addEventListener("resize", onResize);

    function toLocal(e) {
      const rect = wrap.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
    }

    function hitTestDna(x, y) {
      const dna = dnaRef.current;
      let best = -1, bestDist = Infinity;
      for (let i = 0; i < dna.length; i++) {
        const d = dna[i];
        const dist = Math.hypot(d.x - x, d.y - y);
        const r = d.size * 0.7 + 6;
        if (dist < r && dist < bestDist) { best = i; bestDist = dist; }
      }
      return best;
    }

    function onPointerMove(e) {
      const { x, y, rect } = toLocal(e);
      pointerRef.current.x = x; pointerRef.current.y = y; pointerRef.current.active = true;
      const nx = (x / rect.width) * 2 - 1, ny = (y / rect.height) * 2 - 1;
      parallaxRef.current.tx = clamp(nx, -1, 1); parallaxRef.current.ty = clamp(ny, -1, 1);

      const drag = dragRef.current;
      if (drag.index !== -1) {
        const d = dnaRef.current[drag.index];
        d.x = x - drag.offX; d.y = y - drag.offY;
        const samples = drag.samples;
        samples.push({ x: d.x, y: d.y, t: performance.now() });
        if (samples.length > 5) samples.shift();
      }
    }
    function onPointerLeave() {
      pointerRef.current.active = false;
      pointerRef.current.x = -9999; pointerRef.current.y = -9999;
    }
    function onPointerDown(e) {
      const { x, y } = toLocal(e);
      const idx = hitTestDna(x, y);
      if (idx === -1) return;
      const d = dnaRef.current[idx];
      d.dragging = true; d.orbitDriveUntil = 0;
      dragRef.current.index = idx;
      dragRef.current.offX = x - d.x; dragRef.current.offY = y - d.y;
      dragRef.current.samples = [{ x: d.x, y: d.y, t: performance.now() }];
      wrap.setPointerCapture?.(e.pointerId);
      canvas.classList.add("dragging");
    }
    function onPointerUp() {
      const drag = dragRef.current;
      if (drag.index === -1) return;
      const d = dnaRef.current[drag.index];
      d.dragging = false;
      const samples = drag.samples;
      if (samples.length >= 2) {
        const a = samples[0], b = samples[samples.length - 1];
        const dt = Math.max(1, b.t - a.t);
        d.vx = clamp(((b.x - a.x) / dt) * 16, -3.2, 3.2);
        d.vy = clamp(((b.y - a.y) / dt) * 16, -3.2, 3.2);
      }
      drag.index = -1;
      canvas.classList.remove("dragging");
    }

    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    let visible = !document.hidden;
    function onVisibility() {
      visible = !document.hidden;
      if (visible && !reducedMotionRef.current) { last = performance.now(); rafRef.current = requestAnimationFrame(loop); }
      else if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }
    document.addEventListener("visibilitychange", onVisibility);

    function spawnBurst(x, y, hue) {
      const pool = burstRef.current;
      const n = 8;
      for (let k = 0; k < n; k++) {
        const b = pool[burstCursorRef.current];
        burstCursorRef.current = (burstCursorRef.current + 1) % pool.length;
        const a = rand(0, Math.PI * 2), spd = rand(0.4, 1.4);
        b.active = true; b.x = x; b.y = y;
        b.vx = Math.cos(a) * spd; b.vy = Math.sin(a) * spd;
        b.life = 0; b.maxLife = rand(0.5, 0.9); b.size = rand(1, 2.4); b.hue = hue;
      }
    }

    const HUE_COLORS = { cyan: "#1FA5B5", emerald: "#3ADF9B", blue: "#3A7BD5" };

    function drawHelix(size, hue, phaseRot, mutateStrength) {
      const stroke = HUE_COLORS[hue] || HUE_COLORS.cyan;
      const wobble = 1 + mutateStrength * 0.25 * Math.sin(performance.now() * 0.02);
      ctx.save();
      ctx.rotate(phaseRot);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(0.7, size * 0.05);
      ctx.beginPath();
      for (let t = -size; t <= size; t += 4) {
        const xx = Math.sin((t / size) * Math.PI * 2) * size * 0.32 * wobble;
        if (t === -size) ctx.moveTo(xx, t); else ctx.lineTo(xx, t);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let t = -size; t <= size; t += 4) {
        const xx = -Math.sin((t / size) * Math.PI * 2) * size * 0.32 * wobble;
        if (t === -size) ctx.moveTo(xx, t); else ctx.lineTo(xx, t);
      }
      ctx.stroke();
      ctx.globalAlpha *= 0.55;
      for (let t = -size; t <= size; t += size / 4) {
        const xx = Math.sin((t / size) * Math.PI * 2) * size * 0.32 * wobble;
        ctx.beginPath(); ctx.moveTo(-xx, t); ctx.lineTo(xx, t); ctx.stroke();
      }
      ctx.restore();
    }

    let last = performance.now();

    function beginInteraction(a, b, ps, now) {
      const type = Math.floor(Math.random() * 7);
      ps.interactionType = type;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;

      if (type === 1 || type === 6) {
        const duration = type === 1 ? rand(1.3, 2.2) : rand(2.4, 3.2);
        ps.interactionUntil = now + duration * 1000;
        ps.orbitCx = cx; ps.orbitCy = cy; ps.orbitR = dist / 2;
        ps.orbitA = Math.atan2(a.y - cy, a.x - cx);
        ps.orbitOmega = (Math.random() < 0.5 ? -1 : 1) * rand(1.6, 2.6);
        a.orbitDriveUntil = ps.interactionUntil; b.orbitDriveUntil = ps.interactionUntil;
      } else if (type === 2) {
        ps.interactionUntil = now + rand(900, 1400);
        if (a.baseHue == null) a.baseHue = a.hue;
        if (b.baseHue == null) b.baseHue = b.hue;
        const tmp = a.hue; a.hue = b.baseHue; b.hue = tmp;
      } else if (type === 3) {
        ps.interactionUntil = now + 300;
        spawnBurst(cx, cy, HUE_COLORS[a.hue] || "#7ED7C1");
      } else if (type === 4) {
        const duration = rand(1.2, 2);
        ps.interactionUntil = now + duration * 1000;
        a.mutateUntil = ps.interactionUntil; b.mutateUntil = ps.interactionUntil;
      } else if (type === 5) {
        ps.interactionUntil = now + rand(1000, 1600);
      } else {
        ps.interactionUntil = now + 400;
      }
      ps.cooldownUntil = now + 3500;
    }

    function step(dt, now) {
      const { w, h } = sizeRef.current;
      const px = parallaxRef.current;
      px.x += (px.tx - px.x) * 0.04; px.y += (px.ty - px.y) * 0.04;
      const pointer = pointerRef.current;
      const dragging = dragRef.current.index !== -1;

      const dna = dnaRef.current;

      for (let i = 0; i < dna.length; i++) {
        const d = dna[i];
        if (d.dragging) continue;

        if (now < d.orbitDriveUntil) {
        } else {
          if (pointer.active) {
            const dx = pointer.x - d.x, dy = pointer.y - d.y;
            const dist = Math.hypot(dx, dy);
            const radius = dragging ? 260 : 170;
            if (dist < radius && dist > 1) {
              const strength = (1 - dist / radius) * (dragging ? 0.010 : 0.004);
              d.vx += (dx / dist) * strength; d.vy += (dy / dist) * strength;
            }
          }

          d.vx *= DAMPING; d.vy *= DAMPING;
          d.vx += (d.ambientVx - d.vx) * AMBIENT_BLEND;
          d.vy += (d.ambientVy - d.vy) * AMBIENT_BLEND;

          d.x += d.vx * dt * 16; d.y += d.vy * dt * 16;

          const r = d.size * 0.6;
          if (d.x < r) { d.x = r; d.vx = Math.abs(d.vx) * 0.55; }
          if (d.x > w - r) { d.x = w - r; d.vx = -Math.abs(d.vx) * 0.55; }
          if (d.y < r) { d.y = r; d.vy = Math.abs(d.vy) * 0.55; }
          if (d.y > h - r) { d.y = h - r; d.vy = -Math.abs(d.vy) * 0.55; }
        }

        d.rot += d.rotSpeed * dt;

        if (d.mutateUntil > 0) {
          if (now < d.mutateUntil) {
            d.mutateStrength += (1 - d.mutateStrength) * 0.15;
            d.rotSpeed = d.baseRotSpeed * 2.4;
          } else {
            d.mutateStrength += (0 - d.mutateStrength) * 0.08;
            d.rotSpeed += (d.baseRotSpeed - d.rotSpeed) * 0.08;
            if (d.mutateStrength < 0.02) { d.mutateUntil = 0; d.mutateStrength = 0; d.rotSpeed = d.baseRotSpeed; }
          }
        }
      }

      const ps = pairStateRef.current;
      for (let i = 0; i < dna.length; i++) {
        const a = dna[i];
        for (let j = i + 1; j < dna.length; j++) {
          const b = dna[j];
          const s = ps[pairIdx(i, j)];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const minDist = (a.size + b.size) * COLLIDE_PAD;
          const close = dist < LINK_DIST;

          if (s.interactionType !== -1 && now > s.interactionUntil) {
            if (s.interactionType === 2 && now - s.interactionUntil < 50) {
              a.hue = a.baseHue ?? a.hue; b.hue = b.baseHue ?? b.hue;
              a.baseHue = null; b.baseHue = null;
            }
            if (s.interactionType === 1 || s.interactionType === 6) {
              const kick = s.interactionType === 6 ? 0.9 : 0.5;
              const ang = s.orbitA;
              a.vx = -Math.cos(ang) * kick; a.vy = -Math.sin(ang) * kick;
              b.vx = Math.cos(ang) * kick; b.vy = Math.sin(ang) * kick;
              a.orbitDriveUntil = 0; b.orbitDriveUntil = 0;
            }
            s.interactionType = -1;
          }

          if (s.interactionType === 1 || s.interactionType === 6) {
            s.orbitA += s.orbitOmega * dt;
            a.x = s.orbitCx + Math.cos(s.orbitA) * s.orbitR;
            a.y = s.orbitCy + Math.sin(s.orbitA) * s.orbitR;
            b.x = s.orbitCx - Math.cos(s.orbitA) * s.orbitR;
            b.y = s.orbitCy - Math.sin(s.orbitA) * s.orbitR;
          }

          if (dist < minDist && s.interactionType === -1) {
            if (now > s.cooldownUntil) {
              beginInteraction(a, b, s, now);
            } else if (!a.dragging && !b.dragging) {
              const nx = dx / dist, ny = dy / dist;
              const push = (minDist - dist) * 0.02;
              a.vx -= nx * push; a.vy -= ny * push;
              b.vx += nx * push; b.vy += ny * push;
            }
          }

          if (close) { if (s.closeSince === 0) s.closeSince = now; }
          else { s.closeSince = 0; }
        }
      }

      for (let i = 0; i < dna.length; i++) {
        dna[i].vx = clamp(dna[i].vx, -3.5, 3.5);
        dna[i].vy = clamp(dna[i].vy, -3.5, 3.5);
      }

      const particles = particlesRef.current;
      const links = dnaParticleLinksRef.current;
      let linkCount = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.swirlVx *= 0.94; p.swirlVy *= 0.94;

        for (let k = 0; k < dna.length; k++) {
          const d = dna[k];
          const dx = p.x - d.x, dy = p.y - d.y;
          const dist = Math.hypot(dx, dy);

          const linkRadius = d.size * 3.4;
          if (dist < linkRadius && dist > 1 && linkCount < links.length) {
            const t = 1 - dist / linkRadius;
            if (t > 0.1) {
              const slot = links[linkCount++];
              slot.x1 = d.x; slot.y1 = d.y; slot.z = d.z;
              slot.x2 = p.x; slot.y2 = p.y;
              slot.alpha = t;
            }
          }

          const active = d.dragging || now < d.orbitDriveUntil || Math.hypot(d.vx, d.vy) > 0.4;
          if (!active) continue;
          const radius = d.size * 4.5;
          if (dist < radius && dist > 1) {
            const falloff = 1 - dist / radius;
            const tx = -dy / dist, ty = dx / dist;
            p.swirlVx += (tx * 0.9 + (dx / dist) * 0.15) * falloff * 0.06;
            p.swirlVy += (ty * 0.9 + (dy / dist) * 0.15) * falloff * 0.06;
          }
        }

        if (pointer.active) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          const radius = dragging ? 130 : 80;
          if (dist < radius && dist > 1) {
            const falloff = 1 - dist / radius;
            p.swirlVx += (dx / dist) * falloff * (dragging ? 0.09 : 0.05);
            p.swirlVy += (dy / dist) * falloff * (dragging ? 0.09 : 0.05);
          }
        }

        p.x += (p.baseVx + p.swirlVx) * dt * 16;
        p.y += (p.baseVy + p.swirlVy) * dt * 16;
        p.pulsePhase += p.pulseSpeed * dt;
        p.brightPhase += p.brightSpeed * dt;
        if (p.x < -4) p.x = w + 4; if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4; if (p.y > h + 4) p.y = -4;
      }
      linkCountRef.current = linkCount;

      const burst = burstRef.current;
      for (let i = 0; i < burst.length; i++) {
        const b = burst[i];
        if (!b.active) continue;
        b.life += dt;
        if (b.life > b.maxLife) { b.active = false; continue; }
        b.x += b.vx * dt * 16; b.y += b.vy * dt * 16;
        b.vx *= 0.96; b.vy *= 0.96;
      }

      const dragIdx = dragRef.current.index;
      const labels = labelsRef.current;
      for (let i = 0; i < labels.length; i++) {
        const l = labels[i];
        l.timer -= dt;
        if (l.state === "idle" && l.timer <= 0) {
          l.state = "in"; l.timer = 1.2;
          l.text = GENE_SYMBOLS[Math.floor(Math.random() * GENE_SYMBOLS.length)];
          l.x = rand(w * 0.08, w * 0.55); l.y = rand(h * 0.15, h * 0.85);
          l.vx = rand(-0.01, 0.01); l.vy = 0; l.alpha = 0;
        } else if (l.state === "in") {
          l.alpha = clamp(l.alpha + dt * 0.8, 0, 1);
          if (l.timer <= 0) { l.state = "hold"; l.timer = rand(2, 3.5); }
        } else if (l.state === "hold") {
          if (l.timer <= 0) { l.state = "out"; l.timer = 1.2; }
        } else if (l.state === "out") {
          l.alpha = clamp(l.alpha - dt * 0.7, 0, 1);
          if (l.timer <= 0) { l.state = "idle"; l.timer = rand(2, 7); }
        }

        if (dragIdx !== -1) {
          const d = dna[dragIdx];
          const dx = d.x - l.x, dy = d.y - l.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 200 && dist > 1) {
            l.vx += (dx / dist) * 0.0025;
            l.vy += (dy / dist) * 0.0025;
          }
        }
        l.vx *= 0.95; l.vy *= 0.95;
        l.x += l.vx * dt * 16; l.y += l.vy * dt * 16;
      }
    }

    function render() {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      const px = parallaxRef.current;
      const dna = dnaRef.current;
      const ps = pairStateRef.current;

      for (let i = 0; i < dna.length; i++) {
        for (let j = i + 1; j < dna.length; j++) {
          const a = dna[i], b = dna[j];
          const s = ps[pairIdx(i, j)];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const activeLink = s.interactionType !== -1;
          if (dist < LINK_DIST || activeLink) {
            const t = activeLink ? 1 : 1 - dist / LINK_DIST;
            ctx.strokeStyle = activeLink ? `rgba(126,215,193,${0.55 * t})` : `rgba(31,165,181,${0.16 * t})`;
            ctx.lineWidth = activeLink ? 1.5 : 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x + px.x * 10 * a.z, a.y + px.y * 10 * a.z);
            ctx.lineTo(b.x + px.x * 10 * b.z, b.y + px.y * 10 * b.z);
            ctx.stroke();
          }
        }
      }

      const linkCount = linkCountRef.current;
      const dnaParticleLinks = dnaParticleLinksRef.current;
      for (let i = 0; i < linkCount; i++) {
        const l = dnaParticleLinks[i];
        ctx.strokeStyle = `rgba(126,215,193,${0.22 * l.alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(l.x1 + px.x * 10 * l.z, l.y1 + px.y * 10 * l.z);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = "rgba(126,215,193,0.55)";
      const ox = px.x * 4, oy = px.y * 4;
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        const pulse = 0.5 + Math.sin(p.pulsePhase) * 0.5;
        const r = p.size * (0.8 + pulse * 0.5);
        ctx.moveTo(p.x + ox + r, p.y + oy);
        ctx.arc(p.x + ox, p.y + oy, r, 0, Math.PI * 2);
      }
      ctx.fill();

      for (let i = 0; i < burstRef.current.length; i++) {
        const b = burstRef.current[i];
        if (!b.active) continue;
        const t = 1 - b.life / b.maxLife;
        ctx.beginPath();
        ctx.fillStyle = b.hue.startsWith("#") ? hexToRgba(b.hue, t * 0.9) : `rgba(126,215,193,${t * 0.9})`;
        ctx.arc(b.x, b.y, b.size * t, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < dna.length; i++) {
        const d = dna[i];
        const ox = px.x * 27 * d.z, oy = px.y * 27 * d.z;
        ctx.save();
        ctx.globalAlpha = (d.dragging ? Math.min(1, d.alpha + 0.25) : d.alpha) * (0.65 + d.z * 0.35);
        ctx.translate(d.x + (d.dragging ? 0 : ox), d.y + (d.dragging ? 0 : oy));
        drawHelix(d.size, d.hue, d.rot, d.mutateStrength);
        ctx.restore();
      }

      ctx.font = "600 11px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < labelsRef.current.length; i++) {
        const l = labelsRef.current[i];
        if (l.alpha <= 0.01) continue;
        ctx.fillStyle = `rgba(126,215,193,${l.alpha * 0.85})`;
        ctx.fillText(l.text, l.x, l.y);
      }
    }

    function hexToRgba(hex, a) {
      const v = parseInt(hex.slice(1), 16);
      const r = (v >> 16) & 255, g = (v >> 8) & 255, bch = v & 255;
      return `rgba(${r},${g},${bch},${a})`;
    }

    function loop(now) {
      if (pausedRef.current || isInputFocusedRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const elapsed = now - last;
      if (elapsed < 50) { // ~20 FPS throttle
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      last = now;
      step(dt, now);
      render();
      rafRef.current = requestAnimationFrame(loop);
    }

    if (reducedMotionRef.current) { step(0.001, performance.now()); render(); }
    else { rafRef.current = requestAnimationFrame(loop); }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="ga-auth-canvaswrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="ga-auth-canvas" />
    </div>
  );
}

