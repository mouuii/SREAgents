import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, Bot, Network } from 'lucide-react'
import Header from '../components/Layout/Header'
import { useProjects, useProjectDispatch, projectsApi } from '../context/ProjectContext'
import { useAgents } from '../context/AgentContext'

export default function ProjectList() {
    const navigate = useNavigate()
    const { projects, loading } = useProjects()
    const { agents } = useAgents()
    const dispatch = useProjectDispatch()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newProject, setNewProject] = useState({ name: '', description: '' })

    const handleCreate = async () => {
        if (!newProject.name.trim()) return
        try {
            const res = await projectsApi.create(newProject)
            dispatch({ type: 'ADD_PROJECT', payload: res.project })
            setShowCreateModal(false)
            setNewProject({ name: '', description: '' })
            navigate(`/projects/${res.project.id}`)
        } catch (err) {
            console.error('Failed to create project:', err)
        }
    }

    const handleDelete = async (e, project) => {
        e.stopPropagation()
        if (!confirm(`确定删除项目 "${project.name}"？`)) return
        try {
            await projectsApi.delete(project.id)
            dispatch({ type: 'DELETE_PROJECT', payload: project.id })
        } catch (err) {
            console.error('Failed to delete project:', err)
        }
    }

    const getProjectAgentCount = (projectId) => {
        return agents.filter(a => a.projectId === projectId).length
    }

    if (loading) {
        return (
            <>
                <Header title="项目" />
                <div className="page-content">
                    <div className="loading">加载中...</div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title="项目" />
            <div className="page-content">
                <div className="page-header">
                    <div className="page-title">
                        <h2>我的项目</h2>
                        <p>每个项目包含独立的智能体和服务拓扑</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        新建项目
                    </button>
                </div>

                {projects.length === 0 ? (
                    <div className="empty-state">
                        <FolderOpen size={48} strokeWidth={1.5} />
                        <h3>还没有项目</h3>
                        <p>创建一个项目开始使用智能运维助手</p>
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} />
                            创建第一个项目
                        </button>
                    </div>
                ) : (
                    <div className="project-grid">
                        {projects.map(project => (
                            <div 
                                key={project.id} 
                                className="project-card"
                                onClick={() => navigate(`/projects/${project.id}`)}
                            >
                                <div className="project-header">
                                    <div className="project-icon">📁</div>
                                    <div className="project-info">
                                        <h3>{project.name}</h3>
                                        <p>{project.description || '暂无描述'}</p>
                                    </div>
                                </div>
                                <div className="project-stats">
                                    <div className="stat-item">
                                        <Bot size={16} />
                                        <span>{getProjectAgentCount(project.id)} 个智能体</span>
                                    </div>
                                    <div className="stat-item">
                                        <Network size={16} />
                                        <span>{project.topology?.nodes?.length || 0} 个服务</span>
                                    </div>
                                </div>
                                <div className="project-footer">
                                    <span className="project-date">
                                        创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                                    </span>
                                    <button 
                                        className="btn btn-ghost btn-sm text-danger"
                                        onClick={(e) => handleDelete(e, project)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>新建项目</h3>
                        <div className="form-group">
                            <label className="form-label">项目名称</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：电商平台运维"
                                value={newProject.name}
                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">描述（可选）</label>
                            <textarea
                                className="form-input"
                                placeholder="简单描述这个项目"
                                rows={3}
                                value={newProject.description}
                                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleCreate}>
                                创建
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--space-xl);
                }
                .page-title h2 {
                    margin: 0 0 4px;
                }
                .page-title p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                .project-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--space-lg);
                }
                .project-card {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--space-lg);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .project-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .project-header {
                    display: flex;
                    gap: var(--space-md);
                    margin-bottom: var(--space-md);
                }
                .project-icon {
                    font-size: 2rem;
                }
                .project-info {
                    flex: 1;
                    min-width: 0;
                }
                .project-info h3 {
                    margin: 0 0 4px;
                    font-size: 1rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .project-info p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .project-stats {
                    display: flex;
                    gap: var(--space-lg);
                    padding: var(--space-md) 0;
                    border-top: 1px solid var(--border-color);
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: var(--space-md);
                }
                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-xs);
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .project-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .project-date {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                .empty-state {
                    text-align: center;
                    padding: 80px 20px;
                    color: var(--text-secondary);
                }
                .empty-state h3 {
                    margin: var(--space-md) 0 var(--space-sm);
                    color: var(--text-primary);
                }
                .empty-state p {
                    margin-bottom: var(--space-lg);
                }
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }
                .modal {
                    background: var(--bg-primary);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                    width: 100%;
                    max-width: 420px;
                }
                .modal h3 {
                    margin: 0 0 var(--space-lg);
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-sm);
                    margin-top: var(--space-lg);
                }
                .text-danger {
                    color: var(--danger) !important;
                }
                .loading {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-secondary);
                }
            `}</style>
        </>
    )
}
