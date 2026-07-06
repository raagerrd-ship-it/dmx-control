CC      ?= gcc
CFLAGS  ?= -O2 -Wall -Wextra -std=gnu11 -D_GNU_SOURCE
LDFLAGS ?= -pthread

PREFIX  ?= /usr/local
BIN     := dmx-helper

$(BIN): main.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

install: $(BIN)
	install -Dm755 $(BIN) $(DESTDIR)$(PREFIX)/bin/$(BIN)
	setcap cap_sys_nice+ep $(DESTDIR)$(PREFIX)/bin/$(BIN) || true

clean:
	rm -f $(BIN)

.PHONY: install clean
