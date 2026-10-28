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


def music():
    total = 27.5
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

    # --- Groove from 2.5s to 22.5s
    sub_notes = {2.5: 55.0, 6.5: 43.65, 10.5: 65.41, 14.5: 49.0, 18.5: 55.0}
    for i in range(int((22.5 - 2.5) / beat)):
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

    # --- Pre-drop riser into the end card
    rl = 2.0
    rt = t(rl)
    riser2 = lowpass(rng.standard_normal(len(rt)), 400 + 9000 * (rt / rl) ** 3) * (rt / rl) ** 2
    add(L, riser2, 22.5 - rl, 0.5)

    # --- End card impact + long ring out
    add(L, boom(4.5), 22.5, 1.2)
    end_pad = pad(5.0, [110.0, 164.81, 220.0], 0.1)
    end_fade = np.minimum(1, (5.0 - t(5.0)) / 3.5) * np.minimum(1, t(5.0) / 0.2)
    add(L, lowpass(end_pad, 1800) * end_fade, 22.5, 1.0)

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


if __name__ == "__main__":
    write(os.path.join(ROOT, "audio", "music.wav"), music())
    write(os.path.join(ROOT, "sfx", "chak.wav"), sfx_chak())
    write(os.path.join(ROOT, "sfx", "whoosh.wav"), sfx_whoosh())
    write(os.path.join(ROOT, "sfx", "whoosh-short.wav"), sfx_whoosh(0.35))
    write(os.path.join(ROOT, "sfx", "shutter.wav"), sfx_shutter())
    write(os.path.join(ROOT, "sfx", "shine.wav"), sfx_shine())
    print("audio written")
