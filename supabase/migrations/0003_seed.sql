-- gonatter — seed data (idempotent). Interest taxonomy + crisis resources (§8.4).

insert into interests (id, label, sort_order) values
  ('just-listening',     'Just need a listener', 1),
  ('music',              'Music',                10),
  ('books',              'Books & reading',      20),
  ('films-tv',           'Films & TV',           30),
  ('sport',              'Sport',                40),
  ('gardening',          'Gardening',            50),
  ('cooking',            'Cooking & food',       60),
  ('travel',             'Travel',               70),
  ('history',            'History',              80),
  ('art',                'Art',                  90),
  ('nature-walking',     'Nature & walking',    100),
  ('faith-spirituality', 'Faith & spirituality',110),
  ('family',             'Family & home',       120),
  ('pets',               'Pets & animals',      130),
  ('games',             'Games & puzzles',     140),
  ('technology',         'Technology',          150),
  ('current-affairs',    'Current affairs',     160),
  ('crafts',             'Crafts & hobbies',    170),
  ('health-wellbeing',   'Health & wellbeing',  180),
  ('work-career',        'Work & career',       190)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Crisis resources: country-specific first, then international fallback.
-- Use stable IDs (uuid v5-ish via md5) so re-running is idempotent.
insert into crisis_resources (id, country_code, name, phone, url, notes, sort_order) values
  (md5('crisis:gb:samaritans')::uuid, 'gb', 'Samaritans', '116 123', 'https://www.samaritans.org', 'Free, confidential, 24/7', 1),
  (md5('crisis:us:988')::uuid,        'us', '988 Suicide & Crisis Lifeline', '988', 'https://988lifeline.org', 'Call or text 988, 24/7', 1),
  (md5('crisis:intl:findahelpline')::uuid, null, 'Find a Helpline', null, 'https://findahelpline.com', 'Find a helpline in your country', 100),
  (md5('crisis:intl:befrienders')::uuid,   null, 'Befrienders Worldwide', null, 'https://www.befrienders.org', 'International emotional-support directory', 110)
on conflict (id) do update set
  country_code = excluded.country_code, name = excluded.name, phone = excluded.phone,
  url = excluded.url, notes = excluded.notes, sort_order = excluded.sort_order;
