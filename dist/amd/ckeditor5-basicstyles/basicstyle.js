'use strict';

define(['exports', '../ckeditor5-core/feature'], function (exports, _feature) {
	Object.defineProperty(exports, "__esModule", {
		value: true
	});

	var _feature2 = _interopRequireDefault(_feature);

	function _interopRequireDefault(obj) {
		return obj && obj.__esModule ? obj : {
			default: obj
		};
	}

	class BasicStyle extends _feature2.default {
		constructor() {
			super();
			console.log('BasicStyle.constructor()');
		}

	}

	exports.default = BasicStyle;
});