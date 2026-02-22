import requests
import json

# Configuração da sua chave de API
API_KEY = "AIzaSyAZl3kJ84Ibur3IIhNZgPOMXsRnNHz_iYc"
URL = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

def listar_modelos():
    print("--- Modelos Disponíveis na sua API Google (via Request Direto) ---\n")
    try:
        response = requests.get(URL)
        if response.status_code == 200:
            data = response.json()
            for model in data.get('models', []):
                # Filtra apenas modelos que suportam geração de conteúdo
                if 'generateContent' in model.get('supportedGenerationMethods', []):
                    print(f"ID: {model.get('name')}")
                    print(f"Nome: {model.get('displayName')}")
                    print(f"Input Limit: {model.get('inputTokenLimit')}")
                    print("-" * 30)
        else:
            print(f"Erro na API: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Ocorreu um erro: {e}")

if __name__ == "__main__":
    listar_modelos()
