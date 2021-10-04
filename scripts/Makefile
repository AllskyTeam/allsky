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
	@echo `date +%F\ %R:%S` nothing to do for $@

install:
ifneq ($(ROOTCHECK), 0)
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else
	@echo `date +%F\ %R:%S` Setting up scripts...
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(libexecdir) ] && mkdir -p $(DESTDIR)$(libexecdir); \
	  [ ! -e $(DESTDIR)$(sysconfdir)/allsky ] && mkdir -p $(DESTDIR)$(sysconfdir)/allsky; \
	fi

	@chmod 755 *.sh
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(libexecdir) ] && mkdir -p $(DESTDIR)$(libexecdir); \
	  [ ! -e $(DESTDIR)$(sysconfdir)/allsky ] && mkdir -p $(DESTDIR)$(sysconfdir)/allsky; \
	  install *.sh $(DESTDIR)$(libexecdir)/; \
	fi
endif
