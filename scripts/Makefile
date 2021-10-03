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
	rm -f ftp-settings.sh

install:
ifneq ($(ROOTCHECK), 0)
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else
	@echo `date +%F\ %R:%S` Setting up scripts...
	@chmod 755 *.sh
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(libexecdir) ] && mkdir -p $(DESTDIR)$(libexecdir); \
	  [ ! -e $(DESTDIR)$(sysconfdir)/allsky ] && mkdir -p $(DESTDIR)$(sysconfdir)/allsky; \
	  install *.sh $(DESTDIR)$(libexecdir)/; \
	fi
	@echo `date +%F\ %R:%S` Copying default ftp-settings.sh
	@if [ ftp-settings.sh ] && [ $(PKGBUILD) -ne 1 ]; then \
	  install -m 0644 -o $(SUDO_USER) -g $(SUDO_USER) ftp-settings.sh.repo ftp-settings.sh; fi
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  install -m 0644 ftp-settings.sh.repo $(DESTDIR)$(sysconfdir)/ftp-settings.sh; fi
endif
