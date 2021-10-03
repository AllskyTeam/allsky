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

clean:
	rm -f allsky.logrotate allsky.rsyslog allsky.service config.sh settings_RPiHQ.json settings_ZWO.json variables.sh \
	  ../settings_RPiHQ.json ../settings_ZWO.json ../config.sh ../variables.sh
  # Remove all but the *.repo files ( and asi.rules ).


ifneq ($(ROOTCHECK), 0)
install:
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else # Root check passed
common:
	@echo `date +%F\ %R:%S` Setting up udev rules...
	@install -D -m 0655 asi.rules $(DESTDIR)$(sysconfdir)/udev/rules.d/
	@echo `date +%F\ %R:%S` Setting up logging...
	@install -D -m 0644 allsky.logrotate.repo $(DESTDIR)$(sysconfdir)/logrotate.d/allsky
	@install -D -m 0644 allsky.rsyslog.repo $(DESTDIR)$(sysconfdir)/rsyslog.d/allsky.conf

ifeq($(PKGBUILD),1)
install: common
	@echo `date +%F\ %R:%S` Creating directory structures...
	@[ ! -e $(DESTDIR)$(sysconfdir)/systemd/system ] && mkdir -p $(DESTDIR)$(sysconfdir)/systemd/system
	@[ ! -e $(DESTDIR)$(sysconfdir)/udev/rules.d ] && mkdir -p $(DESTDIR)$(sysconfdir)/udev/rules.d
	@echo `date +%F\ %R:%S` Setting allsky to auto start...
	@sed -e "s|User=pi|User=allsky|g" -e "s|/home/pi/allsky|$(bindir)|g" allsky.service.repo > allsky.service
	@install -m 0644 allsky.service $(DESTDIR)$(sysconfdir)/systemd/system/
	@echo `date +%F\ %R:%S` Setting up home environment variable...
	@echo -e "export ALLSKY_TMP=/tmp\nexport ALLSKY_CONFIG=$(DESTDIR)$(sysconfdir)/allsky\nexport ALLSKY_SCRIPTS=$(DESTDIR)$(libexecdir)\nexport ALLSKY_NOTIFICATION_IMAGES=$(DESTDIR)$(sharedir)\nexport ALLSKY_IMAGES=/home/allsky/Pictures/" > $(DESTDIR)$(sysconfdir)/profile.d/allsky.sh
	@echo `date +%F\ %R:%S` Copying default settings_ZWO.json
	@install -m 0644 settings_ZWO.json.repo $(DESTDIR)$(sysconfdir)/allsky/settings_ZWO.json; fi
	@echo `date +%F\ %R:%S` Copying default settings_RPiHQ.json
	@install -m 0644 settings_RPiHQ.json.repo $(DESTDIR)$(sysconfdir)/allsky/settings_RPiHQ.json; fi
	@echo `date +%F\ %R:%S` Copying default config.sh
	@install -m 0644 config.sh.repo $(DESTDIR)$(sysconfdir)/allsky/config.sh; fi
	@echo `date +%F\ %R:%S` Copying default variables.sh
	@install -m 0644 variables.sh.repo $(DESTDIR)$(sysconfdir)/allsky/variables.sh; fi
else # Not in package build mode
install: common
	@udevadm control -R
	@echo `date +%F\ %R:%S` Setting allsky to auto start...
	@if [ -e /etc/xdg/lxsession/LXDE-pi/autostart ]; then \
	  sed -i '/allsky.sh/d' /etc/xdg/lxsession/LXDE-pi/autostart; fi
	@sed -e "s|User=pi|User=$(SUDO_USER)|g" -e "s|/home/pi/allsky|$(PDIR)|g" allsky.service.repo > allsky.service
	@install -m 0644 allsky.service $(DESTDIR)$(sysconfdir)/systemd/system/
	@if [ -e /lib/systemd/system/allsky.service ]; then rm -f /lib/systemd/system/allsky.service; fi
	@systemctl daemon-reload
	@systemctl enable allsky
	@echo `date +%F\ %R:%S` Setting up home environment variable...
	@echo "export ALLSKY_HOME=$(PDIR)" > $(DESTDIR)$(sysconfdir)/profile.d/allsky.sh
	@echo `date +%F\ %R:%S` Copying default settings_ZWO.json
	@if [ ! -e settings_ZWO.json ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) settings_ZWO.json.repo ../settings_ZWO.json; fi
	@echo `date +%F\ %R:%S` Copying default settings_RPiHQ.json
	@if [ ! -e settings_RPiHQ.json ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) settings_RPiHQ.json.repo ../settings_RPiHQ.json; fi
	@echo `date +%F\ %R:%S` Copying default config.sh
	@if [ ! -e config.sh ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) config.sh.repo ../config.sh; fi
	@echo `date +%F\ %R:%S` Copying default variables.sh
	@if [ ! -e variables.sh ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) variables.sh.repo ../variables.sh; fi
endif