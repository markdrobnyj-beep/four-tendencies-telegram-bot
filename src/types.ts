export const TENDENCIES = ["upholder", "obliger", "questioner", "rebel"] as const;

export type Tendency = (typeof TENDENCIES)[number];

export interface Question {
  id: number;
  tendency: Tendency;
  text: string;
}

export interface Answer {
  tendency: Tendency;
  isYes: boolean;
}

export type Results = Record<Tendency, number>;
