platform = $(shell uname -m)
prefix = 

sysconfdir = ${prefix}/etc
exec_prefix = /usr
bindir = ${exec_prefix}/bin
libexecdir = ${exec_prefix}/libexec/allsky
sharedir = ${exec_prefix}/share/allsky

.DEFAULT_GOAL := all

ROOTCHECK=$(shell id -u)
ifneq ($(ROOTCHECK),0)
  ifeq ($(PKGBUILD),1)
    ROOTCHECK=0
  endif
endif

ifeq ($(PKGBUILD),)
  PKGBUILD=0
endif

%:
	make -C src $@

clean:
	rm -f settings_RPiHQ.json settings_ZWO.json config.sh variables.sh
	make -C src $@

install:
ifneq ($(ROOTCHECK), 0)
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else
	@echo `date +%F\ %R:%S` Starting install...
	@chmod 755 allsky.sh scripts/*.sh
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(sysconfdir)/allsky/scripts ] && mkdir -p $(DESTDIR)$(sysconfdir)/allsky/scripts; \
	  [ ! -e $(DESTDIR)$(sysconfdir)/systemd/system ] && mkdir -p $(DESTDIR)$(sysconfdir)/systemd/system; \
	  [ ! -e $(DESTDIR)$(sysconfdir)/udev/rules.d ] && mkdir -p $(DESTDIR)$(sysconfdir)/udev/rules.d; \
	  [ ! -e $(DESTDIR)$(sysconfdir)/profile.d ] && mkdir -p $(DESTDIR)$(sysconfdir)/profile.d; \
	  [ ! -e $(DESTDIR)$(bindir) ] && mkdir -p $(DESTDIR)$(bindor); \
	  [ ! -e $(DESTDIR)$(libexecdir) ] && mkdir -p $(DESTDIR)$(libexecdir); \
	  [ ! -e $(DESTDIR)$(sharedir) ] && mkdir -p $(DESTDIR)$(sharedir); \
	  install allsky.sh $(DESTDIR)$(libexecdir)/; \
	  install scripts/* $(DESTDIR)$(libexecdir)/; \
	fi
	@echo `date +%F\ %R:%S` Setting up udev rules...
	@install -D -m 0655 config_repo/asi.rules $(DESTDIR)$(sysconfdir)/udev/rules.d/
	@if [ $(PKGBUILD) -ne 1 ]; then udevadm control -R; fi
	@echo `date +%F\ %R:%S` Setting allsky to auto start...
	@if [ -e /etc/xdg/lxsession/LXDE-pi/autostart ] && [ $(PKGBUILD) -ne 1 ]; then \
	  sed -i '/allsky.sh/d' /etc/xdg/lxsession/LXDE-pi/autostart; fi
	@if [ $(PKGBUILD) -ne 1 ]; then \
	  sed -e "s|User=pi|User=$(SUDO_USER)|g" -e "s|/home/pi/allsky|$(PDIR)|g" config_repo/allsky.service.repo > config_repo/allsky.service; \
	else \
	  sed -e "s|User=pi|User=allsky|g" -e "s|/home/pi/allsky|$(bindir)|g" config_repo/allsky.service.repo > config_repo/allsky.service; \
	fi
	@install -m 0644 config_repo/allsky.service $(DESTDIR)$(sysconfdir)/systemd/system/
	@if [ -e /lib/systemd/system/allsky.service ] && [ $(PKGBUILD) -ne 1 ]; then rm -f /lib/systemd/system/allsky.service; fi
	@if [ $(PKGBUILD) -ne 1 ]; then systemctl daemon-reload; systemctl enable allsky; fi
	@echo `date +%F\ %R:%S` Setting up logging...
	@install -D -m 0644 config_repo/allsky.logrotate.repo $(DESTDIR)$(sysconfdir)/logrotate.d/allsky
	@install -D -m 0644 config_repo/allsky.rsyslog.repo $(DESTDIR)$(sysconfdir)/rsyslog.d/allsky.conf
	@echo `date +%F\ %R:%S` Setting up home environment variable...
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  echo -e "export ALLSKY_TMP=/tmp\nexport ALLSKY_CONFIG=$(DESTDIR)$(sysconfdir)/allsky\nexport ALLSKY_SCRIPTS=$(DESTDIR)$(libexecdir)\nexport ALLSKY_NOTIFICATION_IMAGES=$(DESTDIR)$(sharedir)\nexport ALLSKY_IMAGES=/home/allsky/Pictures/" > $(DESTDIR)$(sysconfdir)/profile.d/allsky.sh; \
	else \
	  echo "export ALLSKY_HOME=$(PDIR)" > $(DESTDIR)$(sysconfdir)/profile.d/allsky.sh; \
	fi
	@echo `date +%F\ %R:%S` Copying default settings_ZWO.json
	@if [ ! -e settings_ZWO.json ] && [ $(PKGBUILD) -ne 1 ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) config_repo/settings_ZWO.json.repo settings_ZWO.json; fi
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  install -m 0644 config_repo/settings_ZWO.json.repo $(DESTDIR)$(sysconfdir)/allsky/settings_ZWO.json; fi
	@echo `date +%F\ %R:%S` Copying default settings_RPiHQ.json
	@if [ ! -e settings_RPiHQ.json ] && [ $(PKGBUILD) -ne 1 ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) config_repo/settings_RPiHQ.json.repo settings_RPiHQ.json; fi
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  install -m 0644 config_repo/settings_RPiHQ.json.repo $(DESTDIR)$(sysconfdir)/allsky/settings_RPiHQ.json; fi
	@echo `date +%F\ %R:%S` Copying default config.sh
	@if [ ! -e config.sh ] && [ $(PKGBUILD) -ne 1 ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) config_repo/config.sh.repo config.sh; fi
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  install -m 0644 config_repo/config.sh.repo $(DESTDIR)$(sysconfdir)/allsky/config.sh; fi
	@echo `date +%F\ %R:%S` Copying default config.sh
	@if [ ! -e variables.sh ] && [ $(PKGBUILD) -ne 1 ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) config_repo/variables.sh.repo variables.sh; fi
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  install -m 0644 config_repo/variables.sh.repo $(DESTDIR)$(sysconfdir)/allsky/variables.sh; fi
	@echo `date +%F\ %R:%S` Copying default ftp-settings.sh
	@if [ scripts/ftp-settings.sh ] && [ $(PKGBUILD) -ne 1 ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) scripts/ftp-settings.sh.repo scripts/ftp-settings.sh; fi
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  install -m 0644 scripts/ftp-settings.sh.repo $(DESTDIR)$(sysconfdir)/allsky/ftp-settings.sh; fi
	@make -C src $@
	@if [ $(PKGBUILD) -ne 1 ]; then \
	  echo `date +%F\ %R:%S` Setting directory permissions...; \
	  chown $(SUDO_USER):$(SUDO_USER) ./ ; \
	  echo ""; \
	  echo ""; \
	  echo `date +%F\ %R:%S` It is recommended to reboot now, please issue \'sudo reboot\'; \
	  echo ""; \
	  echo ""; \
	fi
endif
