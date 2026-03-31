export function initThumbSelectAllController({
  button,
  getVisibleItems,
  selected,
  onAfterToggle
} = {}) {
  const handleClick = () => {
    const visible = Array.isArray(getVisibleItems?.()) ? getVisibleItems() : [];
    if (!visible.length) return { changed: false, visibleCount: 0, allVisibleSelected: false };

    const allVisibleSelected = visible.every((item) => selected?.has?.(item?.id));
    if (allVisibleSelected) visible.forEach((item) => selected?.delete?.(item?.id));
    else visible.forEach((item) => selected?.add?.(item?.id));

    onAfterToggle?.({
      changed: true,
      visibleCount: visible.length,
      allVisibleSelected: !allVisibleSelected
    });

    return {
      changed: true,
      visibleCount: visible.length,
      allVisibleSelected: !allVisibleSelected
    };
  };

  button?.addEventListener?.("click", handleClick);

  return {
    handleClick,
    dispose() {
      button?.removeEventListener?.("click", handleClick);
    }
  };
}
