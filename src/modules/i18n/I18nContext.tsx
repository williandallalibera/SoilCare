import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "pt" | "es";

type Messages = Record<string, string>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = "soil-care-locale";

const messages: Record<Locale, Messages> = {
  pt: {
    "brand.tagline": "Damos vida ao solo",
    "common.user": "Usuário",
    "common.all": "Todos",
    "common.noPhone": "Sem telefone",
    "common.loading": "Carregando...",
    "common.language": "Idioma",
    "common.portuguese": "Português",
    "common.spanish": "Espanhol",
    "common.role.admin": "Administrador",
    "common.role.operador": "Operador",
    "common.state.active": "Ativo",
    "common.state.inactive": "Inativo",
    "layout.menu.dashboard": "Painel",
    "layout.menu.clientes": "Clientes",
    "layout.menu.areas": "Áreas",
    "layout.menu.analises": "Análises",
    "layout.menu.parametros": "Parâmetros",
    "layout.menu.usuarios": "Usuários",
    "layout.logout": "Sair",
    "layout.loggingOut": "Saindo...",
    "login.subtitle": "Análise de solo com regras globais e histórico",
    "login.pendingConfig.title": "Configuração pendente:",
    "login.pendingConfig.body": "Crie um arquivo .env na raiz do projeto com",
    "login.pendingConfig.hint":
      "Enquanto isso, você pode entrar com admin@soilcare.local / teste ou com qualquer usuário cadastrado no CRUD usando a senha informada pelo admin.",
    "login.invalidCredentials":
      "Credenciais inválidas. Verifique seu email e senha e tente novamente.",
    "login.email": "E-mail",
    "login.emailPlaceholder": "exemplo@soilcare.com",
    "login.password": "Senha",
    "login.requestPassword": "Solicite ao administrador sua senha provisória.",
    "login.submit": "Entrar no sistema",
    "login.submitting": "Entrando...",
    "privateRoute.loading": "Carregando acesso...",
    "roleRoute.loadingTitle": "Carregando acesso...",
    "roleRoute.loadingHint": "Se isso demorar muito, tente recarregar a página.",
    "roleRoute.skipReview": "Pular verificação (Modo Revisão)",
    "notFound.title": "Página não encontrada",
    "notFound.body":
      "O recurso solicitado não existe, está inativo ou seu perfil não tem acesso a ele.",
    "notFound.back": "Voltar ao painel",
    "users.title": "Usuários",
    "users.subtitle": "Perfis administrador e operador.",
    "users.new": "Novo",
    "users.filterRole": "Filtrar por perfil",
    "users.loading": "Carregando usuários...",
    "users.edit": "Editar usuário",
    "users.create": "Novo usuário",
    "users.name": "Nome",
    "users.email": "E-mail",
    "users.phone": "Telefone",
    "users.initialPassword": "Senha inicial",
    "users.resetPassword": "Nova senha para reset",
    "users.passwordCreateHelp":
      "O administrador informa essa senha verbalmente ao usuário. Se deixar em branco, será usada a senha temporária Temp123456!.",
    "users.passwordEditHelp":
      "Preencha somente quando quiser redefinir a senha e informar verbalmente ao usuário. Se deixar em branco, a senha atual continua a mesma.",
    "users.profile": "Perfil",
    "users.state": "Estado",
    "users.submitCreate": "Cadastrar usuário",
    "users.submitSave": "Salvar alterações",
    "users.submitReset": "Salvar e redefinir senha",
    "users.clear": "Limpar",
    "users.message.created": "Usuário cadastrado com sucesso.",
    "users.message.updated": "Usuário atualizado com sucesso.",
    "users.message.updatedReset": "Usuário atualizado e senha redefinida.",
    "users.message.saveError": "Não foi possível salvar o usuário.",
    "dashboard.title": "Painel de análise de solo",
    "dashboard.subtitle":
      "Centralize clientes, áreas, análises e parâmetros globais em um único fluxo.",
    "dashboard.card.clientes": "Clientes",
    "dashboard.card.areas": "Áreas",
    "dashboard.card.analises": "Análises",
    "dashboard.card.usuarios": "Usuários",
    "dashboard.operation": "Estado da operação",
    "dashboard.areaTotal": "Área total cadastrada",
    "dashboard.activeParams": "Parâmetros ativos",
    "dashboard.noActiveVersion": "Sem versão ativa",
    "dashboard.v1Title": "O que já está no V1",
    "dashboard.v1.1": "Motor de cálculo em TypeScript separado da interface.",
    "dashboard.v1.2": "Persistência no Supabase com modo local de revisão quando necessário.",
    "dashboard.v1.3": "Histórico de versões de parâmetros e snapshot por análise.",
    "dashboard.v1.4":
      "Fluxo administrativo para clientes, áreas, análises, parâmetros e usuários.",
    "clientes.title": "Clientes",
    "clientes.subtitle": "Cadastro base para análises e áreas.",
    "clientes.new": "Novo",
    "clientes.searchPlaceholder": "Buscar por nome, documento, contato ou cidade",
    "clientes.loading": "Carregando clientes...",
    "clientes.noResults": "Nenhum cliente encontrado.",
    "clientes.edit": "Editar cliente",
    "clientes.create": "Novo cliente",
    "clientes.name": "Nome",
    "clientes.document": "Documento",
    "clientes.contact": "Contato",
    "clientes.phone": "Telefone",
    "clientes.email": "E-mail",
    "clientes.city": "Cidade",
    "clientes.state": "Estado",
    "clientes.notes": "Observações",
    "clientes.submitCreate": "Cadastrar cliente",
    "clientes.submitSave": "Salvar alterações",
    "clientes.clear": "Limpar",
    "clientes.noContact": "Sem contato",
    "clientes.noCity": "Sem cidade",
    "clientes.noEmail": "Sem e-mail",
    "areas.title": "Áreas",
    "areas.subtitle": "Talhões e áreas vinculadas a cada cliente.",
    "areas.new": "Nova",
    "areas.filterClient": "Filtrar por cliente",
    "areas.loading": "Carregando áreas...",
    "areas.noResults": "Nenhuma área encontrada.",
    "areas.edit": "Editar área",
    "areas.create": "Nova área",
    "areas.client": "Cliente",
    "areas.select": "Selecione",
    "areas.name": "Nome da área",
    "areas.code": "Código",
    "areas.city": "Município",
    "areas.department": "Departamento",
    "areas.size": "Tamanho (ha)",
    "areas.state": "Estado",
    "areas.notes": "Observações",
    "areas.submitCreate": "Cadastrar área",
    "areas.submitSave": "Salvar alterações",
    "areas.clear": "Limpar",
    "areas.clientMissing": "Cliente não encontrado",
    "areas.noMunicipality": "Sem município",
    "parametros.versions": "Versões de parâmetros",
    "parametros.loading": "Carregando parâmetros...",
    "parametros.active": "Ativa",
    "parametros.globals": "Parâmetros globais",
    "parametros.globalsHelp":
      "Editáveis apenas pelo admin e aplicados em novas análises.",
    "parametros.newVersionLabel": "Novo rótulo de versão",
    "parametros.banner":
      "Ajuste aqui apenas os valores que realmente mudam o cálculo. Os parâmetros ficam separados por tema para facilitar manutenção e revisão com o agrônomo.",
    "parametros.publish": "Publicar nova versão",
    "parametros.restore": "Voltar para ativa",
    "analises.title": "Análises",
    "analises.subtitle": "Histórico dos laudos cadastrados.",
    "analises.new": "Nova",
    "analises.filterClient": "Filtrar por cliente",
    "analises.loading": "Carregando análises...",
    "analises.clientFallback": "Cliente",
    "analises.areaFallback": "Área",
    "analises.collection": "Coleta",
    "analises.target": "Meta",
    "analises.bagsPerHa": "bolsas/ha",
    "analises.edit": "Editar análise de solo",
    "analises.create": "Nova análise de solo",
    "analises.heroText":
      "A ideia é simples: você copia o laudo, o Soil Care interpreta e já mostra a recomendação visualmente.",
    "analises.heroHint":
      "Nesta etapa estamos usando apenas o núcleo da planilha. Parâmetros fixos como PRNT, garantias do calcário, fórmula comercial e fatores de aproveitamento ficam na configuração do sistema.",
    "analises.systemCalculated": "Valores calculados pelo sistema",
    "analises.reportData": "Dados do laudo",
    "analises.reportHelp": "Só o mínimo para identificar a análise no sistema.",
    "analises.macros": "Macronutrientes",
    "analises.macrosHelp":
      "Copie do laudo apenas os valores medidos pelo laboratório.",
  },
  es: {
    "brand.tagline": "Damos vida al suelo",
    "common.user": "Usuario",
    "common.all": "Todos",
    "common.noPhone": "Sin teléfono",
    "common.loading": "Cargando...",
    "common.language": "Idioma",
    "common.portuguese": "Portugués",
    "common.spanish": "Español",
    "common.role.admin": "Administrador",
    "common.role.operador": "Operador",
    "common.state.active": "Activo",
    "common.state.inactive": "Inactivo",
    "layout.menu.dashboard": "Panel",
    "layout.menu.clientes": "Clientes",
    "layout.menu.areas": "Áreas",
    "layout.menu.analises": "Análisis",
    "layout.menu.parametros": "Parámetros",
    "layout.menu.usuarios": "Usuarios",
    "layout.logout": "Salir",
    "layout.loggingOut": "Saliendo...",
    "login.subtitle": "Análisis de suelo con reglas globales e historial",
    "login.pendingConfig.title": "Configuración pendiente:",
    "login.pendingConfig.body": "Cree un archivo .env en la raíz del proyecto con",
    "login.pendingConfig.hint":
      "Mientras tanto, puede ingresar con admin@soilcare.local / teste o con cualquier usuario creado en el CRUD usando la contraseña informada por el administrador.",
    "login.invalidCredentials":
      "Credenciales inválidas. Verifique su email y contraseña e intente nuevamente.",
    "login.email": "Correo electrónico",
    "login.emailPlaceholder": "ejemplo@soilcare.com",
    "login.password": "Contraseña",
    "login.requestPassword": "Solicite al administrador su contraseña provisoria.",
    "login.submit": "Entrar al sistema",
    "login.submitting": "Ingresando...",
    "privateRoute.loading": "Cargando acceso...",
    "roleRoute.loadingTitle": "Cargando acceso...",
    "roleRoute.loadingHint": "Si esto demora mucho, intenta recargar la página.",
    "roleRoute.skipReview": "Saltar verificación (Modo Revisión)",
    "notFound.title": "Página no encontrada",
    "notFound.body":
      "El recurso solicitado no existe, está inactivo o su perfil no tiene acceso a él.",
    "notFound.back": "Volver al panel",
    "users.title": "Usuarios",
    "users.subtitle": "Perfiles administrador y operador.",
    "users.new": "Nuevo",
    "users.filterRole": "Filtrar por perfil",
    "users.loading": "Cargando usuarios...",
    "users.edit": "Editar usuario",
    "users.create": "Nuevo usuario",
    "users.name": "Nombre",
    "users.email": "Correo electrónico",
    "users.phone": "Teléfono",
    "users.initialPassword": "Contraseña inicial",
    "users.resetPassword": "Nueva contraseña para reset",
    "users.passwordCreateHelp":
      "El administrador informa esta contraseña verbalmente al usuario. Si la deja vacía, se usará la contraseña temporal Temp123456!.",
    "users.passwordEditHelp":
      "Complete solo cuando quiera redefinir la contraseña e informarla verbalmente al usuario. Si la deja vacía, la contraseña actual se mantiene.",
    "users.profile": "Perfil",
    "users.state": "Estado",
    "users.submitCreate": "Registrar usuario",
    "users.submitSave": "Guardar cambios",
    "users.submitReset": "Guardar y redefinir contraseña",
    "users.clear": "Limpiar",
    "users.message.created": "Usuario registrado con éxito.",
    "users.message.updated": "Usuario actualizado con éxito.",
    "users.message.updatedReset": "Usuario actualizado y contraseña redefinida.",
    "users.message.saveError": "No se pudo guardar el usuario.",
    "dashboard.title": "Panel de análisis de suelo",
    "dashboard.subtitle":
      "Centralice clientes, áreas, análisis y parámetros globales en un solo flujo.",
    "dashboard.card.clientes": "Clientes",
    "dashboard.card.areas": "Áreas",
    "dashboard.card.analises": "Análisis",
    "dashboard.card.usuarios": "Usuarios",
    "dashboard.operation": "Estado de la operación",
    "dashboard.areaTotal": "Área total registrada",
    "dashboard.activeParams": "Parámetros activos",
    "dashboard.noActiveVersion": "Sin versión activa",
    "dashboard.v1Title": "Lo que ya está en la V1",
    "dashboard.v1.1": "Motor de cálculo en TypeScript separado de la interfaz.",
    "dashboard.v1.2":
      "Persistencia en Supabase con modo local de revisión cuando sea necesario.",
    "dashboard.v1.3": "Historial de versiones de parámetros y snapshot por análisis.",
    "dashboard.v1.4":
      "Flujo administrativo para clientes, áreas, análisis, parámetros y usuarios.",
    "clientes.title": "Clientes",
    "clientes.subtitle": "Base de registro para análisis y áreas.",
    "clientes.new": "Nuevo",
    "clientes.searchPlaceholder": "Buscar por nombre, documento, contacto o ciudad",
    "clientes.loading": "Cargando clientes...",
    "clientes.noResults": "No se encontraron clientes.",
    "clientes.edit": "Editar cliente",
    "clientes.create": "Nuevo cliente",
    "clientes.name": "Nombre",
    "clientes.document": "Documento",
    "clientes.contact": "Contacto",
    "clientes.phone": "Teléfono",
    "clientes.email": "Correo electrónico",
    "clientes.city": "Ciudad",
    "clientes.state": "Estado",
    "clientes.notes": "Observaciones",
    "clientes.submitCreate": "Registrar cliente",
    "clientes.submitSave": "Guardar cambios",
    "clientes.clear": "Limpiar",
    "clientes.noContact": "Sin contacto",
    "clientes.noCity": "Sin ciudad",
    "clientes.noEmail": "Sin email",
    "areas.title": "Áreas",
    "areas.subtitle": "Lotes y áreas vinculadas a cada cliente.",
    "areas.new": "Nueva",
    "areas.filterClient": "Filtrar por cliente",
    "areas.loading": "Cargando áreas...",
    "areas.noResults": "No se encontraron áreas.",
    "areas.edit": "Editar área",
    "areas.create": "Nueva área",
    "areas.client": "Cliente",
    "areas.select": "Seleccione",
    "areas.name": "Nombre del área",
    "areas.code": "Código",
    "areas.city": "Municipio",
    "areas.department": "Departamento",
    "areas.size": "Tamaño (ha)",
    "areas.state": "Estado",
    "areas.notes": "Observaciones",
    "areas.submitCreate": "Registrar área",
    "areas.submitSave": "Guardar cambios",
    "areas.clear": "Limpiar",
    "areas.clientMissing": "Cliente no encontrado",
    "areas.noMunicipality": "Sin municipio",
    "parametros.versions": "Versiones de parámetros",
    "parametros.loading": "Cargando parámetros...",
    "parametros.active": "Activa",
    "parametros.globals": "Parámetros globales",
    "parametros.globalsHelp":
      "Editables solo por el admin y aplicados en nuevos análisis.",
    "parametros.newVersionLabel": "Nuevo rótulo de versión",
    "parametros.banner":
      "Ajuste aquí solo los valores que realmente cambian el cálculo. Los parámetros quedan separados por tema para facilitar mantenimiento y revisión con el agrónomo.",
    "parametros.publish": "Publicar nueva versión",
    "parametros.restore": "Volver a la activa",
    "analises.title": "Análisis",
    "analises.subtitle": "Historial de los informes registrados.",
    "analises.new": "Nueva",
    "analises.filterClient": "Filtrar por cliente",
    "analises.loading": "Cargando análisis...",
    "analises.clientFallback": "Cliente",
    "analises.areaFallback": "Área",
    "analises.collection": "Muestreo",
    "analises.target": "Meta",
    "analises.bagsPerHa": "bolsas/ha",
    "analises.edit": "Editar análisis de suelo",
    "analises.create": "Nuevo análisis de suelo",
    "analises.heroText":
      "La idea es simple: usted copia el informe, Soil Care lo interpreta y ya muestra la recomendación visualmente.",
    "analises.heroHint":
      "En esta etapa estamos usando solo el núcleo de la planilla. Parámetros fijos como PRNT, garantías del calcáreo, fórmula comercial y factores de aprovechamiento quedan en la configuración del sistema.",
    "analises.systemCalculated": "Valores calculados por el sistema",
    "analises.reportData": "Datos del informe",
    "analises.reportHelp": "Solo lo mínimo para identificar el análisis en el sistema.",
    "analises.macros": "Macronutrientes",
    "analises.macrosHelp":
      "Copie del informe solo los valores medidos por el laboratorio.",
  },
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "pt";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "pt" || stored === "es") {
    return stored;
  }

  const browserLocale = window.navigator.language.toLowerCase();
  return browserLocale.startsWith("es") ? "es" : "pt";
}

function resolveMessage(locale: Locale, key: string): string {
  return messages[locale][key] ?? messages.pt[key] ?? key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
      },
      t(key) {
        return resolveMessage(locale, key);
      },
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
