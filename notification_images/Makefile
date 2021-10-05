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

all:
	@echo `date +%F\ %R:%S` nothing to do for all...

clean:
	@echo `date +%F\ %R:%S` Notification Images clean...

ifneq ($(ROOTCHECK), 0)
install uninstall:
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make $@\'
else
install:
	@echo `date +%F\ %R:%S` Setting up Notification Images...
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(sharedir) ] && mkdir -p $(DESTDIR)$(sharedir); \
	  install -m 0644 *.jpg *.png $(DESTDIR)$(sharedir)/; \
	fi

uninstall:
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  echo `date +%F\ %R:%S` Removing Notification Images...
	  rm -rf $(DESTDIR)$(sharedir); fi
endif
