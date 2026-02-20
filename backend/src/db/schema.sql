-- Initial database schema for Boedekasse
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  description TEXT        NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  type        VARCHAR(10)  NOT NULL CHECK (type IN ('income', 'expense')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
