export type Frequency = "Semanal" | "Quinzenal" | "Mensal";

export interface Client {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  sellerId?: string;
  frequency?: Frequency;
  createdAt: string;
}

export interface Seller {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface Simulation {
  id?: string;
  name: string;
  sellerId: string;
  week: number;
  day: string;
  route: string[]; // Ordered list of client IDs
  distance: number;
  duration: number;
  createdAt: string;
}

export type DayOfWeek = "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado" | "Domingo";
export type WeekOfMonth = 1 | 2 | 3 | 4;

export const DAYS: DayOfWeek[] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const WEEKS: WeekOfMonth[] = [1, 2, 3, 4];
