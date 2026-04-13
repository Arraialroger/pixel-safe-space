-- Remove duplicates, keeping the earliest record per (payment_id, provider, processing_result='success')
DELETE FROM public.payment_events
WHERE processing_result = 'success'
  AND id NOT IN (
    SELECT DISTINCT ON (payment_id, provider) id
    FROM public.payment_events
    WHERE processing_result = 'success'
    ORDER BY payment_id, provider, processed_at ASC
  );

-- Now create the unique index
CREATE UNIQUE INDEX idx_payment_events_idempotent 
ON public.payment_events (payment_id, provider, processing_result) 
WHERE processing_result = 'success';