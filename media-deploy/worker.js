const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png', html: 'text/html; charset=utf-8', json: 'application/json' };
// Daily Veo kit page (scripts/veo-kit.mjs): inline CSS/JS only, images from /m/ on this origin.
const KIT_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
  'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
};

const authed = (req, env) => req.headers.get('Authorization') === `Bearer ${env.MEDIA_TOKEN}`;

async function serve(req, env, name) {
  const { value, metadata } = await env.MEDIA.getWithMetadata(name, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  const type = metadata?.type || TYPES[name.split('.').pop()] || 'application/octet-stream';
  const size = value.byteLength;
  const kit = name.startsWith('kit-');
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': `public, max-age=${kit ? 300 : 3600}`, ...(kit ? KIT_HEADERS : {}) };
  const range = req.headers.get('Range')?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(req.method === 'HEAD' ? null : value.slice(start, end + 1), {
      status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(req.method === 'HEAD' ? null : value, { headers: { ...headers, 'Content-Length': String(size) } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // /kit/<date>.html|json is stored as kit-<date>.html|json (same 7-day KV store as the media).
    const kitFile = url.pathname.match(/^\/kit\/(\d{4}-\d{2}-\d{2}\.(html|json))$/)?.[1];
    const file = url.pathname.match(/^\/m\/([a-z0-9-]+\.(mp4|jpg|png))$/)?.[1] || (kitFile && `kit-${kitFile}`);

    if (file && (req.method === 'GET' || req.method === 'HEAD')) return serve(req, env, file);

    if (!authed(req, env)) return new Response('Shyam Premi SN', { status: url.pathname === '/' ? 200 : 401 });

    if (file && req.method === 'PUT') {
      const body = await req.arrayBuffer();
      if (body.byteLength > (kitFile ? 2 : 25) * 1024 * 1024) return new Response('Over 25 MB', { status: 413 });
      await env.MEDIA.put(file, body, { expirationTtl: 7 * 86400, metadata: { type: TYPES[file.split('.').pop()] } });
      return Response.json({ ok: true, url: `${url.origin}${kitFile ? `/kit/${kitFile}` : `/m/${file}`}`, bytes: body.byteLength });
    }

    if (url.pathname === '/ai/flux' && req.method === 'POST') {
      const { prompt, steps = 8, model, width, height } = await req.json();
      try {
        // FLUX.2 [klein] takes any size (multiples of 16), e.g. 9:16 ingredient images for the Veo kit; default FLUX.1 schnell (square).
        if (model === 'flux-2-klein-4b' || model === 'flux-2-klein-9b') {
          const form = new FormData();
          form.append('prompt', prompt);
          form.append('width', String(Math.min(1536, Math.max(256, Math.round((width || 1024) / 16) * 16))));
          form.append('height', String(Math.min(1536, Math.max(256, Math.round((height || 1024) / 16) * 16))));
          const body = new Response(form);
          const out = await env.AI.run(`@cf/black-forest-labs/${model}`, { multipart: { body: body.body, contentType: body.headers.get('content-type') } });
          return Response.json({ success: true, result: { image: out.image } });
        }
        const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps });
        return Response.json({ success: true, result: { image: out.image } });
      } catch (e) {
        return Response.json({ success: false, errors: [String(e.message || e)] }, { status: 502 });
      }
    }
    return new Response('Not found', { status: 404 });
  },
};
