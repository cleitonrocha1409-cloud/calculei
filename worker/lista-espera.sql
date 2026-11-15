-- Lista de espera do Cálculo em Dia Empresas (banco D1 "calculoemdia-lista").
CREATE TABLE IF NOT EXISTS inscricoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  perfil TEXT NOT NULL,          -- dono | contador | outro
  funcionarios TEXT,             -- 1-3 | 4-10 | 11-20 | 21+
  interesses TEXT,               -- lista separada por vírgula
  origem TEXT,                   -- página onde a pessoa se inscreveu
  consentimento_em TEXT NOT NULL,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS inscricoes_ip ON inscricoes (ip_hash, criado_em);
