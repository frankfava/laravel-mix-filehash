// Example: require('@igomoon/hubspot-laravel-mix')(mix)

module.exports = (mix = null) => { 
	if (!!mix) {
		const MixFileHash = require('./MixFileHash')
		mix.extend('fileHash', new MixFileHash())
	}
}