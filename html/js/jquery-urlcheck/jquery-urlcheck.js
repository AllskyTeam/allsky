"use strict";

; (function ($) {

    $.allskyURLCHECK = function (element, options) {
        var defaults = {
            id: 'allsky-urltest',
            urlEl: '',
			userEl: '',
			passwordEl: '',
			message: 'Checking'
        }

        if (options === undefined) {
            options = element;
            element = null;
        } else {
            element = $(element);
        }
        var plugin = this;


        plugin.settings = $.extend({}, defaults, options);
		plugin.settings.el = element[0]

        let pluginPrefix = plugin.settings.id + '-' + Math.random().toString(36).substr(2, 9);

        plugin.testIdClass = pluginPrefix + '-test-wrapper';

        plugin.init = function () {
			$(plugin.settings.el).on('click', (e) => {
				e.stopPropagation()
				let elId = $(plugin.settings.el).data('urlel')
				let el = $(`#${elId}`)
				this.check(el)
			})
        }

        var addStyles = function() {

        }

		plugin.check = function(el) {
			el.addClass('allsky-url-check-input-container')
			el.nextAll('.allsky-url-check-overlay').remove()
			el.after('<div id="' + plugin.testIdClass + '" class="allsky-url-check-overlay">Checking</div>')
			$(`#${plugin.testIdClass}`).width(el.width())
			let checkUrl = el.val()

			let result = $.ajax({
                url: '/includes/moduleutil.php?request=UrlCheck',
                type: 'GET',
                dataType: 'json',
				data: {
					url: checkUrl
				},
                cache: false,
                async: false,                
                context: this
            });
            let exists = result.responseJSON
			let colour = 'rgba(0, 255, 0, 0.6)'
			let message = 'URL Ok'
			if (!exists) {
				colour = 'rgba(255, 0, 0, 0.6)'
				message = 'Invalid URL'
			}
			$(`#${plugin.testIdClass}`).html(message)
			$(`#${plugin.testIdClass}`).css({
				'background-color': colour
			})
			var el = el
			setTimeout(function() {
				let elId = $(plugin.settings.el).data('urlel')
				let el = $(`#${elId}`)

				$(`#${plugin.testIdClass}`).fadeOut(1000, function() {
					$(this).remove();
				});

			}.bind(this), 500);			
		}

        plugin.destroy = function () {

            $(document).removeData('allskyURLCHECK')
        }

        plugin.init();       
    }

    $.fn.allskyURLCHECK = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyURLCHECK')) {
                var plugin = new $.allskyURLCHECK(this, options);
                $(this).data('allskyURLCHECK', plugin);
            }
        });
    }

})(jQuery);