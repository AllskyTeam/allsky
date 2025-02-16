; (function ($) {

    $.allskyMASK = function (el, options) {
        var defaults = {
            dirty: false,
            onClick: function (latlon) { }
        }

        var plugin = this;
        var el = $(el);
        plugin.settings = {}

        plugin.init = function () {
            plugin.settings = $.extend({}, defaults, options);

            plugin.modalid = el.attr('id') + "-modal";

			createHTML()
        }

		plugin.createHTML = function() {
			let maskDialog = '\
				<div id="myModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
					<div class="modal-dialog">\
						<div class="modal-content">\
						<div class="modal-header">\
							<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\
							<h4 class="modal-title" id="myModalLabel">Modal Title</h4>\
						</div>\
						<div class="modal-body">\
							<p>This is the content of the modal.</p>\
						</div>\
						<div class="modal-footer">\
							<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\
							<button type="button" class="btn btn-primary">Save changes</button>\
						</div>\
						</div>\
					</div>\
				</div>\
			'
		}

        plugin.destroy = function () {
            $(document).removeData('allskyMASK');
        }

        plugin.init();

    }

    $.fn.allskyMASK = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('allskyMASK')) {
                var plugin = new $.allskyMASK(this, options);
                $(this).data('allskyMASK', plugin);
            }
        });
    }

})(jQuery);