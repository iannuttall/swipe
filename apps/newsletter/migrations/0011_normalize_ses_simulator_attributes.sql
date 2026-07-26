WITH simulator_addresses(email) AS (
  VALUES
    ('success@simulator.amazonses.com'),
    ('bounce@simulator.amazonses.com'),
    ('complaint@simulator.amazonses.com'),
    ('ooto@simulator.amazonses.com'),
    ('suppressionlist@simulator.amazonses.com')
)
UPDATE contacts
SET attributes = (
      CASE
        WHEN jsonb_typeof(attributes) = 'object' THEN attributes
        ELSE '{}'::jsonb
      END
    ) || jsonb_build_object(
      'simulatorAddress', true,
      'simulatorProvider', 'ses'
    ),
    updated_at = now()
WHERE email IN (SELECT email FROM simulator_addresses);
