import { useNavigate } from 'react-router-dom'
import { MoreVertical, Play } from 'lucide-react'

export default function AgentCard({ agent }) {
    const navigate = useNavigate()

    return (
        <div
            className="card card-clickable agent-card"
            onClick={() => navigate(`/agents/${agent.id}`)}
        >
            <div className="agent-card-header">
                <div className={`agent-avatar ${agent.gradient}`}>
                    {agent.avatar}
                </div>
                <div className="agent-info">
                    <h3 className="agent-name">{agent.name}</h3>
                    <p className="agent-description">{agent.description}</p>
                </div>
            </div>
            <div className="agent-card-footer">
                <span className="agent-date">{agent.createdAt}</span>
                <div className="flex gap-sm">
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/agents/${agent.id}/chat`)
                        }}
                    >
                        <Play size={14} />
                        运行
                    </button>
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreVertical size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}
