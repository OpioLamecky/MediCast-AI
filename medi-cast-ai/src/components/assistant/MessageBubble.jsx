import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

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

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5' : ''}`}>
        {message.content && (
          isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none prose-p:my-1 prose-li:my-0.5">
              {message.content}
            </ReactMarkdown>
          )
        )}
        {message.tool_calls?.map((tc, i) => (
          <FunctionDisplay key={i} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}