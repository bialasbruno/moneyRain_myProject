PRAGMA foreign_keys = ON;

CREATE TABLE character_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK(length(description) <= 500),
  slot TEXT NOT NULL CHECK(slot IN ('HEAD', 'EYES', 'BODY', 'HAND', 'BACK', 'FEET', 'COMPANION')),
  rarity TEXT NOT NULL CHECK(rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  unlock_type TEXT NOT NULL CHECK(unlock_type IN ('STARTER', 'VALUE', 'CHEST')),
  unlock_value_pln TEXT,
  visual_key TEXT NOT NULL CHECK(length(visual_key) <= 80),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(
    (unlock_type = 'VALUE' AND unlock_value_pln IS NOT NULL) OR
    (unlock_type != 'VALUE' AND unlock_value_pln IS NULL)
  )
) STRICT;

CREATE INDEX character_items_slot_idx ON character_items(slot, sort_order);
CREATE INDEX character_items_unlock_idx ON character_items(unlock_type, unlock_value_pln);

CREATE TABLE character_item_unlocks (
  item_id TEXT PRIMARY KEY REFERENCES character_items(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('STARTER', 'VALUE', 'CHEST')),
  source_ref TEXT
) STRICT;

CREATE TABLE character_equipment (
  slot TEXT PRIMARY KEY CHECK(slot IN ('HEAD', 'EYES', 'BODY', 'HAND', 'BACK', 'FEET', 'COMPANION')),
  item_id TEXT NOT NULL UNIQUE REFERENCES character_items(id) ON DELETE CASCADE,
  equipped_at TEXT NOT NULL,
  FOREIGN KEY(item_id) REFERENCES character_item_unlocks(item_id)
) STRICT;

