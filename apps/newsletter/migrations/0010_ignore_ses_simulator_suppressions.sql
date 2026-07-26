WITH simulator_addresses(email) AS (
  VALUES
    ('success@simulator.amazonses.com'),
    ('bounce@simulator.amazonses.com'),
    ('complaint@simulator.amazonses.com'),
    ('ooto@simulator.amazonses.com'),
    ('suppressionlist@simulator.amazonses.com')
)
UPDATE suppressions
SET active = false,
    metadata = metadata || jsonb_build_object(
      'deactivatedReason', 'ses-simulator-address',
      'deactivatedAt', now()
    ),
    updated_at = now()
WHERE active = true
  AND (
    email IN (SELECT email FROM simulator_addresses)
    OR domain = 'simulator.amazonses.com'
  );

WITH simulator_addresses(email) AS (
  VALUES
    ('success@simulator.amazonses.com'),
    ('bounce@simulator.amazonses.com'),
    ('complaint@simulator.amazonses.com'),
    ('ooto@simulator.amazonses.com'),
    ('suppressionlist@simulator.amazonses.com')
)
UPDATE contacts
SET status = 'unsubscribed',
    suppressed_at = null,
    unsubscribed_at = coalesce(unsubscribed_at, now()),
    attributes = attributes || jsonb_build_object(
      'simulatorAddress', true,
      'simulatorProvider', 'ses'
    ),
    updated_at = now()
WHERE email IN (SELECT email FROM simulator_addresses)
  AND status = 'suppressed';
