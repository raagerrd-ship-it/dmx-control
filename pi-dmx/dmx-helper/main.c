/*
 * dmx-helper — DMX-512 output sidecar for Raspberry Pi Zero 2 W.
 *
 * Owns the PL011 UART (/dev/ttyAMA0) and the microsecond timing required
 * to generate DMX break + MAB. Receives 512-byte universe frames from
 * the Node engine over a Unix DGRAM socket at /run/dmx.sock.
 *
 * Two threads:
 *   - main:   Unix socket receive, updates shared universe buffer.
 *   - tx:     SCHED_FIFO, 40 Hz refresh loop. Also pushed early on new frame.
 *
 * Design notes:
 *   - Break generated via ioctl(TIOCSBRK) + clock_nanosleep + TIOCCBRK,
 *     the same technique as OLA's UartDmxThread.
 *   - Baud rate 250000 8N2 set via termios2 + BOTHER (250k is not a
 *     standard termios speed).
 *   - MAX485 DE/RE tied HIGH in hardware; no GPIO toggling here.
 *   - Trigger-driven: main thread signals the tx thread via a condvar
 *     when a new frame arrives, so we push it out immediately after the
 *     current frame finishes instead of waiting for the next 25 ms tick.
 *   - Refresh continues autonomously even if Node stops sending (DMX
 *     spec requires continuous refresh to keep fixtures responsive).
 */

#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <pthread.h>
#include <sched.h>
#include <signal.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/un.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>

/* termios2 lives in asm-generic, not the libc <termios.h> */
#include <asm/termbits.h>

#define UART_DEV        "/dev/ttyAMA0"
#define SOCK_PATH       "/run/dmx.sock"
#define DMX_MAX_SLOTS   512
#define DMX_MIN_SLOTS   24        /* spec-recommended minimum */
#define BREAK_US        100
#define MAB_US          12
#define MBB_US          50        /* mark-between-breaks (post-frame idle) */
#define REFRESH_HZ_CAP  200       /* safe upper bound for typical fixtures */
#define BYTE_US         44        /* 1 start + 8 data + 2 stop @ 250k */

static volatile sig_atomic_t g_running = 1;

/* Shared universe. Two buffers + atomic slot-count + atomic active index. */
static uint8_t  g_universe[2][DMX_MAX_SLOTS];
static _Atomic int g_slots[2] = { DMX_MIN_SLOTS, DMX_MIN_SLOTS };
static _Atomic int g_active_idx = 0;

/* Trigger from main thread → tx thread when new frame arrives */
static pthread_mutex_t g_trigger_mtx = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  g_trigger_cv  = PTHREAD_COND_INITIALIZER;
static _Atomic int     g_trigger_pending = 0;

static void on_signal(int sig) { (void)sig; g_running = 0; }

/* ── UART setup ───────────────────────────────────────────────────────── */

static int uart_open(const char *dev) {
    int fd = open(dev, O_RDWR | O_NOCTTY | O_CLOEXEC);
    if (fd < 0) { perror("open uart"); return -1; }

    struct termios2 t;
    if (ioctl(fd, TCGETS2, &t) < 0) { perror("TCGETS2"); close(fd); return -1; }

    /* raw, 8N2 */
    t.c_cflag &= ~(CBAUD | CSIZE | PARENB | CRTSCTS);
    t.c_cflag |= BOTHER | CS8 | CSTOPB | CLOCAL | CREAD;
    t.c_iflag = 0;
    t.c_oflag = 0;
    t.c_lflag = 0;
    t.c_ispeed = 250000;
    t.c_ospeed = 250000;

    if (ioctl(fd, TCSETS2, &t) < 0) { perror("TCSETS2"); close(fd); return -1; }
    return fd;
}

/* ── Timing helpers ───────────────────────────────────────────────────── */

static void sleep_ns(long ns) {
    struct timespec ts = { .tv_sec = 0, .tv_nsec = ns };
    clock_nanosleep(CLOCK_MONOTONIC, 0, &ts, NULL);
}

static void ts_add_ns(struct timespec *t, long ns) {
    t->tv_nsec += ns;
    while (t->tv_nsec >= 1000000000L) { t->tv_nsec -= 1000000000L; t->tv_sec++; }
}

/* ── DMX TX thread ────────────────────────────────────────────────────── */

static int set_rt_priority(int prio) {
    struct sched_param p = { .sched_priority = prio };
    if (pthread_setschedparam(pthread_self(), SCHED_FIFO, &p) != 0) {
        fprintf(stderr, "warn: SCHED_FIFO failed (%s) — running at normal prio\n",
                strerror(errno));
        return -1;
    }
    return 0;
}

