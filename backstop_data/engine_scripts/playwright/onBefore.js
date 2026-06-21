// onBefore.js - custom script to load cookies before each scenario
// Please see the default onBefore.js in the Playwright engine scripts for an example of how to load cookies from the scenario config.

module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  await require('./loadCookies')(browserContext, scenario);
};
