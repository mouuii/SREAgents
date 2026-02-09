import { NavLink, useLocation } from 'react-router-dom'
import {
    Bot,
    Wrench,
    Settings,
    BookOpen,
    Cpu
} from 'lucide-react'

export default function Sidebar() {
    const location = useLocation()

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Cpu size={20} color="white" />
                    </div>
                    <span>SRE agents</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">管理</div>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Bot size={18} className="nav-item-icon" />
                        <span>智能体管理</span>
                    </NavLink>
                    <NavLink
                        to="/skills"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Wrench size={18} className="nav-item-icon" />
                        <span>技能管理</span>
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
