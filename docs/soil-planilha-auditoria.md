# Auditoria de Paridade Soil Care x `ANALIS.xlsx`

## Fonte de verdade adotada
- `Planilha2 (2)`: interpretação nutricional, calagem, fósforo, magnésio, enxofre, micronutrientes e bloco de alta produtividade.
- `Planilha2`: cadeia de fertilizante e tabela `Extração x Produção`.
- `Planilha2` tinha referências inválidas em `S / SO₄²⁻` e ligações vazias para `K₂O`; por isso o sistema injeta na cadeia de produção os estoques auditados da `Planilha2 (2)` e mantém a estrutura de saída da `Planilha2`.

## Cenário de auditoria
- Inputs usados nos testes de ouro:
  - `K = 0.6 mg/dm³`
  - `Ca = 7 cmolc/dm³`
  - `Mg = 2 cmolc/dm³`
  - `P = 25 mg/dm³`
  - `P.Rem = 22 mg/dm³`
  - `CTC = 13.5 cmolc/dm³`
  - `Argila = 60%`
  - `S = 15 mg/dm³`
  - `B = 1`, `Cu = 6.6`, `Fe = 39`, `Zn = 12`, `Mn = 61`
  - `Meta = 60 bolsas/ha`

## Matriz de paridade
| Bloco | Planilha | Células-chave | Implementação |
| --- | --- | --- | --- |
| Potássio | `Planilha2 (2)` | `K7`, `K8`, `H10`, `I8`, `I10`, `Q15` | correção em `100 kg/ha`, participação na CTC, reserva `K₂O`, necessidade `K₂O` |
| Cálcio | `Planilha2 (2)` | `G16`, `G15`, `I14`, `I15`, `L16` | necessidade de calcário cálcico, elevação pós-calagem e participação na CTC |
| Magnésio | `Planilha2 (2)` | `K25`, `L25`, `G27`, `H27`, `G29`, `K29` | tipo de calcário, necessidade magnésica, elevação e participação |
| Fósforo | `Planilha2 (2)` | `G20`, `I17`, `G17`, `D21`, `Q19`, `Q25`, `G76` | NCP por argila, ajuste por `P.Rem`, `P₂O₅` total, livre, menos equilíbrio e alta produtividade |
| Enxofre | `Planilha2 (2)` | `F33`, `B35`, `G33`, `I33` | total de `SO₄²⁻`, saldo em relação ao alvo e recomendação corretiva acionável |
| Micronutrientes | `Planilha2 (2)` | blocos `B`, `Cu`, `Fe`, `Zn`, `Mn` entre linhas `37-65` | faixas, status e recomendação apenas quando há deficiência |
| Fertilizante | `Planilha2` | `F66`, `G67`, `H67`, `I67`, `G69`, `H69` | fórmula `30-10-6`, dose `200 kg/ha` e frações aproveitáveis |
| Extração x Produção | `Planilha2` + `Planilha2 (2)` | `G73:I80` mais reservas auditadas | tabela híbrida com estoque do solo + fertilização e saldo pós-colheita |

## Fórmulas corrigidas
- Enxofre na tabela de produção:
  - `Planilha2` tinha `#REF!` em `D61`, `D73`, `I73`, `I76`, `J80`.
  - O sistema passa a usar o estoque auditado de `SO₄²⁻` da `Planilha2 (2)` (`F33`) como entrada da cadeia de produção.
- Potássio na tabela de produção:
  - `Planilha2` dependia de `F4` vazio para `D72`.
  - O sistema usa a reserva auditada e ajustada por equilíbrio de cálcio da `Planilha2 (2)`.

## Saídas esperadas do cenário-base
- `K₂O no solo`: `306.54 kg/ha`
- `Necessidade de K₂O`: `112.875 kg/ha`
- `Calcário para Ca`: `833.33 kg/ha`
- `Calcário para Mg`: `1250 kg/ha`
- `NCP estimado`: `24.541231 mg/dm³`
- `P₂O₅ livre`: `22.5 kg/ha`
- `P₂O₅ menos equilíbrio`: `76.5 kg/ha`
- `Disponibilidade P₂O₅ alta produtividade`: `594 kg/ha`
- `SO₄²⁻ total`: `225 kg/ha`
- `Reserva K₂O para produção`: `286.104 kg/ha`
- `Saldo K₂O pós-colheita`: `226.7707 kg/ha`
- `Saldo P₂O₅ pós-colheita`: `52.5 kg/ha`
- `Saldo SO₄²⁻ pós-colheita`: `181.2 kg/ha`

## Arquivos do sistema ligados à auditoria
- Motor: `/Users/williandallalibera/primesoft-cbisa/src/modules/soil-analysis/engine.ts`
- Parâmetros: `/Users/williandallalibera/primesoft-cbisa/src/modules/soil-analysis/defaults.ts`
- Testes de ouro: `/Users/williandallalibera/primesoft-cbisa/src/modules/soil-analysis/engine.test.ts`
- UI da análise: `/Users/williandallalibera/primesoft-cbisa/src/modules/analises/AnalisesPage.tsx`
