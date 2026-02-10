// File: frontend/components/Yield/types.ts

export interface ArbitrageFeedItem {
  id: string;
  route: string;
  spread: number;
  confidence: number;
  status: "OPEN" | "EXECUTED" | "EXPIRED";
}
