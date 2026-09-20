-- Executado automaticamente pelo PostgreSQL na primeira vez que o volume do banco é criado.
-- Se o volume já existia antes desta versão, recrie-o com: docker compose down -v

CREATE TABLE IF NOT EXISTS links (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  url        TEXT NOT NULL,
  visitor_id UUID NOT NULL,                       -- dono do link (cookie anônimo)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, url)                        -- a mesma pessoa não cria dois links para a mesma URL
);

CREATE TABLE IF NOT EXISTS clicks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id    INTEGER NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer   TEXT,
  user_agent TEXT
);

-- Lista de links de cada visitante
CREATE INDEX IF NOT EXISTS idx_links_visitor ON links (visitor_id, id DESC);
-- Gráficos por link e consolidado
CREATE INDEX IF NOT EXISTS idx_clicks_link_date ON clicks (link_id, clicked_at);
