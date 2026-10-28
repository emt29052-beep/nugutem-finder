"""Generates the Korean narration with Supertonic (on-device TTS, OpenRAIL-M).

  python3 -m venv .venv && .venv/bin/pip install supertonic
  .venv/bin/python scripts/make-voiceover.py [cinematic|comic]

Each line is synthesized separately, sped up only if it would overrun its
scene window, and written to public/voiceover/<cut>/NN.wav plus a
src/voiceover/<cut>.json timeline that the Remotion compositions read.
"""

import json
import os
import sys

import numpy as np
from supertonic import TTS

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "voiceover")
TIMELINES = os.path.join(os.path.dirname(__file__), "..", "src", "voiceover")

# (start sec, window end sec, text). Windows follow the scene grid in narration.md.
CUTS = {
    "cinematic": {
        # M4: brighter male voice with the widest natural pitch range of the M set
        "voice": "M4",
        "speed": 1.15,
        "max_speed": 1.4,
        "lines": [
            (0.05, 1.5, "노즈클립, 또 바꾸셨나요?"),
            (2.6, 6.4, "이번엔 다릅니다. 이름처럼, 착!"),
            (6.6, 8.5, "패드가 움직여서, 코 모양 따라 착!"),
            (8.6, 10.5, "톱니로 폭까지 딱 맞게."),
            (10.6, 12.6, "스트랩으로 분실 걱정 없이."),
            (12.7, 15.3, "다른 노즈클립이 안 맞았다면, 착!"),
            (15.7, 19.3, "전용 파우치까지, 깔끔하게!"),
            (19.7, 22.4, "받아보면, 진짜 이 느낌이에요!"),
            (22.6, 24.7, "노즈클립만으로, 딥다이버가 될까요?"),
            (24.75, 26.45, "제대로 배우는 곳, 모어딥 프리다이빙!"),
            (27.2, 30.9, "착 노즈클립 프로! 유목 생활 끝. 딥플로우 코리아!"),
        ],
    },
    "comic": {
        # F4: highest, brightest female voice
        "voice": "F4",
        "speed": 1.2,
        "max_speed": 1.6,
        "lines": [
            (0.1, 3.0, "노즈클립 유목민 특징! 또 새 거 삼!"),
            (3.05, 5.0, "노즈클립만 벌써 다섯 개째!"),
            (5.05, 7.0, "헐렁하면 스르륵, 꽉 끼면 아파요!"),
            (7.05, 8.35, "그래서 준비했습니다!"),
            (8.45, 10.0, "패드가 움직여서, 착!"),
            (10.05, 12.0, "코 모양 따라 까딱, 착 붙고!"),
            (12.05, 14.0, "폭은 딸깍딸깍 조절!"),
            (14.05, 16.0, "목에 걸면, 바다에 기부 금지!"),
            (16.05, 17.6, "파우치는 덤인데요."),
            (17.65, 18.45, "덤이 더 예쁨!"),
            (18.5, 20.55, "노즈클립만 있으면, 나도 딥다이버?"),
            (20.58, 21.48, "아니요!"),
            (21.5, 23.0, "배워야 됩니다!"),
            (23.05, 26.0, "그래서 모어딥 프리다이빙! 이퀄부터 차근차근!"),
            (26.1, 28.8, "유목 생활 끝! 착! 딥플로우 코리아!"),
        ],
    },
}


def trim_silence(wav, sr, threshold_db=-50, pad=0.12, fade=0.05):
    """Cut leading/trailing silence, but keep the soft decay of the last syllable
    (generous threshold + pad) and fade the tail so nothing ends in a click."""
    x = np.asarray(wav).reshape(-1).astype(np.float64)
    loud = np.flatnonzero(np.abs(x) > np.max(np.abs(x)) * 10 ** (threshold_db / 20))
    if len(loud) == 0:
        return x
    a = max(0, loud[0] - int(0.04 * sr))
    b = min(len(x), loud[-1] + int(pad * sr))
    x = x[a:b].copy()
    n = min(len(x), int(fade * sr))
    x[-n:] *= np.linspace(1, 0, n)
    return x


def tail_level(wav, sr):
    """Peak level (dB vs line peak) of the final 30 ms of speech. The model
    sometimes chops the last syllable mid-word, which shows up as a loud tail
    that falls straight to silence; a natural ending decays below about -26 dB."""
    x = np.asarray(wav).reshape(-1)
    hop = int(0.01 * sr)
    env = np.array([np.max(np.abs(x[i : i + hop])) for i in range(0, len(x) - hop, hop)])
    db = 20 * np.log10(env / np.max(env) + 1e-9)
    last = np.flatnonzero(db > -45)[-1]
    return float(np.max(db[max(0, last - 2) : last + 1]))


def master(x, drive=2.4):
    """Peak-normalize, then soft-compress so the voice sits on top of the music."""
    x = x / (np.max(np.abs(x)) or 1.0)
    return np.tanh(drive * x) / np.tanh(drive) * 0.94


def main():
    tts = TTS(model="supertonic-3")
    only = set(sys.argv[1:])
    for cut, cfg in CUTS.items():
        if only and cut not in only:
            continue
        out_dir = os.path.join(ROOT, cut)
        os.makedirs(out_dir, exist_ok=True)
        style = tts.get_voice_style(voice_name=cfg["voice"])
        timeline = []
        for i, (start, end, text) in enumerate(cfg["lines"]):
            path = os.path.join(out_dir, f"{i:02d}.wav")
            window = end - start
            # Supertonic is stochastic and now and then chops the final syllable.
            # Generate candidates (plain / trailing pause / slightly faster) and keep
            # the one whose ending decays most naturally while still fitting the window.
            syllables = sum(1 for ch in text if "\uac00" <= ch <= "\ud7a3")
            best = None
            for attempt in range(40):
                speed = min(cfg["max_speed"], cfg["speed"] * (1 + 0.06 * (attempt // 3)))
                suffix = ["", "..", " "][attempt % 3]
                wav, _ = tts.synthesize(text + suffix, voice_style=style, lang="ko", speed=speed, total_steps=16)
                clip = trim_silence(wav, tts.sample_rate)
                d = len(clip) / tts.sample_rate
                tail = tail_level(wav, tts.sample_rate)
                fits = d <= window
                # a dropped word shows up as an impossible syllable rate
                complete = syllables / max(d - 0.16, 0.1) <= 11.0
                score = (complete, fits, tail < -26, -tail)
                if best is None or score > best[0]:
                    best = (score, clip, d, tail, speed)
                if complete and fits and tail < -32:
                    break
            (complete, *_), clip, d, tail, speed = best
            tts.save_audio(master(clip)[None, :], path)
            timeline.append({"file": f"voiceover/{cut}/{i:02d}.wav", "start": start, "duration": round(d, 3), "text": text})
            flag = ("" if d <= window else "  <-- OVERRUN") + ("" if tail < -26 else "  <-- ABRUPT END")
            flag += "" if complete else "  <-- MISSING WORDS?"
            print(f"{cut} {i:02d} {start:5.2f}s +{d:.2f}s (window {window:.2f}s, speed {speed:.2f}, tail {tail:.0f}dB) {text}{flag}")
        os.makedirs(TIMELINES, exist_ok=True)
        with open(os.path.join(TIMELINES, f"{cut}.json"), "w") as f:
            json.dump(timeline, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
