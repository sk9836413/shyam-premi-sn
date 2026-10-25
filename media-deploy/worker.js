const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png' };

const authed = (req, env) => req.headers.get('Authorization') === `Bearer ${env.MEDIA_TOKEN}`;

async function serve(req, env, name) {
  const { value, metadata } = await env.MEDIA.getWithMetadata(name, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  const type = metadata?.type || TYPES[name.split('.').pop()] || 'application/octet-stream';
  const size = value.byteLength;
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' };
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
    const file = url.pathname.match(/^\/m\/([a-z0-9-]+\.(mp4|jpg|png))$/)?.[1];

    if (file && (req.method === 'GET' || req.method === 'HEAD')) return serve(req, env, file);

    if (!authed(req, env)) return new Response('Shyam Premi SN', { status: url.pathname === '/' ? 200 : 401 });

    if (file && req.method === 'PUT') {
      const body = await req.arrayBuffer();
      if (body.byteLength > 25 * 1024 * 1024) return new Response('Over 25 MB', { status: 413 });
      await env.MEDIA.put(file, body, { expirationTtl: 7 * 86400, metadata: { type: TYPES[file.split('.').pop()] } });
      return Response.json({ ok: true, url: `${url.origin}/m/${file}`, bytes: body.byteLength });
    }

    if (url.pathname === '/ai/flux' && req.method === 'POST') {
      const { prompt, steps = 8 } = await req.json();
      try {
        const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps });
        return Response.json({ success: true, result: { image: out.image } });
      } catch (e) {
        return Response.json({ success: false, errors: [String(e.message || e)] }, { status: 502 });
      }
    }
    return new Response('Not found', { status: 404 });
  },
};
