const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const utils = require('./utils');

const TIAPP_FILENAME = 'tiapp.xml';
const EVENT_MODIFIED = 'modified';
const TIMODULEXML_FILENAME = 'timodule.xml';
const MANIFEST_FILENAME = 'manifest';

const Project = {

	isTitaniumApp: false,
	isTitaniumModule: false,
	tiapp: undefined,
	modules: [],
	// emitter: new Emitter(),

	/**
	 * Load tiapp.xml file
	 */
	load() {
		this.isTitaniumApp = false;
		this.isTitaniumModule = false;
		// if (!atom.project.getPaths() || atom.project.getPaths().length === 0) {
		// 	return;
		// }

		this.loadTiappFile();

		if (!this.isTitaniumApp) {
			this.loadModules();
		}
	},

	/**
	 * Load tiapp file
	 *
	 */
	loadTiappFile() {
		const filePath = path.join(vscode.workspace.rootPath, TIAPP_FILENAME);
		this.isTitaniumApp = false;
		if (utils.fileExists(filePath)) {
			const fileData = fs.readFileSync(filePath, 'utf-8');
			const parser = new xml2js.Parser();
			let json;
			parser.parseString(fileData, (err, result) => {
				if (!err) {
					json = result;
				}
			});
			if (json && json['ti:app']) {
				this.tiapp = json['ti:app'];
				this.isTitaniumApp = true;
			}

			// if (!this.watcher) {
			// 	this.watcher = atom.project.onDidChangeFiles(events => {
			// 		for (const event of events) {
			// 			if (event.path === filePath && event.action === 'modified') {
			// 				this.loadTiappFile();
			// 				this.emitter.emit(EVENT_MODIFIED);
			// 			}
			// 		}
			// 	});
			// }
		}
	},

	/**
	 * Attempt to find module projects by loading timodule.xml and manifest files
	 */
	loadModules() {
		const paths = [
			path.join(vscode.workspace.rootPath),
			path.join(vscode.workspace.rootPath, 'android'),
			path.join(vscode.workspace.rootPath, 'ios'),
			path.join(vscode.workspace.rootPath, 'iphone'),
			path.join(vscode.workspace.rootPath, 'windows'),
		];
		for (let i = 0, numPaths = paths.length; i < numPaths; i++) {
			this.loadModuleAt(paths[i]);
		}
	},

	/**
	 * Load module
	 *
	 * @param {String} modulePath		path to module
	 */
	loadModuleAt(modulePath) {
		if (utils.directoryExists(modulePath)) {
			const timodulePath = path.join(modulePath, TIMODULEXML_FILENAME);
			const manifestPath = path.join(modulePath, MANIFEST_FILENAME);

			if (!utils.fileExists(timodulePath)) {
				return;
			}

			const fileData = fs.readFileSync(timodulePath, 'utf-8');
			const parser = new xml2js.Parser();
			let json;
			parser.parseString(fileData, function (err, result) {
				if (!err) {
					json = result;
				}
			});
			if (json && json['ti:module']) {

				if (!fs.existsSync(manifestPath)) {
					return;
				}

				const manifest = {
					path: modulePath
				};

				fs.readFileSync(manifestPath).toString().split(/\r?\n/).forEach(function (line) {
					const match = line.match(/^(\S+)\s*:\s*(.*)$/);
					if (match) {
						manifest[match[1].trim()] = match[2].trim();
					}
				});
				manifest.platform = utils.normalisedPlatform(manifest.platform);

				this.modules.push(manifest);

				this.isTitaniumModule = true;
			}
		}
	},

	/**
	 * Register on modified callback
	 *
	 * @param {Function} callback	callback function
	 */
	// onModified(callback) {
	// 	this.emitter.on(EVENT_MODIFIED, callback);
	// },

	/**
	 * App ID
	 *
	 * @returns {String}
	 */
	appId() {
		if (this.isTitaniumApp) {
			return String(this.tiapp.id);
		}
	},

	/**
	 * Returns app name
	 *
	 * @returns {String}
	 */
	appName() {
		if (this.isTitaniumApp) {
			return String(this.tiapp.name);
		} else {
			return this.modules[0].name;
		}
	},

	/**
	 * Returns platforms for module project
	 *
	 * @returns {Array}
	 */
	platforms() {
		if (this.isTitaniumModule) {
			return this.modules.map(module => module.platform);
		}
	},

	/**
	 * Returns path for given platform for module project
	 *
	 * @param {String} platform		Platform name
	 * @returns {String}
	 */
	pathForPlatform(platform) {
		const module = this.modules.find(module => utils.normalisedPlatform(module.platform) === platform);
		if (module) {
			return module.path;
		}
	},

	/**
	 * SDK version
	 *
	 * @returns {String}
	 */
	sdk() {
		if (this.isTitaniumApp) {
			return this.tiapp['sdk-version'];
		}
	},

	/**
	 * App icon file path
	 *
	 * @returns {String}
	 */
	appIcon() {
		if (this.isTitaniumApp) {
			const files = [ 'app/DefaultIcon.png', 'app/DefaultIcon-ios.png', 'DefaultIcon.png', 'DefaultIcon-ios.png' ];
			for (const file of files) {
				const filePath = path.join(atom.project.getPaths()[0], file);
				if (fs.existsSync(filePath)) {
					return filePath;
				}
			}
		}
	},

	/**
	 * Dispose of resources
	 */
	// destroy() {
	// 	this.emitter.dispose();
	// 	this.watcher.dispose();
	// }
};

module.exports = Project;