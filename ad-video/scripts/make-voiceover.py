"""Generates the Korean narration with Supertonic (on-device TTS, OpenRAIL-M).

  python3 -m venv .venv && .venv/bin/pip install supertonic
  .venv/bin/python scripts/make-voiceover.py

Each line is synthesized separately, sped up only if it would overrun its
scene window, and written to public/voiceover/<cut>/NN.wav plus a
src/voiceover/<cut>.json timeline that the Remotion compositions read.
"""

import json
import os
import wave

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
            (22.7, 26.4, "제대로 배우고 싶다면, 모어딥 프리다이빙!"),
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
            (5.05, 7.0, "헐렁하면 스르륵, 꽉 끼면 아야!"),
            (7.05, 8.35, "그래서 준비했습니다!"),
            (8.45, 10.0, "패드가 움직여서, 착!"),
            (10.05, 12.0, "코 모양 따라 까딱, 착 붙고!"),
            (12.05, 14.0, "폭은 딸깍딸깍 조절!"),
            (14.05, 16.0, "목에 걸면, 바다에 기부 금지!"),
            (16.05, 17.3, "파우치는 덤인데,"),
            (17.4, 18.9, "덤이 더 예쁨!"),
            (18.95, 20.55, "노즈클립만 있으면, 나도 딥다이버?"),
            (20.6, 21.4, "아니요!"),
            (21.5, 22.95, "배워야 됩니다!"),
            (23.05, 26.0, "그래서 모어딥 프리다이빙! 이퀄부터 차근차근!"),
            (26.1, 28.8, "유목 생활 끝! 착! 딥플로우 코리아!"),
        ],
    },
}


def trim_silence(wav, sr, threshold=0.01, pad=0.04):
    """Cut leading/trailing silence so lines can sit tight on the scene grid."""
    x = np.asarray(wav).reshape(-1)
    loud = np.flatnonzero(np.abs(x) > threshold * np.max(np.abs(x)))
    if len(loud) == 0:
        return x
    a = max(0, loud[0] - int(pad * sr))
    b = min(len(x), loud[-1] + int(pad * sr))
    return x[a:b]


def master(x, drive=2.4):
    """Peak-normalize, then soft-compress so the voice sits on top of the music."""
    x = x / (np.max(np.abs(x)) or 1.0)
    return np.tanh(drive * x) / np.tanh(drive) * 0.94


def duration(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def main():
    tts = TTS(model="supertonic-3")
    for cut, cfg in CUTS.items():
        out_dir = os.path.join(ROOT, cut)
        os.makedirs(out_dir, exist_ok=True)
        style = tts.get_voice_style(voice_name=cfg["voice"])
        timeline = []
        for i, (start, end, text) in enumerate(cfg["lines"]):
            path = os.path.join(out_dir, f"{i:02d}.wav")
            speed = cfg["speed"]
            # speed up (capped so it still sounds natural) until the line fits its window
            while True:
                wav, _ = tts.synthesize(text, voice_style=style, lang="ko", speed=speed, total_steps=16)
                tts.save_audio(master(trim_silence(wav, tts.sample_rate))[None, :], path)
                d = duration(path)
                if d <= end - start or speed >= cfg["max_speed"]:
                    break
                speed = min(cfg["max_speed"], speed * d / (end - start - 0.05) + 0.02)
            timeline.append({"file": f"voiceover/{cut}/{i:02d}.wav", "start": start, "duration": round(d, 3), "text": text})
            flag = "" if d <= end - start else "  <-- OVERRUN"
            print(f"{cut} {i:02d} {start:5.2f}s +{d:.2f}s (window {end - start:.2f}s, speed {speed:.2f}) {text}{flag}")
        os.makedirs(TIMELINES, exist_ok=True)
        with open(os.path.join(TIMELINES, f"{cut}.json"), "w") as f:
            json.dump(timeline, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
