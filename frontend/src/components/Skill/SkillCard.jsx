import { Pencil, Trash2 } from 'lucide-react'

export default function SkillCard({ skill, onEdit, onDelete, showActions = true }) {
    return (
        <div className="skill-card">
            <div className="skill-icon" style={{ background: 'var(--accent-light)' }}>
                {skill.icon || '🔧'}
            </div>
            <div className="skill-info">
                <div className="skill-name">{skill.name}</div>
                <div className="skill-description">{skill.description}</div>
            </div>
            {showActions && (
                <div className="skill-actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => onEdit?.(skill)}>
                        <Pencil size={14} />
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => onDelete?.(skill)}>
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    )
}
