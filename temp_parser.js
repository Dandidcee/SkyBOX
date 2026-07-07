const item = $input.first().json;

let raw = item.output ?? item.text ?? item;
let parsed;

try {
  if (typeof raw === 'string') {
    let clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    
    // Cari dan ambil hanya bagian JSON (dari '{' pertama sampai '}' terakhir)
    // Ini mengabaikan teks basa-basi dari AI sebelum/sesudah JSON
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }
    
    parsed = JSON.parse(clean);
  } else if (typeof raw === 'object' && raw !== null) {
    parsed = raw;
  } else {
    throw new Error('Output AI bukan string atau objek');
  }
} catch (e) {
  return [{
    json: {
      reply: (typeof raw === 'string' ? raw : '') || 'Maaf, ada kendala. Tim kami akan segera membantu.',
      intent: 'complaint',
      confidence: 30,
      items: null,
      amount: null,
      address: null,
      note: null,
      paymentMethod: null,
      images: [],
    }
  }];
}

// Paksa confidence jadi angka 0-100
let conf = Number(parsed.confidence);
if (!Number.isFinite(conf) || conf < 0 || conf > 100) conf = 50;

// Validasi intent
const validIntents = ['none', 'lead', 'waiting_payment', 'closing', 'complaint'];
const finalIntent = validIntents.includes(parsed.intent) ? parsed.intent : 'none';

// Bersihkan link & data:URI dari reply
let safeReply = String(parsed.reply || '').trim();
safeReply = safeReply
  .replace(/https?:\/\/\S+/g, '')   // hapus http/https
  .replace(/data:image\/\S+/g, '')  // hapus data URI
  .replace(/\\n/g, '\n')            // parse literal \n → newline asli
  .replace(/[^\S\n]{2,}/g, ' ')     // rapikan spasi dobel, jangan sentuh \n
  .trim();

// Validasi images: array {url, caption}. Terima array objek, array string, atau imageUrl tunggal (kompat).
let images = [];
if (Array.isArray(parsed.images)) {
  images = parsed.images.map(it => {
    if (typeof it === 'string') return { url: it.trim(), caption: '' };
    return { url: String(it?.url || '').trim(), caption: String(it?.caption || '').trim() };
  });
} else if (parsed.imageUrl) {
  images = [{ url: String(parsed.imageUrl).trim(), caption: '' }];
}
// Sisakan hanya url valid http/https
images = images.filter(it => /^https?:\/\//i.test(it.url));

// Validasi paymentMethod
const validPay = ['cod', 'tf'];
const paymentMethod = validPay.includes(String(parsed.paymentMethod || '').toLowerCase())
  ? String(parsed.paymentMethod).toLowerCase()
  : null;

// Validasi amount
const amount = parsed.amount != null && Number.isFinite(Number(parsed.amount))
  ? Number(parsed.amount)
  : null;

return [{
  json: {
    reply: safeReply || 'Maaf, ada kendala. Tim kami akan segera membantu.',
    intent: finalIntent,
    confidence: conf,
    items: parsed.items || null,
    amount,
    address: parsed.address || null,
    note: parsed.note || null,
    paymentMethod,
    images,
  }
}];
