PRAGMA foreign_keys = ON;

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  target_amount_pln TEXT NOT NULL,
  target_date TEXT,
  planned_monthly_contribution_pln TEXT,
  icon TEXT CHECK(length(icon) <= 32),
  theme TEXT CHECK(length(theme) <= 32),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE portfolio_contributions (
  id TEXT PRIMARY KEY,
  contribution_date TEXT NOT NULL,
  amount_pln TEXT NOT NULL,
  source TEXT NOT NULL CHECK(length(source) BETWEEN 1 AND 80),
  notes TEXT CHECK(length(notes) <= 1000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX contributions_date_idx ON portfolio_contributions(contribution_date, id);

CREATE TABLE game_state (
  id TEXT PRIMARY KEY CHECK(id = 'owner'),
  current_level INTEGER NOT NULL DEFAULT 0,
  highest_level INTEGER NOT NULL DEFAULT 0,
  peak_value_pln TEXT NOT NULL DEFAULT '0',
  xp INTEGER NOT NULL DEFAULT 0,
  effects_level TEXT NOT NULL DEFAULT 'FULL' CHECK(effects_level IN ('FULL', 'LIMITED', 'OFF')),
  sound_enabled INTEGER NOT NULL DEFAULT 0 CHECK(sound_enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

INSERT INTO game_state (id) VALUES ('owner');

CREATE TABLE ranks (
  id TEXT PRIMARY KEY,
  threshold_pln TEXT NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  description TEXT NOT NULL CHECK(length(description) <= 500),
  reward_item_id TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE UNIQUE INDEX ranks_order_idx ON ranks(sort_order);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK(length(description) <= 500),
  icon TEXT NOT NULL CHECK(length(icon) <= 32),
  rule_type TEXT NOT NULL,
  rule_value TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE achievement_unlocks (
  achievement_id TEXT PRIMARY KEY REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL,
  progression_event_id TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE cosmetic_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK(length(description) <= 500),
  category TEXT NOT NULL CHECK(category IN ('AURA', 'RING', 'VAULT_SKIN', 'BACKGROUND', 'PROFILE_FRAME', 'TITLE', 'ARTIFACT', 'PARTICLES')),
  rarity TEXT NOT NULL CHECK(rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  unlock_condition TEXT NOT NULL CHECK(length(unlock_condition) <= 500),
  thumbnail_key TEXT NOT NULL CHECK(length(thumbnail_key) <= 80),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE cosmetic_unlocks (
  item_id TEXT PRIMARY KEY REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL,
  progression_event_id TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE equipped_items (
  category TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  equipped_at TEXT NOT NULL,
  FOREIGN KEY(item_id) REFERENCES cosmetic_unlocks(item_id)
) STRICT;

CREATE TABLE progression_events (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  occurred_at TEXT NOT NULL,
  animation_seen_at TEXT
) STRICT;

CREATE INDEX progression_events_unseen_idx ON progression_events(animation_seen_at, occurred_at);

INSERT INTO goals (id, name, target_amount_pln, icon, theme, is_primary)
VALUES ('goal-million', 'Droga do miliona', '1000000', 'Sparkles', 'emerald', 1);

INSERT INTO ranks (id, threshold_pln, name, description, sort_order) VALUES
('novice', '0', 'Nowicjusz', 'Pierwszy krok w stronę niezależności.', 0),
('spark', '1000', 'Pierwsza Iskra', 'Kapitał zaczyna świecić.', 1),
('builder', '5000', 'Konstruktor', 'Fundament portfela nabiera kształtu.', 2),
('investor', '10000', 'Inwestor', 'Pięciocyfrowy etap drogi.', 3),
('strategist', '25000', 'Strateg', 'Konsekwencja staje się systemem.', 4),
('guardian', '50000', 'Strażnik Kapitału', 'Solidny fundament został zbudowany.', 5),
('architect', '100000', 'Architekt', 'Portfel przekracza 100 tysięcy.', 6),
('master', '250000', 'Mistrz Akumulacji', 'Ćwierć drogi za Tobą.', 7),
('magnate', '500000', 'Magnat', 'Połowa drogi do miliona.', 8),
('threshold', '750000', 'Przedproże Miliona', 'Cel jest już blisko.', 9),
('millionaire', '1000000', 'Milioner', 'Główny cel został osiągnięty.', 10);

INSERT INTO achievements (id, name, description, icon, rule_type, rule_value) VALUES
('first-step', 'Pierwszy krok', 'Dodaj pierwszą inwestycję.', 'Footprints', 'FIRST_INVESTMENT', NULL),
('first-thousand', 'Pierwszy tysiąc', 'Portfel osiągnął 1 000 PLN.', 'Sparkles', 'VALUE', '1000'),
('five-digits', 'Pięciocyfrowy portfel', 'Portfel osiągnął 10 000 PLN.', 'Gem', 'VALUE', '10000'),
('foundation', 'Solidny fundament', 'Portfel osiągnął 50 000 PLN.', 'Shield', 'VALUE', '50000'),
('club-100k', 'Klub 100K', 'Portfel osiągnął 100 000 PLN.', 'Landmark', 'VALUE', '100000'),
('halfway', 'Połowa drogi', 'Portfel osiągnął 500 000 PLN.', 'Route', 'VALUE', '500000'),
('million', 'Milion', 'Portfel osiągnął 1 000 000 PLN.', 'Crown', 'VALUE', '1000000'),
('diversified', 'Dywersyfikacja', 'Posiadasz ETF i obligacje.', 'Blend', 'DIVERSIFIED', NULL),
('regularity', 'Regularność', 'Wpłaty w kolejnych miesiącach.', 'CalendarCheck', 'CONTRIBUTION_STREAK', '3'),
('year', 'Rok konsekwencji', 'Dwanaście miesięcy realizacji planu.', 'CalendarRange', 'CONTRIBUTION_STREAK', '12');

INSERT INTO cosmetic_items (id, name, description, category, rarity, unlock_condition, thumbnail_key) VALUES
('aura-verdant', 'Aura Początku', 'Spokojna zielona poświata Rdzenia.', 'AURA', 'COMMON', 'Dostępna od początku', 'aura-verdant'),
('ring-spark', 'Pierścień Iskry', 'Turkusowy pierścień energii.', 'RING', 'RARE', 'Osiągnij rangę Pierwsza Iskra', 'ring-spark'),
('background-architect', 'Horyzont Architekta', 'Głębokie błękitne tło skarbca.', 'BACKGROUND', 'EPIC', 'Osiągnij 100 000 PLN', 'background-architect'),
('title-millionaire', 'Tytuł: Milioner', 'Unikalny tytuł finałowy.', 'TITLE', 'LEGENDARY', 'Osiągnij 1 000 000 PLN', 'title-millionaire');

INSERT INTO progression_events (id, event_key, type, payload, occurred_at, animation_seen_at)
VALUES ('bootstrap-unlock', 'cosmetic:aura-verdant', 'COSMETIC_UNLOCK', '{"itemId":"aura-verdant"}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
INSERT INTO cosmetic_unlocks (item_id, unlocked_at, progression_event_id)
VALUES ('aura-verdant', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'bootstrap-unlock');
INSERT INTO equipped_items (category, item_id, equipped_at)
VALUES ('AURA', 'aura-verdant', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

