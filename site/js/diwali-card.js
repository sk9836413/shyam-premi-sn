// Plain ES module (no build step), served as is by GitHub Pages.
// Canvas drawing for the Shyam Premi SN Diwali card maker. Every motif (diyas, rangoli, marigolds, lanterns, fireworks,
// lotus, peacock feathers) is drawn here in code, so the cards carry no third-party artwork. The fonts are self-hosted
// OFL fonts in ../fonts. No flute anywhere: Khatu Shyam ji is only ever shown as the Sheesh, never with a body or flute.
// Each design paints a static layer once; the flames, glows and sparkles are drawn per frame on top of it, which keeps
// the live preview and the video recording cheap on phones.
export const CARD_SIZES = { story: [1080, 1920], square: [1080, 1080] };
/** Corner mark on every full-size card: the brand and its YouTube handle. */
export const BRAND_MARK = 'Shyam Premi SN · YouTube @shyampremi-by1tb';
export const TITLE_FONT = '"EF Yatra", "Noto Sans Devanagari", "Nirmala UI", serif';
export const BODY_FONT = '"EF Noto", "Noto Sans Devanagari", "Nirmala UI", sans-serif';
// ---------- helpers ----------
function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function linear(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((col, i) => g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), col));
    return g;
}
export function radial(c, x, y, r0, r1, stops) {
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
    return g;
}
/** A pointed petal from radius r0 to r1 along `angle`, `w` wide. */
export function petal(c, cx, cy, angle, r0, r1, w) {
    c.save();
    c.translate(cx, cy);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(r0, 0);
    c.quadraticCurveTo((r0 + r1) / 2, w, r1, 0);
    c.quadraticCurveTo((r0 + r1) / 2, -w, r0, 0);
    c.closePath();
    c.restore();
}
export function dot(c, x, y, r, fill) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
}
export function stars(x, n, maxY) {
    const { c, W, s, rnd } = x;
    for (let i = 0; i < n; i++) {
        c.globalAlpha = 0.25 + rnd() * 0.6;
        dot(c, rnd() * W, rnd() * maxY, (0.8 + rnd() * 2.2) * s, '#fff8e1');
    }
    c.globalAlpha = 1;
    for (let i = 0; i < n / 8; i++) {
        x.lights.sparkles.push({ x: rnd() * W, y: rnd() * maxY, r: (8 + rnd() * 10) * s, phase: rnd() * 6.3, color: '#fff3c4' });
    }
}
/** Clay diya, front view, with the wick in the middle. (x, y) is the centre of the rim. */
export function diya(x, cx, cy, w, body = ['#d9622b', '#a63b12', '#6b200a'], lit = true) {
    const { c, rnd } = x;
    const h = w * 0.36;
    // stand
    c.beginPath();
    c.ellipse(cx, cy + h * 0.95, w * 0.17, w * 0.05, 0, 0, Math.PI * 2);
    c.fillStyle = body[2];
    c.fill();
    // bowl
    c.beginPath();
    c.moveTo(cx - w / 2, cy);
    c.bezierCurveTo(cx - w * 0.46, cy + h * 0.9, cx - w * 0.2, cy + h, cx, cy + h);
    c.bezierCurveTo(cx + w * 0.2, cy + h, cx + w * 0.46, cy + h * 0.9, cx + w / 2, cy);
    c.closePath();
    c.fillStyle = linear(c, cx, cy, cx, cy + h, body);
    c.fill();
    // painted band of dots and a zigzag
    c.save();
    c.clip();
    c.strokeStyle = '#ffd36b';
    c.lineWidth = w * 0.018;
    c.beginPath();
    const band = cy + h * 0.38;
    for (let i = 0; i <= 12; i++) {
        const px = cx - w * 0.48 + (i * w * 0.96) / 12;
        const py = band + (i % 2 ? h * 0.1 : -h * 0.06);
        if (i === 0)
            c.moveTo(px, py);
        else
            c.lineTo(px, py);
    }
    c.stroke();
    for (let i = 0; i < 9; i++)
        dot(c, cx - w * 0.36 + (i * w * 0.72) / 8, cy + h * 0.66, w * 0.016, '#ffe6a3');
    c.restore();
    // rim and oil
    c.beginPath();
    c.ellipse(cx, cy, w / 2, w * 0.085, 0, 0, Math.PI * 2);
    c.fillStyle = body[1];
    c.fill();
    c.beginPath();
    c.ellipse(cx, cy, w * 0.43, w * 0.06, 0, 0, Math.PI * 2);
    c.fillStyle = linear(c, cx, cy - w * 0.06, cx, cy + w * 0.06, ['#7a3d06', '#e0a019']);
    c.fill();
    // wick
    c.strokeStyle = '#3b1d0a';
    c.lineWidth = w * 0.02;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx, cy - w * 0.05);
    c.stroke();
    if (lit)
        x.lights.flames.push({ x: cx, y: cy - w * 0.04, size: w * 0.2, phase: rnd() * 6.3 });
}
export function diyaRow(x, y, count, w, spread = 0.84, body) {
    const { W } = x;
    for (let i = 0; i < count; i++) {
        const cx = count === 1 ? W / 2 : W * (1 - spread) / 2 + (i * W * spread) / (count - 1);
        // the middle diya sits a little lower and larger
        const mid = Math.abs(i - (count - 1) / 2) < 0.6;
        diya(x, cx, y + (mid ? w * 0.06 : 0), mid ? w * 1.12 : w, body);
    }
}
export function groundGlow(x, y, color) {
    const { c, W } = x;
    c.save();
    c.translate(W / 2, y);
    c.scale(1, 0.32);
    c.fillStyle = radial(c, 0, 0, 0, W * 0.75, [color, 'rgba(0,0,0,0)']);
    c.fillRect(-W, -W, W * 2, W * 2);
    c.restore();
}
export function rangoli(x, cx, cy, R, colors, alpha = 1) {
    const { c } = x;
    c.save();
    c.globalAlpha = alpha;
    const outline = 'rgba(255,255,255,0.75)';
    c.lineWidth = Math.max(1, R * 0.008);
    const ring = (n, r0, r1, w, fill, offset = 0) => {
        for (let i = 0; i < n; i++) {
            petal(c, cx, cy, offset + (i * Math.PI * 2) / n, r0, r1, w);
            c.fillStyle = fill;
            c.fill();
            c.strokeStyle = outline;
            c.stroke();
        }
    };
    ring(16, R * 0.6, R, R * 0.13, colors[0]);
    ring(16, R * 0.62, R * 0.86, R * 0.06, colors[1], Math.PI / 16);
    for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI * 2) / 32;
        dot(c, cx + Math.cos(a) * R * 0.57, cy + Math.sin(a) * R * 0.57, R * 0.022, colors[3]);
    }
    ring(12, R * 0.27, R * 0.54, R * 0.1, colors[1], Math.PI / 12);
    dot(c, cx, cy, R * 0.28, colors[2]);
    c.beginPath();
    c.arc(cx, cy, R * 0.28, 0, Math.PI * 2);
    c.strokeStyle = outline;
    c.stroke();
    ring(8, R * 0.06, R * 0.26, R * 0.07, colors[4]);
    dot(c, cx, cy, R * 0.06, colors[0]);
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8 + Math.PI / 8;
        dot(c, cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2, R * 0.018, '#fff');
    }
    c.restore();
}
export function marigold(x, cx, cy, r, light, dark) {
    const { c } = x;
    dot(c, cx, cy, r, dark);
    for (const [k, n] of [[0.78, 11], [0.5, 8], [0.22, 5]]) {
        for (let i = 0; i < n; i++) {
            const a = (i * Math.PI * 2) / n + k;
            dot(c, cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k, r * 0.34 * (k + 0.25), i % 2 ? light : dark);
        }
    }
    dot(c, cx - r * 0.25, cy - r * 0.3, r * 0.22, 'rgba(255,255,255,0.18)');
}
export function leaf(x, cx, cy, len, angle, color) {
    const { c } = x;
    petal(c, cx, cy, angle, 0, len, len * 0.28);
    c.fillStyle = color;
    c.fill();
    c.save();
    c.translate(cx, cy);
    c.rotate(angle);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = len * 0.04;
    c.beginPath();
    c.moveTo(len * 0.1, 0);
    c.lineTo(len * 0.9, 0);
    c.stroke();
    c.restore();
}
/** String of small bulbs hanging in a curve from (x0, y) to (x1, y). */
function bulbString(x, x0, x1, y, sag, n, colors) {
    const { c, s } = x;
    const mx = (x0 + x1) / 2;
    c.strokeStyle = 'rgba(40,20,10,0.7)';
    c.lineWidth = 2.5 * s;
    c.beginPath();
    c.moveTo(x0, y);
    c.quadraticCurveTo(mx, y + sag * 2, x1, y);
    c.stroke();
    for (let i = 1; i < n; i++) {
        const t = i / n;
        const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
        const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
        const col = colors[i % colors.length];
        c.fillStyle = '#4a2a10';
        c.fillRect(px - 4 * s, py, 8 * s, 8 * s);
        c.beginPath();
        c.ellipse(px, py + 17 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2);
        c.fillStyle = col;
        c.fill();
        x.lights.glows.push({ x: px, y: py + 17 * s, r: 30 * s, color: col, phase: i * 1.7 });
    }
}
function lantern(x, cx, top, h, colors) {
    const { c, s } = x;
    const w = h * 0.36;
    c.strokeStyle = 'rgba(255,220,150,0.6)';
    c.lineWidth = 2 * s;
    c.beginPath();
    c.moveTo(cx, 0);
    c.lineTo(cx, top);
    c.stroke();
    // cap
    c.fillStyle = '#e8b04a';
    c.fillRect(cx - w * 0.22, top, w * 0.44, h * 0.05);
    const y0 = top + h * 0.05;
    const pts = [
        [cx, y0],
        [cx + w, y0 + h * 0.22],
        [cx + w, y0 + h * 0.48],
        [cx, y0 + h * 0.7],
        [cx - w, y0 + h * 0.48],
        [cx - w, y0 + h * 0.22],
    ];
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fillStyle = linear(c, cx - w, y0, cx + w, y0 + h * 0.7, [colors[0], colors[1], colors[0]]);
    c.fill();
    // glowing window
    c.beginPath();
    c.ellipse(cx, y0 + h * 0.35, w * 0.45, h * 0.17, 0, 0, Math.PI * 2);
    c.fillStyle = radial(c, cx, y0 + h * 0.35, 0, w * 0.5, ['rgba(255,245,200,0.95)', 'rgba(255,190,90,0.5)']);
    c.fill();
    // gold ribs
    c.strokeStyle = '#ffd36b';
    c.lineWidth = 2.5 * s;
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.moveTo(cx, y0);
    c.lineTo(cx, y0 + h * 0.7);
    c.moveTo(cx - w, y0 + h * 0.22);
    c.lineTo(cx + w, y0 + h * 0.48);
    c.moveTo(cx + w, y0 + h * 0.22);
    c.lineTo(cx - w, y0 + h * 0.48);
    c.stroke();
    // tassels
    const ty = y0 + h * 0.7;
    for (let i = -3; i <= 3; i++) {
        const tx = cx + i * w * 0.12;
        const len = h * (0.22 + (3 - Math.abs(i)) * 0.025);
        c.strokeStyle = i % 2 ? colors[0] : '#ffd36b';
        c.lineWidth = 2 * s;
        c.beginPath();
        c.moveTo(cx, ty);
        c.lineTo(tx, ty + len);
        c.stroke();
        dot(c, tx, ty + len, 4 * s, '#ffd36b');
    }
    x.lights.glows.push({ x: cx, y: y0 + h * 0.35, r: h * 0.8, color: 'rgba(255,190,90,1)', phase: cx });
}
function burst(x, cx, cy, R, color) {
    const { c, s, rnd } = x;
    c.fillStyle = radial(c, cx, cy, 0, R * 1.1, [color.replace('1)', '0.22)'), 'rgba(0,0,0,0)']);
    c.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    const n = 34;
    for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n + rnd() * 0.08;
        const r1 = R * (0.75 + rnd() * 0.25);
        const x0 = cx + Math.cos(a) * R * 0.18;
        const y0 = cy + Math.sin(a) * R * 0.18;
        const x1 = cx + Math.cos(a) * r1;
        const y1 = cy + Math.sin(a) * r1;
        c.strokeStyle = linear(c, x0, y0, x1, y1, [color.replace('1)', '0)'), color]);
        c.lineWidth = 3 * s;
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
        dot(c, x1, y1, 4.5 * s, '#fffbe8');
        if (i % 2)
            dot(c, cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, 3 * s, color);
    }
    x.lights.sparkles.push({ x: cx, y: cy, r: R * 0.22, phase: rnd() * 6.3, color: '#fffbe8' });
}
function lotus(x, cx, base, size) {
    const { c } = x;
    const pink = () => {
        c.fillStyle = linear(c, cx, base - size, cx, base, ['#ffd1df', '#f27aa0', '#c93a6a']);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineWidth = size * 0.012;
        c.stroke();
    };
    for (const [n, len, w, spread] of [[7, 1, 0.2, 1.35], [5, 0.85, 0.2, 0.95], [3, 0.7, 0.18, 0.45]]) {
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 - spread / 2 + (i * spread) / (n - 1);
            petal(c, cx, base, a, 0, size * len, size * w);
            pink();
        }
    }
}
export function frame(x, color) {
    const { c, W, H, s } = x;
    c.strokeStyle = color;
    c.lineWidth = 3 * s;
    c.strokeRect(34 * s, 34 * s, W - 68 * s, H - 68 * s);
    c.lineWidth = 1.2 * s;
    c.strokeRect(48 * s, 48 * s, W - 96 * s, H - 96 * s);
    for (const [px, py, a] of [[34, 34, 0], [W / s - 34, 34, Math.PI / 2], [W / s - 34, H / s - 34, Math.PI], [34, H / s - 34, -Math.PI / 2]]) {
        for (let i = 0; i < 5; i++) {
            petal(c, px * s, py * s, a + (i * Math.PI) / 8, 8 * s, 70 * s, 10 * s);
            c.fillStyle = color;
            c.fill();
        }
        dot(c, px * s, py * s, 9 * s, color);
    }
}
export function arch(x, top, bottom, inset, color) {
    const { c, W, s } = x;
    const draw = (d, lw) => {
        const x0 = inset + d;
        const x1 = W - inset - d;
        const spring = top + (bottom - top) * 0.2;
        c.beginPath();
        c.moveTo(x0, bottom);
        c.lineTo(x0, spring);
        c.bezierCurveTo(x0, spring - (spring - top) * 0.7, W / 2 - (W / 2 - x0) * 0.25, top + d + (spring - top) * 0.25, W / 2, top + d);
        c.bezierCurveTo(W / 2 + (x1 - W / 2) * 0.25, top + d + (spring - top) * 0.25, x1, spring - (spring - top) * 0.7, x1, spring);
        c.lineTo(x1, bottom);
        c.strokeStyle = color;
        c.lineWidth = lw;
        c.stroke();
    };
    draw(0, 4 * s);
    draw(16 * s, 1.5 * s);
}
export function jaali(x, color) {
    const { c, W, H, s } = x;
    const step = 72 * s;
    c.strokeStyle = color;
    c.lineWidth = 1.5 * s;
    for (let y = 0; y < H + step; y += step) {
        for (let px = 0; px < W + step; px += step) {
            const ox = (y / step) % 2 ? step / 2 : 0;
            const cx = px + ox;
            c.beginPath();
            c.moveTo(cx, y - step * 0.32);
            c.lineTo(cx + step * 0.32, y);
            c.lineTo(cx, y + step * 0.32);
            c.lineTo(cx - step * 0.32, y);
            c.closePath();
            c.stroke();
        }
    }
}
/** Peacock feather (mor-pankh) from its base at (cx, cy), `len` long, leaning by `angle` (0 = straight up). */
export function morPankh(x, cx, cy, len, angle) {
    const { c, s } = x;
    const w = len * 0.34;
    c.save();
    c.translate(cx, cy);
    c.rotate(angle);
    // vane
    c.beginPath();
    c.moveTo(0, -len * 0.18);
    c.bezierCurveTo(w * 0.7, -len * 0.4, w * 0.62, -len * 0.95, 0, -len);
    c.bezierCurveTo(-w * 0.62, -len * 0.95, -w * 0.7, -len * 0.4, 0, -len * 0.18);
    c.fillStyle = linear(c, 0, 0, 0, -len, ['rgba(40,120,60,0.35)', 'rgba(70,160,80,0.9)', 'rgba(150,190,60,0.95)']);
    c.fill();
    // barbs
    c.strokeStyle = 'rgba(190,230,140,0.55)';
    c.lineWidth = 1.6 * s;
    for (let i = 0; i < 34; i++) {
        const t = 0.2 + (i / 34) * 0.62;
        const half = Math.sin(((t - 0.18) / 0.82) * Math.PI) * w * 0.62;
        for (const side of [-1, 1]) {
            c.beginPath();
            c.moveTo(0, -len * t);
            c.quadraticCurveTo(side * half * 0.6, -len * t - half * 0.2, side * half, -len * t - half * 0.5);
            c.stroke();
        }
    }
    // eye
    const ey = -len * 0.76;
    const ring = (rx, ry, fill, dy = 0) => {
        c.beginPath();
        c.ellipse(0, ey + dy, rx, ry, 0, 0, Math.PI * 2);
        c.fillStyle = fill;
        c.fill();
    };
    ring(w * 0.46, w * 0.58, '#d9c23a');
    ring(w * 0.38, w * 0.48, '#8a5a1a', w * 0.03);
    ring(w * 0.31, w * 0.39, '#1fa39b', w * 0.05);
    ring(w * 0.19, w * 0.25, '#14206e', w * 0.08);
    ring(w * 0.06, w * 0.08, 'rgba(255,255,255,0.5)', -w * 0.02);
    // shaft
    c.strokeStyle = '#efe3b0';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(w * 0.05, -len * 0.5, 0, -len * 0.98);
    c.stroke();
    c.restore();
}
/** A swag of marigolds hanging between (x0, y) and (x1, y). */
export function garlandSwag(x, x0, x1, y, sag, r) {
    const n = Math.max(6, Math.round((x1 - x0) / (r * 1.5)));
    const mx = (x0 + x1) / 2;
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
        const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
        marigold(x, px, py, r, i % 2 ? '#ffd23a' : '#ff8a12', i % 2 ? '#f0a400' : '#e0560a');
    }
}
// ---------- designs ----------
export const GOLD = ['#fff3c2', '#ffd15c', '#f0a51e'];
export const DESIGNS = [
    {
        id: 'diya-night',
        name: 'Diya night',
        nameHi: 'दीयों की रात',
        palette: { title: GOLD, sub: '#ffdcae', text: '#fff6e3', name: '#ffd27a', mark: 'rgba(255,240,215,0.72)', shadow: 'rgba(20,0,30,0.6)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#12062e', '#2b0b4f', '#5c1340']);
            c.fillRect(0, 0, W, H);
            stars(x, story ? 130 : 80, H * 0.75);
            bulbString(x, -20 * s, W + 20 * s, story ? 40 * s : 20 * s, story ? 60 * s : 40 * s, 16, ['#ffcf5a', '#ff7a59', '#ffe9a6', '#ff9ec4']);
            const y = H - (story ? 230 : 140) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,150,60,0.45)');
            diyaRow(x, y, 5, (story ? 150 : 120) * s);
            return { top: (story ? 230 : 150) * s, bottom: y - (story ? 120 : 80) * s };
        },
    },
    {
        id: 'rangoli',
        name: 'Rangoli',
        nameHi: 'रंगोली',
        palette: {
            title: GOLD,
            sub: '#ffd9e6',
            text: '#fff3f6',
            name: '#ffd27a',
            mark: 'rgba(255,235,240,0.75)',
            shadow: 'rgba(40,0,15,0.7)',
            panel: 'rgba(60,4,28,0.45)',
            markBg: 'rgba(46,4,24,0.7)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = radial(c, W / 2, H * 0.45, 0, Math.max(W, H) * 0.75, ['#a3164f', '#5a0a2e', '#2e0418']);
            c.fillRect(0, 0, W, H);
            const cols = ['#ff8a1f', '#ffd23f', '#1fa7a0', '#ffffff', '#e8306f'];
            rangoli(x, W / 2, H / 2, W * 0.62, cols, 0.13);
            const R = W * 0.26;
            rangoli(x, 0, 0, R, cols);
            rangoli(x, W, 0, R, ['#ffd23f', '#e8306f', '#7a3cff', '#ffffff', '#ff8a1f']);
            rangoli(x, 0, H, R, ['#ffd23f', '#e8306f', '#7a3cff', '#ffffff', '#ff8a1f']);
            rangoli(x, W, H, R, cols);
            const y = H - (story ? 170 : 110) * s;
            diyaRow(x, y, 3, (story ? 130 : 105) * s, 0.36);
            return { top: R * (story ? 1.15 : 0.95), bottom: y - (story ? 110 : 70) * s };
        },
    },
    {
        id: 'marigold',
        name: 'Marigold toran',
        nameHi: 'गेंदे का तोरण',
        palette: {
            title: ['#fffef5', '#fff0b8', '#ffe08a'],
            sub: '#fff1d0',
            text: '#fffaf0',
            name: '#fff3b0',
            mark: 'rgba(255,248,235,0.8)',
            shadow: 'rgba(90,15,0,0.75)',
            panel: 'rgba(110,22,4,0.35)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#ff9a24', '#e5560f', '#9c1f0b']);
            c.fillRect(0, 0, W, H);
            c.fillStyle = radial(c, W / 2, H * 0.45, 0, W * 0.7, ['rgba(255,220,140,0.35)', 'rgba(255,220,140,0)']);
            c.fillRect(0, 0, W, H);
            // rope with mango leaves, and hanging marigold strings
            const ropeY = 36 * s;
            c.strokeStyle = '#7a3b0a';
            c.lineWidth = 6 * s;
            c.beginPath();
            c.moveTo(0, ropeY);
            c.lineTo(W, ropeY);
            c.stroke();
            const strings = 9;
            const r = (story ? 26 : 22) * s;
            let lowest = 0;
            for (let i = 0; i < strings; i++) {
                const sx = (W * (i + 0.5)) / strings;
                const n = (story ? [5, 4, 6, 4, 7, 4, 6, 4, 5] : [3, 2, 4, 2, 4, 2, 4, 2, 3])[i];
                c.strokeStyle = '#5b2a06';
                c.lineWidth = 2 * s;
                c.beginPath();
                c.moveTo(sx, ropeY);
                c.lineTo(sx, ropeY + n * r * 1.85);
                c.stroke();
                for (let k = 0; k < n; k++) {
                    const yy = ropeY + r * 1.1 + k * r * 1.85;
                    marigold(x, sx, yy, r, k % 2 ? '#ffd23a' : '#ff8a12', k % 2 ? '#f0a400' : '#e0560a');
                    lowest = Math.max(lowest, yy + r);
                }
                if (i < strings - 1) {
                    const lx = (W * (i + 1)) / strings;
                    leaf(x, lx, ropeY, 58 * s, Math.PI / 2 - 0.35, '#2f8a2f');
                    leaf(x, lx, ropeY, 58 * s, Math.PI / 2 + 0.35, '#3fa040');
                }
            }
            for (let i = 0; i < strings * 2; i++)
                marigold(x, (W * i) / (strings * 2 - 1), ropeY, 15 * s, '#ffd23a', '#ff8a12');
            const y = H - (story ? 180 : 115) * s;
            for (let i = 0; i < 30; i++)
                dot(c, (W * (i + 0.5)) / 30, H - 66 * s, 6 * s, i % 2 ? '#fff1c2' : '#ffd23a');
            diyaRow(x, y, 3, (story ? 140 : 110) * s, 0.5, ['#f2e3c8', '#b98b52', '#6e4a20']);
            return { top: lowest + (story ? 70 : 40) * s, bottom: y - (story ? 110 : 75) * s };
        },
    },
    {
        id: 'lanterns',
        name: 'Sky lanterns',
        nameHi: 'आकाश कंदील',
        palette: { title: GOLD, sub: '#c9f1ea', text: '#f2fffb', name: '#ffd27a', mark: 'rgba(225,250,245,0.72)', shadow: 'rgba(0,20,25,0.65)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#031b22', '#08404a', '#0d5a52']);
            c.fillRect(0, 0, W, H);
            stars(x, story ? 70 : 40, H * 0.6);
            const h = (story ? 300 : 190) * s;
            const tops = story ? [70, 190, 110] : [20, 70, 35];
            const cols = [['#e8306f', '#8a0f3c'], ['#ff8a1f', '#b0400a'], ['#7a3cff', '#3a1a8a']];
            [0.18, 0.5, 0.82].forEach((fx, i) => lantern(x, W * fx, tops[i] * s, h, cols[i]));
            const y = H - (story ? 200 : 125) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,170,80,0.35)');
            diyaRow(x, y, 4, (story ? 135 : 105) * s, 0.7);
            return { top: (tops[1] * s + h * 1.05) + (story ? 40 : 10) * s, bottom: y - (story ? 110 : 70) * s };
        },
    },
    {
        id: 'fireworks',
        name: 'Fireworks',
        nameHi: 'आतिशबाज़ी',
        palette: { title: GOLD, sub: '#d6dcff', text: '#f5f6ff', name: '#ffd27a', mark: 'rgba(230,235,255,0.72)', shadow: 'rgba(0,0,20,0.7)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#040822', '#121a4a', '#341a55']);
            c.fillRect(0, 0, W, H);
            stars(x, story ? 90 : 50, H * 0.7);
            const B = story
                ? [[0.24, 200, 170, 'rgba(255,209,92,1)'], [0.72, 150, 140, 'rgba(255,110,170,1)'], [0.52, 360, 110, 'rgba(110,220,255,1)'], [0.88, 330, 90, 'rgba(140,255,170,1)']]
                : [[0.2, 120, 110, 'rgba(255,209,92,1)'], [0.8, 110, 100, 'rgba(255,110,170,1)'], [0.5, 80, 70, 'rgba(110,220,255,1)']];
            for (const [fx, fy, R, col] of B)
                burst(x, W * fx, fy * s, R * s, col);
            const y = H - (story ? 210 : 130) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,150,80,0.4)');
            diyaRow(x, y, 5, (story ? 140 : 110) * s);
            return { top: (story ? 520 : 230) * s, bottom: y - (story ? 120 : 75) * s };
        },
    },
    {
        id: 'lotus',
        name: 'Lotus',
        nameHi: 'कमल',
        palette: {
            title: ['#c2184f', '#9c0f3d', '#6e0a2b'],
            sub: '#9a4a1a',
            text: '#4a1a12',
            name: '#a3122f',
            mark: 'rgba(90,25,20,0.6)',
            shadow: 'rgba(255,255,255,0)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#fff8ec', '#ffe7d3', '#ffd2c2']);
            c.fillRect(0, 0, W, H);
            rangoli(x, W / 2, story ? 330 * s : 130 * s, (story ? 200 : 110) * s, ['#f7b733', '#f27aa0', '#ffe7a0', '#c2184f', '#ffffff'], story ? 0.9 : 0.3);
            frame(x, '#c99a2e');
            const base = H - (story ? 150 : 110) * s;
            // leaves
            c.fillStyle = '#4c9a5b';
            for (const dx of [-1, 1]) {
                c.beginPath();
                c.ellipse(W / 2 + dx * 250 * s, base + 25 * s, 150 * s, 32 * s, dx * 0.08, 0, Math.PI * 2);
                c.fill();
            }
            lotus(x, W / 2 - 290 * s, base, (story ? 120 : 95) * s);
            lotus(x, W / 2 + 290 * s, base, (story ? 120 : 95) * s);
            lotus(x, W / 2, base + 10 * s, (story ? 170 : 130) * s);
            diya(x, W / 2, base - (story ? 120 : 95) * s, (story ? 160 : 120) * s);
            return { top: (story ? 580 : 120) * s, bottom: base - (story ? 280 : 210) * s };
        },
    },
    {
        id: 'royal',
        name: 'Royal gold',
        nameHi: 'शाही सुनहरा',
        palette: { title: GOLD, sub: '#f3d9a4', text: '#fff2dc', name: '#ffd27a', mark: 'rgba(255,230,190,0.72)', shadow: 'rgba(30,0,5,0.6)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = radial(c, W / 2, H * 0.4, 0, Math.max(W, H) * 0.8, ['#7d1128', '#560a1b', '#2e040d']);
            c.fillRect(0, 0, W, H);
            jaali(x, 'rgba(255,209,92,0.07)');
            const y = H - (story ? 200 : 130) * s;
            arch(x, (story ? 120 : 60) * s, y + 80 * s, (story ? 90 : 120) * s, '#d9a83a');
            groundGlow(x, y + 40 * s, 'rgba(255,170,70,0.4)');
            diya(x, W / 2 - 230 * s, y + 20 * s, (story ? 110 : 90) * s);
            diya(x, W / 2, y, (story ? 170 : 130) * s);
            diya(x, W / 2 + 230 * s, y + 20 * s, (story ? 110 : 90) * s);
            for (let i = 0; i < 26; i++)
                dot(c, (W * (i + 0.5)) / 26, H - 62 * s, 5 * s, '#d9a83a');
            return { top: (story ? 330 : 170) * s, bottom: y - (story ? 110 : 80) * s };
        },
    },
    {
        id: 'shyam-mor',
        name: 'Shyam: peacock feather',
        nameHi: 'श्याम: मोरपंख',
        shyam: true,
        palette: { title: GOLD, sub: '#cfe8ff', text: '#f3f8ff', name: '#ffd27a', mark: 'rgba(225,240,255,0.75)', shadow: 'rgba(0,10,40,0.7)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#06123a', '#0b2a6b', '#0f4a72']);
            c.fillRect(0, 0, W, H);
            c.fillStyle = radial(c, W / 2, H * 0.45, 0, W * 0.7, ['rgba(80,170,255,0.18)', 'rgba(80,170,255,0)']);
            c.fillRect(0, 0, W, H);
            stars(x, story ? 70 : 40, H * 0.7);
            const L = (story ? 420 : 240) * s;
            const y1 = (story ? 470 : 255) * s;
            const y2 = (story ? 520 : 280) * s;
            morPankh(x, -10 * s, y1, L, 0.55);
            morPankh(x, 60 * s, y2, L * 0.8, 0.95);
            morPankh(x, W + 10 * s, y1, L, -0.55);
            morPankh(x, W - 60 * s, y2, L * 0.8, -0.95);
            morPankh(x, W / 2, (story ? 330 : 205) * s, (story ? 240 : 150) * s, 0);
            const y = H - (story ? 210 : 130) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,170,70,0.4)');
            diyaRow(x, y, 5, (story ? 140 : 105) * s);
            return { top: (story ? 510 : 290) * s, bottom: y - (story ? 120 : 75) * s };
        },
    },
    {
        id: 'shyam-darbar',
        name: 'Shyam: marigold darbar',
        nameHi: 'श्याम: गेंदे का दरबार',
        shyam: true,
        palette: {
            title: ['#fffef5', '#fff0b8', '#ffd96b'],
            sub: '#ffe3c2',
            text: '#fff8ee',
            name: '#ffe08a',
            mark: 'rgba(255,240,225,0.8)',
            shadow: 'rgba(60,0,10,0.75)',
            panel: 'rgba(70,6,20,0.35)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#8f0f2a', '#b5301a', '#6a0a1e']);
            c.fillRect(0, 0, W, H);
            jaali(x, 'rgba(255,215,120,0.06)');
            const r = (story ? 24 : 20) * s;
            garlandSwag(x, -20 * s, W / 2, 30 * s, (story ? 70 : 45) * s, r);
            garlandSwag(x, W / 2, W + 20 * s, 30 * s, (story ? 70 : 45) * s, r);
            for (const gx of [0.02, 0.98]) {
                for (let k = 0; k < (story ? 12 : 6); k++)
                    marigold(x, W * gx, (60 + k * 46) * s, r, k % 2 ? '#ffd23a' : '#ff8a12', k % 2 ? '#f0a400' : '#e0560a');
            }
            morPankh(x, W / 2, (story ? 330 : 205) * s, (story ? 240 : 150) * s, 0);
            const y = H - (story ? 200 : 125) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,190,90,0.35)');
            diyaRow(x, y, 3, (story ? 140 : 105) * s, 0.5);
            for (let i = 0; i < 24; i++)
                dot(c, (W * (i + 0.5)) / 24, H - 66 * s, 6 * s, i % 2 ? '#ffd23a' : '#ff8a12');
            return { top: (story ? 420 : 250) * s, bottom: y - (story ? 115 : 75) * s };
        },
    },
    {
        id: 'shyam-gold',
        name: 'Shyam: blue and gold',
        nameHi: 'श्याम: नीला-सुनहरा',
        shyam: true,
        palette: { title: GOLD, sub: '#f3dca4', text: '#fff6e0', name: '#ffd27a', mark: 'rgba(255,235,200,0.75)', shadow: 'rgba(0,0,30,0.65)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = radial(c, W / 2, H * 0.4, 0, Math.max(W, H) * 0.8, ['#1d3f9a', '#10265e', '#070f30']);
            c.fillRect(0, 0, W, H);
            jaali(x, 'rgba(255,209,92,0.06)');
            frame(x, '#d9a83a');
            const y = H - (story ? 210 : 130) * s;
            arch(x, (story ? 200 : 110) * s, y + 70 * s, (story ? 110 : 140) * s, '#d9a83a');
            morPankh(x, W / 2 - 40 * s, (story ? 300 : 175) * s, (story ? 190 : 120) * s, -0.35);
            morPankh(x, W / 2 + 40 * s, (story ? 300 : 175) * s, (story ? 190 : 120) * s, 0.35);
            dot(x.c, W / 2, (story ? 300 : 175) * s, 14 * s, '#ffd36b');
            groundGlow(x, y + 40 * s, 'rgba(255,170,70,0.4)');
            diya(x, W / 2 - 230 * s, y + 20 * s, (story ? 110 : 90) * s);
            diya(x, W / 2, y, (story ? 160 : 125) * s);
            diya(x, W / 2 + 230 * s, y + 20 * s, (story ? 110 : 90) * s);
            return { top: (story ? 390 : 210) * s, bottom: y - (story ? 110 : 75) * s };
        },
    },
];
/** Wrap to the fewest lines, then narrow the width as far as the line count allows so the last line is not a lone word. */
function balancedWrap(c, text, maxW) {
    const lines = wrap(c, text, maxW);
    if (lines.length < 2)
        return lines;
    let lo = maxW * 0.45;
    let hi = maxW;
    for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        if (wrap(c, text, mid).length <= lines.length)
            hi = mid;
        else
            lo = mid;
    }
    return wrap(c, text, hi);
}
function wrap(c, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (!line || c.measureText(next).width <= maxW)
            line = next;
        else {
            lines.push(line);
            line = w;
        }
    }
    if (line)
        lines.push(line);
    return lines;
}
function framePath(c, kind, x, y, w, h) {
    c.beginPath();
    if (kind === 'circle') {
        c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    }
    else if (kind === 'arch') {
        c.moveTo(x, y + h);
        c.lineTo(x, y + h * 0.42);
        c.bezierCurveTo(x, y + h * 0.15, x + w * 0.3, y + h * 0.06, x + w / 2, y);
        c.bezierCurveTo(x + w * 0.7, y + h * 0.06, x + w, y + h * 0.15, x + w, y + h * 0.42);
        c.lineTo(x + w, y + h);
    }
    else {
        // a diya flame: pointed at the top, round at the bottom
        c.moveTo(x + w / 2, y);
        c.bezierCurveTo(x + w * 0.62, y + h * 0.22, x + w * 1.08, y + h * 0.5, x + w, y + h * 0.72);
        c.bezierCurveTo(x + w * 0.92, y + h * 0.95, x + w * 0.7, y + h, x + w / 2, y + h);
        c.bezierCurveTo(x + w * 0.3, y + h, x + w * 0.08, y + h * 0.95, x, y + h * 0.72);
        c.bezierCurveTo(x - w * 0.08, y + h * 0.5, x + w * 0.38, y + h * 0.22, x + w / 2, y);
    }
    c.closePath();
}
const FRAME_RATIO = { circle: 1, arch: 0.8, flame: 0.74 };
/** One or two photos side by side in decorative frames; the block is `size` tall. */
function drawPhotos(x, photos, kind, top, size, rects) {
    const { c, W, s } = x;
    const fh = kind === 'flame' ? size * 0.78 : size;
    const fw = fh * FRAME_RATIO[kind];
    const gap = 48 * s;
    const x0 = W / 2 - (photos.length * fw + (photos.length - 1) * gap) / 2;
    photos.forEach((ph, i) => {
        const fx = x0 + i * (fw + gap);
        const fy = top;
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.35)';
        c.shadowBlur = 26 * s;
        c.shadowOffsetY = 6 * s;
        framePath(c, kind, fx, fy, fw, fh);
        c.fillStyle = '#fff3d6';
        c.fill();
        c.restore();
        c.save();
        framePath(c, kind, fx, fy, fw, fh);
        c.clip();
        const { img } = ph;
        const sc = Math.max(fw / img.width, fh / img.height) * ph.zoom;
        const dw = img.width * sc;
        const dh = img.height * sc;
        const mx = (dw - fw) / 2;
        const my = (dh - fh) / 2;
        const ox = Math.max(-mx, Math.min(mx, ph.x * fw));
        const oy = Math.max(-my, Math.min(my, ph.y * fh));
        c.drawImage(img, fx + fw / 2 - dw / 2 + ox, fy + fh / 2 - dh / 2 + oy, dw, dh);
        c.restore();
        framePath(c, kind, fx, fy, fw, fh);
        c.strokeStyle = linear(c, fx, fy, fx + fw, fy + fh, ['#fff1b8', '#e0a019', '#ffd36b', '#b87a10']);
        c.lineWidth = 11 * s;
        c.stroke();
        if (kind === 'circle') {
            const n = 30;
            for (let k = 0; k < n; k++) {
                const a = (k * Math.PI * 2) / n;
                dot(c, fx + fw / 2 + Math.cos(a) * (fw / 2 + 17 * s), fy + fh / 2 + Math.sin(a) * (fh / 2 + 17 * s), 8.5 * s, k % 2 ? '#ffd23a' : '#ff8a12');
            }
        }
        else if (kind === 'arch') {
            framePath(c, kind, fx - 16 * s, fy - 16 * s, fw + 32 * s, fh + 16 * s);
            c.strokeStyle = '#ffd36b';
            c.lineWidth = 2.5 * s;
            c.stroke();
            dot(c, fx + fw / 2, fy - 30 * s, 11 * s, '#ffd36b');
        }
        else {
            diya(x, fx + fw / 2, fy + fh - fw * 0.06, fw * 1.15, undefined, false);
        }
        rects.push({ x: fx, y: fy, w: fw, h: fh });
    });
}
const SHYAM_RE = /श्याम|Shyam/;
function drawText(x, d, text, zone, thumb, rects) {
    const { c, W, s, story } = x;
    const p = d.palette;
    const maxW = W * 0.8;
    const base = story ? 1.2 : 0.9;
    const photos = thumb ? [] : (text.photos ?? []).slice(0, 2);
    const frame = text.frame ?? 'circle';
    const specs = [];
    const bold = (k) => `700 ${k}px ${BODY_FONT}`;
    const regular = (k) => `500 ${k}px ${BODY_FONT}`;
    const display = (k) => `400 ${k}px ${TITLE_FONT}`;
    const add = (kind, t, font, size, lh, color, gapAfter) => {
        if (t && t.trim())
            specs.push({ kind, text: t.trim(), font, size, lh, color, gapAfter });
    };
    if (d.shyam && !SHYAM_RE.test(text.title))
        add('header', 'जय श्री श्याम', display, 64 * base, 1.3, p.title, 18);
    if (!thumb)
        add('greeting', text.greeting, bold, 50 * base, 1.4, p.name, 24);
    add('title', text.title, display, 132 * base, 1.25, p.title, 8);
    add('subtitle', text.subtitle, regular, 40 * base, 1.45, p.sub, 40);
    if (!thumb) {
        add('message', text.message, regular, 47 * base, 1.6, p.text, 44);
        if (photos.length)
            add('photo', 'photo', regular, (story ? 440 : 260) * (photos.length > 1 ? 0.85 : 1), 1, p.text, 34);
        add('signoff', text.signoff, regular, 36 * base, 1.45, p.sub, 4);
        add('from', text.from, bold, 58 * base, 1.4, p.name, 0);
    }
    // Shrink everything until it fits the zone; the title also shrinks on its own to fit two lines.
    let k = 1;
    let blocks = [];
    let total = 0;
    for (let iter = 0; iter < 16; iter++) {
        blocks = specs.map((b) => {
            let size = b.size * k * s;
            if (b.kind === 'photo')
                return { ...b, size, lines: [''] };
            c.font = b.font(size);
            let lines = b.kind === 'message' || b.kind === 'title' ? balancedWrap(c, b.text, maxW) : wrap(c, b.text, maxW);
            if (b.kind === 'title' && lines.length === 2) {
                // a short title that only just wraps reads better on one slightly smaller line
                c.font = b.font(size * 0.82);
                if (c.measureText(b.text).width <= maxW) {
                    size *= 0.82;
                    lines = [b.text];
                }
                else
                    c.font = b.font(size);
            }
            while (b.kind === 'title' && (lines.length > 2 || lines.some((l) => c.measureText(l).width > maxW)) && size > 30 * s) {
                size *= 0.92;
                c.font = b.font(size);
                lines = balancedWrap(c, b.text, maxW);
            }
            return { ...b, size, lines };
        });
        total = blocks.reduce((sum, b, i) => sum + b.lines.length * b.size * b.lh + (i < blocks.length - 1 ? b.gapAfter * k * s : 0), 0);
        if (total <= zone.bottom - zone.top)
            break;
        k *= 0.93;
    }
    let y = zone.top + Math.max(0, (zone.bottom - zone.top - total) / 2);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    blocks.forEach((b, i) => {
        const lineH = b.size * b.lh;
        if (b.kind === 'photo') {
            drawPhotos(x, photos, frame, y, b.size, rects);
            y += lineH + b.gapAfter * k * s;
            return;
        }
        c.font = b.font(b.size);
        if (p.panel && b.kind === 'message') {
            // soft panel behind the message
            const wMax = Math.max(...b.lines.map((l) => c.measureText(l).width));
            const padX = 36 * s;
            const padY = 18 * s;
            c.fillStyle = p.panel;
            c.beginPath();
            const box = [W / 2 - wMax / 2 - padX, y - padY, wMax + padX * 2, b.lines.length * lineH + padY * 2];
            if (typeof c.roundRect === 'function')
                c.roundRect(...box, 28 * s);
            else
                c.rect(...box);
            c.fill();
        }
        c.shadowColor = p.shadow;
        c.shadowBlur = 14 * s;
        c.shadowOffsetY = 2 * s;
        for (const line of b.lines) {
            const cy = y + lineH / 2;
            c.fillStyle = Array.isArray(b.color) ? linear(c, 0, cy - b.size * 0.55, 0, cy + b.size * 0.45, b.color) : b.color;
            c.fillText(line, W / 2, cy);
            y += lineH;
        }
        c.shadowColor = 'transparent';
        c.shadowBlur = 0;
        c.shadowOffsetY = 0;
        if (i < blocks.length - 1)
            y += b.gapAfter * k * s;
    });
}
function mark(x, d) {
    const { c, W, H, s } = x;
    c.font = `600 ${24 * s}px ${BODY_FONT}`;
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    const label = d.markText ?? BRAND_MARK;
    if (d.palette.markBg) {
        const w = c.measureText(label).width;
        c.fillStyle = d.palette.markBg;
        c.beginPath();
        if (typeof c.roundRect === 'function')
            c.roundRect(W - 38 * s - w, H - 50 * s, w + 24 * s, 38 * s, 19 * s);
        else
            c.rect(W - 38 * s - w, H - 50 * s, w + 24 * s, 38 * s);
        c.fill();
    }
    c.fillStyle = d.palette.mark;
    c.fillText(label, W - 26 * s, H - 22 * s);
}
/** Paint the static part of a card. `thumb` draws only the title, for the small design previews. */
export function paintCard(design, format, text, width, thumb = false) {
    const [fw, fh] = CARD_SIZES[format];
    const W = width ?? fw;
    const H = Math.round((W * fh) / fw);
    const base = document.createElement('canvas');
    base.width = W;
    base.height = H;
    const c = base.getContext('2d');
    const x = { c, W, H, s: W / 1080, story: format === 'story', rnd: mulberry32(7), lights: { flames: [], glows: [], sparkles: [] } };
    const zone = design.paint(x);
    const photoRects = [];
    drawText(x, design, text, zone, thumb, photoRects);
    if (!thumb)
        mark(x, design);
    return { base, lights: x.lights, scale: x.s, photoRects };
}
function flame(c, f, t) {
    const flick = 1 + 0.09 * Math.sin(t * 9 + f.phase) + 0.05 * Math.sin(t * 23 + f.phase * 2.3);
    const sway = Math.sin(t * 4.3 + f.phase) * f.size * 0.08;
    const h = f.size * 1.7 * flick;
    const w = f.size * 0.52;
    const { x, y } = f;
    c.fillStyle = radial(c, x, y - h * 0.4, 0, f.size * 3.2 * flick, ['rgba(255,200,90,0.5)', 'rgba(255,150,40,0.18)', 'rgba(255,120,0,0)']);
    c.fillRect(x - f.size * 3.4, y - h * 0.4 - f.size * 3.4, f.size * 6.8, f.size * 6.8);
    const tear = (scale) => {
        c.beginPath();
        c.moveTo(x + sway * scale, y - h * scale);
        c.bezierCurveTo(x + w * scale, y - h * 0.45 * scale, x + w * 0.95 * scale, y, x, y);
        c.bezierCurveTo(x - w * 0.95 * scale, y, x - w * scale, y - h * 0.45 * scale, x + sway * scale, y - h * scale);
        c.closePath();
    };
    tear(1);
    c.fillStyle = linear(c, x, y - h, x, y, ['#ff7a12', '#ffb02e', '#ff6a00']);
    c.fill();
    tear(0.62);
    c.fillStyle = linear(c, x, y - h * 0.62, x, y, ['#fff3b0', '#fffdf2', '#ffd36b']);
    c.fill();
}
/** Draw the animated layer (flames, glows, twinkles) at time t in seconds. */
export function drawFrame(c, card, t) {
    c.drawImage(card.base, 0, 0);
    const { glows, flames, sparkles } = card.lights;
    for (const g of glows) {
        c.globalAlpha = 0.28 + 0.18 * Math.sin(t * 3 + g.phase);
        c.fillStyle = radial(c, g.x, g.y, 0, g.r, [g.color, 'rgba(0,0,0,0)']);
        c.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
    }
    c.globalAlpha = 1;
    for (const sp of sparkles) {
        const a = 0.5 + 0.5 * Math.sin(t * 2.4 + sp.phase);
        if (a < 0.05)
            continue;
        c.globalAlpha = a;
        c.fillStyle = sp.color;
        const r = sp.r * (0.6 + 0.4 * a);
        c.beginPath();
        c.moveTo(sp.x, sp.y - r);
        c.quadraticCurveTo(sp.x, sp.y, sp.x + r * 0.35, sp.y);
        c.quadraticCurveTo(sp.x, sp.y, sp.x, sp.y + r);
        c.quadraticCurveTo(sp.x, sp.y, sp.x - r * 0.35, sp.y);
        c.quadraticCurveTo(sp.x, sp.y, sp.x, sp.y - r);
        c.fill();
    }
    c.globalAlpha = 1;
    for (const f of flames)
        flame(c, f, t);
}
// ---------- fonts ----------
const DEVA = 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF';
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
let fonts = null;
/** Load the card fonts (Yatra One and Noto Sans Devanagari, both SIL OFL, from ../fonts next to this script). */
export function loadCardFonts() {
    if (!fonts) {
        const defs = [
            ['EF Yatra', 'yatra-one-deva', DEVA, '400'],
            ['EF Yatra', 'yatra-one-latin', LATIN, '400'],
            ['EF Noto', 'noto-sans-devanagari-500-deva', DEVA, '500'],
            ['EF Noto', 'noto-sans-devanagari-500-latin', LATIN, '500'],
            ['EF Noto', 'noto-sans-devanagari-700-deva', DEVA, '700'],
            ['EF Noto', 'noto-sans-devanagari-700-latin', LATIN, '700'],
        ];
        fonts = Promise.all(defs.map(async ([family, file, unicodeRange, weight]) => {
            const f = new FontFace(family, `url(${new URL(`../fonts/${file}.woff2`, import.meta.url).href}) format("woff2")`, { unicodeRange, weight });
            document.fonts.add(await f.load());
        }))
            .then(() => undefined)
            .catch(() => undefined);
    }
    return fonts;
}
