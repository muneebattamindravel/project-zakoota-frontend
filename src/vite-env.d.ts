/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_WITH_CREDENTIALS: string
  readonly VITE_ME_PATH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
