export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;

export type LogSink = (level: LogLevel, line: string) => void;

const consoleSink: LogSink = (level, line) => {
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export function formatLogLine(
  level: LogLevel,
  msg: string,
  fields: LogFields = {},
  now = new Date(),
): string {
  const payload: LogFields = { ts: now.toISOString(), level, msg };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }
  return JSON.stringify(payload);
}

export type Logger = {
  info: (msg: string, fields?: LogFields) => void;
  warn: (msg: string, fields?: LogFields) => void;
  error: (msg: string, fields?: LogFields) => void;
};

export function createLogger(base: LogFields = {}, sink: LogSink = consoleSink): Logger {
  const emit =
    (level: LogLevel) =>
    (msg: string, fields: LogFields = {}) => {
      sink(level, formatLogLine(level, msg, { ...base, ...fields }));
    };
  return { info: emit('info'), warn: emit('warn'), error: emit('error') };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
