export type UsuarioPerfil = "admin" | "operador";

export interface Usuario {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  perfil_acceso: UsuarioPerfil;
  estado: "activo" | "inactivo";
  created_at: string;
}

export interface LocalAuthCredential {
  user_id: string;
  email: string;
  password: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  documento: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  estado: "activo" | "inactivo";
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  cliente_id: string;
  nombre: string;
  codigo: string | null;
  municipio: string | null;
  departamento: string | null;
  tamanho_ha: number | null;
  estado: "activo" | "inactivo";
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnaliseSoloInput {
  codigo_analise: string;
  laboratorio: string;
  controle_laboratorio: string;
  amostra_identificacao: string;
  profundidade_quimica_cm: string;
  fecha_muestreo: string;
  fecha_reporte: string;
  area_total_ha: number;
  cultura: string;
  productividad_objetivo_bolsas_ha: number;
  prnt_calcario_percent: number;
  calcio_no_calcario_percent: number;
  magnesio_no_calcario_percent: number;
  k_mg_dm3: number;
  ctc_cmol_dm3: number;
  ctc_ph7_cmol_dm3: number;
  ctc_efetiva_cmol_dm3: number;
  ca_cmol_dm3: number;
  aluminio_cmol_dm3: number;
  h_al_cmol_dm3: number;
  soma_bases_cmol_dm3: number;
  p_mg_dm3: number;
  ncp_mg_dm3: number;
  fosforo_relativo_percent: number;
  teor_argila_percent: number;
  areia_percent: number;
  silte_percent: number;
  classificacao_solo_tipo: string;
  agua_disponivel_mm_cm: number;
  prem: number;
  mg_cmol_dm3: number;
  so4_mg_dm3: number;
  b_mg_dm3: number;
  cu_mg_dm3: number;
  fe_mg_dm3: number;
  zn_mg_dm3: number;
  mn_mg_dm3: number;
  carbono_g_dm3: number;
  materia_organica_percent: number;
  materia_organica_g_dm3: number;
  saturacao_aluminio_percent: number;
  saturacao_bases_percent: number;
  relacao_ca_mg: number;
  relacao_ca_k: number;
  relacao_mg_k: number;
  relacao_k_ca_mg: number;
  k_percent_ctc: number;
  ca_percent_ctc: number;
  mg_percent_ctc: number;
  h_percent_ctc: number;
  al_percent_ctc: number;
  ph_agua: number;
  ph_smp: number;
  ph_cacl2: number;
  observaciones: string;
}

export interface AnaliseSummaryItem {
  label: string;
  value: number;
  unit: string;
}

export interface EquilibrioNutrienteCard {
  id: string;
  titulo: string;
  simbolo: string;
  grupo: "macro" | "micro";
  atual: number;
  unidade_atual: string;
  ideal: number;
  unidade_ideal: string;
  necessidade: number;
  unidade_necessidade: string;
  percentual: number;
  status: string;
  nota: string;
  origem_planilha: "Planilha2 (2)" | "Planilha2";
}

export interface CalagemResumo {
  total_calcario_kg_ha: number;
  tipo: "calcitico" | "dolomitico";
  relacao_ca_mg: number;
  ca_necessario_cmol_dm3: number;
  mg_necessario_kg_ha: number;
  participacao_ca_ctc_percent: number;
  origem_planilha: "Planilha2 (2)" | "Planilha2";
}

export interface ExtracaoProducaoRow {
  nutriente: string;
  reserva_solo_kg: number;
  necessidade_por_bolsa_kg: number;
  total_necessario_kg: number;
  saldo_kg_ha: number;
  produto_kg_ha: number;
  origem_planilha: "Planilha2 (2)" | "Planilha2";
}

export interface FormulaComercial {
  id: string;
  nome: string;
  percentual_p2o5: number;
  percentual_k2o: number;
  percentual_so4: number;
}

export interface FormulaSugerida {
  id: string;
  nome: string;
  dose_kg_ha: number;
  percentual_p2o5: number;
  percentual_k2o: number;
  percentual_so4: number;
  entrega_kg_ha: {
    p2o5: number;
    k2o: number;
    so4: number;
  };
}

export interface RecomendacaoAlerta {
  id: string;
  tipo: "info" | "warning";
  titulo: string;
  mensagem: string;
}

export interface ResultadoAnaliseSolo {
  resumo: {
    calcario_kg_ha: number;
    tipo_calcario: "calcitico" | "dolomitico";
    kcl_kg_ha: number;
    fosfato_kg_ha: number;
    enxofre_kg_ha: number;
    formula_recomendada: string;
    formula_dose_kg_ha: number;
  };
  potassio: {
    teor_atual_mg_dm3: number;
    alvo_mg_dm3: number;
    participacao_ctc: number;
    status_participacao: string;
    k_kg_ha: number;
    k2o_kg_ha: number;
    reserva_produtiva_bolsas: number;
    necessidade_k2o_kg_ha: number;
    recomendacao_kcl_kg_ha: number;
  };
  calcio: {
    teor_atual_cmol_dm3: number;
    alvo_cmol_dm3: number;
    necessidade_cmol_dm3: number;
    calcario_kg_ha: number;
    elevacao_pos_calagem_cmol_dm3: number;
    participacao_pos_calagem: number;
  };
  fosforo: {
    teor_atual_mg_dm3: number;
    equilibrio_relativo: number;
    ncp_estimado: number;
    p2o5_livre_kg_ha: number;
    reserva_produtiva_bolsas: number;
    necessidade_p2o5_kg_ha: number;
    recomendacao_produto_kg_ha: number;
  };
  magnesio: {
    teor_atual_cmol_dm3: number;
    alvo_cmol_dm3: number;
    relacao_ca_mg: number;
    recomendacao_produto_kg_ha: number;
    elevacao_pos_correcao_cmol_dm3: number;
    participacao_pos_correcao: number;
  };
  enxofre: {
    teor_atual_mg_dm3: number;
    alvo_mg_dm3: number;
    total_so4_kg_ha: number;
    deficiencia_so4_kg_ha: number;
    recomendacao_enxofre_elementar_kg_ha: number;
    reserva_produtiva_bolsas: number;
    necessidade_so4_producao_kg_ha: number;
    recomendacao_final_kg_ha: number;
  };
  fertilizante: {
    formula: string;
    dose_kg_ha: number;
    p2o5_aplicado_kg_ha: number;
    k2o_aplicado_kg_ha: number;
    so4_aplicado_kg_ha: number;
    p2o5_aproveitavel_kg_ha: number;
    k2o_aproveitavel_kg_ha: number;
    so4_aproveitavel_kg_ha: number;
    capacidade_produtiva_bolsas: {
      p2o5: number;
      k2o: number;
      so4: number;
    };
    saldo_pos_colheita_kg_ha: {
      p2o5: number;
      k2o: number;
      so4: number;
    };
  };
  micros: {
    boro: MicronutrienteResultado;
    cobre: MicronutrienteResultado;
    ferro: MicronutrienteResultado;
    zinco: MicronutrienteResultado;
    manganes: MicronutrienteResultado;
  };
  materia_organica: {
    teor_atual_percent: number;
    ideal_min_percent: number;
    ideal_max_percent: number;
    equilibrio_minimo_percent: number;
    indice_acentuado_percent: number;
  };
  recomendacao_final: {
    cultura: string;
    manutencao_apenas: boolean;
    deficit_nominal: {
      k_mg_dm3: number;
      p2o5_kg_ha: number;
      so4_kg_ha: number;
    };
    necessidade_fertilizante: {
      k2o_kg_ha: number;
      p2o5_kg_ha: number;
      so4_kg_ha: number;
    };
    formula_sugerida: FormulaSugerida | null;
  };
  alta_produtividade: {
    alvo_bolsas_ha: number;
    necessidade_k2o_kg_ha: number;
    necessidade_p2o5_kg_ha: number;
    necessidade_so4_kg_ha: number;
    disponibilidade_k2o_kg_ha: number;
    disponibilidade_p2o5_kg_ha: number;
    disponibilidade_so4_kg_ha: number;
    saldo_k2o_kg_ha: number;
    saldo_p2o5_kg_ha: number;
    saldo_so4_kg_ha: number;
  };
  equilibrio_nutricional: EquilibrioNutrienteCard[];
  calagem_resumo: CalagemResumo;
  extracao_producao: {
    cultura: string;
    linhas: ExtracaoProducaoRow[];
  };
  alertas: RecomendacaoAlerta[];
  indicadores: AnaliseSummaryItem[];
}

export interface MicronutrienteResultado {
  teor_mg_dm3: number;
  minimo_mg_dm3: number;
  maximo_mg_dm3: number;
  total_kg_ha: number;
  status: string;
  recomendacao_produto_kg_ha: number;
}

export interface ParametrosGlobais {
  k: {
    mg_dm3_para_kg_ha: number;
    fator_k_para_k2o: number;
    fator_k_para_k2o_alvo: number;
    alvo_mg_dm3: number;
    participacao_ctc_ideal: number;
    participacao_ctc_maxima: number;
    correcao_k2o_kg_ha: number;
    aproveitamento_correcao: number;
    limite_tecnico_sulco_kg_ha: number;
  };
  calcio: {
    alvo_cmol_dm3: number;
    garantia_ca_calcario: number;
    garantia_mg_calcario: number;
    prnt: number;
    fator_cmol_para_kg_ha: number;
    relacao_ca_mg_limite_calcitico: number;
    relacao_ca_mg_limite_dolomitico: number;
  };
  fosforo: {
    alvo_mg_dm3: number;
    fator_objetivo: number;
    fator_disponibilidade_solo: number;
    coeficiente_prem_a: number;
    coeficiente_prem_b: number;
    coeficiente_prem_c: number;
    teor_argila_alto: number;
    teor_argila_medio: number;
    teor_argila_baixo: number;
    retencao_argila_alta: number;
    retencao_argila_media: number;
    retencao_argila_baixa: number;
    retencao_argila_muito_baixa: number;
    constante_equilibrio_kg_ha: number;
    concentracao_produto: number;
  };
  magnesio: {
    alvo_cmol_dm3: number;
  };
  materia_organica: {
    ideal_min_percent: number;
    ideal_max_percent: number;
  };
  enxofre: {
    alvo_mg_dm3: number;
    fator_mg_dm3_para_kg_ha: number;
    fator_disponibilidade_solo: number;
    concentracao_enxofre_elementar: number;
  };
  producao: {
    cultura_padrao: string;
    produtividade_padrao_bolsas_ha: number;
    produtividade_alta_bolsas_ha: number;
    k2o_por_bolsa: number;
    fator_kcl: number;
    p2o5_por_bolsa: number;
    so4_por_bolsa: number;
  };
  micros: {
    concentracao_produto: number;
    boro: MicronutrienteParametro;
    cobre: MicronutrienteParametro;
    ferro: MicronutrienteParametro;
    zinco: MicronutrienteParametro;
    manganes: MicronutrienteParametro;
  };
  fertilizante: {
    formula_nome: string;
    dose_kg_ha: number;
    percentual_p2o5: number;
    percentual_k2o: number;
    percentual_so4: number;
    formulas_opcoes: FormulaComercial[];
  };
}

export interface MicronutrienteParametro {
  minimo_mg_dm3: number;
  maximo_mg_dm3: number;
  fator_mg_dm3_para_kg_ha: number;
}

export interface ParametroVersion {
  id: string;
  version_label: string;
  is_active: boolean;
  parametros: ParametrosGlobais;
  created_at: string;
  updated_at: string;
}

export interface AnaliseSolo {
  id: string;
  cliente_id: string;
  area_id: string;
  parametro_version_id: string;
  input: AnaliseSoloInput;
  resultado: ResultadoAnaliseSolo;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSnapshot {
  schema_version?: number;
  clientes: Cliente[];
  areas: Area[];
  analises: AnaliseSolo[];
  usuarios: Usuario[];
  local_auth_credentials?: LocalAuthCredential[];
  parametros: ParametroVersion[];
}
