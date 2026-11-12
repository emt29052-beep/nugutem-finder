import { ROLES, roleCounts, type Role } from "@/lib/mafia/game";

export function MafiaRules() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      <p>
        <b className="text-white">목표</b> — 시민 팀은 마피아를 모두 찾아내면 승리, 마피아 팀은 살아있는 마피아 수가 나머지와
        같아지면 승리!
      </p>
      <ul className="space-y-1">
        {(Object.keys(ROLES) as Role[]).map((r) => (
          <li key={r}>
            {ROLES[r].emoji} <b style={{ color: ROLES[r].color }}>{ROLES[r].name}</b> — {ROLES[r].desc}
          </li>
        ))}
      </ul>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          <b className="text-white">🌙 밤</b> — 마피아는 제거할 사람을, 의사는 지킬 사람을, 경찰은 조사할 사람을 고릅니다. 모두
          고르면 자동으로 아침이 와요. 밤에는 마피아끼리만 채팅할 수 있어요.
        </li>
        <li>
          <b className="text-white">☀️ 낮</b> — 밤사이 일어난 일이 발표되고, 다 같이 토론해요. 방장이 투표를 시작합니다.
        </li>
        <li>
          <b className="text-white">🗳 투표</b> — 가장 많은 표를 받은 사람이 처형되고 정체가 공개돼요. 동률이거나 기권이 가장
          많으면 아무도 처형되지 않아요.
        </li>
        <li>
          <b className="text-white">👻 죽은 사람</b> — 모든 역할을 볼 수 있지만, 산 사람에게 알려주면 안 돼요! 유령끼리만 채팅할 수
          있어요.
        </li>
      </ol>
      <p className="text-slate-400">
        인원별 구성: 4명 마피아1·경찰1·시민2 / 5~7명 마피아1·의사1·경찰1 / 8~11명 마피아2 / 12명 마피아3 (예: 8명 →{" "}
        {Object.entries(roleCounts(8))
          .filter(([, n]) => n > 0)
          .map(([r, n]) => `${ROLES[r as Role].name} ${n}`)
          .join(", ")}
        )
      </p>
    </div>
  );
}
