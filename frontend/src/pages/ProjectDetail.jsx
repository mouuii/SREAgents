import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Network, Bot, Trash2, MessageSquare, Settings } from 'lucide-react'
import Header from '../components/Layout/Header'
import { useProjects, useProjectDispatch } from '../context/ProjectContext'
import { useAgents, useAgentDispatch, agentsApi } from '../context/AgentContext'
import { useToast } from '../context/ToastContext'

export default function ProjectDetail() {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { projects } = useProjects()
    const projectDispatch = useProjectDispatch()
    const { agents } = useAgents()
    const agentDispatch = useAgentDispatch()
    const toast = useToast()
    
    const [activeTab, setActiveTab] = useState('agents')
    
    const project = projects.find(p => p.id === projectId)
    const projectAgents = agents.filter(a => a.projectId === projectId)

    useEffect(() => {
        if (project) {
            projectDispatch({ type: 'SET_CURRENT_PROJECT', payload: project })
        }
    }, [project, projectDispatch])

    const handleDeleteAgent = async (agent) => {
        if (!confirm(`确定删除智能体 "${agent.name}"？`)) return
        try {
            await agentsApi.delete(agent.id)
            agentDispatch({ type: 'DELETE_AGENT', payload: agent.id })
        } catch (err) {
            toast.error('删除智能体失败: ' + err.message)
        }
    }

    if (!project) {
        return (
            <>
                <Header title="项目详情" />
                <div className="page-content">
                    <div className="empty-state">项目不存在</div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title={project.name} />
            <div className="project-detail">
                {/* 顶部导航 */}
                <div className="detail-header">
                    <button className="btn btn-ghost" onClick={() => navigate('/projects')}>
                        <ArrowLeft size={18} />
                        返回项目列表
                    </button>
                    <div className="project-meta">
                        <span className="project-desc">{project.description || '暂无描述'}</span>
                    </div>
                </div>

                {/* Tab 切换 */}
                <div className="detail-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'agents' ? 'active' : ''}`}
                        onClick={() => setActiveTab('agents')}
                    >
                        <Bot size={18} />
                        智能体
                        <span className="tab-count">{projectAgents.length}</span>
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'topology' ? 'active' : ''}`}
                        onClick={() => setActiveTab('topology')}
                    >
                        <Network size={18} />
                        服务拓扑
                    </button>
                </div>

                {/* 内容区 */}
                <div className="detail-content">
                    {activeTab === 'agents' && (
                        <div className="agents-section">
                            <div className="section-header">
                                <h3>项目智能体</h3>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => navigate(`/projects/${projectId}/agents/new`)}
                                >
                                    <Plus size={18} />
                                    创建智能体
                                </button>
                            </div>
                            
                            {projectAgents.length === 0 ? (
                                <div className="empty-state">
                                    <Bot size={40} strokeWidth={1.5} />
                                    <p>该项目还没有智能体</p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => navigate(`/projects/${projectId}/agents/new`)}
                                    >
                                        <Plus size={18} />
                                        创建第一个智能体
                                    </button>
                                </div>
                            ) : (
                                <div className="agent-list">
                                    {projectAgents.map(agent => (
                                        <div key={agent.id} className="agent-item">
                                            <div className="agent-avatar">{agent.avatar || '🤖'}</div>
                                            <div className="agent-info">
                                                <div className="agent-name">{agent.name}</div>
                                                <div className="agent-desc">{agent.description || '暂无描述'}</div>
                                            </div>
                                            <div className="agent-actions">
                                                <button 
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => navigate(`/agents/${agent.id}/chat`)}
                                                    title="对话"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                                <button 
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => navigate(`/agents/${agent.id}`)}
                                                    title="编辑"
                                                >
                                                    <Settings size={16} />
                                                </button>
                                                <button 
                                                    className="btn btn-ghost btn-sm text-danger"
                                                    onClick={() => handleDeleteAgent(agent)}
                                                    title="删除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'topology' && (
                        <div className="topology-section">
                            <div className="section-header">
                                <h3>服务拓扑</h3>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => navigate(`/projects/${projectId}/topology`)}
                                >
                                    <Network size={18} />
                                    编辑拓扑
                                </button>
                            </div>
                            
                            <div className="topology-preview">
                                {project.topology?.nodes?.length > 0 ? (
                                    <div className="topology-summary">
                                        <div className="summary-item">
                                            <span className="summary-value">{project.topology.nodes.length}</span>
                                            <span className="summary-label">服务节点</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="summary-value">{project.topology.edges?.length || 0}</span>
                                            <span className="summary-label">连接关系</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Network size={40} strokeWidth={1.5} />
                                        <p>还没有配置服务拓扑</p>
                                        <p className="hint">服务拓扑帮助智能体理解项目架构</p>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => navigate(`/projects/${projectId}/topology`)}
                                        >
                                            <Plus size={18} />
                                            配置拓扑
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .project-detail {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .detail-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-md) var(--space-lg);
                    border-bottom: 1px solid var(--border-color);
                }
                .project-meta {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                .detail-tabs {
                    display: flex;
                    gap: var(--space-sm);
                    padding: var(--space-md) var(--space-lg);
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                }
                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-sm) var(--space-md);
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    background: var(--bg-tertiary);
                }
                .tab-btn.active {
                    background: var(--bg-primary);
                    border-color: var(--border-color);
                    color: var(--text-primary);
                }
                .tab-count {
                    background: var(--bg-tertiary);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                }
                .detail-content {
                    flex: 1;
                    padding: var(--space-lg);
                    overflow-y: auto;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-lg);
                }
                .section-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 500;
                }
                .agent-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                }
                .agent-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    transition: all 0.2s;
                }
                .agent-item:hover {
                    border-color: var(--primary);
                }
                .agent-avatar {
                    font-size: 1.5rem;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                }
                .agent-info {
                    flex: 1;
                }
                .agent-name {
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                .agent-desc {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .agent-actions {
                    display: flex;
                    gap: var(--space-xs);
                }
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary);
                }
                .empty-state p {
                    margin: var(--space-md) 0;
                }
                .empty-state .hint {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-top: 0;
                }
                .topology-preview {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                }
                .topology-summary {
                    display: flex;
                    gap: var(--space-xl);
                    justify-content: center;
                }
                .summary-item {
                    text-align: center;
                }
                .summary-value {
                    display: block;
                    font-size: 2rem;
                    font-weight: 600;
                    color: var(--primary);
                }
                .summary-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .text-danger {
                    color: var(--danger) !important;
                }
            `}</style>
        </>
    )
}
