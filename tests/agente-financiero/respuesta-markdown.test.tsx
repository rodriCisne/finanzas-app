import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RespuestaMarkdown } from '@/components/assistant/RespuestaMarkdown';

describe('respuesta Markdown del asistente', () => {
  it('renderiza negritas y tablas GFM', () => {
    const html = renderToStaticMarkup(
      <RespuestaMarkdown
        contenido={'**Subiste:**\n\n| Mes | Rodri |\n|---|---:|\n| Enero | $10 |'}
      />
    );

    expect(html).toContain('<strong');
    expect(html).toContain('Subiste:');
    expect(html).toContain('<table');
    expect(html).toContain('<th');
  });

  it('no interpreta HTML crudo proveniente del modelo', () => {
    const html = renderToStaticMarkup(
      <RespuestaMarkdown contenido={'<script>alert("xss")</script>'} />
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
