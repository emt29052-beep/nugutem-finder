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

## 📈 블러프 마켓 (친구들과 하는 주식 게임)

`/stock` 경로에서 플레이합니다. 방장이 방을 만들고 4자리 코드(또는 링크)를 공유하면 친구들이 각자 휴대폰으로 참가합니다.

- 매 라운드 각자 비밀 정보 카드(예: “감마에너지 +150”)를 받고, 종목별 실제 주가 변동 = 모든 사람 카드 합 + 시장 변동
- 대화·협상(거짓말 허용, 현금/주식 송금 가능) → 비공개 주문 → 카드·주문 전체 공개 → 다음 라운드
- 마지막에 총자산(현금 + 주식)이 가장 많은 사람이 승리

### 배포 시 주의

게임 방 정보는 기본적으로 서버 메모리에 저장되므로 `npm run dev` / `npm start` 처럼 서버가 하나일 때는 바로 동작합니다.
Vercel 같은 서버리스 환경에 배포하면 요청마다 다른 서버가 응답할 수 있으므로 Upstash Redis(Vercel Marketplace)를 연결하고 아래 환경변수를 설정하세요.

```
KV_REST_API_URL=...      # 또는 UPSTASH_REDIS_REST_URL
KV_REST_API_TOKEN=...    # 또는 UPSTASH_REDIS_REST_TOKEN
```
