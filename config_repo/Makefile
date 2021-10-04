platform = $(shell uname -m)
prefix = 

sysconfdir = ${prefix}/etc
exec_prefix = /usr
bindir = ${exec_prefix}/bin
libexecdir = ${exec_prefix}/libexec/allsky
sharedir = ${exec_prefix}/share/allsky

PDIR = $(shell dirname "$$PWD")

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


CONFIGFILES := settings_ZWO.json settings_RPiHQ.json config.sh variables.sh ftp-settings.sh

.PHONY: clean

%:
	@echo `date +%F\ %R:%S` nothing to do for $@

clean: # Remove all but the *.repo files ( and asi.rules ).
	@rm -f allsky.logrotate allsky.rsyslog allsky.service config.sh settings_RPiHQ.json settings_ZWO.json variables.sh ftp-settings.sh

# We probably don't want to risk deleting customized configs
# ../config/settings_RPiHQ.json ../config/settings_ZWO.json ../config/config.sh ../config/variables.sh ../config/ftp-settings.sh


ifneq ($(ROOTCHECK), 0)
install:
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else # Root check passed

ifeq ($(PKGBUILD),1)
createDirs:
	@echo `date +%F\ %R:%S` Creating directory structures...
	@if [ ! -e $(DESTDIR)$(sysconfdir)/allsky ]; then mkdir -p $(DESTDIR)$(sysconfdir)/allsky; fi
	@if [ ! -e $(DESTDIR)$(sysconfdir)/profile.d ]; then mkdir -p $(DESTDIR)$(sysconfdir)/profile.d; fi
	@if [ ! -e $(DESTDIR)$(sysconfdir)/systemd/system ]; then mkdir -p $(DESTDIR)$(sysconfdir)/systemd/system; fi
	@if [ ! -e $(DESTDIR)$(sysconfdir)/udev/rules.d ]; then mkdir -p $(DESTDIR)$(sysconfdir)/udev/rules.d; fi

$(CONFIGFILES):
	@echo `date +%F\ %R:%S` Copying default $@
	@install -m 0644 $@.repo $(DESTDIR)$(sysconfdir)/allsky/$@

install: createDirs $(CONFIGFILES)
	@echo `date +%F\ %R:%S` Setting up udev rules...
	@install -D -m 0644 asi.rules $(DESTDIR)$(sysconfdir)/udev/rules.d/
	@echo `date +%F\ %R:%S` Setting up logging...
	@install -D -m 0644 allsky.logrotate.repo $(DESTDIR)$(sysconfdir)/logrotate.d/allsky
	@install -D -m 0644 allsky.rsyslog.repo $(DESTDIR)$(sysconfdir)/rsyslog.d/allsky.conf
	@echo `date +%F\ %R:%S` Setting allsky to auto start...
	@sed -e "s|User=pi|User=allsky|g" -e "s|/home/pi/allsky|$(bindir)|g" allsky.service.repo > allsky.service
	@install -m 0644 allsky.service $(DESTDIR)$(sysconfdir)/systemd/system/
	@echo `date +%F\ %R:%S` Setting up home environment variable...
	@echo -e "export ALLSKY_TMP=/tmp\nexport ALLSKY_CONFIG=$(DESTDIR)$(sysconfdir)/allsky\nexport ALLSKY_SCRIPTS=$(DESTDIR)$(libexecdir)\nexport ALLSKY_NOTIFICATION_IMAGES=$(DESTDIR)$(sharedir)\nexport ALLSKY_IMAGES=/home/allsky/Pictures/" > $(DESTDIR)$(sysconfdir)/profile.d/allsky.sh

else # Not in package build mode
createDirs:
	@echo `date +%F\ %R:%S` Creating directory structures...
	@if [ ! -e ../config ]; then mkdir -p ../config; chown $(SUDO_USER):$(SUDO_USER) ../config; fi

$(CONFIGFILES):
	@echo `date +%F\ %R:%S` Copying default $@
	@install -m 0644 $@.repo ../config/$@

install: createDirs $(CONFIGFILES)
	@echo `date +%F\ %R:%S` Setting up udev rules...
	@install -D -m 0644 asi.rules $(DESTDIR)$(sysconfdir)/udev/rules.d/
	@echo `date +%F\ %R:%S` Setting up logging...
	@install -D -m 0644 allsky.logrotate.repo $(DESTDIR)$(sysconfdir)/logrotate.d/allsky
	@install -D -m 0644 allsky.rsyslog.repo $(DESTDIR)$(sysconfdir)/rsyslog.d/allsky.conf
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
	@echo `date +%F\ %R:%S` Copying default ftp-settings.sh
endif # Package build check
endif # Root check
