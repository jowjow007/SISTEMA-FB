"""
Astrea → Portal Fonseca & Braga
Importa tarefas, prazos, audiências e eventos em aberto do Astrea
e grava em Firestore (astreaDiario/{YYYY-MM-DD}).

Pré-requisitos:
  pip install -r requirements.txt
  playwright install chromium
  Preencha credenciais.env com seu e-mail e senha do Astrea
  Coloque firebase-service-account.json nesta pasta (veja LEIA-ME.md)

Uso manual: python importar.py
Uso agendado (07h): execute setup-tarefa.ps1 uma vez como administrador
"""

import asyncio
import os
import re
import glob
import shutil
import sys
from pathlib import Path
from datetime import date, datetime

# Carrega .env antes de tudo
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / "credenciais.env")

import json
import requests
import pandas as pd
from playwright.async_api import async_playwright

# ── Configurações ──────────────────────────────────────────────
ASTREA_URL        = "https://astrea.net.br"
ASTREA_EMAIL      = os.getenv("ASTREA_EMAIL", "")
ASTREA_SENHA      = os.getenv("ASTREA_SENHA", "")
DOWNLOAD_DIR      = Path.home() / "Downloads" / "astrea-import"
HEADLESS          = os.getenv("ASTREA_HEADLESS", "false").lower() == "true"
# Usuário Firebase do robô (crie em console.firebase.google.com → Authentication)
FIREBASE_API_KEY  = "AIzaSyAWClOREaOXYupgzN3t2eJCddm8FcQTjfE"
FIREBASE_PROJECT  = "sistema-fb-4cce5"
ROBO_EMAIL        = os.getenv("FIREBASE_ROBO_EMAIL", "")
ROBO_SENHA        = os.getenv("FIREBASE_ROBO_SENHA", "")
# ──────────────────────────────────────────────────────────────


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


