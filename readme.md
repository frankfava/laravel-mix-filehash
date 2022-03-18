# Laravel Mix File Hash Extension <!-- omit in toc -->

![](https://img.shields.io/badge/Version-1.0.2-brightgreen)

This is a Laravel Mix Extension the will add a hash to your filenames.

### WHY?!?!

Sometimes `mix.version()` just doesnt cut when it comes to clearing the browser cache, and this will result in JS errors that can cause a fatal error or the "white screen of death" on SPAs.

This removes the need for `mix.version()` and instead adds a hash to the filename so the browser sees it as a new file and fetches a new copy as needed.

This is designed for Laravel applications using the `mix()` method. 

### Description

`mix-manifest.json` from..

```json
{
	"/js/app.js": "/js/app.js",
	....
}
``` 

to...

```json
{
	"/js/app.js": "/js/app.992fe2643cfbda61.js",
	....
}
``` 


### Usage

**webpack.mix.js**

```javascript
let mix = require('laravel-mix');
(require('laravel-mix-file-hash')(mix))

mix.js('resources/js/app.js', 'app.js')
	.fileHash({
		jsFolder : 'js',
		cssFolder: 'css',
		applyOnMainFiles: true,
		resetManifestPathOnFiles : ['/js/app.js','css/app.css'],
	})
	.....
```

**app.blade.html**

```html
<script src="{{ mix('js/app.js') }}"></script>
```
```html
<script src="/js/app.992fe2643cfbda61.js"></script>
```

### Options

**Defaults**

```javascript
{
	useCustomHash : false,
	hashLength: 16,
	jsFolder : '',
	cssFolder : '',
	applyOnMainFiles : false,
	resetManifestPathOnFiles : []
}
```

* **useCustomHash**: Use a randomly generated hash instead of a content hash
	- Content hashes will only update when data changes, custom hash will always change
* **hashLength**: Set the length of the custom hash, set to 0 to disable (`useCustomHash` must be true)
* **jsFolder**: Folder for your main and chunk js files. *Recommended*: 'js' = 'public/js'
* **cssFolder**: Folder for your main and chunk css files. *Recommended*: 'css' = 'public/css'
* **applyOnMainFiles**: Will add a content hash to the main/ entry point files
	- `/js/app.js` >> `/js/app.992fe2643cfbda61.js`
	- You will need to use a method like `mix()` on your backend to get the correct file as it changes
	- If you experience errors when not using Laravel, set `{ applyOnMainFiles : false }` to not add a hash to the entry point files
* **resetManifestPathOnFiles**: An array of relative paths that will reset in the Mix Manifest file
	- `{"/js/app.992fe2643cfbda61.js": "/js/app.992fe2643cfbda61.js"}` changes to ``{"/js/app.js": "/js/app.992fe2643cfbda61.js"}``
	- This allows the `mix()` method to continue to work `mix('/js/app.js')`
