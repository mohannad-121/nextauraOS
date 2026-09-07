ALTER TABLE public.automation_workflows
  ADD COLUMN graph_nodes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(graph_nodes) = 'array' AND octet_length(graph_nodes::text) <= 65536),
  ADD COLUMN graph_edges JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(graph_edges) = 'array' AND octet_length(graph_edges::text) <= 65536),
  ADD COLUMN graph_version INTEGER NOT NULL DEFAULT 1 CHECK (graph_version >= 1);
