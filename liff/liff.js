import { LIFF_ID } from "./constants.js";

function init() {
  // Example using window.location.replace()
  return liff
    .init({
      liffId: LIFF_ID, // local
      withLoginOnExternalBrowser: true, // Enable automatic login process
    })
    .then(() => null)
    .catch((e) => e.message);
}

function initWithSearchParams(cb) {
  // Example using window.location.replace()
  return liff
    .init({
      liffId: LIFF_ID, // local
      withLoginOnExternalBrowser: true, // Enable automatic login process
    })
    .then(() => {
      // Get the URL query string
      const queryString = window.location.search;

      // Create a URLSearchParams object
      const urlParams = new URLSearchParams(queryString);

      cb(urlParams);
    })
    .catch((e) => e.message);
}

export { init, initWithSearchParams };
