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

ifneq ($(ROOTCHECK), 0)
install uninstall:
	@echo This must be run with root permissions.
	@echo Please run \'sudo make install\'
else

install:
	@echo `date +%F\ %R:%S` Setting up scripts...
	@chmod 755 *.sh
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(libexecdir) ] && mkdir -p $(DESTDIR)$(libexecdir); \
	  install *.sh $(DESTDIR)$(libexecdir)/; \
	fi

ifeq ($(PKGBUILD),1)
uninstall:
	@echo `date +%F\ %R:%S` Removing scripts...
	@rm -rf $(DESTDIR)$(libexecdir)

endif # PKGBUILD
endif # ROOTCHECK
