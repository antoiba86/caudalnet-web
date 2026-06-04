// Minimal Karma config for the Angular (esbuild) karma builder.
//
// The builder injects its own frameworks/plugins and discovers *.spec.ts via
// tsconfig.spec.json — do NOT redefine frameworks/plugins here or spec
// discovery breaks ("No specs found"). We only add a CI browser: headless
// Chrome with --no-sandbox, which CI runners require (they can't sandbox).
//
// Run locally: `npm test` (uses your default browsers).
// Run headless: `npm test -- --no-watch --browsers=ChromeHeadlessCI`.
module.exports = function (config) {
    config.set({
        customLaunchers: {
            ChromeHeadlessCI: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--disable-gpu']
            }
        }
    });
};
