"""Synthesizes the music bed and sound effects used by the ad.

Run: python3 scripts/make-audio.py  (writes into public/audio and public/sfx)
Timeline assumes 30fps / 120 BPM -> one beat = 15 frames = 0.5s.
"""

import os
import wave

import numpy as np

SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
rng = np.random.default_rng(7)


def write(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 0.89
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def t(sec):
    return np.arange(int(sec * SR)) / SR


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def lowpass(x, cutoff):
    # one-pole lowpass, cutoff may be an array (sweeps)
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def kick(length=0.45, f0=150, f1=42, drive=1.6):
    tt = t(length)
    freq = f1 + (f0 - f1) * np.exp(-tt / 0.045)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    x = np.sin(phase) * env_exp(len(tt), 0.16)
    click = rng.standard_normal(len(tt)) * env_exp(len(tt), 0.003) * 0.4
    return np.tanh((x + click) * drive)


def boom(length=2.8):
    tt = t(length)
    freq = 32 + 90 * np.exp(-tt / 0.09)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * env_exp(len(tt), 0.9)
    noise = lowpass(rng.standard_normal(len(tt)), 900) * env_exp(len(tt), 0.35) * 0.6
    return np.tanh((body + noise) * 2.2)


def hat(length=0.08):
    n = int(length * SR)
    return highpass(rng.standard_normal(n), 7000) * env_exp(n, 0.018)


def clap(length=0.3):
    n = int(length * SR)
    x = highpass(lowpass(rng.standard_normal(n), 4000), 900)
    e = np.zeros(n)
    for d in (0, 0.011, 0.022):
        s = int(d * SR)
        e[s:] += env_exp(n - s, 0.012 if d < 0.02 else 0.09)
    return x * e


def add(buf, clip, at_sec, gain=1.0):
    s = int(at_sec * SR)
    e = min(len(buf), s + len(clip))
    if s < len(buf):
        buf[s:e] += clip[: e - s] * gain


def pad(length, notes, gain=0.12):
    tt = t(length)
    x = np.zeros(len(tt))
    for f in notes:
        for det in (-0.12, 0.0, 0.13):
            ff = f * (2 ** (det / 12))
            # soft saw from a few harmonics
            for h in range(1, 6):
                x += np.sin(2 * np.pi * ff * h * tt + rng.uniform(0, 6.28)) / h
    return x * gain


def music(groove_end=22.5, end_hit=26.5):
    """Cinematic bed. Groove until groove_end, an underwater breakdown
    (the MoreDeep scene) until end_hit, then the end-card boom."""
    total = end_hit + 5.0
    beat = 0.5
    n = int(total * SR)
    L = np.zeros(n)

    # --- Hook (0 - 1.5s): rising tension into the "착" hit
    rise_len = 1.5
    rt = t(rise_len)
    riser = lowpass(rng.standard_normal(len(rt)), 300 + 6000 * (rt / rise_len) ** 2)
    riser *= (rt / rise_len) ** 2
    add(L, riser, 0, 0.55)
    heartbeat = kick(0.3, 90, 40, 1.2)
    for s in (0.0, 0.32, 0.9, 1.18):
        add(L, heartbeat, s, 0.55)

    # --- "착" impact at 1.5s
    add(L, boom(), 1.5, 1.1)

    # --- Dark minor pad under everything after the hook (A minor -> F -> C -> G)
    chords = [
        (2.5, [110.0, 130.81, 164.81]),
        (6.5, [87.31, 110.0, 130.81]),
        (10.5, [130.81, 164.81, 196.0]),
        (14.5, [98.0, 123.47, 146.83]),
        (18.5, [110.0, 130.81, 164.81]),
    ]
    for start, notes in chords:
        p = pad(4.2, notes)
        fade = np.minimum(1, np.minimum(t(4.2) / 0.4, (4.2 - t(4.2)) / 0.6))
        add(L, lowpass(p, 1400) * fade, start, 1.0)

    # --- Groove from 2.5s to groove_end
    sub_notes = {2.5: 55.0, 6.5: 43.65, 10.5: 65.41, 14.5: 49.0, 18.5: 55.0}
    for i in range(int((groove_end - 2.5) / beat)):
        s = 2.5 + i * beat
        add(L, kick(), s, 0.9)
        add(L, hat(), s + beat / 2, 0.22)
        if i % 4 == 3:
            add(L, clap(), s, 0.35)
        # 16th hats in the detail section for energy
        if 6.5 <= s < 12.5:
            add(L, hat(0.04), s + beat / 4, 0.1)
            add(L, hat(0.04), s + 3 * beat / 4, 0.1)
        # sub bass pulse on the off-beat
        root = max(k for k in sub_notes if k <= s)
        st = t(0.22)
        bass = np.tanh(np.sin(2 * np.pi * sub_notes[root] * st) * 2) * env_exp(len(st), 0.12)
        add(L, bass, s + beat / 2, 0.5)

    # --- Underwater breakdown: muffled pad + slow heartbeat + bubbles
    bd = end_hit - groove_end
    if bd > 0:
        bp = pad(bd + 0.3, [110.0, 164.81, 220.0, 261.63], 0.12)
        bfade = np.minimum(1, np.minimum(t(bd + 0.3) / 0.3, (bd + 0.3 - t(bd + 0.3)) / 0.4))
        add(L, lowpass(bp, 700) * bfade, groove_end, 1.0)
        for k in range(int(bd / (beat * 2))):
            add(L, lowpass(kick(), 400), groove_end + k * beat * 2, 0.7)
        for k in range(10):
            add(L, sfx_bloop(), groove_end + rng.uniform(0, bd - 0.3), 0.15)

    # --- Pre-drop riser into the end card
    rl = 2.0
    rt = t(rl)
    riser2 = lowpass(rng.standard_normal(len(rt)), 400 + 9000 * (rt / rl) ** 3) * (rt / rl) ** 2
    add(L, riser2, end_hit - rl, 0.5)

    # --- End card impact + long ring out
    add(L, boom(4.5), end_hit, 1.2)
    end_pad = pad(5.0, [110.0, 164.81, 220.0], 0.1)
    end_fade = np.minimum(1, (5.0 - t(5.0)) / 3.5) * np.minimum(1, t(5.0) / 0.2)
    add(L, lowpass(end_pad, 1800) * end_fade, end_hit, 1.0)

    # soft master: gentle saturation + tail fade
    L = np.tanh(L * 0.9)
    fade_out = np.ones(n)
    fo = int(1.2 * SR)
    fade_out[-fo:] = np.linspace(1, 0, fo)
    L *= fade_out

    # cheap stereo width: delay the right channel slightly
    R = np.roll(L, int(0.012 * SR))
    return np.stack([L, R * 0.96], axis=1)


def sfx_chak():
    # the signature "착" click: sharp plastic snap + tiny resonant body
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    snap = highpass(rng.standard_normal(n), 2500) * env_exp(n, 0.006)
    body = np.sin(2 * np.pi * 1850 * tt) * env_exp(n, 0.02) * 0.5
    thump = np.sin(2 * np.pi * 180 * tt) * env_exp(n, 0.04) * 0.6
    return snap + body + thump


def sfx_whoosh(length=0.7):
    tt = t(length)
    shape = np.sin(np.pi * tt / length) ** 2
    cutoff = 300 + 5000 * np.sin(np.pi * tt / length)
    return lowpass(rng.standard_normal(len(tt)), cutoff) * shape


def sfx_shutter():
    n = int(0.25 * SR)
    x = np.zeros(n)
    for d, g in ((0, 1.0), (0.07, 0.7)):
        s = int(d * SR)
        m = n - s
        x[s:] += highpass(rng.standard_normal(m), 1500) * env_exp(m, 0.012) * g
    return x


def sfx_shine():
    tt = t(1.2)
    x = np.zeros(len(tt))
    for f in (2093, 2637, 3136, 4186):
        x += np.sin(2 * np.pi * f * tt) * env_exp(len(tt), 0.35)
    return x * np.minimum(1, tt / 0.01)


def pluck(freq, length=0.22, bright=0.6):
    tt = t(length)
    x = np.zeros(len(tt))
    for h in range(1, 7):
        x += np.sign(np.sin(2 * np.pi * freq * h * tt)) / h * (bright ** (h - 1))
    return lowpass(x, 3000) * env_exp(len(tt), 0.07)


def music_comic(total=29.0, stop_at=20.5, stop_len=0.5, end_at=26.0):
    """Bouncy 120 BPM bed for the comic cut. Drops out for a beat at stop_at
    (record scratch gag) and resolves into a cute outro at end_at."""
    beat = 0.5
    n = int(total * SR)
    L = np.zeros(n)
    # C - G - Am - F, one bar each, cycled
    prog = [
        (130.81, [261.63, 329.63, 392.0]),
        (98.0, [246.94, 293.66, 392.0]),
        (110.0, [261.63, 329.63, 440.0]),
        (87.31, [261.63, 349.23, 440.0]),
    ]
    melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392.0]
    i = 0
    s = 0.0
    while s < end_at - 1e-6:
        if stop_at <= s < stop_at + stop_len:
            s += beat
            i += 1
            continue
        bar = (i // 4) % 4
        root, chord = prog[bar]
        if i % 2 == 0:
            add(L, kick(0.3, 140, 50, 1.3), s, 0.8)
        else:
            add(L, clap(), s, 0.4)
        add(L, hat(0.05), s + beat / 2, 0.18)
        # bouncy octave bass
        add(L, pluck(root, 0.2, 0.4), s, 0.5)
        add(L, pluck(root * 2, 0.15, 0.4), s + beat / 2, 0.35)
        # chord stab on the off-beat
        for f in chord:
            add(L, pluck(f, 0.12, 0.5), s + beat / 2, 0.12)
        # toy melody in 8ths from bar 3 on
        if s >= 4.0:
            add(L, pluck(melody[(i * 2) % 8] , 0.14, 0.7), s, 0.16)
            add(L, pluck(melody[(i * 2 + 1) % 8], 0.14, 0.7), s + beat / 2, 0.12)
        s += beat
        i += 1
    # outro: happy resolve chord + sparkle
    for f in (261.63, 329.63, 392.0, 523.25):
        tt = t(2.5)
        add(L, np.sin(2 * np.pi * f * tt) * env_exp(len(tt), 0.8), end_at, 0.15)
    add(L, sfx_shine(), end_at, 0.25)
    L = np.tanh(L * 0.9)
    fo = int(0.8 * SR)
    L[-fo:] *= np.linspace(1, 0, fo)
    R = np.roll(L, int(0.01 * SR))
    return np.stack([L, R * 0.96], axis=1)


def sfx_bloop():
    tt = t(0.12)
    f = 400 + 1400 * (tt / 0.12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(tt), 0.03)


def sfx_bubbles():
    x = np.zeros(int(1.0 * SR))
    for k in range(9):
        add(x, sfx_bloop(), rng.uniform(0, 0.85), rng.uniform(0.4, 1.0))
    return x


def sfx_boing():
    tt = t(0.6)
    f = 180 + 120 * np.sin(2 * np.pi * 9 * tt) * env_exp(len(tt), 0.25) + 60 * tt
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(tt), 0.22)


