// ================================================================
//  worker.js – Cloudflare Worker (proxy seguro para Groq)
// ================================================================

// La API Key se lee desde la variable de entorno GROQ_API_KEY
// Configúrala en el panel de Cloudflare Workers.

export default {
  async fetch(request, env) {
    // Manejar CORS preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Solo permitir POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      // Leer cuerpo de la petición
      const body = await request.json();
      const { messages } = body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'Se requiere un array de mensajes' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Validar que la API Key exista
      const apiKey = env.GROQ_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'GROQ_API_KEY no configurada en el Worker' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Llamar a la API de Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',  // o el modelo que prefieras
          messages: messages,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error de Groq:', data);
        return new Response(JSON.stringify({
          error: data.error?.message || 'Error al comunicarse con Groq'
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Extraer la respuesta del asistente
      const reply = data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';

      return new Response(JSON.stringify({ reply }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    } catch (error) {
      console.error('Error en Worker:', error);
      return new Response(JSON.stringify({ error: 'Error interno del Worker: ' + error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
};
