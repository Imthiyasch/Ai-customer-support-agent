-- Warning: This will delete existing document chunks!
-- We need to change the embedding dimension from 1536 (OpenAI) to 384 (Xenova).

DROP TABLE IF EXISTS document_chunks;

CREATE TABLE document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(384), -- Now using 384 dimensions for the local BGE model
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
