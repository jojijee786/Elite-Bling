import { landingChecksum } from './checksum.js'

/**
 * Sanitises the item string.
 * Strips everything except A-Za-z0-9 and space, collapses spaces, trims, max 500 chars.
 * Reference: docs/implementation.prd.md §4.3 & §8.2 step 5.
 */
export function sanitiseItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'string') return 'Item_Order'
  const cleaned = rawItem.replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return (cleaned || 'Item_Order').slice(0, 500)
}

/**
 * Normalises Pakistani MSISDN to 03xxxxxxxxx format.
 * Accepts +92345..., 92345..., 0345..., 345...
 * Reference: docs/implementation.prd.md §4.3, §8.2 & §13.1
 */
export function normaliseMsisdn(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null
  const digits = rawPhone.replace(/\D/g, '')

  // 923xxxxxxxxx (12 digits)
  if (digits.startsWith('923') && digits.length === 12) {
    return `0${digits.slice(2)}`
  }
  // 03xxxxxxxxx (11 digits)
  if (digits.startsWith('03') && digits.length === 11) {
    return digits
  }
  // 3xxxxxxxxx (10 digits)
  if (digits.startsWith('3') && digits.length === 10) {
    return `0${digits}`
  }

  return null
}

/**
 * Builds the Swich Hosted Landing Page GET URL.
 * Reference: docs/implementation.prd.md §4.3 & §8.3
 *
 * @param {object} config - Swich configuration
 * @param {object} params - { customerTransactionId, orderNumber, amount, payeeName, email, phone, publicPaymentRef }
 * @returns {string} Fully formed redirect URL
 */
export function buildLandingGetUrl(config, {https://payin-pwa.swichnow.com/
  customerTransactionId,202610237080001
  orderNumber,
  amount,10000
  payeeName,zoraz yousaf
  email,jacknick476@gmail.com
  phone,03290987690
  publicPaymentRef,
  billReferenceNo: customBillRef,
}) {
  if (!config.clientId) throw new Error('clientId is required')
  if (!customerTransactionId) throw new Error('customerTransactionId is required')

  const cleanOrderNumber = String(orderNumber).replace(/[^A-Za-z0-9]/g, '')
  const numericOnly = cleanOrderNumber.replace(/\D/g, '')

  // 1Bill (OneBill) requires strictly numeric consumer numbers after 'PK'
  let billReferenceNo = customBillRef
  if (!billReferenceNo) {
    if (numericOnly.length >= 4) {
      billReferenceNo = `PK${numericOnly}`
    } else {
      const now = new Date()
      const pad = (n, len = 2) => String(n).padStart(len, '0')
      const ts = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
      const rand4 = pad(Math.floor(Math.random() * 10000), 4)
      billReferenceNo = `PK${ts}${rand4}`
    }
  }

  const itemSuffix = numericOnly.slice(0, 10) || cleanOrderNumber.slice(0, 10) || '9245'
  const item = `Item_${itemSuffix}`
  const description = `Payment_${itemSuffix}`
  const sanitizedPayee = (payeeName || 'Customer').replace(/[^A-Za-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 50)

  // In Swich's live format: integer amounts are sent without decimals (e.g. 2, 2600), decimals if fractional
  const numAmount = Number(amount)
  const amountStr = numAmount % 1 === 0 ? String(Math.round(numAmount)) : numAmount.toFixed(2)

  const normalisedPhone = normaliseMsisdn(phone)
  if (!normalisedPhone) {
    throw new Error('Valid Pakistani mobile number (03xxxxxxxxx) is required')
  }

  // Compute checksum using raw un-encoded values
  const checksum = landingChecksum(config.secretKey, customerTransactionId, item, amountStr)

  // Construct query string matching Swich official spec & live sample
  const params = new URLSearchParams()

  // 1. Core specification parameters (from Swich official documentation)
  params.set('clientid', config.clientId)
  params.set('customertransactionid', customerTransactionId)
  params.set('item', item)
  params.set('amount', amountStr)
  params.set('channel', '0')
  params.set('checksum', checksum)

  // 2. Compatibility aliases for sample URL parameter casing
  params.set('clientId', config.clientId)
  params.set('customerTransactionId', customerTransactionId)

  // 3. Extended metadata parameters
  params.set('billReferenceNo', billReferenceNo)
  params.set('description', description)
  params.set('PayeeName', sanitizedPayee)
  params.set('Email', email || '')
  params.set('MSISDN', normalisedPhone)
  params.set('currency', 'PKR')

  if (publicPaymentRef && config.siteUrl) {
    const successRedirectUrl = `${config.siteUrl}/checkout/payment-return?ref=${encodeURIComponent(publicPaymentRef)}`
    params.set('successRedirectUrl', successRedirectUrl)
  }

  if (config.transactionType) {
    params.set('transactionType', config.transactionType)
  }

  const base = config.pwaGetUrl.replace(/\/$/, '')
  return `${base}?${params.toString()}`
}

/**
 * Builds the Swich Hosted Landing Page POST Form (AES mode).
 * Reference: docs/implementation.prd.md §4.4
 *
 * TODO(VERIFY): AES mode, key/IV encoding, padding, output encoding not confirmed by Swich yet.
 */
export function buildLandingPostForm(config, params) {
  if (config.landingMode !== 'post') {
    throw new Error('POST mode is not active')
  }
  // TODO(VERIFY): Implement AES token encryption once Swich provides specific cipher specifications
  throw new Error('Swich POST mode AES encryption requires confirmed parameters from Swich (§16 item 4)')
}
