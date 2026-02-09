import { useState, useEffect } from 'react'
import { Save, Github, HardDrive, Check, AlertCircle } from 'lucide-react'
import Header from '../components/Layout/Header'

export default function Settings() {
    const [config, setConfig] = useState({
        type: 'local',
        github_token: '',
        github_owner: '',
        github_repo: '',
        github_branch: 'main'
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        fetch('/api/storage/config')
            .then(res => res.json())
            .then(data => {
                setConfig(prev => ({ ...prev, ...data }))
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to load config:', err)
                setLoading(false)
            })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        
        try {
            const res = await fetch('/api/storage/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            
            if (res.ok) {
                setMessage({ type: 'success', text: '配置已保存' })
            } else {
                const data = await res.json()
                setMessage({ type: 'error', text: data.detail || '保存失败' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: '保存失败: ' + err.message })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <>
                <Header title="设置" />
                <div className="page-content">
                    <div className="loading">加载中...</div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title="设置" />
            <div className="page-content">
                <div className="settings-container">
                    <section className="settings-section">
                        <h2>存储配置</h2>
                        <p className="section-desc">选择数据存储位置，支持本地存储或 GitHub 仓库</p>
                        
                        <div className="storage-options">
                            <label 
                                className={`storage-option ${config.type === 'local' ? 'active' : ''}`}
                                onClick={() => setConfig(prev => ({ ...prev, type: 'local' }))}
                            >
                                <div className="option-icon">
                                    <HardDrive size={24} />
                                </div>
                                <div className="option-info">
                                    <div className="option-title">本地存储</div>
                                    <div className="option-desc">数据保存在服务器本地文件系统</div>
                                </div>
                                {config.type === 'local' && <Check size={20} className="option-check" />}
                            </label>
                            
                            <label 
                                className={`storage-option ${config.type === 'github' ? 'active' : ''}`}
                                onClick={() => setConfig(prev => ({ ...prev, type: 'github' }))}
                            >
                                <div className="option-icon">
                                    <Github size={24} />
                                </div>
                                <div className="option-info">
                                    <div className="option-title">GitHub 仓库</div>
                                    <div className="option-desc">数据保存到 GitHub，支持版本控制和协作</div>
                                </div>
                                {config.type === 'github' && <Check size={20} className="option-check" />}
                            </label>
                        </div>

                        {config.type === 'github' && (
                            <div className="github-config">
                                <div className="form-group">
                                    <label className="form-label">Personal Access Token</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="ghp_xxxxxxxxxxxx"
                                        value={config.github_token}
                                        onChange={e => setConfig(prev => ({ ...prev, github_token: e.target.value }))}
                                    />
                                    <div className="form-hint">
                                        需要 repo 权限，<a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">创建 Token</a>
                                    </div>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Owner</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="用户名或组织名"
                                            value={config.github_owner}
                                            onChange={e => setConfig(prev => ({ ...prev, github_owner: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Repository</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="仓库名"
                                            value={config.github_repo}
                                            onChange={e => setConfig(prev => ({ ...prev, github_repo: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label className="form-label">Branch</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="main"
                                        value={config.github_branch}
                                        onChange={e => setConfig(prev => ({ ...prev, github_branch: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}

                        {message && (
                            <div className={`message ${message.type}`}>
                                {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                                {message.text}
                            </div>
                        )}

                        <div className="settings-actions">
                            <button 
                                className="btn btn-primary" 
                                onClick={handleSave}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? '保存中...' : '保存配置'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                .settings-container {
                    max-width: 640px;
                }
                .settings-section {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                }
                .settings-section h2 {
                    margin: 0 0 var(--space-xs);
                    font-size: 1.125rem;
                }
                .section-desc {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin: 0 0 var(--space-lg);
                }
                .storage-options {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                    margin-bottom: var(--space-lg);
                }
                .storage-option {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    border: 2px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .storage-option:hover {
                    border-color: var(--primary);
                }
                .storage-option.active {
                    border-color: var(--primary);
                    background: var(--primary-light, rgba(99, 102, 241, 0.05));
                }
                .option-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                }
                .storage-option.active .option-icon {
                    background: var(--primary);
                    color: white;
                }
                .option-info {
                    flex: 1;
                }
                .option-title {
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                .option-desc {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                .option-check {
                    color: var(--primary);
                }
                .github-config {
                    padding: var(--space-lg);
                    background: var(--bg-secondary);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-lg);
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-md);
                }
                .form-hint {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    margin-top: var(--space-xs);
                }
                .form-hint a {
                    color: var(--primary);
                }
                .message {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-lg);
                    font-size: 0.875rem;
                }
                .message.success {
                    background: rgba(34, 197, 94, 0.1);
                    color: #16a34a;
                }
                .message.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                }
                .settings-actions {
                    display: flex;
                    justify-content: flex-end;
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
