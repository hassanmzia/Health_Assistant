import { User, Bot, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Message } from '../../types'
import { clsx } from 'clsx'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div
      className={clsx(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary-100 text-primary-600'
            : isSystem
            ? 'bg-warning-100 text-warning-600'
            : 'bg-gray-100 text-gray-600'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isSystem ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={clsx(
          'flex-1 max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary-600 text-white'
            : isSystem
            ? 'bg-warning-50 border border-warning-200'
            : 'bg-gray-100'
        )}
      >
        <div
          className={clsx(
            'prose prose-sm max-w-none',
            isUser ? 'prose-invert' : ''
          )}
        >
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                return (
                  <code
                    className={clsx(
                      'block overflow-x-auto p-2 rounded bg-gray-800 text-gray-100 text-xs',
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Metadata */}
        {message.metadata && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
            {message.metadata.queryType && (
              <span className="inline-block px-2 py-0.5 rounded bg-gray-200 mr-2">
                {message.metadata.queryType}
              </span>
            )}
            {message.metadata.status && (
              <span className="inline-block px-2 py-0.5 rounded bg-gray-200">
                {message.metadata.status}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={clsx(
            'text-xs mt-1',
            isUser ? 'text-primary-200' : 'text-gray-400'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
