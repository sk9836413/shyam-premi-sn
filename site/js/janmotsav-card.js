// Plain ES module (no build step), served as is by GitHub Pages.
// Card designs for the Khatu Shyam Janmotsav greeting card maker (janmotsav/).
// They reuse the Diwali card engine (diwali-card.js) and add a few motifs of their own: the nishan (the saffron
// flag devotees carry to Khatu), a tulsi plant in its pot and sugarcane stalks for Dev Uthani Ekadashi, and roses.
// Everything is drawn in code, so the cards carry no third-party artwork.
//
// Iconography rule (the Shyam channel's rule): Khatu Shyam ji is only ever shown as the Sheesh (head), never with a
// body. These cards do not draw the deity at all; the devotion is in the words and the symbols around them.
import { BRAND_MARK, GOLD, arch, diya, diyaRow, dot, frame, garlandSwag, groundGlow, jaali, leaf, linear, marigold, morPankh, petal, radial, rangoli, stars, } from './diwali-card.js';
/** Corner mark: the brand and its YouTube handle. */
const MARK = BRAND_MARK;
// ---------- motifs ----------
/** Nishan: a saffron flag (`size` wide) on a bamboo pole from (px, py) at the bottom, `len` tall, leaning by `angle`. */
function nishan(x, px, py, len, angle, size, flip = false) {
    const { c, s } = x;
    const dir = flip ? -1 : 1;
    c.save();
    c.translate(px, py);
    c.rotate(angle);
    // pole
    c.strokeStyle = linear(c, -4 * s, 0, 4 * s, 0, ['#c99a4a', '#f1d38c', '#9a6a22']);
    c.lineWidth = 9 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -len);
    c.stroke();
    for (let i = 1; i < 6; i++) {
        c.strokeStyle = 'rgba(90,50,10,0.5)';
        c.lineWidth = 2 * s;
        c.beginPath();
        c.moveTo(-5 * s, -len * (i / 6));
        c.lineTo(5 * s, -len * (i / 6));
        c.stroke();
    }
    // flag: a waving triangle with a gold border
    const top = -len + 10 * s;
    const fw = size * dir;
    const fh = size * 0.62;
    c.beginPath();
    c.moveTo(0, top);
    c.bezierCurveTo(fw * 0.35, top - fh * 0.12, fw * 0.65, top + fh * 0.18, fw, top + fh * 0.38);
    c.bezierCurveTo(fw * 0.62, top + fh * 0.58, fw * 0.3, top + fh * 0.82, 0, top + fh);
    c.closePath();
    c.fillStyle = linear(c, 0, top, fw, top + fh, ['#ff9d1f', '#ff7a00', '#e2540a']);
    c.fill();
    c.strokeStyle = '#ffd36b';
    c.lineWidth = 5 * s;
    c.stroke();
    // a small sun-ray emblem on the flag
    const ex = fw * 0.32;
    const ey = top + fh * 0.42;
    for (let i = 0; i < 12; i++) {
        petal(c, ex, ey, (i * Math.PI) / 6, fh * 0.06, fh * 0.16, fh * 0.03);
        c.fillStyle = '#ffe9a6';
        c.fill();
    }
    dot(c, ex, ey, fh * 0.065, '#ffe9a6');
    dot(c, ex, ey, fh * 0.035, '#e2540a');
    // finial and tassel
    dot(c, 0, -len - 6 * s, 11 * s, '#ffd36b');
    c.strokeStyle = '#c0182f';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(0, top + fh + 4 * s);
    c.quadraticCurveTo(-10 * s * dir, top + fh + 30 * s, -4 * s * dir, top + fh + 52 * s);
    c.stroke();
    dot(c, -4 * s * dir, top + fh + 56 * s, 6 * s, '#ffd36b');
    c.restore();
}
/** Sugarcane stalk from (x0, y0) at the bottom to its leafy top at (x1, y1). */
function sugarcane(x, x0, y0, x1, y1) {
    const { c, s } = x;
    const w = 18 * s;
    const len = Math.hypot(x1 - x0, y1 - y0);
    c.save();
    c.translate(x0, y0);
    c.rotate(Math.atan2(x1 - x0, y0 - y1));
    c.fillStyle = linear(c, -w / 2, 0, w / 2, 0, ['#3f7a2a', '#8cc152', '#2f5f1e']);
    c.fillRect(-w / 2, -len, w, len);
    const nodes = Math.max(4, Math.round(len / (95 * s)));
    for (let i = 1; i < nodes; i++) {
        const y = -(len * i) / nodes;
        c.fillStyle = '#c9b24a';
        c.fillRect(-w / 2 - 2 * s, y - 3 * s, w + 4 * s, 6 * s);
    }
    for (const [a, l] of [[-0.5, 1], [0.45, 0.9], [-1.1, 0.75], [1.05, 0.8], [0, 0.6]]) {
        leaf(x, 0, -len, 120 * s * l, -Math.PI / 2 + a, '#4f9a33');
    }
    c.restore();
}
/** Tulsi plant in a decorated pot (tulsi chaura). (cx, base) is the bottom centre, `h` the total height. */
function tulsi(x, cx, base, h) {
    const { c, s, rnd } = x;
    const potH = h * 0.42;
    const potW = h * 0.42;
    const top = base - potH;
    // plinth
    c.fillStyle = linear(c, cx, base - 14 * s, cx, base + 14 * s, ['#e8b75a', '#a8661c']);
    c.fillRect(cx - potW * 0.68, base - 10 * s, potW * 1.36, 24 * s);
    // pot body, a little wider at the top
    c.beginPath();
    c.moveTo(cx - potW * 0.5, top);
    c.lineTo(cx + potW * 0.5, top);
    c.lineTo(cx + potW * 0.42, base - 10 * s);
    c.lineTo(cx - potW * 0.42, base - 10 * s);
    c.closePath();
    c.fillStyle = linear(c, cx - potW / 2, top, cx + potW / 2, base, ['#d24b1c', '#a3300f', '#7a210a']);
    c.fill();
    // painted front: a flower in a diamond and dotted borders
    c.strokeStyle = '#ffd36b';
    c.lineWidth = 3 * s;
    const my = top + potH * 0.52;
    c.beginPath();
    c.moveTo(cx, my - potH * 0.26);
    c.lineTo(cx + potW * 0.2, my);
    c.lineTo(cx, my + potH * 0.26);
    c.lineTo(cx - potW * 0.2, my);
    c.closePath();
    c.stroke();
    for (let i = 0; i < 8; i++) {
        petal(c, cx, my, (i * Math.PI) / 4, potH * 0.03, potH * 0.14, potH * 0.04);
        c.fillStyle = '#ffe9a6';
        c.fill();
    }
    dot(c, cx, my, potH * 0.035, '#ffd36b');
    for (let i = 0; i < 9; i++) {
        dot(c, cx - potW * 0.4 + (i * potW * 0.8) / 8, top + 14 * s, 4 * s, '#ffe9a6');
        dot(c, cx - potW * 0.36 + (i * potW * 0.72) / 8, base - 24 * s, 4 * s, '#ffe9a6');
    }
    // rim
    c.fillStyle = '#e8b75a';
    c.fillRect(cx - potW * 0.56, top - 12 * s, potW * 1.12, 16 * s);
    // plant: a few stems with leaf pairs and purple manjari spikes
    const plantH = h - potH;
    const stems = [-0.32, -0.14, 0.05, 0.22, 0.36];
    stems.forEach((lean, k) => {
        const len = plantH * (0.7 + rnd() * 0.3);
        const ex = cx + lean * plantH * 0.7;
        const ey = top - 12 * s - len;
        c.strokeStyle = '#3d6b25';
        c.lineWidth = 4 * s;
        c.beginPath();
        c.moveTo(cx + lean * 30 * s, top - 10 * s);
        c.quadraticCurveTo(cx + lean * plantH * 0.2, top - len * 0.5, ex, ey);
        c.stroke();
        for (let i = 1; i <= 5; i++) {
            const t = i / 6;
            const lx = cx + lean * 30 * s + (ex - cx - lean * 30 * s) * t;
            const ly = top - 10 * s - len * t;
            const l = (26 - i * 2) * s;
            leaf(x, lx, ly, l, -Math.PI / 2 - 0.9, '#4e9a2f');
            leaf(x, lx, ly, l, -Math.PI / 2 + 0.9, '#3f8a26');
        }
        for (let i = 0; i < 4; i++)
            dot(c, ex, ey - i * 9 * s, (5 - i) * s, k % 2 ? '#8e4bb5' : '#a35ac6');
    });
}
/** A rose seen from above, `r` across. */
function rose(x, cx, cy, r, colors = ['#ff6b8a', '#d81b4a', '#8e0b2c']) {
    const { c } = x;
    dot(c, cx, cy, r, colors[2]);
    for (const [k, n, col] of [[0.95, 6, colors[1]], [0.7, 5, colors[0]], [0.45, 4, colors[1]]]) {
        for (let i = 0; i < n; i++) {
            const a = (i * Math.PI * 2) / n + k;
            petal(c, cx, cy, a, 0, r * k, r * k * 0.7);
            c.fillStyle = col;
            c.fill();
        }
    }
    c.strokeStyle = 'rgba(80,0,20,0.6)';
    c.lineWidth = Math.max(1, r * 0.06);
    c.beginPath();
    c.arc(cx, cy, r * 0.22, 0.4, Math.PI * 1.8);
    c.stroke();
}
/** Loose rose petals scattered over an area. */
function petals(x, n, x0, y0, x1, y1, size) {
    const { c, rnd } = x;
    for (let i = 0; i < n; i++) {
        const px = x0 + rnd() * (x1 - x0);
        const py = y0 + rnd() * (y1 - y0);
        c.globalAlpha = 0.55 + rnd() * 0.4;
        petal(c, px, py, rnd() * Math.PI * 2, 0, size * (0.7 + rnd() * 0.6), size * 0.45);
        c.fillStyle = rnd() > 0.5 ? '#e8285a' : '#ff5a7e';
        c.fill();
    }
    c.globalAlpha = 1;
}
/** A fan of peacock feathers spreading up from (cx, cy). */
function featherFan(x, cx, cy, len, n, spread) {
    for (let i = 0; i < n; i++) {
        const a = -spread / 2 + (i * spread) / (n - 1);
        morPankh(x, cx, cy, len * (1 - Math.abs(a) * 0.18), a);
    }
}
// ---------- designs ----------
export const JANMOTSAV_DESIGNS = [
    {
        id: 'mor-raat',
        name: 'Peacock feathers and diyas',
        nameHi: 'मोरपंख और दीये',
        shyam: true,
        markText: MARK,
        palette: { title: GOLD, sub: '#cfe8ff', text: '#f3f8ff', name: '#ffd27a', mark: 'rgba(225,240,255,0.78)', shadow: 'rgba(0,10,40,0.7)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#050f33', '#0a2766', '#0d4470']);
            c.fillRect(0, 0, W, H);
            c.fillStyle = radial(c, W / 2, H * 0.45, 0, W * 0.75, ['rgba(80,170,255,0.2)', 'rgba(80,170,255,0)']);
            c.fillRect(0, 0, W, H);
            stars(x, story ? 80 : 45, H * 0.75);
            const fanY = (story ? 360 : 200) * s;
            featherFan(x, W / 2, fanY, (story ? 330 : 190) * s, 7, 2.2);
            dot(c, W / 2, fanY, 16 * s, '#ffd36b');
            const y = H - (story ? 210 : 130) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,170,70,0.42)');
            diyaRow(x, y, 5, (story ? 140 : 105) * s);
            return { top: fanY + (story ? 70 : 40) * s, bottom: y - (story ? 120 : 75) * s };
        },
    },
    {
        id: 'nishan',
        name: 'Nishan flags',
        nameHi: 'निशान',
        shyam: true,
        markText: MARK,
        palette: {
            title: ['#fffef5', '#fff0b8', '#ffd96b'],
            sub: '#ffe6c7',
            text: '#fff8ee',
            name: '#ffe08a',
            mark: 'rgba(255,240,225,0.85)',
            shadow: 'rgba(60,8,0,0.75)',
            panel: 'rgba(80,16,4,0.38)',
            markBg: 'rgba(70,12,4,0.55)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#c2410c', '#9a1f0f', '#5b0b12']);
            c.fillRect(0, 0, W, H);
            c.fillStyle = radial(c, W / 2, H * 0.08, 0, W * 0.9, ['rgba(255,214,120,0.45)', 'rgba(255,214,120,0)']);
            c.fillRect(0, 0, W, H);
            const r = (story ? 22 : 18) * s;
            garlandSwag(x, -20 * s, W / 2, 26 * s, (story ? 60 : 40) * s, r);
            garlandSwag(x, W / 2, W + 20 * s, 26 * s, (story ? 60 : 40) * s, r);
            const flagTop = (story ? 210 : 130) * s;
            const size = (story ? 230 : 170) * s;
            nishan(x, 72 * s, H - 30 * s, H - 30 * s - flagTop, 0.015, size);
            nishan(x, W - 72 * s, H - 30 * s, H - 30 * s - flagTop, -0.015, size, true);
            const y = H - (story ? 200 : 125) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,190,90,0.4)');
            diyaRow(x, y, 3, (story ? 140 : 105) * s, 0.42);
            return { top: flagTop + size * 0.62 + (story ? 90 : 50) * s, bottom: y - (story ? 115 : 75) * s };
        },
    },
    {
        id: 'darbar',
        name: 'Marigold darbar',
        nameHi: 'फूलों का दरबार',
        shyam: true,
        markText: MARK,
        palette: {
            title: ['#fffef5', '#fff0b8', '#ffd96b'],
            sub: '#ffe3c2',
            text: '#fff8ee',
            name: '#ffe08a',
            mark: 'rgba(255,240,225,0.82)',
            shadow: 'rgba(60,0,10,0.75)',
            panel: 'rgba(70,6,20,0.35)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#8f0f2a', '#b5301a', '#6a0a1e']);
            c.fillRect(0, 0, W, H);
            jaali(x, 'rgba(255,215,120,0.06)');
            const r = (story ? 24 : 20) * s;
            for (const [y0, sag] of [[30, story ? 70 : 45], [story ? 120 : 80, story ? 50 : 30]]) {
                garlandSwag(x, -20 * s, W / 3, y0 * s, sag * s, r * 0.9);
                garlandSwag(x, W / 3, (W * 2) / 3, y0 * s, sag * s, r * 0.9);
                garlandSwag(x, (W * 2) / 3, W + 20 * s, y0 * s, sag * s, r * 0.9);
            }
            for (const gx of [0.03, 0.97]) {
                for (let k = 0; k < (story ? 14 : 7); k++)
                    marigold(x, W * gx, (90 + k * 46) * s, r, k % 2 ? '#ffd23a' : '#ff8a12', k % 2 ? '#f0a400' : '#e0560a');
            }
            const fy = (story ? 390 : 250) * s;
            morPankh(x, W / 2, fy, (story ? 200 : 120) * s, 0);
            rose(x, W / 2 - 60 * s, fy + 6 * s, 26 * s);
            rose(x, W / 2 + 60 * s, fy + 6 * s, 26 * s);
            rose(x, W / 2, fy + 18 * s, 30 * s);
            const y = H - (story ? 200 : 125) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,190,90,0.35)');
            diyaRow(x, y, 5, (story ? 125 : 95) * s, 0.62);
            for (let i = 0; i < 24; i++)
                dot(c, (W * (i + 0.5)) / 24, H - 66 * s, 6 * s, i % 2 ? '#ffd23a' : '#ff8a12');
            return { top: fy + (story ? 70 : 45) * s, bottom: y - (story ? 115 : 75) * s };
        },
    },
    {
        id: 'tulsi',
        name: 'Dev Uthani: tulsi and sugarcane',
        nameHi: 'देवउठनी: तुलसी और गन्ना',
        shyam: true,
        markText: MARK,
        palette: { title: GOLD, sub: '#e4f5d0', text: '#f6fff0', name: '#ffd27a', mark: 'rgba(235,255,225,0.8)', shadow: 'rgba(0,25,10,0.75)', panel: 'rgba(5,40,20,0.35)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = linear(c, 0, 0, 0, H, ['#062a22', '#0b4a3a', '#123c1f']);
            c.fillRect(0, 0, W, H);
            stars(x, story ? 70 : 40, H * 0.55);
            // The Dev Uthani mandap: sugarcane stalks from the floor, tied together above the tulsi.
            const base = H - (story ? 120 : 60) * s;
            const th = (story ? 400 : 230) * s;
            const apex = base - th - (story ? 90 : 50) * s;
            const spread = (story ? 330 : 300) * s;
            groundGlow(x, base, 'rgba(255,200,90,0.35)');
            for (const dx of [-1, -0.7, 0.7, 1])
                sugarcane(x, W / 2 + dx * spread, H + 10 * s, W / 2 + dx * 14 * s, apex);
            dot(c, W / 2, apex + 30 * s, 12 * s, '#c0182f');
            tulsi(x, W / 2, base, th);
            diya(x, W / 2 - (story ? 165 : 150) * s, base - 20 * s, (story ? 90 : 70) * s);
            diya(x, W / 2 + (story ? 165 : 150) * s, base - 20 * s, (story ? 90 : 70) * s);
            return { top: (story ? 170 : 70) * s, bottom: apex - (story ? 150 : 110) * s };
        },
    },
    {
        id: 'gulab',
        name: 'Roses and gold',
        nameHi: 'गुलाब और सुनहरा',
        shyam: true,
        markText: MARK,
        palette: {
            title: GOLD,
            sub: '#ffd9e2',
            text: '#fff3f6',
            name: '#ffd27a',
            mark: 'rgba(255,235,240,0.8)',
            shadow: 'rgba(40,0,15,0.75)',
            panel: 'rgba(50,4,20,0.4)',
        },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = radial(c, W / 2, H * 0.42, 0, Math.max(W, H) * 0.8, ['#7a1036', '#4d0a24', '#260412']);
            c.fillRect(0, 0, W, H);
            petals(x, story ? 70 : 40, 0, 0, W, H, 26 * s);
            frame(x, '#d9a83a');
            const R = (story ? 40 : 34) * s;
            for (const [px, py] of [[110, 110], [W / s - 110, 110], [110, H / s - 110], [W / s - 110, H / s - 110]]) {
                rose(x, px * s, py * s, R * 1.3);
                rose(x, px * s + R * 1.6, py * s + (py < H / s / 2 ? R * 0.5 : -R * 0.5), R);
                rose(x, px * s + (px < W / s / 2 ? R * 0.4 : -R * 0.4), py * s + (py < H / s / 2 ? R * 1.6 : -R * 1.6), R);
            }
            const y = H - (story ? 230 : 150) * s;
            groundGlow(x, y + 40 * s, 'rgba(255,170,90,0.38)');
            diyaRow(x, y, 3, (story ? 130 : 100) * s, 0.36);
            return { top: (story ? 260 : 170) * s, bottom: y - (story ? 110 : 75) * s };
        },
    },
    {
        id: 'neela-sunehra',
        name: 'Blue and gold',
        nameHi: 'नीला-सुनहरा',
        shyam: true,
        markText: MARK,
        palette: { title: GOLD, sub: '#f3dca4', text: '#fff6e0', name: '#ffd27a', mark: 'rgba(255,235,200,0.78)', shadow: 'rgba(0,0,30,0.65)' },
        paint(x) {
            const { c, W, H, s, story } = x;
            c.fillStyle = radial(c, W / 2, H * 0.4, 0, Math.max(W, H) * 0.8, ['#1d3f9a', '#10265e', '#070f30']);
            c.fillRect(0, 0, W, H);
            rangoli(x, W / 2, H / 2, W * 0.6, ['#1d4fb8', '#d9a83a', '#13307a', '#ffd36b', '#2a62d0'], 0.18);
            jaali(x, 'rgba(255,209,92,0.05)');
            frame(x, '#d9a83a');
            const y = H - (story ? 210 : 130) * s;
            arch(x, (story ? 200 : 110) * s, y + 70 * s, (story ? 110 : 140) * s, '#d9a83a');
            const fy = (story ? 310 : 180) * s;
            featherFan(x, W / 2, fy, (story ? 170 : 110) * s, 3, 0.9);
            dot(c, W / 2, fy, 14 * s, '#ffd36b');
            groundGlow(x, y + 40 * s, 'rgba(255,170,70,0.4)');
            diya(x, W / 2 - 230 * s, y + 20 * s, (story ? 110 : 90) * s);
            diya(x, W / 2, y, (story ? 160 : 125) * s);
            diya(x, W / 2 + 230 * s, y + 20 * s, (story ? 110 : 90) * s);
            return { top: fy + (story ? 60 : 35) * s, bottom: y - (story ? 110 : 75) * s };
        },
    },
];
