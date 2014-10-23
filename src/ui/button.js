define( [
	'ui',
	'core/mvc',
	'tools/dombuilder'
], function(
	ui,
	MVC,
	_
) {
	var Button = MVC.View.extend( {
		bindings: {
			'click': 'onClick'
		},

		template: function( options ) {
			return _( 'button', {
				className: 'cke_button',
				title: options.title
			}, [
				_( 'span', {
					className: 'cke_button_icon'
				} ),
				_( 'text', options.text )
			] );
		},

		initialize: function( options ) {
			if ( !this.model ) {
				this.model = new MVC.Model( options );
			}
			// TODO replace it with listenTo(this.model...
			this.model.on( 'change:active', this.toggle, this );
		},

		onClick: function() {
			this.model.active = !this.model.active;
		},

		toggle: function( model ) {
			this.$el.toggleClass( 'active', model.active );
		}
	} );

	ui.button = function( options ) {
		return new Button( options );
	};

	return Button;
} );