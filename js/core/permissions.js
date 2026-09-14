/**
 * GEF - GESTÃO FINANCEIRA | CORE PERMISSIONS
 * JavaScript Puro (Vanilla JS)
 */

export const SUPERADMIN_SPECIAL_ID = 'aef2d4c5-b8dd-4d8a-8bff-7816ee687b53';

export function normalizeRole(role, userId, email) {
  if (typeof role === 'object' && role !== null) {
    userId = userId || role.id;
    email = email || role.email;
    role = role.role;
  }

  if (userId === SUPERADMIN_SPECIAL_ID) return 'SUPERADMIN';

  const cleanEmail = (email || '').toString().trim().toLowerCase();
  if (
    cleanEmail === 'superadmin@gef.co.mz' ||
    cleanEmail.includes('superadmin') ||
    cleanEmail.includes('super.admin') ||
    cleanEmail.startsWith('super.')
  ) {
    return 'SUPERADMIN';
  }

  const clean = (role || '').toString().trim().toUpperCase().replace(/[\s_-]+/g, '_');

  if (
    clean === 'SUPERADMIN' ||
    clean === 'SUPER_ADMIN' ||
    clean === 'SUPERADMINISTRADOR' ||
    clean === 'SUPER_ADMINISTRADOR' ||
    clean === 'SAAS_ADMIN' ||
    clean === 'GLOBAL_ADMIN' ||
    clean === 'MASTER' ||
    clean === 'ROOT'
  ) {
    return 'SUPERADMIN';
  }

  if (
    clean === 'ADMIN' ||
    clean === 'ADMINISTRADOR' ||
    clean === 'STORE_ADMIN' ||
    cleanEmail.includes('admin.loja') ||
    cleanEmail.startsWith('admin@') ||
    cleanEmail.startsWith('administrador@')
  ) {
    return 'ADMIN';
  }

  if (
    clean === 'GERENTE' ||
    clean === 'GERENCIA' ||
    clean === 'STORE_MANAGER' ||
    clean === 'MANAGER' ||
    cleanEmail.includes('gerente')
  ) {
    return 'GERENTE';
  }

  if (
    clean === 'ESTOQUISTA' ||
    clean === 'ESTOQUE' ||
    clean === 'PATIO' ||
    clean === 'ALMOXARIFE' ||
    cleanEmail.includes('estoquista') ||
    cleanEmail.includes('estoque')
  ) {
    return 'ESTOQUISTA';
  }

  if (
    clean === 'EMBAIXADOR' ||
    clean === 'PARCEIRO' ||
    cleanEmail.includes('embaixador')
  ) {
    return 'EMBAIXADOR';
  }

  if (
    clean === 'CASHIER' ||
    clean === 'CAIXA' ||
    clean === 'OPERADOR' ||
    clean === 'PDV' ||
    cleanEmail.includes('caixa')
  ) {
    return 'CASHIER';
  }

  return 'CASHIER';
}

export function getDefaultTabForRole(role, userId) {
  const norm = normalizeRole(role, userId);
  switch (norm) {
    case 'SUPERADMIN':
      return 'MONITOR_SAAS';
    case 'ADMIN':
      return 'DASHBOARD';
    case 'GERENTE':
      return 'DASHBOARD';
    case 'CASHIER':
      return 'PDV';
    case 'ESTOQUISTA':
      return 'ESTOQUE';
    case 'EMBAIXADOR':
      return 'EMBAIXADORES';
    default:
      return 'PDV';
  }
}

export const ROLE_ALLOWED_TABS = {
  SUPERADMIN: [
    'MONITOR_SAAS',
    'LOJAS',
    'EMBAIXADORES',
    'AUDITORIA',
    'RELATORIOS',
    'CONFIGURACOES',
    'DASHBOARD',
    'PDV',
    'VENDAS',
    'ORCAMENTOS',
    'PRODUTOS',
    'ESTOQUE',
    'TRANSFERENCIAS',
    'PERDAS',
    'COMPRAS',
    'ENTREGAS',
    'CAIXA',
    'CLIENTES'
  ],
  ADMIN: [
    'DASHBOARD',
    'PDV',
    'VENDAS',
    'ORCAMENTOS',
    'PRODUTOS',
    'ESTOQUE',
    'TRANSFERENCIAS',
    'PERDAS',
    'COMPRAS',
    'ENTREGAS',
    'CAIXA',
    'CLIENTES',
    'RELATORIOS',
    'AUDITORIA',
    'CONFIGURACOES'
  ],
  GERENTE: [
    'DASHBOARD',
    'PDV',
    'VENDAS',
    'ORCAMENTOS',
    'PRODUTOS',
    'ESTOQUE',
    'TRANSFERENCIAS',
    'PERDAS',
    'COMPRAS',
    'ENTREGAS',
    'CAIXA',
    'CLIENTES',
    'RELATORIOS',
    'AUDITORIA'
  ],
  CASHIER: [
    'PDV',
    'VENDAS',
    'CAIXA',
    'CLIENTES'
  ],
  ESTOQUISTA: [
    'ESTOQUE',
    'PRODUTOS',
    'TRANSFERENCIAS',
    'PERDAS',
    'COMPRAS',
    'ENTREGAS',
    'AUDITORIA'
  ],
  EMBAIXADOR: [
    'EMBAIXADORES'
  ]
};

