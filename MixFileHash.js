let path = require('path');
const fs = require("fs");
let { randomBytes } = require('crypto');

class MixFileHash {

	name() { return ['fileHash']; }

	options = {}

	defaults = {
		useCustomHash : false,
		hashLength: 16,
		jsFolder : '',
		cssFolder : '',
		cleanDist : true,
		applyOnMainFiles : false,
		resetManifestPathOnFiles : []
	}

	/**
	 * register
	 */
	register(options = {}) {
		// Initial Options
		this.options = Object.assign({}, this.defaults, options)

		// Config
		this.context.listen('configReady', config => {
			this.options = Object.assign(this.options, {
				rootPath: config.context,
				publicPath: config.output.path,
				manifestPath: path.resolve(config.context, this.context.manifest.path())
			})

			// Remove leading slash
			this.options.resetManifestPathOnFiles = this.options.resetManifestPathOnFiles
				.map(file => (file.substring(0, 1) == '/' ? file.substring(1) : file))
		})

		if (!fs.existsSync('./artisan') && this.options.applyOnMainFiles) { 
			console.log('This extension was designed for Laravel applications using the mix() method. If you experience errors when not using Laravel, set { applyOnMainFiles : false } to not add a hash to the entry point files.')
		}

		// Fire after
		this.context.listen('build', () => this.fixManifestFile() )
	}

	/**
	 * webpackConfig
	 */
	webpackConfig(config) {
		// Change JS output rules
		config.output = this.applyJsOutputRules(config.output)
		// Change CSS Output rules
		config.plugins.map((p, i) => {
			if (p.constructor.name == 'MiniCssExtractPlugin') { p.options = this.applyCssOutputRules(p.options) }
			return p
		})
		// Clean old chunks
		if (this.options.cleanDist) {
			config.output.clean = { 
				keep : (asset) => {
					return !asset.includes(`${this.options.jsFolder}/`) &&
						!asset.includes(`${this.options.cssFolder}/`);
				},
			}
		}
	}

	/**
	 * applyJsOutputRules
	 */
	applyJsOutputRules(webpackOutput) {
		let relative = this.helpers.getRelativePathFromPublic(this.options.jsFolder)
		return Object.assign({}, webpackOutput, {
			filename : path.join(relative,`[name]${(this.options.applyOnMainFiles ? this.getHashToInsert(): '')}.js`),
			chunkFilename : path.join(relative,`[name]${this.getHashToInsert()}.js`)
		})
	}

	/**
	 * applyCssOutputRules
	 */
	applyCssOutputRules(webpackOutput = {}) {
		let relative = this.helpers.getRelativePathFromPublic(this.options.cssFolder)
		return Object.assign({}, webpackOutput, {
			filename : `${relative}/[name]${(this.options.applyOnMainFiles ? this.getHashToInsert(): '')}.css`,
			chunkFilename : `${relative}/[name]${this.getHashToInsert()}.css`
		})
	}

	/**
	 * getHashToInsert
	 */
	getHashToInsert() {
		// Generate custom hash
		if (!!this.options.useCustomHash) { 
			return (!!this.options.hashLength) ? `.${randomBytes(32).toString('hex').substring(0,this.options.hashLength)}` : ''
		}
		// Otherwise return webapck substitution (https://webpack.js.org/configuration/output/#template-strings)
		return '.[contenthash]';
	}

	/**
	 * fixManifestFile
	 */
	fixManifestFile() {
		let manifestJson = this.context.manifest.read()
		let newManifest = {}

		Object.keys(manifestJson).forEach(pathFromPublic => {
			let loadPath = manifestJson[pathFromPublic].replace('//','/')
			pathFromPublic = pathFromPublic.replace('//', '/')

			// Test
			let regex = new RegExp(/(\/\w+\/)?(\w+)(\.\w+)?(\.\w+)(?=\?)?(.*)/, 'g')		
			let match = regex.exec(loadPath)
			let [full, dir, name, hash, ext, version] = match
			
			// Reset manifest
			let nameWithoutHash = (dir + name + ext)
			let resetManifestPath = this.options.resetManifestPathOnFiles.some(filename => nameWithoutHash.endsWith(filename))
			
			// reset Manifest Path on this file?
			if (resetManifestPath) { pathFromPublic = nameWithoutHash }
			// Add to new manifest
			newManifest[pathFromPublic] = loadPath
		})

		this.context.manifest.manifest = newManifest
		this.context.manifest.refresh()
	}

	get context() {
		return global.Mix;
	}

	helpers = {
		//
		getFullPathFromPublic : (filepath = '') => {
			let publicPath = path.resolve(this.context.paths.rootPath, this.context.config.publicPath)
			return path.join(publicPath, filepath)
		},

		//
		getRelativePathFromPublic : (filepath = '') => {
			let publicPath = path.resolve(this.context.paths.rootPath, this.context.config.publicPath)
			let fullPublicPath = path.resolve(publicPath, filepath)
			return path.relative(publicPath, fullPublicPath)
		},

		//
		merge : (target, source) => {
			for (const key of Object.keys(source)) {
				if (source[key] instanceof Object) Object.assign(source[key], this.helpers.merge(target[key], source[key]))
			}
			Object.assign(target || {}, source)
			return target
		}
	}

}

module.exports = MixFileHash