// Edge Runtime main worker — routes requests to individual function workers.
// API: EdgeRuntime.userWorkers.create() (supabase/edge-runtime v1.x)

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const functionName = pathParts[0];

  if (!functionName || functionName.startsWith('_')) {
    return new Response('Not Found', { status: 404 });
  }

  const servicePath = `/home/deno/functions/${functionName}`;

  try {
    const worker = await (globalThis as any).EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 150,
      workerTimeoutMs: 30 * 1000,
      noModuleCache: false,
      envVars: Object.entries(Deno.env.toObject()),
      forceCreate: false,
    });

    return await worker.fetch(req);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Function error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
