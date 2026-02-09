import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, File, Upload, Plus, Trash2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import Header from '../components/Layout/Header'
import { useAgents, useAgentDispatch, skillsApi } from '../context/AgentContext'

export default function SkillEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { skills } = useAgents()
    const dispatch = useAgentDispatch()

    const isNew = id === 'new'
    const existingSkill = skills.find(s => s.id === id)

    // Ensure all required fields have default values
    const defaultSkill = {
        id: '',
        name: '',
        description: '',
        icon: '🔧',
        instruction: `## Skill 名称

### 基本信息
**适用场景**：描述这个技能的使用场景

### Step 1: 描述步骤

根据需求执行相应操作

### Script_Prompt

\`\`\`text
你是一名专家，请根据以下信息...
\`\`\`

### Step 2: 执行操作

描述具体的执行步骤
`,
        config: {},
        documents: []
    }

    const [skill, setSkill] = useState(() => {
        if (existingSkill) {
            // Merge with defaults to ensure all fields exist
            return { ...defaultSkill, ...existingSkill, documents: existingSkill.documents || [] }
        }
        return defaultSkill
    })

    const [activeTab, setActiveTab] = useState('edit')
    const [showDocSection, setShowDocSection] = useState(true)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            // Generate ID from name if not set
            const skillToSave = {
                ...skill,
                id: skill.id || skill.name.toLowerCase().replace(/\s+/g, '-')
            }

            if (isNew) {
                await skillsApi.create(skillToSave)
                dispatch({ type: 'ADD_SKILL', payload: skillToSave })
            } else {
                await skillsApi.update(id, skillToSave)
                dispatch({ type: 'UPDATE_SKILL', payload: skillToSave })
            }
            navigate('/skills')
        } catch (err) {
            console.error('Failed to save skill:', err)
            alert('保存失败: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Header title={isNew ? '创建技能' : '编辑技能'} />
            <div className="page-content">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-md">
                    <button className="btn btn-ghost" onClick={() => navigate('/skills')}>
                        <ArrowLeft size={18} />
                        返回
                    </button>
                    <div className="flex gap-sm">
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                            取消
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={18} />
                            保存
                        </button>
                    </div>
                </div>

                {/* Skill Form */}
                <div className="card" style={{ maxWidth: '900px' }}>
                    <div className="form-group">
                        <label className="form-label required">技能名称</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="输入技能名称（如 document-parser）"
                            value={skill.name}
                            onChange={(e) => setSkill(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <div className="form-hint">最多64个字符，只允许小写字母、数字和连字符</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">技能描述</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="简短描述技能的功能，用于 Discovery 阶段展示给 AI"
                            value={skill.description}
                            onChange={(e) => setSkill(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label required">技能指令</label>
                        <div className="form-hint mb-md">完整的技能指令（SKILL.md 内容），当 AI 激活技能时会获取这些指令</div>

                        <div className="editor-container">
                            <div className="editor-header">
                                <div className="editor-tabs">
                                    <button
                                        className={`editor-tab ${activeTab === 'edit' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('edit')}
                                    >
                                        编辑
                                    </button>
                                    <button
                                        className={`editor-tab ${activeTab === 'preview' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('preview')}
                                    >
                                        预览
                                    </button>
                                </div>
                            </div>
                            <Editor
                                height="400px"
                                defaultLanguage="markdown"
                                theme="vs-dark"
                                value={skill.instruction}
                                onChange={(value) => setSkill(prev => ({ ...prev, instruction: value || '' }))}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                    padding: { top: 16 }
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div
                            className="flex items-center gap-sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowDocSection(!showDocSection)}
                        >
                            <span style={{ transform: showDocSection ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                            <label className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>引用文档</label>
                        </div>

                        {showDocSection && (
                            <div className="mt-md">
                                {skill.documents.length > 0 ? (
                                    <div className="document-list">
                                        {skill.documents.map(doc => (
                                            <div key={doc.id} className="document-item">
                                                <FileText size={16} className="document-icon" />
                                                <span className="document-name">{doc.name}</span>
                                                <span className="document-tag">{doc.type}</span>
                                                <button className="btn btn-sm btn-ghost">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-muted text-sm mb-md">暂无引用文档，点击下方按钮上传</div>
                                )}

                                <div className="flex gap-sm mt-md">
                                    <button className="btn btn-secondary">
                                        <Plus size={16} />
                                        创建空白Markdown文档
                                    </button>
                                    <button className="btn btn-secondary">
                                        <Upload size={16} />
                                        上传引用文档
                                    </button>
                                </div>
                                <div className="form-hint mt-md">支持 PDF、Word、Markdown、HTML、TXT 格式</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
