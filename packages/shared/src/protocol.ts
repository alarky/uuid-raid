// ---- Client → Server ----

export type ClientMessage =
  | { type: "join" }
  | { type: "attack_v7"; count: number }
  | { type: "claim_record"; playerName: string }
  | { type: "get_high_scores" };

// ---- Server → Client ----

export interface RoomState {
  type: "room_state";
  playerId: string;
  playerCount: number;
  v7AllTimeBest: number;
  v7AllTimeBestPlayer: string;
  createdAt: number;
  clearedAt: number | null;
}

export interface PlayerJoined {
  type: "player_joined";
  playerCount: number;
}

export interface PlayerLeft {
  type: "player_left";
  playerCount: number;
}

export interface V7Result {
  type: "v7_result";
  matchedBits: number;
  uuid1: string;
  uuid2: string;
  randHex1: string;
  randHex2: string;
  player1Id: string;
  player2Id: string;
  poolSize: number;
}

export interface NewRecord {
  type: "new_record";
  matchedBits: number;
  player: string;
  playerId: string;
}

export interface RecordClaimed {
  type: "record_claimed";
  matchedBits: number;
  player: string;
}

export interface RaidStats {
  type: "stats";
  v7TotalChecked: number;
  playerCount: number;
}

export interface V7FiredEntry {
  randHex: string;
  matchedBits: number;
}

export interface V7Fired {
  type: "v7_fired";
  entries: V7FiredEntry[];
}

export interface HighScoreEntry {
  matchedBits: number;
  player: string;
  timestamp: number;
}

export interface HighScores {
  type: "high_scores";
  scores: HighScoreEntry[];
}

export interface RaidError {
  type: "error";
  message: string;
  code: string;
}

export type ServerMessage =
  | RoomState
  | PlayerJoined
  | PlayerLeft
  | V7Result
  | V7Fired
  | NewRecord
  | RecordClaimed
  | RaidStats
  | HighScores
  | RaidError;
