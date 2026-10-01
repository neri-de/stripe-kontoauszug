# Stripe-Kontoauszug

Self-hosted German monthly Stripe clearing-account statement. Node.js, small frontend, PDF export, and SMTP delivery. Intended public repository: neri-de/stripe-kontoauszug. MIT.

## Start

Node.js 22+. Run npm install, copy .env.example to .env, then npm start. Open http://localhost:3100. Without a Stripe key the app uses explicitly labelled demo data. For live data configure a restricted read-only Stripe key with access to balance transactions, charges, invoices, invoice payments and payouts. Login username is buchhaltung; set APP_PASSWORD. Secrets and reports must never be committed. For remote access use an authenticated HTTPS reverse proxy; the app listens on loopback.

## Accounting basis

Separate tables for invoices finalized in the month and Stripe balance activity booked in the month, Europe/Berlin. Original invoice VAT is read from Stripe, never inferred from a card payment. Invoice totals are shown once per invoice, independent of partial payments. Each currency is separate. The clearing account uses Soll for increases and Haben for decreases. Opening balance + sum(amount - fee) = closing balance. Processing fees are counted once. Payouts are Stripe balance debits, with status and expected arrival date; actual bank receipt is not confirmed without bank data. Refunds, disputes and adjustments remain visible as balance transactions; credit-note tax allocation is not yet implemented. A fee invoice is supporting evidence, not another cash deduction. Multi-invoice payment matches are retained in JSON and need a richer presentation. Manual payouts cannot be assigned reliably to individual payments.

## Stripe fee invoices and monthly email

Public API retrieval of Stripe-issued monthly fee tax invoices has not been verified. Import the downloaded fee PDF(s) into data/YYYY-MM/ and create documents.json as an array, for example:

[{"file":"stripe-fees.pdf","name":"Stripe Gebührenrechnung","number":"STRIPE-001","total":204,"currency":"eur"}]

Amounts are integer minor units. This initial version requires manual document import and confirmation that the list includes all required fee invoices. It does not validate fee-invoice tax or coverage automatically. Run npm run monthly -- YYYY-MM. With no month it targets the previous Berlin month. Missing documents defer sending (exit 2). Use an OS scheduler to run daily near the beginning of the month (e.g. days 1–15 at 09:00 Europe/Berlin). This is a deployment instruction, not an installed scheduled task. sent.json prevents subsequent delivery after success; an unresolved sending.json blocks retry after uncertain SMTP delivery and requires operator review. No emails are sent by the frontend.

SMTP: configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM and MAIL_TO. PDFs and imported fee invoices are attached. If recovery is necessary, check actual mail delivery before removing sending.json. Never blindly retry an uncertain send.

## Validation and limitations

npm test checks balance arithmetic, month boundaries, currencies and year rollover. Live Stripe integration and SMTP delivery require user configuration and have not been verified. Full transaction and invoice history is paginated to calculate historical balances accurately; large accounts should add incremental local synchronization. Payout-to-charge drilldown, document upload UI, credit notes, richer error handling and automated deployment are follow-up work. This is an initial prototype for review with your Buchhalterin, not a complete accounting ledger.

Sources: https://docs.stripe.com/api/balance_transactions/list, https://docs.stripe.com/api/invoice-payment/list, https://docs.stripe.com/api/invoices/object, https://support.stripe.com/questions/tax-invoices, https://support.stripe.com/questions/payout-reporting-options.
