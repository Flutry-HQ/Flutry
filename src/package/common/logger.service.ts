import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'bold red',
  warn: 'bold yellow',
  info: 'bold green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const formatMeta = (meta: Record<string, unknown>): string => {
  const cleaned = { ...meta };
  delete cleaned.timestamp;
  delete cleaned.level;
  delete cleaned.message;
  delete cleaned.service;
  delete cleaned.stack;

  const keys = Object.keys(cleaned);
  if (keys.length === 0) return '';

  return '\n' + JSON.stringify(cleaned, null, 2);
};

const buildPlainFormat = () =>
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const base = `[${timestamp}] [${level}] : ${message}`;
    const stackStr = stack ? `\n${stack}` : '';
    const metaStr = formatMeta(meta);
    return `${base}${stackStr}${metaStr}`;
  });

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  buildPlainFormat(),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  buildPlainFormat(),
);

const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

const combinedFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: '%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
});

const winstonLogger = winston.createLogger({
  levels,
  level: LOG_LEVEL,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true })),
  transports: [consoleTransport, combinedFileTransport],
  exitOnError: false,
});

export type LogMeta = Record<string, unknown>;

export type LoggableError = Error & Record<string, unknown>;

export type ErrorMeta = LogMeta;

export interface Logger {
  error(message: string, meta?: LogMeta): void;
  error(error: unknown, meta?: ErrorMeta): void;
  error(message: string, error: unknown, meta?: ErrorMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  http(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  child(meta: LogMeta): Logger;
}

const extractErrorFields = (error: LoggableError): LogMeta => {
  const skip = new Set(['message', 'stack', 'name']);
  const extra: LogMeta = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    if (!skip.has(key)) {
      extra[key] = (error as Record<string, unknown>)[key];
    }
  }
  return extra;
};

const isErrorLike = (value: unknown): value is LoggableError => value instanceof Error;

const normalizeUnknownError = (value: unknown): { message: string; meta: LogMeta } => {
  if (isErrorLike(value)) {
    return {
      message: value.message,
      meta: {
        errorName: value.name,
        stack: value.stack,
        ...extractErrorFields(value),
      },
    };
  }

  if (typeof value === 'string') {
    return { message: value, meta: {} };
  }

  return {
    message: 'Ismeretlen hiba történt',
    meta: { thrownValue: value },
  };
};

const buildLogger = (base: winston.Logger): Logger => {
  const errorFn = (messageOrError: string | unknown, metaOrError?: LogMeta | unknown, maybeMeta?: ErrorMeta): void => {
    if (typeof messageOrError === 'string') {
      if (metaOrError !== undefined && !isPlainMeta(metaOrError)) {
        const { meta: errMeta } = normalizeUnknownError(metaOrError);
        base.error(messageOrError, { ...errMeta, ...(maybeMeta ?? {}) });
        return;
      }

      base.error(messageOrError, metaOrError as LogMeta | undefined);
      return;
    }

    const { message, meta: errMeta } = normalizeUnknownError(messageOrError);
    const extraMeta = isPlainMeta(metaOrError) ? metaOrError : {};
    base.error(message, { ...errMeta, ...extraMeta });
  };

  return {
    error: errorFn as Logger['error'],
    warn: (message, meta) => base.warn(message, meta),
    info: (message, meta) => base.info(message, meta),
    http: (message, meta) => base.http(message, meta),
    debug: (message, meta) => base.debug(message, meta),
    child: (meta) => buildLogger(base.child(meta)),
  };
};

function isPlainMeta(value: unknown): value is LogMeta {
  return typeof value === 'object' && value !== null && !(value instanceof Error) && value.constructor === Object;
}
export const logger: Logger = buildLogger(winstonLogger);
export const rawWinstonLogger = winstonLogger;

export const httpLogStream = {
  write: (message: string) => winstonLogger.http(message.trim()),
};
