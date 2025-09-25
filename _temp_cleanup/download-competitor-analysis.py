#!/usr/bin/env python3
import requests
import os
from urllib.parse import urljoin, urlparse
import re
from bs4 import BeautifulSoup

def download_competitor_files():
    """Download key files from competitor for analysis"""
    base_url = "https://dsbots.pro"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    # Create directory for analysis
    os.makedirs("competitor_analysis", exist_ok=True)

    try:
        # 1. Get main page to find script references
        print("📥 Baixando página principal...")
        response = requests.get(base_url, headers=headers, timeout=10)

        if response.status_code == 200:
            with open("competitor_analysis/index.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            print("✅ index.html baixado")

            # Parse HTML to find script and CSS files
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find all script tags
            scripts = soup.find_all('script', src=True)
            links = soup.find_all('link', href=True)

            print(f"📜 Encontrados {len(scripts)} scripts e {len(links)} links")

            # Download key JavaScript files
            for script in scripts:
                src = script.get('src')
                if src and ('static' in src or 'js' in src):
                    download_file(base_url, src, "competitor_analysis", headers)

            # Download key CSS files
            for link in links:
                href = link.get('href')
                if href and ('static' in href or 'css' in href):
                    download_file(base_url, href, "competitor_analysis", headers)

        # 2. Try to get specific API endpoints (if publicly accessible)
        api_endpoints = [
            "/api/bots",
            "/api/auth/status",
            "/api/operations",
            "/static/js/main.js",
            "/static/css/main.css"
        ]

        for endpoint in api_endpoints:
            try:
                url = base_url + endpoint
                print(f"🔍 Tentando: {endpoint}")
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    filename = endpoint.replace('/', '_').replace('api_', 'api/')
                    filepath = f"competitor_analysis/{filename}"

                    # Create subdirectories if needed
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)

                    with open(filepath, "wb") as f:
                        f.write(resp.content)
                    print(f"✅ {endpoint} baixado")
            except:
                continue

        print("\n🎯 ANÁLISE DE ARQUIVOS BAIXADOS:")
        analyze_downloaded_files("competitor_analysis")

    except Exception as e:
        print(f"❌ Erro: {e}")

def download_file(base_url, file_path, output_dir, headers):
    """Download a single file"""
    try:
        if file_path.startswith('//'):
            url = 'https:' + file_path
        elif file_path.startswith('/'):
            url = base_url + file_path
        else:
            url = urljoin(base_url, file_path)

        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            # Create filename from URL
            filename = os.path.basename(urlparse(url).path) or "index"
            filepath = os.path.join(output_dir, filename)

            with open(filepath, "wb") as f:
                f.write(response.content)
            print(f"✅ {filename} baixado")
    except Exception as e:
        print(f"❌ Erro ao baixar {file_path}: {e}")

def analyze_downloaded_files(directory):
    """Analyze downloaded files for key patterns"""
    patterns_to_find = [
        r'bots?\s*[:=]',  # Bot-related code
        r'deriv|Deriv',    # Deriv API usage
        r'websocket|WebSocket', # WebSocket connections
        r'api/bots',       # API endpoints
        r'axios\.get|fetch', # HTTP requests
        r'localStorage\.getItem', # Token storage
        r'OAuth|oauth',    # OAuth handling
    ]

    findings = []

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.js', '.html', '.css')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()

                    for pattern in patterns_to_find:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            findings.append(f"📁 {file}: {pattern} -> {len(matches)} matches")

                except Exception as e:
                    continue

    if findings:
        print("\n🔍 PADRÕES ENCONTRADOS:")
        for finding in findings[:10]:  # Show first 10 findings
            print(finding)
    else:
        print("⚠️ Nenhum padrão específico encontrado")

if __name__ == "__main__":
    download_competitor_files()