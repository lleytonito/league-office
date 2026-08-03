-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

GRANT ALL ON FUNCTION app_private.handle_new_auth_user() TO authenticated;

GRANT ALL ON FUNCTION app_private.record_vote_history() TO authenticated;

GRANT ALL ON FUNCTION app_private.touch_updated_at() TO authenticated;
