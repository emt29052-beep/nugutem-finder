import { createRoomStore } from "../store";
import type { GameState } from "./game";

// 기존 방 코드와 호환되도록 주식 게임은 prefix 없이 저장
const store = createRoomStore<GameState>("");

export const loadGame = store.load;
export const insertGame = store.insert;
export const updateGame = store.update;
