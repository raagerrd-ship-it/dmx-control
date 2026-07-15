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
/* <termios.h> krockar med <asm/termbits.h> pa nyare headers; tcdrain ersatt med ioctl(TCSBRK,1) */
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
/* Seqlock: skyddar mot en TORN READ när skrivaren hinner flippa TVÅ gånger under
 * tx-trådens memcpy (då landar den andra skrivningen i just den buffert läsaren
 * kopierar). Udda = skrivning pågår; läsaren gör om kopian om seq ändrats. */
static _Atomic unsigned g_seq = 0;

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
    /* pthread-funktioner returnerar felkoden, de sätter INTE errno. */
    int rc = pthread_setschedparam(pthread_self(), SCHED_FIFO, &p);
    if (rc != 0) {
        fprintf(stderr, "warn: SCHED_FIFO failed (%s) — running at normal prio\n",
                strerror(rc));
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
        /* Snapshot current universe + slot count via seqlock: gör om kopian om
         * skrivaren rörde bufferten under memcpy (odd seq eller ändrad seq). I
         * praktiken aldrig fler än ett varv (skrivning ~50 Hz, kopian µs). */
        int slots;
        unsigned s1, s2;
        do {
            s1 = atomic_load_explicit(&g_seq, memory_order_acquire);
            int idx = atomic_load(&g_active_idx);
            slots = atomic_load(&g_slots[idx]);
            if (slots < DMX_MIN_SLOTS) slots = DMX_MIN_SLOTS;
            if (slots > DMX_MAX_SLOTS) slots = DMX_MAX_SLOTS;
            memcpy(frame + 1, g_universe[idx], slots);
            s2 = atomic_load_explicit(&g_seq, memory_order_acquire);
        } while ((s1 & 1u) || s1 != s2);

        /* Break + MAB + data + drain */
        ioctl(fd, TIOCSBRK, 0);
        sleep_ns(BREAK_US * 1000L);
        ioctl(fd, TIOCCBRK, 0);
        sleep_ns(MAB_US * 1000L);
        int frame_bytes = 1 + slots;
        /* Loopa write:en — en kort/EINTR-write skulle annars skicka en trunkerad
         * DMX-ram; skriv tills alla bytes gått ut. */
        ssize_t off = 0;
        while (off < frame_bytes) {
            ssize_t w = write(fd, frame + off, (size_t)(frame_bytes - off));
            if (w < 0) { if (errno == EINTR) continue; perror("write"); break; }
            off += w;
        }
        ioctl(fd, TCSBRK, 1);  /* == tcdrain(fd) */

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

static void handle_frame(const uint8_t *buf, int slots) {
    if (slots < DMX_MIN_SLOTS || slots > DMX_MAX_SLOTS) {
        fprintf(stderr, "bad slot count: %d (expected %d..%d)\n",
                slots, DMX_MIN_SLOTS, DMX_MAX_SLOTS);
        return;
    }
    /* Swap-in via double-buffer: write to the inactive slot, then flip.
     * Ramma in med seqlock (udda under skrivning) så en samtidig tx-läsare
     * gör om sin kopia om vi hann röra bufferten den läste. */
    atomic_fetch_add_explicit(&g_seq, 1u, memory_order_release);   /* → udda */
    int inactive = atomic_load(&g_active_idx) ^ 1;
    memcpy(g_universe[inactive], buf, slots);
    atomic_store(&g_slots[inactive], slots);
    atomic_store(&g_active_idx, inactive);
    atomic_fetch_add_explicit(&g_seq, 1u, memory_order_release);   /* → jämn (klar) */

    pthread_mutex_lock(&g_trigger_mtx);
    g_trigger_pending = 1;
    pthread_cond_signal(&g_trigger_cv);
    pthread_mutex_unlock(&g_trigger_mtx);
}

/* Read exactly `n` bytes from `fd`, return 0 on success, -1 on EOF/err. */
static int read_exact(int fd, uint8_t *buf, size_t n) {
    size_t got = 0;
    while (got < n) {
        ssize_t r = read(fd, buf + got, n - got);
        if (r <= 0) return -1;
        got += (size_t)r;
    }
    return 0;
}

/* ── main ─────────────────────────────────────────────────────────────── */

int main(void) {
    /* sigaction UTAN SA_RESTART (glibc:s signal() sätter SA_RESTART → blockande
     * accept()/read() startar om i stället för att returnera EINTR, så SIGTERM
     * aldrig når nedstängningen → systemd tvingas till SIGKILL vid varje deploy). */
    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sa.sa_handler = on_signal;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGINT,  &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);
    struct sigaction sp;
    memset(&sp, 0, sizeof sp);
    sp.sa_handler = SIG_IGN;
    sigemptyset(&sp.sa_mask);
    sigaction(SIGPIPE, &sp, NULL);

    /* Condvar MÅSTE använda CLOCK_MONOTONIC — deadline till cond_timedwait seedas
     * med clock_gettime(CLOCK_MONOTONIC). Default (CLOCK_REALTIME) gjorde att
     * deadline alltid låg i det förflutna → timedwait returnerade direkt varje
     * varv → hela pacingen urkopplad, tx fri-rullade och pinnade CPU-kärnan. */
    pthread_condattr_t cattr;
    pthread_condattr_init(&cattr);
    pthread_condattr_setclock(&cattr, CLOCK_MONOTONIC);
    pthread_cond_init(&g_trigger_cv, &cattr);
    pthread_condattr_destroy(&cattr);

    mlockall(MCL_CURRENT | MCL_FUTURE);

    int uart = uart_open(UART_DEV);
    if (uart < 0) return 1;

    int sock = sock_open(SOCK_PATH);
    if (sock < 0) { close(uart); return 1; }

    pthread_t tx;
    if (pthread_create(&tx, NULL, tx_thread, &uart) != 0) {
        perror("pthread_create"); close(uart); close(sock); return 1;
    }

    fprintf(stderr, "dmx-helper: listening on %s, output on %s @ 250k 8N2, "
                    "variable-length frames, cap %d Hz\n",
            SOCK_PATH, UART_DEV, REFRESH_HZ_CAP);

    /* Accept one client at a time (the Node engine). Wire protocol per frame:
     *   [2 bytes LE: slot count N]  [N bytes: DMX slots 1..N]
     * where DMX_MIN_SLOTS <= N <= DMX_MAX_SLOTS. */
    uint8_t hdr[2];
    uint8_t payload[DMX_MAX_SLOTS];
    while (g_running) {
        int client = accept(sock, NULL, NULL);
        if (client < 0) {
            if (errno == EINTR) continue;
            perror("accept"); break;
        }
        fprintf(stderr, "dmx-helper: engine connected\n");

        while (g_running) {
            if (read_exact(client, hdr, 2) < 0) break;
            int slots = hdr[0] | (hdr[1] << 8);
            if (slots < DMX_MIN_SLOTS || slots > DMX_MAX_SLOTS) {
                fprintf(stderr, "protocol error: slots=%d, disconnecting\n", slots);
                break;
            }
            if (read_exact(client, payload, (size_t)slots) < 0) break;
            handle_frame(payload, slots);
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
