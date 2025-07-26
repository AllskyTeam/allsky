(function ($) {
  $.fn.dateFormatBuilder = function (options) {
    const settings = $.extend({ onSave: null, initialValue: '' }, options);
    const uniqueId = 'date-format-builder-' + Math.random().toString(36).substr(2, 9);

    function renderSection(title, id, tokens) {
      const collapseId = `collapse-${id}-${uniqueId}`;
      let html = `<div class="panel panel-default">
        <div class="panel-heading">
          <h4 class="panel-title">
            <a data-toggle="collapse" data-parent="#accordion-${uniqueId}" href="#${collapseId}">${title}</a>
          </h4>
        </div>
        <div id="${collapseId}" class="panel-collapse collapse">
          <div class="panel-body droppable-source" data-id="${collapseId}">
            <ul class="list-unstyled">`;
      tokens.forEach(([code, desc]) => {
        html += `<li><span class="token token-source label label-info" data-format="${code}">${code}</span> <small>${desc}</small></li>`;
      });
      html += '</ul></div></div></div>';
      return html;
    }

    const modalHtml = `
      <div class="modal fade" id="${uniqueId}" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal">&times;</button>
              <h4 class="modal-title">Date Format Builder</h4>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-sm-4">
                  <div class="panel-group" id="accordion-${uniqueId}">
                    ${renderSection('Date Tokens', 'date', [['%Y','4-digit year'], ['%y','2-digit year'], ['%m','Month (01–12)'], ['%d','Day (01–31)'], ['%B','Full month name'], ['%b','Abbreviated month name'], ['%A','Full weekday name'], ['%a','Abbreviated weekday name'], ['%j','Day of year'], ['%w','Weekday number']])}
                    ${renderSection('Time Tokens', 'time', [['%H','Hour (00–23)'], ['%I','Hour (01–12)'], ['%p','AM/PM'], ['%M','Minute'], ['%S','Second'], ['%f','Microsecond']])}
                    ${renderSection('Week/ISO Tokens', 'week', [['%U','Week # (Sun)'], ['%W','Week # (Mon)'], ['%V','ISO week'], ['%u','ISO weekday'], ['%G','ISO year']])}
                    ${renderSection('Timezone Tokens', 'tz', [['%z','UTC offset'], ['%Z','Timezone name']])}
                    ${renderSection('Other Tokens', 'other', [['%c','Locale datetime'], ['%x','Locale date'], ['%X','Locale time'], ['%%','Literal %'], ['-','Dash'], ['/','Slash'], [':','Colon'], ['&nbsp;','Space'], [',','Comma'], ['.','Period'], ['%o','Ordinal day']])}
                  </div>
                </div>
                <div class="col-sm-8">
                  <div class="form-group">
                    <label>Build Format:</label>
                    <div class="drop-zone well" id="format-zone-${uniqueId}">
                      <em class="text-muted">Drag tokens here...</em>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Format String</label>
                    <input type="text" class="form-control" id="format-output-${uniqueId}" readonly>
                  </div>
                  <div class="form-group">
                    <label>Preview</label>
                    <input type="text" class="form-control" id="preview-output-${uniqueId}" readonly>
                  </div>
                  <button class="btn btn-default" id="clear-format-${uniqueId}">Clear</button>
                  <button class="btn btn-primary" id="save-format-${uniqueId}">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    $("body").append(modalHtml);

    function updateFormatOutput() {
      let format = "";
      $(`#format-zone-${uniqueId} .token-clone`).each(function () {
        format += $(this).data("format");
      });
      $(`#format-output-${uniqueId}`).val(format);

      $.ajax({ url: '/includes/overlayutil.php?request=PythonDate', method: 'POST', data: { format } })
        .done(function (response) {
          $(`#preview-output-${uniqueId}`).val(response);
        })
        .fail(function (jqXHR, textStatus) {
          $(`#preview-output-${uniqueId}`).val('Error generating preview: ' + textStatus);
        });
    }

    function addTokenToDropZone(format) {
      const $zone = $(`#format-zone-${uniqueId}`);
      const $clone = $('<span>').addClass('token token-clone label label-success').text(format).data("format", format).css('margin-right', '5px');
      $zone.find("em").remove();
      $zone.append($clone);
      updateFormatOutput();
    }

    $(`#${uniqueId}`).on('shown.bs.modal', function () {
      $(`#${uniqueId} .token-source`).draggable({
        helper: "clone",
        revert: "invalid",
        appendTo: "body",
        zIndex: 1050
      }).on('dblclick', function () {
        addTokenToDropZone($(this).data("format"));
      });

      $(`#format-zone-${uniqueId}`).droppable({
        accept: ".token-source",
        drop: function (event, ui) {
          addTokenToDropZone(ui.helper.data("format"));
        }
      }).sortable({
        items: '.token-clone',
        update: updateFormatOutput
      });

      $(`#${uniqueId} .droppable-source`).droppable({
        accept: ".token-clone",
        drop: function (event, ui) {
          ui.draggable.remove();
          updateFormatOutput();
        }
      });
    });

    $(`#clear-format-${uniqueId}`).click(function () {
      $(`#format-zone-${uniqueId}`).html('<em class="text-muted">Drag tokens here...</em>');
      $(`#format-output-${uniqueId}, #preview-output-${uniqueId}`).val('');
    });

    $(`#save-format-${uniqueId}`).click(function () {
      if (typeof settings.onSave === 'function') {
        settings.onSave($(`#format-output-${uniqueId}`).val());
      }
      $(`#${uniqueId}`).modal('hide');
    });

    $(`#${uniqueId}`).modal('show');
  };
})(jQuery);