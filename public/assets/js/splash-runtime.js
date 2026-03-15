import { ensureSplashP5 } from "./p5-loader.js";
import { mountSplashLogoIconAnimation } from "./logo-icon-animation.js";

export async function initializeHomeSplash(options = {}) {
  const {
    forceShow = false,
    bindTopLeftBrand = true,
    disableMouseInteraction = false,
    forceMode = ""
  } = options || {};
      const splashScreen = document.getElementById("splashScreen");
      const splashP5Host = document.getElementById("splashP5");
      const splashCountdown = document.getElementById("splashCountdown");
      const splashLogo = document.getElementById("splashLogo");
      const topLeftBrand = document.querySelector("#siteHeader .brand");
      let splashP5Instance = null;
      let splashRotationTimer = null;
      let splashCountdownTimer = null;
      let splashLogoCornerTimer = null;
      let splashNextSwitchAt = 0;
      let splashRotationSeconds = 0;
      let splashSwitching = false;
      let splashClosing = false;
      let activeSplashMode = "";
      let splashLogo3dEl = null;
      let splashLogo3dFrame = 0;
      let splashLogoIconP5 = null;
      let splashLogoIconCanvasHost = null;
      const SPLASH_ANIMATION_ENABLED_KEY = "toji_splash_animation_enabled_v1";
      const SPLASH_ANIMATION_MODE_KEY = "toji_splash_animation_mode_v1"; // "random" | "nodes" | "flock" | "circles" | "matrix" | "life" | "plot" | "bounce" | "turningcircles" | "asteroids" | "tempest" | "missilecommand" | "radar" | "mountains" | "serpentinesphere" | "orbitalbeams"
      const SPLASH_RANDOM_CYCLE_ENABLED_KEY = "toji_splash_random_cycle_enabled_v1";
      const SPLASH_RANDOM_CYCLE_SECONDS_KEY = "toji_splash_random_cycle_seconds_v1";
      const BANNER_BEZIER_LOGO_ENABLED_KEY = "toji_banner_logo_bezier_enabled_v1";
      const BANNER_LOGO_ANIMATION_MODE_KEY = "toji_banner_logo_animation_mode_v1";

      function isSplashAnimationEnabled() {
        const raw = localStorage.getItem(SPLASH_ANIMATION_ENABLED_KEY);
        if (raw == null) return true;
        const value = String(raw).trim().toLowerCase();
        return value !== "0" && value !== "false" && value !== "off" && value !== "no";
      }
  
      function getConfiguredSplashAnimationMode() {
        const forcedMode = String(forceMode || "").toLowerCase();
        if (forcedMode === "random") return "random";
        if (forcedMode === "flock") return "flock";
        if (forcedMode === "circles") return "circles";
        if (forcedMode === "matrix") return "matrix";
        if (forcedMode === "life") return "life";
        if (forcedMode === "plot") return "plot";
        if (forcedMode === "bounce") return "bounce";
        if (forcedMode === "turningcircles") return "turningcircles";
        if (forcedMode === "asteroids") return "asteroids";
        if (forcedMode === "tempest") return "tempest";
        if (forcedMode === "missilecommand") return "missilecommand";
        if (forcedMode === "radar") return "radar";
        if (forcedMode === "mountains") return "mountains";
        if (forcedMode === "serpentinesphere") return "serpentinesphere";
        if (forcedMode === "orbitalbeams") return "orbitalbeams";
        if (forcedMode === "nodes") return "nodes";

        const mode = String(localStorage.getItem(SPLASH_ANIMATION_MODE_KEY) || "").toLowerCase();
        if (mode === "random") return "random";
        if (mode === "flock") return "flock";
        if (mode === "circles") return "circles";
        if (mode === "matrix") return "matrix";
        if (mode === "life") return "life";
        if (mode === "plot") return "plot";
        if (mode === "bounce") return "bounce";
        if (mode === "turningcircles") return "turningcircles";
        if (mode === "asteroids") return "asteroids";
        if (mode === "tempest") return "tempest";
        if (mode === "missilecommand") return "missilecommand";
        if (mode === "radar") return "radar";
        if (mode === "mountains") return "mountains";
        if (mode === "serpentinesphere") return "serpentinesphere";
        if (mode === "orbitalbeams") return "orbitalbeams";
        return "nodes";
      }
  
      function pickRandomSplashMode(preferDifferent = false) {
        const choices = ["nodes", "flock", "circles", "matrix", "life", "plot", "bounce", "turningcircles", "asteroids", "tempest", "missilecommand", "radar", "mountains", "serpentinesphere", "orbitalbeams"];
        let picked = choices[Math.floor(Math.random() * choices.length)];
        if (preferDifferent && activeSplashMode && choices.length > 1) {
          let tries = 0;
          while (picked === activeSplashMode && tries < 8) {
            picked = choices[Math.floor(Math.random() * choices.length)];
            tries += 1;
          }
        }
        return picked;
      }
  
      function getSplashAnimationMode() {
        const configured = getConfiguredSplashAnimationMode();
        if (configured === "random") return pickRandomSplashMode();
        return configured;
      }
  
      function getBannerLogoAnimationMode() {
        if (localStorage.getItem(BANNER_BEZIER_LOGO_ENABLED_KEY) !== "1") return "off";
        const mode = String(localStorage.getItem(BANNER_LOGO_ANIMATION_MODE_KEY) || "").toLowerCase();
        if (mode === "plot") return "plot";
        if (mode === "radar") return "radar";
        return "circles";
      }
  
      function getRandomCycleConfig() {
        const enabled = localStorage.getItem(SPLASH_RANDOM_CYCLE_ENABLED_KEY) === "1";
        const n = Math.floor(Number(localStorage.getItem(SPLASH_RANDOM_CYCLE_SECONDS_KEY)));
        const seconds = Number.isFinite(n) ? Math.min(600, Math.max(1, n)) : 12;
        return { enabled, seconds };
      }

      function getSplashCanvasSize() {
        const hostWidth = Math.floor(Number(splashP5Host?.clientWidth || 0));
        const hostHeight = Math.floor(Number(splashP5Host?.clientHeight || 0));
        const width = Math.max(1, hostWidth || window.innerWidth || 1);
        const height = Math.max(1, hostHeight || window.innerHeight || 1);
        return { width, height };
      }
  
      function clearSplashLogoCornerTimer() {
        if (splashLogoCornerTimer) {
          clearTimeout(splashLogoCornerTimer);
          splashLogoCornerTimer = null;
        }
        splashScreen?.classList.remove("logo-cornered");
      }
  
      function startSplashLogoCornerTimer() {
        clearSplashLogoCornerTimer();
        if (!splashScreen || splashScreen.classList.contains("hidden")) return;
        splashLogoCornerTimer = window.setTimeout(() => {
          if (!splashScreen || splashScreen.classList.contains("hidden")) return;
          splashScreen.classList.add("logo-cornered");
        }, 5000);
      }
  
      let splashLogoNudgeXOffset = 0;
      let splashLogoNudgeYOffset = 0;
      let splashLogoTiltDeg = 0;
      function nudgeSplashLogo(offsetXPx = 0, offsetYPx = 0) {
        if (!splashLogo) return;
        splashLogoNudgeXOffset = Math.max(-120, Math.min(120, splashLogoNudgeXOffset + Number(offsetXPx || 0)));
        splashLogoNudgeYOffset = Math.max(-80, Math.min(80, splashLogoNudgeYOffset + Number(offsetYPx || 0)));
        splashLogo.style.setProperty("--splash-logo-nudge-x", `${splashLogoNudgeXOffset}px`);
        splashLogo.style.setProperty("--splash-logo-nudge-y", `${splashLogoNudgeYOffset}px`);
      }
  
      function resetSplashLogoImpactVisual() {
        if (!splashLogo) return;
        splashLogoNudgeXOffset = 0;
        splashLogoNudgeYOffset = 0;
        splashLogo.style.setProperty("--splash-logo-nudge-x", "0px");
        splashLogo.style.setProperty("--splash-logo-nudge-y", "0px");
        splashLogoTiltDeg = 0;
        splashLogo.style.setProperty("--splash-logo-tilt", "0deg");
      }
  
      function applySplashLogoHitVisual(spinDirection = 1) {
        if (!splashLogo) return;
        const tiltStep = spinDirection < 0 ? -6 : 6;
        splashLogoTiltDeg = Math.max(-30, Math.min(30, splashLogoTiltDeg + tiltStep));
        splashLogo.style.setProperty("--splash-logo-tilt", `${splashLogoTiltDeg}deg`);
      }
  
      function stopSplashLogo3dAnimation() {
        if (splashLogo3dFrame) {
          cancelAnimationFrame(splashLogo3dFrame);
          splashLogo3dFrame = 0;
        }
        if (splashLogo3dEl) {
          splashLogo3dEl.remove();
          splashLogo3dEl = null;
        }
      }
  
      function startSplashLogo3dAnimation() {
        if (!splashScreen) return;
        stopSplashLogo3dAnimation();
  
        const logo = document.createElement("img");
        logo.className = "splash-logo-drift3d";
        logo.src = "assets/img/TojiStudios_Logo_v5.png";
        logo.alt = "";
        logo.setAttribute("aria-hidden", "true");
        splashScreen.appendChild(logo);
        splashLogo3dEl = logo;
  
        let x = window.innerWidth * 0.32;
        let y = window.innerHeight * 0.34;
        let vx = (Math.random() < 0.5 ? -1 : 1) * (0.24 + Math.random() * 0.18);
        let vy = (Math.random() < 0.5 ? -1 : 1) * (0.20 + Math.random() * 0.14);
        let yaw = Math.random() * 360;
        let pitch = Math.random() * 360;
        let roll = Math.random() * 360;
        let yawV = (Math.random() < 0.5 ? -1 : 1) * (0.48 + Math.random() * 0.35);
        let pitchV = (Math.random() < 0.5 ? -1 : 1) * (0.32 + Math.random() * 0.26);
        let rollV = (Math.random() < 0.5 ? -1 : 1) * (0.21 + Math.random() * 0.24);
        let last = 0;
  
        const tick = (ts) => {
          if (!splashLogo3dEl) return;
          if (!last) last = ts;
          const dt = Math.min(40, ts - last);
          last = ts;
          const step = dt / 16.6667;
          const w = window.innerWidth;
          const h = window.innerHeight;
          const margin = 42;
          const halfW = Math.max(90, splashLogo3dEl.offsetWidth * 0.5);
          const halfH = Math.max(56, splashLogo3dEl.offsetHeight * 0.5);
  
          x += vx * step;
          y += vy * step;
  
          if (x < halfW + margin) {
            x = halfW + margin;
            vx = Math.abs(vx);
          } else if (x > w - halfW - margin) {
            x = w - halfW - margin;
            vx = -Math.abs(vx);
          }
          if (y < halfH + margin) {
            y = halfH + margin;
            vy = Math.abs(vy);
          } else if (y > h - halfH - margin) {
            y = h - halfH - margin;
            vy = -Math.abs(vy);
          }
  
          yaw += yawV * step;
          pitch += pitchV * step;
          roll += rollV * step;
  
          splashLogo3dEl.style.transform =
            `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
          splashLogo3dFrame = requestAnimationFrame(tick);
        };
  
        splashLogo3dFrame = requestAnimationFrame(tick);
      }
  
      // async function initSplashAnimation() {
      //   if (!splashScreen || !splashP5Host || splashP5Instance || splashScreen.classList.contains("hidden")) return;
      //   await ensureSplashP5();
      //   if (!window.p5) return;
  
      //   const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
      //   splashP5Instance = new window.p5((p) => {
      //     const blobs = [];
      //     const palette = [
      //       [96, 130, 255, 60],
      //       [92, 255, 214, 44],
      //       [255, 140, 86, 38],
      //       [150, 110, 255, 42],
      //     ];
  
      //     const seedBlobs = () => {
      //       blobs.length = 0;
      //       for (let i = 0; i < 10; i += 1) {
      //         blobs.push({
      //           x: p.random(p.width),
      //           y: p.random(p.height),
      //           r: p.random(180, 460),
      //           dx: p.random(-0.22, 0.22),
      //           dy: p.random(-0.18, 0.18),
      //           c: palette[i % palette.length],
      //         });
      //       }
      //     };
  
      //     p.setup = () => {
      //       const canvas = p.createCanvas(splashP5Host.clientWidth, splashP5Host.clientHeight);
      //       canvas.parent(splashP5Host);
      //       p.pixelDensity(1);
      //       p.noStroke();
      //       seedBlobs();
      //       if (reduceMotion) p.noLoop();
      //     };
  
      //     p.windowResized = () => {
      //       p.resizeCanvas(splashP5Host.clientWidth, splashP5Host.clientHeight);
      //       seedBlobs();
      //       p.redraw();
      //     };
  
      //     p.draw = () => {
      //       p.clear();
      //       p.background(24, 23, 26, 245);
      //       p.blendMode(p.SCREEN);
      //       for (const b of blobs) {
      //         p.fill(b.c[0], b.c[1], b.c[2], b.c[3]);
      //         p.circle(b.x, b.y, b.r);
      //         b.x += b.dx;
      //         b.y += b.dy;
      //         if (b.x < -b.r * 0.5) b.x = p.width + b.r * 0.5;
      //         if (b.x > p.width + b.r * 0.5) b.x = -b.r * 0.5;
      //         if (b.y < -b.r * 0.5) b.y = p.height + b.r * 0.5;
      //         if (b.y > p.height + b.r * 0.5) b.y = -b.r * 0.5;
      //       }
      //       p.blendMode(p.BLEND);
      //     };
      //   });
      // }
  
  
  
      async function initSplashAnimation(forcedMode = null) {
        if (!splashScreen || !splashP5Host || splashP5Instance || splashScreen.classList.contains("hidden")) return;
        if (!isSplashAnimationEnabled()) {
          activeSplashMode = "off";
          stopSplashLogo3dAnimation();
          clearSplashLogoCornerTimer();
          splashP5Host.innerHTML = "";
          return;
        }
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
          stopSplashLogo3dAnimation();
          splashP5Host.innerHTML = "";
          return;
        }
  
        await ensureSplashP5();
        if (!window.p5) return;
  
        const splashMode = forcedMode || getSplashAnimationMode();
        activeSplashMode = splashMode;
        if (splashMode === "logo3d") startSplashLogo3dAnimation();
        else stopSplashLogo3dAnimation();
        startSplashLogoCornerTimer();
  
        splashP5Instance = new window.p5((p) => {
          const nodes = [];
          const edges = [];
          const curves = [];
          const flock = [];
          const circleGrid = [];
          const turningCircles = [];
          const turningTrails = [];
          const asteroidRocks = [];
          const asteroidShots = [];
          const asteroidStars = [];
          const tempestEnemies = [];
          const tempestShots = [];
          const tempestBursts = [];
          const missileCities = [];
          const missileBases = [];
          const missileEnemyMissiles = [];
          const missileDefenseMissiles = [];
          const missileExplosions = [];
          const missileStars = [];
          const mountainStars = [];
          const mountainRanges = [];
          const mountainShootingStars = [];
          const mountainBirds = [];
          const mountainUfos = [];
          const mountainPeople = [];
          const mountainApproachPeople = [];
          const mountainCars = [];
          const mountainImpactBursts = [];
          const mountainUfoBeams = [];
          const orbitalBeams = [];
          const orbitalBubbles = [];
          const orbitalBlackHoles = [];
          const orbitalRaiders = [];
          const orbitalRaiderShots = [];
          const radarBlips = [];
          const radarEchoes = [];
          const dukePlatforms = [];
          const dukeEnemies = [];
          const dukeBullets = [];
          const dukeExplosions = [];
          const dukePickups = [];
          const dukeBackdropBuildings = [];
          const serpentineTrail = [];
          let radarGridColor = [60, 160, 110];
          let radarRingColor = [72, 220, 146];
          let radarSweepFillColor = [72, 255, 156];
          let radarSweepLineColor = [110, 255, 178];
          let radarEchoColor = [132, 255, 194];
          let radarTextColor = [90, 220, 150];
          let radarOuterFillColor = [6, 40, 26];
          let radarInnerFillColor = [0, 0, 0];
          let radarBackgroundColor = [3, 14, 10];
          const matrixDrops = [];
          const matrixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+-/<>{}[]";
          const matrixBasePalette = [
            [230, 64, 64],   // red
            [68, 220, 122],  // green
            [80, 156, 255],  // blue
            [186, 106, 255], // violet
            [248, 176, 68],  // amber
            [64, 220, 220]   // cyan
          ];
          const matrixDirections = [
            { name: "up", vx: 0, vy: -1 },
            { name: "down", vx: 0, vy: 1 },
            { name: "left", vx: -1, vy: 0 },
            { name: "right", vx: 1, vy: 0 },
            { name: "diag-bl-tr", vx: 1, vy: -1 },
            { name: "diag-br-tl", vx: -1, vy: -1 },
            { name: "meander", vx: 0, vy: 0 }
          ];
          const orbitalNeonPalette = [
            [255, 38, 68],
            [52, 136, 255],
            [64, 255, 118],
            [188, 74, 255]
          ];
          const serpentineTrailPalette = [
            [194, 236, 255],
            [132, 228, 255],
            [140, 196, 255],
            [186, 170, 255],
            [124, 255, 224],
            [255, 186, 226]
          ];
          let matrixBaseColor = [230, 64, 64];
          let matrixDirection = matrixDirections[0];
          let placeMatrixDrop = null;
          let asteroidShip = null;
          let asteroidNextSpawnAt = 0;
          let tempestLaneCount = 16;
          let tempestPlayerLane = 0;
          let tempestNextSpawnAt = 0;
          let tempestNextShotAt = 0;
          let tempestSpin = 0;
          let tempestSpinVel = 0.0038;
          let tempestCenterPulse = 0;
          let tempestScore = 0;
          let tempestGridVariant = "round";
          let tempestGridSides = 8;
          let tempestGridStarAmp = 0.22;
          let tempestGridEllipseX = 1;
          let tempestGridEllipseY = 1;
          let tempestGridTwist = 0;
          let tempestLaneScale = [];
          let missileNextEnemyAt = 0;
          let missileNextDefenseAt = 0;
          let missileWave = 1;
          let missileScore = 0;
          let mountainPanX = 0;
          let mountainWorldWidth = 0;
          let mountainHorizonY = 0;
          let mountainNextShootingStarAt = 0;
          let mountainNextUfoAt = 0;
          let orbitalNextShotAt = 0;
          let orbitalNextRaiderAt = 0;
          let orbitalNextColorShiftAt = 0;
          let orbitalOrbAngle = 0;
          let orbitalOrbSpin = 0.02;
          let orbitalPhaseBubbleColor = [116, 228, 255];
          let radarSweepAngle = 0;
          let radarSweepSpeed = 0.018;
          let radarNextBlipAt = 0;
          let radarRotationDirection = 1;
          let dukePlayer = null;
          let dukeGroundY = 0;
          let dukeScrollX = 0;
          let dukeSpawnX = 0;
          let dukeNextShotAt = 0;
          let dukeNextEnemyShotAt = 0;
          let dukeScore = 0;
          let dukeLevelLabel = "SHRAPNEL CITY";
          let dukeCycleSeed = 0;
          let serpentineHead = null;
          let serpentineTrailEmitAt = 0;
          let serpentineNextFallAt = 0;
          let piDigitsStream = "";
          let piDigitCursor = 0;
          let piCellCursor = 0;
          let piCols = 100;
          let piRows = 1;
          let piFontSize = 10;
          let piCharWidth = 6;
          let piCellWidth = 6;
          let piLineHeight = 12;
          let piGridRows = [];
          let piColorRows = [];
          let piFadeAlpha = 255;
          let piIsFading = false;
          let piPendingDigits = [];
          let piGenerator = null;
          let piLastEmitAt = 0;
          let piEmitIntervalMs = 1;
          let piDroppedLeadDigit = false;
          let piInsertedDot = false;
          let lifeCols = 0;
          let lifeRows = 0;
          let lifeCellSize = 10;
          let lifeGrid = [];
          let lifeNext = [];
          let lifeAge = [];
          let lifeLastStepAt = 0;
          let lifeStepMs = 120;
          let codeFontSize = 15;
          let codeLineHeight = 22;
          let codeVisibleRows = 18;
          let codeQueue = [];
          let codeRendered = [];
          let codeLineIndex = 0;
          let codeCharIndex = 0;
          let codeLastTypeAt = 0;
          let codeTypeInterval = 34;
          let codePauseUntil = 0;
          let plotAmplitude = 1;
          let plotFreq = 1;
          let plotPhase = 0;
          let plotType = "harmonic-rational";
          let plotLabel = "";
          let plotAxisColor = [120, 130, 150];
        let plotLineColor = [120, 230, 255];
        let plotParams = {};
        let plotGhostFrames = [];
        const bounceBallCount = 2;
        let bounceBalls = [];
        let bounceTrails = [];
        let mouseTarget = null;
        let nextCircleShuffleAt = 0;
        let matrixFontSize = 18;
        const vividCirclePalette = [
          [255, 72, 72],
          [255, 184, 56],
          [120, 255, 96],
          [72, 224, 255],
          [110, 132, 255],
          [255, 92, 214]
        ];
  
          const wrapNode = (n) => {
            if (n.x < -n.r) n.x = p.width + n.r;
            if (n.x > p.width + n.r) n.x = -n.r;
            if (n.y < -n.r) n.y = p.height + n.r;
            if (n.y > p.height + n.r) n.y = -n.r;
          };
  
          const nearestIndices = (index, limit = 3) => {
            const self = nodes[index];
            const withDist = nodes
              .map((n, i) => ({ i, d: i === index ? Number.POSITIVE_INFINITY : p.dist(self.x, self.y, n.x, n.y) }))
              .filter(x => x.i !== index)
              .sort((a, b) => a.d - b.d);
            return withDist.slice(0, limit).map(x => x.i);
          };
  
          const buildGraph = () => {
            edges.length = 0;
            const seen = new Set();
            for (let i = 0; i < nodes.length; i += 1) {
              const targetCount = p.floor(p.random(1, 4));
              const near = nearestIndices(i, 6);
              for (let k = 0; k < targetCount && k < near.length; k += 1) {
                const j = near[k];
                const a = Math.min(i, j);
                const b = Math.max(i, j);
                const key = `${a}:${b}`;
                if (seen.has(key)) continue;
                seen.add(key);
                edges.push([a, b]);
              }
            }
          };
  
          const seedNodes = () => {
            nodes.length = 0;
            const count = 10;
            for (let i = 0; i < count; i += 1) {
              nodes.push({
                x: p.random(p.width),
                y: p.random(p.height),
                r: p.random(8, 24),
                rMin: p.random(6, 14),
                rMax: p.random(18, 30),
                pulse: p.random(0, Math.PI * 2),
                pulseSpeed: p.random(0.012, 0.03),
                dx: p.random(-0.45, 0.45),
                dy: p.random(-0.35, 0.35),
                red: p.random() < 0.35,
              });
            }
            buildGraph();
          };
  
          const movePoint = (pt) => {
            pt.x += pt.dx;
            pt.y += pt.dy;
            if (pt.x < 0 || pt.x > p.width) {
              pt.dx *= -1;
              pt.x = p.constrain(pt.x, 0, p.width);
            }
            if (pt.y < 0 || pt.y > p.height) {
              pt.dy *= -1;
              pt.y = p.constrain(pt.y, 0, p.height);
            }
          };
  
          const makePoint = () => ({
            x: p.random(p.width),
            y: p.random(p.height),
            dx: p.random(-0.9, 0.9),
            dy: p.random(-0.9, 0.9)
          });
  
          const seedBezierCurves = () => {
            curves.length = 0;
            const count = 34; // dense
            const palette = [
              [255, 255, 255, 90],
              [255, 255, 255, 70],
              [255, 24, 24, 88],
              [96, 130, 255, 74]
            ];
            for (let i = 0; i < count; i += 1) {
              curves.push({
                p0: makePoint(),
                p1: makePoint(),
                p2: makePoint(),
                p3: makePoint(),
                color: palette[i % palette.length],
                weight: p.random(0.8, 2.4)
              });
            }
          };
  
          const seedFlock = () => {
            flock.length = 0;
            const count = 150; // large flock
            mouseTarget = p.createVector(p.width * 0.5, p.height * 0.5);
            for (let i = 0; i < count; i += 1) {
              flock.push({
                pos: p.createVector(p.random(p.width), p.random(p.height)),
                vel: p.createVector(p.random(-2, 2), p.random(-2, 2)),
                acc: p.createVector(0, 0),
                maxSpeed: p.random(1.8, 2.8),
                maxForce: p.random(0.045, 0.085),
                size: p.random(3.6, 6.8),
                purple: p.random() < 0.3
              });
            }
          };

          const seedSerpentineSphere = () => {
            serpentineTrail.length = 0;
            const basePad = Math.max(10, Math.min(30, Math.min(p.width, p.height) * 0.03));
            const radius = Math.max(4, Math.min(12, Math.min(p.width, p.height) * 0.012));
            const rowStep = Math.max(radius * 3.3, Math.min(54, p.height * 0.08));
            serpentineHead = {
              x: basePad,
              y: basePad,
              pad: basePad,
              radius,
              rowStep,
              dir: 1,
              phase: "horizontal",
              targetY: basePad,
              speedX: Math.max(1.8, p.width * 0.0036),
              speedY: Math.max(2.2, p.height * 0.009)
            };
            serpentineTrailEmitAt = p.millis();
            serpentineNextFallAt = p.millis() + p.random(320, 760);
          };

          const updateSerpentineSphere = () => {
            if (!serpentineHead) return;
            const head = serpentineHead;
            const now = p.millis();
            const minX = head.pad;
            const maxX = Math.max(minX, p.width - head.pad);
            const maxY = Math.max(head.pad, p.height - head.pad);

            if (now >= serpentineTrailEmitAt) {
              serpentineTrail.push({
                x: head.x,
                y: head.y,
                r: head.radius,
                alpha: 180,
                decay: p.random(0.955, 0.975),
                color: p.random(serpentineTrailPalette) || [194, 236, 255],
                falling: false,
                vx: 0,
                vy: 0,
                gravity: 0,
                swirl: 0
              });
              serpentineTrailEmitAt = now + 26;
            }

            if (now >= serpentineNextFallAt && serpentineTrail.length > 12) {
              const candidates = serpentineTrail.filter((orb) => !orb.falling && orb.alpha > 24);
              const dropCount = Math.min(candidates.length, Math.max(1, Math.floor(p.random(1, 4))));
              for (let i = 0; i < dropCount; i += 1) {
                const pick = candidates[Math.floor(p.random(candidates.length))];
                if (!pick || pick.falling) continue;
                pick.falling = true;
                pick.vx = p.random(-0.22, 0.22);
                pick.vy = p.random(0.35, 1.05);
                pick.gravity = p.random(0.028, 0.05);
                pick.swirl = p.random(-0.03, 0.03);
              }
              serpentineNextFallAt = now + p.random(280, 760);
            }

            if (head.phase === "horizontal") {
              head.x += head.speedX * head.dir;
              const reachedRight = head.dir > 0 && head.x >= maxX;
              const reachedLeft = head.dir < 0 && head.x <= minX;
              if (reachedRight || reachedLeft) {
                head.x = reachedRight ? maxX : minX;
                head.phase = "vertical";
                head.targetY = head.y + head.rowStep;
              }
            } else {
              head.y += head.speedY;
              if (head.y >= maxY) {
                head.x = minX;
                head.y = head.pad;
                head.dir = 1;
                head.phase = "horizontal";
                head.targetY = head.pad;
              } else if (head.y >= head.targetY) {
                head.y = head.targetY;
                head.phase = "horizontal";
                head.dir *= -1;
              }
            }

            for (let i = serpentineTrail.length - 1; i >= 0; i -= 1) {
              const orb = serpentineTrail[i];
              if (orb.falling) {
                orb.vx += orb.swirl;
                orb.vx *= 0.994;
                orb.vy += orb.gravity;
                orb.x += orb.vx;
                orb.y += orb.vy;
                orb.alpha *= (orb.decay * 0.992);
                orb.r *= 0.996;
              } else {
                orb.alpha *= orb.decay;
                orb.r *= 0.998;
              }
              if (orb.alpha < 3 || orb.r < 1.2 || orb.y > p.height + 24) serpentineTrail.splice(i, 1);
            }
          };

          const drawSerpentineSphere = () => {
            updateSerpentineSphere();
            p.noStroke();
            for (const orb of serpentineTrail) {
              const color = orb.color || [194, 236, 255];
              p.fill(color[0], color[1], color[2], orb.alpha * 0.32);
              p.circle(orb.x, orb.y, orb.r * 2.8);
              p.fill(color[0], color[1], color[2], orb.alpha);
              p.circle(orb.x, orb.y, orb.r * 2);
            }
            if (!serpentineHead) return;
            p.fill(120, 210, 255, 80);
            p.circle(serpentineHead.x, serpentineHead.y, serpentineHead.radius * 3.2);
            p.fill(246, 252, 255, 236);
            p.circle(serpentineHead.x, serpentineHead.y, serpentineHead.radius * 2);
          };
  
        const seedCircleGrid = () => {
          circleGrid.length = 0;
          const spacing = 76;
          const radius = 21;
          const cols = Math.max(1, Math.floor(p.width / spacing));
            const rows = Math.max(1, Math.floor(p.height / spacing));
            const usedW = (cols - 1) * spacing;
            const usedH = (rows - 1) * spacing;
            const startX = (p.width - usedW) * 0.5;
            const startY = (p.height - usedH) * 0.5;
  
            for (let r = 0; r < rows; r += 1) {
              for (let c = 0; c < cols; c += 1) {
                circleGrid.push({
                  x: startX + c * spacing,
                  y: startY + r * spacing,
                  radius,
                  pulsePhase: p.random(Math.PI * 2),
                  pulseSpeed: p.random(0.018, 0.05),
                  fillAlpha: 0,
                  targetAlpha: 0,
                  fillColor: vividCirclePalette[Math.floor(p.random(vividCirclePalette.length))] || [255, 255, 255]
                });
              }
            }
  
            nextCircleShuffleAt = 0;
          };
  
          const seedTurningCircles = () => {
            turningCircles.length = 0;
            turningTrails.length = 0;
            const count = Math.max(6, Math.floor(p.random(8, 22)));
            const turningPalette = [
              [255, 255, 255],
              [88, 144, 255]
            ];
            for (let i = 0; i < count; i += 1) {
              const color = p.random(turningPalette);
              turningCircles.push({
                x: p.random(p.width),
                y: p.random(p.height),
                r: p.random(6, 16),
                speed: p.random(1.05, 2.35),
                heading: p.random([0, p.HALF_PI, Math.PI, p.HALF_PI * 3]),
                nextTurnAt: p.millis() + p.random(700, 2400),
                color: [color[0], color[1], color[2]]
              });
            }
          };
  
          const wrapPoint = (obj, pad = 0) => {
            if (obj.x < -pad) obj.x = p.width + pad;
            else if (obj.x > p.width + pad) obj.x = -pad;
            if (obj.y < -pad) obj.y = p.height + pad;
            else if (obj.y > p.height + pad) obj.y = -pad;
          };
  
          const angleDelta = (from, to) => {
            let d = to - from;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            return d;
          };
  
          const makeAsteroid = (x, y, radius) => {
            const heading = p.random(Math.PI * 2);
            const speed = p.random(0.45, 1.7) * (28 / Math.max(16, radius));
            const sides = Math.floor(p.random(9, 14));
            const profile = [];
            for (let i = 0; i < sides; i += 1) profile.push(p.random(0.72, 1.18));
            return {
              x,
              y,
              r: radius,
              vx: Math.cos(heading) * speed,
              vy: Math.sin(heading) * speed,
              rot: p.random(Math.PI * 2),
              rotSpeed: p.random(-0.015, 0.015),
              sides,
              profile
            };
          };
  
          const spawnAsteroidFar = (radius) => {
            const cx = asteroidShip ? asteroidShip.x : p.width * 0.5;
            const cy = asteroidShip ? asteroidShip.y : p.height * 0.5;
            let x = p.random(p.width);
            let y = p.random(p.height);
            let tries = 0;
            while (tries < 18 && p.dist(x, y, cx, cy) < Math.min(p.width, p.height) * 0.24) {
              x = p.random(p.width);
              y = p.random(p.height);
              tries += 1;
            }
            asteroidRocks.push(makeAsteroid(x, y, radius));
          };
  
          const seedAsteroids = () => {
            asteroidRocks.length = 0;
            asteroidShots.length = 0;
            asteroidStars.length = 0;
            const starCount = Math.max(70, Math.floor((p.width * p.height) / 18000));
            for (let i = 0; i < starCount; i += 1) {
              asteroidStars.push({
                x: p.random(p.width),
                y: p.random(p.height),
                a: p.random(42, 150),
                s: p.random(1.1, 2.4)
              });
            }
            asteroidShip = {
              x: p.width * 0.5,
              y: p.height * 0.5,
              vx: 0,
              vy: 0,
              heading: -Math.PI * 0.5,
              thrusting: false,
              invuln: 0,
              nextFireAt: 0
            };
            const count = Math.floor(p.random(7, 12));
            for (let i = 0; i < count; i += 1) spawnAsteroidFar(p.random(26, 58));
            asteroidNextSpawnAt = p.millis() + p.random(950, 1800);
          };
  
          const splitAsteroid = (rock) => {
            if (rock.r < 24) return;
            const childR = rock.r * p.random(0.54, 0.66);
            const base = Math.atan2(rock.vy, rock.vx);
            for (let i = 0; i < 2; i += 1) {
              const theta = base + (i === 0 ? -Math.PI * 0.34 : Math.PI * 0.34);
              const child = makeAsteroid(rock.x, rock.y, childR);
              child.vx = Math.cos(theta) * p.random(1.2, 2.3);
              child.vy = Math.sin(theta) * p.random(1.2, 2.3);
              asteroidRocks.push(child);
            }
          };
  
          const wrapLane = (lane) => {
            const c = Math.max(1, tempestLaneCount);
            return ((lane % c) + c) % c;
          };
  
          const laneDelta = (from, to) => {
            const c = Math.max(1, tempestLaneCount);
            let d = wrapLane(to) - wrapLane(from);
            if (d > c / 2) d -= c;
            else if (d < -c / 2) d += c;
            return d;
          };
  
          const tempestLanePoint = (lane, depth = 1) => {
            const cx = p.width * 0.5;
            const cy = p.height * 0.5;
            const outer = Math.min(p.width, p.height) * 0.45;
            const inner = outer * 0.16;
            const t = p.constrain(depth, 0, 1);
            const laneIdx = wrapLane(lane);
            const baseAngle = ((laneIdx / tempestLaneCount) * (Math.PI * 2)) + tempestSpin;
            const angle = baseAngle + (tempestGridTwist * (1 - t));
            let variantFactor = 1;
            if (tempestGridVariant === "polygon") {
              const n = Math.max(3, tempestGridSides);
              const seg = (Math.PI * 2) / n;
              const local = ((baseAngle % seg) + seg) % seg;
              const centered = local - seg * 0.5;
              const denom = Math.max(0.38, Math.cos(centered));
              variantFactor = p.constrain(Math.cos(Math.PI / n) / denom, 0.74, 1.35);
            } else if (tempestGridVariant === "star") {
              variantFactor = 1 + (Math.sin(baseAngle * tempestGridSides) * tempestGridStarAmp);
            } else if (tempestGridVariant === "pinch") {
              variantFactor = 1 - (0.16 * Math.cos(baseAngle * 2));
            } else if (tempestGridVariant === "wobble") {
              variantFactor = 1 + (0.12 * Math.sin(baseAngle * 3 + tempestCenterPulse * 0.34 + (1 - t) * 3.2));
            }
            const laneFactor = tempestLaneScale[laneIdx] || 1;
            const radius = p.lerp(inner, outer, t) * p.constrain(variantFactor * laneFactor, 0.62, 1.45);
            const xRadius = radius * tempestGridEllipseX;
            const yRadius = radius * tempestGridEllipseY;
            return {
              x: cx + Math.cos(angle) * xRadius,
              y: cy + Math.sin(angle) * yRadius,
              angle
            };
          };
  
          const spawnTempestEnemy = (startDepth = 0.02) => {
            const palette = [
              [210, 118, 255], // violet
              [104, 192, 255], // blue
              [255, 136, 190], // pink
              [146, 236, 184], // mint
              [255, 196, 116]  // amber
            ];
            tempestEnemies.push({
              lane: Math.floor(p.random(tempestLaneCount)),
              depth: p.constrain(startDepth + p.random(-0.04, 0.05), 0, 0.18),
              speed: p.random(0.0016, 0.0036),
              wobble: p.random(Math.PI * 2),
              color: palette[Math.floor(p.random(palette.length))]
            });
          };
  
          const seedTempest = () => {
            tempestEnemies.length = 0;
            tempestShots.length = 0;
            tempestBursts.length = 0;
            tempestScore = 0;
            tempestLaneCount = Math.floor(p.random(12, 19));
            const variants = ["round", "polygon", "star", "pinch", "wobble"];
            tempestGridVariant = variants[Math.floor(p.random(variants.length))] || "round";
            tempestGridSides = Math.floor(p.random(5, 11));
            tempestGridStarAmp = p.random(0.16, 0.34);
            tempestGridEllipseX = p.random(0.84, 1.18);
            tempestGridEllipseY = p.random(0.84, 1.18);
            tempestGridTwist = p.random(-0.42, 0.42);
            tempestLaneScale = [];
            for (let i = 0; i < tempestLaneCount; i += 1) {
              tempestLaneScale.push(p.random(0.88, 1.14));
            }
            // Smooth lane scaling so generated grids are varied but still coherent.
            for (let pass = 0; pass < 2; pass += 1) {
              const smoothed = [];
              for (let i = 0; i < tempestLaneCount; i += 1) {
                const prev = tempestLaneScale[(i - 1 + tempestLaneCount) % tempestLaneCount];
                const cur = tempestLaneScale[i];
                const next = tempestLaneScale[(i + 1) % tempestLaneCount];
                smoothed[i] = (prev + cur + next) / 3;
              }
              tempestLaneScale = smoothed;
            }
            tempestPlayerLane = Math.floor(p.random(tempestLaneCount));
            tempestNextSpawnAt = p.millis() + p.random(420, 900);
            tempestNextShotAt = 0;
            tempestSpin = p.random(Math.PI * 2);
            tempestSpinVel = p.random() < 0.5 ? -p.random(0.0023, 0.0052) : p.random(0.0023, 0.0052);
            tempestCenterPulse = p.random(Math.PI * 2);
            const initial = Math.floor(p.random(5, 10));
            for (let i = 0; i < initial; i += 1) spawnTempestEnemy(p.random(0.03, 0.38));
          };
  
          const seedMissileCommand = () => {
            missileCities.length = 0;
            missileBases.length = 0;
            missileEnemyMissiles.length = 0;
            missileDefenseMissiles.length = 0;
            missileExplosions.length = 0;
            missileStars.length = 0;
            missileWave = 1;
            missileScore = 0;
            missileNextEnemyAt = p.millis() + p.random(260, 620);
            missileNextDefenseAt = 0;
  
            const starCount = Math.max(60, Math.floor((p.width * p.height) / 22000));
            for (let i = 0; i < starCount; i += 1) {
              missileStars.push({
                x: p.random(p.width),
                y: p.random(p.height * 0.72),
                a: p.random(30, 160),
                s: p.random(1, 2.6)
              });
            }
  
            const groundY = p.height * 0.84;
            const cityCount = 6;
            const citySpacing = p.width / (cityCount + 1);
            for (let i = 0; i < cityCount; i += 1) {
              missileCities.push({
                x: citySpacing * (i + 1),
                y: groundY,
                w: p.random(34, 58),
                h: p.random(26, 54),
                alive: true
              });
            }
  
            const baseOffsets = [0.16, 0.5, 0.84];
            for (const offset of baseOffsets) {
              missileBases.push({
                x: p.width * offset,
                y: groundY,
                alive: true,
                cooldownUntil: 0
              });
            }
          };
  
          const seedRadarScreen = () => {
            const hslToRgb = (h, s, l) => {
              const hue = ((h % 360) + 360) % 360;
              const sat = p.constrain(s, 0, 1);
              const light = p.constrain(l, 0, 1);
              const c = (1 - Math.abs(2 * light - 1)) * sat;
              const hp = hue / 60;
              const x = c * (1 - Math.abs((hp % 2) - 1));
              let r1 = 0;
              let g1 = 0;
              let b1 = 0;
              if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
              else if (hp < 2) [r1, g1, b1] = [x, c, 0];
              else if (hp < 3) [r1, g1, b1] = [0, c, x];
              else if (hp < 4) [r1, g1, b1] = [0, x, c];
              else if (hp < 5) [r1, g1, b1] = [x, 0, c];
              else [r1, g1, b1] = [c, 0, x];
              const m = light - c / 2;
              return [
                Math.round((r1 + m) * 255),
                Math.round((g1 + m) * 255),
                Math.round((b1 + m) * 255)
              ];
            };
  
            radarBlips.length = 0;
            radarEchoes.length = 0;
            radarSweepAngle = p.random(Math.PI * 2);
            radarRotationDirection = p.random() < 0.5 ? -1 : 1;
            radarSweepSpeed = p.random(0.014, 0.024) * radarRotationDirection;
            radarNextBlipAt = p.millis() + p.random(160, 420);
            const hue = p.random(0, 360);
            radarGridColor = hslToRgb(hue, 0.48, 0.42);
            radarRingColor = hslToRgb(hue, 0.78, 0.58);
            radarSweepFillColor = hslToRgb(hue, 0.92, 0.62);
            radarSweepLineColor = hslToRgb(hue, 0.92, 0.72);
            radarEchoColor = hslToRgb(hue, 0.88, 0.8);
            radarTextColor = hslToRgb(hue, 0.64, 0.6);
            radarOuterFillColor = hslToRgb(hue, 0.62, 0.1);
            radarInnerFillColor = hslToRgb(hue, 0.44, 0.045);
            radarBackgroundColor = hslToRgb(hue, 0.7, 0.055);
            const initialCount = Math.floor(p.random(6, 12));
            for (let i = 0; i < initialCount; i += 1) {
              radarBlips.push({
                angle: p.random(Math.PI * 2),
                radiusRatio: p.random(0.12, 0.94),
                size: p.random(4, 10),
                alpha: p.random(90, 210),
                pulse: p.random(Math.PI * 2),
                drift: p.random(-0.0025, 0.0025),
                radialDrift: p.random(-0.0008, 0.0008)
              });
            }
          };
  
          const getMissileAliveTargets = () => {
            const targets = [];
            for (const city of missileCities) {
              if (!city.alive) continue;
              targets.push({ kind: "city", ref: city, x: city.x, y: city.y - city.h * 0.45 });
            }
            for (const base of missileBases) {
              if (!base.alive) continue;
              targets.push({ kind: "base", ref: base, x: base.x, y: base.y - 8 });
            }
            if (!targets.length) {
              targets.push({
                kind: "ground",
                ref: null,
                x: p.random(p.width * 0.12, p.width * 0.88),
                y: p.height * 0.84
              });
            }
            return targets;
          };
  
          const spawnMissileEnemy = () => {
            const targets = getMissileAliveTargets();
            const target = targets[Math.floor(p.random(targets.length))] || {
              kind: "ground",
              ref: null,
              x: p.width * 0.5,
              y: p.height * 0.84
            };
            const startX = p.random(p.width * 0.06, p.width * 0.94);
            const startY = -20;
            const dx = target.x - startX;
            const dy = target.y - startY;
            const length = Math.max(0.001, Math.hypot(dx, dy));
            const speed = p.random(1.1, 1.95) + (missileWave * 0.035);
            missileEnemyMissiles.push({
              x: startX,
              y: startY,
              sx: startX,
              sy: startY,
              tx: target.x,
              ty: target.y,
              vx: (dx / length) * speed,
              vy: (dy / length) * speed,
              headColor: [255, 120, 92],
              targetKind: target.kind,
              targetRef: target.ref,
              defenseTriggered: false
            });
          };
  
          const triggerMissileExplosion = (x, y, maxR = 44, color = [255, 196, 120]) => {
            missileExplosions.push({
              x,
              y,
              r: 2,
              maxR,
              grow: true,
              color,
              ringAlpha: 235
            });
          };
  
          const launchMissileDefense = (targetX, targetY) => {
            const now = p.millis();
            const liveBases = missileBases
              .filter((base) => base.alive && now >= base.cooldownUntil)
              .sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX));
            const base = liveBases[0];
            if (!base) return false;
            const sx = base.x;
            const sy = base.y - 6;
            const dx = targetX - sx;
            const dy = targetY - sy;
            const length = Math.max(0.001, Math.hypot(dx, dy));
            const speed = p.random(4.2, 5.4);
            missileDefenseMissiles.push({
              x: sx,
              y: sy,
              sx,
              sy,
              tx: targetX,
              ty: targetY,
              vx: (dx / length) * speed,
              vy: (dy / length) * speed
            });
            base.cooldownUntil = now + p.random(140, 280);
            return true;
          };
  
          const createPiGenerator = (digits = 120000) => {
            const len = Math.floor((digits * 10) / 3) + 1;
            return {
              arr: new Array(len).fill(2),
              len,
              nines: 0,
              predigit: 0
            };
          };
  
          const stepPiGenerator = (gen) => {
            let q = 0;
            for (let i = gen.len; i > 0; i -= 1) {
              const x = 10 * gen.arr[i - 1] + q * i;
              gen.arr[i - 1] = x % (2 * i - 1);
              q = Math.floor(x / (2 * i - 1));
            }
            gen.arr[0] = q % 10;
            q = Math.floor(q / 10);
  
            if (q === 9) {
              gen.nines += 1;
              return "";
            }
            if (q === 10) {
              const chunk = String(gen.predigit + 1) + "0".repeat(gen.nines);
              gen.predigit = 0;
              gen.nines = 0;
              return chunk;
            }
            let chunk = String(gen.predigit);
            gen.predigit = q;
            if (gen.nines) {
              chunk += "9".repeat(gen.nines);
              gen.nines = 0;
            }
            return chunk;
          };
  
          const refillPiQueue = (target = 32) => {
            if (!piGenerator) return;
            let guard = 0;
            while (piPendingDigits.length < target && guard < 200) {
              const chunk = stepPiGenerator(piGenerator);
              if (chunk.length) {
                for (let i = 0; i < chunk.length; i += 1) {
                  const ch = chunk.charAt(i);
                  if (!piDroppedLeadDigit) {
                    piDroppedLeadDigit = true;
                    continue;
                  }
                  piPendingDigits.push(ch);
                  if (!piInsertedDot) {
                    piPendingDigits.push(".");
                    piInsertedDot = true;
                  }
                }
              }
              guard += 1;
            }
          };
  
          const seedPiDigits = () => {
            piCols = 100;
            piGenerator = createPiGenerator();
            piPendingDigits = [];
            piDroppedLeadDigit = false;
            piInsertedDot = false;
            piLastEmitAt = 0;
            refillPiQueue(64);
            p.textFont("monospace");
            piCellWidth = p.width / piCols;
            piFontSize = 22;
            p.textSize(piFontSize);
            while (piFontSize > 1 && p.textWidth("0") > piCellWidth) {
              piFontSize -= 0.5;
              p.textSize(piFontSize);
            }
            piCharWidth = p.textWidth("0");
            piLineHeight = Math.max(3, Math.floor(piFontSize * 1.2));
            piRows = Math.max(1, Math.floor((p.height - 4) / piLineHeight));
            piGridRows = Array.from({ length: piRows }, () => new Array(piCols).fill(" "));
            piColorRows = Array.from({ length: piRows }, () => new Array(piCols).fill([184, 214, 255]));
            piCellCursor = 0;
            piFadeAlpha = 255;
            piIsFading = false;
          };
  
          const shuffleCircleTargets = () => {
            if (!circleGrid.length) return;
            const toggles = Math.max(2, Math.floor(circleGrid.length * 0.08));
            for (let i = 0; i < toggles; i += 1) {
              const idx = Math.floor(p.random(circleGrid.length));
              const cell = circleGrid[idx];
              if (!cell) continue;
              if (cell.targetAlpha > 10) {
                cell.targetAlpha = 0;
              } else {
                cell.targetAlpha = p.random(84, 148);
                cell.fillColor = vividCirclePalette[Math.floor(p.random(vividCirclePalette.length))] || [255, 255, 255];
              }
            }
            nextCircleShuffleAt = p.millis() + p.random(900, 1900);
          };

          const seedMountainScene = () => {
            mountainStars.length = 0;
            mountainRanges.length = 0;
            mountainShootingStars.length = 0;
            mountainBirds.length = 0;
            mountainUfos.length = 0;
            mountainPeople.length = 0;
            mountainApproachPeople.length = 0;
            mountainCars.length = 0;
            mountainImpactBursts.length = 0;
            mountainUfoBeams.length = 0;
            mountainPanX = 0;
            mountainWorldWidth = Math.max(p.width * 2.6, 2200);
            mountainHorizonY = p.height * 0.75;
            mountainNextShootingStarAt = p.millis() + p.random(1400, 3600);
            mountainNextUfoAt = p.millis() + p.random(9000, 15000);
            const starCount = Math.max(36, Math.floor((p.width * p.height) / 42000));
            for (let i = 0; i < starCount; i += 1) {
              mountainStars.push({
                x: p.random(mountainWorldWidth),
                y: p.random(p.height * 0.62),
                size: p.random(1.2, 3.2),
                alpha: p.random(90, 220),
                twinkle: p.random(Math.PI * 2),
                twinkleSpeed: p.random(0.004, 0.014)
              });
            }

            const birdCount = Math.floor(p.random(6, 12));
            const birdDepths = [
              { scale: 0.42, speedMin: 0.22, speedMax: 0.4, alpha: 92 },
              { scale: 0.68, speedMin: 0.38, speedMax: 0.7, alpha: 138 },
              { scale: 1.0, speedMin: 0.72, speedMax: 1.18, alpha: 210 }
            ];
            for (let i = 0; i < birdCount; i += 1) {
              const depth = birdDepths[Math.floor(p.random(birdDepths.length))] || birdDepths[1];
              const dir = p.random() < 0.5 ? -1 : 1;
              const bird = {
                x: p.random(-120, p.width + 120),
                y: p.random(p.height * 0.08, p.height * 0.46),
                dir,
                speed: p.random(depth.speedMin, depth.speedMax) * dir,
                scale: depth.scale * p.random(0.9, 1.12),
                alpha: depth.alpha,
                flap: p.random(Math.PI * 2),
                flapSpeed: p.random(0.14, 0.28),
                drift: p.random(-0.18, 0.18),
                mode: "fly",
                targetRunner: null,
                carryingRunner: null,
                vx: 0,
                vy: 0,
                carryUntil: 0,
                dropAltitude: p.height * 0.18
              };
              resetMountainBird(bird, true);
              mountainBirds.push(bird);
            }

            const rangeConfigs = [
              { baseY: mountainHorizonY - (p.height * 0.01), amp: p.height * 0.12, stepMin: 96, stepMax: 182, alpha: 72, weight: 1.5, speed: 0.22, freq: 0.009, jagScale: 0.2, ridgePower: 1.28, detailMix: 0.06 },
              { baseY: mountainHorizonY - (p.height * 0.05), amp: p.height * 0.18, stepMin: 70, stepMax: 134, alpha: 102, weight: 1.9, speed: 0.36, freq: 0.014, jagScale: 0.36, ridgePower: 0.9, detailMix: 0.1 },
              { baseY: mountainHorizonY - (p.height * 0.1), amp: p.height * 0.26, stepMin: 44, stepMax: 90, alpha: 146, weight: 2.3, speed: 0.54, freq: 0.021, jagScale: 0.58, ridgePower: 0.62, detailMix: 0.18 }
            ];

            for (const cfg of rangeConfigs) {
              const points = [];
              let x = -220;
              while (x <= mountainWorldWidth + 220) {
                const noiseY = p.noise((x + 1000) * 0.0022, cfg.baseY * 0.013);
                const ridge = Math.sign(noiseY - 0.5) * Math.pow(Math.abs((noiseY - 0.5) * 2), cfg.ridgePower);
                const jag =
                  (Math.sin(x * cfg.freq + cfg.baseY * 0.03) * cfg.amp * cfg.jagScale) +
                  (Math.sin(x * cfg.freq * 2.6 + 1.4) * cfg.amp * cfg.detailMix);
                const y = Math.min(mountainHorizonY, cfg.baseY - (ridge * cfg.amp) - jag);
                points.push({
                  x,
                  y
                });
                x += p.random(cfg.stepMin, cfg.stepMax);
              }
              mountainRanges.push({
                points,
                alpha: cfg.alpha,
                weight: cfg.weight,
                speed: cfg.speed
              });
            }

            const riderCount = 5;
            for (let i = 0; i < riderCount; i += 1) {
              mountainPeople.push({
                rangeIndex: 0,
                segmentIndex: 0,
                progress: 0,
                slideSpeed: 0,
                state: "slide",
                pathMode: "downhill",
                runDir: 1,
                x: 0,
                y: mountainHorizonY,
                vx: 0,
                vy: 0,
                jumpSegmentIndex: -1,
                highJump: false,
                anim: p.random(Math.PI * 2),
                size: p.random(0.95, 1.7)
              });
            }
            for (const rider of mountainPeople) assignMountainPerson(rider, true);

            const approachCount = Math.floor(p.random(4, 8));
            for (let i = 0; i < approachCount; i += 1) {
              const runner = {
                x: 0,
                y: 0,
                progress: p.random(0, 0.95),
                speed: p.random(0.0026, 0.0058),
                laneOrigin: p.random(-0.42, 0.42),
                drift: p.random(-0.18, 0.18),
                stridePhase: p.random(Math.PI * 2),
                baseSize: p.random(0.72, 1.08),
                hitCooldown: 0,
                grabbedBy: null,
                falling: false,
                fallVx: 0,
                fallVy: 0
              };
              resetMountainApproachRunner(runner, true);
              mountainApproachPeople.push(runner);
            }

            const carCount = Math.floor(p.random(5, 10));
            const depthBands = [
              { y: mountainHorizonY + p.height * 0.05, scale: 0.72, speedMin: 0.34, speedMax: 0.58, alpha: 120 },
              { y: mountainHorizonY + p.height * 0.11, scale: 0.92, speedMin: 0.7, speedMax: 1.05, alpha: 164 },
              { y: mountainHorizonY + p.height * 0.17, scale: 1.15, speedMin: 1.08, speedMax: 1.6, alpha: 220 }
            ];
            for (let i = 0; i < carCount; i += 1) {
              const band = depthBands[Math.floor(p.random(depthBands.length))] || depthBands[1];
              const dir = p.random() < 0.5 ? -1 : 1;
              mountainCars.push({
                x: p.random(-80, p.width + 80),
                y: band.y + p.random(-6, 6),
                dir,
                speed: p.random(band.speedMin, band.speedMax) * dir,
                scale: band.scale * p.random(0.92, 1.08),
                alpha: band.alpha,
                body: p.random(120, 220),
                wheel: p.random(150, 240)
              });
            }
          };

          const getMountainRangeShift = (range, rangeOffset) => {
            const firstX = range.points[0]?.x ?? -220;
            const lastX = range.points[range.points.length - 1]?.x ?? (mountainWorldWidth + 220);
            let shift = -rangeOffset;
            while ((firstX + shift) > -260) shift -= mountainWorldWidth;
            while ((lastX + shift) < (p.width + 260)) shift += mountainWorldWidth;
            return shift;
          };

          const resetMountainBird = (bird, initial = false) => {
            const dir = p.random() < 0.5 ? -1 : 1;
            const startBeyond = initial ? p.random(-120, p.width + 120) : (dir > 0 ? -140 : p.width + 140);
            bird.x = startBeyond;
            bird.y = p.random(p.height * 0.08, p.height * 0.46);
            bird.dir = dir;
            bird.speed = Math.abs(bird.speed || p.random(0.3, 1.1)) * dir;
            bird.mode = "fly";
            bird.targetRunner = null;
            bird.carryingRunner = null;
            bird.vx = bird.speed;
            bird.vy = 0;
            bird.carryUntil = 0;
            bird.dropAltitude = p.random() < 0.32
              ? p.random(p.height * 0.04, p.height * 0.11)
              : p.random(p.height * 0.14, p.height * 0.24);
          };

          const resetMountainApproachRunner = (runner, initial = false) => {
            runner.progress = initial ? p.random(0, 0.95) : p.random(0, 0.08);
            runner.speed = p.random(0.0026, 0.0058);
            runner.laneOrigin = p.random(-0.42, 0.42);
            runner.drift = p.random(-0.18, 0.18);
            runner.baseSize = p.random(0.72, 1.08);
            runner.hitCooldown = 0;
            runner.grabbedBy = null;
            runner.falling = false;
            runner.fallVx = 0;
            runner.fallVy = 0;
            runner.x = 0;
            runner.y = mountainHorizonY;
          };

          const assignMountainPerson = (person, initial = false) => {
            const frontRangeIndex = Math.max(0, mountainRanges.length - 1);
            const range = mountainRanges[frontRangeIndex];
            if (!range || range.points.length < 2) return;
            const downhillCandidates = [];
            const uphillCandidates = [];
            for (let i = 0; i < range.points.length - 1; i += 1) {
              const a = range.points[i];
              const b = range.points[i + 1];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              if (dx <= 8) continue;
              if (dy >= 8 && b.y >= mountainHorizonY - 4) downhillCandidates.push(i);
              if (dy <= -8 && a.y < mountainHorizonY - 30 && b.y < mountainHorizonY - 54) uphillCandidates.push(i);
            }
            const prefersUphill = uphillCandidates.length > 0 && p.random() < 0.38;
            const segmentPool = prefersUphill ? uphillCandidates : downhillCandidates;
            const segmentIndex = segmentPool[Math.floor(p.random(segmentPool.length))] ?? Math.floor(p.random(Math.max(1, range.points.length - 1)));
            const startProgress = prefersUphill
              ? (initial ? p.random(0.02, 0.38) : p.random(0.02, 0.18))
              : (initial ? p.random(0.04, 0.82) : p.random(0.02, 0.28));
            person.rangeIndex = frontRangeIndex;
            person.segmentIndex = segmentIndex;
            person.progress = startProgress;
            person.slideSpeed = p.random(0.0032, 0.0074);
            person.state = prefersUphill ? "climb" : "slide";
            person.pathMode = prefersUphill ? "uphill-jump" : "downhill";
            person.runDir = p.random() < 0.5 ? -1 : 1;
            person.vx = 0;
            person.vy = 0;
            person.jumpSegmentIndex = prefersUphill ? segmentIndex : -1;
            person.highJump = prefersUphill && p.random() < 0.38;
            person.anim = p.random(Math.PI * 2);
            person.size = p.random(0.95, 1.7);
          };

          const spawnMountainShootingStar = () => {
            const moveLeft = p.random() < 0.42;
            const startX = moveLeft
              ? p.random(p.width * 0.18, p.width * 0.96)
              : p.random(p.width * 0.04, p.width * 0.82);
            const startY = p.random(p.height * 0.08, p.height * 0.32);
            const speed = p.random(5.8, 8.2);
            const angle = moveLeft ? p.random(2.18, 2.86) : p.random(0.2, 0.92);
            mountainShootingStars.push({
              x: startX,
              y: startY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: p.random(2.1, 3.6),
              alpha: p.random(180, 245),
              trail: []
            });
          };

          const spawnMountainUfo = (initial = false) => {
            const dir = p.random() < 0.5 ? -1 : 1;
            const scale = p.random(1.5, 2.4);
            const startX = initial
              ? p.random(p.width * 0.14, p.width * 0.86)
              : (dir > 0 ? -240 : p.width + 240);
            const flightBandTop = p.height * 0.12;
            const flightBandBottom = p.height * 0.3;
            mountainUfos.push({
              x: startX,
              y: p.random(flightBandTop, flightBandBottom),
              dir,
              speed: p.random(0.36, 0.62) * dir,
              scale,
              alpha: p.random(176, 224),
              bob: p.random(Math.PI * 2),
              bobSpeed: p.random(0.012, 0.024),
              drift: p.random(-0.022, 0.022),
              trail: [],
              trailEmitAt: 0,
              trailInterval: p.random(42, 78),
              nextAttackAt: p.millis() + p.random(3800, 9000),
              beamBurstRemaining: 0,
              nextBeamAt: 0
            });
          };

          const createOrbitalHoleCandidate = (existingHoles = orbitalBlackHoles) => {
            const centerX = p.width * 0.5;
            const centerY = p.height * 0.5;
            const minFromCenter = Math.min(p.width, p.height) * 0.3;
            const minBetweenHoles = Math.min(p.width, p.height) * 0.2;
            for (let attempts = 0; attempts < 80; attempts += 1) {
              const candidate = {
                x: p.random(p.width * 0.08, p.width * 0.92),
                y: p.random(p.height * 0.08, p.height * 0.88),
                r: p.random(12, 54),
                vx: p.random(-0.02, 0.02),
                vy: p.random(-0.02, 0.02)
              };
              const distToCenter = Math.hypot(candidate.x - centerX, candidate.y - centerY);
              if (distToCenter < minFromCenter) continue;
              let tooCloseToOtherHole = false;
              for (const hole of existingHoles) {
                if (Math.hypot(candidate.x - hole.x, candidate.y - hole.y) < minBetweenHoles) {
                  tooCloseToOtherHole = true;
                  break;
                }
              }
              if (tooCloseToOtherHole) continue;
              return candidate;
            }
            return {
              x: p.random(p.width * 0.08, p.width * 0.92),
              y: p.random(p.height * 0.08, p.height * 0.88),
              r: p.random(12, 54),
              vx: p.random(-0.02, 0.02),
              vy: p.random(-0.02, 0.02)
            };
          };

          const placeOrbitalBlackHoles = () => {
            const holeCount = 10;
            orbitalBlackHoles.length = 0;
            for (let i = 0; i < holeCount; i += 1) {
              orbitalBlackHoles.push(createOrbitalHoleCandidate(orbitalBlackHoles));
            }
          };

          const updateOrbitalBlackHoles = () => {
            if (orbitalBlackHoles.length === 0) return;

            if (orbitalBlackHoles.length >= 2) {
              let pairA = 0;
              let pairB = 1;
              let pairDist = Math.hypot(
                orbitalBlackHoles[1].x - orbitalBlackHoles[0].x,
                orbitalBlackHoles[1].y - orbitalBlackHoles[0].y
              );

              for (let i = 0; i < orbitalBlackHoles.length; i += 1) {
                for (let j = i + 1; j < orbitalBlackHoles.length; j += 1) {
                  const d = Math.hypot(
                    orbitalBlackHoles[j].x - orbitalBlackHoles[i].x,
                    orbitalBlackHoles[j].y - orbitalBlackHoles[i].y
                  );
                  if (d < pairDist) {
                    pairDist = d;
                    pairA = i;
                    pairB = j;
                  }
                }
              }

              const a = orbitalBlackHoles[pairA];
              const b = orbitalBlackHoles[pairB];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const d = Math.max(0.001, Math.hypot(dx, dy));
              const nx = dx / d;
              const ny = dy / d;
              const tx = -ny;
              const ty = nx;
              const orbitKick = 0.055;
              const inward = Math.min(0.12, 48 / d);

              a.vx += tx * orbitKick + nx * inward;
              a.vy += ty * orbitKick + ny * inward;
              b.vx -= tx * orbitKick + nx * inward;
              b.vy -= ty * orbitKick + ny * inward;

              const mergeDist = (a.r + b.r) * 0.9;
              if (d <= mergeDist) {
                const aArea = a.r * a.r;
                const bArea = b.r * b.r;
                const totalArea = Math.max(0.001, aArea + bArea);
                const mergedHole = {
                  x: ((a.x * aArea) + (b.x * bArea)) / totalArea,
                  y: ((a.y * aArea) + (b.y * bArea)) / totalArea,
                  r: Math.sqrt(aArea + bArea),
                  vx: ((a.vx || 0) * aArea + (b.vx || 0) * bArea) / totalArea,
                  vy: ((a.vy || 0) * aArea + (b.vy || 0) * bArea) / totalArea
                };

                orbitalBlackHoles.splice(pairB, 1);
                orbitalBlackHoles.splice(pairA, 1);
                orbitalBlackHoles.push(mergedHole);
                orbitalBlackHoles.push(createOrbitalHoleCandidate(orbitalBlackHoles));
              }
            }

            while (orbitalBlackHoles.length < 10) {
              orbitalBlackHoles.push(createOrbitalHoleCandidate(orbitalBlackHoles));
            }

            for (const hole of orbitalBlackHoles) {
              hole.vx = (hole.vx || 0) * 0.986;
              hole.vy = (hole.vy || 0) * 0.986;
              hole.x += hole.vx;
              hole.y += hole.vy;

              if (hole.x < hole.r) {
                hole.x = hole.r;
                hole.vx = Math.abs(hole.vx || 0) * 0.72;
              } else if (hole.x > p.width - hole.r) {
                hole.x = p.width - hole.r;
                hole.vx = -Math.abs(hole.vx || 0) * 0.72;
              }

              if (hole.y < hole.r) {
                hole.y = hole.r;
                hole.vy = Math.abs(hole.vy || 0) * 0.72;
              } else if (hole.y > p.height - hole.r) {
                hole.y = p.height - hole.r;
                hole.vy = -Math.abs(hole.vy || 0) * 0.72;
              }
            }
          };

          const seedOrbitalBeams = () => {
            orbitalBeams.length = 0;
            orbitalBubbles.length = 0;
            orbitalRaiders.length = 0;
            orbitalRaiderShots.length = 0;
            orbitalNextShotAt = p.millis() + p.random(260, 520);
            orbitalNextRaiderAt = p.millis() + 10000;
            orbitalNextColorShiftAt = p.millis() + 5000;
            const seedColor = orbitalNeonPalette[Math.floor(p.random(orbitalNeonPalette.length))] || orbitalNeonPalette[0];
            orbitalPhaseBubbleColor = [seedColor[0], seedColor[1], seedColor[2]];
            orbitalOrbAngle = p.random(Math.PI * 2);
            orbitalOrbSpin = p.random(0.012, 0.026);
            placeOrbitalBlackHoles();
          };

          const drawOrbitalWarpGrid = () => {
            if (orbitalBlackHoles.length === 0) return;

            const spacing = Math.max(26, Math.floor(Math.min(p.width, p.height) / 24));
            const maxPull = Math.max(16, spacing * 1.45);
            const sampleStep = Math.max(10, Math.floor(spacing * 0.34));

            const warpPoint = (x, y) => {
              let wx = x;
              let wy = y;
              for (const hole of orbitalBlackHoles) {
                const dx = x - hole.x;
                const dy = y - hole.y;
                const d = Math.max(0.001, Math.hypot(dx, dy));
                const influence = (hole.r * hole.r * 56) / ((d * d) + 180);
                const pull = Math.min(maxPull, influence);
                wx -= (dx / d) * pull;
                wy -= (dy / d) * pull;
              }
              return { x: wx, y: wy };
            };

            const drawWarpedHLine = (y, xStart, xEnd) => {
              p.beginShape();
              for (let x = xStart; x <= xEnd; x += sampleStep) {
                const pt = warpPoint(x, y);
                p.vertex(pt.x, pt.y);
              }
              if ((xEnd - xStart) % sampleStep !== 0) {
                const pt = warpPoint(xEnd, y);
                p.vertex(pt.x, pt.y);
              }
              p.endShape();
            };

            const drawWarpedVLine = (x, yStart, yEnd) => {
              p.beginShape();
              for (let y = yStart; y <= yEnd; y += sampleStep) {
                const pt = warpPoint(x, y);
                p.vertex(pt.x, pt.y);
              }
              if ((yEnd - yStart) % sampleStep !== 0) {
                const pt = warpPoint(x, yEnd);
                p.vertex(pt.x, pt.y);
              }
              p.endShape();
            };

            p.noFill();
            p.strokeWeight(1);
            p.stroke(214, 226, 255, 16);

            for (let y = 0; y <= p.height + spacing; y += spacing) {
              drawWarpedHLine(y, 0, p.width + spacing);
            }

            for (let x = 0; x <= p.width + spacing; x += spacing) {
              drawWarpedVLine(x, 0, p.height + spacing);
            }

            // Add local sub-grids with progressively tighter spacing near each black hole.
            for (const hole of orbitalBlackHoles) {
              const layers = [
                { radius: hole.r * 4.8, lineSpacing: Math.max(10, spacing * 0.5), alpha: 12 },
                { radius: hole.r * 3.2, lineSpacing: Math.max(8, spacing * 0.34), alpha: 16 },
                { radius: hole.r * 2.1, lineSpacing: Math.max(6, spacing * 0.22), alpha: 22 }
              ];

              for (const layer of layers) {
                const left = Math.max(0, hole.x - layer.radius);
                const right = Math.min(p.width, hole.x + layer.radius);
                const top = Math.max(0, hole.y - layer.radius);
                const bottom = Math.min(p.height, hole.y + layer.radius);

                p.stroke(222, 234, 255, layer.alpha);

                for (let y = top; y <= bottom; y += layer.lineSpacing) {
                  drawWarpedHLine(y, left, right);
                }

                for (let x = left; x <= right; x += layer.lineSpacing) {
                  drawWarpedVLine(x, top, bottom);
                }
              }
            }
          };

          const drawMountainRangeLine = (range, rangeOffset) => {
            p.stroke(244, 244, 244, range.alpha);
            p.strokeWeight(range.weight);
            const shift = getMountainRangeShift(range, rangeOffset);

            p.beginShape();
            for (const pt of range.points) {
              p.vertex(pt.x + shift, pt.y);
            }
            p.endShape();
          };

          const drawMountainRangeMask = (range, rangeOffset) => {
            p.noStroke();
            p.fill(0, 0, 0, 255);
            const shift = getMountainRangeShift(range, rangeOffset);

            p.beginShape();
            p.vertex(-40, mountainHorizonY);
            for (const pt of range.points) {
              p.vertex(pt.x + shift, pt.y);
            }
            p.vertex(p.width + 40, mountainHorizonY);
            p.endShape(p.CLOSE);
          };
  
          const seedMatrixRain = () => {
            matrixDrops.length = 0;
            matrixBaseColor = matrixBasePalette[Math.floor(p.random(matrixBasePalette.length))] || [230, 64, 64];
            matrixDirection = matrixDirections[Math.floor(p.random(matrixDirections.length))] || matrixDirections[0];
            matrixFontSize = Math.max(14, Math.min(22, Math.floor(p.width / 64)));
            const streamCount = Math.max(16, Math.floor(Math.max(p.width, p.height) / matrixFontSize * 1.35));
  
            placeMatrixDrop = (drop, initial = false) => {
              const margin = matrixFontSize * 30;
  
              if (matrixDirection.name === "meander") {
                drop.x = p.random(0, p.width);
                drop.y = p.random(0, p.height);
                const theta = p.random(0, Math.PI * 2);
                drop.vx = Math.cos(theta);
                drop.vy = Math.sin(theta);
              } else if (matrixDirection.name === "up") {
                drop.x = p.random(0, p.width);
                drop.y = p.random(p.height + 20, p.height + margin);
              } else if (matrixDirection.name === "down") {
                drop.x = p.random(0, p.width);
                drop.y = p.random(-margin, -20);
              } else if (matrixDirection.name === "right") {
                drop.x = p.random(-margin, -20);
                drop.y = p.random(0, p.height);
              } else if (matrixDirection.name === "left") {
                drop.x = p.random(p.width + 20, p.width + margin);
                drop.y = p.random(0, p.height);
              } else if (matrixDirection.name === "diag-bl-tr") {
                if (p.random() < 0.5) {
                  drop.x = p.random(-margin, -20);
                  drop.y = p.random(0, p.height + margin);
                } else {
                  drop.x = p.random(0, p.width + margin);
                  drop.y = p.random(p.height + 20, p.height + margin);
                }
              } else {
                if (p.random() < 0.5) {
                  drop.x = p.random(p.width + 20, p.width + margin);
                  drop.y = p.random(0, p.height + margin);
                } else {
                  drop.x = p.random(0, p.width + margin);
                  drop.y = p.random(p.height + 20, p.height + margin);
                }
              }
  
              if (initial && matrixDirection.name !== "meander") {
                const backfill = p.random(0, Math.max(p.width, p.height) * 1.2);
                drop.x -= matrixDirection.vx * backfill;
                drop.y -= matrixDirection.vy * backfill;
              }
            };
  
            for (let i = 0; i < streamCount; i += 1) {
              const drop = {
                x: 0,
                y: 0,
                speed: p.random(1.8, 4.2),
                length: Math.floor(p.random(10, 28)),
                vx: matrixDirection.vx,
                vy: matrixDirection.vy,
                turnRate: p.random(0.04, 0.12)
              };
              placeMatrixDrop(drop, true);
              matrixDrops.push(drop);
            }
          };
  
          const seedLife = () => {
            lifeCellSize = p.constrain(Math.floor(Math.min(p.width, p.height) / 72), 8, 14);
            lifeCols = Math.max(24, Math.floor(p.width / lifeCellSize));
            lifeRows = Math.max(16, Math.floor(p.height / lifeCellSize));
            const n = lifeCols * lifeRows;
            lifeGrid = new Uint8Array(n);
            lifeNext = new Uint8Array(n);
            lifeAge = new Uint16Array(n);
            lifeLastStepAt = 0;
            lifeStepMs = Math.round(p.random(95, 150));
  
            for (let y = 0; y < lifeRows; y += 1) {
              for (let x = 0; x < lifeCols; x += 1) {
                const i = y * lifeCols + x;
                // Dense-ish seeded field with softer edges.
                const edge = Math.min(x, y, lifeCols - x - 1, lifeRows - y - 1);
                const edgeFactor = p.constrain(edge / 8, 0.35, 1);
                lifeGrid[i] = p.random() < (0.26 * edgeFactor) ? 1 : 0;
              }
            }
          };
  
          const lifeNeighbors = (x, y) => {
            let count = 0;
            for (let dy = -1; dy <= 1; dy += 1) {
              for (let dx = -1; dx <= 1; dx += 1) {
                if (dx === 0 && dy === 0) continue;
                const nx = (x + dx + lifeCols) % lifeCols;
                const ny = (y + dy + lifeRows) % lifeRows;
                count += lifeGrid[ny * lifeCols + nx];
              }
            }
            return count;
          };
  
          const stepLife = () => {
            let aliveCount = 0;
            for (let y = 0; y < lifeRows; y += 1) {
              for (let x = 0; x < lifeCols; x += 1) {
                const i = y * lifeCols + x;
                const alive = lifeGrid[i] === 1;
                const n = lifeNeighbors(x, y);
                let nextAlive = 0;
                if (alive && (n === 2 || n === 3)) nextAlive = 1;
                if (!alive && n === 3) nextAlive = 1;
                lifeNext[i] = nextAlive;
                if (nextAlive) {
                  lifeAge[i] = alive ? Math.min(60000, lifeAge[i] + 1) : 1;
                  aliveCount += 1;
                } else {
                  lifeAge[i] = 0;
                }
              }
            }
  
            const tmp = lifeGrid;
            lifeGrid = lifeNext;
            lifeNext = tmp;
  
            // Reseed if it dies out too far.
            if (aliveCount < (lifeCols * lifeRows * 0.02)) seedLife();
          };
  
          const seedCodeWriter = () => {
            codeFontSize = p.constrain(Math.floor(Math.min(p.width, p.height) / 56), 13, 18);
            codeLineHeight = Math.round(codeFontSize * 1.45);
            codeVisibleRows = Math.max(10, Math.floor((p.height - 40) / codeLineHeight));
            codeQueue = [];
            codeRendered = [];
            codeLineIndex = 0;
            codeCharIndex = 0;
            codeLastTypeAt = 0;
            codePauseUntil = 0;
            codeTypeInterval = p.random(22, 46);
  
            const templates = [
              "using System;",
              "using System.Collections.Generic;",
              "// Boot sequence for splash simulation",
              "namespace Toji.Studio;",
              "/// <summary>Simulates a terminal-like code stream.</summary>",
              "public sealed class SplashRenderer",
              "{",
              "    // Stores visible lines in the fake terminal.",
              "    private readonly List<string> _lines = new();",
              "    private readonly Random _rng = new();",
              "    public int Frame { get; private set; }",
              "    public void Tick()",
              "    {",
                  "        Frame++;",
              "        if (Frame % 2 == 0) _lines.Add($\"frame:{Frame}\"); // type every other frame",
              "        if (_lines.Count > 120) _lines.RemoveAt(0);",
              "    }",
              "    // Returns a snapshot used by the painter.",
              "    public string[] Snapshot() => _lines.ToArray();",
              "}",
              "public static class ThemeService",
              "{",
              "    // Resolve desired UI theme mode.",
              "    public static string Resolve(string mode) =>",
              "        mode switch { \"dark\" => \"dark\", \"light\" => \"light\", _ => \"system\" };",
              "}",
              "// Minimal API sample",
              "var app = WebApplication.CreateBuilder(args).Build();",
              "app.MapGet(\"/api/health\", () => Results.Ok(new { status = \"ok\" }));",
              "app.MapPost(\"/api/save\", (Payload p) => Results.Json(p));",
              "app.Run();",
              "/// <remarks>Simple DTO for demo output.</remarks>",
              "public record Payload(string Title, string Body, DateTime UpdatedAt);"
            ];
  
            const totalLines = 180;
            for (let i = 0; i < totalLines; i += 1) {
              const raw = templates[Math.floor(p.random(templates.length))];
              const indent = " ".repeat(Math.floor(p.random(0, 4)) * 2);
              codeQueue.push(indent + raw);
            }
          };
  
          const seedPlot = () => {
            plotGhostFrames.length = 0;
            plotAmplitude = p.random(0.75, 1.35);
            plotFreq = p.random(0.8, 2.4);
            plotPhase = p.random(Math.PI * 2);
            const types = [
              "harmonic-rational",
              "chirped-damped",
              "nonlinear-wave",
              "sigmoid-oscillation"
            ];
            plotType = types[Math.floor(p.random(types.length))] || "sin";
            plotAxisColor = [p.random(90, 140), p.random(100, 150), p.random(120, 180)];
            plotLineColor = [p.random(120, 255), p.random(140, 255), p.random(160, 255)];
            plotParams = {};
  
            const A = plotAmplitude.toFixed(2);
            const W = plotFreq.toFixed(2);
            const P = plotPhase.toFixed(2);
            if (plotType === "harmonic-rational") {
              const b = p.random(0.25, 0.85);
              const h = p.random(1.8, 3.4);
              plotParams = { b, h };
              plotLabel = `f(x) = ${A}[sin(${W}pi x+${P}) + 0.45cos(${(plotFreq * h).toFixed(2)}pi x)] / (1+${b.toFixed(2)}x^2)`;
            } else if (plotType === "chirped-damped") {
              const chirp = p.random(0.6, 1.4);
              const damp = p.random(0.55, 1.35);
              const mix = p.random(0.2, 0.5);
              plotParams = { chirp, damp, mix };
              plotLabel = `f(x) = ${A}e^(-${damp.toFixed(2)}|x|) sin(${W}pi x + ${chirp.toFixed(2)}x^2 + ${P}) + ${mix.toFixed(2)}x`;
            } else if (plotType === "nonlinear-wave") {
              const c = p.random(0.35, 0.95);
              const d = p.random(0.9, 1.9);
              plotParams = { c, d };
              plotLabel = `f(x) = ${A}tanh(${d.toFixed(2)}x) sin(${W}pi x+${P}) + ${c.toFixed(2)}cos(3pi x)/(1+x^2)`;
            } else if (plotType === "sigmoid-oscillation") {
              const s = p.random(1.1, 2.4);
              const q = p.random(0.25, 0.7);
              plotParams = { s, q };
              plotLabel = `f(x) = ${A}(2/(1+e^(-${s.toFixed(2)}x))-1) + ${q.toFixed(2)}sin(${(plotFreq * 2).toFixed(2)}pi x + ${P})`;
            } else {
              plotLabel = `f(x) = ${A} sin(${W}pi x + ${P})`;
            }
          };
  
          const evalPlot = (xNorm, t) => {
            if (plotType === "harmonic-rational") {
              const b = Number(plotParams.b || 0.5);
              const h = Number(plotParams.h || 2.4);
              const num =
                Math.sin((xNorm * plotFreq * Math.PI) + plotPhase + t * 0.52) +
                0.45 * Math.cos((xNorm * plotFreq * Math.PI * h) - plotPhase * 0.35 + t * 0.28);
              return (plotAmplitude * num) / (1 + b * xNorm * xNorm * 2.4);
            }
            if (plotType === "chirped-damped") {
              const chirp = Number(plotParams.chirp || 1);
              const damp = Number(plotParams.damp || 1);
              const mix = Number(plotParams.mix || 0.35);
              const wave = Math.sin((xNorm * plotFreq * Math.PI) + (chirp * xNorm * xNorm * 1.5) + plotPhase + t * 0.58);
              const env = Math.exp(-damp * Math.abs(xNorm) * 1.1);
              return plotAmplitude * env * wave + mix * xNorm;
            }
            if (plotType === "nonlinear-wave") {
              const c = Number(plotParams.c || 0.6);
              const d = Number(plotParams.d || 1.2);
              return (
                plotAmplitude * Math.tanh(d * xNorm) * Math.sin((xNorm * plotFreq * Math.PI) + plotPhase + t * 0.48) +
                c * Math.cos((xNorm * Math.PI * 3.0) - t * 0.22) / (1 + xNorm * xNorm * 2.2)
              );
            }
            if (plotType === "sigmoid-oscillation") {
              const s = Number(plotParams.s || 1.7);
              const q = Number(plotParams.q || 0.4);
              const sig = 2 / (1 + Math.exp(-s * xNorm)) - 1;
              return plotAmplitude * sig + q * Math.sin((xNorm * plotFreq * Math.PI * 2) + plotPhase + t * 0.62);
            }
            return plotAmplitude * Math.sin((xNorm * plotFreq * Math.PI) + plotPhase + t * 0.7);
          };
  
          const spawnBounceBall = () => {
            const radius = p.random(12, 20);
            return {
              x: p.random(p.width * 0.25, p.width * 0.75),
              y: -radius - p.random(0, 40),
              vx: p.random(-1.35, 1.35),
              vy: p.random(0.4, 1.2),
              r: radius,
              gravity: p.random(0.28, 0.44),
              bounce: p.random(0.78, 0.88),
              drag: p.random(0.997, 0.9995),
              wasTouchingLogo: false,
              bottomBounces: 0,
              color: [
                Math.floor(p.random(90, 256)),
                Math.floor(p.random(90, 256)),
                Math.floor(p.random(90, 256))
              ]
            };
          };
  
          const seedBounce = () => {
            bounceBalls = [];
            bounceTrails = [];
            for (let i = 0; i < bounceBallCount; i += 1) {
              bounceBalls.push(spawnBounceBall());
            }
          };
  
          const dukeRectOverlap = (a, b) =>
            a.x < (b.x + b.w) &&
            (a.x + a.w) > b.x &&
            a.y < (b.y + b.h) &&
            (a.y + a.h) > b.y;
  
          const spawnDukeExplosion = (x, y, palette = [255, 210, 96]) => {
            for (let i = 0; i < 10; i += 1) {
              dukeExplosions.push({
                x,
                y,
                vx: p.random(-2.8, 2.8),
                vy: p.random(-3.6, 1.2),
                life: p.random(20, 36),
                color: [
                  Math.min(255, palette[0] + p.random(-10, 30)),
                  Math.min(255, palette[1] + p.random(-30, 30)),
                  Math.max(0, palette[2] + p.random(-40, 18))
                ]
              });
            }
          };
  
          const seedDukeNukem = () => {
            dukePlatforms.length = 0;
            dukeEnemies.length = 0;
            dukeBullets.length = 0;
            dukeExplosions.length = 0;
            dukePickups.length = 0;
            dukeBackdropBuildings.length = 0;
            dukeGroundY = p.height * 0.82;
            dukeScrollX = 0;
            dukeSpawnX = p.width;
            dukeNextShotAt = 0;
            dukeNextEnemyShotAt = 0;
            dukeScore = 0;
            dukeCycleSeed += 1;
            dukeLevelLabel = ["SHRAPNEL CITY", "TOXIC TUNNELS", "ROBOT DISTRICT"][dukeCycleSeed % 3];
            dukePlayer = {
              screenX: p.width * 0.26,
              y: dukeGroundY - 40,
              w: 18,
              h: 36,
              vy: 0,
              onGround: true,
              jumpLockUntil: 0,
              facing: 1,
              health: 8,
              invulnUntil: 0
            };
  
            for (let i = 0; i < 14; i += 1) {
              dukeBackdropBuildings.push({
                x: p.random(-80, p.width + 180),
                w: p.random(60, 160),
                h: p.random(p.height * 0.14, p.height * 0.38),
                layer: i % 2
              });
            }
  
            const addChunk = () => {
              const chunkStart = dukeSpawnX;
              const chunkWidth = p.random(180, 320);
              const variant = Math.floor(p.random(0, 6));
  
              if (variant === 0 || variant === 1) {
                dukePlatforms.push({
                  x: chunkStart + p.random(26, 58),
                  y: dukeGroundY - p.random(88, 148),
                  w: p.random(110, 190),
                  h: 14,
                  style: "catwalk"
                });
              } else if (variant === 2) {
                dukePlatforms.push({
                  x: chunkStart + p.random(40, 72),
                  y: dukeGroundY - p.random(54, 96),
                  w: p.random(72, 118),
                  h: p.random(30, 48),
                  style: "crate"
                });
              } else if (variant === 3) {
                dukePlatforms.push({
                  x: chunkStart + p.random(12, 38),
                  y: dukeGroundY - p.random(70, 118),
                  w: p.random(130, 210),
                  h: 12,
                  style: "beam"
                });
                dukePickups.push({
                  x: chunkStart + p.random(68, 120),
                  y: dukeGroundY - p.random(118, 152),
                  w: 12,
                  h: 12,
                  kind: p.random() < 0.5 ? "chip" : "ammo",
                  bob: p.random(Math.PI * 2)
                });
              } else if (variant === 4) {
                dukePlatforms.push({
                  x: chunkStart + p.random(28, 54),
                  y: dukeGroundY - 34,
                  w: p.random(42, 64),
                  h: p.random(34, 48),
                  style: "crate"
                });
              } else {
                dukePickups.push({
                  x: chunkStart + p.random(44, 120),
                  y: dukeGroundY - p.random(50, 90),
                  w: 12,
                  h: 12,
                  kind: "orb",
                  bob: p.random(Math.PI * 2)
                });
              }
  
              if (p.random() < 0.84) {
                const usePlatform = p.random() < 0.42 && dukePlatforms.length > 0;
                const platform = usePlatform ? dukePlatforms[dukePlatforms.length - 1] : null;
                const baseY = platform && platform.x < chunkStart + chunkWidth
                  ? platform.y - 26
                  : dukeGroundY - 28;
                dukeEnemies.push({
                  x: chunkStart + p.random(70, chunkWidth - 22),
                  y: baseY,
                  w: 18,
                  h: 26,
                  vx: p.random() < 0.5 ? -0.48 : 0.48,
                  range: p.random(26, 74),
                  anchorX: chunkStart + p.random(70, chunkWidth - 22),
                  type: p.random() < 0.55 ? "trooper" : "bot",
                  hp: p.random() < 0.2 ? 2 : 1
                });
              }
  
              dukeSpawnX += chunkWidth;
            };
  
            while (dukeSpawnX < p.width * 2.6) addChunk();
          };
  
          const circleIntersectsRect = (cx, cy, cr, rect) => {
            const nearestX = Math.max(rect.left, Math.min(cx, rect.right));
            const nearestY = Math.max(rect.top, Math.min(cy, rect.bottom));
            const dx = cx - nearestX;
            const dy = cy - nearestY;
            return (dx * dx + dy * dy) <= (cr * cr);
          };
  
          const steerTowards = (boid, target) => {
            const desired = p5.Vector.sub(target, boid.pos);
            const d = desired.mag();
            if (d < 0.001) return p.createVector(0, 0);
            desired.setMag(boid.maxSpeed);
            const steer = desired.sub(boid.vel);
            steer.limit(boid.maxForce);
            return steer;
          };
  
          const updateFlock = () => {
            const sensing = 74;
            const avoid = 28;
  
            const hasMouse = !disableMouseInteraction
              && p.mouseX >= 0
              && p.mouseX <= p.width
              && p.mouseY >= 0
              && p.mouseY <= p.height;
            const target = hasMouse
              ? p.createVector(p.mouseX, p.mouseY)
              : p.createVector(p.width * 0.5, p.height * 0.5);
            mouseTarget.lerp(target, 0.16);
  
            for (const b of flock) {
              let total = 0;
              const align = p.createVector(0, 0);
              const cohesion = p.createVector(0, 0);
              const separation = p.createVector(0, 0);
  
              for (const other of flock) {
                if (other === b) continue;
                const d = p.dist(b.pos.x, b.pos.y, other.pos.x, other.pos.y);
                if (d <= 0 || d > sensing) continue;
  
                align.add(other.vel);
                cohesion.add(other.pos);
                total += 1;
  
                if (d < avoid) {
                  const diff = p5.Vector.sub(b.pos, other.pos);
                  diff.div(Math.max(d * d, 1));
                  separation.add(diff);
                }
              }
  
              b.acc.mult(0);
  
              if (total > 0) {
                align.div(total).setMag(b.maxSpeed).sub(b.vel).limit(b.maxForce);
                cohesion.div(total);
                const cohForce = steerTowards(b, cohesion).mult(0.72);
                const sepForce = separation.setMag(b.maxSpeed).sub(b.vel).limit(b.maxForce * 1.4).mult(1.08);
                b.acc.add(align.mult(0.85));
                b.acc.add(cohForce);
                b.acc.add(sepForce);
              }
  
              const seek = steerTowards(b, mouseTarget).mult(1.25);
              b.acc.add(seek);
            }
  
            for (const b of flock) {
              b.vel.add(b.acc);
              b.vel.limit(b.maxSpeed);
              b.pos.add(b.vel);
  
              if (b.pos.x < -10) b.pos.x = p.width + 10;
              if (b.pos.x > p.width + 10) b.pos.x = -10;
              if (b.pos.y < -10) b.pos.y = p.height + 10;
              if (b.pos.y > p.height + 10) b.pos.y = -10;
            }
          };
  
          const drawFlock = () => {
            p.noStroke();
            for (const b of flock) {
              const theta = b.vel.heading() + p.HALF_PI;
              p.push();
              p.translate(b.pos.x, b.pos.y);
              p.rotate(theta);
              if (b.purple) p.fill(170, 98, 255, 210);
              else p.fill(245, 245, 245, 205);
              p.triangle(0, -b.size * 1.45, -b.size * 0.9, b.size, b.size * 0.9, b.size);
              p.pop();
            }
          };
  
          p.setup = () => {
            const { width, height } = getSplashCanvasSize();
            const canvas = p.createCanvas(width, height);
            canvas.parent(splashP5Host);
            p.pixelDensity(1);
            if (splashMode === "logo3d") {}
            else if (splashMode === "bezier") seedBezierCurves();
            else if (splashMode === "flock") seedFlock();
            else if (splashMode === "pi") seedPiDigits();
            else if (splashMode === "asteroids") seedAsteroids();
            else if (splashMode === "tempest") seedTempest();
            else if (splashMode === "missilecommand") seedMissileCommand();
            else if (splashMode === "mountains") seedMountainScene();
            else if (splashMode === "serpentinesphere") seedSerpentineSphere();
            else if (splashMode === "orbitalbeams") seedOrbitalBeams();
            else if (splashMode === "radar") seedRadarScreen();
            else if (splashMode === "dukenukem") seedDukeNukem();
            else if (splashMode === "turningcircles") seedTurningCircles();
            else if (splashMode === "circles") seedCircleGrid();
            else if (splashMode === "matrix") seedMatrixRain();
            else if (splashMode === "life") seedLife();
            else if (splashMode === "code") seedCodeWriter();
            else if (splashMode === "plot") seedPlot();
            else if (splashMode === "bounce") seedBounce();
            else seedNodes();
          };
  
          p.windowResized = () => {
            const { width, height } = getSplashCanvasSize();
            p.resizeCanvas(width, height);
            if (splashMode === "logo3d") {}
            else if (splashMode === "bezier") seedBezierCurves();
            else if (splashMode === "flock") seedFlock();
            else if (splashMode === "pi") seedPiDigits();
            else if (splashMode === "asteroids") seedAsteroids();
            else if (splashMode === "tempest") seedTempest();
            else if (splashMode === "missilecommand") seedMissileCommand();
            else if (splashMode === "mountains") seedMountainScene();
            else if (splashMode === "serpentinesphere") seedSerpentineSphere();
            else if (splashMode === "orbitalbeams") seedOrbitalBeams();
            else if (splashMode === "radar") seedRadarScreen();
            else if (splashMode === "dukenukem") seedDukeNukem();
            else if (splashMode === "turningcircles") seedTurningCircles();
            else if (splashMode === "circles") seedCircleGrid();
            else if (splashMode === "matrix") seedMatrixRain();
            else if (splashMode === "life") seedLife();
            else if (splashMode === "code") seedCodeWriter();
            else if (splashMode === "plot") seedPlot();
            else if (splashMode === "bounce") seedBounce();
            else seedNodes();
          };
  
          p.draw = () => {
            p.clear();
            p.background(24, 23, 26, 245);
  
            if (splashMode === "logo3d") {
              p.background(8, 8, 12, 252);
              return;
            }
  
            if (splashMode === "bezier") {
              p.noFill();
              for (const c of curves) {
                movePoint(c.p0);
                movePoint(c.p1);
                movePoint(c.p2);
                movePoint(c.p3);
                p.stroke(c.color[0], c.color[1], c.color[2], c.color[3]);
                p.strokeWeight(c.weight);
                p.bezier(c.p0.x, c.p0.y, c.p1.x, c.p1.y, c.p2.x, c.p2.y, c.p3.x, c.p3.y);
              }
              return;
            }

            if (splashMode === "serpentinesphere") {
              drawSerpentineSphere();
              return;
            }
  
            if (splashMode === "flock") {
              updateFlock();
              drawFlock();
              return;
            }
  
            if (splashMode === "pi") {
              p.background(8, 10, 14, 252);
              if (!piGridRows.length) seedPiDigits();
              const totalCells = piCols * piRows;
              const now = p.millis();
  
              if (!piIsFading) {
                if (piCellCursor >= totalCells) {
                  piIsFading = true;
                } else if (!piLastEmitAt || (now - piLastEmitAt) >= piEmitIntervalMs) {
                  if (!piPendingDigits.length) refillPiQueue(32);
                  const nextCh = piPendingDigits.shift() || "0";
                  const row = Math.floor(piCellCursor / piCols);
                  const col = piCellCursor % piCols;
                  piGridRows[row][col] = nextCh;
                  piColorRows[row][col] = [
                    Math.floor(p.random(120, 256)),
                    Math.floor(p.random(120, 256)),
                    Math.floor(p.random(120, 256))
                  ];
                  piDigitCursor += 1;
                  piCellCursor += 1;
                  piLastEmitAt = now;
                }
              } else {
                piFadeAlpha -= 3.2;
                if (piFadeAlpha <= 0) {
                  for (let r = 0; r < piRows; r += 1) {
                    piGridRows[r].fill(" ");
                    piColorRows[r].fill([184, 214, 255]);
                  }
                  piCellCursor = 0;
                  piFadeAlpha = 255;
                  piIsFading = false;
                }
              }
  
              p.textFont("monospace");
              p.textSize(piFontSize);
              p.textAlign(p.LEFT, p.TOP);
              p.noStroke();
              for (let r = 0; r < piRows; r += 1) {
                const y = 4 + (r * piLineHeight);
                for (let c = 0; c < piCols; c += 1) {
                  const ch = piGridRows[r][c];
                  if (ch === " ") continue;
                  const cc = piColorRows[r][c] || [184, 214, 255];
                  p.fill(cc[0], cc[1], cc[2], piIsFading ? piFadeAlpha : 240);
                  const x = (c * piCellWidth) + ((piCellWidth - piCharWidth) * 0.5);
                  p.text(ch, x, y);
                }
              }
              return;
            }
  
            if (splashMode === "tempest") {
              p.background(6, 7, 11, 252);
              const now = p.millis();
              tempestSpin += tempestSpinVel;
              tempestCenterPulse += 0.04;
              if (p.random() < 0.003) tempestSpinVel *= -1;
  
              if (now >= tempestNextSpawnAt) {
                spawnTempestEnemy();
                tempestNextSpawnAt = now + p.random(380, 980);
              }
  
              if (tempestEnemies.length) {
                let targetLane = tempestEnemies[0].lane;
                let targetDepth = -1;
                for (const e of tempestEnemies) {
                  if (e.depth > targetDepth) {
                    targetDepth = e.depth;
                    targetLane = e.lane;
                  }
                }
                const d = laneDelta(tempestPlayerLane, targetLane);
                if (Math.abs(d) > 0.01) tempestPlayerLane = wrapLane(tempestPlayerLane + Math.sign(d));
  
                const threat = tempestEnemies.find(e => e.lane === wrapLane(tempestPlayerLane) && e.depth > 0.18);
                if (threat && now >= tempestNextShotAt) {
                  tempestShots.push({
                    lane: wrapLane(tempestPlayerLane),
                    depth: 1,
                    speed: p.random(0.026, 0.04)
                  });
                  tempestNextShotAt = now + p.random(85, 145);
                }
              }
  
              for (const e of tempestEnemies) {
                e.wobble += 0.07;
                e.depth += e.speed * (1 + (Math.sin(e.wobble) * 0.25));
              }
  
              for (let i = tempestEnemies.length - 1; i >= 0; i -= 1) {
                if (tempestEnemies[i].depth >= 1) {
                  const e = tempestEnemies[i];
                  tempestEnemies.splice(i, 1);
                  tempestBursts.push({ lane: e.lane, life: 20 });
                  tempestPlayerLane = wrapLane(tempestPlayerLane + (p.random() < 0.5 ? -1 : 1));
                  tempestScore = Math.max(0, tempestScore - 40);
                }
              }
  
              for (let i = tempestShots.length - 1; i >= 0; i -= 1) {
                const s = tempestShots[i];
                s.depth -= s.speed;
                if (s.depth <= 0) {
                  tempestShots.splice(i, 1);
                  continue;
                }
                let hitIndex = -1;
                for (let j = tempestEnemies.length - 1; j >= 0; j -= 1) {
                  const e = tempestEnemies[j];
                  if (e.lane !== s.lane) continue;
                  if (Math.abs(e.depth - s.depth) < 0.09) {
                    hitIndex = j;
                    break;
                  }
                }
                if (hitIndex >= 0) {
                  const hit = tempestEnemies[hitIndex];
                  tempestEnemies.splice(hitIndex, 1);
                  tempestShots.splice(i, 1);
                  tempestBursts.push({ lane: hit.lane, life: 24 });
                  tempestScore += 100;
                }
              }
  
              for (let i = tempestBursts.length - 1; i >= 0; i -= 1) {
                tempestBursts[i].life -= 1;
                if (tempestBursts[i].life <= 0) tempestBursts.splice(i, 1);
              }
  
              const ringLevels = 8;
              p.noFill();
              for (let r = 0; r < ringLevels; r += 1) {
                const t = r / (ringLevels - 1);
                p.stroke(94, 120 + (1 - t) * 80, 230, 82 + (1 - t) * 88);
                p.strokeWeight(1.1);
                p.beginShape();
                for (let lane = 0; lane < tempestLaneCount; lane += 1) {
                  const pt = tempestLanePoint(lane, 1 - t);
                  p.vertex(pt.x, pt.y);
                }
                p.endShape(p.CLOSE);
              }
  
              p.stroke(96, 156, 255, 102);
              p.strokeWeight(1);
              for (let lane = 0; lane < tempestLaneCount; lane += 1) {
                const a = tempestLanePoint(lane, 0);
                const b = tempestLanePoint(lane, 1);
                p.line(a.x, a.y, b.x, b.y);
              }
  
              const coreR = 10 + Math.sin(tempestCenterPulse) * 3;
              p.noStroke();
              p.fill(160, 210, 255, 150);
              p.circle(p.width * 0.5, p.height * 0.5, coreR * 2);
  
              p.stroke(255, 182, 106, 240);
              p.strokeWeight(2.2);
              for (const s of tempestShots) {
                const head = tempestLanePoint(s.lane, s.depth);
                const tail = tempestLanePoint(s.lane, Math.min(1, s.depth + 0.06));
                p.line(head.x, head.y, tail.x, tail.y);
              }
  
              const centerX = p.width * 0.5;
              const centerY = p.height * 0.5;
              for (const e of tempestEnemies) {
                const pt = tempestLanePoint(e.lane, e.depth);
                const glow = p.map(e.depth, 0, 1, 140, 240);
                const h = p.map(e.depth, 0, 1, 36, 82);
                const crawl = Math.sin(e.wobble + e.depth * 10);
                const armSwing = crawl * h * 0.16;
                const legSwing = -crawl * h * 0.24;
                const outAngle = Math.atan2(pt.y - centerY, pt.x - centerX) + p.HALF_PI;
                const ec = e.color || [210, 118, 255];
  
                p.push();
                p.translate(pt.x, pt.y);
                p.rotate(outAngle);
                p.stroke(ec[0], ec[1], ec[2], glow);
                p.strokeWeight(1.6);
                p.noFill();
  
                // Head + torso.
                p.circle(0, -h * 0.47, h * 0.28);
                p.line(0, -h * 0.33, 0, h * 0.10);
  
                // Arms.
                p.line(0, -h * 0.18, -h * 0.24, -h * 0.02 + armSwing);
                p.line(0, -h * 0.18, h * 0.24, -h * 0.02 - armSwing);
  
                // Legs.
                p.line(0, h * 0.10, -h * 0.20, h * 0.50 + legSwing);
                p.line(0, h * 0.10, h * 0.20, h * 0.50 - legSwing);
                p.pop();
              }
  
              for (const b of tempestBursts) {
                const lifeT = p.constrain(b.life / 24, 0, 1);
                const pt = tempestLanePoint(b.lane, 0.9);
                p.noFill();
                p.stroke(255, 214, 126, 210 * lifeT);
                p.strokeWeight(1.8);
                p.circle(pt.x, pt.y, p.map(1 - lifeT, 0, 1, 4, 24));
              }
  
              const playerHead = tempestLanePoint(tempestPlayerLane, 1);
              const playerLeft = tempestLanePoint(tempestPlayerLane - 0.34, 0.94);
              const playerRight = tempestLanePoint(tempestPlayerLane + 0.34, 0.94);
              p.noFill();
              p.stroke(180, 255, 212, 240);
              p.strokeWeight(2.2);
              p.triangle(playerHead.x, playerHead.y, playerLeft.x, playerLeft.y, playerRight.x, playerRight.y);
  
              p.noStroke();
              p.fill(224, 236, 255, 230);
              p.textAlign(p.RIGHT, p.TOP);
              p.textFont("monospace");
              p.textSize(18);
              p.text(`Score ${String(tempestScore)}`, p.width - 18, 14);
              return;
            }
  
            if (splashMode === "missilecommand") {
              p.background(8, 10, 16, 252);
              const now = p.millis();
              const groundY = p.height * 0.84;
  
              p.noStroke();
              for (const star of missileStars) {
                const twinkle = 0.72 + (0.28 * Math.sin((now * 0.002) + star.x * 0.02 + star.y * 0.03));
                p.fill(220, 230, 255, star.a * twinkle);
                p.circle(star.x, star.y, star.s);
              }
  
              p.stroke(42, 62, 96, 70);
              p.strokeWeight(1);
              for (let y = 0; y < groundY; y += 44) p.line(0, y, p.width, y);
  
              if (now >= missileNextEnemyAt) {
                spawnMissileEnemy();
                missileWave += 0.04;
                missileNextEnemyAt = now + p.random(220, 520) / Math.min(2.4, 1 + (missileWave * 0.045));
              }
  
              if (now >= missileNextDefenseAt) {
                let target = null;
                let threatScore = -1;
                for (const enemy of missileEnemyMissiles) {
                  if (enemy.defenseTriggered) continue;
                  const progress = (enemy.y - enemy.sy) / Math.max(1, enemy.ty - enemy.sy);
                  if (progress < 0.18) continue;
                  const score = progress * 1000 - Math.abs(enemy.x - p.width * 0.5);
                  if (score > threatScore) {
                    threatScore = score;
                    target = enemy;
                  }
                }
                if (target && launchMissileDefense(target.x, target.y)) {
                  target.defenseTriggered = true;
                  missileNextDefenseAt = now + p.random(90, 160);
                } else {
                  missileNextDefenseAt = now + 70;
                }
              }
  
              for (let i = missileEnemyMissiles.length - 1; i >= 0; i -= 1) {
                const missile = missileEnemyMissiles[i];
                missile.x += missile.vx;
                missile.y += missile.vy;
                if (Math.hypot(missile.tx - missile.x, missile.ty - missile.y) <= Math.max(2, Math.hypot(missile.vx, missile.vy) * 1.2)) {
                  triggerMissileExplosion(missile.tx, missile.ty, p.random(30, 44), [255, 146, 90]);
                  if (missile.targetKind === "city" && missile.targetRef) missile.targetRef.alive = false;
                  if (missile.targetKind === "base" && missile.targetRef) missile.targetRef.alive = false;
                  missileEnemyMissiles.splice(i, 1);
                }
              }
  
              for (let i = missileDefenseMissiles.length - 1; i >= 0; i -= 1) {
                const missile = missileDefenseMissiles[i];
                missile.x += missile.vx;
                missile.y += missile.vy;
                if (Math.hypot(missile.tx - missile.x, missile.ty - missile.y) <= Math.max(2, Math.hypot(missile.vx, missile.vy) * 1.2)) {
                  triggerMissileExplosion(missile.tx, missile.ty, p.random(48, 72), [146, 236, 255]);
                  missileDefenseMissiles.splice(i, 1);
                }
              }
  
              for (let i = missileExplosions.length - 1; i >= 0; i -= 1) {
                const blast = missileExplosions[i];
                if (blast.grow) {
                  blast.r += Math.max(1.8, (blast.maxR - blast.r) * 0.16);
                  if (blast.r >= blast.maxR - 0.5) blast.grow = false;
                } else {
                  blast.r *= 0.94;
                  blast.ringAlpha *= 0.95;
                }
  
                for (let j = missileEnemyMissiles.length - 1; j >= 0; j -= 1) {
                  const enemy = missileEnemyMissiles[j];
                  if (Math.hypot(enemy.x - blast.x, enemy.y - blast.y) <= blast.r) {
                    missileEnemyMissiles.splice(j, 1);
                    missileScore += 25;
                    triggerMissileExplosion(enemy.x, enemy.y, p.random(18, 28), [255, 214, 126]);
                  }
                }
  
                if (!blast.grow && blast.r < 4) missileExplosions.splice(i, 1);
              }
  
              p.noStroke();
              p.fill(18, 26, 34, 255);
              p.rect(0, groundY, p.width, p.height - groundY);
              p.fill(36, 72, 56, 255);
              p.rect(0, groundY - 3, p.width, 3);
  
              for (const city of missileCities) {
                const alpha = city.alive ? 230 : 54;
                p.noStroke();
                p.fill(84, 190, 255, alpha);
                p.rect(city.x - city.w * 0.5, city.y - city.h, city.w, city.h, 2);
                if (city.alive) {
                  p.fill(210, 240, 255, 170);
                  const cols = Math.max(2, Math.floor(city.w / 11));
                  const rows = Math.max(2, Math.floor(city.h / 11));
                  for (let cx = 0; cx < cols; cx += 1) {
                    for (let cy = 0; cy < rows; cy += 1) {
                      if ((cx + cy) % 2 !== 0) continue;
                      p.rect(
                        city.x - city.w * 0.38 + cx * (city.w / cols),
                        city.y - city.h * 0.86 + cy * (city.h / rows),
                        2.5,
                        3.5,
                        1
                      );
                    }
                  }
                }
              }
  
              for (const base of missileBases) {
                const alpha = base.alive ? 240 : 48;
                p.noStroke();
                p.fill(255, 190, 118, alpha);
                p.triangle(base.x - 18, base.y, base.x + 18, base.y, base.x, base.y - 18);
                if (base.alive && now < base.cooldownUntil) {
                  p.fill(255, 240, 180, 120);
                  p.circle(base.x, base.y - 6, 10);
                }
              }
  
              p.stroke(255, 160, 108, 180);
              p.strokeWeight(1.4);
              for (const missile of missileEnemyMissiles) {
                p.line(missile.sx, missile.sy, missile.x, missile.y);
                p.noStroke();
                p.fill(missile.headColor[0], missile.headColor[1], missile.headColor[2], 240);
                p.circle(missile.x, missile.y, 4.5);
                p.stroke(255, 160, 108, 180);
              }
  
              p.stroke(146, 236, 255, 210);
              p.strokeWeight(1.3);
              for (const missile of missileDefenseMissiles) {
                p.line(missile.sx, missile.sy, missile.x, missile.y);
                p.noStroke();
                p.fill(200, 248, 255, 240);
                p.circle(missile.x, missile.y, 4);
                p.stroke(146, 236, 255, 210);
              }
  
              for (const blast of missileExplosions) {
                p.noFill();
                p.stroke(blast.color[0], blast.color[1], blast.color[2], blast.ringAlpha);
                p.strokeWeight(2);
                p.circle(blast.x, blast.y, blast.r * 2);
                p.stroke(blast.color[0], blast.color[1], blast.color[2], blast.ringAlpha * 0.35);
                p.circle(blast.x, blast.y, blast.r * 2.8);
              }
  
              const aliveCount = missileCities.filter((city) => city.alive).length + missileBases.filter((base) => base.alive).length;
              if (aliveCount <= 0) seedMissileCommand();
  
              p.noStroke();
              p.fill(220, 236, 255, 230);
              p.textFont("monospace");
              p.textSize(16);
              p.textAlign(p.LEFT, p.TOP);
              p.text(`MISSILE COMMAND`, 18, 14);
              p.textAlign(p.RIGHT, p.TOP);
              p.text(`Wave ${Math.max(1, Math.floor(missileWave))}  Score ${String(missileScore)}`, p.width - 18, 14);
              return;
            }

            if (splashMode === "mountains") {
              p.background(0, 0, 0, 255);
              const now = p.millis();
              mountainPanX += 0.28;
              const baseOffset = ((mountainPanX % mountainWorldWidth) + mountainWorldWidth) % mountainWorldWidth;

              p.noStroke();
              for (const star of mountainStars) {
                star.twinkle += star.twinkleSpeed;
                const parallax = baseOffset * 0.14;
                let drawX = star.x - parallax;
                while (drawX < -6) drawX += mountainWorldWidth;
                while (drawX > p.width + 6) drawX -= mountainWorldWidth;
                if (drawX < -6 || drawX > p.width + 6) continue;
                const alpha = star.alpha * (0.72 + (0.28 * Math.sin(star.twinkle)));
                p.fill(255, 255, 255, alpha);
                p.circle(drawX, star.y, star.size);
              }

              if (now >= mountainNextShootingStarAt) {
                const burstCount = p.random() < 0.54 ? (p.random() < 0.3 ? 3 : 2) : 1;
                for (let i = 0; i < burstCount; i += 1) spawnMountainShootingStar();
                mountainNextShootingStarAt = now + p.random(1800, 5200);
              }

              if (now >= mountainNextUfoAt) {
                spawnMountainUfo();
                mountainNextUfoAt = now + p.random(18000, 24000);
              }

              for (let i = mountainShootingStars.length - 1; i >= 0; i -= 1) {
                const star = mountainShootingStars[i];
                star.x += star.vx;
                star.y += star.vy;
                star.trail.unshift({
                  x: star.x,
                  y: star.y,
                  alpha: star.alpha
                });
                if (star.trail.length > 18) star.trail.length = 18;

                for (let j = star.trail.length - 1; j >= 0; j -= 1) {
                  star.trail[j].alpha *= 0.88;
                  if (star.trail[j].alpha < 8) star.trail.splice(j, 1);
                }

                p.noFill();
                p.strokeWeight(1.35);
                for (let j = 1; j < star.trail.length; j += 1) {
                  const a = star.trail[j - 1];
                  const b = star.trail[j];
                  p.stroke(255, 255, 255, b.alpha * (1 - (j / star.trail.length)));
                  p.line(a.x, a.y, b.x, b.y);
                }

                p.noStroke();
                p.fill(255, 255, 255, star.alpha);
                p.circle(star.x, star.y, star.size);

                if (star.x < -40 || star.x > p.width + 40 || star.y > p.height * 0.76) {
                  mountainShootingStars.splice(i, 1);
                }
              }

              for (let i = mountainUfos.length - 1; i >= 0; i -= 1) {
                const ufo = mountainUfos[i];
                ufo.bob += ufo.bobSpeed;
                ufo.x += ufo.speed;
                ufo.y += Math.sin(ufo.bob) * 0.2 + ufo.drift;

                if (now >= ufo.trailEmitAt) {
                  ufo.trail.unshift({
                    x: ufo.x - (ufo.dir * (20 * ufo.scale)),
                    y: ufo.y + (6 * ufo.scale),
                    w: p.random(13, 24) * ufo.scale,
                    h: p.random(9, 17) * ufo.scale,
                    alpha: p.random(132, 198),
                    decay: p.random(0.982, 0.992),
                    driftX: p.random(-0.04, 0.04),
                    driftY: p.random(0.02, 0.055),
                    tilt: p.random(-0.42, 0.42),
                    strokeW: p.random(1.05, 1.9),
                    color: p.random([
                      [255, 92, 92],
                      [255, 178, 86],
                      [255, 235, 104],
                      [108, 236, 166],
                      [104, 198, 255],
                      [202, 148, 255]
                    ]),
                    start: p.random(Math.PI * 1.08, Math.PI * 1.28),
                    end: p.random(Math.PI * 1.72, Math.PI * 1.92)
                  });
                  ufo.trailEmitAt = now + ufo.trailInterval;
                }

                if (ufo.trail.length > 180) ufo.trail.length = 180;

                for (let t = ufo.trail.length - 1; t >= 0; t -= 1) {
                  const arch = ufo.trail[t];
                  arch.alpha *= arch.decay;
                  arch.x += arch.driftX;
                  arch.y += arch.driftY;
                  if (arch.alpha < 8) {
                    ufo.trail.splice(t, 1);
                    continue;
                  }
                  p.noFill();
                  p.stroke(arch.color[0], arch.color[1], arch.color[2], arch.alpha);
                  p.strokeWeight(arch.strokeW);
                  p.push();
                  p.translate(arch.x, arch.y);
                  p.rotate(arch.tilt);
                  p.arc(0, 0, arch.w, arch.h, arch.start, arch.end);
                  p.pop();
                }

                if (ufo.beamBurstRemaining <= 0 && now >= ufo.nextAttackAt) {
                  ufo.beamBurstRemaining = Math.floor(p.random(2, 5));
                  ufo.nextBeamAt = now + p.random(80, 180);
                  ufo.nextAttackAt = now + p.random(12000, 22000);
                }

                if (ufo.beamBurstRemaining > 0 && now >= ufo.nextBeamAt) {
                  const validRunners = mountainApproachPeople.filter((runner) =>
                    !runner.grabbedBy && !runner.falling && runner.progress > 0.12
                  );
                  const validCars = mountainCars;
                  const canTargetRunner = validRunners.length > 0;
                  const canTargetCar = validCars.length > 0;

                  if (canTargetRunner || canTargetCar) {
                    const chooseRunner = canTargetRunner && (!canTargetCar || p.random() < 0.58);
                    let target = null;
                    let targetKind = "runner";
                    if (chooseRunner) {
                      target = validRunners[Math.floor(p.random(validRunners.length))];
                      targetKind = "runner";
                    } else {
                      target = validCars[Math.floor(p.random(validCars.length))];
                      targetKind = "car";
                    }

                    if (target) {
                      mountainUfoBeams.push({
                        source: ufo,
                        target,
                        kind: targetKind,
                        life: Math.floor(p.random(14, 24)),
                        width: p.random(1.1, 2.1),
                        alpha: p.random(174, 232)
                      });
                    }
                  }
                  ufo.beamBurstRemaining -= 1;
                  ufo.nextBeamAt = now + p.random(120, 220);
                }

                p.push();
                p.translate(ufo.x, ufo.y);
                p.noStroke();
                p.fill(232, 235, 242, ufo.alpha * 0.28);
                p.ellipse(0, 8.2 * ufo.scale, 34 * ufo.scale, 9 * ufo.scale);
                p.fill(240, 242, 248, ufo.alpha);
                p.ellipse(0, 0, 56 * ufo.scale, 14 * ufo.scale);
                p.fill(250, 251, 255, ufo.alpha * 0.92);
                p.ellipse(0, -4.4 * ufo.scale, 23 * ufo.scale, 9.5 * ufo.scale);
                p.fill(255, 255, 255, ufo.alpha * 0.78);
                p.circle(-14 * ufo.scale, 0.8 * ufo.scale, 2.3 * ufo.scale);
                p.circle(0, 1.3 * ufo.scale, 2.5 * ufo.scale);
                p.circle(14 * ufo.scale, 0.8 * ufo.scale, 2.3 * ufo.scale);
                p.pop();

                if ((ufo.dir > 0 && ufo.x > p.width + 280) || (ufo.dir < 0 && ufo.x < -280)) {
                  for (let b = mountainUfoBeams.length - 1; b >= 0; b -= 1) {
                    if (mountainUfoBeams[b].source === ufo) mountainUfoBeams.splice(b, 1);
                  }
                  mountainUfos.splice(i, 1);
                }
              }

              p.noFill();
              p.strokeJoin(p.ROUND);
              const orderedRanges = [...mountainRanges].sort((a, b) => a.speed - b.speed);
              for (let i = 0; i < orderedRanges.length; i += 1) {
                const range = orderedRanges[i];
                const rangeOffset = (baseOffset * range.speed) % mountainWorldWidth;
                drawMountainRangeLine(range, rangeOffset);
                for (let j = i + 1; j < orderedRanges.length; j += 1) {
                  const nearerRange = orderedRanges[j];
                  const nearerOffset = (baseOffset * nearerRange.speed) % mountainWorldWidth;
                  drawMountainRangeMask(nearerRange, nearerOffset);
                }
              }

              for (const rider of mountainPeople) {
                const range = mountainRanges[rider.rangeIndex];
                if (!range || range.points.length < 2) continue;
                const rangeOffset = (baseOffset * range.speed) % mountainWorldWidth;
                const shift = getMountainRangeShift(range, rangeOffset);
                rider.anim += rider.state === "run" ? 0.34 : rider.state === "air" ? 0.24 : 0.16;

                if (rider.state === "slide" || rider.state === "climb") {
                  const a = range.points[rider.segmentIndex];
                  const b = range.points[Math.min(range.points.length - 1, rider.segmentIndex + 1)];
                  rider.progress += rider.slideSpeed;
                  if (rider.progress >= 1) {
                    rider.segmentIndex += 1;
                    rider.progress = 0;
                  }
                  const nextA = range.points[rider.segmentIndex];
                  const nextB = range.points[Math.min(range.points.length - 1, rider.segmentIndex + 1)];
                  const isClimb = rider.state === "climb";
                  const shouldLeap =
                    isClimb &&
                    nextA &&
                    nextB &&
                    rider.progress >= 0.56 &&
                    (
                      rider.segmentIndex >= rider.jumpSegmentIndex ||
                      nextB.y >= (nextA.y - 3) ||
                      rider.segmentIndex >= range.points.length - 2
                    );
                  if (shouldLeap) {
                    rider.state = "air";
                    rider.x = p.lerp(nextA.x, nextB.x, rider.progress) + shift;
                    rider.y = p.lerp(nextA.y, nextB.y, rider.progress);
                    const slopeDx = nextB.x - nextA.x;
                    rider.vx = (slopeDx < 0 ? -1 : 1) * (rider.highJump ? (1.2 + rider.size * 0.62) : (1.05 + rider.size * 0.5));
                    rider.vy = rider.highJump
                      ? -(4.2 + rider.size * 0.85)
                      : -(1.9 + rider.size * 0.45);
                    rider.runDir = p.random() < 0.5 ? -1 : 1;
                    rider.jumpSegmentIndex = -1;
                  } else if (!nextA || !nextB || nextB.y >= mountainHorizonY - 2 || rider.segmentIndex >= range.points.length - 2) {
                    rider.state = "run";
                    rider.x = (nextB?.x ?? b.x) + shift;
                    rider.y = mountainHorizonY;
                    const slopeDx = (nextB?.x ?? b.x) - (nextA?.x ?? a.x);
                    rider.runDir = slopeDx < 0 ? -1 : 1;
                    if (p.random() < 0.45) rider.runDir *= -1;
                  } else {
                    rider.x = p.lerp(nextA.x, nextB.x, rider.progress) + shift;
                    rider.y = p.lerp(nextA.y, nextB.y, rider.progress);
                  }
                } else if (rider.state === "air") {
                  rider.x += rider.vx;
                  rider.y += rider.vy;
                  rider.vy += 0.12;
                  if (rider.y >= mountainHorizonY) {
                    rider.state = "run";
                    rider.y = mountainHorizonY;
                    if (p.random() < 0.5) rider.runDir *= -1;
                  }
                } else {
                  rider.x += rider.runDir * (1.15 + rider.size * 0.55);
                  rider.y = mountainHorizonY;
                  if (rider.x < -30 || rider.x > p.width + 30) {
                    assignMountainPerson(rider);
                    continue;
                  }
                }

                if (rider.x < -20 || rider.x > p.width + 20) continue;
                const stride = Math.sin(rider.anim);
                const bodyH = 7.5 * rider.size;
                const legLift = 1.8 * rider.size * Math.abs(stride);
                p.stroke(236, 236, 236, 210);
                p.strokeWeight(1.1);
                p.line(rider.x, rider.y - bodyH, rider.x, rider.y - 2.2 * rider.size);
                p.line(rider.x, rider.y - bodyH + 1.4, rider.x - 2.1 * rider.size, rider.y - bodyH + 4.3 + stride);
                p.line(rider.x, rider.y - bodyH + 1.4, rider.x + 2.1 * rider.size, rider.y - bodyH + 4.3 - stride);
                p.line(rider.x, rider.y - 2.2 * rider.size, rider.x - 2.2 * rider.size, rider.y + legLift - 0.8);
                p.line(rider.x, rider.y - 2.2 * rider.size, rider.x + 2.2 * rider.size, rider.y - legLift - 0.8);
                p.noStroke();
                p.fill(252, 252, 252, 225);
                p.circle(rider.x, rider.y - bodyH - 2.4 * rider.size, 2.8 * rider.size);
              }

              for (const runner of mountainApproachPeople) {
                if (runner.grabbedBy) {
                  runner.stridePhase += 0.18;
                  continue;
                }
                if (runner.falling) {
                  runner.x += runner.fallVx;
                  runner.y += runner.fallVy;
                  runner.fallVy += 0.14;
                  runner.stridePhase += 0.18;
                  const fallScale = runner.baseSize * 1.18;
                  const fallBodyH = 10 * fallScale;
                  p.stroke(242, 242, 242, 220);
                  p.strokeWeight(Math.max(0.9, 1.05 * fallScale));
                  p.line(runner.x, runner.y - fallBodyH, runner.x, runner.y - 2.8 * fallScale);
                  p.line(runner.x, runner.y - fallBodyH + 1.4 * fallScale, runner.x - 2.2 * fallScale, runner.y - fallBodyH + 5.2 * fallScale);
                  p.line(runner.x, runner.y - fallBodyH + 1.4 * fallScale, runner.x + 2.2 * fallScale, runner.y - fallBodyH + 5.2 * fallScale);
                  p.line(runner.x, runner.y - 2.8 * fallScale, runner.x - 2.6 * fallScale, runner.y + 2.8 * fallScale);
                  p.line(runner.x, runner.y - 2.8 * fallScale, runner.x + 2.6 * fallScale, runner.y + 2.8 * fallScale);
                  p.noStroke();
                  p.fill(252, 252, 252, 225);
                  p.circle(runner.x, runner.y - fallBodyH - 2.9 * fallScale, 3.3 * fallScale);
                  if (runner.y > p.height + 24) {
                    resetMountainApproachRunner(runner);
                  }
                  continue;
                }

                runner.progress += runner.speed;
                if (runner.progress >= 1) {
                  resetMountainApproachRunner(runner);
                }
                runner.stridePhase += 0.24 + (runner.progress * 0.16);
                const t = p.constrain(runner.progress, 0, 1);
                const spread = p.width * (0.04 + t * 0.3);
                const laneCenter = (p.width * 0.5) + (runner.laneOrigin * p.width * 0.34);
                runner.x = laneCenter + (runner.drift * spread);
                runner.y = p.lerp(mountainHorizonY + 3, p.height - 18, t);
                const scale = runner.baseSize * p.lerp(0.18, 1.7, t);
                runner.hitCooldown = Math.max(0, (runner.hitCooldown || 0) - 1);
                const stride = Math.sin(runner.stridePhase);
                const bodyH = 10 * scale;
                const legLift = 2.4 * scale * Math.abs(stride);
                const armSwing = 2.2 * scale * stride;
                p.stroke(242, 242, 242, p.lerp(90, 235, t));
                p.strokeWeight(Math.max(0.9, 1.05 * scale));
                p.line(runner.x, runner.y - bodyH, runner.x, runner.y - 2.8 * scale);
                p.line(runner.x, runner.y - bodyH + 1.6 * scale, runner.x - armSwing, runner.y - bodyH + 4.8 * scale);
                p.line(runner.x, runner.y - bodyH + 1.6 * scale, runner.x + armSwing, runner.y - bodyH + 4.8 * scale);
                p.line(runner.x, runner.y - 2.8 * scale, runner.x - 2.5 * scale, runner.y + legLift);
                p.line(runner.x, runner.y - 2.8 * scale, runner.x + 2.5 * scale, runner.y - legLift);
                p.noStroke();
                p.fill(252, 252, 252, p.lerp(100, 245, t));
                p.circle(runner.x, runner.y - bodyH - 2.9 * scale, 3.3 * scale);
              }

              for (const bird of mountainBirds) {
                bird.flap += bird.flapSpeed;
                if (bird.mode === "fly") {
                  bird.x += bird.speed;
                  bird.y += Math.sin((now * 0.0014) + bird.x * 0.012) * 0.08 + bird.drift * 0.03;
                  if (!bird.targetRunner && p.random() < 0.0012) {
                    const target = mountainApproachPeople.find((runner) =>
                      !runner.grabbedBy &&
                      !runner.falling &&
                      runner.progress > 0.18 &&
                      runner.progress < 0.82
                    );
                    if (target) {
                      bird.mode = "swoop";
                      bird.targetRunner = target;
                    }
                  }
                  if (bird.dir > 0 && bird.x > p.width + 120) resetMountainBird(bird);
                  else if (bird.dir < 0 && bird.x < -140) resetMountainBird(bird);
                } else if (bird.mode === "swoop") {
                  const target = bird.targetRunner;
                  if (!target || target.grabbedBy || target.falling) {
                    bird.mode = "fly";
                    bird.targetRunner = null;
                  } else {
                    const tx = target.x;
                    const ty = target.y - 18;
                    bird.x += (tx - bird.x) * 0.065;
                    bird.y += (ty - bird.y) * 0.065;
                    if (Math.hypot(tx - bird.x, ty - bird.y) < 12) {
                      bird.mode = "carry";
                      bird.carryingRunner = target;
                      target.grabbedBy = bird;
                      bird.carryUntil = now + p.random(1400, 2400);
                      bird.dir = (bird.speed || 1) < 0 ? -1 : 1;
                      bird.vx = bird.dir * (0.9 + bird.scale * 0.7);
                      bird.vy = -(0.55 + bird.scale * 0.2);
                      bird.targetRunner = null;
                    }
                  }
                } else if (bird.mode === "carry") {
                  const carried = bird.carryingRunner;
                  if (!carried) {
                    bird.mode = "fly";
                  } else {
                    bird.x += bird.vx;
                    bird.y += bird.vy;
                    carried.x = bird.x;
                    carried.y = bird.y + (9 * bird.scale);
                    if (now >= bird.carryUntil || bird.y < bird.dropAltitude) {
                      carried.grabbedBy = null;
                      carried.falling = true;
                      carried.fallVx = bird.vx * 0.7;
                      carried.fallVy = Math.max(0.8, bird.vy * -0.1);
                      bird.carryingRunner = null;
                      bird.mode = "fly";
                    }
                  }
                }

                const birdW = 14 * bird.scale;
                const wingLift = Math.sin(bird.flap) * (5.5 * bird.scale);
                p.push();
                p.translate(bird.x, bird.y);
                if (bird.dir < 0) p.scale(-1, 1);
                p.noFill();
                p.stroke(248, 248, 248, bird.alpha);
                p.strokeWeight(Math.max(0.8, 1.15 * bird.scale));
                p.beginShape();
                p.vertex(-birdW, wingLift);
                p.vertex(0, 0);
                p.vertex(birdW, wingLift);
                p.endShape();
                if (bird.carryingRunner) {
                  const carryScale = bird.carryingRunner.baseSize * 0.62;
                  const carryBodyH = 9 * carryScale;
                  p.stroke(242, 242, 242, 220);
                  p.strokeWeight(Math.max(0.75, 0.95 * carryScale));
                  p.line(0, 8 * bird.scale, 0, 8 * bird.scale + carryBodyH);
                  p.line(0, 10 * bird.scale, -2.2 * carryScale, 13 * bird.scale);
                  p.line(0, 10 * bird.scale, 2.2 * carryScale, 13 * bird.scale);
                  p.line(0, 8 * bird.scale + carryBodyH, -2.2 * carryScale, 8 * bird.scale + carryBodyH + 3 * carryScale);
                  p.line(0, 8 * bird.scale + carryBodyH, 2.2 * carryScale, 8 * bird.scale + carryBodyH + 3 * carryScale);
                  p.noStroke();
                  p.fill(252, 252, 252, 225);
                  p.circle(0, 8 * bird.scale + carryBodyH - 2.2 * carryScale, 3 * carryScale);
                }
                p.pop();
              }

              p.noStroke();
              p.fill(255, 255, 255, 18);
              p.rect(0, mountainHorizonY, p.width, p.height - mountainHorizonY);
              for (const car of mountainCars) {
                car.x += car.speed;
                const carW = 18 * car.scale;
                const carH = 6.5 * car.scale;
                if (car.dir > 0 && car.x > p.width + 40) car.x = -60 - p.random(0, p.width * 0.3);
                else if (car.dir < 0 && car.x < -60) car.x = p.width + 60 + p.random(0, p.width * 0.3);

                for (const runner of mountainApproachPeople) {
                  if ((runner.hitCooldown || 0) > 0) continue;
                  const runnerScale = runner.baseSize * p.lerp(0.18, 1.7, p.constrain(runner.progress, 0, 1));
                  const runnerBodyH = 10 * runnerScale;
                  const runnerHalfW = 3.2 * runnerScale;
                  const runnerTop = runner.y - runnerBodyH - 5 * runnerScale;
                  const runnerBottom = runner.y + 1.5 * runnerScale;
                  const runnerLeft = runner.x - runnerHalfW;
                  const runnerRight = runner.x + runnerHalfW;
                  const carLeft = car.x - carW * 0.5;
                  const carRight = car.x + carW * 0.5;
                  const carTop = car.y - carH * 1.58;
                  const carBottom = car.y + 2.2 * car.scale;
                  const overlaps =
                    runnerRight >= carLeft &&
                    runnerLeft <= carRight &&
                    runnerBottom >= carTop &&
                    runnerTop <= carBottom;
                  if (!overlaps) continue;
                  mountainImpactBursts.push({
                    x: runner.x,
                    y: runner.y - runnerBodyH * 0.4,
                    life: 20,
                    size: 5.5 * runnerScale
                  });
                  resetMountainApproachRunner(runner);
                  runner.hitCooldown = 36;
                }

                p.noStroke();
                p.fill(car.body, car.body, car.body, car.alpha);
                p.rect(car.x - carW * 0.5, car.y - carH, carW, carH, 2);
                p.rect(car.x - carW * 0.18, car.y - carH * 1.58, carW * 0.4, carH * 0.72, 2);
                p.fill(255, 255, 255, car.alpha * 0.22);
                p.rect(car.x - carW * 0.08, car.y - carH * 1.46, carW * 0.12, carH * 0.3, 1);
                p.fill(car.wheel, car.wheel, car.wheel, car.alpha * 0.9);
                p.circle(car.x - carW * 0.28, car.y, 4.1 * car.scale);
                p.circle(car.x + carW * 0.28, car.y, 4.1 * car.scale);
              }

              for (let i = mountainUfoBeams.length - 1; i >= 0; i -= 1) {
                const beam = mountainUfoBeams[i];
                const ufo = beam.source;
                if (!ufo) {
                  mountainUfoBeams.splice(i, 1);
                  continue;
                }

                let tx = ufo.x;
                let ty = ufo.y;
                let targetValid = false;

                if (beam.kind === "runner") {
                  const runner = beam.target;
                  if (runner && !runner.grabbedBy && !runner.falling) {
                    const t = p.constrain(runner.progress, 0, 1);
                    const scale = runner.baseSize * p.lerp(0.18, 1.7, t);
                    tx = runner.x;
                    ty = runner.y - (10 * scale);
                    targetValid = true;
                  }
                } else {
                  const car = beam.target;
                  if (car) {
                    tx = car.x;
                    ty = car.y - (7.5 * car.scale);
                    targetValid = true;
                  }
                }

                if (!targetValid) {
                  mountainUfoBeams.splice(i, 1);
                  continue;
                }

                const sx = ufo.x + (ufo.dir * 4 * ufo.scale);
                const sy = ufo.y + (4.2 * ufo.scale);
                const flicker = 0.82 + (0.18 * Math.sin((now * 0.04) + (i * 1.73)));
                p.stroke(180, 225, 255, beam.alpha * flicker);
                p.strokeWeight(beam.width);
                p.line(sx, sy, tx, ty);
                p.stroke(255, 255, 255, beam.alpha * 0.46 * flicker);
                p.strokeWeight(Math.max(0.7, beam.width * 0.45));
                p.line(sx, sy, tx, ty);

                beam.life -= 1;
                if (beam.life <= 0) {
                  if (beam.kind === "runner") {
                    const runner = beam.target;
                    if (runner && !runner.grabbedBy && !runner.falling) {
                      const t = p.constrain(runner.progress, 0, 1);
                      const scale = runner.baseSize * p.lerp(0.18, 1.7, t);
                      const rx = runner.x;
                      const ry = runner.y - (8 * scale);
                      mountainImpactBursts.push({
                        x: rx,
                        y: ry,
                        life: 24,
                        size: 7.2 * scale
                      });
                      resetMountainApproachRunner(runner);
                      runner.hitCooldown = 52;
                    }
                  } else {
                    const car = beam.target;
                    if (car) {
                      mountainImpactBursts.push({
                        x: tx,
                        y: ty,
                        life: 22,
                        size: 8.4 * car.scale
                      });
                      if (car.dir > 0) car.x = -80 - p.random(0, p.width * 0.35);
                      else car.x = p.width + 80 + p.random(0, p.width * 0.35);
                    }
                  }
                  mountainUfoBeams.splice(i, 1);
                }
              }

              for (let i = mountainImpactBursts.length - 1; i >= 0; i -= 1) {
                const burst = mountainImpactBursts[i];
                burst.life -= 1;
                burst.size *= 1.08;
                if (burst.life <= 0) {
                  mountainImpactBursts.splice(i, 1);
                  continue;
                }
                const alpha = p.map(burst.life, 0, 20, 0, 230);
                p.noFill();
                p.stroke(255, 255, 255, alpha);
                p.strokeWeight(1.2);
                p.circle(burst.x, burst.y, burst.size * 1.8);
                p.stroke(255, 255, 255, alpha * 0.6);
                p.circle(burst.x, burst.y, burst.size * 2.6);
              }

              p.stroke(244, 244, 244, 120);
              p.strokeWeight(1.4);
              p.line(0, mountainHorizonY, p.width, mountainHorizonY);
              p.noStroke();
              p.fill(0, 0, 0, 255);
              p.rect(-2, 0, 6, p.height);
              p.rect(p.width - 4, 0, 6, p.height);
              return;
            }

            if (splashMode === "orbitalbeams") {
              p.background(7, 8, 12, 248);
              const now = p.millis();
              const cx = p.width * 0.5;
              const cy = p.height * 0.5;

              orbitalOrbAngle += orbitalOrbSpin;

              if (now >= orbitalNextColorShiftAt) {
                let nextColor = orbitalPhaseBubbleColor;
                let tries = 0;
                while (
                  tries < 10 &&
                  nextColor[0] === orbitalPhaseBubbleColor[0] &&
                  nextColor[1] === orbitalPhaseBubbleColor[1] &&
                  nextColor[2] === orbitalPhaseBubbleColor[2]
                ) {
                  nextColor = orbitalNeonPalette[Math.floor(p.random(orbitalNeonPalette.length))] || orbitalNeonPalette[0];
                  tries += 1;
                }
                orbitalPhaseBubbleColor = [nextColor[0], nextColor[1], nextColor[2]];
                for (const bubble of orbitalBubbles) {
                  bubble.color = [nextColor[0], nextColor[1], nextColor[2]];
                }
                orbitalNextColorShiftAt = now + 5000;
              }

              if (now >= orbitalNextShotAt && orbitalBubbles.length < 5) {
                const wanderAngle = p.random(Math.PI * 2);
                const wanderSpeed = p.random(0.35, 1.45);
                const radiusRoll = p.random();
                const bubbleRadius = radiusRoll < 0.2
                  ? p.random(9.2, 16.8)
                  : radiusRoll < 0.58
                    ? p.random(4.4, 9.8)
                    : p.random(1.1, 5.6);
                orbitalBubbles.push({
                  x: cx,
                  y: cy,
                  vx: Math.cos(wanderAngle) * wanderSpeed,
                  vy: Math.sin(wanderAngle) * wanderSpeed,
                  r: bubbleRadius,
                  color: orbitalPhaseBubbleColor,
                  wobble: p.random(Math.PI * 2),
                  ghostTrail: [],
                  trailMax: Math.floor(p.random(8, 28)),
                  trailEmitAt: now + p.random(10, 40),
                  phase: "wander",
                  orbitAngle: 0,
                  orbitRadius: 0,
                  orbitAngularSpeed: (p.random() < 0.5 ? -1 : 1) * p.random(0.014, 0.04),
                  orbitInwardRate: p.random(0.26, 0.78),
                  holeIndex: -1
                });
                orbitalNextShotAt = now + p.random(240, 520);
              }

              if (now >= orbitalNextRaiderAt) {
                const edge = Math.floor(p.random(4));
                let sx = p.random(p.width);
                let sy = p.random(p.height);
                if (edge === 0) {
                  sx = -16;
                  sy = p.random(p.height);
                } else if (edge === 1) {
                  sx = p.width + 16;
                  sy = p.random(p.height);
                } else if (edge === 2) {
                  sx = p.random(p.width);
                  sy = -16;
                } else {
                  sx = p.random(p.width);
                  sy = p.height + 16;
                }

                orbitalRaiders.push({
                  x: sx,
                  y: sy,
                  vx: p.random(-0.4, 0.4),
                  vy: p.random(-0.4, 0.4),
                  heading: p.random(Math.PI * 2),
                  thrusting: false,
                  nextShotAt: now + p.random(700, 1400),
                  ttl: Math.floor(p.random(2800, 4200)),
                  phase: "wander",
                  holeIndex: -1,
                  orbitAngle: 0,
                  orbitRadius: 0,
                  orbitAngularSpeed: (p.random() < 0.5 ? -1 : 1) * p.random(0.028, 0.07),
                  orbitInwardRate: p.random(0.22, 0.58)
                });
                orbitalNextRaiderAt = now + 10000;
              }

              const orbPalette = [
                [230, 28, 52],
                [32, 120, 255],
                [30, 232, 116],
                [172, 68, 255]
              ];
              const morphPeriodMs = 2200;
              const morphPosition = (now / morphPeriodMs) % orbPalette.length;
              const fromIndex = Math.floor(morphPosition) % orbPalette.length;
              const toIndex = (fromIndex + 1) % orbPalette.length;
              const blend = morphPosition - Math.floor(morphPosition);
              const from = orbPalette[fromIndex];
              const to = orbPalette[toIndex];
              const orbR = p.lerp(from[0], to[0], blend);
              const orbG = p.lerp(from[1], to[1], blend);
              const orbB = p.lerp(from[2], to[2], blend);

              p.noStroke();
              p.fill(orbR, orbG, orbB, 34);
              p.circle(cx, cy, 76);
              p.push();
              p.translate(cx, cy);
              p.rotate(orbitalOrbAngle);
              p.fill(orbR, orbG, orbB, 236);
              p.circle(0, 0, 18);
              p.fill(255, 255, 255, 180);
              p.ellipse(4, -4, 6, 4);
              p.stroke(orbR, orbG, orbB, 168);
              p.strokeWeight(1.4);
              p.noFill();
              p.arc(0, 0, 30, 30, 0.24, Math.PI - 0.18);
              p.pop();

              updateOrbitalBlackHoles();
              drawOrbitalWarpGrid();

              if (orbitalBlackHoles.length > 0) {
                for (const hole of orbitalBlackHoles) {
                  p.noStroke();
                  p.fill(255, 62, 86, 20);
                  p.circle(hole.x, hole.y, hole.r * 4.2);
                  p.fill(255, 72, 96, 32);
                  p.circle(hole.x, hole.y, hole.r * 2.5);
                  p.fill(0, 0, 0, 255);
                  p.circle(hole.x, hole.y, hole.r * 2);
                  p.stroke(255, 98, 124, 120);
                  p.strokeWeight(1.1);
                  p.noFill();
                  p.circle(hole.x, hole.y, hole.r * 2.2);
                }
              }

              for (let i = orbitalRaiders.length - 1; i >= 0; i -= 1) {
                const ship = orbitalRaiders[i];
                ship.ttl -= 1;
                if (ship.ttl <= 0) {
                  orbitalRaiders.splice(i, 1);
                  continue;
                }

                let nearestHole = null;
                let nearestHoleIdx = -1;
                let nearestHoleDist = Number.POSITIVE_INFINITY;
                for (let h = 0; h < orbitalBlackHoles.length; h += 1) {
                  const hole = orbitalBlackHoles[h];
                  const d = Math.hypot(ship.x - hole.x, ship.y - hole.y);
                  if (d < nearestHoleDist) {
                    nearestHoleDist = d;
                    nearestHole = hole;
                    nearestHoleIdx = h;
                  }
                }

                if (ship.phase === "orbit" && nearestHole) {
                  let orbitHole = orbitalBlackHoles[ship.holeIndex];
                  if (!orbitHole) {
                    orbitHole = nearestHole;
                    ship.holeIndex = nearestHoleIdx;
                    ship.orbitAngle = Math.atan2(ship.y - orbitHole.y, ship.x - orbitHole.x);
                    ship.orbitRadius = Math.hypot(ship.x - orbitHole.x, ship.y - orbitHole.y);
                  }

                  ship.orbitAngle += ship.orbitAngularSpeed;
                  ship.orbitRadius = Math.max(0, ship.orbitRadius - ship.orbitInwardRate);
                  const tx = orbitHole.x + Math.cos(ship.orbitAngle) * ship.orbitRadius;
                  const ty = orbitHole.y + Math.sin(ship.orbitAngle) * ship.orbitRadius;
                  ship.x += (tx - ship.x) * 0.34;
                  ship.y += (ty - ship.y) * 0.34;
                  ship.heading = Math.atan2(ty - ship.y, tx - ship.x);
                  ship.thrusting = false;

                  const dToHole = Math.hypot(orbitHole.x - ship.x, orbitHole.y - ship.y);
                  if (ship.orbitRadius <= Math.max(5, orbitHole.r * 0.36) || dToHole <= Math.max(5, orbitHole.r * 0.34)) {
                    orbitalRaiders.splice(i, 1);
                    continue;
                  }
                  // Orbiting ships stop regular wander/attack behavior.
                  continue;
                }

                let nearestBubble = null;
                let nearestDist = Number.POSITIVE_INFINITY;
                for (const bubble of orbitalBubbles) {
                  const d = Math.hypot(bubble.x - ship.x, bubble.y - ship.y);
                  if (d < nearestDist) {
                    nearestDist = d;
                    nearestBubble = bubble;
                  }
                }

                if (nearestBubble) {
                  const desired = Math.atan2(nearestBubble.y - ship.y, nearestBubble.x - ship.x);
                  const turn = p.constrain(angleDelta(ship.heading, desired), -0.04, 0.04);
                  ship.heading += turn;
                  ship.thrusting = Math.abs(turn) < 0.65;
                } else {
                  ship.heading += p.random(-0.03, 0.03);
                  ship.thrusting = p.random() < 0.58;
                }

                if (ship.thrusting) {
                  ship.vx += Math.cos(ship.heading) * 0.03;
                  ship.vy += Math.sin(ship.heading) * 0.03;
                }

                ship.vx += p.random(-0.01, 0.01);
                ship.vy += p.random(-0.01, 0.01);
                ship.vx *= 0.992;
                ship.vy *= 0.992;
                ship.vx = p.constrain(ship.vx, -2.2, 2.2);
                ship.vy = p.constrain(ship.vy, -2.2, 2.2);
                ship.x += ship.vx;
                ship.y += ship.vy;

                if (ship.x < -14) ship.x = p.width + 14;
                else if (ship.x > p.width + 14) ship.x = -14;
                if (ship.y < -14) ship.y = p.height + 14;
                else if (ship.y > p.height + 14) ship.y = -14;

                if (nearestHole && nearestHoleDist <= (nearestHole.r * 3.9)) {
                  ship.phase = "orbit";
                  ship.holeIndex = nearestHoleIdx;
                  ship.orbitAngle = Math.atan2(ship.y - nearestHole.y, ship.x - nearestHole.x);
                  ship.orbitRadius = Math.max(nearestHole.r * 1.8, nearestHoleDist);
                  ship.orbitAngularSpeed = ((ship.vx * -Math.sin(ship.orbitAngle)) + (ship.vy * Math.cos(ship.orbitAngle))) >= 0
                    ? Math.abs(ship.orbitAngularSpeed)
                    : -Math.abs(ship.orbitAngularSpeed);
                  continue;
                }

                if (nearestBubble && now >= ship.nextShotAt) {
                  const desired = Math.atan2(nearestBubble.y - ship.y, nearestBubble.x - ship.x);
                  const aimErr = Math.abs(angleDelta(ship.heading, desired));
                  if (aimErr < 0.45) {
                    const shotHeading = ship.heading + p.random(-0.08, 0.08);
                    orbitalRaiderShots.push({
                      x: ship.x + Math.cos(shotHeading) * 10,
                      y: ship.y + Math.sin(shotHeading) * 10,
                      vx: Math.cos(shotHeading) * 4.6 + ship.vx * 0.3,
                      vy: Math.sin(shotHeading) * 4.6 + ship.vy * 0.3,
                      ttl: 120
                    });
                  }
                  ship.nextShotAt = now + p.random(350, 750);
                }
              }

              for (let i = orbitalRaiderShots.length - 1; i >= 0; i -= 1) {
                const shot = orbitalRaiderShots[i];
                shot.x += shot.vx;
                shot.y += shot.vy;
                shot.ttl -= 1;

                if (shot.x < -6) shot.x = p.width + 6;
                else if (shot.x > p.width + 6) shot.x = -6;
                if (shot.y < -6) shot.y = p.height + 6;
                else if (shot.y > p.height + 6) shot.y = -6;

                if (shot.ttl <= 0) {
                  orbitalRaiderShots.splice(i, 1);
                  continue;
                }

                let hit = false;
                for (let b = orbitalBubbles.length - 1; b >= 0; b -= 1) {
                  const bubble = orbitalBubbles[b];
                  if (Math.hypot(shot.x - bubble.x, shot.y - bubble.y) <= (bubble.r + 2.8)) {
                    orbitalBubbles.splice(b, 1);
                    hit = true;
                    break;
                  }
                }
                if (hit) orbitalRaiderShots.splice(i, 1);
              }

              p.noStroke();
              p.fill(255, 182, 122, 220);
              for (const shot of orbitalRaiderShots) p.circle(shot.x, shot.y, 2.8);

              for (const ship of orbitalRaiders) {
                p.push();
                p.translate(ship.x, ship.y);
                p.rotate(ship.heading);
                p.noFill();
                p.stroke(228, 236, 248, 224);
                p.strokeWeight(1.4);
                p.triangle(9, 0, -6, -5, -5, 5);
                p.line(2, 0, -3, 0);
                if (ship.thrusting) {
                  p.stroke(255, 168, 96, 210);
                  p.line(-5, 0, -10 - p.random(2, 4), 0);
                }
                p.pop();
              }

              for (let i = orbitalBubbles.length - 1; i >= 0; i -= 1) {
                const bubble = orbitalBubbles[i];
                bubble.wobble += 0.06;
                const orbitTrailPhase = bubble.phase === "orbit";

                if (now >= (bubble.trailEmitAt || 0)) {
                  bubble.ghostTrail.push({
                    x: bubble.x,
                    y: bubble.y,
                    r: Math.max(0.65, bubble.r * (orbitTrailPhase ? p.random(0.1, 0.24) : p.random(0.16, 0.34))),
                    alpha: orbitTrailPhase ? p.random(116, 224) : p.random(54, 108),
                    decay: orbitTrailPhase ? p.random(0.975, 0.992) : p.random(0.94, 0.976)
                  });
                  bubble.trailEmitAt = now + (orbitTrailPhase ? p.random(8, 20) : p.random(24, 64));
                }

                const maxTrailLength = orbitTrailPhase ? Math.max(28, bubble.trailMax * 3) : bubble.trailMax;
                if (bubble.ghostTrail.length > maxTrailLength) {
                  bubble.ghostTrail.splice(0, bubble.ghostTrail.length - maxTrailLength);
                }

                for (let t = bubble.ghostTrail.length - 1; t >= 0; t -= 1) {
                  const ghost = bubble.ghostTrail[t];
                  ghost.alpha *= ghost.decay;
                  if (ghost.alpha < (orbitTrailPhase ? 1.4 : 3.5)) {
                    bubble.ghostTrail.splice(t, 1);
                    continue;
                  }
                  p.noStroke();
                  if (orbitTrailPhase) {
                    p.fill(bubble.color[0], bubble.color[1], bubble.color[2], ghost.alpha * 0.24);
                    p.circle(ghost.x, ghost.y, ghost.r * 6.2);
                    p.fill(bubble.color[0], bubble.color[1], bubble.color[2], ghost.alpha * 0.56);
                    p.circle(ghost.x, ghost.y, ghost.r * 3.8);
                    p.fill(bubble.color[0], bubble.color[1], bubble.color[2], ghost.alpha * 1.06);
                    p.circle(ghost.x, ghost.y, ghost.r * 2.1);
                  } else {
                    p.fill(bubble.color[0], bubble.color[1], bubble.color[2], ghost.alpha * 0.32);
                    p.circle(ghost.x, ghost.y, ghost.r * 4);
                    p.fill(bubble.color[0], bubble.color[1], bubble.color[2], ghost.alpha);
                    p.circle(ghost.x, ghost.y, ghost.r * 2);
                  }
                }

                let closestHole = null;
                let closestIdx = -1;
                let closestDist = Number.POSITIVE_INFINITY;
                for (let h = 0; h < orbitalBlackHoles.length; h += 1) {
                  const hole = orbitalBlackHoles[h];
                  const d = Math.hypot(bubble.x - hole.x, bubble.y - hole.y);
                  if (d < closestDist) {
                    closestDist = d;
                    closestHole = hole;
                    closestIdx = h;
                  }
                }

                if (bubble.phase === "wander") {
                  // Brownian-style wandering before entering any black hole orbit.
                  bubble.vx += p.random(-0.08, 0.08);
                  bubble.vy += p.random(-0.08, 0.08);
                  const wanderMaxSpeed = 1.85;
                  const speed = Math.hypot(bubble.vx, bubble.vy);
                  if (speed > wanderMaxSpeed) {
                    bubble.vx = (bubble.vx / speed) * wanderMaxSpeed;
                    bubble.vy = (bubble.vy / speed) * wanderMaxSpeed;
                  }
                  bubble.x += bubble.vx;
                  bubble.y += bubble.vy;

                  // Wrap around screen edges for seamless toroidal wandering.
                  if (bubble.x < -bubble.r) bubble.x = p.width + bubble.r;
                  else if (bubble.x > p.width + bubble.r) bubble.x = -bubble.r;
                  if (bubble.y < -bubble.r) bubble.y = p.height + bubble.r;
                  else if (bubble.y > p.height + bubble.r) bubble.y = -bubble.r;

                  if (closestHole && closestDist <= (closestHole.r * 4.6)) {
                    bubble.phase = "orbit";
                    bubble.holeIndex = closestIdx;
                    bubble.orbitAngle = Math.atan2(bubble.y - closestHole.y, bubble.x - closestHole.x);
                    bubble.orbitRadius = Math.max(closestHole.r * 2.1, closestDist);
                    const radialX = Math.cos(bubble.orbitAngle);
                    const radialY = Math.sin(bubble.orbitAngle);
                    const tangentX = -radialY;
                    const tangentY = radialX;
                    const speed = Math.max(0.1, Math.hypot(bubble.vx, bubble.vy));
                    const tangentSign = ((bubble.vx * tangentX) + (bubble.vy * tangentY)) >= 0 ? 1 : -1;
                    const targetAngular = p.constrain(speed / Math.max(1, bubble.orbitRadius), 0.01, 0.045) * tangentSign;
                    bubble.orbitAngularSpeed = p.lerp(bubble.orbitAngularSpeed || targetAngular, targetAngular, 0.72);
                    bubble.captureBlend = 0;
                  }
                } else if (bubble.phase === "orbit" && closestHole) {
                  let orbitHole = orbitalBlackHoles[bubble.holeIndex];
                  if (!orbitHole) {
                    orbitHole = closestHole;
                    bubble.holeIndex = closestIdx;
                    bubble.orbitAngle = Math.atan2(bubble.y - orbitHole.y, bubble.x - orbitHole.x);
                    bubble.orbitRadius = Math.max(orbitHole.r * 2.1, Math.hypot(bubble.x - orbitHole.x, bubble.y - orbitHole.y));
                    bubble.captureBlend = 0;
                  }

                  bubble.orbitAngle += bubble.orbitAngularSpeed || 0.05;
                  bubble.orbitRadius = Math.max(0, (bubble.orbitRadius || Math.hypot(bubble.x - orbitHole.x, bubble.y - orbitHole.y)) - (bubble.orbitInwardRate || 0.45));
                  const tx = orbitHole.x + Math.cos(bubble.orbitAngle) * bubble.orbitRadius;
                  const ty = orbitHole.y + Math.sin(bubble.orbitAngle) * bubble.orbitRadius;
                  const toOrbitX = tx - bubble.x;
                  const toOrbitY = ty - bubble.y;
                  bubble.captureBlend = Math.min(1, (bubble.captureBlend || 0) + 0.085);
                  const blend = bubble.captureBlend;
                  const desiredVx = toOrbitX * 0.18;
                  const desiredVy = toOrbitY * 0.18;
                  bubble.vx = p.lerp(bubble.vx || 0, desiredVx, 0.22 * blend);
                  bubble.vy = p.lerp(bubble.vy || 0, desiredVy, 0.22 * blend);
                  bubble.x += bubble.vx;
                  bubble.y += bubble.vy;
                  bubble.r *= 0.995;
                  const dToHole = Math.hypot(orbitHole.x - bubble.x, orbitHole.y - bubble.y);
                  if (bubble.orbitRadius <= Math.max(6, orbitHole.r * 0.42) || dToHole <= Math.max(6, orbitHole.r * 0.38) || bubble.r < 0.28) {
                    orbitalBubbles.splice(i, 1);
                    continue;
                  }
                }

                p.noStroke();
                p.fill(bubble.color[0], bubble.color[1], bubble.color[2], 16);
                p.circle(bubble.x, bubble.y, bubble.r * 4.8);
                p.fill(bubble.color[0], bubble.color[1], bubble.color[2], 28);
                p.circle(bubble.x, bubble.y, bubble.r * 3.4);
                p.fill(bubble.color[0], bubble.color[1], bubble.color[2], 84);
                p.circle(bubble.x, bubble.y, bubble.r * 2.2);
                p.stroke(246, 252, 255, 196);
                p.strokeWeight(1);
                p.fill(255, 255, 255, 22);
                p.circle(bubble.x, bubble.y, bubble.r * 2);
                p.noStroke();
                p.fill(255, 255, 255, 128);
                p.circle(bubble.x - bubble.r * 0.28, bubble.y - bubble.r * 0.34, bubble.r * 0.58);
              }
              return;
            }
  
            if (splashMode === "radar") {
              const now = p.millis();
              const cx = p.width * 0.5;
              const cy = p.height * 0.5;
              const radius = Math.min(p.width, p.height) * 0.3;
  
              p.background(radarBackgroundColor[0], radarBackgroundColor[1], radarBackgroundColor[2], 250);
  
              p.noStroke();
              p.fill(radarOuterFillColor[0], radarOuterFillColor[1], radarOuterFillColor[2], 90);
              p.circle(cx, cy, radius * 2.38);
              p.fill(radarInnerFillColor[0], radarInnerFillColor[1], radarInnerFillColor[2], 110);
              p.circle(cx, cy, radius * 2.06);
  
              p.stroke(radarGridColor[0], radarGridColor[1], radarGridColor[2], 90);
              p.strokeWeight(1);
              for (let ring = 0.25; ring <= 1; ring += 0.25) {
                p.noFill();
                p.circle(cx, cy, radius * 2 * ring);
              }
              p.line(cx - radius, cy, cx + radius, cy);
              p.line(cx, cy - radius, cx, cy + radius);
              p.line(cx - radius * 0.7, cy - radius * 0.7, cx + radius * 0.7, cy + radius * 0.7);
              p.line(cx + radius * 0.7, cy - radius * 0.7, cx - radius * 0.7, cy + radius * 0.7);
  
              p.noFill();
              p.stroke(radarRingColor[0], radarRingColor[1], radarRingColor[2], 130);
              p.strokeWeight(2);
              p.circle(cx, cy, radius * 2);
  
              radarSweepAngle += radarSweepSpeed;
              const sweepAngle = radarSweepAngle;
  
              p.noStroke();
              for (let i = 12; i >= 0; i -= 1) {
                const tailAngle = sweepAngle - (i * 0.09 * radarRotationDirection);
                const alpha = 10 + i * 8;
                p.fill(radarSweepFillColor[0], radarSweepFillColor[1], radarSweepFillColor[2], alpha);
                p.arc(cx, cy, radius * 2, radius * 2, tailAngle - 0.045, tailAngle + 0.045, p.PIE);
              }
  
              p.stroke(radarSweepLineColor[0], radarSweepLineColor[1], radarSweepLineColor[2], 210);
              p.strokeWeight(2.2);
              p.line(cx, cy, cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
  
              if (now >= radarNextBlipAt && radarBlips.length < 18) {
                radarBlips.push({
                  angle: p.random(Math.PI * 2),
                  radiusRatio: p.random(0.08, 0.96),
                  size: p.random(4, 10),
                  alpha: p.random(100, 220),
                  pulse: p.random(Math.PI * 2),
                  drift: p.random(-0.003, 0.003),
                  radialDrift: p.random(-0.001, 0.001)
                });
                radarNextBlipAt = now + p.random(260, 760);
              }
  
              for (let i = radarEchoes.length - 1; i >= 0; i -= 1) {
                const echo = radarEchoes[i];
                echo.life *= 0.95;
                echo.size *= 1.018;
                if (echo.life < 12) {
                  radarEchoes.splice(i, 1);
                  continue;
                }
                p.noFill();
                p.stroke(radarEchoColor[0], radarEchoColor[1], radarEchoColor[2], echo.life);
                p.strokeWeight(1.2);
                p.circle(echo.x, echo.y, echo.size);
              }
  
              for (let i = radarBlips.length - 1; i >= 0; i -= 1) {
                const blip = radarBlips[i];
                blip.angle += blip.drift;
                blip.radiusRatio = p.constrain(blip.radiusRatio + blip.radialDrift, 0.05, 0.97);
                blip.pulse += 0.06;
                const x = cx + Math.cos(blip.angle) * radius * blip.radiusRatio;
                const y = cy + Math.sin(blip.angle) * radius * blip.radiusRatio;
                const delta = Math.atan2(Math.sin(sweepAngle - blip.angle), Math.cos(sweepAngle - blip.angle));
                const nearSweep = Math.abs(delta) < 0.08;
                if (nearSweep && (!blip.lastSweepAt || now - blip.lastSweepAt > 220)) {
                  radarEchoes.push({ x, y, size: blip.size * 1.6, life: 170 });
                  blip.lastSweepAt = now;
                }
                if (p.random() < 0.0018 && radarBlips.length > 6) {
                  radarBlips.splice(i, 1);
                  continue;
                }
                const glow = 0.72 + 0.28 * Math.sin(blip.pulse);
                p.noStroke();
                p.fill(radarSweepLineColor[0], radarSweepLineColor[1], radarSweepLineColor[2], blip.alpha * glow * (nearSweep ? 1.45 : 0.65));
                p.circle(x, y, blip.size * (nearSweep ? 1.35 : 1));
              }
  
              p.fill(radarTextColor[0], radarTextColor[1], radarTextColor[2], 44);
              p.textFont("monospace");
              p.textSize(12);
              p.textAlign(p.LEFT, p.TOP);
              p.text("SCAN  OK", 20, 18);
              p.text(`RANGE ${Math.round(radius)}PX`, 20, 36);
              p.textAlign(p.RIGHT, p.TOP);
              p.text(`BEARING ${String(Math.round(((sweepAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * (180 / Math.PI))).padStart(3, "0")}`, p.width - 20, 18);
              return;
            }
  
            if (splashMode === "dukenukem") {
              const now = p.millis();
              const scrollSpeed = Math.max(3.2, p.width * 0.0031);
              dukeScrollX += scrollSpeed;
              const playerWorldX = dukeScrollX + dukePlayer.screenX;
              const wasOnGround = dukePlayer.onGround;
              dukePlayer.onGround = false;
  
              while (dukeSpawnX < dukeScrollX + p.width * 1.9) {
                const chunkStart = dukeSpawnX;
                const chunkWidth = p.random(180, 320);
                const variant = Math.floor(p.random(0, 6));
                if (variant === 0 || variant === 1) {
                  dukePlatforms.push({
                    x: chunkStart + p.random(26, 58),
                    y: dukeGroundY - p.random(88, 148),
                    w: p.random(110, 190),
                    h: 14,
                    style: "catwalk"
                  });
                } else if (variant === 2) {
                  dukePlatforms.push({
                    x: chunkStart + p.random(40, 72),
                    y: dukeGroundY - p.random(54, 96),
                    w: p.random(72, 118),
                    h: p.random(30, 48),
                    style: "crate"
                  });
                } else if (variant === 3) {
                  dukePlatforms.push({
                    x: chunkStart + p.random(12, 38),
                    y: dukeGroundY - p.random(70, 118),
                    w: p.random(130, 210),
                    h: 12,
                    style: "beam"
                  });
                  dukePickups.push({
                    x: chunkStart + p.random(68, 120),
                    y: dukeGroundY - p.random(118, 152),
                    w: 12,
                    h: 12,
                    kind: p.random() < 0.5 ? "chip" : "ammo",
                    bob: p.random(Math.PI * 2)
                  });
                } else if (variant === 4) {
                  dukePlatforms.push({
                    x: chunkStart + p.random(28, 54),
                    y: dukeGroundY - 34,
                    w: p.random(42, 64),
                    h: p.random(34, 48),
                    style: "crate"
                  });
                } else {
                  dukePickups.push({
                    x: chunkStart + p.random(44, 120),
                    y: dukeGroundY - p.random(50, 90),
                    w: 12,
                    h: 12,
                    kind: "orb",
                    bob: p.random(Math.PI * 2)
                  });
                }
                if (p.random() < 0.84) {
                  const recentPlatform = dukePlatforms.length ? dukePlatforms[dukePlatforms.length - 1] : null;
                  const platformUsable = recentPlatform && recentPlatform.x >= chunkStart && recentPlatform.x <= chunkStart + chunkWidth;
                  const spawnX = chunkStart + p.random(70, chunkWidth - 22);
                  dukeEnemies.push({
                    x: spawnX,
                    y: platformUsable ? recentPlatform.y - 26 : dukeGroundY - 28,
                    w: 18,
                    h: 26,
                    vx: p.random() < 0.5 ? -0.48 : 0.48,
                    range: p.random(26, 74),
                    anchorX: spawnX,
                    type: p.random() < 0.55 ? "trooper" : "bot",
                    hp: p.random() < 0.2 ? 2 : 1
                  });
                }
                dukeSpawnX += chunkWidth;
              }
  
              const solidAhead = dukePlatforms.find((plat) => {
                const nearX = plat.x - playerWorldX;
                return nearX > 16 && nearX < 124 && plat.y >= dukeGroundY - 56 && plat.h > 20;
              });
              const platformAhead = dukePlatforms.find((plat) => {
                const nearX = plat.x - playerWorldX;
                return nearX > 44 && nearX < 160 && plat.y < dukeGroundY - 60 && plat.y > dukeGroundY - 150;
              });
              const enemyAhead = dukeEnemies.find((enemy) => {
                const dx = enemy.x - playerWorldX;
                return dx > 18 && dx < 220 && Math.abs((enemy.y + enemy.h * 0.5) - (dukePlayer.y + dukePlayer.h * 0.5)) < 54;
              });
  
              if (wasOnGround && now >= dukePlayer.jumpLockUntil) {
                if (solidAhead || (platformAhead && p.random() < 0.08) || (enemyAhead && enemyAhead.x - playerWorldX < 74 && p.random() < 0.16)) {
                  dukePlayer.vy = -9.1;
                  dukePlayer.onGround = false;
                  dukePlayer.jumpLockUntil = now + 420;
                }
              }
  
              if (enemyAhead && now >= dukeNextShotAt) {
                dukeBullets.push({
                  x: playerWorldX + dukePlayer.w,
                  y: dukePlayer.y + 14,
                  vx: 8.5,
                  vy: p.random(-0.12, 0.12),
                  owner: "player",
                  w: 8,
                  h: 3
                });
                dukeNextShotAt = now + p.random(170, 260);
              }
  
              dukePlayer.vy += 0.48;
              dukePlayer.y += dukePlayer.vy;
              let supportY = dukeGroundY;
              for (const plat of dukePlatforms) {
                const overlapX = (playerWorldX + dukePlayer.w) > plat.x && playerWorldX < (plat.x + plat.w);
                if (!overlapX) continue;
                if (plat.y >= dukePlayer.y + dukePlayer.h - 18 && plat.y < supportY) supportY = plat.y;
              }
              if ((dukePlayer.y + dukePlayer.h) >= supportY) {
                dukePlayer.y = supportY - dukePlayer.h;
                dukePlayer.vy = 0;
                dukePlayer.onGround = true;
              }
              if (dukePlayer.y > p.height + 80) {
                seedDukeNukem();
              }
  
              for (const enemy of dukeEnemies) {
                enemy.x += enemy.vx;
                if (enemy.x < enemy.anchorX - enemy.range || enemy.x > enemy.anchorX + enemy.range) {
                  enemy.vx *= -1;
                }
                if (enemy.type === "bot" && now >= dukeNextEnemyShotAt) {
                  const dx = enemy.x - playerWorldX;
                  if (dx > -40 && dx < 280 && Math.abs(enemy.y - dukePlayer.y) < 70 && p.random() < 0.025) {
                    dukeBullets.push({
                      x: enemy.x - 4,
                      y: enemy.y + 12,
                      vx: -5.6,
                      vy: 0,
                      owner: "enemy",
                      w: 7,
                      h: 3
                    });
                    dukeNextEnemyShotAt = now + p.random(380, 700);
                  }
                }
              }
  
              for (let i = dukeBullets.length - 1; i >= 0; i -= 1) {
                const bullet = dukeBullets[i];
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
                if (bullet.owner === "player") {
                  let hit = false;
                  for (let j = dukeEnemies.length - 1; j >= 0; j -= 1) {
                    const enemy = dukeEnemies[j];
                    if (!dukeRectOverlap(bullet, enemy)) continue;
                    enemy.hp -= 1;
                    spawnDukeExplosion(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, enemy.type === "bot" ? [255, 120, 82] : [255, 214, 110]);
                    if (enemy.hp <= 0) {
                      dukeEnemies.splice(j, 1);
                      dukeScore += 125;
                    }
                    hit = true;
                    break;
                  }
                  if (hit) {
                    dukeBullets.splice(i, 1);
                    continue;
                  }
                } else if (dukePlayer && now >= dukePlayer.invulnUntil) {
                  const playerRect = {
                    x: playerWorldX,
                    y: dukePlayer.y,
                    w: dukePlayer.w,
                    h: dukePlayer.h
                  };
                  if (dukeRectOverlap(bullet, playerRect)) {
                    dukePlayer.health = Math.max(0, dukePlayer.health - 1);
                    dukePlayer.invulnUntil = now + 800;
                    spawnDukeExplosion(playerWorldX + dukePlayer.w * 0.5, dukePlayer.y + 12, [255, 90, 90]);
                    dukeBullets.splice(i, 1);
                    continue;
                  }
                }
                if (bullet.x < dukeScrollX - 40 || bullet.x > dukeScrollX + p.width + 80) dukeBullets.splice(i, 1);
              }
  
              for (let i = dukePickups.length - 1; i >= 0; i -= 1) {
                const pickup = dukePickups[i];
                pickup.bob += 0.08;
                const pickupRect = {
                  x: pickup.x,
                  y: pickup.y + Math.sin(pickup.bob) * 4,
                  w: pickup.w,
                  h: pickup.h
                };
                const playerRect = { x: playerWorldX, y: dukePlayer.y, w: dukePlayer.w, h: dukePlayer.h };
                if (dukeRectOverlap(pickupRect, playerRect)) {
                  dukeScore += pickup.kind === "orb" ? 250 : 100;
                  if (pickup.kind === "ammo") dukePlayer.health = Math.min(8, dukePlayer.health + 1);
                  spawnDukeExplosion(pickup.x + pickup.w * 0.5, pickup.y + pickup.h * 0.5, [110, 255, 180]);
                  dukePickups.splice(i, 1);
                }
              }
  
              if (now >= dukePlayer.invulnUntil) {
                const playerRect = { x: playerWorldX, y: dukePlayer.y, w: dukePlayer.w, h: dukePlayer.h };
                for (const enemy of dukeEnemies) {
                  if (!dukeRectOverlap(playerRect, enemy)) continue;
                  dukePlayer.health = Math.max(0, dukePlayer.health - 1);
                  dukePlayer.invulnUntil = now + 1000;
                  dukePlayer.vy = -6.8;
                  spawnDukeExplosion(playerWorldX + dukePlayer.w * 0.5, dukePlayer.y + 16, [255, 96, 96]);
                  break;
                }
              }
  
              for (let i = dukeExplosions.length - 1; i >= 0; i -= 1) {
                const particle = dukeExplosions[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.13;
                particle.life -= 1;
                if (particle.life <= 0) dukeExplosions.splice(i, 1);
              }
  
              while (dukePlatforms.length && (dukePlatforms[0].x + dukePlatforms[0].w) < dukeScrollX - 120) dukePlatforms.shift();
              while (dukeEnemies.length && (dukeEnemies[0].x + dukeEnemies[0].w) < dukeScrollX - 140) dukeEnemies.shift();
              while (dukePickups.length && (dukePickups[0].x + dukePickups[0].w) < dukeScrollX - 120) dukePickups.shift();
  
              if (dukePlayer.health <= 0) {
                seedDukeNukem();
              }
  
              p.background(18, 20, 42, 255);
              for (let y = 0; y < p.height * 0.68; y += 1) {
                const mix = y / Math.max(1, p.height * 0.68);
                p.stroke(28 + 80 * mix, 24 + 28 * mix, 58 + 12 * mix, 160);
                p.line(0, y, p.width, y);
              }
              p.noStroke();
              p.fill(255, 154, 78, 170);
              p.circle(p.width * 0.78, p.height * 0.2, Math.min(p.width, p.height) * 0.18);
              p.fill(74, 62, 104, 255);
              for (let i = 0; i < 6; i += 1) {
                const ridgeX = ((i * 190) - (dukeScrollX * 0.16 % 220));
                p.triangle(ridgeX, dukeGroundY, ridgeX + 120, dukeGroundY - 120, ridgeX + 260, dukeGroundY);
              }
              p.fill(40, 44, 72, 220);
              for (const b of dukeBackdropBuildings) {
                const parallaxX = ((b.x - dukeScrollX * (b.layer === 0 ? 0.28 : 0.42)) % (p.width + 220)) - 60;
                const baseY = dukeGroundY - (b.layer === 0 ? 28 : 0);
                p.rect(parallaxX, baseY - b.h, b.w, b.h, 3);
                p.fill(255, 218, 124, b.layer === 0 ? 76 : 104);
                for (let wy = baseY - b.h + 10; wy < baseY - 12; wy += 16) {
                  for (let wx = parallaxX + 8; wx < parallaxX + b.w - 10; wx += 14) {
                    if (((Math.floor(wx + b.w) + Math.floor(wy) + b.layer * 7) % 5) <= 1) p.rect(wx, wy, 6, 8);
                  }
                }
                p.fill(40, 44, 72, 220);
              }
  
              p.fill(48, 54, 68, 255);
              p.rect(0, dukeGroundY, p.width, p.height - dukeGroundY);
              p.stroke(88, 96, 112, 200);
              p.strokeWeight(1);
              for (let x = -((dukeScrollX * 0.5) % 34); x < p.width; x += 34) p.line(x, dukeGroundY, x + 20, p.height);
              p.noStroke();
  
              for (const plat of dukePlatforms) {
                const sx = plat.x - dukeScrollX;
                if (sx > p.width + 60 || sx + plat.w < -60) continue;
                if (plat.style === "crate") {
                  p.fill(122, 84, 52);
                  p.rect(sx, plat.y, plat.w, plat.h, 2);
                  p.stroke(166, 118, 70, 220);
                  p.line(sx + 4, plat.y + 4, sx + plat.w - 4, plat.y + plat.h - 4);
                  p.line(sx + plat.w - 4, plat.y + 4, sx + 4, plat.y + plat.h - 4);
                  p.noStroke();
                } else {
                  p.fill(76, 86, 118);
                  p.rect(sx, plat.y, plat.w, plat.h, 2);
                  p.fill(154, 184, 246, 160);
                  p.rect(sx + 4, plat.y + 3, plat.w - 8, 3, 1);
                  p.fill(42, 48, 70);
                  for (let x = sx + 8; x < sx + plat.w - 8; x += 18) p.rect(x, plat.y + plat.h - 3, 8, 3, 1);
                }
              }
  
              for (const pickup of dukePickups) {
                const sx = pickup.x - dukeScrollX;
                const sy = pickup.y + Math.sin(pickup.bob) * 4;
                if (sx > p.width + 30 || sx < -30) continue;
                p.fill(pickup.kind === "orb" ? 110 : pickup.kind === "ammo" ? 255 : 84, pickup.kind === "orb" ? 255 : 220, pickup.kind === "ammo" ? 118 : 208, 220);
                p.rect(sx, sy, pickup.w, pickup.h, 2);
                p.fill(255, 255, 255, 160);
                p.rect(sx + 2, sy + 2, pickup.w - 4, 2, 1);
              }
  
              for (const enemy of dukeEnemies) {
                const sx = enemy.x - dukeScrollX;
                if (sx > p.width + 40 || sx < -40) continue;
                p.fill(enemy.type === "bot" ? 128 : 98, enemy.type === "bot" ? 210 : 164, enemy.type === "bot" ? 255 : 92, 240);
                p.rect(sx, enemy.y, enemy.w, enemy.h, 2);
                p.fill(42, 46, 64, 255);
                p.rect(sx + 4, enemy.y + 4, enemy.w - 8, 8, 1);
                p.fill(255, 230, 132, 255);
                p.rect(sx + 5, enemy.y + 14, enemy.w - 10, 3, 1);
                p.fill(20, 20, 24, 255);
                p.rect(sx + (enemy.vx < 0 ? -6 : enemy.w - 2), enemy.y + 12, 8, 3, 1);
              }
  
              for (const bullet of dukeBullets) {
                const sx = bullet.x - dukeScrollX;
                if (sx > p.width + 20 || sx < -20) continue;
                p.fill(bullet.owner === "player" ? 255 : 255, bullet.owner === "player" ? 230 : 110, bullet.owner === "player" ? 84 : 110, 240);
                p.rect(sx, bullet.y, bullet.w, bullet.h, 1);
              }
  
              for (const particle of dukeExplosions) {
                const sx = particle.x - dukeScrollX;
                p.fill(particle.color[0], particle.color[1], particle.color[2], Math.max(0, particle.life * 8));
                p.rect(sx, particle.y, 3, 3, 1);
              }
  
              if (dukePlayer) {
                const blink = now < dukePlayer.invulnUntil && Math.floor(now / 70) % 2 === 0;
                if (!blink) {
                  const px = dukePlayer.screenX;
                  const py = dukePlayer.y;
                  p.fill(255, 222, 162, 255);
                  p.rect(px + 5, py, 8, 8, 2);
                  p.fill(255, 204, 66, 255);
                  p.rect(px + 3, py - 2, 12, 4, 2);
                  p.fill(198, 42, 42, 255);
                  p.rect(px + 3, py + 9, 12, 10, 2);
                  p.fill(72, 120, 224, 255);
                  p.rect(px + 3, py + 20, 5, 14, 1);
                  p.rect(px + 10, py + 20, 5, 14, 1);
                  p.fill(54, 54, 62, 255);
                  p.rect(px + 1, py + 18, 4, 12, 1);
                  p.rect(px + 15, py + 18, 4, 12, 1);
                  p.fill(226, 226, 230, 255);
                  p.rect(px + 15, py + 12, 8, 4, 1);
                }
              }
  
              p.fill(230, 236, 255, 220);
              p.textFont("monospace");
              p.textAlign(p.LEFT, p.TOP);
              p.textSize(16);
              p.text("DUKE NUKEM", 18, 14);
              p.textSize(12);
              p.text(`${dukeLevelLabel}  SCORE ${String(dukeScore).padStart(5, "0")}`, 18, 36);
              p.textAlign(p.RIGHT, p.TOP);
              p.text(`HP ${"=".repeat(Math.max(0, dukePlayer?.health || 0))}`, p.width - 18, 14);
              return;
            }
  
            if (splashMode === "asteroids") {
              p.background(6, 7, 11, 252);
              p.noStroke();
              for (const s of asteroidStars) {
                p.fill(220, 230, 255, s.a);
                p.circle(s.x, s.y, s.s);
              }
  
              if (!asteroidShip) seedAsteroids();
              const now = p.millis();
              let nearest = null;
              let nearestDistSq = Number.POSITIVE_INFINITY;
              for (const rock of asteroidRocks) {
                const dx = rock.x - asteroidShip.x;
                const dy = rock.y - asteroidShip.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < nearestDistSq) {
                  nearestDistSq = d2;
                  nearest = { rock, dx, dy, d: Math.sqrt(d2) };
                }
              }
  
              if (nearest) {
                let desired = Math.atan2(nearest.dy, nearest.dx);
                if (nearest.d < 160) desired += Math.PI;
                const turn = p.constrain(angleDelta(asteroidShip.heading, desired), -0.065, 0.065);
                asteroidShip.heading += turn;
                asteroidShip.thrusting = nearest.d < 150 || (nearest.d > 210 && Math.abs(turn) < 0.34);
              } else {
                asteroidShip.thrusting = true;
              }
  
              if (asteroidShip.thrusting) {
                asteroidShip.vx += Math.cos(asteroidShip.heading) * 0.055;
                asteroidShip.vy += Math.sin(asteroidShip.heading) * 0.055;
              }
              asteroidShip.vx *= 0.994;
              asteroidShip.vy *= 0.994;
              asteroidShip.vx = p.constrain(asteroidShip.vx, -3.9, 3.9);
              asteroidShip.vy = p.constrain(asteroidShip.vy, -3.9, 3.9);
              asteroidShip.x += asteroidShip.vx;
              asteroidShip.y += asteroidShip.vy;
              wrapPoint(asteroidShip, 14);
  
              if (nearest && now >= asteroidShip.nextFireAt) {
                const desired = Math.atan2(nearest.dy, nearest.dx);
                const aimErr = Math.abs(angleDelta(asteroidShip.heading, desired));
                if (aimErr < 0.24 || nearest.d < 130) {
                  asteroidShots.push({
                    x: asteroidShip.x + Math.cos(asteroidShip.heading) * 16,
                    y: asteroidShip.y + Math.sin(asteroidShip.heading) * 16,
                    vx: Math.cos(asteroidShip.heading) * 6.4 + asteroidShip.vx * 0.45,
                    vy: Math.sin(asteroidShip.heading) * 6.4 + asteroidShip.vy * 0.45,
                    ttl: 110
                  });
                  asteroidShip.nextFireAt = now + p.random(120, 210);
                }
              }
  
              for (let i = asteroidShots.length - 1; i >= 0; i -= 1) {
                const shot = asteroidShots[i];
                shot.x += shot.vx;
                shot.y += shot.vy;
                shot.ttl -= 1;
                wrapPoint(shot, 3);
                if (shot.ttl <= 0) asteroidShots.splice(i, 1);
              }
  
              for (let i = asteroidRocks.length - 1; i >= 0; i -= 1) {
                const rock = asteroidRocks[i];
                rock.x += rock.vx;
                rock.y += rock.vy;
                rock.rot += rock.rotSpeed;
                wrapPoint(rock, rock.r + 3);
              }
  
              for (let i = asteroidShots.length - 1; i >= 0; i -= 1) {
                const shot = asteroidShots[i];
                let hit = false;
                for (let j = asteroidRocks.length - 1; j >= 0; j -= 1) {
                  const rock = asteroidRocks[j];
                  const dx = shot.x - rock.x;
                  const dy = shot.y - rock.y;
                  if ((dx * dx + dy * dy) <= ((rock.r + 2) * (rock.r + 2))) {
                    asteroidShots.splice(i, 1);
                    asteroidRocks.splice(j, 1);
                    splitAsteroid(rock);
                    hit = true;
                    break;
                  }
                }
                if (hit) continue;
              }
  
              if (asteroidShip.invuln > 0) asteroidShip.invuln -= 1;
              if (asteroidShip.invuln <= 0) {
                for (const rock of asteroidRocks) {
                  const dx = asteroidShip.x - rock.x;
                  const dy = asteroidShip.y - rock.y;
                  const hitR = rock.r + 11;
                  if ((dx * dx + dy * dy) <= (hitR * hitR)) {
                    asteroidShip.invuln = 80;
                    const m = Math.max(0.001, Math.hypot(dx, dy));
                    asteroidShip.vx = (dx / m) * p.random(2.0, 3.3);
                    asteroidShip.vy = (dy / m) * p.random(2.0, 3.3);
                    asteroidShip.x += (dx / m) * 10;
                    asteroidShip.y += (dy / m) * 10;
                    break;
                  }
                }
              }
  
              if (asteroidRocks.length < 6 && now >= asteroidNextSpawnAt) {
                spawnAsteroidFar(p.random(28, 54));
                asteroidNextSpawnAt = now + p.random(800, 1700);
              }
  
              p.noFill();
              p.stroke(198, 210, 230, 205);
              p.strokeWeight(1.6);
              for (const rock of asteroidRocks) {
                p.push();
                p.translate(rock.x, rock.y);
                p.rotate(rock.rot);
                p.beginShape();
                for (let k = 0; k < rock.sides; k += 1) {
                  const a = (k / rock.sides) * Math.PI * 2;
                  const rr = rock.r * rock.profile[k];
                  p.vertex(Math.cos(a) * rr, Math.sin(a) * rr);
                }
                p.endShape(p.CLOSE);
                p.pop();
              }
  
              p.noStroke();
              p.fill(255, 190, 125, 236);
              for (const shot of asteroidShots) p.circle(shot.x, shot.y, 3.4);
  
              if (asteroidShip.invuln % 6 < 3) {
                p.push();
                p.translate(asteroidShip.x, asteroidShip.y);
                p.rotate(asteroidShip.heading);
                p.noFill();
                p.stroke(226, 234, 248, 240);
                p.strokeWeight(1.8);
                p.triangle(14, 0, -10, -8, -8, 8);
                if (asteroidShip.thrusting) {
                  p.stroke(255, 168, 96, 220);
                  p.line(-9, 0, -15 - p.random(3, 7), 0);
                }
                p.pop();
              }
              return;
            }
  
            if (splashMode === "turningcircles") {
              p.background(10, 10, 14, 248);
              const now = p.millis();
  
              for (let i = turningTrails.length - 1; i >= 0; i -= 1) {
                const t = turningTrails[i];
                t.alpha -= 0.48;
                t.r *= 0.996;
                if (t.alpha <= 1 || t.r <= 0.8) {
                  turningTrails.splice(i, 1);
                  continue;
                }
                p.noStroke();
                p.fill(t.color[0], t.color[1], t.color[2], t.alpha);
                p.circle(t.x, t.y, t.r * 2);
              }
  
              for (const c of turningCircles) {
                if (now >= c.nextTurnAt) {
                  c.heading += p.random() < 0.5 ? -p.HALF_PI : p.HALF_PI;
                  c.nextTurnAt = now + p.random(700, 2800);
                }
  
                c.x += Math.cos(c.heading) * c.speed;
                c.y += Math.sin(c.heading) * c.speed;
  
                if (c.x < -c.r) c.x = p.width + c.r;
                else if (c.x > p.width + c.r) c.x = -c.r;
                if (c.y < -c.r) c.y = p.height + c.r;
                else if (c.y > p.height + c.r) c.y = -c.r;
  
                turningTrails.push({
                  x: c.x,
                  y: c.y,
                  r: c.r * 0.85,
                  alpha: 84,
                  color: [c.color[0], c.color[1], c.color[2]]
                });
              }
  
              if (turningTrails.length > 7800) {
                turningTrails.splice(0, turningTrails.length - 7800);
              }
  
              p.noStroke();
              for (const c of turningCircles) {
                p.fill(c.color[0], c.color[1], c.color[2], 228);
                p.circle(c.x, c.y, c.r * 2);
                p.fill(
                  Math.min(255, c.color[0] + 75),
                  Math.min(255, c.color[1] + 75),
                  Math.min(255, c.color[2] + 75),
                  120
                );
                p.circle(c.x - c.r * 0.24, c.y - c.r * 0.28, c.r * 0.52);
              }
              return;
            }
  
            if (splashMode === "circles") {
              if (p.millis() >= nextCircleShuffleAt) shuffleCircleTargets();
  
              p.stroke(255, 255, 255, 120);
              p.strokeWeight(1.7);
              for (const cell of circleGrid) {
                cell.pulsePhase += cell.pulseSpeed;
                cell.fillAlpha += (cell.targetAlpha - cell.fillAlpha) * 0.03;
                const pulse = 0.88 + (0.16 * Math.sin(cell.pulsePhase)) + ((cell.fillAlpha / 255) * 0.1);
                const drawRadius = cell.radius * pulse;
                p.fill(cell.fillColor[0], cell.fillColor[1], cell.fillColor[2], cell.fillAlpha);
                p.circle(cell.x, cell.y, drawRadius * 2);
              }
              return;
            }
  
            if (splashMode === "matrix") {
              const br = matrixBaseColor[0];
              const bg = matrixBaseColor[1];
              const bb = matrixBaseColor[2];
  
              p.background(br * 0.06, bg * 0.06, bb * 0.06, 255);
              p.textAlign(p.CENTER, p.CENTER);
              p.textFont("monospace");
              p.textSize(matrixFontSize);
              p.noStroke();
  
              for (const drop of matrixDrops) {
                if (matrixDirection.name === "meander") {
                  drop.vx += p.random(-drop.turnRate, drop.turnRate);
                  drop.vy += p.random(-drop.turnRate, drop.turnRate);
                  const mag = Math.max(0.0001, Math.hypot(drop.vx, drop.vy));
                  drop.vx /= mag;
                  drop.vy /= mag;
                  const meanderSpeed = drop.speed * 0.72;
                  drop.x += drop.vx * meanderSpeed;
                  drop.y += drop.vy * meanderSpeed;
                } else {
                  drop.x += matrixDirection.vx * drop.speed;
                  drop.y += matrixDirection.vy * drop.speed;
                }
  
                const dirX = matrixDirection.name === "meander" ? drop.vx : matrixDirection.vx;
                const dirY = matrixDirection.name === "meander" ? drop.vy : matrixDirection.vy;
  
                for (let t = 0; t < drop.length; t += 1) {
                  const x = drop.x - t * matrixFontSize * dirX;
                  const y = drop.y - t * matrixFontSize * dirY;
                  if (y < -matrixFontSize || y > p.height + matrixFontSize) continue;
                  if (x < -matrixFontSize || x > p.width + matrixFontSize) continue;
                  const ch = matrixChars.charAt(Math.floor(p.random(matrixChars.length)));
                  if (t === 0) p.fill(
                    p.min(255, br + 48),
                    p.min(255, bg + 48),
                    p.min(255, bb + 48),
                    236
                  );
                  else {
                    const alpha = p.map(t, 1, drop.length - 1, 170, 22);
                    p.fill(br, bg, bb, alpha);
                  }
                  p.text(ch, x, y);
                }
  
                const maxTail = drop.length * matrixFontSize + matrixFontSize;
                if (
                  drop.x < -maxTail || drop.x > p.width + maxTail ||
                  drop.y < -maxTail || drop.y > p.height + maxTail
                ) {
                  drop.speed = p.random(1.8, 4.2);
                  drop.length = Math.floor(p.random(10, 28));
                  if (typeof placeMatrixDrop === "function") {
                    placeMatrixDrop(drop, false);
                  }
                }
              }
              return;
            }
  
            if (splashMode === "life") {
              p.background(10, 10, 14, 252);
  
              const now = p.millis();
              if (!lifeLastStepAt) lifeLastStepAt = now;
              if (now - lifeLastStepAt >= lifeStepMs) {
                stepLife();
                lifeLastStepAt = now;
              }
  
              p.noStroke();
              for (let y = 0; y < lifeRows; y += 1) {
                for (let x = 0; x < lifeCols; x += 1) {
                  const i = y * lifeCols + x;
                  if (!lifeGrid[i]) continue;
                  const age = lifeAge[i] || 1;
                  const alpha = p.map(Math.min(age, 18), 1, 18, 120, 232);
                  const cool = p.map(Math.min(age, 30), 1, 30, 200, 255);
                  p.fill(120, cool, 180 + (age % 40), alpha);
                  p.rect(x * lifeCellSize, y * lifeCellSize, lifeCellSize - 1, lifeCellSize - 1, 2);
                }
              }
              return;
            }
  
            if (splashMode === "code") {
              p.background(0, 0, 0, 255);
  
              const now = p.millis();
              if (now >= codePauseUntil && codeQueue.length) {
                const current = codeQueue[codeLineIndex % codeQueue.length];
                const shouldType = !codeLastTypeAt || (now - codeLastTypeAt) >= codeTypeInterval;
                if (shouldType) {
                  codeCharIndex += 1;
                  codeLastTypeAt = now;
                  codeTypeInterval = p.random(18, 52);
  
                  if (codeCharIndex > current.length) {
                    codeRendered.push(current);
                    if (codeRendered.length > codeVisibleRows) codeRendered.shift();
                    codeLineIndex = (codeLineIndex + 1) % codeQueue.length;
                    codeCharIndex = 0;
                    codePauseUntil = now + p.random(80, 280);
                  }
                }
              }
  
              p.textFont("monospace");
              p.textSize(codeFontSize);
              p.textAlign(p.LEFT, p.TOP);
              p.noStroke();
  
              let y = 20;
              for (let i = 0; i < codeRendered.length; i += 1) {
                const lineNo = String((codeLineIndex - codeRendered.length + i + codeQueue.length + 1) % codeQueue.length).padStart(3, "0");
                p.fill(36, 84, 36, 170);
                p.text(`${lineNo} `, 18, y);
                p.fill(94, 255, 94, 220);
                p.text(codeRendered[i], 66, y);
                y += codeLineHeight;
              }
  
              const activeLine = codeQueue[codeLineIndex % codeQueue.length] || "";
              const typed = activeLine.slice(0, Math.max(0, codeCharIndex));
              const cursorOn = Math.floor(now / 360) % 2 === 0;
              p.fill(36, 84, 36, 170);
              p.text(">>>", 18, y);
              p.fill(110, 255, 110, 232);
              p.text(typed, 66, y);
  
              if (cursorOn) {
                const w = p.textWidth(typed);
                p.fill(140, 255, 140, 235);
                p.rect(66 + w + 1, y + 2, Math.max(2, Math.floor(codeFontSize * 0.15)), Math.floor(codeFontSize * 1.05));
              }
              return;
            }
  
            if (splashMode === "plot") {
              p.background(12, 14, 20, 250);
              const nowT = p.millis() / 1000;
              const left = 0;
              const right = p.width;
              const top = 0;
              const bottom = p.height;
              const centerY = (top + bottom) * 0.5;
  
              p.stroke(plotAxisColor[0], plotAxisColor[1], plotAxisColor[2], 170);
              p.strokeWeight(1);
              p.line(left, centerY, right, centerY);
              p.line((left + right) * 0.5, top, (left + right) * 0.5, bottom);
  
              const axisX = (left + right) * 0.5;
              p.noStroke();
              p.fill(plotAxisColor[0] + 30, plotAxisColor[1] + 30, plotAxisColor[2] + 30, 210);
              p.textFont("monospace");
              p.textSize(14);
              p.textAlign(p.RIGHT, p.BOTTOM);
              p.text("x", right - 6, centerY - 6);
              p.textAlign(p.LEFT, p.TOP);
              p.text("y", axisX + 8, top + 4);
  
              for (let i = 1; i < 6; i += 1) {
                const y = p.lerp(top, bottom, i / 6);
                p.stroke(plotAxisColor[0], plotAxisColor[1], plotAxisColor[2], 50);
                p.line(left, y, right, y);
              }
  
              for (let i = plotGhostFrames.length - 1; i >= 0; i -= 1) {
                const ghost = plotGhostFrames[i];
                ghost.alpha -= 2.8;
                if (ghost.alpha <= 2) plotGhostFrames.splice(i, 1);
              }
  
              for (const ghost of plotGhostFrames) {
                if (!ghost.points?.length) continue;
                p.noFill();
                p.stroke(plotLineColor[0], plotLineColor[1], plotLineColor[2], ghost.alpha);
                p.strokeWeight(1.1);
                p.beginShape();
                for (const pt of ghost.points) p.vertex(pt.x, pt.y);
                p.endShape();
              }
  
              p.noFill();
              p.stroke(plotLineColor[0], plotLineColor[1], plotLineColor[2], 230);
              p.strokeWeight(2.2);
              p.beginShape();
              const steps = Math.max(180, Math.floor((right - left) / 3));
              const currentPoints = [];
              for (let i = 0; i <= steps; i += 1) {
                const u = i / steps;
                const x = p.lerp(left, right, u);
                const xNorm = (u * 2) - 1;
                const yVal = evalPlot(xNorm, nowT);
                const y = centerY - yVal * ((bottom - top) * 0.36);
                currentPoints.push({ x, y });
                p.vertex(x, y);
              }
              p.endShape();
              plotGhostFrames.push({ points: currentPoints, alpha: 128 });
              if (plotGhostFrames.length > 24) {
                plotGhostFrames.splice(0, plotGhostFrames.length - 24);
              }
  
              p.textFont("monospace");
              p.textSize(14);
              p.textAlign(p.LEFT, p.BOTTOM);
              p.noStroke();
              p.fill(180, 196, 220, 220);
              p.text(plotLabel, left, p.height - 14);
              return;
            }
  
            if (splashMode === "bounce") {
              p.background(12, 12, 16, 250);
              const logoRect = splashLogo?.getBoundingClientRect();
  
              for (let i = bounceTrails.length - 1; i >= 0; i -= 1) {
                const trail = bounceTrails[i];
                trail.alpha -= 4.2;
                trail.r *= 0.992;
                if (trail.alpha <= 2 || trail.r <= 1.5) {
                  bounceTrails.splice(i, 1);
                  continue;
                }
                p.noStroke();
                p.fill(trail.color[0], trail.color[1], trail.color[2], trail.alpha);
                p.circle(trail.x, trail.y, trail.r * 2);
              }
  
              for (let i = 0; i < bounceBalls.length; i += 1) {
                let ball = bounceBalls[i];
  
                ball.vy += ball.gravity;
                ball.x += ball.vx;
                ball.y += ball.vy;
                ball.vx *= ball.drag;
  
                if (ball.x - ball.r < 0) {
                  ball.x = ball.r;
                  ball.vx = Math.abs(ball.vx) * 0.92;
                } else if (ball.x + ball.r > p.width) {
                  ball.x = p.width - ball.r;
                  ball.vx = -Math.abs(ball.vx) * 0.92;
                }
  
                if (ball.y + ball.r > p.height) {
                  ball.y = p.height - ball.r;
                  ball.bottomBounces += 1;
                  if (ball.bottomBounces > 3) {
                    ball = spawnBounceBall();
                    bounceBalls[i] = ball;
                  } else {
                    ball.vy = -Math.abs(ball.vy) * ball.bounce;
                    ball.vx += p.random(-0.28, 0.28);
                    if (Math.abs(ball.vy) < 2.1) ball.vy = -p.random(4.6, 6.4);
                  }
                }
  
                // If the ball starts settling on the floor, retire it and spawn a new one.
                if (ball.y + ball.r >= p.height - 0.5 && Math.abs(ball.vy) < 1.5) {
                  ball = spawnBounceBall();
                  bounceBalls[i] = ball;
                }
  
                if (logoRect) {
                  const touchingLogo = circleIntersectsRect(ball.x, ball.y, ball.r, logoRect);
                  if (touchingLogo && !ball.wasTouchingLogo) {
                    // Deflect away from logo center and invert vertical momentum.
                    const cx = (logoRect.left + logoRect.right) * 0.5;
                    const cy = (logoRect.top + logoRect.bottom) * 0.5;
                    const nx = ball.x - cx;
                    const ny = ball.y - cy;
                    if (nx < 0) nudgeSplashLogo(6, 0); // left-side hit -> nudge right
                    else if (nx > 0) nudgeSplashLogo(-6, 0); // right-side hit -> nudge left
                    // Top-left / bottom-right => counter-clockwise, top-right / bottom-left => clockwise.
                    const spinDirection = (nx * ny) >= 0 ? -1 : 1;
                    applySplashLogoHitVisual(spinDirection);
                    const len = Math.max(0.001, Math.hypot(nx, ny));
                    const ux = nx / len;
                    const uy = ny / len;
                    const dot = (ball.vx * ux) + (ball.vy * uy);
                    ball.vx = ball.vx - (2 * dot * ux);
                    ball.vy = ball.vy - (2 * dot * uy);
                    ball.vy -= 0.9;
                    ball.vx += ux * 0.8;
                  }
                  ball.wasTouchingLogo = touchingLogo;
                }
  
                bounceTrails.push({
                  x: ball.x,
                  y: ball.y,
                  r: ball.r * 0.82,
                  alpha: 88,
                  color: [ball.color[0], ball.color[1], ball.color[2]]
                });
                if (bounceTrails.length > 1200) bounceTrails.splice(0, bounceTrails.length - 1200);
  
                p.noStroke();
                p.fill(ball.color[0], ball.color[1], ball.color[2], 230);
                p.circle(ball.x, ball.y, ball.r * 2);
                p.fill(
                  Math.min(255, ball.color[0] + 95),
                  Math.min(255, ball.color[1] + 95),
                  Math.min(255, ball.color[2] + 95),
                  135
                );
                p.circle(ball.x - ball.r * 0.3, ball.y - ball.r * 0.35, ball.r * 0.55);
              }
              return;
            }
  
            for (const n of nodes) {
              n.x += n.dx;
              n.y += n.dy;
              n.pulse += n.pulseSpeed;
              n.r = p.map(Math.sin(n.pulse), -1, 1, n.rMin, n.rMax);
              wrapNode(n);
            }
  
            p.stroke(255, 255, 255, 115);
            p.strokeWeight(1);
            for (const [a, b] of edges) {
              const A = nodes[a];
              const B = nodes[b];
              p.line(A.x, A.y, B.x, B.y);
            }
  
            p.noStroke();
            for (const n of nodes) {
              if (n.red) p.fill(170, 98, 255, 220);
              else p.fill(255, 255, 255, 205);
              p.circle(n.x, n.y, n.r);
            }
          };
        });
      }
  
  
      function destroySplashAnimation() {
        stopSplashLogo3dAnimation();
        if (!splashP5Instance) return;
        splashP5Instance.remove();
        splashP5Instance = null;
        splashP5Host && (splashP5Host.innerHTML = "");
      }
  
      function stopSplashRotation() {
        if (splashRotationTimer) {
          clearInterval(splashRotationTimer);
          splashRotationTimer = null;
        }
        if (splashCountdownTimer) {
          clearInterval(splashCountdownTimer);
          splashCountdownTimer = null;
        }
        splashNextSwitchAt = 0;
        splashRotationSeconds = 0;
        if (splashCountdown) {
          splashCountdown.classList.add("hidden");
          splashCountdown.textContent = "";
        }
      }
  
      function updateSplashCountdown() {
        if (!splashCountdown || !splashNextSwitchAt) return;
        const remainingMs = splashNextSwitchAt - Date.now();
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        splashCountdown.textContent = `${remainingSec}s`;
      }
  
      async function rotateSplashAnimation() {
        if (splashSwitching) return;
        if (!splashScreen || splashScreen.classList.contains("hidden")) return;
        if (!isSplashAnimationEnabled()) return;
        splashSwitching = true;
        try {
          const nextMode = pickRandomSplashMode(true);
          destroySplashAnimation();
          await initSplashAnimation(nextMode);
        } finally {
          splashSwitching = false;
        }
      }
  
      function startSplashRotationIfNeeded() {
        stopSplashRotation();
        if (!isSplashAnimationEnabled()) return;
        if (getConfiguredSplashAnimationMode() !== "random") return;
        const { enabled, seconds } = getRandomCycleConfig();
        if (!enabled) return;
        splashRotationSeconds = seconds;
        splashNextSwitchAt = Date.now() + splashRotationSeconds * 1000;
        if (splashCountdown) splashCountdown.classList.remove("hidden");
        updateSplashCountdown();
        splashCountdownTimer = window.setInterval(updateSplashCountdown, 200);
        splashRotationTimer = window.setInterval(() => {
          rotateSplashAnimation();
          splashNextSwitchAt = Date.now() + splashRotationSeconds * 1000;
          updateSplashCountdown();
        }, splashRotationSeconds * 1000);
      }
      let showSplash = !!forceShow;
      if (!forceShow) {
        showSplash = true;
        try {
          const ref = document.referrer ? new URL(document.referrer) : null;
          showSplash = !(ref && ref.origin === location.origin);
        } catch {
          showSplash = true;
        }
      }
  
      if (showSplash) {
        splashClosing = false;
        splashLogo?.classList.remove("is-melting");
        resetSplashLogoImpactVisual();
        splashScreen?.classList.remove("hidden");
        document.body.classList.add("splash-active");
        ({ splashLogoIconP5, splashLogoIconCanvasHost } = await mountSplashLogoIconAnimation({
          splashLogo,
          getBannerLogoAnimationMode,
          currentInstance: splashLogoIconP5,
          currentCanvasHost: splashLogoIconCanvasHost
        }));
        initSplashAnimation();
        startSplashRotationIfNeeded();
      } else {
        splashScreen?.classList.add("hidden");
        document.body.classList.remove("splash-active");
        stopSplashRotation();
        clearSplashLogoCornerTimer();
        destroySplashAnimation();
      }
  
      if (bindTopLeftBrand) {
        topLeftBrand?.addEventListener("click", async (e) => {
          e.preventDefault();
          splashClosing = false;
          splashLogo?.classList.remove("is-melting");
          resetSplashLogoImpactVisual();
          splashScreen?.classList.remove("hidden");
          document.body.classList.add("splash-active");
          ({ splashLogoIconP5, splashLogoIconCanvasHost } = await mountSplashLogoIconAnimation({
            splashLogo,
            getBannerLogoAnimationMode,
            currentInstance: splashLogoIconP5,
            currentCanvasHost: splashLogoIconCanvasHost
          }));
          initSplashAnimation();
          startSplashRotationIfNeeded();
        });
      }
  
      const closeSplash = () => {
        if (splashClosing) return;
        splashClosing = true;
        splashScreen?.classList.add("hidden");
        document.body.classList.remove("splash-active");
        stopSplashRotation();
        clearSplashLogoCornerTimer();
        destroySplashAnimation();
        splashLogo?.classList.remove("is-melting");
        resetSplashLogoImpactVisual();
        splashClosing = false;
      };
  
      const closeSplashWithMelt = () => {
        if (splashClosing) return;
        splashClosing = true;
        splashLogo?.classList.add("is-melting");
        window.setTimeout(() => {
          splashScreen?.classList.add("hidden");
          document.body.classList.remove("splash-active");
          stopSplashRotation();
          clearSplashLogoCornerTimer();
          destroySplashAnimation();
          splashLogo?.classList.remove("is-melting");
          resetSplashLogoImpactVisual();
          splashClosing = false;
        }, 720);
      };
  
      splashScreen?.addEventListener("click", closeSplash);
      splashLogo?.addEventListener("click", (e) => {
        e.stopPropagation();
        closeSplashWithMelt();
      });
      // ---- Data source: Admin localStorage first, fallback JSON ----
}
