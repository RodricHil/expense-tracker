// Apply the saved theme before the page paints; CSS handles system mode without JS.
(function () {
  var preference = "system";
  try {
    var saved = localStorage.getItem("finex-theme");
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {}
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
})();
