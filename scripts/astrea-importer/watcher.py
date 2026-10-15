"""
Watcher do robô Astrea — Fonseca e Braga
Fica rodando em loop e executa o importar.py quando o portal pede.

Como usar:
  python watcher.py

Deixe este script rodando em segundo plano no computador do escritório.
Ele verifica o Firestore a cada 90 segundos; quando um admin clicar
em "Executar agora" no portal, o robô dispara em até 90 segundos.
"""

import time
import subprocess
import sys
import os
import json
import requests
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / "credenciais.env")

FIREBASE_API_KEY = "AIzaSyAWClOREaOXYupgzN3t2eJCddm8FcQTjfE"
FIREBASE_PROJECT = "sistema-fb-4cce5"
ROBO_EMAIL       = os.getenv("FIREBASE_ROBO_EMAIL", "")
ROBO_SENHA       = os.getenv("FIREBASE_ROBO_SENHA", "")
POLL_INTERVAL    = 90   # segundos entre verificações
DOC_URL          = (f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT}"
                    f"/databases/(default)/documents/astreaTrigger/pedido")

_token_cache = {"token": None, "expira": 0}


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def get_token() -> str:
    agora = time.time()
    if _token_cache["token"] and agora < _token_cache["expira"]:
        return _token_cache["token"]
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    resp = requests.post(url, json={"email": ROBO_EMAIL, "password": ROBO_SENHA, "returnSecureToken": True}, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    _token_cache["token"] = data["idToken"]
    _token_cache["expira"] = agora + int(data.get("expiresIn", 3600)) - 120
    return _token_cache["token"]


def fs_get() -> dict | None:
    try:
        resp = requests.get(DOC_URL, headers={"Authorization": f"Bearer {get_token()}"}, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log(f"Erro ao ler trigger: {e}")
        return None


def fs_patch(fields: dict):
    agora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {"fields": {}}
    for k, v in fields.items():
        if isinstance(v, str):
            payload["fields"][k] = {"stringValue": v}
        elif isinstance(v, bool):
            payload["fields"][k] = {"booleanValue": v}
        elif isinstance(v, int):
            payload["fields"][k] = {"integerValue": str(v)}
    resp = requests.patch(DOC_URL, headers={"Authorization": f"Bearer {get_token()}", "Content-Type": "application/json"},
                          json=payload, timeout=10)
    resp.raise_for_status()


def fs_delete():
    requests.delete(DOC_URL, headers={"Authorization": f"Bearer {get_token()}"}, timeout=10)


def fs_str(doc: dict, campo: str) -> str:
    return doc.get("fields", {}).get(campo, {}).get("stringValue", "")


def executar_robo() -> bool:
    log("▶ Disparando importar.py...")
    resultado = subprocess.run(
        [sys.executable, str(BASE / "importar.py")],
        cwd=str(BASE),
        capture_output=False,
    )
    return resultado.returncode == 0


def verificar_e_executar():
    doc = fs_get()
    if doc is None:
        return  # nenhum pedido
    status = fs_str(doc, "status")
    if status != "pendente":
        return  # já foi processado ou está executando

    log("🔔 Pedido de execução detectado no portal — iniciando...")
    try:
        fs_patch({"status": "executando",
                  "iniciadoEm": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")})
    except Exception as e:
        log(f"Erro ao atualizar status para 'executando': {e}")
        return

    ok = executar_robo()
    agora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        fs_patch({"status": "concluido" if ok else "erro", "concluidoEm": agora})
    except Exception as e:
        log(f"Erro ao gravar status final: {e}")

    log(f"{'✅ Importação concluída' if ok else '❌ Importação falhou'}")


def main():
    log(f"Watcher iniciado — verificando a cada {POLL_INTERVAL}s.")
    log("Pressione Ctrl+C para encerrar.")
    while True:
        try:
            verificar_e_executar()
        except Exception as e:
            log(f"Erro inesperado: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