export function isTabAllowedForUser(tab, userOrRole, userId) {
  if (!userOrRole) return false;
  let norm;
  if (typeof userOrRole === 'object') {
    norm = normalizeRole(userOrRole.role, userOrRole.id);
  } else {
    norm = normalizeRole(userOrRole, userId);
  }
  const allowed = ROLE_ALLOWED_TABS[norm] || ROLE_ALLOWED_TABS.CASHIER;
  return allowed.includes(tab);
}

export function canSwitchStores(user) {
  if (!user) return false;
  const norm = normalizeRole(user.role, user.id);
  return norm === 'SUPERADMIN' || (norm === 'ADMIN' && user.storeId === 'ALL');
}

export function getRoleBadgeInfo(role, userId) {
  const norm = normalizeRole(role, userId);
  switch (norm) {
    case 'SUPERADMIN':
      return {
        label: 'Superadmin SaaS Global',
        badgeClass: 'badge-amber'
      };
    case 'ADMIN':
      return {
        label: 'Administrador da Loja',
        badgeClass: 'badge-blue'
      };
    case 'GERENTE':
      return {
        label: 'Gerente de Filial',
        badgeClass: 'badge-orange'
      };
    case 'CASHIER':
      return {
        label: 'Operador de Caixa',
        badgeClass: 'badge-emerald'
      };
    case 'ESTOQUISTA':
      return {
        label: 'Encarregado de Estoque',
        badgeClass: 'badge-blue'
      };
    case 'EMBAIXADOR':
      return {
        label: 'Embaixador Parceiro',
        badgeClass: 'badge-red'
      };
    default:
      return {
        label: 'Operador',
        badgeClass: 'badge-blue'
      };
  }
}

