import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, File, Plus, Trash2, FolderOpen } from 'lucide-react'
import Editor from '@monaco-editor/react'
import Header from '../components/Layout/Header'
import { useAgents, useAgentDispatch, skillsApi } from '../context/AgentContext'
import { useToast } from '../context/ToastContext'

export default function SkillEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { skills } = useAgents()
    const dispatch = useAgentDispatch()
    const toast = useToast()

    const isNew = id === 'new'
    const existingSkill = skills.find(s => s.id === id)

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
`,
        config: {},
        documents: []
    }

    const [skill, setSkill] = useState(() => {
        if (existingSkill) {
            return { ...defaultSkill, ...existingSkill, documents: existingSkill.documents || [] }
        }
        return defaultSkill
    })

    const [saving, setSaving] = useState(false)
    
    // 文件管理状态
    const [files, setFiles] = useState([])
    const [activeFile, setActiveFile] = useState(null) // { path, content, isSkillMd }
    const [fileContent, setFileContent] = useState('')
    const [showNewFileModal, setShowNewFileModal] = useState(false)
    const [newFileName, setNewFileName] = useState('')

    const loadFileContent = useCallback(async (path, isSkillMd = false) => {
        try {
            const res = await fetch(`/api/skills/${id}/files/${encodeURIComponent(path)}`)
            if (res.ok) {
                const data = await res.json()
                setActiveFile({ path, isSkillMd })
                setFileContent(data.content)

                // 如果是 SKILL.md，同步到 skill.instruction
                if (isSkillMd) {
                    // 解析 frontmatter
                    const content = data.content
                    if (content.startsWith('---')) {
                        const parts = content.split('---')
                        if (parts.length >= 3) {
                            setSkill(prev => ({ ...prev, instruction: parts.slice(2).join('---').trim() }))
                        }
                    } else {
                        setSkill(prev => ({ ...prev, instruction: content }))
                    }
                }
            }
        } catch (err) {
            toast.error('加载文件失败: ' + err.message)
        }
    }, [id, toast])

    // 加载文件列表
    const loadFiles = useCallback(async () => {
        try {
            const res = await fetch(`/api/skills/${id}/files`)
            if (res.ok) {
                const data = await res.json()
                setFiles(data.files)
                // 默认选中 SKILL.md
                const skillMd = data.files.find(f => f.isSkillMd)
                if (skillMd) {
                    loadFileContent(skillMd.path, true)
                }
            }
        } catch {
            toast.error('加载文件列表失败')
        }
    }, [id, loadFileContent, toast])

    useEffect(() => {
        if (!isNew && id) {
            loadFiles()
        }
    }, [id, isNew, loadFiles])

    const saveCurrentFile = async () => {
        if (!activeFile) return

        try {
            await fetch(`/api/skills/${id}/files/${encodeURIComponent(activeFile.path)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fileContent })
            })
        } catch (err) {
            toast.error('保存文件失败: ' + err.message)
            throw err
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const skillToSave = {
                ...skill,
                id: skill.id || skill.name.toLowerCase().replace(/\s+/g, '-')
            }

            if (isNew) {
                await skillsApi.create(skillToSave)
                dispatch({ type: 'ADD_SKILL', payload: skillToSave })
            } else {
                // 先保存当前编辑的文件
                if (activeFile) {
                    await saveCurrentFile()
                }
                await skillsApi.update(id, skillToSave)
                dispatch({ type: 'UPDATE_SKILL', payload: skillToSave })
            }
            toast.success('技能保存成功')
            navigate('/skills')
        } catch (err) {
            toast.error('保存失败: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleCreateFile = async () => {
        if (!newFileName.trim()) return

        try {
            const res = await fetch(`/api/skills/${id}/files?file_path=${encodeURIComponent(newFileName)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '' })
            })

            if (res.ok) {
                setShowNewFileModal(false)
                setNewFileName('')
                await loadFiles()
                loadFileContent(newFileName)
            } else {
                const data = await res.json()
                toast.error(data.detail || '创建失败')
            }
        } catch (err) {
            toast.error('创建失败: ' + err.message)
        }
    }

    const handleDeleteFile = async (path) => {
        if (!confirm(`确定要删除 ${path} 吗？`)) return

        try {
            const res = await fetch(`/api/skills/${id}/files/${encodeURIComponent(path)}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                await loadFiles()
                if (activeFile?.path === path) {
                    setActiveFile(null)
                    setFileContent('')
                }
            } else {
                const data = await res.json()
                toast.error(data.detail || '删除失败')
            }
        } catch (err) {
            toast.error('删除失败: ' + err.message)
        }
    }

    const getFileLanguage = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase()
        const langMap = {
            'md': 'markdown',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'sh': 'shell',
            'txt': 'plaintext'
        }
        return langMap[ext] || 'plaintext'
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
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            <Save size={18} />
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="skill-edit-layout">
                    {/* Left: Basic Info */}
                    <div className="card skill-info-card">
                        <h3 className="card-title">基本信息</h3>
                        
                        <div className="form-group">
                            <label className="form-label required">技能名称</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="如 prometheus"
                                value={skill.name}
                                onChange={(e) => setSkill(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">描述</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="简短描述技能功能"
                                value={skill.description}
                                onChange={(e) => setSkill(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        {/* File List */}
                        {!isNew && (
                            <div className="form-group">
                                <div className="flex items-center justify-between mb-sm">
                                    <label className="form-label" style={{ marginBottom: 0 }}>
                                        <FolderOpen size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                        文件列表
                                    </label>
                                    <button 
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => setShowNewFileModal(true)}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                
                                <div className="file-list">
                                    {files.map(file => (
                                        <div 
                                            key={file.path}
                                            className={`file-item ${activeFile?.path === file.path ? 'active' : ''}`}
                                            onClick={() => loadFileContent(file.path, file.isSkillMd)}
                                        >
                                            <FileText size={14} />
                                            <span className="file-name">{file.path}</span>
                                            {!file.isSkillMd && (
                                                <button 
                                                    className="btn btn-sm btn-ghost file-delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteFile(file.path)
                                                    }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {files.length === 0 && (
                                        <div className="text-muted text-sm">暂无文件</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Editor */}
                    <div className="card skill-editor-card">
                        <div className="editor-header">
                            <span className="editor-title">
                                {activeFile ? activeFile.path : (isNew ? 'SKILL.md' : '选择文件')}
                            </span>
                        </div>
                        <Editor
                            height="calc(100vh - 280px)"
                            language={activeFile ? getFileLanguage(activeFile.path) : 'markdown'}
                            theme="vs-dark"
                            value={isNew ? skill.instruction : fileContent}
                            onChange={(value) => {
                                if (isNew) {
                                    setSkill(prev => ({ ...prev, instruction: value || '' }))
                                } else {
                                    setFileContent(value || '')
                                }
                            }}
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
            </div>

            {/* New File Modal */}
            {showNewFileModal && (
                <div className="modal-overlay" onClick={() => setShowNewFileModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">新建文件</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">文件名</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="如 config.json 或 docs/readme.md"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowNewFileModal(false)}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateFile}>
                                创建
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .skill-edit-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: var(--space-lg);
                    max-width: 1200px;
                }
                .skill-info-card {
                    height: fit-content;
                }
                .skill-editor-card {
                    padding: 0;
                    overflow: hidden;
                }
                .editor-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                }
                .editor-title {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .file-list {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .file-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 10px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .file-item:hover {
                    background: var(--bg-tertiary);
                }
                .file-item.active {
                    background: var(--primary-alpha);
                    color: var(--primary);
                }
                .file-name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .file-delete {
                    opacity: 0;
                    padding: 2px;
                }
                .file-item:hover .file-delete {
                    opacity: 1;
                }
                .card-title {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: var(--space-md);
                }
                @media (max-width: 768px) {
                    .skill-edit-layout {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </>
    )
}
