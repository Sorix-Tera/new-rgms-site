// nc-comps.js
// Only handles the top tabs for nc-comps. Panels are intentionally empty for now.

(function () {
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setActiveView(root, view) {
    // Tabs
    const tabs = qsa('.nc-tab', root);
    tabs.forEach((btn) => {
      const isActive = btn.getAttribute('data-view') === view;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
    });

    // Panels (empty for now)
    qsa('.nc-panel', root).forEach((panel) => {
      const isActive = panel.getAttribute('data-view') === view;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const root = qs('#ncCompsPage');
    if (!root) return;

    const tabs = qsa('.nc-tab', root);
    if (tabs.length === 0) return;

    tabs.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        if (!view) return;
        setActiveView(root, view);
      });
    });

    // Optional keyboard support: left/right arrows cycle tabs
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const activeIndex = tabs.findIndex((t) => t.classList.contains('is-active'));
      if (activeIndex === -1) return;

      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (activeIndex + dir + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (!nextTab) return;

      nextTab.focus();
      const view = nextTab.getAttribute('data-view');
      if (!view) return;
      setActiveView(root, view);
    });
  });
})();
