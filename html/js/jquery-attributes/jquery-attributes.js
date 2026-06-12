(function ($) {
    $.fn.formModalFromJson = function (options) {
        const settings = $.extend({
            data: {},
            keys: [],
            initialValues: '',
            title: 'Form',
            onSubmit: function (fieldString) { }
        }, options);

        const parsedInitials = {};
        if (settings.initialValues) {
            settings.initialValues.split('|').forEach(item => {
                if (/^dp=\d+$/.test(item)) {
                    parsedInitials['dp'] = item.replace('dp=', '');
                } else {
                    const parts = item.match(/^([^=]+)=(.*)$/);
                    if (parts) {
                        parsedInitials[parts[1]] = parts[2];
                    } else {
                        parsedInitials[item] = true;
                    }
                }
            });
        }

        const $modal = $(`
            <div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content form-horizontal">
                            <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal">&times;</button>
                            <h4 class="modal-title">${settings.title}</h4>
                        </div>
                        <div class="modal-body">
                            <form class="json-form"></form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary btn-ok">OK</button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        const $form = $modal.find('form');

        settings.keys.forEach(key => {
            if (/^dp=\d+$/.test(key)) {
                key = 'dp';
            }

            const item = settings.data[key];
            if (!item) return;

            const $formGroup = $('<div class="form-group">');

            if (item.type?.field === 'boolean') {
                const $row = $('<div class="row">');
                const checked = parsedInitials[key] ? 'checked' : '';

                const $switchCol = $('<div class="col-xs-2 col-xs-offset-1">').append(`
                    <label class="el-switch el-switch-sm el-switch-green">
                        <input type="checkbox" name="${key}" id="${key}" class="moduleenabler" ${checked}>
                        <span class="el-switch-style"></span>
                    </label>
                `);

                const $labelCol = $('<div class="col-xs-9">')
                    .append(`<label for="${key}" class="control-label">${item.description || key}</label>`);

                $row.append($switchCol).append($labelCol);
                $formGroup.append($row);

            } else if (item.input?.field === 'spinner') {
                const $row = $('<div class="row">');
                const $wrapperCol = $('<div class="col-xs-10 col-xs-offset-1">');

                const initialVal = parsedInitials[key] || '';

                const $label = $(`<label for="${key}" class="control-label">${item.description || key}</label>`);
                const $input = $(`<input type="number" class="form-control input-sm" id="${key}" name="${key}" min="${item.input.min}" max="${item.input.max}" value="${initialVal}">`);

                $wrapperCol.append($label).append($input);
                $row.append($wrapperCol);
                $formGroup.append($row);

            } else if (item.type?.field === 'select' && typeof item.type.values === 'object') {
                const selectedVal = parsedInitials[key] || '';

                const $row = $('<div class="row">');
                const $wrapperCol = $('<div class="col-xs-10 col-xs-offset-1">');

                const $label = $(`<label for="${key}" class="control-label">${item.description || key}</label>`);
                const $select = $(`<select class="form-control input-sm" id="${key}" name="${key}"></select>`);

                Object.entries(item.type.values).forEach(([value, label]) => {
                    const $option = $(`<option value="${value}">${label}</option>`);
                    if (selectedVal !== '' && selectedVal == value) {
                        $option.attr('selected', 'selected');
                    }
                    $select.append($option);
                });

                $wrapperCol.append($label).append($select);
                $row.append($wrapperCol);
                $formGroup.append($row);
            }

            $form.append($formGroup);
        });

        $modal.find('.btn-ok').on('click', function () {
            let resultKeys = [];

            settings.keys.forEach(key => {
                const $field = $form.find(`[name="${key}"]`);
                if (!$field.length) return;

                if ($field.attr('type') === 'checkbox') {
                    if ($field.prop('checked')) resultKeys.push(key);
                } else {
                    const val = $field.val();
                    if (val !== "") {
                        resultKeys.push(`${key}=${val}`);
                    }
                }
            });

            $modal.modal('hide');
            settings.onSubmit(resultKeys.join('|'));
        });

        $('body').append($modal);
        $modal.modal('show');

        $modal.on('hidden.bs.modal', function () {
            $modal.remove();
        });

        return this;
    };
})(jQuery);
