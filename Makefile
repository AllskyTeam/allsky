platform = $(shell uname -m)

.DEFAULT_GOAL := all

ROOTCHECK=$(shell id -u)

%:
	@echo "Nothing to do for 'all'.  Run 'sudo make install' instead."


ifneq ($(ROOTCHECK), 0)
install:
	@echo "This must be run with root permissions."
	@echo "Please run 'sudo make install'."
else
install:
	@echo `date +%F\ %R:%S` Starting install...
	@echo ""
	@make -C src $@
	@echo ""
	@make -C config_repo $@
	@echo ""
	@echo "\n\n`date +%F\ %R:%S` Install complete\n\n"
endif

.PHONY : install
