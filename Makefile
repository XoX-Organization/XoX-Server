APP_DIR := ~/.xox-server
BIN_DIR := ~/.xox-server/.bin
EXEC_PATH := ~/.local/bin/xox-server

install:
	mkdir -p ~/.local/bin
	mkdir -p $(BIN_DIR)

	npm install
	npm run build:prod
	npm run migrate:prod

	cp dist/main.js $(BIN_DIR)/xox-server
	sed -i '1i #!/usr/bin/env node' $(BIN_DIR)/xox-server
	chmod +x $(BIN_DIR)/xox-server

	ln -sf $(BIN_DIR)/xox-server $(EXEC_PATH)
	cp -r node_modules $(BIN_DIR)/node_modules

uninstall:
	rm -f $(EXEC_PATH)
	rm -rf $(BIN_DIR)

all: uninstall install
