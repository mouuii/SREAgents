import { useState } from 'react'
import { Plus } from 'lucide-react'
import Header from '../components/Layout/Header'
import AgentCard from '../components/Agent/AgentCard'
import { useAgents } from '../context/AgentContext'

export default function AgentList() {
    const { agents } = useAgents()
    const [searchTerm, setSearchTerm] = useState('')

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <>
            <Header title="智能体管理" />
            <div className="page-content">
                <div className="page-header">
                    <a href="/agents/new" className="btn btn-primary">
                        <Plus size={18} />
                        创建智能体
                    </a>
                </div>

                <div className="mb-md">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="搜索智能体..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                </div>

                <div className="agent-grid">
                    {filteredAgents.map(agent => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>
            </div>
        </>
    )
}
