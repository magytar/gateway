import requests

url = "http://localhost:3000/api/createpix"

# Dados que serão enviados
data = {
    "api": "c6fba688-1228-4a47-849e-f5dda2fedcb3",
    "amount": 12,           # valor em centavos ou reais dependendo da sua API
    "name": "cristina Silva",
    "document": "14909377735"
}

# Fazendo o POST
response = requests.post(url, json=data)

# Mostrando a resposta
print(response.status_code)
print(response.json())  # se a resposta for JSON
