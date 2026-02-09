import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen } from 'lucide-react'
import Header from '../components/Layout/Header'
import AgentCard from '../components/Agent/AgentCard'
import { useAgents } from '../context/AgentContext'
import { useProjects } from '../context/ProjectContext'

export default function AgentList() {
    const navigate = useNavigate()
    const { agents } = useAgents()
    const { currentProject } = useProjects()
    const [searchTerm, setSearchTerm] = useState('')

    // 过滤当前项目的智能体
    const projectAgents = currentProject 
        ? agents.filter(agent => agent.projectId === currentProject.id)
        : []

    const filteredAgents = projectAgents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (agent.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // 没有选中项目时的提示
    if (!currentProject) {
        return (
            <>
                <Header title="智能体管理" />
                <div className="page-content">
                    <div className="empty-state">
                        <FolderOpen size={48} />
                        <h3>请先选择项目</h3>
                        <p>智能体属于项目，请先创建或选择一个项目</p>
                        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
                            <Plus size={18} />
                            前往项目管理
                        </button>
                    </div>
                </div>

                <style>{`
                    .empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        color: var(--text-secondary);
                    }
                    .empty-state h3 {
                        margin: var(--space-md) 0 var(--space-sm);
                    }
                    .empty-state p {
                        margin-bottom: var(--space-lg);
                    }
                `}</style>
            </>
        )
    }

    return (
        <>
            <Header title={`智能体管理 - ${currentProject.name}`} />
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

                {filteredAgents.length === 0 ? (
                    <div className="empty-state">
                        <h3>该项目还没有智能体</h3>
                        <p>创建一个智能体开始使用</p>
                        <a href="/agents/new" className="btn btn-primary">
                            <Plus size={18} />
                            创建智能体
                        </a>
                    </div>
                ) : (
                    <div className="agent-grid">
                        {filteredAgents.map(agent => (
                            <AgentCard key={agent.id} agent={agent} />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                }
                .empty-state h3 {
                    margin: var(--space-md) 0 var(--space-sm);
                }
                .empty-state p {
                    margin-bottom: var(--space-lg);
                }
            `}</style>
        </>
    )
}
