// nc-comps.js
// Handles: top view tabs (Comps/Leaderboard) + round tabs (R1..R6) in Comps view.
// No data, no rendering below filters yet.

(function () {
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setActiveView(root, view) {
    // Top tabs
    const tabs = qsa('.nc-tab', root);
    tabs.forEach((btn) => {
      const isActive = btn.getAttribute('data-view') === view;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
    });

    // Panels
    qsa('.nc-panel', root).forEach((panel) => {
      const isActive = panel.getAttribute('data-view') === view;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  }

  function setActiveRound(root, round) {
    const roundTabs = qsa('.nc-round-tab', root);
    if (roundTabs.length === 0) return;

    roundTabs.forEach((btn) => {
      const isActive = btn.getAttribute('data-round') === String(round);
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
    });

    // For now we do nothing else (no content to swap yet).
    // Later, we'll use `round` to decide which comps to show.
  }

  document.addEventListener('DOMContentLoaded', () => {
    const root = qs('#ncCompsPage');
    if (!root) return;

    // Top view tabs
    const viewTabs = qsa('.nc-tab', root);
    viewTabs.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        if (!view) return;
        setActiveView(root, view);
      });
    });

    // Round tabs (Comps view only)
    const roundTabs = qsa('.nc-round-tab', root);
    roundTabs.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const round = btn.getAttribute('data-round');
        if (!round) return;
        setActiveRound(root, round);
      });
    });

    // Defaults
    setActiveView(root, 'comps');
    setActiveRound(root, '1');
  });
})();
