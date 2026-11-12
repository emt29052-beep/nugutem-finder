export function AuctionRules() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      <p>
        <b className="text-white">준비</b> — 모두 <b>시간 통장 10분</b>을 받고 <b>19라운드</b> 동안 승리 토큰을 경매해요. 내
        남은 시간은 경매 중(버튼을 누르고 있을 때)에만 보여요. 머릿속으로 계산하세요!
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>라운드가 시작되면 화면의 큰 버튼을 <b>꾹 누르고</b> 있어요.</li>
        <li>
          <b>5초 카운트다운</b>이 나와요. 이번 라운드를 포기하려면 이때 손을 떼면 돼요 (시간 소모 없음).
        </li>
        <li>
          카운트다운이 끝나도 누르고 있으면 경매 참가! 이때부터 <b>누르는 동안 내 시간이 줄어들어요.</b>
        </li>
        <li>원하는 만큼 쓰고 손을 떼요. 가장 오래 버틴 사람이 토큰 1개를 가져가요.</li>
      </ol>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b className="text-white">누가 이겼는지만</b> 공개돼요. 누가 참가했는지, 몇 초 썼는지는 끝날 때까지 비밀.
        </li>
        <li>0.1초까지 똑같으면 무효 (아무도 토큰을 못 받아요).</li>
        <li>
          <b>져도 쓴 시간은 사라져요!</b> 시간이 0이 되면 더 이상 입찰할 수 없어요.
        </li>
      </ul>
      <p>
        <b className="text-white">최종</b> — 🏆 토큰이 가장 많은 사람이 1등 (동점이면 남은 시간이 많은 사람), 💀 가장 적은
        사람이 꼴찌 (동점이면 남은 시간이 적은 사람).
      </p>
    </div>
  );
}
