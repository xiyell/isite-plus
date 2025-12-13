export interface LogEntry {
  id: string;
  category: "posts" | "users" | "system";
  action: string;
  severity: "low" | "medium" | "high";
  message: string;
  time: string;
  timestamp: number;
}
