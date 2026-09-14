/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE & REAL AUTH
 * 
 * Suporte a conexão nativa com Supabase:
 * - Login verdadeiro via supabase.auth.signInWithPassword()
 * - Registro via supabase.auth.signUp()
 * - Recuperação do perfil em public.profiles
 * - Persistência automática de sessão
 */

import { normalizeRole } from './permissions.js';
import { db } from './database.js';

const CONFIG_STORAGE_KEY = 'gef_supabase_config_v1';

// Recupera configuração do localStorage ou variáveis de ambiente
function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler supabase config do localStorage:', e);
  }

  const envUrl = window.__ENV__?.VITE_SUPABASE_URL || window.__ENV__?.SUPABASE_URL;
  const envKey = window.__ENV__?.VITE_SUPABASE_ANON_KEY || window.__ENV__?.SUPABASE_ANON_KEY;

  return {
    url: envUrl || 'https://seu-projeto.supabase.co',
    anonKey: envKey || 'sua-chave-anon-publica-do-supabase'
  };
}

let currentConfig = loadConfig();

export function isSupabaseConfigured() {
  return Boolean(
    currentConfig.url &&
    !currentConfig.url.includes('seu-projeto') &&
    currentConfig.anonKey &&
    !currentConfig.anonKey.includes('sua-chave')
  );
}

export function saveSupabaseConfig(url, anonKey) {
  const cleanUrl = (url || '').trim().replace(/\/$/, '');
  const cleanKey = (anonKey || '').trim();
  currentConfig = { url: cleanUrl, anonKey: cleanKey };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(currentConfig));
  initClient();
}

export function getSupabaseConfig() {
  return { ...currentConfig, isConfigured: isSupabaseConfigured() };
}

// Inicializa ou recria o cliente Supabase
export let supabase = null;
let clientInitPromise = null;

async function initClient() {
  if (supabase) return supabase;
  if (!isSupabaseConfigured()) return null;
  if (clientInitPromise) return clientInitPromise;

  clientInitPromise = (async () => {
    try {
      // Carregamento sob demanda: o login local/demonstração não pode ficar
      // dependente da rede para simplesmente renderizar a tela.
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      supabase = createClient(currentConfig.url, currentConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabase;
    } catch (err) {
      console.warn('Falha ao carregar/inicializar cliente Supabase:', err);
      supabase = null;
      return null;
    } finally {
      clientInitPromise = null;
    }
  })();

  return clientInitPromise;
}

// Não bloqueia o carregamento da aplicação. O cliente só é carregado quando necessário.
initClient();

/**
 * Autenticação real com Supabase
 */
export async function loginWithSupabase(email, password) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      isConfigError: true,
      error: 'Supabase ainda não configurado com URL e Anon Key válidas.'
    };
  }

  const client = await initClient();
  if (!client) {
    return {
      success: false,
      isConfigError: true,
      error: 'Não foi possível carregar o cliente Supabase. Verifique a conexão com a internet.'
    };
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return {
      success: false,
      error: 'Por favor, informe o e-mail e a senha de acesso.'
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        msg = 'Credenciais inválidas: e-mail ou senha incorretos no Supabase.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'E-mail ainda não confirmado no Supabase. Verifique sua caixa de entrada.';
      } else if (msg.includes('User not found')) {
        msg = 'Usuário não cadastrado no Supabase.';
      }
      return { success: false, error: msg };
    }

    if (!data?.user) {
      return { success: false, error: 'Credenciais inválidas: usuário não retornado pelo Supabase.' };
    }

    // Busca o perfil na tabela public.profiles por id E por email
    let profile = null;
    try {
      const { data: profData } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profData) {
        profile = profData;
      } else {
        const { data: profByEmail } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (profByEmail) profile = profByEmail;
      }
    } catch (e) {
      console.warn('Não foi possível buscar profile no Supabase:', e);
    }

    const userMeta = data.user.user_metadata || {};
    const appMeta = data.user.app_metadata || {};
    const rawRole = profile?.role || userMeta.role || appMeta.role;

    // Normalização estrita do papel (nunca improvisa papel incorreto)
    const role = normalizeRole(rawRole, data.user.id, data.user.email);

    // Determinação precisa da loja correspondente ao perfil
    let storeId;
    let storeName;
    if (role === 'SUPERADMIN') {
      storeId = 'ALL';
      storeName = 'Plataforma Global (Monitor & SaaS)';
    } else {
      storeId = profile?.store_id || userMeta.store_id || appMeta.store_id || 'store-001';
      try {
        const stores = db.getStores();
        const foundStore = stores.find(s => s.id === storeId);
        storeName = foundStore?.tradeName || foundStore?.name || (storeId === 'store-002' ? 'GEF Ferragens – Filial Matola Rio' : 'GEF Ferragens – Loja Matriz Maputo');
      } catch {
        storeName = storeId === 'store-002' ? 'GEF Ferragens – Filial Matola Rio' : 'GEF Ferragens – Loja Matriz Maputo';
      }
    }

    const fullName = profile?.full_name || userMeta.full_name || userMeta.name || appMeta.full_name || cleanEmail.split('@')[0].toUpperCase();

    const appUser = {
      id: data.user.id,
      email: data.user.email,
      fullName,
      role,
      storeId,
      storeName,
      supabaseAuth: true,
      active: true
    };

    // Auto-sincroniza a tabela profiles no Supabase para garantir persistência permanente do papel correto
    if (client && (!profile || profile.role !== role || profile.store_id !== storeId)) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role,
          store_id: storeId,
          active: true
        });
      } catch (syncErr) {
        console.warn('Aviso ao sincronizar profile no Supabase:', syncErr);
      }
    }

    return {
      success: true,
      user: appUser,
      session: data.session
    };
  } catch (err) {
    return { success: false, error: err.message || 'Falha na conexão com Supabase.' };
  }
}

/**
 * Registro de novo usuário com Supabase Auth
 */
export async function registerWithSupabase(email, password, fullName, role = 'CASHIER', storeId = 'store-001') {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não configurado.' };
  }

  const client = await initClient();
  if (!client) {
    return { success: false, error: 'Não foi possível carregar o cliente Supabase.' };
  }

  const normalizedRole = normalizeRole(role, null, email);
  const targetStoreId = normalizedRole === 'SUPERADMIN' ? 'ALL' : storeId;

  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          role: normalizedRole,
          store_id: targetStoreId
        }
      }
    });

    if (error) return { success: false, error: error.message };

    // Registra na tabela profiles se possível
    if (data?.user) {
      try {
        await client.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: normalizedRole,
          store_id: targetStoreId,
          active: true
        });
      } catch (e) {
        console.warn('Não foi possível gravar profile após signUp:', e);
      }
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Logout real no Supabase
 */
export async function logoutWithSupabase() {
  if (isSupabaseConfigured()) {
    const client = await initClient();
    if (!client) return;
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Erro ao fazer signOut no Supabase:', e);
    }
  }
}

export default supabase;
