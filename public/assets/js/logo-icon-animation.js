import { ensureSplashP5 } from "./p5-loader.js";

export async function mountSplashLogoIconAnimation({
  splashLogo,
  getBannerLogoAnimationMode,
  currentInstance,
  currentCanvasHost
}) {
  if (!splashLogo) {
    return {
      splashLogoIconP5: currentInstance,
      splashLogoIconCanvasHost: currentCanvasHost
    };
  }

  const bannerMode = getBannerLogoAnimationMode();
  if (bannerMode === "off") {
    return {
      splashLogoIconP5: currentInstance,
      splashLogoIconCanvasHost: currentCanvasHost
    };
  }

  await ensureSplashP5();
  if (!window.p5) {
    return {
      splashLogoIconP5: currentInstance,
      splashLogoIconCanvasHost: currentCanvasHost
    };
  }

  const combo = splashLogo.querySelector(".brand-logo-combo");
  if (!combo) {
    return {
      splashLogoIconP5: currentInstance,
      splashLogoIconCanvasHost: currentCanvasHost
    };
  }

  let canvasHost = combo.querySelector(".brand-logo-canvas--icon");
  if (!canvasHost) {
    const iconStack = combo.querySelector(".brand-logo-icon-stack");
    if (!iconStack) {
      return {
        splashLogoIconP5: currentInstance,
        splashLogoIconCanvasHost: currentCanvasHost
      };
    }

    const iconLogo = iconStack.querySelector(".brand-logo-icon-image");
    const rect = iconStack.getBoundingClientRect();
    const ratioFromRect = (rect.width > 1 && rect.height > 1) ? (rect.width / rect.height) : 0;
    const ratioFromImage = (iconLogo?.naturalWidth > 1 && iconLogo?.naturalHeight > 1)
      ? (iconLogo.naturalWidth / iconLogo.naturalHeight)
      : 0;
    const ratio = Math.max(0.6, Math.min(1.8, ratioFromRect || ratioFromImage || 1));
    canvasHost = document.createElement("span");
    canvasHost.className = "brand-logo-canvas brand-logo-canvas--icon";
    canvasHost.setAttribute("aria-hidden", "true");
    canvasHost.style.setProperty("--brand-logo-ratio", String(ratio));
    iconStack.replaceWith(canvasHost);
  }

  if (currentInstance && currentCanvasHost === canvasHost) {
    return {
      splashLogoIconP5: currentInstance,
      splashLogoIconCanvasHost: currentCanvasHost
    };
  }

  if (currentInstance) currentInstance.remove();

  const readThemeInk = () => {
    const raw = getComputedStyle(document.body).color || "";
    const match = raw.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (!match) return [255, 255, 255];
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };

  const splashLogoIconP5 = new window.p5((p) => {
    let cw = 0;
    let ch = 0;
    let frame = 0;
    let startAtMs = 0;
    let plotFreq = 1.2;
    let plotPhase = 0;
    let plotAmp = 0.75;
    let plotFamily = 0;
    const ghostFrames = [];
    const radarBlips = [];
    const radarEchoes = [];
    const cycleFrames = 380;
    const ringCount = 10;
    const ringDelay = 28;
    let radarSweepAngle = 0;
    let radarSweepSpeed = 0.025;
    let radarNextBlipAt = 0;
    let radarRotationDirection = 1;

    const reseedPlot = () => {
      plotFreq = p.random(0.6, 2.4);
      plotPhase = p.random(0, p.TWO_PI);
      plotAmp = p.random(0.45, 1.15);
      plotFamily = Math.floor(p.random(0, 5));
      ghostFrames.length = 0;
    };

    const reseedMiniRadar = () => {
      radarBlips.length = 0;
      radarEchoes.length = 0;
      radarSweepAngle = p.random(Math.PI * 2);
      radarRotationDirection = p.random() < 0.5 ? -1 : 1;
      radarSweepSpeed = p.random(0.02, 0.032) * radarRotationDirection;
      radarNextBlipAt = p.millis() + p.random(120, 260);
      const initialCount = Math.floor(p.random(4, 8));
      for (let i = 0; i < initialCount; i += 1) {
        radarBlips.push({
          angle: p.random(Math.PI * 2),
          radiusRatio: p.random(0.18, 0.94),
          size: p.random(2.2, 5.6),
          alpha: p.random(88, 180),
          pulse: p.random(Math.PI * 2),
          drift: p.random(-0.005, 0.005),
          radialDrift: p.random(-0.0018, 0.0018)
        });
      }
    };

    const evalMiniPlot = (xNorm, t) => {
      if (plotFamily === 0) return plotAmp * Math.sin((plotFreq * Math.PI * xNorm) + plotPhase + (t * 0.7));
      if (plotFamily === 1) return plotAmp * Math.exp(-0.7 * Math.abs(xNorm)) * Math.sin((plotFreq * Math.PI * xNorm) + (xNorm * xNorm * 2.1) + plotPhase + (t * 0.6));
      if (plotFamily === 2) return plotAmp * Math.tanh(2.1 * xNorm) * Math.sin((plotFreq * Math.PI * xNorm) + plotPhase + (t * 0.85));
      if (plotFamily === 3) return plotAmp * ((2 / (1 + Math.exp(-2.3 * xNorm))) - 1) + (0.35 * Math.sin((plotFreq * 2 * Math.PI * xNorm) + plotPhase + (t * 0.5)));
      return plotAmp * (Math.sin((plotFreq * Math.PI * xNorm) + plotPhase + (t * 0.55)) + (0.45 * Math.cos((plotFreq * 1.7 * Math.PI * xNorm) - (t * 0.35)))) / (1 + (0.8 * xNorm * xNorm));
    };

    p.setup = () => {
      cw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
      ch = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
      const canvas = p.createCanvas(cw, ch);
      canvas.parent(canvasHost);
      startAtMs = p.millis();
      reseedPlot();
      reseedMiniRadar();
      p.clear();
    };

    p.draw = () => {
      frame += 1;
      const nw = Math.max(2, Math.floor(canvasHost.clientWidth || 1));
      const nh = Math.max(2, Math.floor(canvasHost.clientHeight || 1));
      if (nw !== cw || nh !== ch) {
        cw = nw;
        ch = nh;
        p.resizeCanvas(cw, ch);
      }

      p.clear();
      p.blendMode(p.BLEND);
      p.noFill();
      const ink = readThemeInk();

      if (bannerMode === "radar") {
        const now = p.millis();
        const cx = cw * 0.5;
        const cy = ch * 0.5;
        const radius = Math.max(8, Math.min(cw, ch) * 0.42);

        p.background(3, 14, 10, 230);

        p.noStroke();
        p.fill(6, 40, 26, 80);
        p.circle(cx, cy, radius * 2.18);
        p.fill(0, 0, 0, 104);
        p.circle(cx, cy, radius * 1.92);

        p.stroke(184, 40, 40, 82);
        p.strokeWeight(0.8);
        for (let ring = 0.25; ring <= 1; ring += 0.25) {
          p.noFill();
          p.circle(cx, cy, radius * 2 * ring);
        }
        p.line(cx - radius, cy, cx + radius, cy);
        p.line(cx, cy - radius, cx, cy + radius);
        p.line(cx - radius * 0.7, cy - radius * 0.7, cx + radius * 0.7, cy + radius * 0.7);
        p.line(cx + radius * 0.7, cy - radius * 0.7, cx - radius * 0.7, cy + radius * 0.7);

        p.noFill();
        p.stroke(242, 54, 54, 128);
        p.strokeWeight(1.5);
        p.circle(cx, cy, radius * 2);

        radarSweepAngle += radarSweepSpeed;

        p.noStroke();
        for (let i = 10; i >= 0; i -= 1) {
          const tailAngle = radarSweepAngle - (i * 0.1 * radarRotationDirection);
          const alpha = 8 + i * 7;
          p.fill(255, 58, 58, alpha);
          p.arc(cx, cy, radius * 2, radius * 2, tailAngle - 0.06, tailAngle + 0.06, p.PIE);
        }

        p.stroke(255, 84, 84, 214);
        p.strokeWeight(1.7);
        p.line(cx, cy, cx + Math.cos(radarSweepAngle) * radius, cy + Math.sin(radarSweepAngle) * radius);

        if (now >= radarNextBlipAt && radarBlips.length < 10) {
          radarBlips.push({
            angle: p.random(Math.PI * 2),
            radiusRatio: p.random(0.1, 0.96),
            size: p.random(2.2, 5.4),
            alpha: p.random(96, 190),
            pulse: p.random(Math.PI * 2),
            drift: p.random(-0.005, 0.005),
            radialDrift: p.random(-0.0018, 0.0018)
          });
          radarNextBlipAt = now + p.random(180, 520);
        }

        for (let i = radarEchoes.length - 1; i >= 0; i -= 1) {
          const echo = radarEchoes[i];
          echo.life *= 0.93;
          echo.size *= 1.028;
          if (echo.life < 10) {
            radarEchoes.splice(i, 1);
            continue;
          }
          p.noFill();
          p.stroke(255, 118, 118, echo.life);
          p.strokeWeight(1);
          p.circle(echo.x, echo.y, echo.size);
        }

        for (let i = radarBlips.length - 1; i >= 0; i -= 1) {
          const blip = radarBlips[i];
          blip.angle += blip.drift;
          blip.radiusRatio = p.constrain(blip.radiusRatio + blip.radialDrift, 0.06, 0.97);
          blip.pulse += 0.08;
          const x = cx + Math.cos(blip.angle) * radius * blip.radiusRatio;
          const y = cy + Math.sin(blip.angle) * radius * blip.radiusRatio;
          const delta = Math.atan2(Math.sin(radarSweepAngle - blip.angle), Math.cos(radarSweepAngle - blip.angle));
          const nearSweep = Math.abs(delta) < 0.12;
          if (nearSweep && (!blip.lastSweepAt || now - blip.lastSweepAt > 180)) {
            radarEchoes.push({ x, y, size: blip.size * 1.9, life: 150 });
            blip.lastSweepAt = now;
          }
          if (p.random() < 0.0026 && radarBlips.length > 5) {
            radarBlips.splice(i, 1);
            continue;
          }
          const glow = 0.72 + 0.28 * Math.sin(blip.pulse);
          p.noStroke();
          p.fill(255, 72, 72, blip.alpha * glow * (nearSweep ? 1.5 : 0.72));
          p.circle(x, y, blip.size * (nearSweep ? 1.38 : 1));
        }
        return;
      }

      if (bannerMode === "plot") {
        if ((p.millis() - startAtMs) > 9200) {
          startAtMs = p.millis();
          reseedPlot();
        }

        const centerX = cw * 0.5;
        const centerY = ch * 0.5;
        p.stroke(ink[0], ink[1], ink[2], 64);
        p.strokeWeight(1);
        p.line(0, centerY, cw, centerY);
        p.line(centerX, 0, centerX, ch);

        for (let i = ghostFrames.length - 1; i >= 0; i -= 1) {
          const ghost = ghostFrames[i];
          ghost.alpha -= 6.4;
          if (ghost.alpha <= 2) ghostFrames.splice(i, 1);
        }

        for (const ghost of ghostFrames) {
          if (!ghost.points?.length) continue;
          p.noFill();
          p.stroke(ink[0], ink[1], ink[2], ghost.alpha);
          p.strokeWeight(1.05);
          p.beginShape();
          for (const pt of ghost.points) p.vertex(pt.x, pt.y);
          p.endShape();
        }

        p.noFill();
        p.stroke(ink[0], ink[1], ink[2], 224);
        p.strokeWeight(1.8);
        p.beginShape();
        const points = [];
        const steps = Math.max(46, Math.floor(cw / 2));
        const t = p.millis() / 1000;
        for (let i = 0; i <= steps; i += 1) {
          const u = i / steps;
          const x = p.lerp(0, cw, u);
          const xNorm = (u * 2) - 1;
          const y = centerY - evalMiniPlot(xNorm, t) * (ch * 0.33);
          points.push({ x, y });
          p.vertex(x, y);
        }
        p.endShape();

        ghostFrames.push({ points, alpha: 118 });
        if (ghostFrames.length > 18) ghostFrames.splice(0, ghostFrames.length - 18);
        return;
      }

      const cx = cw * 0.5;
      const cy = ch * 0.5;
      const minR = Math.max(4, Math.min(cw, ch) * 0.05);
      const maxR = Math.max(minR + 8, Math.min(ch * 0.46, cw * 0.46));

      for (let i = 0; i < ringCount; i += 1) {
        const localFrame = frame - (i * ringDelay);
        if (localFrame <= 0) continue;
        const cyclePos = (localFrame % cycleFrames) / cycleFrames;
        const radius = minR + (maxR - minR) * cyclePos;
        const alpha = 200 * Math.pow(1 - cyclePos, 1.15);
        const weight = 2.2 - (1.4 * cyclePos);
        p.stroke(ink[0], ink[1], ink[2], alpha);
        p.strokeWeight(Math.max(0.8, weight));
        p.circle(cx, cy, radius * 2);
      }
    };
  });

  return {
    splashLogoIconP5,
    splashLogoIconCanvasHost: canvasHost
  };
}
