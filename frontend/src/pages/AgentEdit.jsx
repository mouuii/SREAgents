import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Save, Play, FileText, Settings as SettingsIcon } from 'lucide-react'
import Header from '../components/Layout/Header'
import SkillCard from '../components/Skill/SkillCard'
import Modal from '../components/common/Modal'
import { useAgents, useAgentDispatch, agentsApi } from '../context/AgentContext'
import { useProjects } from '../context/ProjectContext'
import { useToast } from '../context/ToastContext'

export default function AgentEdit() {
    const { id, projectId } = useParams()
    const navigate = useNavigate()
    const { agents, skills } = useAgents()
    const dispatch = useAgentDispatch()
    const { currentProject, projects } = useProjects()
    const toast = useToast()

    // 从 URL 或 currentProject 获取项目 ID
    const targetProjectId = projectId || currentProject?.id || ''
    const targetProject = projects.find(p => p.id === targetProjectId)

    const isNew = id === 'new' || !id
    const existingAgent = agents.find(a => a.id === id)

    const [agent, setAgent] = useState(() => {
        if (isNew) {
            return {
                id: `agent-${Date.now()}`,
                name: '',
                description: '',
                avatar: '🤖',
                gradient: 'gradient-1',
                model: 'qn-plus',
                systemPrompt: '',
                skills: [],
                projectId: targetProjectId,
                createdAt: new Date().toLocaleDateString('zh-CN')
            }
        }
        return existingAgent || null
    })

    const [showSkillModal, setShowSkillModal] = useState(false)

    if (!agent) {
        return (
            <>
                <Header title={isNew ? "创建智能体" : "编辑智能体"} />
                <div className="page-content">
                    <div className="text-center text-muted">加载中...</div>
                </div>
            </>
        )
    }

    const agentSkills = (agent.skills || []).map(skillId =>
        skills.find(s => s.id === skillId)
    ).filter(Boolean)

    const availableSkills = skills.filter(s => !(agent.skills || []).includes(s.id))

    const handleSave = async () => {
        if (!agent.name.trim()) {
            toast.warning('请输入智能体名称')
            return
        }
        const agentData = { ...agent, projectId: targetProjectId }
        try {
            if (isNew) {
                const result = await agentsApi.create(agentData)
                dispatch({ type: 'ADD_AGENT', payload: result.agent })
                toast.success('智能体创建成功')
            } else {
                const result = await agentsApi.update(agentData.id, agentData)
                dispatch({ type: 'UPDATE_AGENT', payload: result.agent })
                toast.success('智能体保存成功')
            }
            if (targetProjectId) {
                navigate(`/projects/${targetProjectId}`)
            } else {
                navigate('/')
            }
        } catch (err) {
            toast.error('保存失败: ' + err.message)
        }
    }

    const handleBack = () => {
        if (targetProjectId) {
            navigate(`/projects/${targetProjectId}`)
        } else {
            navigate('/')
        }
    }

    const handleAddSkill = (skill) => {
        setAgent(prev => ({
            ...prev,
            skills: [...(prev.skills || []), skill.id]
        }))
        setShowSkillModal(false)
    }

    const handleRemoveSkill = (skillId) => {
        setAgent(prev => ({
            ...prev,
            skills: (prev.skills || []).filter(id => id !== skillId)
        }))
    }

    return (
        <>
            <Header title={isNew ? `创建智能体 - ${targetProject?.name || ''}` : '编辑智能体'} />
            <div className="page-content">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-md">
                    <button className="btn btn-ghost" onClick={handleBack}>
                        <ArrowLeft size={18} />
                        返回
                    </button>
                    <div className="flex gap-sm">
                        {!isNew && (
                            <button className="btn btn-secondary" onClick={() => navigate(`/agents/${id}/chat`)}>
                                <Play size={18} />
                                预览与调试
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={18} />
                            {isNew ? '创建' : '保存'}
                        </button>
                    </div>
                </div>

                {/* Split Panel Layout */}
                <div className="split-panel">
                    {/* Left: System Prompt */}
                    <div className="panel">
                        <div className="panel-header">
                            <FileText size={16} />
                            系统提示词
                        </div>
                        <div className="panel-body">
                            <div className="form-group">
                                <label className="form-label">角色设定</label>
                                <textarea
                                    className="form-textarea"
                                    style={{ height: '200px' }}
                                    placeholder="输入智能体的角色设定，可以增强智能体对话的记住定制化..."
                                    value={agent.systemPrompt}
                                    onChange={(e) => setAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Middle: Config */}
                    <div className="panel">
                        <div className="panel-header">
                            <SettingsIcon size={16} />
                            编排
                        </div>
                        <div className="panel-body">
                            <div className="form-group">
                                <label className="form-label">模型</label>
                                <select
                                    className="form-select"
                                    value={agent.model}
                                    onChange={(e) => setAgent(prev => ({ ...prev, model: e.target.value }))}
                                >
                                    <option value="qn-plus">qn-plus</option>
                                    <option value="claude-3">claude-3</option>
                                    <option value="gpt-4">gpt-4</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">智能体名称</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="输入智能体名称"
                                    value={agent.name}
                                    onChange={(e) => setAgent(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">描述</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="输入描述"
                                    value={agent.description}
                                    onChange={(e) => setAgent(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">用户提示词模板</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="可以使用变量替换成智能体定制化的提示词..."
                                    style={{ height: '80px' }}
                                />
                                <button className="btn btn-sm btn-secondary mt-md">
                                    <Plus size={14} />
                                    变量
                                </button>
                            </div>

                            <div className="form-group">
                                <div className="flex items-center justify-between mb-md">
                                    <label className="form-label" style={{ marginBottom: 0 }}>技能</label>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setShowSkillModal(true)}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-sm">
                                    {agentSkills.map(skill => (
                                        <SkillCard
                                            key={skill.id}
                                            skill={skill}
                                            onDelete={() => handleRemoveSkill(skill.id)}
                                            onEdit={() => navigate(`/skills/${skill.id}`)}
                                        />
                                    ))}
                                    {agentSkills.length === 0 && (
                                        <div className="text-muted text-sm">暂无技能，点击上方按钮添加</div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">知识库</label>
                                <div className="text-muted text-sm">暂无知识库，点击右上角 + 号添加</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="panel">
                        <div className="panel-header">
                            <Play size={16} />
                            预览与调试
                        </div>
                        <div className="panel-body">
                            <div className="chat-preview">
                                <div className="chat-messages">
                                    <div className="chat-message assistant">
                                        你好！我是 {agent.name || '智能体'}，有什么可以帮你的吗？
                                    </div>
                                </div>
                                <div className="chat-input-area">
                                    <input
                                        type="text"
                                        className="chat-input"
                                        placeholder="输入消息测试..."
                                    />
                                    <button className="btn btn-primary">发送</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Skill Modal */}
            <Modal
                isOpen={showSkillModal}
                onClose={() => setShowSkillModal(false)}
                title="添加技能"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowSkillModal(false)}>
                            取消
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/skills/new')}>
                            <Plus size={16} />
                            创建新技能
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-sm">
                    {availableSkills.map(skill => (
                        <div
                            key={skill.id}
                            className="skill-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleAddSkill(skill)}
                        >
                            <div className="skill-icon" style={{ background: 'var(--accent-light)' }}>
                                {skill.icon || '🔧'}
                            </div>
                            <div className="skill-info">
                                <div className="skill-name">{skill.name}</div>
                                <div className="skill-description">{skill.description}</div>
                            </div>
                        </div>
                    ))}
                    {availableSkills.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-title">没有可用的技能</div>
                            <div className="empty-state-description">所有技能已添加或尚未创建技能</div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    )
}
