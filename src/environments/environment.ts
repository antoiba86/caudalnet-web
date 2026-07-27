// Absolute in dev: `ng serve` runs on :4200 and the API on :8000, so this is the
// one configuration that is genuinely cross-origin (hence the CORS middleware).
export const environment = {
    production: false,
    apiBaseUrl: 'http://localhost:8000/api'
};
