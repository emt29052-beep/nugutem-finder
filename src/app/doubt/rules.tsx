export function DoubtRules() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      <p>
        <b className="text-white">카드</b> — 🔴빨강 🟡노랑 🟢초록 🔵파랑 🟣보라 각 10장 + <b>🌈무지개 10장</b> (무지개는 어떤 색으로든
        세요). 각자 <b>슬롯 수만큼</b>(처음 5장) 받고, <b>자기 카드만</b> 볼 수 있어요. 처음엔 코인 10개.
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          차례가 오면 <b>&quot;판 전체에 🔴빨강이 6장 이상!&quot;</b>처럼 색과 장수를 예측하고 코인을 걸어요.
        </li>
        <li>
          다음 사람은 둘 중 하나:
          <ul className="mt-1 list-disc pl-5">
            <li>
              <b>인정</b> → 이전 사람은 건 코인을 돌려받고, 나는 <b>더 큰 숫자</b>로 새 예측 (색은 바꿔도 돼요)
            </li>
            <li>
              <b>다우트!</b> → 예측한 사람과 1:1 베팅 대결
            </li>
          </ul>
        </li>
        <li>
          베팅 대결: 서로 <b>콜 / 레이즈 / 폴드</b>. 폴드하면 상대가 판돈을 다 가져가요 (카드 공개 안 함). 콜하면 모든 카드 공개!
          실제 장수가 예측 <b>이상</b>이면 예측한 사람 승, 모자라면 다우트한 사람 승.
        </li>
        <li>대결이 끝나면 카드를 다시 섞어 나눠요. 진 사람부터 다음 판을 시작해요.</li>
      </ol>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>슬롯</b>은 코인 2개에 팔거나 살 수 있어요 (1~5개). 슬롯이 줄면 받는 카드가 줄어 정보도 줄어요.
        </li>
        <li>코인이 바닥나면 슬롯을 자동으로 팔고, 그것도 없으면 파산 💀</li>
        <li>
          정해진 판 수가 끝나면 <b>코인 + 슬롯×2</b>가 가장 많은 사람이 🏆 1등!
        </li>
      </ul>
    </div>
  );
}
