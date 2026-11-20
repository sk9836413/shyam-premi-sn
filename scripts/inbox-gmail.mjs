// Gmail API client of the darshan inbox (scripts/inbox.mjs): read the owner's mails, download attachments, label them,
// reply with a receipt. OAuth secrets (GitHub Actions): INBOX_GMAIL_CLIENT_ID, INBOX_GMAIL_CLIENT_SECRET,
// INBOX_GMAIL_REFRESH_TOKEN (scopes gmail.send + gmail.modify). On the owner's PC, INBOX_GMAIL_ENV=<file> points at a
// KEY=value file with the same three values (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN also accepted).
// Nothing here prints a secret or a mail address.
import fs from 'node:fs';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
let token = null;

function loadEnvFile() {
  const file = process.env.INBOX_GMAIL_ENV;
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(?:INBOX_)?(GMAIL_(?:CLIENT_ID|CLIENT_SECRET|REFRESH_TOKEN))=(.+)$/);
    if (m && !process.env[`INBOX_${m[1]}`]) process.env[`INBOX_${m[1]}`] = m[2].trim();
  }
}

export const hasCredentials = () => {
  loadEnvFile();
  return Boolean(process.env.INBOX_GMAIL_CLIENT_ID && process.env.INBOX_GMAIL_CLIENT_SECRET && process.env.INBOX_GMAIL_REFRESH_TOKEN);
};

async function accessToken() {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  if (!hasCredentials()) throw new Error('inbox Gmail secrets missing (INBOX_GMAIL_CLIENT_ID, INBOX_GMAIL_CLIENT_SECRET, INBOX_GMAIL_REFRESH_TOKEN)');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.INBOX_GMAIL_CLIENT_ID, client_secret: process.env.INBOX_GMAIL_CLIENT_SECRET, refresh_token: process.env.INBOX_GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`inbox Gmail token refresh failed: ${j.error || r.status}`);
  token = { value: j.access_token, exp: Date.now() + (j.expires_in || 3000) * 1000 };
  return token.value;
}

async function api(method, p, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${API}${p}`, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 2000 * (attempt + 1))); continue; }
    const j = r.status === 204 ? {} : await r.json();
    if (!r.ok) throw new Error(`Gmail ${method} ${p.split('?')[0]}: ${r.status} ${j.error?.message || ''}`.trim());
    return j;
  }
  throw new Error(`Gmail ${method} ${p.split('?')[0]}: gave up after retries`);
}

export const profile = () => api('GET', '/profile');

export async function listMessages(q, max = 50) {
  const out = [];
  let pageToken = '';
  while (out.length < max) {
    const j = await api('GET', `/messages?q=${encodeURIComponent(q)}&maxResults=${Math.min(100, max)}${pageToken ? `&pageToken=${pageToken}` : ''}`);
    out.push(...(j.messages || []));
    if (!j.nextPageToken) break;
    pageToken = j.nextPageToken;
  }
  return out.slice(0, max);
}

export const getMessage = (id) => api('GET', `/messages/${id}?format=full`);
export const getThread = (id) => api('GET', `/threads/${id}?format=full`);

/** One attachment's bytes (Gmail returns base64url). */
export async function attachment(messageId, attachmentId) {
  const j = await api('GET', `/messages/${messageId}/attachments/${attachmentId}`);
  return Buffer.from(String(j.data || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

const labelCache = new Map();
export async function labelId(name) {
  if (labelCache.has(name)) return labelCache.get(name);
  const { labels = [] } = await api('GET', '/labels');
  let id = labels.find((l) => l.name === name)?.id;
  if (!id) id = (await api('POST', '/labels', { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' })).id;
  labelCache.set(name, id);
  return id;
}

export async function addLabel(messageId, name) {
  await api('POST', `/messages/${messageId}/modify`, { addLabelIds: [await labelId(name)], removeLabelIds: [] });
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encodeWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);

/** A plain-text reply in the mail's thread. X-Shyam-Inbox marks it so the inbox never reads its own receipts. */
export async function reply({ to, subject, text, threadId, inReplyTo, fromName = 'Shyam Premi SN inbox' }) {
  if (!/^[^\s@<>,]+@[^\s@<>,]+$/.test(to)) throw new Error('bad recipient');
  const headers = [
    `From: ${encodeWord(fromName)} <${(await profile()).emailAddress}>`,
    `To: ${to}`,
    `Subject: ${encodeWord(subject.replace(/[\r\n]+/g, ' '))}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'X-Shyam-Inbox: receipt',
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`);
  const body = Buffer.from(text.replace(/\r?\n/g, '\r\n')).toString('base64').replace(/(.{76})/g, '$1\r\n');
  const sent = await api('POST', '/messages/send', { raw: b64url(`${headers.join('\r\n')}\r\n\r\n${body}`), ...(threadId ? { threadId } : {}) });
  return { id: sent.id, threadId: sent.threadId };
}
