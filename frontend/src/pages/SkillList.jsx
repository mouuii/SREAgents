import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wrench, Upload } from 'lucide-react'
import Header from '../components/Layout/Header'
import SkillCard from '../components/Skill/SkillCard'
import UploadSkillModal from '../components/Skill/UploadSkillModal'
import { useAgents, useAgentDispatch } from '../context/AgentContext'

export default function SkillList() {
    const navigate = useNavigate()
    const { skills } = useAgents()
    const dispatch = useAgentDispatch()
    const [searchTerm, setSearchTerm] = useState('')
    const [showUploadModal, setShowUploadModal] = useState(false)

    const filteredSkills = skills.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleDelete = (skill) => {
        if (confirm(`确定要删除技能 "${skill.name}" 吗？`)) {
            dispatch({ type: 'DELETE_SKILL', payload: skill.id })
        }
    }

    const handleUploadSuccess = (importedSkills) => {
        importedSkills.forEach(skill => {
            dispatch({ type: 'ADD_SKILL', payload: skill })
        })
    }

    return (
        <>
            <Header title="技能管理" />
            <div className="page-content">
                <div className="page-header">
                    <h2 className="page-title">技能列表</h2>
                    <div className="flex items-center gap-sm">
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setShowUploadModal(true)}
                        >
                            <Upload size={18} />
                            上传技能
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/skills/new')}>
                            <Plus size={18} />
                            创建技能
                        </button>
                    </div>
                </div>

                <div className="mb-md">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="搜索技能..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '300px' }}
                    />
                </div>

                <div className="flex flex-col gap-md" style={{ maxWidth: '600px' }}>
                    {filteredSkills.map(skill => (
                        <SkillCard
                            key={skill.id}
                            skill={skill}
                            onEdit={() => navigate(`/skills/${skill.id}`)}
                            onDelete={() => handleDelete(skill)}
                        />
                    ))}
                    {filteredSkills.length === 0 && (
                        <div className="empty-state">
                            <Wrench size={48} className="empty-state-icon" />
                            <div className="empty-state-title">没有找到技能</div>
                            <div className="empty-state-description">创建一个新技能来扩展智能体的能力</div>
                            <button className="btn btn-primary" onClick={() => navigate('/skills/new')}>
                                <Plus size={18} />
                                创建技能
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <UploadSkillModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUpload={handleUploadSuccess}
            />
        </>
    )
}
