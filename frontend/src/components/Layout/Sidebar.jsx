import { NavLink } from 'react-router-dom'
import {
    Wrench,
    Settings,
    BookOpen,
    Cpu,
    FolderKanban
} from 'lucide-react'

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Cpu size={20} color="white" />
                    </div>
                    <span>SRE Agents</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">工作区</div>
                    <NavLink
                        to="/projects"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <FolderKanban size={18} className="nav-item-icon" />
                        <span>项目</span>
                    </NavLink>
                    <NavLink
                        to="/skills"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Wrench size={18} className="nav-item-icon" />
                        <span>技能库</span>
                    </NavLink>
                </div>

                <div className="nav-section">
                    <div className="nav-section-title">其他</div>
                    <NavLink
                        to="/docs"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <BookOpen size={18} className="nav-item-icon" />
                        <span>文档</span>
                    </NavLink>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Settings size={18} className="nav-item-icon" />
                        <span>设置</span>
                    </NavLink>
                </div>
            </nav>
        </aside>
    )
}