export function getNavSectionsForRole(role, userId) {
  const norm = normalizeRole(role, userId);
  if (norm === 'SUPERADMIN') {
    return [
      {
        label: 'PAINEL SAAS GLOBAL',
        items: [
          { id: 'MONITOR_SAAS', label: 'Monitor SaaS & Trava', icon: 'shield-check', highlight: true },
          { id: 'LOJAS', label: 'Gestão de Filiais', icon: 'building-2' },
          { id: 'EMBAIXADORES', label: 'Gestão de Embaixadores', icon: 'award' }
        ]
      },
      {
        label: 'GOVERNANÇA & SISTEMA',
        items: [
          { id: 'AUDITORIA', label: 'Auditoria & Inventário', icon: 'clipboard-check' },
          { id: 'RELATORIOS', label: 'Relatórios Consolidados', icon: 'file-bar-chart' },
          { id: 'CONFIGURACOES', label: 'Configurações da Plataforma', icon: 'settings' }
        ]
      }
    ];
  }
  if (norm === 'ADMIN') {
    return [
      {
        label: 'VISÃO GERAL',
        items: [
          { id: 'DASHBOARD', label: 'Painel da Loja', icon: 'layout-dashboard' }
        ]
      },
      {
        label: 'FRENTE DE VENDAS',
        items: [
          { id: 'PDV', label: 'Frente de Caixa (PDV)', icon: 'shopping-cart', highlight: true },
          { id: 'VENDAS', label: 'Vendas & Estornos', icon: 'receipt' },
          { id: 'ORCAMENTOS', label: 'Orçamentos de Obras', icon: 'file-spreadsheet' }
        ]
      },
      {
        label: 'ESTOQUE & LOGÍSTICA',
        items: [
          { id: 'PRODUTOS', label: 'Catálogo de Produtos', icon: 'package' },
          { id: 'ESTOQUE', label: 'Estoque & Matriz FEFO', icon: 'layers' },
          { id: 'TRANSFERENCIAS', label: 'Transferências Internas', icon: 'arrow-left-right' },
          { id: 'PERDAS', label: 'Perdas & Descartes', icon: 'trash-2' },
          { id: 'COMPRAS', label: 'Compras & Entrada', icon: 'building' },
          { id: 'ENTREGAS', label: 'Entregas em Canteiro', icon: 'truck' }
        ]
      },
      {
        label: 'FINANCEIRO & GESTÃO',
        items: [
          { id: 'CAIXA', label: 'Caixa & Fechamento', icon: 'landmark' },
          { id: 'CLIENTES', label: 'Clientes & Fiado', icon: 'users' },
          { id: 'RELATORIOS', label: 'Relatórios & DRE', icon: 'file-bar-chart' },
          { id: 'AUDITORIA', label: 'Auditoria & Inventário', icon: 'clipboard-check' },
          { id: 'CONFIGURACOES', label: 'Configurações da Loja', icon: 'settings' }
        ]
      }
    ];
  }
  if (norm === 'GERENTE') {
    return [
      {
        label: 'VISÃO GERAL',
        items: [
          { id: 'DASHBOARD', label: 'Painel Operacional', icon: 'layout-dashboard' }
        ]
      },
      {
        label: 'VENDAS & ATENDIMENTO',
        items: [
          { id: 'PDV', label: 'Frente de Caixa (PDV)', icon: 'shopping-cart', highlight: true },
          { id: 'VENDAS', label: 'Vendas & Estornos', icon: 'receipt' },
          { id: 'ORCAMENTOS', label: 'Orçamentos de Obras', icon: 'file-spreadsheet' }
        ]
      },
      {
        label: 'ESTOQUE & PÁTIO',
        items: [
          { id: 'PRODUTOS', label: 'Catálogo de Produtos', icon: 'package' },
          { id: 'ESTOQUE', label: 'Estoque & Armazém', icon: 'layers' },
          { id: 'AUDITORIA', label: 'Auditoria & Inventário', icon: 'clipboard-check' },
          { id: 'TRANSFERENCIAS', label: 'Transferências Internas', icon: 'arrow-left-right' },
          { id: 'PERDAS', label: 'Perdas & Avarias', icon: 'trash-2' },
          { id: 'COMPRAS', label: 'Recebimento de Cargas', icon: 'building' },
          { id: 'ENTREGAS', label: 'Entregas em Canteiro', icon: 'truck' }
        ]
      },
      {
        label: 'FINANCEIRO DA LOJA',
        items: [
          { id: 'CAIXA', label: 'Caixa & Fechamentos', icon: 'landmark' },
          { id: 'CLIENTES', label: 'Clientes & Fiado', icon: 'users' },
          { id: 'RELATORIOS', label: 'Relatórios da Loja', icon: 'file-bar-chart' }
        ]
      }
    ];
  }
  if (norm === 'CASHIER') {
    return [
      {
        label: 'FRENTE DE CAIXA',
        items: [
          { id: 'PDV', label: 'Frente de Caixa (PDV)', icon: 'shopping-cart', highlight: true },
          { id: 'VENDAS', label: 'Vendas do Turno', icon: 'receipt' },
          { id: 'CAIXA', label: 'Movimento de Caixa', icon: 'landmark' },
          { id: 'CLIENTES', label: 'Consulta de Clientes', icon: 'users' }
        ]
      }
    ];
  }
  if (norm === 'ESTOQUISTA') {
    return [
      {
        label: 'ARMAZÉM & PÁTIO',
        items: [
          { id: 'ESTOQUE', label: 'Estoque & Matriz FEFO', icon: 'layers', highlight: true },
          { id: 'AUDITORIA', label: 'Inventário & Confrontação', icon: 'clipboard-check' },
          { id: 'PRODUTOS', label: 'Catálogo de Materiais', icon: 'package' },
          { id: 'TRANSFERENCIAS', label: 'Transferências Internas', icon: 'arrow-left-right' },
          { id: 'PERDAS', label: 'Perdas & Descartes', icon: 'trash-2' },
          { id: 'COMPRAS', label: 'Entrada de Mercadorias', icon: 'building' },
          { id: 'ENTREGAS', label: 'Separação de Entregas', icon: 'truck' }
        ]
      }
    ];
  }
  if (norm === 'EMBAIXADOR') {
    return [
      {
        label: 'PROGRAMA DE PARCEIROS',
        items: [
          { id: 'EMBAIXADORES', label: 'Painel do Embaixador', icon: 'award', highlight: true }
        ]
      }
    ];
  }
  return [];
}