def sfx_pop():
    tt = t(0.1)
    f = 900 * np.exp(-tt / 0.02) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(tt), 0.02)


def sfx_scratch():
    tt = t(0.45)
    rate = np.sin(2 * np.pi * 3.5 * tt)
    f = 300 + 900 * np.abs(rate)
    tone = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3
    hiss = highpass(rng.standard_normal(len(tt)), 1500) * np.abs(rate) * 0.6
    return lowpass(tone + hiss, 4000) * np.minimum(1, (0.45 - tt) / 0.1)


def sfx_slide_down():
    tt = t(0.8)
    f = 1500 * np.exp(-tt / 0.35) + 200
    vib = 1 + 0.02 * np.sin(2 * np.pi * 6 * tt)
    return np.sin(2 * np.pi * np.cumsum(f * vib) / SR) * np.minimum(1, (0.8 - tt) / 0.15)


def sfx_ding():
    tt = t(1.0)
    return (np.sin(2 * np.pi * 1318.5 * tt) + 0.5 * np.sin(2 * np.pi * 2637 * tt)) * env_exp(len(tt), 0.3)


def sfx_glug():
    x = np.zeros(int(1.0 * SR))
    for k in range(5):
        tt = t(0.16)
        f = 160 + 260 * (tt / 0.16)
        add(x, np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(tt), 0.05), k * 0.17, 1.0)
    return lowpass(x, 1200)


if __name__ == "__main__":
    write(os.path.join(ROOT, "audio", "music.wav"), music())
    write(os.path.join(ROOT, "sfx", "chak.wav"), sfx_chak())
    write(os.path.join(ROOT, "sfx", "whoosh.wav"), sfx_whoosh())
    write(os.path.join(ROOT, "sfx", "whoosh-short.wav"), sfx_whoosh(0.35))
    write(os.path.join(ROOT, "sfx", "shutter.wav"), sfx_shutter())
    write(os.path.join(ROOT, "sfx", "shine.wav"), sfx_shine())
    write(os.path.join(ROOT, "audio", "music-comic.wav"), music_comic())
    for name, fn in {
        "bubbles": sfx_bubbles,
        "boing": sfx_boing,
        "pop": sfx_pop,
        "scratch": sfx_scratch,
        "slide-down": sfx_slide_down,
        "ding": sfx_ding,
        "glug": sfx_glug,
    }.items():
        write(os.path.join(ROOT, "sfx", f"{name}.wav"), fn())
    print("audio written")
