# Payment gateway configuration

Set **one** active gateway via `PAYMENT_GATEWAY`. All three adapters are built in — switch by changing env only.

```bash
# Active gateway: payu | cashfree | phonepe
PAYMENT_GATEWAY=payu

BASE_URL=https://api.kadr.live          # API server (webhooks & PayU return)
PORTAL_APP_URL=https://kadr.live/admin  # Vue app base (redirect after payment)
```

## PayU (test)

```bash
PAYMENT_GATEWAY=payu
PAYU_ENV=test
PAYU_MERCHANT_KEY=your_test_key
PAYU_MERCHANT_SALT=your_test_salt
```

Sandbox: https://test.payu.in — use PayU test card/UPI credentials from their dashboard.

## Cashfree (sandbox)

```bash
PAYMENT_GATEWAY=cashfree
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=your_sandbox_client_id
CASHFREE_CLIENT_SECRET=your_sandbox_client_secret
```

Docs: https://docs.cashfree.com/docs/payments-online

## PhonePe (sandbox)

```bash
PAYMENT_GATEWAY=phonepe
PHONEPE_ENV=sandbox
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
```

Sandbox: https://developer.phonepe.com — use UAT credentials.

## Payment flows

| Purpose | Who | Amount (INR) |
|---------|-----|--------------|
| `CLIENT_NOTICE` | Client (initiating party) | 1,000 |
| `CLIENT_MEDIATION` | Client (initiating party) | 5,000 |
| `MEDIATOR_PRO` | Mediator | Admin setting `premium_pro_monthly_price_inr` |

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/payment/config` | No | Active gateway name |
| GET | `/api/payment/amounts` | No | Fixed fee amounts |
| POST | `/api/payment/initiate` | Yes | Create order + checkout payload |
| POST | `/api/payment/verify` | Yes | Verify after redirect |
| POST/GET | `/api/payment/return/payu` | No | PayU success/failure URL |
| POST | `/api/payment/webhook/cashfree` | No | Cashfree webhook |
| POST | `/api/payment/webhook/phonepe` | No | PhonePe webhook |

## Database

Run after pulling:

```bash
npx prisma db push
npx prisma generate
```

Creates `payment_orders` and `scheduler_locks` tables.

## Testing locally

1. Copy credentials into `.env`
2. Set `PAYMENT_GATEWAY=payu` (or cashfree / phonepe)
3. `npm run serve`
4. Client case → Pay notice/mediation fee, or Mediator profile → Upgrade to Pro
5. Complete payment on gateway sandbox
6. Return URL: `/admin/app/payment/return?order_id=KADR-...`

## Legacy fake payments

`ALLOW_FAKE_PAYMENTS=1` only enables old direct `setClientPayment` bypass (non-production). **Do not use in production.**
