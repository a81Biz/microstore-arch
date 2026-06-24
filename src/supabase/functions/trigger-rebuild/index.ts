import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";
import { handleError, BusinessError } from "../_shared/error-handler.ts";

const logger = createLogger('trigger-rebuild');

serve(async (req: Request) => {
  try {
    const cfApiToken = Deno.env.get("CF_API_TOKEN");
    const cfDeployHookUrl = Deno.env.get("CF_DEPLOY_HOOK_URL");

    if (!cfApiToken || !cfDeployHookUrl) {
      logger.warn('Cloudflare configuration missing, skipping rebuild trigger');
      return new Response(JSON.stringify({
        success: true,
        message: 'Cambio guardado (Rebuild saltado por falta de config)'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const response = await fetch(cfDeployHookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logger.error('Failed to trigger rebuild', { status: response.status });
      throw new BusinessError('REBUILD_FAILED', 'Error al contactar Cloudflare Pages', 502);
    }

    logger.info('Rebuild triggered successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Rebuild del storefront iniciado'
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return handleError(error);
  }
});
