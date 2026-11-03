"""
Agenda Astrea (Portal) → Painel de TV
Lê o snapshot mais recente de astreaDiario no Firestore (o mesmo que a sub-aba
"Agenda — Astrea" de Números do Escritório usa) e regrava agenda.csv dentro do
repositório do Painel de TV (C:\\Users\\jowjo\\painel-tv), substituindo o antigo
passo manual de exportar do Astrea e importar por cima da planilha do Google Sheets.

Pré-requisitos:
  pip install -r requirements.txt
  Preencha credenciais.env com o e-mail/senha do robô de leitura (veja LEIA-ME.md)

Uso manual: python sincronizar_agenda.py
Uso agendado (2x/dia): execute setup-tarefa.ps1 uma vez como administrador
"""

import csv
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / "credenciais.env")

import requests

# ── Configurações ──────────────────────────────────────────────
FIREBASE_API_KEY = "AIzaSyAWClOREaOXYupgzN3t2eJCddm8FcQTjfE"
FIREBASE_PROJECT = "sistema-fb-4cce5"
ROBO_EMAIL       = os.getenv("FIREBASE_ROBO_EMAIL", "")
ROBO_SENHA       = os.getenv("FIREBASE_ROBO_SENHA", "")
PAINEL_TV_DIR    = Path(os.getenv("PAINEL_TV_DIR", r"C:\Users\jowjo\painel-tv"))
AGENDA_CSV_PATH  = PAINEL_TV_DIR / "agenda.csv"
# ──────────────────────────────────────────────────────────────


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def _from_fs_value(fv: dict):
    """Converte valor Firestore REST API de volta para Python (mesma lógica do importar.py)."""
    if "nullValue"    in fv: return None
    if "booleanValue" in fv: return fv["booleanValue"]
    if "integerValue" in fv: return int(fv["integerValue"])
    if "doubleValue"  in fv: return fv["doubleValue"]
    if "stringValue"  in fv: return fv["stringValue"]
    if "arrayValue"   in fv:
        return [_from_fs_value(v) for v in fv["arrayValue"].get("values", [])]
    if "mapValue"     in fv:
        return {k: _from_fs_value(v) for k, v in fv["mapValue"].get("fields", {}).items()}
    return None


def get_firebase_token() -> str:
    """Autentica o robô de leitura no Firebase via email/senha e retorna o idToken."""
    if not ROBO_EMAIL or not ROBO_SENHA:
        log("ERRO: Preencha FIREBASE_ROBO_EMAIL e FIREBASE_ROBO_SENHA em credenciais.env")
        sys.exit(1)
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    resp = requests.post(url, json={"email": ROBO_EMAIL, "password": ROBO_SENHA, "returnSecureToken": True})
    if not resp.ok:
        log(f"ERRO Firebase auth: {resp.text}")
        sys.exit(1)
    dados = resp.json()
    log(f"Autenticado. UID (deve existir em robos/{{uid}} no Firestore): {dados.get('localId', '?')}")
    return dados["idToken"]


def buscar_snapshot_mais_recente(token: str) -> dict | None:
    """Busca o documento mais recente de astreaDiario (o de hoje, ou o último disponível
    se o robô do Astrea ainda não rodou hoje — mesma lógica de fallback da sub-aba do Portal)."""
    url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT}/databases/(default)/documents:runQuery"
    body = {
        "structuredQuery": {
            "from": [{"collectionId": "astreaDiario"}],
            "orderBy": [{"field": {"fieldPath": "data"}, "direction": "DESCENDING"}],
            "limit": 1,
        }
    }
    resp = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json=body)
    resp.raise_for_status()
    for item in resp.json():
        doc = item.get("document")
        if doc:
            return {k: _from_fs_value(v) for k, v in doc.get("fields", {}).items()}
    return None


def _iso_para_br(valor: str) -> str:
    """Converte 'YYYY-MM-DD' (formato gravado pelo importar.py) para 'DD/MM/YYYY'
    (formato que o painel de TV espera, igual ao da planilha do Google Sheets)."""
    if not valor or not isinstance(valor, str):
        return valor or ""
    try:
        return datetime.strptime(valor[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return valor


def registros_para_csv(registros: list[dict], colunas: list[str]) -> str:
    """Monta o texto CSV no mesmo formato que agenda.csv já tinha (colunas do export do Astrea)."""
    import io
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(colunas)
    for r in registros:
        linha = []
        for col in colunas:
            valor = r.get(col, "")
            if valor is None:
                valor = ""
            elif "data" in col.lower():
                valor = _iso_para_br(str(valor))
            else:
                valor = str(valor)
            linha.append(valor)
        writer.writerow(linha)
    return buf.getvalue()


def git(*args, cwd: Path, timeout=60):
    import subprocess
    return subprocess.run(["git", "-C", str(cwd)] + list(args), capture_output=True, text=True, timeout=timeout)


def publicar_no_painel_tv(csv_texto: str):
    if not PAINEL_TV_DIR.exists():
        log(f"ERRO: pasta do painel de TV não encontrada em {PAINEL_TV_DIR}")
        sys.exit(1)

    anterior = AGENDA_CSV_PATH.read_text(encoding="utf-8") if AGENDA_CSV_PATH.exists() else None
    if anterior == csv_texto:
        log("Nenhuma mudança na agenda desde a última sincronização — pulando commit.")
        return

    AGENDA_CSV_PATH.write_text(csv_texto, encoding="utf-8", newline="")

    r = git("add", "agenda.csv", cwd=PAINEL_TV_DIR)
    if r.returncode != 0:
        log(f"ERRO git add: {r.stderr}")
        sys.exit(1)

    status = git("status", "--porcelain", "agenda.csv", cwd=PAINEL_TV_DIR).stdout
    if not status.strip():
        log("Sem diferenças após git add — nada a commitar.")
        return

    hoje = datetime.now().strftime("%Y-%m-%d %H:%M")
    r = git("commit", "-m", f"Atualiza agenda a partir da Agenda Astrea do Portal (automático, {hoje})",
            "--author=jowjo <jowjow07@gmail.com>", cwd=PAINEL_TV_DIR)
    if r.returncode != 0:
        log(f"ERRO git commit: {r.stderr}")
        sys.exit(1)

    r = git("push", cwd=PAINEL_TV_DIR)
    if r.returncode != 0:
        log(f"ERRO git push: {r.stderr}")
        sys.exit(1)

    log("✅ agenda.csv atualizado e publicado no painel de TV.")


def main():
    token = get_firebase_token()
    snapshot = buscar_snapshot_mais_recente(token)
    if not snapshot:
        log("AVISO: nenhum snapshot encontrado em astreaDiario — nada a sincronizar.")
        sys.exit(0)

    registros = snapshot.get("registros") or []
    colunas = snapshot.get("colunas") or (list(registros[0].keys()) if registros else [])
    data_snapshot = snapshot.get("data", "?")
    log(f"Snapshot de {data_snapshot} com {len(registros)} itens (colunas: {len(colunas)}).")

    if not registros or not colunas:
        log("AVISO: snapshot sem registros/colunas — nada a sincronizar.")
        sys.exit(0)

    csv_texto = registros_para_csv(registros, colunas)
    publicar_no_painel_tv(csv_texto)
    log("Sincronização concluída.")


if __name__ == "__main__":
    main()
