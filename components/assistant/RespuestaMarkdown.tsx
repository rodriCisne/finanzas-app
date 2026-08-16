import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function RespuestaMarkdown({ contenido }: { contenido: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-3 whitespace-pre-wrap last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-50">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">
            {children}
          </ol>
        ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto rounded-lg border border-slate-700 last:mb-0">
            <table className="w-full border-collapse text-left text-xs tabular-nums">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-slate-700 bg-slate-800 px-2 py-2 font-semibold text-slate-200">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-800 px-2 py-2 text-slate-300 last:border-b-0">
            {children}
          </td>
        ),
        code: ({ children }) => (
          <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-xs text-slate-200">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            rel="noreferrer"
            className="text-emerald-300 underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {contenido}
    </ReactMarkdown>
  );
}
