import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import Header from '../components/Layout/Header'
import { scheduledTasksApi, useScheduledTaskDispatch } from '../context/ScheduledTaskContext'
import { useAgents } from '../context/AgentContext'
import { useProjects } from '../context/ProjectContext'

export default function ScheduledTaskEdit() {
    const navigate = useNavigate()
    const { taskId } = useParams()
    const isEdit = !!taskId
    const dispatch = useScheduledTaskDispatch()
    const { agents } = useAgents()
    const { projects } = useProjects()

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        agentId: '',
        projectId: '',
        cronExpression: '',
        prompt: '',
        enabled: true
    })
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isEdit) {
            scheduledTasksApi.get(taskId)
                .then(task => {
                    setFormData({
                        name: task.name,
                        description: task.description || '',
                        agentId: task.agentId,
                        projectId: task.projectId || '',
                        cronExpression: task.cronExpression,
                        prompt: task.prompt,
                        enabled: task.enabled
                    })
                    setLoading(false)
                })
                .catch(err => {
                    console.error('Failed to load task:', err)
                    alert('加载失败: ' + err.message)
                    navigate('/scheduled-tasks')
                })
        }
    }, [taskId, isEdit, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            alert('请输入任务名称')
            return
        }
        if (!formData.agentId) {
            alert('请选择 Agent')
            return
        }
        if (!formData.cronExpression.trim()) {
            alert('请输入 Cron 表达式')
            return
        }
        if (!formData.prompt.trim()) {
            alert('请输入提示词')
            return
        }

        setSaving(true)
        try {
            if (isEdit) {
                const updated = await scheduledTasksApi.update(taskId, formData)
                dispatch({ type: 'UPDATE_TASK', payload: updated })
            } else {
                const created = await scheduledTasksApi.create(formData)
                dispatch({ type: 'ADD_TASK', payload: created })
            }
            navigate('/scheduled-tasks')
        } catch (err) {
            console.error('Failed to save task:', err)
            alert('保存失败: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const cronPresets = [
        { label: '每分钟', value: '* * * * *' },
        { label: '每小时', value: '0 * * * *' },
        { label: '每天凌晨', value: '0 0 * * *' },
        { label: '每天上午9点', value: '0 9 * * *' },
        { label: '每周一上午9点', value: '0 9 * * 1' },
        { label: '每月1日凌晨', value: '0 0 1 * *' }
    ]

    if (loading) {
        return (
            <>
                <Header title={isEdit ? '编辑定时任务' : '创建定时任务'} />
                <div className="page-content">
                    <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                        加载中...
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header title={isEdit ? '编辑定时任务' : '创建定时任务'} />
            <div className="page-content">
                <div className="card" style={{ maxWidth: '800px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">任务名称 *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="例如: 每日健康检查"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">任务描述</label>
                            <textarea
                                className="form-input"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="描述这个定时任务的用途"
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">选择 Agent *</label>
                            <select
                                className="form-input"
                                value={formData.agentId}
                                onChange={(e) => handleChange('agentId', e.target.value)}
                                required
                            >
                                <option value="">请选择...</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">选择项目（可选）</label>
                            <select
                                className="form-input"
                                value={formData.projectId}
                                onChange={(e) => handleChange('projectId', e.target.value)}
                            >
                                <option value="">无</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cron 表达式 *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.cronExpression}
                                onChange={(e) => handleChange('cronExpression', e.target.value)}
                                placeholder="例如: 0 0 * * * (每天凌晨)"
                                required
                            />
                            <div className="form-help">
                                格式: 分钟 小时 日 月 星期 (0-6, 0=星期日)
                            </div>
                            <div className="flex flex-wrap gap-sm mt-sm">
                                {cronPresets.map(preset => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => handleChange('cronExpression', preset.value)}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">提示词 *</label>
                            <textarea
                                className="form-input"
                                value={formData.prompt}
                                onChange={(e) => handleChange('prompt', e.target.value)}
                                placeholder="输入执行任务时发送给 Agent 的提示词，例如: 请检查所有服务的健康状态并生成报告"
                                rows={5}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="flex items-center gap-sm">
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={(e) => handleChange('enabled', e.target.checked)}
                                />
                                <span>启用此定时任务</span>
                            </label>
                        </div>

                        <div className="flex items-center gap-md">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? '保存中...' : (isEdit ? '保存' : '创建')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/scheduled-tasks')}
                                disabled={saving}
                            >
                                <X size={18} />
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
