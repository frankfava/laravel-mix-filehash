let glob = require('glob');
let path = require('path');
const fs = require("fs");
let { randomBytes } = require('crypto');

class MixFileHash {

	name() { return ['fileHash']; }

	options = {}

	defaults = {
		publicPath: '',
		manifestPath : '',
		removeVersionHash: true,
		hashLength : 16
	}

	webpackConfig(webpackConfig) {
		let BuildOutputPlugin = require(this.context.resolve('laravel-mix/src/webpackPlugins/BuildOutputPlugin'));
		webpackConfig.plugins = webpackConfig.plugins.filter(p => !(p instanceof BuildOutputPlugin))
	}

	register(options = []) {
		let paths = {
			publicPath: this.getFullPathFromPublic(),
			manifestPath: path.resolve(this.context.paths.rootPath, this.context.manifest.path())
		}
		this.options = Object.assign({}, this.defaults, options, paths)

		// Fire after
		this.context.listen('build', () => this.modifyManifestFile())
	}
	
	modifyManifestFile() {
		let manifestJson = this.context.manifest.read()
		
		let newManifest = {}
		
		Object.keys(manifestJson).forEach(pathFromPublic => {
			let regex = new RegExp(/(.*)\.(\w+)(?=\?)?(.*)/, 'g')
			
			let match = regex.exec(manifestJson[pathFromPublic])
			let [full, base, ext, version] = match
			
			let newFileName = base
			newFileName += (!!this.options.hashLength) ? `.${randomBytes(this.options.hashLength).toString('hex')}` : ''
			newFileName += `.${ext}`
			newFileName += (!this.options.removeVersionHash && this.context.components.has("version")) ? version : ''

			newManifest[pathFromPublic] = this.updateFileName(pathFromPublic, newFileName) || manifestJson[pathFromPublic]

			this.removeStaleFiles(base,newFileName)
		})

		this.context.manifest.manifest = newManifest
		this.context.manifest.refresh()
	}

	updateFileName(pathFromPublic, newFileName) {
		try {
			fs.renameSync(this.getFullPathFromPublic(pathFromPublic), this.getFullPathFromPublic(newFileName));
			return newFileName;
		}
		catch (e) { 
			console.error(e)
		}
		return false
	}

	removeStaleFiles(base,newFileName) {
		glob.sync(`${this.getFullPathFromPublic()}/${base}.*`)
			.filter(file => !file.toString().endsWith(newFileName))
			.forEach(path => { 
				try {
					fs.unlinkSync(path)
				} catch(err) {
					console.error(err)
					return false
				}
			})
		return true
	}

	getFullPathFromPublic(filepath = '') {
		let publicPath = path.resolve(this.context.paths.rootPath, this.context.config.publicPath)
		return path.join(publicPath, filepath)
	}

	get context() {
		return global.Mix;
	}

}

module.exports = MixFileHash