CREATE TABLE loot_chests (
  id TEXT PRIMARY KEY,
  contribution_id TEXT NOT NULL UNIQUE REFERENCES portfolio_contributions(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK(tier IN ('WOODEN', 'SILVER', 'GOLD')),
  status TEXT NOT NULL DEFAULT 'READY' CHECK(status IN ('READY', 'OPENED')),
  awarded_item_id TEXT REFERENCES character_items(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  opened_at TEXT
) STRICT;

CREATE INDEX loot_chests_status_idx ON loot_chests(status, created_at);

INSERT INTO character_items
  (id, name, description, slot, rarity, unlock_type, unlock_value_pln, visual_key, sort_order)
VALUES
  ('body-starter', 'Bluza Początku', 'Pierwszy strój Twojej postaci.', 'BODY', 'COMMON', 'STARTER', NULL, 'body-emerald', 1),
  ('feet-starter', 'Buty Pierwszego Kroku', 'Wygodne buty na długą drogę do miliona.', 'FEET', 'COMMON', 'STARTER', NULL, 'boots-trail', 2),
  ('eyes-saver', 'Okulary Oszczędzającego', 'Pozwalają widzieć każdy pracujący grosz.', 'EYES', 'RARE', 'VALUE', '1000', 'glasses-round', 10),
  ('head-builder', 'Czapka Konstruktora', 'Dla osoby, która zbudowała pierwszy fundament.', 'HEAD', 'RARE', 'VALUE', '5000', 'cap-builder', 20),
  ('hand-growth', 'Miecz Wzrostu', 'Symbol pierwszej pięciocyfrowej wartości.', 'HAND', 'EPIC', 'VALUE', '10000', 'sword-emerald', 30),
  ('back-guardian', 'Tarcza Strażnika', 'Chroni konsekwencję zgromadzoną w portfelu.', 'BACK', 'EPIC', 'VALUE', '50000', 'shield-guardian', 40),
  ('body-architect', 'Płaszcz Architekta', 'Strój odblokowany po przekroczeniu 100 000 PLN.', 'BODY', 'EPIC', 'VALUE', '100000', 'coat-architect', 50),
  ('hand-master', 'Złoty Miecz Akumulacji', 'Broń mistrza ćwierci miliona.', 'HAND', 'LEGENDARY', 'VALUE', '250000', 'sword-gold', 60),
  ('back-magnate', 'Skrzydła Magnata', 'Energetyczne skrzydła za pół miliona.', 'BACK', 'LEGENDARY', 'VALUE', '500000', 'wings-capital', 70),
  ('head-million', 'Korona Milionera', 'Finałowa korona Drogi do Miliona.', 'HEAD', 'LEGENDARY', 'VALUE', '1000000', 'crown-million', 80),
  ('eyes-pixel', 'Pikselowe Okulary', 'Klasyczne okulary znalezione w skrzynce.', 'EYES', 'COMMON', 'CHEST', NULL, 'glasses-pixel', 100),
  ('feet-ruby', 'Rubinowe Buty', 'Czerwone buty dla wytrwałego odkrywcy.', 'FEET', 'COMMON', 'CHEST', NULL, 'boots-ruby', 110),
  ('head-night', 'Czapka Nocnego Planisty', 'Dla tych, którzy planują kolejny krok po zmroku.', 'HEAD', 'COMMON', 'CHEST', NULL, 'cap-night', 120),
  ('body-sky', 'Kurtka Spokojnego Nieba', 'Lekki strój w błękitnych barwach.', 'BODY', 'COMMON', 'CHEST', NULL, 'body-sky', 130),
  ('head-focus', 'Słuchawki Skupienia', 'Pomagają trzymać się własnego planu.', 'HEAD', 'RARE', 'CHEST', NULL, 'headphones-focus', 140),
  ('back-oak', 'Dębowa Tarcza', 'Wytrzymała tarcza regularności.', 'BACK', 'RARE', 'CHEST', NULL, 'shield-oak', 150),
  ('hand-blue', 'Miecz Błękitnej Iskry', 'Rzadki miecz z chłodną poświatą.', 'HAND', 'RARE', 'CHEST', NULL, 'sword-blue', 160),
  ('eyes-fox', 'Maska Lisa', 'Epicka maska cierpliwego stratega.', 'EYES', 'EPIC', 'CHEST', NULL, 'mask-fox', 170),
  ('back-purple', 'Purpurowa Peleryna', 'Epicka peleryna poruszana energią skarbca.', 'BACK', 'EPIC', 'CHEST', NULL, 'cape-purple', 180),
  ('companion-orb', 'Orb Groszaka', 'Mały towarzysz liczący odsetki razem z Tobą.', 'COMPANION', 'EPIC', 'CHEST', NULL, 'companion-orb', 190),
  ('head-starlight', 'Korona Gwiezdnego Szlaku', 'Legendarna korona dostępna tylko ze skrzyni.', 'HEAD', 'LEGENDARY', 'CHEST', NULL, 'crown-starlight', 200),
  ('hand-void', 'Miecz Czarnej Perły', 'Legendarna broń o najrzadszym dropie.', 'HAND', 'LEGENDARY', 'CHEST', NULL, 'sword-void', 210);

INSERT INTO character_item_unlocks (item_id, unlocked_at, source, source_ref)
VALUES
  ('body-starter', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'STARTER', 'migration:0003'),
  ('feet-starter', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'STARTER', 'migration:0003');

INSERT INTO character_equipment (slot, item_id, equipped_at)
VALUES
  ('BODY', 'body-starter', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('FEET', 'feet-starter', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Wpłaty zapisane przed wdrożeniem ekwipunku również powinny dać graczowi skrzynkę.
INSERT INTO loot_chests (id, contribution_id, tier, status, created_at)
SELECT
  'chest-legacy-' || id,
  id,
  CASE
    WHEN CAST(amount_pln AS REAL) >= 5000 THEN 'GOLD'
    WHEN CAST(amount_pln AS REAL) >= 1000 THEN 'SILVER'
    ELSE 'WOODEN'
  END,
  'READY',
  created_at
FROM portfolio_contributions;

-- Stare osiągnięcie ETF nie ma sensu w portfelu wyłącznie obligacyjnym.
UPDATE achievements
SET
  name = 'Pierwszy łup',
  description = 'Otwórz pierwszą skrzynkę z przedmiotem.',
  icon = 'Gift',
  rule_type = 'CHEST_OPENED',
  rule_value = NULL
WHERE id = 'diversified';
