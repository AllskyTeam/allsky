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
	@make -C src $@
	@make -C config_repo $@
	@make -C notification_images $@
	@make -C scripts $@

deps:
	@make -C src $@

install:
ifneq ($(ROOTCHECK), 0)
	@echo This must be ran with root permissions.
	@echo Please run \'sudo make install\'
else
	@echo `date +%F\ %R:%S` Starting install...
	@make -C src $@
	@make -C config_repo $@
	@make -C notification_images $@
	@make -C scripts $@
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
