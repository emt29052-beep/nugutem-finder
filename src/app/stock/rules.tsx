import { ITEMS } from "@/lib/stock/game";

export function Rules() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      <p>
        <b className="text-white">목표</b> — 모두 <b>현금 100,000원</b>으로 시작합니다. 마지막 라운드가 끝났을 때{" "}
        <b>총자산(현금 + 주식 평가액)</b>이 가장 많은 사람이 승리!
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          <b className="text-white">숨겨진 뉴스 힌트</b> — 6개 다이빙 종목마다 앞으로 터질 뉴스가 숨겨져 있어요. 핵심 글자는{" "}
          <span className="font-mono">○</span>로 가려져 있고 <b>라운드마다 몇 글자씩 공개</b>됩니다. 예){" "}
          <span className="font-mono text-slate-100">코랄리조트, ○호 백○ 현상 ○○</span>. 뉴스는 표시된 라운드 장 마감 때
          주가에 크게 반영돼요. 호재일까, 악재일까?
        </li>
        <li>
          <b className="text-white">자유 매매</b> — 라운드 동안 각자 휴대폰으로 원하는 만큼 사고팔 수 있어요. 가격은 라운드
          중에는 고정, 장 마감 때 변합니다. (평소 등락 −4%~+4% + 뉴스 효과 + 아이템 효과)
        </li>
        <li>
          <b className="text-white">🤫 시크릿 (1인 1회)</b> — 한 종목에 걸면, 이번 장 마감 때 그 종목이 올랐는지 내렸는지{" "}
          <b>다음 라운드 동안 나만</b> 알 수 있어요. 다른 사람들은 가격 “???” 상태로 거래해야 합니다.
        </li>
        <li>
          <b className="text-white">반전 아이템 (종류별 1인 1회, 현금으로 구매)</b>
          <ul className="mt-1 space-y-1">
            {ITEMS.map((it) => (
              <li key={it.id}>
                {it.emoji} <b className="text-slate-100">{it.name}</b> ({it.price.toLocaleString("ko-KR")}원) — {it.desc}
              </li>
            ))}
          </ul>
        </li>
      </ol>
      <p className="text-slate-400">
        말로 하는 정보 공유·거짓말·동맹 모두 자유! 단, 남의 휴대폰 훔쳐보기는 반칙 🙅
      </p>
    </div>
  );
}
