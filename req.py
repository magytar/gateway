import requests

# Dados do pedido
pedido = "23246601"

# Headers com suas chaves
headers = {
    "x-public-key": "amandaoliveira2025amanda_1756696279052",
    "x-secret-key": "d99a9f09-c420-4ae2-a457-34c4633a0d75",
    "Content-Type": "application/json"
}

# URL da API
url = f"https://boltpagamentos.com.br/api/v1/transactions?externalId=23246601"

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()  # Vai gerar exceção se o status não for 200
    data = response.json()

    if data.get("success"):
        print("Transação encontrada com sucesso!")
        print("Dados da transação:")
        print(data["data"])
    else:
        print("Transação não encontrada ou erro:", data.get("message"))
except requests.exceptions.RequestException as e:
    print("Erro ao verificar transação:", e)
