export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  realm: string;
  token_id: string;
  trusted_fingerprints: string[];
  pve_version?: string;
  last_connected?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latency_ms: number;
  pve_version: string;
  node_count: number;
  first_node: string;
}
