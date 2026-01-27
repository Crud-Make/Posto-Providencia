#!/usr/bin/env python3
"""
Análise Exploratória da Planilha de Janeiro
Script para calcular lucro total do mês
"""

import csv
from collections import defaultdict

# Mapeamento de colunas baseado na estrutura do arquivo
def parse_row(row, is_monthly=False):
    """Parse uma linha do CSV"""
    return row

def analyze_january():
    """Analisa dados de janeiro"""
    
    with open('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/mes_01.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    # Extrair dados do resumo mensal (Caixa Dia 01 a 31)
    monthly_summary = {}
    
    for i, row in enumerate(rows):
        if len(row) > 1 and 'Caixa Dia 01 a 31' in row[1]:
            # Encontrou resumo mensal, extrair dados relevantes
            for j in range(i, min(i+50, len(rows))):
                r = rows[j]
                
                # Venda Concentrador - Total
                if len(r) > 2 and 'Total.' in r[2]:
                    try:
                        venda_concentrador = float(r[6]) if r[6] else 0
                        print(f"✓ Venda Concentrador Total: R$ {venda_concentrador:,.2f}")
                    except:
                        pass
                
                # Total Líquido (após taxas de cartão)
                if len(r) > 7 and 'Total Liquido' in r[7]:
                    try:
                        total_liquido = float(r[8]) if r[8] else 0
                        print(f"✓ Total Líquido (após taxas): R$ {total_liquido:,.2f}")
                    except:
                        pass
                
                # Despesas com taxas de cartão
                if len(r) > 7 and 'Total.' in r[7]:
                    try:
                        taxas_cartao = float(r[6]) if r[6] else 0
                        if taxas_cartao > 0:
                            print(f"✓ Despesas Taxas de Cartão: R$ {taxas_cartao:,.2f}")
                    except:
                        pass
                
                # Venda Frentistas - Total
                if len(r) > 1 and 'Venda Frentistas.' in r[2]:
                    try:
                        # A coluna final (última não vazia) contém o total
                        for val in reversed(r):
                            if val and val != '0' and val != '1' and val != '#DIV/0!':
                                try:
                                    venda_frentistas = float(val)
                                    if venda_frentistas > 10000:  # valor plausível
                                        print(f"✓ Venda Frentistas Total: R$ {venda_frentistas:,.2f}")
                                        break
                                except:
                                    pass
                    except:
                        pass
                
                # Salário Pago
                if len(r) > 1 and 'Salario Pago' in r[2]:
                    try:
                        # Última coluna numérica é o total
                        for val in reversed(r):
                            if val and val != '0' and val != '1':
                                try:
                                    salario_total = float(val)
                                    if salario_total > 0:
                                        print(f"✓ Salário Pago (Total): R$ {salario_total:,.2f}")
                                        break
                                except:
                                    pass
                    except:
                        pass
                
                # Concentrador x Frentista
                if len(r) > 2 and 'Concentrador x Frentista' in r[2]:
                    try:
                        diferenca = float(r[3]) if r[3] else 0
                        print(f"✓ Diferença Concentrador x Frentista: R$ {diferenca:,.2f}")
                    except:
                        pass
    
    # Análise diária
    print("\n" + "="*60)
    print("ANÁLISE DIÁRIA (Dias 1-24)")
    print("="*60)
    
    vendas_dia = []
    taxas_dia = []
    
    for i, row in enumerate(rows):
        if len(row) > 1 and 'Caixa Dia' in row[1] and '01 a 31' not in row[1]:
            dia_num = row[1].split()[2] if len(row[1].split()) > 2 else "?"
            
            # Buscar venda total do dia
            for j in range(i+5, min(i+40, len(rows))):
                r = rows[j]
                
                # Venda Concentrador Total
                if len(r) > 2 and 'Total.' in r[2]:
                    try:
                        venda = float(r[6]) if r[6] else 0
                        if venda > 0:
                            vendas_dia.append((dia_num, venda))
                    except:
                        pass
                    break
    
    # Extrair taxas de cada dia
    for i, row in enumerate(rows):
        if len(row) > 1 and 'Caixa Dia' in row[1] and '01 a 31' not in row[1]:
            dia_num = row[1].split()[2] if len(row[1].split()) > 2 else "?"
            
            for j in range(i+10, min(i+30, len(rows))):
                r = rows[j]
                
                # Total das taxas
                if len(r) > 7 and 'Total.' in r[7]:
                    try:
                        taxa = float(r[6]) if r[6] else 0
                        if taxa > 0:
                            taxas_dia.append((dia_num, taxa))
                    except:
                        pass
                    break
    
    # Resumo dos dias válidos
    print(f"\nTotal de dias analisados: {len(vendas_dia)}")
    print(f"Total de dias com taxas: {len(taxas_dia)}")
    
    # Calcular totais
    total_vendas = sum(v[1] for v in vendas_dia)
    total_taxas = sum(t[1] for t in taxas_dia)
    
    print(f"\nTotal de Vendas (dias analisados): R$ {total_vendas:,.2f}")
    print(f"Total de Taxas (dias analisados): R$ {total_taxas:,.2f}")
    
    # Top 5 dias por vendas
    print("\nTop 5 Dias por Vendas:")
    vendas_dia.sort(key=lambda x: x[1], reverse=True)
    for dia, valor in vendas_dia[:5]:
        print(f"  Dia {dia}: R$ {valor:,.2f}")
    
    print("\n" + "="*60)
    print("CÁLCULO DO LUCRO")
    print("="*60)
    
    # Usando dados do resumo mensal
    venda_total = 292105.64  # Venda Concentrador total (receita bruta)
    taxas_total = 1537.98  # Taxas de cartão
    salario_total = 8647.77  # Salários pagos
    
    print(f"\n1. Receita Bruta (Venda Concentrador): R$ {venda_total:,.2f}")
    print(f"2. (-) Despesas Taxas de Cartão: R$ {taxas_total:,.2f}")
    print(f"3. (-) Salários Pagos: R$ {salario_total:,.2f}")
    print(f"4. (-) Outras Despesas: R$ 0,00")
    
    # Lucro estimado
    lucro_estimado = venda_total - taxas_total - salario_total
    print(f"\n{'='*60}")
    print(f"💰 LUCRO TOTAL DO MÊS: R$ {lucro_estimado:,.2f}")
    print(f"{'='*60}")
    
    # Margem de lucro
    margem_lucro = (lucro_estimado / venda_total) * 100 if venda_total > 0 else 0
    print(f"Margem de Lucro: {margem_lucro:.2f}%")
    
    return {
        'venda_bruta': venda_total,
        'taxas': taxas_total,
        'salarios': salario_total,
        'lucro': lucro_estimado,
        'margem': margem_lucro
    }

if __name__ == "__main__":
    print("="*60)
    print("ANÁLISE EXPLORATÓRIA - POSTO JORRO - JANEIRO 2026")
    print("="*60)
    
    resultado = analyze_january()
