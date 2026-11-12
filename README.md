This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🌊 딥씨 거래소 (친구들과 하는 다이빙 주식 게임)

`/stock` 경로에서 플레이합니다. 방장이 방을 만들고 4자리 코드(또는 링크)를 공유하면 친구들이 각자 휴대폰으로 참가합니다.

- 현금 100,000원으로 시작, 다이빙 테마 6개 종목, 기본 20라운드 (라운드 타이머 또는 방장 수동 마감)
- 종목마다 숨겨진 뉴스가 있고, 핵심 글자가 라운드마다 일부씩 공개 → 예고된 라운드 마감 때 주가에 반영
- 라운드 동안 각자 휴대폰으로 자유롭게 매수/매도
- 🤫 시크릿(1인 1회): 한 종목의 이번 마감 변동을 다음 라운드 동안 나만 볼 수 있음
- 반전 아이템 6종(종류별 1인 1회): 내부자 정보 · 소나 탐지 · 상어 출몰 · 진주 발견 · 조류 역전 · 에어포켓
- 마지막에 총자산이 가장 많은 사람이 승리

## ⏱ 시간 경매

`/auction` 경로 (2~12명). 각자 시간 통장(기본 10분)으로 19라운드 동안 승리 토큰을 경매합니다.
버튼을 누른 채 5초 카운트다운을 버티면 참가, 누르고 있는 동안 시간이 줄고 손을 떼면 입찰.
가장 오래 버틴 사람이 토큰 1개 (0.1초 동점이면 무효). 입찰 시간은 각 휴대폰에서 측정합니다.

## ✌️ 하나 빼기

`/remove-one` 경로 (3~12명). 1~8 카드 중 2장을 내고 동시 공개 → 몰래 하나를 빼서 승부.
같은 숫자는 모두 무효, 겹치지 않는 가장 작은 숫자가 승리(숫자만큼 점수 + 토큰). 6라운드마다 새 덱.
선택: 생존 모드(3라운드마다 1등이 생존해서 빠짐).

## 🔪 마피아

`/mafia` 경로 (4~12명). 마피아·의사·경찰·시민 역할이 자동 배정되고, 밤 행동 → 낮 토론 → 투표가 진행됩니다.
밤에는 마피아끼리만, 죽은 사람은 유령끼리만 채팅할 수 있습니다. 모든 게임은 `/games` 에서 고를 수 있습니다.

### 배포 시 주의

게임 방 정보는 기본적으로 서버 메모리에 저장되므로 `npm run dev` / `npm start` 처럼 서버가 하나일 때는 바로 동작합니다.
Vercel 같은 서버리스 환경에 배포하면 요청마다 다른 서버가 응답할 수 있으므로 Upstash Redis(Vercel Marketplace)를 연결하고 아래 환경변수를 설정하세요.

```
KV_REST_API_URL=...      # 또는 UPSTASH_REDIS_REST_URL
KV_REST_API_TOKEN=...    # 또는 UPSTASH_REDIS_REST_TOKEN
```
