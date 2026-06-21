// onReady.js - custom script to perform actions after the page is loaded but before the screenshot is taken
// Please see the default onReady.js in the Playwright engine scripts for an example of how to interact with the page before the screenshot.

module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  console.log('SCENARIO > ' + scenario.label);
  await require('./clickAndHoverHelper')(page, scenario);

  // add more ready handlers here...
};
