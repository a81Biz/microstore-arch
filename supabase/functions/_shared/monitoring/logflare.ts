export interface LogflareConfig {
  apiKey: string;
  sourceId: string;
}

export class LogflareClient {
  private apiKey: string;
  private sourceId: string;
  private endpoint = 'https://api.logflare.app/logs';

  constructor(config: LogflareConfig) {
    this.apiKey = config.apiKey;
    this.sourceId = config.sourceId;
  }

  async sendLog(level: string, message: string, metadata: Record<string, unknown> = {}) {
    try {
      const payload = {
        source: this.sourceId,
        log_entry: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          environment: Deno.env.get('ENVIRONMENT') || 'production',
          ...metadata
        })
      };

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Logflare send failed:', error);
    }
  }
}

let instance: LogflareClient | null = null;

export function getLogflareClient(): LogflareClient | null {
  if (instance) return instance;

  const apiKey = Deno.env.get('LOGFLARE_API_KEY');
  const sourceId = Deno.env.get('LOGFLARE_SOURCE_ID');

  if (!apiKey || !sourceId) {
    return null;
  }

  instance = new LogflareClient({ apiKey, sourceId });
  return instance;
}
