# eleventy-plugin-img

⚠️⚠️⚠️ This plugin has been temporarily superceded by the lower level utility [`eleventy-img`](https://github.com/11ty/eleventy-img). Please use that instead!

* https://github.com/11ty/eleventy-img

## Installation

Available on [npm](https://www.npmjs.com/package/@11ty/eleventy-plugin-img).

```
npm install @11ty/eleventy-plugin-img --save-dev
```

Open up your Eleventy config file (probably `.eleventy.js`) and use `addPlugin`:

```
const pluginImg = require("@11ty/eleventy-plugin-img");
module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginImg);
};
```

Read more about [Eleventy plugins.](https://www.11ty.io/docs/plugins/)
