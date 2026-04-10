

# Fix: custom_contract_text not loaded in ContratoDetalhe

## Root Cause

In `src/pages/ContratoDetalhe.tsx` line 76, the Supabase SELECT query lists every column explicitly but **omits `custom_contract_text`**:

```
.select("id, status, execution_status, content_deliverables, ... contract_template, clients(...)")
```

This means:
1. On page load, `customContractText` is always set to `""` (the fallback on line 106)
2. When the user saves, the empty string overwrites the real data in the database
3. When `ContratoPublico.tsx` renders, the text is gone — only the Golden Rule clause appears

`ContratoPublico.tsx` already fetches this column correctly (line 190). The renderer (`ContratoDocumento.tsx`) is also correct.

## Fix

### `src/pages/ContratoDetalhe.tsx` — Line 76

Add `custom_contract_text` to the SELECT string:

```
.select("id, status, execution_status, content_deliverables, content_exclusions, content_revisions, payment_value, payment_link, deadline, payment_terms, down_payment, signed_by_name, signed_by_email, signed_at, final_deliverable_url, is_fully_paid, contract_template, custom_contract_text, clients(name, phone, document, company, address)")
```

That's it — a single comma-separated field addition. No other files need changes.

## Files

| File | Change |
|------|--------|
| `src/pages/ContratoDetalhe.tsx` | Add `custom_contract_text` to the SELECT query on line 76 |

