export function RemoveOneRules() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      <p>
        <b className="text-white">준비</b> — 각자 <b>1~8 숫자 카드 8장</b>. 6라운드마다 새 덱을 받아요.
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          카드 <b>2장</b>을 몰래 골라 내요.
        </li>
        <li>모두 내면 각자의 2장이 <b>동시에 공개</b>돼요.</li>
        <li>
          상대들의 카드를 보고, 내 2장 중 <b>하나를 빼고</b> 하나만 남겨요 (몰래 선택).
        </li>
        <li>
          남긴 카드를 공개! <b>같은 숫자는 모두 무효</b>, 남은 것 중 <b>가장 작은 숫자</b>가 승리.
        </li>
      </ol>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          이기면 <b>카드 숫자만큼 점수 + 토큰 1개</b>. 1로 이기면 1점, 6으로 이기면 6점!
        </li>
        <li>낸 카드는 버리고, 뺀 카드는 다음 라운드에 쉬어요 (그다음 라운드부터 다시 사용 가능).</li>
        <li>
          최종 점수 = <b>점수 + 토큰 수</b>. 가장 높은 사람이 🏆 1등.
        </li>
      </ul>
      <p className="text-slate-400">
        <b className="text-slate-200">생존 모드 (원작 규칙)</b> — 3라운드마다 (점수 + 토큰) 1등이 생존해서 빠지고, 나머지는
        점수가 0으로 초기화돼요 (토큰은 유지). 마지막까지 살아남지 못한 사람이 💀 탈락!
      </p>
    </div>
  );
}