static void *tx_thread(void *arg) {
    int fd = *(int *)arg;
    set_rt_priority(50);

    /* Max buffer size: start code + all 512 slots */
    uint8_t frame[1 + DMX_MAX_SLOTS];
    frame[0] = 0x00;  /* DMX null start code */

    const long min_period_ns = 1000000000L / REFRESH_HZ_CAP;

    struct timespec next;
    clock_gettime(CLOCK_MONOTONIC, &next);

    while (g_running) {
        /* Snapshot current universe + slot count */
        int idx   = atomic_load(&g_active_idx);
        int slots = atomic_load(&g_slots[idx]);
        if (slots < DMX_MIN_SLOTS) slots = DMX_MIN_SLOTS;
        if (slots > DMX_MAX_SLOTS) slots = DMX_MAX_SLOTS;
        memcpy(frame + 1, g_universe[idx], slots);

        /* Break + MAB + data + drain */
        ioctl(fd, TIOCSBRK, 0);
        sleep_ns(BREAK_US * 1000L);
        ioctl(fd, TIOCCBRK, 0);
        sleep_ns(MAB_US * 1000L);
        int frame_bytes = 1 + slots;
        if (write(fd, frame, frame_bytes) != frame_bytes) {
            perror("write");
        }
        tcdrain(fd);

        /* Frame period = actual wire time + MBB, but capped to REFRESH_HZ_CAP.
         * At 24 slots: ~1.2 ms wire → capped to 5 ms (200 Hz).
         * At 512 slots: ~22.7 ms wire → runs at ~44 Hz naturally. */
        long wire_ns = (long)(BREAK_US + MAB_US + frame_bytes * BYTE_US + MBB_US) * 1000L;
        long period_ns = wire_ns > min_period_ns ? wire_ns : min_period_ns;
        ts_add_ns(&next, period_ns);

        pthread_mutex_lock(&g_trigger_mtx);
        while (g_running && !g_trigger_pending) {
            if (pthread_cond_timedwait(&g_trigger_cv, &g_trigger_mtx, &next)
                == ETIMEDOUT) break;
        }
        g_trigger_pending = 0;
        pthread_mutex_unlock(&g_trigger_mtx);

        /* If a trigger arrived, reset the deadline so we don't burst-send */
        clock_gettime(CLOCK_MONOTONIC, &next);
    }
    return NULL;
}

/* ── Unix socket receive ──────────────────────────────────────────────── */

static int sock_open(const char *path) {
    int s = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (s < 0) { perror("socket"); return -1; }

    unlink(path);
    struct sockaddr_un a = { .sun_family = AF_UNIX };
    strncpy(a.sun_path, path, sizeof(a.sun_path) - 1);
    if (bind(s, (struct sockaddr *)&a, sizeof(a)) < 0) {
        perror("bind"); close(s); return -1;
    }
    if (listen(s, 1) < 0) {
        perror("listen"); close(s); return -1;
    }
    chmod(path, 0666);
    return s;
}

static void handle_frame(const uint8_t *buf, size_t len) {
    if (len != DMX_CHANNELS) {
        fprintf(stderr, "bad frame size: %zu (expected %d)\n", len, DMX_CHANNELS);
        return;
    }
    /* Swap-in via double-buffer: write to the inactive slot, then flip. */
    int inactive = atomic_load(&g_active_idx) ^ 1;
    memcpy(g_universe[inactive], buf, DMX_CHANNELS);
    atomic_store(&g_active_idx, inactive);

    pthread_mutex_lock(&g_trigger_mtx);
    g_trigger_pending = 1;
    pthread_cond_signal(&g_trigger_cv);
    pthread_mutex_unlock(&g_trigger_mtx);
}

/* ── main ─────────────────────────────────────────────────────────────── */

int main(void) {
    signal(SIGINT,  on_signal);
    signal(SIGTERM, on_signal);
    signal(SIGPIPE, SIG_IGN);

    mlockall(MCL_CURRENT | MCL_FUTURE);

    int uart = uart_open(UART_DEV);
    if (uart < 0) return 1;

    int sock = sock_open(SOCK_PATH);
    if (sock < 0) { close(uart); return 1; }

    pthread_t tx;
    if (pthread_create(&tx, NULL, tx_thread, &uart) != 0) {
        perror("pthread_create"); close(uart); close(sock); return 1;
    }

    fprintf(stderr, "dmx-helper: listening on %s, output on %s @ 250k 8N2, %d Hz refresh\n",
            SOCK_PATH, UART_DEV, REFRESH_HZ);

    /* Accept one client at a time (the Node engine). If it disconnects,
     * we loop back and accept a new one. Frames are exactly 512 bytes,
     * read as a fixed-size stream. */
    uint8_t buf[DMX_CHANNELS];
    while (g_running) {
        int client = accept(sock, NULL, NULL);
        if (client < 0) {
            if (errno == EINTR) continue;
            perror("accept"); break;
        }
        fprintf(stderr, "dmx-helper: engine connected\n");

        while (g_running) {
            size_t got = 0;
            while (got < DMX_CHANNELS) {
                ssize_t n = read(client, buf + got, DMX_CHANNELS - got);
                if (n <= 0) { got = 0; break; }
                got += (size_t)n;
            }
            if (got != DMX_CHANNELS) break;   /* disconnected */
            handle_frame(buf, DMX_CHANNELS);
        }
        close(client);
        fprintf(stderr, "dmx-helper: engine disconnected\n");
    }

    /* Wake tx thread so it can exit */
    pthread_mutex_lock(&g_trigger_mtx);
    pthread_cond_signal(&g_trigger_cv);
    pthread_mutex_unlock(&g_trigger_mtx);
    pthread_join(tx, NULL);

    close(sock);
    close(uart);
    unlink(SOCK_PATH);
    return 0;
}
