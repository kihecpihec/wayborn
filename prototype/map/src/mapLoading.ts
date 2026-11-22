// Runs inside the map document in both the WebView and iframe.
export const mapLoadingSource = String.raw`
(function createMapLoading(show) {
  let deadline;
  let ready = false;
  return {
    begin() {
      clearTimeout(deadline);
      ready = false;
      show('loading');
      deadline = setTimeout(() => show('unavailable'), 3000);
    },
    tileDrawn() {
      if (ready) return;
      ready = true;
      clearTimeout(deadline);
      show('ready');
    }
  };
})
`;
