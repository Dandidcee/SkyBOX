const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('--- Starting Migration ---');

    // 1. Add contact_id to conversations if it doesn't exist
    console.log('1. Adding contact_id column to conversations...');
    await client.query(`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE;
    `);

    // 2. Normalize existing contacts
    console.log('2. Normalizing phones in contacts...');
    const contacts = await client.query('SELECT id, phone FROM contacts');
    for (const c of contacts.rows) {
      const norm = normalizePhone(c.phone);
      if (norm !== c.phone) {
        // Handle unique constraint conflict during normalization
        try {
          await client.query('UPDATE contacts SET phone = $1 WHERE id = $2', [norm, c.id]);
        } catch (e) {
          if (e.code === '23505') { // Unique violation
            // A normalized contact already exists, this is a duplicate contact
            console.log(`Duplicate contact found after normalization: ${norm}. Deleting old contact ${c.id}`);
            await client.query('DELETE FROM contacts WHERE id = $1', [c.id]);
          } else {
            throw e;
          }
        }
      }
    }

    // 3. Normalize existing conversations and link to contacts
    console.log('3. Normalizing phones in conversations and linking to contacts...');
    const convs = await client.query('SELECT id, account_id, customer_phone, customer_name FROM conversations');
    for (const c of convs.rows) {
      const norm = normalizePhone(c.customer_phone);
      
      // Update normalized phone
      await client.query('UPDATE conversations SET customer_phone = $1 WHERE id = $2', [norm, c.id]);

      // Find contact
      let contact = await client.query('SELECT id FROM contacts WHERE account_id = $1 AND phone = $2', [c.account_id, norm]);
      let contactId;

      if (contact.rows.length === 0) {
        // Create contact
        const newContact = await client.query(
          'INSERT INTO contacts (account_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
          [c.account_id, c.customer_name || 'Unknown', norm]
        );
        contactId = newContact.rows[0].id;
      } else {
        contactId = contact.rows[0].id;
      }

      // Set contact_id on conversation
      await client.query('UPDATE conversations SET contact_id = $1 WHERE id = $2', [contactId, c.id]);
    }

    // 4. Merge duplicate conversations
    console.log('4. Merging duplicate conversations...');
    const duplicates = await client.query(`
      SELECT account_id, contact_id, array_agg(id) as conv_ids
      FROM conversations
      WHERE contact_id IS NOT NULL
      GROUP BY account_id, contact_id
      HAVING count(id) > 1
    `);

    for (const dup of duplicates.rows) {
      const convIds = dup.conv_ids;
      // Fetch all to find the primary (the one with most recent last_time or highest unread)
      const details = await client.query(
        'SELECT id, last_time FROM conversations WHERE id = ANY($1::uuid[]) ORDER BY last_time DESC NULLS LAST',
        [convIds]
      );
      
      const primaryId = details.rows[0].id;
      const otherIds = details.rows.slice(1).map(r => r.id);

      console.log(`Merging conversations for contact ${dup.contact_id}. Primary: ${primaryId}, Duplicates: ${otherIds.join(', ')}`);

      // Update foreign keys to point to primaryId
      await client.query('UPDATE messages SET conversation_id = $1 WHERE conversation_id = ANY($2::uuid[])', [primaryId, otherIds]);
      await client.query('UPDATE orders SET conversation_id = $1 WHERE conversation_id = ANY($2::uuid[])', [primaryId, otherIds]);
      await client.query('UPDATE notifications SET conversation_id = $1 WHERE conversation_id = ANY($2::uuid[])', [primaryId, otherIds]);

      // Delete duplicates
      await client.query('DELETE FROM conversations WHERE id = ANY($1::uuid[])', [otherIds]);
    }

    // 5. Add Unique Constraint and Indexes
    console.log('5. Adding unique constraints and indexes...');
    
    // Check if unique constraint exists
    const checkConstraint = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'conversations'::regclass AND contype = 'u'
    `);
    
    const hasUnique = checkConstraint.rows.some(r => r.conname === 'conversations_account_contact_unique');
    
    if (!hasUnique) {
      await client.query('ALTER TABLE conversations ADD CONSTRAINT conversations_account_contact_unique UNIQUE(account_id, contact_id)');
    }

    await client.query('CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');

    await client.query('COMMIT');
    console.log('--- Migration Completed Successfully ---');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration Failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
