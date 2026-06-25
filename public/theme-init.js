(function () {
  try {
    var pref = localStorage.getItem("station-zero-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved =
      pref === "light" ? "light" : pref === "dark" ? "dark" : prefersDark ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
