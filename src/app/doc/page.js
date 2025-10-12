// app/tutorial/page.js

export default function TutorialCreatePix() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Tutorial: Criando PIX via API</h1>

      {/* Python */}
      <section className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Exemplo em Python</h2>
        <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`import requests

url = "https://gateway-wine-six.vercel.app/api/createpix"

data = {
    "api": "SUA-API-KEY-AQUI",
    "amount": 1500,
    "name": "JOAO PEREIRA",
    "document": "CPF"
}

response = requests.post(url, json=data)

print(response.status_code)
print(response.json())`}
        </pre>
        <p className="text-gray-700 mt-2">
          Esse script Python envia uma requisição POST para a API e imprime a resposta.
        </p>
      </section>

      {/* Node.js com fetch */}
      <section className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Node.js usando fetch</h2>
        <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`import fetch from "node-fetch";

const url = "https://gateway-wine-six.vercel.app/api/createpix";

const data = {
  api: "SUA-API-KEY-AQUI",
  amount: 1500,
  name: "JOAO PEREIRA",
  document: "CPF"
};

async function createPix() {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  console.log(result);
}

createPix();`}
        </pre>
        <p className="text-gray-700 mt-2">
          No Node.js usamos fetch para enviar os dados ao endpoint e imprimir o resultado.
        </p>
      </section>

      {/* JavaScript no browser */}
      <section className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">JavaScript (Browser)</h2>
        <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`const url = "https://gateway-wine-six.vercel.app/api/createpix";

const data = {
  api: "SUA-API-KEY-AQUI",
  amount: 1500,
  name: "JOAO PEREIRA",
  document: "CPF"
};

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})
  .then(res => res.json())
  .then(result => console.log(result))
  .catch(err => console.error(err));`}
        </pre>
        <p className="text-gray-700 mt-2">
          No navegador podemos usar fetch diretamente. Lembre-se que algumas APIs podem bloquear requisições CORS.
        </p>
      </section>

      {/* Exemplo de resposta da API */}
      <section className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Exemplo de Resposta da API</h2>
        <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
{`200
{
  'status': 'ok',
  'result': {
    'code': '00020101021226880014br.gov.bcb.pix2566qrcode.microcashif.com.br/pix/bd0e7fc0-f342-4b83-abcd-8c6ead110cc75204000053039865802BR5925Pluggou Pagamentos Online6008SaoPaulo61080645400062070503***6304C97F',
    'base64': 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAAklEQVR4AewaftIAAA7QSURBVO3BUY7...'
  }
}`}
        </pre>
        <p className="text-gray-700 mt-2">
          Após criar o PIX, a API retorna o status da operação, o código do QR e a imagem em base64 que pode ser exibida no seu site.
        </p>
      </section>

      {/* Dicas */}
      <section className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Dicas Importantes</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Substitua os valores do payload pelos dados reais do cliente.</li>
          <li>Verifique se o endpoint está correto e acessível.</li>
          <li>Para Python use <code>requests</code>, para Node.js <code>fetch</code> ou <code>axios</code>.</li>
          <li>Teste sempre primeiro no ambiente de desenvolvimento.</li>
          <li>O <code>base64</code> pode ser convertido em imagem para exibir o QR Code.</li>
        </ul>
      </section>
    </div>
  );
}
