# Allsky Server API
The Allsky Server is a separate process that runs alongside Allsky its primary job is to handle longer running processes and to manage GPIO Coontrol. Its core functions are

- The Allsky dashboard whcich displays information about Allsky - currently under development
- The Allsky focuser which allows a camera with a focus motor to be focused - currently under development
- The Pi's GPIO pins, both digital and PWM

### Authentication
The API requires authentication under the following circumstances

- You are unsing the inbuilt Dashboard, in this case the authentication will be via a login screen using the same login and password as Allaky
- You are using the api from an external machine. In this case you will need to request a JWT token from the API

If you are using the API from the local machine then no authentication is required for any API

### Requesting a JWT token
To get a JWT token use the following API endpoint

POST /login

This expects a username and password and returns a JWT token

TODO: Add Hoppscotch examples
TODO: Creating users

## The Available API's
::: modules.allsky
    options:
      heading_level: 3
      show_root_heading: true

::: modules.gpio
    options:
      heading_level: 3