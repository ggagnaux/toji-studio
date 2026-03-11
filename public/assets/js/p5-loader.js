let splashP5LoadPromise = null;

export async function ensureSplashP5() {
  if (window.p5) return;
  if (!splashP5LoadPromise) {
    splashP5LoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-p5-splash]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js";
      script.async = true;
      script.setAttribute("data-p5-splash", "1");
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  await splashP5LoadPromise;
}
