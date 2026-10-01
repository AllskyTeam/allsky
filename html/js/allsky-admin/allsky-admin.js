"use strict";

/**
 * ALLSKYADMIN
 * Handles the password form UX:
 * - Toggles form enable/disable when "Enable WebUI login" changes
 * - Fetches and displays password policy text when "use online" changes
 * - Submits the form via AJAX with CSRF and shows results in Bootbox modals
 */
class ALLSKYADMIN {
    constructor() {
        // When the "use online" security mode changes, refresh the policy text
        $(document).on('click', 'input[name=as-use-online]', (event) => {
            this.#getPasswordFormat();
        });

        // When enabling/disabling WebUI login, toggle field interactivity/overlay
        $(document).on('click', 'input[name=as-enable-webui-login]', (event) => {
            this.#setFormState();
        });

        // AJAX-submit the credentials form; show success/error in a modal
        $('#as-admin-user-password').on('submit', function (e) {
            e.preventDefault();

            $.ajax({
                url: $(this).attr('action'),
                type: $(this).attr('method'),
                data: $(this).serialize(),
                success: function (response) {
                    bootbox.dialog({
                        title: 'Details updated',
                        message: response.message,
                        size: 'large',
                        buttons: {
                            ok: {
                                label: 'Ok',
                                className: 'btn-info',
                                callback: function () {
                                    // Force a reload so the session/UI reflect the new state
                                    location.reload();
                                }
                            }
                        }
                    });
                },
                error: function (xhr) {
                    const msg =
                        (xhr.responseJSON && xhr.responseJSON.message) ||
                        xhr.responseText ||
                        xhr.statusText ||
                        'Request failed.';
                    bootbox.dialog({
                        title: 'An error has occurred',
                        message: `<div class="as-admin-error">${msg}</div>`,
                        size: 'large',
                        buttons: { ok: { label: 'Ok', className: 'btn-info' } }
                    });
                }
            });
        });

        // Initial UI state + initial policy text fetch
        this.#setFormState();
        this.#getPasswordFormat();
    }

    /**
     * Enable/disable all credential fields based on the WebUI login toggle.
     * Also flips a CSS overlay to visually indicate the disabled state.
     */
    #setFormState() {
        const webUILoginEnabled = this.#toBoolean($('input[name=as-enable-webui-login]:checked').val());
        $('#as-admin-user-password-fields').find('*').prop('disabled', !webUILoginEnabled);

        if (webUILoginEnabled) {
            $('#as-admin-user-password-fields-overlay').removeClass('active');
        } else {
            $('#as-admin-user-password-fields-overlay').addClass('active');
        }
    }

    /**
     * Coerce typical truthy string values to boolean.
     */
    #toBoolean(value) {
        return (value === 'true' || value === '1' || value === 'yes');
    }

    /**
     * Read CSRF token from the hidden input.
     */
    #getCSRF() {
        return $('input[name="csrf_token"]').val();
    }

    /**
     * Request the password format/policy text from the server and display it.
     * Uses .text() to avoid injecting HTML.
     */
    #getPasswordFormat() {
        const csrf_token = this.#getCSRF();

        $.ajax({
            url: 'includes/adminutils.php?request=PasswordFormat',
            type: 'POST',
            data: {
                useonline: $('input[name=as-use-online]:checked').val(),
                csrf_token: csrf_token
            },
            success: function (response) {
                if (response.error) {
                    alert('Error: ' + response.message);
                } else {
                    // Use text() (not html()) to prevent XSS
                    $('#as-admin-password-format').text(response.message);
                }
            },
            error: function (xhr) {
                const msg =
                    (xhr.responseJSON && xhr.responseJSON.message) ||
                    xhr.responseText ||
                    xhr.statusText ||
                    'Request failed.';
                alert(msg);
            }
        });
    }
}