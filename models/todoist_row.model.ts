export interface TodoistRow {
  TYPE: 'task' | 'section';
  CONTENT: string;
  DESCRIPTION: string;
  PRIORITY: number;
  INDENT: number;
  RESPONSIBLE: string;
  DATE: string;
  DATE_LANG: string;
  TIMEZONE: string;
}