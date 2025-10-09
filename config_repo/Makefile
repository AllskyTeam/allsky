platform = $(shell uname -m)

HOMEDIR = $(shell dirname "$$PWD")
CONFIGDIR = ${HOMEDIR}/config
VENVDIR = ${HOMEDIR}/venv
SCRIPTSDIR = ${HOMEDIR}/scripts
UTILITIESDIR = ${SCRIPTSDIR}/utilities
# TODO: get from variables.sh
NORESTARTCODES = 100 101
LIBSYSTEMDIR = /lib/systemd/system

.DEFAULT_GOAL := all

ROOTCHECK=$(shell id -u)

ENVFILE := env.json
UNINSTALLFILES := /etc/logrotate.d/allsky /etc/rsyslog.d/allsky.conf /etc/systemd/system/allsky.service /etc/systemd/system/allskyperiodic.service /etc/systemd/system/allskyserver.service

%:
	@echo "`date +%F\ %R:%S` nothing to do for $@"

ifneq ($(ROOTCHECK), 0)
install uninstall:
	@echo "This must be run with root permissions."
	@echo "Please run 'sudo make $@'."
else # Root check passed

uninstall:
	@echo "`date +%F\ %R:%S` Removing installed files: $(UNINSTALLFILES)"
	@rm -f $(UNINSTALLFILES)
	@echo "`date +%F\ %R:%S` Complete."
	@echo "`date +%F\ %R:%S` NOTE: Config files were -NOT- removed."
	@echo "`date +%F\ %R:%S` To remove config files, please run 'sudo make remove_configs'."
.PHONY : uninstall

remove_configs:
	@echo "`date +%F\ %R:%S` Removing config path and files $(CONFIGDIR)"
	@rm -rf $(CONFIGDIR)
.PHONY : remove_configs

createDirs:
	@echo "`date +%F\ %R:%S` Creating directory structures..."
	@if [ ! -e $(CONFIGDIR) ]; then \
		mkdir -p $(CONFIGDIR); \
		chown $(SUDO_USER):$(SUDO_USER) $(CONFIGDIR); \
	fi
.PHONY : createDirs

install: createDirs
	@echo "`date +%F\ %R:%S` Setting up udev rules..."
	@install -D -m 0644 asi.rules /etc/udev/rules.d/
	@echo "`date +%F\ %R:%S` Setting up logging..."
	@install -D -m 0644 allsky.logrotate.repo /etc/logrotate.d/allsky
	@install -D -m 0644 allsky.rsyslog.repo /etc/rsyslog.d/allsky.conf
	@udevadm control -R
	@udevadm trigger
	@echo "`date +%F\ %R:%S` Setting allsky to auto start..."
	@if [ -e /etc/xdg/lxsession/LXDE-pi/autostart ]; then \
	  sed -i '/allsky.sh/d' /etc/xdg/lxsession/LXDE-pi/autostart; fi
	@# Don't use the $(LIBSYSTEMDIR) directory
	@sed -e "s|XX_ALLSKY_OWNER_XX|$(SUDO_USER)|" \
	     -e "s|XX_ALLSKY_HOME_XX|$(HOMEDIR)|" \
	     -e "s|XX_NO_RESTART_CODES_XX|$(NORESTARTCODES)|" \
	     -e "s|XX_ALLSKY_UTILITIES_XX|$(UTILITIESDIR)|" \
	  allsky.service.repo > allsky.service
	@install -m 0644 allsky.service /etc/systemd/system/
	@rm -f allsky.service
	@if [ -e $(LIBSYSTEMDIR)/allsky.service ]; then rm -f $(LIBSYSTEMDIR)/allsky.service; fi
	@sed -e "s|XX_ALLSKY_OWNER_XX|$(SUDO_USER)|" \
	     -e "s|XX_NO_RESTART_CODES_XX|$(NORESTARTCODES)|" \
	     -e "s|XX_ALLSKY_SCRIPTS_XX|$(SCRIPTSDIR)|" \
	  allskyperiodic.service.repo > allskyperiodic.service
	@install -m 0644 allskyperiodic.service /etc/systemd/system/
	@rm -f allskyperiodic.service
	@if [ -e $(LIBSYSTEMDIR)/allskyperiodic.service ]; then rm -f $(LIBSYSTEMDIR)/allskyperiodic.service; fi

	@sed -e "s|XX_ALLSKY_OWNER_XX|$(SUDO_USER)|" \
	     -e "s|XX_ALLSKY_HOME_XX|$(HOMEDIR)|" \
	  allskyserver.service.repo > allskyserver.service
	@install -m 0644 allskyserver.service /etc/systemd/system/
	@rm -f allskyserver.service
	@if [ -e $(LIBSYSTEMDIR)/allskyserver.service ]; then rm -f $(LIBSYSTEMDIR)/allskyserver.service; fi

	@systemctl daemon-reload
	@systemctl enable allsky
	@systemctl enable allskyperiodic
	@systemctl enable allskyserver
	@echo "`date +%F\ %R:%S` Setting up ALLSKY_HOME environment variable..."
	@echo "export ALLSKY_HOME=$(HOMEDIR)\nexport ALLSKY_PYTHON_VENV=$(VENVDIR)\nPATH=${PATH}:$(SCRIPTSDIR)" > /etc/profile.d/allsky.sh

.PHONY : install

endif # Root check
