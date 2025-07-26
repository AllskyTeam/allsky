"use strict";

class ALLSKYADMIN {
    constructor() {

        $(document).on('click', 'input[name=as-use-online]', (event) => {
			this.#getPasswordFormat()
		})

        $(document).on('click', 'input[name=as-enable-webui-login]', (event) => {
			this.#setFormState()
		})

        $('#as-admin-user-password').on('submit', function (e) {
            e.preventDefault()

            $.ajax({
                url: $(this).attr('action'),
                type: $(this).attr('method'),
                data: $(this).serialize(),
                success: function (response) {
                    bootbox.dialog({
                        title: 'Details updated',
                        message: response,
                        size: 'large',
                        buttons: {
                            ok: {
                                label: 'Ok',
                                className: 'btn-info',
								callback: function(){
									location.reload()
								}
                            }
                        }                        
                    })
                },
                error: function (xhr, status, error) {
                    let errorMessage = error
                    if (xhr.responseText !== '') {
                        errorMessage = xhr.responseText
                    }
                    let errorText = '<div class="as-admin-error">' + errorMessage + '</div>';
                    bootbox.dialog({
                        title: 'An error has occured',
                        message: errorText,
                        size: 'large',
                        buttons: {
                            ok: {
                                label: 'Ok',
                                className: 'btn-info'
                            }
                        }                        
                    })
                }
            })
        })

		this.#setFormState()
		this.#getPasswordFormat()
    }

	#setFormState() {
		let webUILoginEnabled = this.#toBoolean($('input[name=as-enable-webui-login]:checked').val())
		$('#as-admin-user-password-fields').find('*').prop('disabled', !webUILoginEnabled);

		if (webUILoginEnabled) {
			$('#as-admin-user-password-fields-overlay').removeClass('active')
		} else {
			$('#as-admin-user-password-fields-overlay').addClass('active')
		}
	}

	#toBoolean(value) {
		return (value === 'true' || value === '1' || value === 'yes');
	}

	#getPasswordFormat() {
		$.ajax({
			url: 'includes/adminutils.php?request=PasswordFormat',
			type: 'POST',
			data: {
				useonline: $('input[name=as-use-online]:checked').val()
			},	
			success: function (response) {
				$('#as-admin-password-format').html(response);
			},
			error: function (xhr, status, error) {
				let errorMessage = error
				if (xhr.responseText !== '') {
					errorMessage = xhr.responseText
				}

			}
		})
	}
}