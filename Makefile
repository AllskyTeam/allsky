platform = $(shell uname -m)
prefix =

sysconfdir = ${prefix}/etc
exec_prefix = /usr
libexecdir = ${exec_prefix}/libexec/allsky

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
	@echo "Nothing to do for 'all'.  Run 'sudo make install' instead."

deps:			# Needed for .github/workflows/ci_compile.yml
	@echo ""

ifneq ($(ROOTCHECK), 0)
install:
	@echo "This must be run with root permissions."
	@echo "Please run 'sudo make install'"
else
install:
	@echo `date +%F\ %R:%S` Starting install...
	@echo ""
	@make -C src $@
	@echo ""
	@make -C config_repo $@
	@echo ""
	@make -C notificationImages $@
	@echo ""
	@make -C scripts $@
	@echo ""
	@if [ $(PKGBUILD) -eq 1 ]; then \
	  [ ! -e $(DESTDIR)$(libexecdir) ] && mkdir -p $(DESTDIR)$(libexecdir) \
	  install allsky.sh $(DESTDIR)$(libexecdir)/allsky.sh; \
        fi
	@if [ $(PKGBUILD) -ne 1 ]; then \
	  echo `date +%F\ %R:%S` Setting directory permissions...; \
	  [ ! -e tmp ] && mkdir tmp; \
	  chown -R $(SUDO_USER):$(SUDO_USER) ./ ; \
	  echo ""; \
	  echo ""; \
	  echo `date +%F\ %R:%S` Install complete; \
	  echo ""; \
	  echo ""; \
	fi
endif
.PHONY : install
