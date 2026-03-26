export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { empresa, site, segmento, cidade, estado, abrangencia, concorrentes, obs } = req.body;

  if (!empresa || !segmento || !cidade) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  const geo = abrangencia === 'cidade' ? `${cidade}${estado ? ', ' + estado : ''}`
    : abrangencia === 'regiao' ? `Região de ${cidade}${estado ? ', ' + estado : ''}`
    : abrangencia === 'estado' ? (estado || cidade)
    : 'Nacional';

  const abrangenciaTexto = {
    cidade: `somente a cidade de ${cidade}`,
    regiao: `a região de ${cidade} e cidades próximas`,
    estado: `o estado de ${estado || cidade} inteiro`,
    nacional: 'todo o Brasil'
  }[abrangencia] || `a cidade de ${cidade}`;

  const prompt = `Você é um especialista em GEO (Generative Engine Optimization) e visibilidade de marcas em IAs generativas como ChatGPT, Gemini e Perplexity.

Analise a presença em IA da seguinte empresa:
- Nome: ${empresa}
- Site: ${site || 'não informado'}
- Segmento: ${segmento}
- Área de atuação: ${abrangenciaTexto}
- Concorrentes: ${concorrentes || 'não informados'}
- Observações: ${obs || 'nenhuma'}

IMPORTANTE: Esta empresa atua em ${abrangenciaTexto}. As perguntas simuladas DEVEM incluir o recorte geográfico correto.

Simule como uma IA generativa responderia a estas 4 perguntas:
1. "Melhores empresas de ${segmento} em ${geo}"
2. "Como escolher empresa de ${segmento} em ${geo}"
3. "Vale a pena contratar ${segmento} em ${geo}"
4. "Quanto custa ${segmento} em ${geo}"

Para cada pergunta, diga se ${empresa} aparece com PRESENÇA DIRETA, PRESENÇA INDIRETA ou AUSÊNCIA TOTAL.

Avalie nas 3 dimensões (0-100):
- Autoridade: se aparece ou não nas respostas
- Cobertura: em quantos tipos de pergunta aparece
- Posicionamento: como a IA descreve o mercado local

Score Papa de Autoridade em IA = média ponderada (0-100).

Responda APENAS com JSON válido, sem texto antes ou depois, sem blocos de código:
{
  "score": 18,
  "scoreLabel": "frase curta sobre o nível de presença",
  "scoreSub": "frase de impacto sobre o que isso significa",
  "dimensoes": { "autoridade": 12, "cobertura": 15, "posicionamento": 28 },
  "diagnostico": "2-3 frases diretas sobre a situação atual no recorte de ${geo}. Mencione a empresa pelo nome.",
  "perguntasSimuladas": "Para cada uma das 4 perguntas, descreva o que a IA responderia e se ${empresa} aparece ou não.",
  "quemDomina": "Quem domina esse segmento na IA no recorte de ${geo}. Perfil de empresa, tipo de conteúdo.",
  "gaps": "3-4 lacunas específicas onde ${empresa} deveria aparecer em ${geo} mas não aparece.",
  "proximosPassos": [
    {"titulo": "título da ação", "descricao": "descrição curta e concreta"},
    {"titulo": "título da ação", "descricao": "descrição curta e concreta"},
    {"titulo": "título da ação", "descricao": "descrição curta e concreta"}
  ]
}`;

 try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('API response:', JSON.stringify(data));

    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON inválido');
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ ...result, geo });
  } catch (e) {
    console.log('Erro:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
