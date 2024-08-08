# Define variables
LOCAL_SHARE_DIR := ~/.local/share/xox-server
LOCAL_BIN_DIR := ~/.local/bin
SERVER_SCRIPT := xox-server.sh

install:
	mkdir -p $(LOCAL_SHARE_DIR)
	npm install
	npm run build:prod
	npm run migrate:prod

setup-start-script:
	ln -sf $(realpath $(SERVER_SCRIPT)) $(LOCAL_BIN_DIR)/xox-server
	chmod +x $(LOCAL_BIN_DIR)/xox-server

clean:
	rm -rf dist node_modules

uninstall:
	rm -f $(LOCAL_BIN_DIR)/xox-server

all: install setup-start-script
