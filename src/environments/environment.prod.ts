// Relative on purpose: an absolute '/api' would resolve against the host origin,
// which under Home Assistant is Home Assistant's own REST API. Resolving against
// <base href="./"> keeps the calls inside the ingress prefix.
export const environment = {
    production: true,
    apiBaseUrl: 'api'
};
