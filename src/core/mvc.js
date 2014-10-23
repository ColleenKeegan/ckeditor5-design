define( [
	'tools/emitter',
	'tools/element',
	'tools/commands',
	'tools/dom',
	'tools/utils'
], function(
	Emitter,
	Element,
	Commands,
	dom,
	utils
) {
	'use strict';

	var MVC = {};

	function nop() {}

	var extend = function( proto ) {
		var parent = this,
			child = proto.hasOwnProperty( 'constructor' ) ?
			proto.constructor :
			function() {
				parent.apply( this, arguments );
			};

		utils.extend( child, parent );

		child.prototype = Object.create( parent.prototype );
		utils.extend( child.prototype, proto );

		return child;
	};


	/**************************************************************************
	 * Application
	 *************************************************************************/

	MVC.Application = function( options ) {
		this.options = options;
		utils.extend( this, options );

		this._spaceManager = new MVC.SpaceManager( options );
		this._focusManager = new MVC.FocusManager( options );

		this.initialize.apply( this, arguments );
	};

	utils.extend( MVC.Application.prototype, Emitter, Commands, {
		getOption: function( name ) {
			return this.options && this.options[ name ] !== undefined ?
				this.options[ name ] :
				this[ name ];
		},

		initialize: nop,

		start: function() {
			this.trigger( 'before:start' );
			this.trigger( 'start' );

			return this;
		}
	} );

	MVC.Application.extend = extend;


	/**************************************************************************
	 * Model
	 *************************************************************************/

	MVC.Model = function( attrs ) {
		this.attrs = {};
		this._initAttrs( attrs || {} );
		this.initialize.apply( this, arguments );
	};

	utils.extend( MVC.Model.prototype, Emitter, {
		initialize: nop,

		set: function( attr, value ) {
			if ( !this[ attr ] ) {
				Object.defineProperty( this, attr, {
					get: function() {
						return this.attrs[ attr ];
					},

					set: function( value ) {
						var oldValue = this.attrs[ attr ];

						this.attrs[ attr ] = value;

						if ( oldValue !== value ) {
							this.trigger( 'change', this );
							this.trigger( 'change:' + attr, this );
						}
					}
				} );
			}

			this.attrs[ attr ] = value;
		},

		_initAttrs: function( attrs ) {
			Object.keys( attrs ).forEach( function( attr ) {
				this.set( attr, attrs[ attr ] );
			}, this );
		}
	} );


	/**************************************************************************
	 * View
	 *************************************************************************/

	MVC.View = function( options ) {
		this.options = options;
		utils.extend( this, options );
		this.initialize.apply( this, arguments );
	};

	utils.extend( MVC.View.prototype, Emitter, {
		destroy: function() {
			if ( this.isDestroyed ) {
				return this;
			}

			this.trigger( 'before:destroy', this );

			this.isDestroyed = true;
			this.el.remove();
			this.stopListening();

			this.trigger( 'destroy', this );

			return this;
		},

		initialize: nop,

		render: function() {
			this.trigger( 'before:render' );

			if ( this.el || this.$el ) {
				this._unbindUIEvents();
			}

			this.el = this.template( this.model );
			this.$el = new Element( this.el );

			this._bindUIEvents();

			this.trigger( 'render' );

			return this;
		},

		_bindUIEvents: function() {
			var sepPattern = /\s+/;

			if ( !this.bindings ) {
				return;
			}

			Object.keys( this.bindings ).forEach( function( key ) {
				var selectors = key.trim().split( sepPattern ),
					type = selectors.shift();

				if ( !selectors.length ) {
					this.$el.on( type, this[ this.bindings[ key ] ].bind( this ) );
				} else {
					selectors.forEach( function( selector ) {
						this.$el.find( selector ).on( type, this[ this.bindings[ key ] ].bind( this ) );
					}, this );
				}
			}, this );
		},

		_unbindUIEvents: function() {
			// TODO
		}
	} );

	MVC.View.extend = extend;


	/**************************************************************************
	 * Space
	 *************************************************************************/

	MVC.Space = function( options ) {
		this.options = options;
		utils.extend( this, options );
		this.initialize.apply( this, arguments );
	};

	utils.extend( MVC.Space.prototype, Emitter, {
		initialize: nop,

		// TODO space element creation using the dom builder

		show: function( view ) {
			this.trigger( 'before:show', view );

			if ( this.currentView ) {
				this.clear();
			}

			view.once( 'destroy', this.clear, this );
			view.render();
			this.el.html( view.el.html() );

			this.currentView = view;

			this.trigger( 'show', view );

			return this;
		},

		clear: function() {
			var view = this.currentView;

			if ( !view ) {
				return this;
			}

			this.trigger( 'before:clear', view );
			if ( !view.isDestroyed ) {
				view.destroy();
			}
			this.trigger( 'clear', view );

			delete this.currentView;

			return this;
		}
	} );

	MVC.Space.extend = extend;


	/**************************************************************************
	 * SpaceManager
	 *************************************************************************/
	MVC.SpaceManager = function( options ) {
		this.options = options;
		utils.extend( this, options );
		this.initialize.apply( this, arguments );
	};

	utils.extend( MVC.SpaceManager.prototype, Emitter, {
		initialize: nop,

		addSpace: function( name, space ) {

		},

		removeSpace: function() {

		}
	} );

	MVC.SpaceManager.extend = extend;


	/**************************************************************************
	 * FocusManager
	 *************************************************************************/
	MVC.FocusManager = function( options ) {
		this.options = options;
		utils.extend( this, options );
		this.initialize.apply( this, arguments );
	};

	utils.extend( MVC.FocusManager.prototype, Emitter, {
		initialize: nop
	} );

	return MVC;
} );