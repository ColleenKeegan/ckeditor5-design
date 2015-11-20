'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _link = require('../ckeditor5-link/link');

var _link2 = _interopRequireDefault(_link);

var _proof = require('../ckeditor5/proof');

var _proof2 = _interopRequireDefault(_proof);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _proof2.default)('Calling from a plugin.');

class ClassicCreator {
	constructor(editor) {
		console.log('ClassicCreator.constructor()');

		this.editor = editor;

		// Checking if cross-package imports work...
		this.link = new _link2.default();
	}
}
exports.default = ClassicCreator;