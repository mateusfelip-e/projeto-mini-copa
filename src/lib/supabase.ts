
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuração do Supabase ausente. Confira o arquivo .env na raiz do projeto.'
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
