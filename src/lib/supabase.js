import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_CHAVE_PUBLICA } from '../config.js'

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_CHAVE_PUBLICA)

export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null

// Volta para o mesmo endereço em que o app está (provisório ou domínio).
export const enderecoDeVolta = () => window.location.origin + window.location.pathname
