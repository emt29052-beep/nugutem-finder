# 착 NOSECLIP PRO — 광고 영상 (Remotion)

세로형 1080×1920 · 30fps · 120BPM 박자에 컷을 맞춘 릴스/쇼츠용 광고 2종. CTA는 @deepflow_korea, 모어딥 프리다이빙 공동 홍보.

- `ChakAd` — 시네마틱 버전 (31초) · `ChakAdNarrated` — 나레이션 포함
- `ChakComic` — 코믹 버전 (29초) · `ChakComicNarrated` — 나레이션 포함

나레이션은 Supertone의 온디바이스 TTS **Supertonic 3** (한국어, OpenRAIL-M 라이선스)로 생성합니다.
시네마틱은 남성(M4, 1.15배속), 코믹은 밝은 여성(F4, 1.2배속) 목소리이며, 말하는 동안 배경음악이 자동으로 줄어듭니다(덕킹). 대본은 `narration.md`.

## 시네마틱 (`ChakAd`)

| 구간 | 프레임 | 내용 |
| --- | --- | --- |
| Hook | 0–75 | 어두운 물속 + 기포 → "노즈클립, 또 바꿨어요?" → 붓글씨 **착** 슬램 (화면 흔들림, RGB 분리) |
| Hero | 75–195 | 스포트라이트 컷 크레인 다운, shine 스윕, NOSECLIP PRO + "이름처럼, 착." |
| Detail | 195–375 | 매크로 3컷 (줌 블러 펀치인 + 콜아웃): 움직이는 패드 / 톱니 슬라이드 / 스토퍼 스트랩 |
| Lifestyle | 375–465 | 어떤 코든, / 착. |
| Pouch | 465–585 | 전용 지퍼 파우치 (다크 → 화이트 패키지샷) |
| Real shot | 585–675 | 실제 촬영 사진을 인스턴트 사진처럼 박자마다 드롭 |
| MoreDeep | 675–795 | 물속으로 내려가는 화면 — "노즈클립만으로 딥다이버가 될까요?" → 제대로 배우는 곳, 모어딥 프리다이빙 / 이퀄라이징부터 차근차근 |
| End | 795–930 | 착 + NOSECLIP PRO + "지금, 착." + @deepflow_korea |

## 코믹 (`ChakComic`)

| 구간 | 프레임 | 내용 |
| --- | --- | --- |
| Hook | 0–90 | 눈알 붙은 노즈클립 + "노즈클립 유목민 특징" + "너 또 새 노즈클립 샀지?" |
| Pain | 90–210 | 특징 1: 노즈클립만 벌써 5개째 (또 샀어?!) / 특징 2: 헐렁하면 스르륵, 꽉 끼면 아야 |
| Reveal | 210–300 | "그래서 준비했습니다" → 제품 패널 슬램 + "착!" → "패드가 움직여서 어떤 코든 착" |
| Features | 300–480 | 움직이는 패드(까딱) / 톱니 슬라이드(딸깍) / 넥 스트랩(바다에 기부 금지) |
| Pouch | 480–570 | "파우치는 그냥 덤인데" → 도장 "덤이 더 예쁨" |
| Twist | 570–690 | "노즈클립만 있으면 나도 딥다이버?" → 레코드 스크래치 + "아니요." → "배워야 됩니다 :)" + 버디 안전 자막 |
| MoreDeep | 690–780 | 모어딥 프리다이빙 · 프리다이빙/머메이드 교육센터 |
| End | 780–870 | 윙크하는 노즈클립 "유목 생활 끝, 착!" + @deepflow_korea |

장면 사이에는 light leak, 화이트 플래시 오버레이를 깔았고, 전체에 필름 그레인과 비네팅을 입혔습니다.
배경음악과 효과음은 `scripts/make-audio.py`로 직접 합성한 것이라 저작권 걱정이 없습니다.

## 명령어

```bash
npm i
npm run dev                          # Remotion Studio 미리보기
npx remotion render ChakAd out/chak-noseclip-ad.mp4
npx remotion render ChakComic out/chak-comic.mp4
npx remotion render ChakAdNarrated out/chak-noseclip-ad-narrated.mp4
npx remotion render ChakComicNarrated out/chak-comic-narrated.mp4
python3 -m venv .venv && .venv/bin/pip install supertonic faster-whisper
.venv/bin/python scripts/make-voiceover.py   # 나레이션 다시 만들기 (대본은 스크립트 안 CUTS)
python3 scripts/make-audio.py        # 음악/효과음 다시 만들기
node scripts/fetch-fonts.mjs         # 한글 문구를 바꾼 뒤 폰트 서브셋 다시 받기
```

GPU가 없는 서버에서 렌더링한다면 `--gl=swangle`을 붙이세요 (light leak, shine, zoom blur는 WebGL 이펙트입니다).
