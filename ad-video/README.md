# 착 NOSECLIP PRO — 광고 영상 (Remotion)

세로형 1080×1920 · 30fps · 120BPM 박자에 컷을 맞춘 릴스/쇼츠용 광고 2종. CTA는 @deepflow_korea, 모어딥 프리다이빙 공동 홍보.

- `ChakAd` — 시네마틱 버전 (31초)
- `ChakComic` — 코믹 버전 (29초)

## 시네마틱 (`ChakAd`)

| 구간 | 프레임 | 내용 |
| --- | --- | --- |
| Hook | 0–75 | 어두운 물속 + 기포 → "숨 참는 그 순간," → 붓글씨 **착** 슬램 (화면 흔들림, RGB 분리) |
| Hero | 75–195 | 스포트라이트 컷 크레인 다운, shine 스윕, NOSECLIP PRO 타이틀 |
| Detail | 195–375 | 매크로 3컷 (줌 블러 펀치인 + 콜아웃): 톱니 슬라이드 / 소프트 패드 / 스토퍼 스트랩 |
| Lifestyle | 375–465 | 가볍게. / 단단하게. |
| Pouch | 465–585 | 전용 지퍼 파우치 (다크 → 화이트 패키지샷) |
| Real shot | 585–675 | 실제 촬영 사진을 인스턴트 사진처럼 박자마다 드롭 |
| MoreDeep | 675–795 | 물속으로 내려가는 화면 — 모어딥 프리다이빙 / 안전하고·재밌고·스트레스 없이 |
| End | 795–930 | 착 + NOSECLIP PRO + "지금, 착." + @deepflow_korea |

## 코믹 (`ChakComic`)

| 구간 | 프레임 | 내용 |
| --- | --- | --- |
| Hook | 0–90 | 눈알 붙은 노즈클립 + "딥다이버 특징" + "아직도 손으로 코 잡고 내려가?" |
| Pain | 90–210 | 특징 1: 프리폴 중에도 한 손은 코에 (유선형?) / 특징 2: FIM 할 때 로프 잡을 손 실종 |
| Reveal | 210–300 | "그래서 준비했습니다" → 제품 패널 슬램 + "착!" → "손 없이 이퀄, 두 손은 자유" |
| Features | 300–480 | 톱니 슬라이드(딸깍) / 소프트 패드(말랑) / 넥 스트랩(바다에 기부 금지) |
| Pouch | 480–570 | "파우치는 그냥 덤인데" → 도장 "덤이 더 예쁨" |
| Twist | 570–690 | "노즈클립만 있으면 나도 딥다이버?" → 레코드 스크래치 + "아니요." → "배워야 됩니다 :)" + 버디 안전 자막 |
| MoreDeep | 690–780 | 모어딥 프리다이빙 · 프리다이빙/머메이드 교육센터 |
| End | 780–870 | 윙크하는 노즈클립 "착! 하고 와요" + @deepflow_korea |

장면 사이에는 light leak, 화이트 플래시 오버레이를 깔았고, 전체에 필름 그레인과 비네팅을 입혔습니다.
배경음악과 효과음은 `scripts/make-audio.py`로 직접 합성한 것이라 저작권 걱정이 없습니다.

## 명령어

```bash
npm i
npm run dev                          # Remotion Studio 미리보기
npx remotion render ChakAd out/chak-noseclip-ad.mp4
npx remotion render ChakComic out/chak-comic.mp4
python3 scripts/make-audio.py        # 음악/효과음 다시 만들기
node scripts/fetch-fonts.mjs         # 한글 문구를 바꾼 뒤 폰트 서브셋 다시 받기
```

GPU가 없는 서버에서 렌더링한다면 `--gl=swangle`을 붙이세요 (light leak, shine, zoom blur는 WebGL 이펙트입니다).