async def fazer_login(page):
    """Login no Astrea com as credenciais do .env."""
    log("Abrindo Astrea...")
    await page.goto(f"{ASTREA_URL}/#/login/", wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    log("Fazendo login...")
    await page.get_by_role("textbox", name="Digite seu email").fill(ASTREA_EMAIL)
    await page.get_by_role("textbox", name="Digite sua senha").fill(ASTREA_SENHA)
    await page.get_by_role("button", name="Entrar").click()
    await page.wait_for_timeout(3000)

    # Fecha popup de boas-vindas/novidades se aparecer
    try:
        await page.get_by_role("button", name="Fechar").click(timeout=5000)
    except Exception:
        pass

    log("Login realizado.")


async def exportar_agenda(page) -> Path | None:
    """Navega na agenda do Astrea e exporta planilha com todos os itens a concluir."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    from datetime import date as _date
    hoje = _date.today()
    data_ini = f"01/01/{hoje.year - 3}"
    data_fim = f"31/12/{hoje.year + 3}"

    log("Abrindo Agenda...")
    await page.get_by_role("link", name=" Agenda").click()
    await page.wait_for_timeout(2000)

    log("Alterando para visualização em lista...")
    await page.get_by_role("button", name="Por dia ").click()
    await page.get_by_text("Em lista").click()
    await page.wait_for_timeout(1000)

    log("Configurando filtro de atribuições (todos)...")
    # O botão pode estar com qualquer label dependendo do estado atual
    for btn_attr in ["Minhas atribuições ", "Todas as pessoas ", "atribuições "]:
        try:
            await page.get_by_role("button", name=re.compile(btn_attr, re.IGNORECASE)).click(timeout=3000)
            break
        except Exception:
            pass
    await page.wait_for_timeout(800)

    # Desmarca "Envolvidos" e "Quem criou" via JavaScript para garantir
    await page.evaluate("""
        () => {
            // Encontra todos os labels dentro do dropdown de atribuição
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
                const text = label.textContent.trim();
                if (text === 'Envolvidos' || text === 'Quem criou') {
                    const cb = label.querySelector('input[type="checkbox"]') ||
                               document.getElementById(label.getAttribute('for'));
                    if (cb && cb.checked) {
                        cb.click();
                    }
                }
            }
        }
    """)
    await page.wait_for_timeout(500)

    # Garante que "Responsáveis" está marcado
    await page.evaluate("""
        () => {
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
                const text = label.textContent.trim();
                if (text === 'Responsáveis') {
                    const cb = label.querySelector('input[type="checkbox"]') ||
                               document.getElementById(label.getAttribute('for'));
                    if (cb && !cb.checked) {
                        cb.click();
                    }
                }
            }
        }
    """)
    await page.wait_for_timeout(500)

    # Marca todas as pessoas como responsáveis
    try:
        await page.get_by_text("marcar todas").click(timeout=3000)
    except Exception:
        pass
    await page.wait_for_timeout(500)
    await page.locator("a").filter(has_text="Aplicar").first.click()
    await page.wait_for_timeout(1000)

    log("Filtrando atividades 'A concluir'...")
    # O botão pode mostrar "Todas as atividades" ou "X ATIV. A CONCLUIR" dependendo do estado
    for btn_name in ["Todas as atividades ", "atividades "]:
        try:
            await page.get_by_role("button", name=re.compile(btn_name, re.IGNORECASE)).click(timeout=3000)
            break
        except Exception:
            pass
    await page.wait_for_timeout(600)
    # Garante que apenas "A concluir" está selecionado
    try:
        await page.get_by_role("radio", name="A concluir").check(timeout=4000)
    except Exception:
        try:
            await page.get_by_role("paragraph").filter(has_text=re.compile(r"^A concluir$")).click(timeout=3000)
        except Exception:
            pass
    await page.locator("a").filter(has_text="Aplicar").nth(1).click()
    await page.wait_for_timeout(1000)

    log(f"Definindo período: {data_ini} a {data_fim}...")
    # 1) Abre o seletor de período (botão "Hoje" ou similar)
    await page.locator("a").filter(has_text="Hoje").click(timeout=5000)
    await page.wait_for_timeout(400)
    # 2) Escolhe "Definir período" no menu
    await page.get_by_text("Definir período").click(timeout=5000)
    await page.wait_for_timeout(400)
    # 3) Clica no link do intervalo atual (ex: "01/01/2026 a 31/12/2026") para revelar os campos
    await page.locator("a").filter(has_text=re.compile(r"\d{2}/\d{2}/\d{4}.*a.*\d{2}/\d{2}/\d{4}")).click(timeout=5000)
    await page.wait_for_timeout(600)
    # 4) Preenche datas usando JavaScript para forçar o valor (react-dates não aceita fill normal)
    await page.evaluate(f"""
        var inp = document.getElementById('from');
        if (inp) {{
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(inp, '{data_ini}');
            inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
            inp.dispatchEvent(new Event('change', {{ bubbles: true }}));
        }}
    """)
    await page.wait_for_timeout(400)
    await page.evaluate(f"""
        var inp = document.getElementById('to');
        if (inp) {{
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(inp, '{data_fim}');
            inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
            inp.dispatchEvent(new Event('change', {{ bubbles: true }}));
        }}
    """)
    await page.wait_for_timeout(400)
    await page.locator("a").filter(has_text="Aplicar").nth(2).click()
    await page.wait_for_timeout(2000)

    log("Exportando planilha...")
    await page.get_by_test_id("dropdown-icon").first.click()
    await page.wait_for_timeout(500)

    # O popup do Astrea é uma rota SPA que gera o Excel via JS e dispara o download
    # Capturamos o download diretamente do popup com tempo suficiente para renderizar
    async with page.expect_popup(timeout=15000) as popup_info:
        await page.get_by_text("Exportar planilha").click()
    popup = await popup_info.value

    log("Aguardando geração do arquivo no popup...")
    async with popup.expect_download(timeout=900000) as dl_info:
        # Aguarda a página do popup carregar e o JS gerar o arquivo (até 15 minutos)
        try:
            await popup.wait_for_load_state("networkidle", timeout=900000)
        except Exception:
            await popup.wait_for_timeout(30000)

    dl = await dl_info.value
    nome = dl.suggested_filename or "astrea_export.xlsx"
    dest = DOWNLOAD_DIR / nome
    await dl.save_as(dest)
    log(f"Arquivo salvo: {nome}  ({dest.stat().st_size} bytes)")
    await popup.close()
    return dest


def processar_arquivo(caminho: Path) -> list[dict]:
    """Lê o Excel/CSV e normaliza para lista de dicts."""
    log(f"Processando arquivo: {caminho.name}")
    if caminho.suffix.lower() == ".csv":
        # Tenta utf-8-sig primeiro (Excel salva assim), depois latin-1
        for enc in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                df = pd.read_csv(caminho, encoding=enc)
                break
            except Exception:
                pass
    else:
        df = pd.read_excel(caminho, engine="openpyxl")

    # Normaliza nomes de colunas
    df.columns = [str(c).strip() for c in df.columns]

    # Remove linhas totalmente vazias
    df = df.dropna(how="all")

    # Converte datas para string ISO para poder gravar no Firestore.
    # O Astrea exporta "dd/mm/aaaa" (e "dd/mm/aaaa - hh:mm" na criação): o formato é
    # explícito para o pandas não inverter dia e mês quando a 1ª linha tem dia <= 12.
    def _datas_iso(serie):
        if str(serie.dtype).startswith("datetime"):
            return serie.dt.strftime("%Y-%m-%d")
        txt = serie.astype("string").str.strip()
        br = pd.to_datetime(txt.str.slice(0, 10), format="%d/%m/%Y", errors="coerce")
        resto = pd.to_datetime(txt.where(br.isna()), dayfirst=True, errors="coerce")
        return br.fillna(resto).dt.strftime("%Y-%m-%d")

    for col in df.columns:
        if str(df[col].dtype).startswith("datetime") or "data" in col.lower() or "date" in col.lower():
            try:
                df[col] = _datas_iso(df[col])
            except Exception:
                pass

    # Substitui NaN por None (Firestore não aceita NaN)
    registros = df.where(pd.notnull(df), None).to_dict(orient="records")
    log(f"Total de registros: {len(registros)}")
    return registros


def _from_fs_value(fv: dict):
    """Converte valor Firestore REST API de volta para Python."""
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


def _fs_value(v):
    """Converte valor Python para formato Firestore REST API."""
    import math
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return {"nullValue": None}
        return {"doubleValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, list):
        return {"arrayValue": {"values": [_fs_value(i) for i in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {k: _fs_value(vv) for k, vv in v.items()}}}
    return {"stringValue": str(v)}


def _fs_doc(data: dict) -> dict:
    return {"fields": {k: _fs_value(v) for k, v in data.items()}}


def get_firebase_token() -> str:
    """Autentica o robô no Firebase via email/senha e retorna o idToken."""
    if not ROBO_EMAIL or not ROBO_SENHA:
        log("ERRO: Preencha FIREBASE_ROBO_EMAIL e FIREBASE_ROBO_SENHA em credenciais.env")
        log("      Crie o usuário robô em: console.firebase.google.com → Authentication → Add user")
        sys.exit(1)
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    resp = requests.post(url, json={"email": ROBO_EMAIL, "password": ROBO_SENHA, "returnSecureToken": True})
    if not resp.ok:
        log(f"ERRO Firebase auth: {resp.text}")
        sys.exit(1)
    return resp.json()["idToken"]


def _chave_tarefa(r: dict) -> str:
    """Chave única para identificar uma tarefa entre dias diferentes."""
    def _get(r, *nomes):
        for k in r:
            if any(n.lower() in k.lower() for n in nomes):
                return str(r[k] or '')
        return ''
    tipo = _get(r, 'tipo')
    num  = _get(r, 'número', 'numero')
    tit  = _get(r, 'título', 'titulo')
    dt   = _get(r, 'data')
    hora = _get(r, 'hora')
    return f"{tipo}|{num}|{tit}|{dt}|{hora}"


def _responsaveis_de(r: dict) -> list[str]:
    """Extrai lista de responsáveis de um registro."""
    for k in r:
        if 'responsável' in k.lower() or 'responsavel' in k.lower():
            v = str(r[k] or '')
            return [n.strip() for n in v.replace(';', ',').split(',') if n.strip()]
    return []


def buscar_registros_firestore(token: str, data_iso: str) -> list[dict]:
    """Busca registros de uma data no astreaDiario."""
    url = (f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT}"
           f"/databases/(default)/documents/astreaDiario/{data_iso}")
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    if not resp.ok:
        log(f"  Aviso: astreaDiario/{data_iso} não encontrado ({resp.status_code})")
        return []
    doc = resp.json()
    registros_field = doc.get("fields", {}).get("registros", {})
    return _from_fs_value(registros_field) or []


def calcular_delta(registros_hoje: list[dict], registros_ontem: list[dict]) -> dict:
    """Compara dois snapshots e retorna contagens de novos e concluídos por responsável."""
    chaves_hoje  = {_chave_tarefa(r): r for r in registros_hoje}
    chaves_ontem = {_chave_tarefa(r): r for r in registros_ontem}

    novos      = [r for k, r in chaves_hoje.items()  if k not in chaves_ontem]
    concluidos = [r for k, r in chaves_ontem.items() if k not in chaves_hoje]

    def por_resp(lista: list[dict]) -> dict:
        d: dict = {}
        for r in lista:
            for nome in _responsaveis_de(r):
                d[nome] = d.get(nome, 0) + 1
        return d

    return {
        "novosTotal":                len(novos),
        "concluidosTotal":           len(concluidos),
        "novosPorResponsavel":       por_resp(novos),
        "concluidosPorResponsavel":  por_resp(concluidos),
    }


def enviar_firestore(registros: list[dict], colunas: list[str]):
    """Grava os dados em Firestore via REST API (sem firebase-admin/grpcio)."""
    token = get_firebase_token()
    hoje = date.today().isoformat()
    from datetime import timezone as _tz
    from datetime import timedelta
    agora = datetime.now(_tz.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1) Grava snapshot completo do dia
    payload = _fs_doc({
        "atualizadoEm": agora,
        "data": hoje,
        "registros": registros,
        "colunas": colunas,
        "total": len(registros),
    })
    url = (f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT}"
           f"/databases/(default)/documents/astreaDiario/{hoje}")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.patch(url, headers=headers, json=payload)
    resp.raise_for_status()
    log(f"✅ Firestore atualizado: astreaDiario/{hoje}  ({len(registros)} itens)")

    # 2) Calcula delta comparando com o dia anterior e grava em astreaDelta
    try:
        ontem = (date.today() - timedelta(days=1)).isoformat()
        log(f"Calculando delta em relação a {ontem}...")
        registros_ontem = buscar_registros_firestore(token, ontem)
        if registros_ontem:
            delta = calcular_delta(registros, registros_ontem)
            delta_payload = _fs_doc({
                "data":          hoje,
                "atualizadoEm": agora,
                "totalHoje":    len(registros),
                "totalOntem":   len(registros_ontem),
                **delta,
            })
            url_delta = (f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT}"
                         f"/databases/(default)/documents/astreaDelta/{hoje}")
            resp2 = requests.patch(url_delta, headers=headers, json=delta_payload)
            resp2.raise_for_status()
            log(f"✅ Delta gravado: astreaDelta/{hoje} "
                f"— {delta['novosTotal']} novos, {delta['concluidosTotal']} concluídos")
        else:
            log("  Sem dados de ontem — delta ignorado no primeiro dia.")
    except Exception as e:
        log(f"  AVISO: delta não calculado: {e}")


def arquivar(caminho: Path):
    """Move o arquivo baixado para histórico."""
    hist = DOWNLOAD_DIR / "historico"
    hist.mkdir(exist_ok=True)
    hoje = date.today().isoformat()
    dest = hist / f"{hoje}_{caminho.name}"
    shutil.move(str(caminho), str(dest))
    log(f"Arquivo arquivado em: {dest}")


async def main():
    if not ASTREA_EMAIL or not ASTREA_SENHA:
        log("ERRO: Preencha ASTREA_EMAIL e ASTREA_SENHA em credenciais.env")
        sys.exit(1)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            downloads_path=str(DOWNLOAD_DIR),
            args=["--no-sandbox"],
        )
        ctx = await browser.new_context(
            accept_downloads=True,
            viewport={"width": 1400, "height": 900},
        )
        page = await ctx.new_page()

        await fazer_login(page)
        caminho = await exportar_agenda(page)
        await browser.close()

    if not caminho or not caminho.exists():
        log("ERRO: Nenhum arquivo para processar.")
        sys.exit(1)

    registros = processar_arquivo(caminho)
    if not registros:
        log("AVISO: Arquivo vazio — nada enviado.")
        sys.exit(0)

    colunas = list(registros[0].keys()) if registros else []
    enviar_firestore(registros, colunas)
    arquivar(caminho)
    log("Importação concluída.")


if __name__ == "__main__":
    asyncio.run(main())
