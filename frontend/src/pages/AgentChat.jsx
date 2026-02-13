import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Loader, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Header from '../components/Layout/Header'
import { useAgents } from '../context/AgentContext'
import { useToast } from '../context/ToastContext'

export default function AgentChat() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { agents } = useAgents()

    const agent = agents.find(a => a.id === id)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [historyLoaded, setHistoryLoaded] = useState(false)
    const messagesEndRef = useRef(null)
    const toast = useToast()

    // 加载对话历史
    useEffect(() => {
        if (!id || !agent) return
        
        const loadHistory = async () => {
            try {
                const response = await fetch(`/api/chat/history/${id}`)
                if (response.ok) {
                    const data = await response.json()
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages)
                    } else {
                        // 没有历史记录，显示欢迎消息
                        setMessages([{
                            role: 'assistant',
                            content: `你好！我是 ${agent?.name || '智能体'}，${agent?.description || '有什么可以帮你的吗？'}`
                        }])
                    }
                } else {
                    setMessages([{
                        role: 'assistant',
                        content: `你好！我是 ${agent?.name || '智能体'}，${agent?.description || '有什么可以帮你的吗？'}`
                    }])
                }
            } catch {
                toast.error('加载对话历史失败')
                setMessages([{
                    role: 'assistant',
                    content: `你好！我是 ${agent?.name || '智能体'}，${agent?.description || '有什么可以帮你的吗？'}`
                }])
            }
            setHistoryLoaded(true)
        }
        
        loadHistory()
    }, [id, agent, toast])

    // 保存对话历史
    useEffect(() => {
        if (!id || !historyLoaded || messages.length === 0) return
        
        const saveHistory = async () => {
            try {
                await fetch(`/api/chat/history/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages })
                })
            } catch {
                toast.error('保存对话历史失败')
            }
        }
        
        saveHistory()
    }, [id, messages, historyLoaded, toast])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        // 先添加一个空的 assistant 消息，后续流式追加内容
        const assistantIdx = messages.length + 1 // +1 因为刚加了 user 消息
        setMessages(prev => [...prev, { role: 'assistant', content: '' }])

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 120000)

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: agent.id,
                    message: userMessage,
                    systemPrompt: agent.systemPrompt,
                }),
                signal: controller.signal
            })
            clearTimeout(timeout)

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                const errMsg = err.detail || response.statusText
                toast.error(errMsg)
                setMessages(prev => {
                    const updated = [...prev]
                    updated[assistantIdx] = { role: 'assistant', content: `请求失败: ${errMsg}` }
                    return updated
                })
                setIsLoading(false)
                return
            }

            // 读取 SSE 流
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const data = line.slice(6)
                    if (data === '[DONE]') continue

                    try {
                        const parsed = JSON.parse(data)
                        if (parsed.type === 'delta' || parsed.type === 'text') {
                            setMessages(prev => {
                                const updated = [...prev]
                                const current = updated[assistantIdx]
                                updated[assistantIdx] = {
                                    ...current,
                                    content: (current.content || '') + parsed.content
                                }
                                return updated
                            })
                        } else if (parsed.type === 'error') {
                            toast.error(parsed.content)
                            setMessages(prev => {
                                const updated = [...prev]
                                updated[assistantIdx] = {
                                    role: 'assistant',
                                    content: (prev[assistantIdx].content || '') + '\n\n错误: ' + parsed.content
                                }
                                return updated
                            })
                        }
                    } catch {
                        // 忽略解析错误
                    }
                }
            }

            // 如果流结束后消息仍为空，给个默认提示
            setMessages(prev => {
                const updated = [...prev]
                if (!updated[assistantIdx].content) {
                    updated[assistantIdx] = { role: 'assistant', content: '任务已完成。' }
                }
                return updated
            })

        } catch (err) {
            const msg = err.name === 'AbortError'
                ? '请求超时，Claude Agent 执行时间过长'
                : '后端服务不可用，请确认服务已启动'
            toast.error(msg)
            setMessages(prev => {
                const updated = [...prev]
                updated[assistantIdx] = { role: 'assistant', content: msg }
                return updated
            })
        }

        setIsLoading(false)
    }

    if (!agent) {
        return (
            <>
                <Header title="智能体未找到" />
                <div className="page-content">
                    <div className="empty-state">
                        <div className="empty-state-title">智能体不存在</div>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>
                            返回列表
                        </button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title={`对话 - ${agent.name}`} />
            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-md">
                    <button className="btn btn-ghost" onClick={() => navigate(`/agents/${id}`)}>
                        <ArrowLeft size={18} />
                        返回编辑
                    </button>
                    <div className="flex items-center gap-sm">
                        <button 
                            className="btn btn-ghost" 
                            onClick={async () => {
                                if (confirm('确定要清空对话历史吗？')) {
                                    try {
                                        await fetch(`/api/chat/history/${id}`, { method: 'DELETE' })
                                    } catch { /* ignore */ }
                                    setMessages([{
                                        role: 'assistant',
                                        content: `你好！我是 ${agent?.name || '智能体'}，${agent?.description || '有什么可以帮你的吗？'}`
                                    }])
                                }
                            }}
                            title="清空对话"
                        >
                            <Trash2 size={18} />
                        </button>
                        <div className={`agent-avatar ${agent.gradient}`} style={{ width: 32, height: 32, fontSize: '1rem' }}>
                            {agent.avatar}
                        </div>
                        <span>{agent.name}</span>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Messages */}
                    <div className="chat-messages" style={{ flex: 1, padding: 'var(--space-lg)' }}>
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`chat-message ${msg.role}`}
                            >
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.content === '' && (
                            <div className="chat-message assistant">
                                <Loader size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                                <span style={{ marginLeft: 8 }}>思考中...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="chat-input-area">
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="输入消息..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </>
    )
}
