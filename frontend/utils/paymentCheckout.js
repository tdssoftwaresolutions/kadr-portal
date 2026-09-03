/**
 * Client-side payment checkout helpers for PayU, Cashfree, and PhonePe.
 */

function submitPayuForm (checkout) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = checkout.action
  form.style.display = 'none'
  Object.entries(checkout.fields || {}).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = value
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}

function loadScript (src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function launchCashfreeCheckout (checkout) {
  await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js')
  const mode = checkout.cashfreeEnv === 'production' ? 'production' : 'sandbox'
  const cashfree = window.Cashfree({ mode })
  await cashfree.checkout({
    paymentSessionId: checkout.paymentSessionId,
    redirectTarget: '_self'
  })
}

function launchRedirectCheckout (checkout) {
  if (!checkout.redirectUrl) {
    throw new Error('Payment redirect URL missing')
  }
  window.location.href = checkout.redirectUrl
}

export async function launchPaymentCheckout (checkout) {
  if (!checkout || !checkout.mode) {
    throw new Error('Invalid checkout payload')
  }
  switch (checkout.mode) {
    case 'form':
      submitPayuForm(checkout)
      break
    case 'cashfree_session':
      await launchCashfreeCheckout(checkout)
      break
    case 'redirect':
      launchRedirectCheckout(checkout)
      break
    default:
      throw new Error(`Unsupported checkout mode: ${checkout.mode}`)
  }
}

export function gatewayDisplayName (gateway) {
  const names = { payu: 'PayU', cashfree: 'Cashfree', phonepe: 'PhonePe' }
  return names[gateway] || gateway
}
