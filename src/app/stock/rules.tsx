export function Rules() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      <p>
        <b className="text-white">목표</b> — 마지막 라운드가 끝났을 때 <b>총자산(현금 + 주식 평가액)</b>이 가장 많은
        사람이 승리합니다. 모두 현금 10,000원으로 시작하고, 4개 종목은 모두 1,000원에서 출발합니다.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          <b className="text-white">비밀 정보 카드</b> — 매 라운드 각자 정보 카드를 받습니다. 예) “감마에너지 +150”.
          이번 라운드 각 종목의 주가 변동 = <b>모든 플레이어 카드 숫자의 합 + 시장 변동(−100~+100)</b>.
          즉 혼자서는 절대 정답을 알 수 없습니다.
        </li>
        <li>
          <b className="text-white">대화 · 협상</b> — 자유롭게 정보를 공유하세요. 단, <b>거짓말도 허용</b>됩니다.
          카드는 본인 화면에만 보입니다. 현금이나 주식을 다른 사람에게 <b>송금</b>해서 정보를 사거나 동맹을 맺을 수도
          있습니다.
        </li>
        <li>
          <b className="text-white">비공개 주문</b> — 방장이 주문을 열면 각자 몰래 매수/매도 수량을 제출합니다. 주문은 모두{" "}
          <b>현재 가격</b>으로 체결됩니다.
        </li>
        <li>
          <b className="text-white">결과 공개</b> — 모든 카드와 주문이 공개되고 주가가 변동합니다. 주가가 0 이하가 되면{" "}
          <b className="text-rose-400">상장폐지</b>: 그 종목을 가진 사람의 주식은 전부 사라지고, 종목은 1,000원으로
          재상장됩니다.
        </li>
      </ol>
      <p className="text-slate-400">
        팁: 다들 “오른다”고 할 때 몰래 팔고, 남이 무엇을 샀는지 보고 다음 라운드의 거짓말을 간파하세요.
      </p>
    </div>
  );
}
