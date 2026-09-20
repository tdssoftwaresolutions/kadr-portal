const dataCrypto = require('./crypto')

// Fields on mediator_bank_accounts that are encrypted at rest (P0 financial data).
const BANK_ENCRYPTED_FIELDS = ['account_holder', 'account_number', 'ifsc_code', 'upi_id']

// Encrypt sensitive bank fields before persisting. Returns a shallow copy.
function encryptBankFields (data) {
  const out = { ...data }
  for (const field of BANK_ENCRYPTED_FIELDS) {
    if (out[field] !== undefined && out[field] !== null && out[field] !== '') {
      out[field] = dataCrypto.encrypt(String(out[field]))
    }
  }
  return out
}

// Decrypt sensitive bank fields after reading. Tolerates legacy plaintext rows.
// Rows saved before the account_number/ifsc_code columns were widened (they
// were too short for the encrypted format and got silently truncated by
// MySQL) can never authenticate again. Rather than 500ing, the corrupted
// field comes back null and is listed in `corruptedFields`, so callers can
// tell "never filled in" apart from "corrupted, needs re-entry" and prompt
// the mediator to re-save instead of silently showing it as blank.
function decryptBankAccount (row) {
  if (!row) return row
  const out = { ...row }
  const corruptedFields = []
  for (const field of BANK_ENCRYPTED_FIELDS) {
    if (out[field] !== undefined && out[field] !== null) {
      try {
        out[field] = dataCrypto.decrypt(out[field])
      } catch (error) {
        console.error(`[bankAccountCrypto] Failed to decrypt ${field} on mediator_bank_accounts ${row.id}:`, error.message)
        out[field] = null
        corruptedFields.push(field)
      }
    }
  }
  if (corruptedFields.length) out.corruptedFields = corruptedFields
  return out
}

module.exports = { BANK_ENCRYPTED_FIELDS, encryptBankFields, decryptBankAccount }
