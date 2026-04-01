export function syncFloatingFieldState(field, control) {
  if (!field || !control) return;
  field.classList.toggle("has-value", !!String(control.value ?? "").trim());
}

export function bindFloatingField(field, control) {
  if (!field || !control || field.dataset.floatingBound === "1") return;
  const sync = () => syncFloatingFieldState(field, control);
  const scheduleFollowupSyncs = () => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(sync);
      requestAnimationFrame(() => requestAnimationFrame(sync));
    }
    setTimeout(sync, 0);
    setTimeout(sync, 120);
    setTimeout(sync, 400);
  };
  control.addEventListener("input", sync);
  control.addEventListener("change", sync);
  control.addEventListener("blur", sync);
  control.addEventListener("focus", sync);
  field.dataset.floatingBound = "1";
  sync();
  scheduleFollowupSyncs();
}

export function bindFloatingFields(root = document, fieldSelector = ".floating-field") {
  root.querySelectorAll(fieldSelector).forEach((field) => {
    const control = field.querySelector("input, select, textarea");
    if (control) bindFloatingField(field, control);
  });
}

export function syncFloatingFields(root = document, fieldSelector = ".floating-field") {
  root.querySelectorAll(fieldSelector).forEach((field) => {
    const control = field.querySelector("input, select, textarea");
    if (control) syncFloatingFieldState(field, control);
  });
}
