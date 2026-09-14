/**
 * GEF - GESTÃO FINANCEIRA | AUTH SERVICE
 * JavaScript Puro (Vanilla JS)
 */

import { SUPERADMIN_SPECIAL_ID, normalizeRole, canSwitchStores } from './permissions.js';
import { db } from './database.js';
import { loginWithSupabase, registerWithSupabase, logoutWithSupabase, isSupabaseConfigured } from './supabase.js';

const AUTH_STORAGE_KEY = 'gef_authenticated_user_v2';

export const DEMO_USERS = [
  {
    id: SUPERADMIN_SPECIAL_ID,
    email: 'superadmin@gef.co.mz',
    fullName: 'Administrador SaaS Global (Superadmin)',
    role: 'SUPERADMIN',
    storeId: 'ALL',
    storeName: 'Plataforma Global (Monitor & SaaS)',
    active: true
  },
  {
    id: 'user-admin-01',
    email: 'admin.loja@gef.co.mz',
    fullName: 'Eng. Carlos Sitoe (Administrador da Loja)',
    role: 'ADMIN',
    storeId: 'store-001',
    storeName: 'GEF Ferragens – Loja Matriz Maputo',
    active: true
  },
  {
    id: 'user-gerente-02',
    email: 'marta.gerente@gef.co.mz',
    fullName: 'Dra. Marta Machava (Gerente Filial)',
    role: 'GERENTE',
    storeId: 'store-002',
    storeName: 'GEF Ferragens – Filial Matola Rio',
    active: true
  },
  {
    id: 'user-caixa-03',
    email: 'caixa.maputo@gef.co.mz',
    fullName: 'Felisberto Macamo (Operador de Caixa)',
    role: 'CASHIER',
    storeId: 'store-001',
    storeName: 'GEF Ferragens – Loja Matriz Maputo',
    active: true
  },
  {
    id: 'user-estoque-04',
    email: 'estoquista@gef.co.mz',
    fullName: 'João Mondlane (Encarregado de Estoque & Pátio)',
    role: 'ESTOQUISTA',
    storeId: 'store-001',
    storeName: 'GEF Ferragens – Loja Matriz Maputo',
    active: true
  },
  {
    id: 'user-embaixador-05',
    email: 'paulo.embaixador@gef.co.mz',
    fullName: 'Paulo Cossa (Embaixador Parceiro)',
    role: 'EMBAIXADOR',
    storeId: 'store-001',
    storeName: 'Programa de Embaixadores GEF',
    active: true
  }
];

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.init();
  }

  init() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const role = normalizeRole(parsed.role, parsed.id, parsed.email);
          this.currentUser = {
            ...parsed,
            role,
            storeId: role === 'SUPERADMIN' ? 'ALL' : (parsed.storeId || 'store-001')
          };
        }
      }
    } catch {
      this.currentUser = null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && this.currentUser.active !== false;
  }

  async signIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Por favor, informe o e-mail e a senha de acesso.' };
    }

    // 1. Tentar Login Real no Supabase se configurado
    if (isSupabaseConfigured()) {
      try {
        const supaRes = await loginWithSupabase(cleanEmail, cleanPassword);
        if (supaRes.success && supaRes.user) {
          this.currentUser = supaRes.user;
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
          
          if (this.currentUser.role === 'SUPERADMIN') {
            db.setCurrentStoreId('ALL');
          } else if (this.currentUser.storeId && this.currentUser.storeId !== 'ALL') {
            db.setCurrentStoreId(this.currentUser.storeId);
          }

          this.notify();
          return { success: true, user: this.currentUser, fromSupabase: true };
        } else if (!supaRes.isConfigError) {
          // Erro retornado pelo Supabase (ex: senha errada ou usuário inexistente)
          // REGRA ESTRITA: Notificar erro! Não improvisar usuário nem alterar papel!
          return { success: false, error: supaRes.error || 'Credenciais inválidas no Supabase.' };
        }
      } catch (err) {
        console.warn('Falha no Supabase signIn:', err);
        return { success: false, error: 'Falha ao autenticar no Supabase: ' + (err.message || 'Erro de conexão.') };
      }
    }

    // 2. Autenticação Local / Demonstração com Usuários do Sistema
    // Validação estrita: somente usuários cadastrados com senha válida são autorizados
    const found = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (found) {
      const allowedPasswords = ['gef123', 'admin123', '123456', 'superadmin', 'gef2026', 'gef@2026', 'password'];
      if (found.role === 'SUPERADMIN') {
        allowedPasswords.push('gef-superadmin-2026', 'superadmin2026', 'master2026');
      }

      if (!allowedPasswords.includes(cleanPassword.toLowerCase())) {
        return { success: false, error: 'Credenciais inválidas: senha incorreta.' };
      }

      const role = normalizeRole(found.role, found.id, found.email);
      const storeId = role === 'SUPERADMIN' ? 'ALL' : (found.storeId || 'store-001');

      this.currentUser = {
        ...found,
        role,
        storeId
      };

      if (this.currentUser.role === 'SUPERADMIN') {
        db.setCurrentStoreId('ALL');
      } else if (this.currentUser.storeId && this.currentUser.storeId !== 'ALL') {
        db.setCurrentStoreId(this.currentUser.storeId);
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser, fromDemo: true };
    }

    // 3. Usuário inexistente ou credenciais incorretas:
    // NOTIFICAR ERRO! NUNCA IMPROVISAR!
    return {
      success: false,
      error: 'Credenciais inválidas: e-mail ou senha incorretos.'
    };
  }

  async signUp(email, password, fullName, role = 'CASHIER', storeId = 'store-001') {
    const normalizedRole = normalizeRole(role, null, email);
    const targetStoreId = normalizedRole === 'SUPERADMIN' ? 'ALL' : storeId;

    if (isSupabaseConfigured()) {
      try {
        const supaRes = await registerWithSupabase(email, password, fullName, normalizedRole, targetStoreId);
        if (!supaRes.success) {
          return { success: false, error: supaRes.error };
        }
      } catch (err) {
        console.warn('Erro ao registrar no Supabase:', err);
      }
    }

    this.currentUser = {
      id: 'user-' + Date.now(),
      email: email.trim(),
      fullName: fullName.trim(),
      role: normalizedRole,
      storeId: targetStoreId,
      storeName: targetStoreId === 'ALL' ? 'Plataforma Global (Monitor & SaaS)' : 'Loja Principal',
      active: true
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
    this.notify();
    return { success: true, user: this.currentUser };
  }

  selectDemoUser(demoUser) {
    const role = normalizeRole(demoUser.role, demoUser.id, demoUser.email);
    const storeId = role === 'SUPERADMIN' ? 'ALL' : (demoUser.storeId || 'store-001');
    this.currentUser = {
      ...demoUser,
      role,
      storeId
    };
    if (this.currentUser.role === 'SUPERADMIN') {
      db.setCurrentStoreId('ALL');
    } else if (this.currentUser.storeId && this.currentUser.storeId !== 'ALL') {
      db.setCurrentStoreId(this.currentUser.storeId);
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  switchActiveStore(storeId) {
    if (!this.currentUser) return;
    if (!canSwitchStores(this.currentUser)) {
      console.warn('Troca de loja não autorizada para esta função.');
      return;
    }
    const stores = db.getStores();
    const assignedStore = stores.find(s => s.id === storeId);
    const storeName = storeId === 'ALL'
      ? 'Todas as Filiais (Consolidado)'
      : (assignedStore?.tradeName || assignedStore?.name || 'Loja Ativa');

    this.currentUser = {
      ...this.currentUser,
      storeId,
      storeName
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
    this.notify();
  }

  signOut() {
    this.currentUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    logoutWithSupabase();
    this.notify();
  }
}

export const auth = new AuthService();
