// TODO
// <img generator-unable-to-provide-required-alt=""> via https://twitter.com/kornelski/status/238192634827505664
// Avatar local cache has maximum size assumptions that need to be removed

// TODO if 404 or other bad status code, write that to cache! to avoid re-requests
const shorthash = require("short-hash");
const path = require("path");
const flatCache = require("flat-cache");
const { URL } = require("url");
const AvatarLocalCache = require("avatar-local-cache");

const IMG_DIRECTORY = "img/";
const CACHE_DIRECTORY = ".cache/";
const OFFLINE_MODE = false;

function serializeObjectToAttributes(obj = {}) {
	let ret = [];
	for( let attrName in obj ) {
		if(attrName === "__keywords") continue; // weird Nunjucks thing
		ret.push(` ${attrName}="${obj[attrName]}"`);
	}
	return ret.join("");
}

function isFullUrl(url) {
	try {
		new URL(url);
		return true;
	} catch(e) {
		// invalid url OR local path
		return false;
	}
}

function getFormatsArray(formats) {
	if(formats && formats.length) {
		if(typeof formats === "string") {
			formats = formats.split(",");
		}
		return formats;
	}

	return [];
}

function getDurationMs(duration = "0s") {
	let durationUnits = duration.substr(-1);
	let durationMultiplier;
	if(durationUnits === "s") {
		durationMultiplier = 1;
	} else if(durationUnits === "m") {
		durationMultiplier = 60;
	} else if(durationUnits === "h") {
		durationMultiplier = 60 * 60;
	} else if(durationUnits === "d") {
		durationMultiplier = 60 * 60 * 24;
	} else if(durationUnits === "w") {
		durationMultiplier = 60 * 60 * 24 * 7;
	} else if(durationUnits === "y") {
		durationMultiplier = 60 * 60 * 24 * 365;
	}

	let durationValue = parseInt(duration.substr(0, duration.length - 1), 10);
	return durationValue * durationMultiplier * 1000;
}

function imgShortcode(props = {}, options = {}) {
	options = Object.assign({
		cacheremotesrc: true,
		allowmissingalt: false,
		duration: '1d',
		imgDirectory: IMG_DIRECTORY,
		cacheDirectory: CACHE_DIRECTORY,
		offlineMode: OFFLINE_MODE,
		imgSrcDirectory: "",
		pathPrefix: "/",
		addWidthHeight: true,
		// image formats
		formats: null,
		// skipCache: false, TODO
		// maxwidth: 400 // in px
	}, options);

	if(!options.allowmissingalt && !("alt" in props)) {
		throw new Error(`Missing [alt] attribute on <img src="${props.src}">`);
	}

	let url = props.src;
	let validUrl = isFullUrl(url);

	return new Promise(function(resolve) {
		if(!options.cacheremotesrc || !validUrl) {
			resolve([url]);
			return;
		}

		let id = shorthash(url);
		let cache = flatCache.load(`eleventy-plugin-img-${id}`, path.resolve(options.cacheDirectory));
		let cacheObj = cache.getKey(url);

		if(cacheObj && (options.duration === "*" || (Date.now() - cacheObj.cachedAt < getDurationMs(options.duration))) ) {
			resolve(cacheObj.value);
		} else {
			if(options.offlineMode) {
				resolve([]);
				return;
			}

			// TODO check to see if this is a local or remote url automatically
			let avatarCache = new AvatarLocalCache();
			let formats = getFormatsArray(options.formats);
			if(formats.length) {
				avatarCache.formats = formats;
			}

			let maxwidth = parseInt(options.maxwidth, 10);
			if(!isNaN(maxwidth)) {
				avatarCache.width = maxwidth;
			}
			if(!options.addWidthHeight) {
				avatarCache.skipMetadata = true;
			}

			// TODO make sure the imgDirectory exists.
			avatarCache.fetchUrl(url, path.join(options.imgDirectory, id)).catch(e => {
				console.log( `Image error: ${e}` );
			}).then(function(files) {
				if(files && files.length) {
					let paths = files.map(file => file.path);
					console.log( `Cached remote image from ${url} to:`, paths );

					// If we want this later, save it to a cache
					cache.setKey(url, {
						cachedAt: Date.now(),
						value: files
					});
					cache.save();

					resolve(files);
				} else {
					// Bad error code
					// TODO: option to resolve to stock image path?
					resolve([]);
				}
			});
		}
	}).then(function(files) {
		function getImgSrc(fileObj, options) {
			if(isFullUrl(fileObj.path)) {
				return fileObj.path;
			}

			return path.join( options.pathPrefix, options.imgSrcDirectory, `${fileObj.name}.${fileObj.extension}`);
		}

		let ret = [];
		if( files.length >= 2 ) {
			
			ret.push(`<picture>`);
			ret.push(`<source srcset="${ getImgSrc(files[0], options) }" type="image/webp">`);
		}
		if( files.length ) {
			let img = files[files.length - 1];
			let imgUrl = getImgSrc(img, options);

			if(options.addWidthHeight) {
				if(img.width && !props.width) {
					props.width = img.width;
				}
				if(img.height && !props.height) {
					props.height = img.height;
				}
			}
			let copiedProps = Object.assign({}, props);
			delete copiedProps.src;

			ret.push(`<img src="${ imgUrl }"${serializeObjectToAttributes(copiedProps)}>`);
		}
		if( files.length >= 2 ) {
			ret.push("</picture>");
		}

		return ret.join("");
	}.bind(this));
}

module.exports = function(eleventyConfig) {
	eleventyConfig.addShortcode("img", imgShortcode);
};

module.exports.img = imgShortcode;