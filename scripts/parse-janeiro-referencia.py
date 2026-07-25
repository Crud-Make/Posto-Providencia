import csv, re, sqlite3, os

CSV = "docs/data/mes_01.csv"
DB  = "docs/data/janeiro_referencia.sqlite"

with open(CSV, encoding="utf-8") as f:
    rows = list(csv.reader(f))

def num(x):
    x = str(x or "").strip()
    if x == "": return 0.0
    try: return round(float(x), 3)
    except: return 0.0
def norm(s): return re.sub(r"[^a-z ]","", (s or "").strip().lower())

PAY = {"pix":"pix","cartao credito":"credito","cartao debito":"debito",
       "moeda":"moeda","notas":"notas","baratao":"baratao","dinheiro":"dinheiro"}

# fronteiras dos dias
starts = []
for idx, r in enumerate(rows):
    c1 = r[1] if len(r) > 1 else ""
    m = re.match(r"Caixa Dia (\d{2}) Posto", c1 or "")
    if m: starts.append((int(m.group(1)), idx))
bounds = [(dia, s, (starts[n+1][1] if n+1<len(starts) else len(rows))) for n,(dia,s) in enumerate(starts)]

enc = {}   # dia -> list de bicos
frent = {} # dia -> {nome: {...}}
for dia, s, e in bounds:
    # --- ENCERRANTES (Venda Concentrador) ---
    ci = next((k for k in range(s,e) if norm(rows[k][2] if len(rows[k])>2 else "")=="venda concentrador"), None)
    if ci is not None:
        bicos = []
        for k in range(ci+2, e):  # +2: pula header "Produtos/Inicial/..."
            c2 = (rows[k][2] or "").strip() if len(rows[k])>2 else ""
            if norm(c2) == "total": break
            if not c2: 
                if any((rows[k][x] or "").strip() for x in range(3,8)): continue
                else: break
            r = rows[k]
            g = lambda i: num(r[i] if i < len(r) else 0)
            if g(3)==0 and g(4)==0 and g(7)==0: continue
            bicos.append({"bico": c2, "inicial": g(3), "fechamento": g(4),
                          "litros": g(5), "valor_lt": g(6), "venda_bico": g(7)})
        if bicos: enc[dia] = bicos
    # --- PAGAMENTOS POR FRENTISTA ---
    j = next((k for k in range(s,e) if norm(rows[k][2] if len(rows[k])>2 else "")=="venda frentista"), None)
    if j is not None:
        hdr = rows[j+1]; fre = {}
        for idx in range(3, len(hdr)):
            nome = (hdr[idx] or "").strip()
            if nome and "Posto" not in nome and "Caixa" not in nome and nome != "%": fre[idx]=nome
        day = {n:{"pix":0.,"credito":0.,"debito":0.,"moeda":0.,"notas":0.,"baratao":0.,"dinheiro":0.,"total":0.} for n in fre.values()}
        for k in range(j+2, e):
            lbl = norm(rows[k][2] if len(rows[k])>2 else "")
            if lbl.startswith("venda frentista"):
                for idx,n in fre.items(): day[n]["total"]=num(rows[k][idx] if idx<len(rows[k]) else 0)
                break
            if lbl in PAY:
                for idx,n in fre.items(): day[n][PAY[lbl]]=num(rows[k][idx] if idx<len(rows[k]) else 0)
        day = {n:v for n,v in day.items() if any(v.values())}
        if day: frent[dia]=day

# grava SQLite
if os.path.exists(DB): os.remove(DB)
con=sqlite3.connect(DB); cur=con.cursor()
cur.execute("""CREATE TABLE jan_encerrante(dia INT, bico TEXT, inicial REAL, fechamento REAL,
  litros REAL, valor_lt REAL, venda_bico REAL, PRIMARY KEY(dia,bico))""")
cur.execute("""CREATE TABLE jan_frentista(dia INT, frentista TEXT, pix REAL, credito REAL, debito REAL,
  moeda REAL, notas REAL, baratao REAL, dinheiro REAL, total REAL, PRIMARY KEY(dia,frentista))""")
for dia in sorted(enc):
    for b in enc[dia]:
        cur.execute("INSERT OR REPLACE INTO jan_encerrante VALUES (?,?,?,?,?,?,?)",
            (dia,b["bico"],b["inicial"],b["fechamento"],b["litros"],b["valor_lt"],b["venda_bico"]))
for dia in sorted(frent):
    for n,v in frent[dia].items():
        cur.execute("INSERT INTO jan_frentista VALUES (?,?,?,?,?,?,?,?,?,?)",
            (dia,n,v["pix"],v["credito"],v["debito"],v["moeda"],v["notas"],v["baratao"],v["dinheiro"],v["total"]))
con.commit()

print("dias c/ encerrante:", sorted(enc.keys()))
print("dias c/ frentista :", sorted(frent.keys()))
print("linhas encerrante:", cur.execute("SELECT COUNT(*) FROM jan_encerrante").fetchone()[0],
      "| linhas frentista:", cur.execute("SELECT COUNT(*) FROM jan_frentista").fetchone()[0])
print("\n== Dia 01 — ENCERRANTES ==")
for r in cur.execute("SELECT bico,inicial,fechamento,litros,valor_lt,venda_bico FROM jan_encerrante WHERE dia=1"):
    print(f"  {r[0]:16s} ini={r[1]:.3f} fim={r[2]:.3f} L={r[3]:.2f} R$/L={r[4]:.2f} vendaR$={r[5]:.2f}")
tot = cur.execute("SELECT SUM(venda_bico) FROM jan_encerrante WHERE dia=1").fetchone()[0]
print(f"  -> total venda bomba dia 01: R$ {tot:.2f}")
con.close(); print("\nSQLite:", DB)
