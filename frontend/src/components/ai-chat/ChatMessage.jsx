import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Bot, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { ToolCallCard } from './ToolCallCard';

const MarkdownComponents = {
  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse border border-border/50 rounded-md">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border/50 px-2 py-1 text-left font-semibold text-foreground/80">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border/50 px-2 py-1 text-foreground/70">{children}</td>
  ),
  tr: ({ children }) => <tr className="even:bg-muted/20">{children}</tr>,

  // Code
  code: ({ inline, children }) => {
    if (inline) {
      return (
        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-primary">
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto my-2 text-foreground/80">
        <code>{children}</code>
      </pre>
    );
  },

  // Headings
  h1: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1 text-foreground">{children}</h3>,
  h2: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
  h3: ({ children }) => <h3 className="text-xs font-semibold mt-2 mb-0.5 text-foreground/90">{children}</h3>,

  // Lists
  ul: ({ children }) => <ul className="list-disc list-inside my-1 space-y-0.5 text-foreground/80">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-1 space-y-0.5 text-foreground/80">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,

  // Paragraph
  p: ({ children }) => <p className="text-sm leading-relaxed mb-1.5 last:mb-0">{children}</p>,

  // Bold
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-2 border-border/50" />,
};

export function ChatMessage({ message }) {
  const { role, content, toolCalls, isStreaming, isError, isStopped } = message;
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2.5 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Tool calls (AI only) */}
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="w-full mb-1">
            {toolCalls.map((tc) => (
              <ToolCallCard key={tc.id || tc.name} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message bubble */}
        {(content || isStreaming) && (
          <div
            className={`relative px-3 py-2.5 rounded-2xl ${
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : isError
                ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-sm'
                : 'bg-card border border-border/50 text-foreground rounded-tl-sm'
            }`}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
            ) : (
              <div className="prose prose-sm max-w-none">
                {content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                ) : null}
                {isStreaming && !content && (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {isStreaming && content && (
                  <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
                )}
                {isStopped && (
                  <span className="text-xs text-muted-foreground italic ml-1">[stopped]</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Copy button (AI messages only, when done) */}
        {!isUser && content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
