/* ==========================================================================
   NeoJob — Chart.js theming helper (charts.js)
   Loaded only on pages that render a chart. Applies the NeoJob dark palette
   to Chart.js globally, then exposes a couple of small factory functions.
   ========================================================================== */

const NeoCharts = (() => {

  function applyTheme(){
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#8598ae';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.borderColor = 'rgba(148,178,214,.12)';
  }

  function gridOptions(){
    return {
      grid: { color: 'rgba(148,178,214,.10)' },
      ticks: { color: '#8598ae' },
    };
  }

  /** Builds the chart on a deferred tick (not synchronously). A bar chart
   *  created the instant the page script runs can measure a container that
   *  hasn't finished its flex layout yet (sidebar + webfont swap still
   *  settling) and never recovers — even calling .resize() afterwards keeps
   *  the stale, too-narrow plot area. setTimeout (not requestAnimationFrame,
   *  which browsers pause entirely for a backgrounded/hidden tab) sidesteps
   *  that reliably either way. */
  function barChart(canvasId, labels, data, opts){
    opts = opts || {};
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    applyTheme();

    setTimeout(() => {
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();

        const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 220);
        gradient.addColorStop(0, 'rgba(95,216,255,.9)');
        gradient.addColorStop(1, 'rgba(154,134,255,.55)');

        new Chart(canvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: opts.label || '',
              data,
              backgroundColor: gradient,
              borderRadius: 6,
              maxBarThickness: 42,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#0e1726',
                borderColor: 'rgba(148,178,214,.2)',
                borderWidth: 1,
                padding: 10,
                titleColor: '#f3f8fd',
                bodyColor: '#c3d3e3',
              },
            },
            scales: {
              x: gridOptions(),
              y: Object.assign({ beginAtZero: true, ticks: { precision: 0 } }, gridOptions()),
            },
          },
        });
    }, 30);
  }

  return { applyTheme, barChart };
})();
