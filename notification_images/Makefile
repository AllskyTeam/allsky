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
	@echo `date +%F\ %R:%S` nothing to do for $@...

ifneq ($(ROOTCHECK), 0)
install uninstall:
	@echo This must be run with root permissions.
	@echo Please run \'sudo make $@\'

else

ifeq ($(PKGBUILD),1)
install:
	@echo `date +%F\ %R:%S` Setting up Notification Images...
	@if [ ! -e $(DESTDIR)$(sharedir) ] && mkdir -p $(DESTDIR)$(sharedir); fi
	@install -m 0644 *.jpg *.png $(DESTDIR)$(sharedir)/

uninstall:
	@echo `date +%F\ %R:%S` Removing Notification Images...
	@rm -rf $(DESTDIR)$(sharedir)

endif # PKGBUILD
endif # ROOTCHECK
