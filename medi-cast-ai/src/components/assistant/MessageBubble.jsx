import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, CheckCircle, Loader2, AlertCircle, Copy, Check, Sparkles } from 'lucide-react';

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  const dp = toolCall.display_projection;
  const isRunning = ['pending', 'running', 'in_progress'].includes(toolCall.status);
  const isFailed = ['failed', 'error'].includes(toolCall.status);
  const isSuccess = ['completed', 'success'].includes(toolCall.status);

  if (dp?.hide_details && dp?.details_redacted) {
    const label = isRunning ? dp.active_label : isFailed ? dp.error_label : dp.label;
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
        {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3 h-3 text-emerald-500" />}
        {isFailed && <AlertCircle className="w-3 h-3 text-red-500" />}
        <span>{label || toolCall.name}</span>
      </div>
    );
  }

  let parsedResults = toolCall.results;
  if (typeof parsedResults === 'string') {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors"
      >
        {isRunning && <Loader2 className="w-3 h-3 animate-spin text-teal-500" />}
        {isSuccess && <CheckCircle className="w-3 h-3 text-emerald-500" />}
        {isFailed && <AlertCircle className="w-3 h-3 text-red-500" />}
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="font-mono">{toolCall.name?.replace(/_/g, ' ')}</span>
      </button>
      {expanded && (
        <div className="mt-1.5 ml-5 space-y-1.5 text-[11px]">
          {toolCall.arguments_string && (
            <div>
              <p className="font-semibold text-slate-500 mb-0.5">Parameters:</p>
              <pre className="bg-slate-50 rounded p-2 overflow-x-auto text-slate-600 whitespace-pre-wrap">
                {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <p className="font-semibold text-slate-500 mb-0.5">Result:</p>
              <pre className="bg-slate-50 rounded p-2 overflow-x-auto text-slate-600 whitespace-pre-wrap">
                {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : String(parsedResults)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Renders detected markdown table rows cleanly with full responsive styling
function TableBlock({ rows }) {
  if (!rows || rows.length === 0) return null;

  const parseRow = (rowStr) => {
    return rowStr
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  };

  const headers = parseRow(rows[0]);
  const dataRows = rows.slice(1).map(parseRow);

  return (
    <div className="overflow-x-auto my-3 rounded-xl border border-slate-200/90 shadow-xs bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-xs">
        <thead className="bg-teal-50/80 border-b border-teal-100">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5 text-left font-semibold text-teal-950 uppercase tracking-wider text-[11px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {dataRows.map((r, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-teal-50/20 transition-colors even:bg-slate-50/40">
              {r.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3.5 py-2.5 text-slate-700 align-top leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Separates text and table blocks so tables are always cleanly rendered
function splitIntoTableAndTextBlocks(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let currentText = [];

  const isTableSeparator = (line) => /^\|\s*[-:]+[-|\s:]*\|?$/.test(line.trim());
  const isTableRow = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.includes('|') && trimmed.length > 2;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      if (currentText.length > 0) {
        blocks.push({ type: 'text', text: currentText.join('\n') });
        currentText = [];
      }

      const headerRow = line;
      i += 2; // skip header and separator
      const rows = [headerRow];

      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i]);
        i++;
      }

      blocks.push({ type: 'table', rows });
    } else {
      currentText.push(line);
      i++;
    }
  }

  if (currentText.length > 0) {
    blocks.push({ type: 'text', text: currentText.join('\n') });
  }

  return blocks;
}

function FormattedContent({ content }) {
  // Normalize any malformed compressed pipe separators like '||' or '|||' into clean line breaks
  const normalized = (content || '')
    .replace(/\s*\|{2,}\s*/g, '\n| ')
    .replace(/\|\s*\|\s*/g, '|\n| ');

  const components = {
    h1: ({ children }) => (
      <h1 className="text-base font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-100">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-sm font-bold text-teal-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block"></span>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-700 mt-3 mb-1">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-slate-700 leading-relaxed my-2">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-4 space-y-1 my-2 text-sm text-slate-700">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-4 space-y-1 my-2 text-sm text-slate-700">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed pl-1">
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-900">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic text-slate-600">
        {children}
      </em>
    ),
    hr: () => (
      <hr className="my-3 border-slate-200" />
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-3 border-teal-500 pl-3 py-1.5 my-2.5 bg-teal-50/60 rounded-r text-xs text-slate-700 italic">
        {children}
      </blockquote>
    ),
    code: ({ inline, children }) => (
      inline ? (
        <code className="bg-slate-100 text-teal-800 font-mono text-xs px-1.5 py-0.5 rounded">
          {children}
        </code>
      ) : (
        <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs my-2 font-mono">
          <code>{children}</code>
        </pre>
      )
    ),
  };

  const blocks = splitIntoTableAndTextBlocks(normalized);

  return (
    <div className="space-y-1">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          return <TableBlock key={idx} rows={block.rows} />;
        }
        return (
          <ReactMarkdown key={idx} components={components}>
            {block.text}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] md:max-w-[80%] ${
        isUser
          ? 'bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-xs'
          : 'bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm px-5 py-4 shadow-xs text-slate-800'
      }`}>
        {!isUser && (
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-teal-800">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>MediCast Surgical Intelligence</span>
            </div>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-teal-700 transition-colors flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-slate-100"
              title="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {message.content && (
          isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <FormattedContent content={message.content} />
          )
        )}

        {message.tool_calls?.map((tc, i) => (
          <FunctionDisplay key={i} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}