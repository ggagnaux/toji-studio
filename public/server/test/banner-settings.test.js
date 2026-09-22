import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("live banner settings override loaded settings and discard delayed hydration", async () => {
  const source = fs.readFileSync(new URL("../../assets/js/header.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/export function /g, "function ");
  const store = new Map();
  const borders = new Map();
  const host = { isConnected: true, querySelector: () => ({ style: { setProperty: (key, value) => borders.set(key, value) } }) };
  let resolveFetch;
  const modes = [];
  const context = vm.createContext({
    console, host, modes,
    window: { location: { origin: "https://example.test" } },
    localStorage: { setItem: (key, value) => store.set(key, value), getItem: key => store.get(key) },
    fetch: () => new Promise(resolve => { resolveFetch = resolve; })
  });
  vm.runInContext(source + `
    ensureDefaultBannerLogoMarkup = () => {};
    applyStaticBannerLogo = () => modes.push('off');
    mountBannerBezierLogo = () => modes.push('circles');
    mountBannerPlotLogo = () => modes.push('plot');
    mountBannerRadarLogo = () => modes.push('radar');
    mountBannerWireframeSphereLogo = () => modes.push('sphere');
  `, context);
  const loading = vm.runInContext("hydratePublicBannerSettings(host)", context);
  for (const mode of ["circles", "plot", "radar", "sphere"]) {
    context.settings = { animatedLogoEnabled: true, animationMode: mode, logoBorderEnabled: false, logoBorderColor: "#123456" };
    vm.runInContext("applyBannerLogoBehavior(host, settings)", context);
    assert.equal(modes.at(-1), mode);
    assert.equal(borders.get("--banner-logo-border-width"), "0px");
    assert.equal(borders.get("--banner-logo-border-color"), "#123456");
  }
  resolveFetch({ ok: true, json: async () => ({ animatedLogoEnabled: false, logoBorderEnabled: true }) });
  await loading;
  assert.equal(modes.at(-1), "sphere");
  assert.equal(borders.get("--banner-logo-border-width"), "0px");
  let removed = 0;
  context.sketch = { remove() { removed++; } };
  vm.runInContext("bannerSketches.set(host, sketch); applyBannerLogoBehavior(host, { animatedLogoEnabled: false, logoBorderEnabled: true })", context);
  assert.equal(removed, 1);
  assert.equal(modes.at(-1), "off");
  assert.equal(borders.get("--banner-logo-border-width"), "1px");
});

test("banner saves serialize edits and ignore stale responses while preview updates immediately", async () => {
  const source = fs.readFileSync(new URL("../../admin/js/other-settings.js", import.meta.url), "utf8");
  const code = source.slice(source.indexOf("let bannerSaveRevision"), source.indexOf("async function saveImageVariantSettings"));
  const sent = [], saved = [], previews = [];
  let finish;
  const context = vm.createContext({
    console, headerHost: {}, current: { animationMode: "circles" },
    getAdminToken: () => true,
    collectBannerSettings: () => ({ ...context.current }),
    persistSettings: () => previews.push(context.current.animationMode),
    apiFetch: (_, options) => { sent.push(JSON.parse(options.body)); return new Promise(resolve => { finish = resolve; }); },
    applyBannerSettingsToLocalStorage: value => saved.push(value.animationMode),
    syncSplashModeUI() {}, ensureStaticBannerIconMarkup() {}, applyBannerLogoBehavior() {}
  });
  vm.runInContext(code, context);
  const first = vm.runInContext("persistBannerSettings({ refreshBanner: true })", context);
  await Promise.resolve();
  context.current = { animationMode: "plot" };
  vm.runInContext("persistBannerSettings({ refreshBanner: true })", context);
  context.current = { animationMode: "sphere" };
  const latest = vm.runInContext("persistBannerSettings({ refreshBanner: true })", context);
  assert.deepEqual(previews, ["circles", "plot", "sphere"]);
  assert.equal(sent.length, 1);
  finish({ animationMode: "circles" });
  await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(saved, []);
  assert.deepEqual(sent.map(value => value.animationMode), ["circles", "sphere"]);
  finish({ animationMode: "sphere" });
  await latest;
  assert.deepEqual(saved, ["sphere"]);
});
