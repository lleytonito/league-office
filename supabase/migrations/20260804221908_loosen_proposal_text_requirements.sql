alter table public.proposals
  drop constraint if exists proposals_title_length,
  drop constraint if exists proposals_summary_length;

alter table public.proposals
  add constraint proposals_title_length check (char_length(btrim(title)) between 1 and 140),
  add constraint proposals_summary_length check (char_length(summary) between 0 and 4000);
