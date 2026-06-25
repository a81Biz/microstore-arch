import { getLogflareClient } from "./monitoring/logflare.ts";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
  timestamp: string;
  function_name: string;
}

export function createLogger(functionName: string) {
  const logflare = getLogflareClient();

  const baseLog = (level: LogLevel, message: string, context: Record<string, unknown> = {}) => {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      function_name: functionName
    };

    const logString = `[${level.toUpperCase()}][${functionName}] ${message} ${Object.keys(context).length ? JSON.stringify(context) : ''}`;

    switch (level) {
      case 'debug': console.debug(logString); break;
      case 'info':  console.info(logString);  break;
      case 'warn':  console.warn(logString);  break;
      case 'error': console.error(logString); break;
    }

    // Enviar a Logflare en producción (solo warn/error para no saturar)
    if (logflare && (level === 'warn' || level === 'error')) {
      logflare.sendLog(level, message, {
        function_name: functionName,
        ...context
      }).catch(err => console.error('Logflare error:', err));
    }
  };

  const metric = (event: string, data: Record<string, unknown> = {}) => {
    console.info(`[METRIC][${functionName}] ${event} ${JSON.stringify(data)}`);
    // Always send metrics to Logflare (not gated by warn/error filter like baseLog)
    if (logflare) {
      logflare.sendLog('metric', event, {
        type: 'metric',
        function_name: functionName,
        ...data,
      }).catch(err => console.error('Logflare metric error:', err));
    }
  };

  return {
    debug:  (msg: string, ctx?: Record<string, unknown>) => baseLog('debug', msg, ctx),
    info:   (msg: string, ctx?: Record<string, unknown>) => baseLog('info', msg, ctx),
    warn:   (msg: string, ctx?: Record<string, unknown>) => baseLog('warn', msg, ctx),
    error:  (msg: string, ctx?: Record<string, unknown>) => baseLog('error', msg, ctx),
    metric,
  };
}
