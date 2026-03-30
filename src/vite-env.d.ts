/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Retail / CI profile: `development` | `lightweight` | `standard` | `full` */
  readonly VITE_HOLOBRO_TIER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
