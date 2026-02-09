import { Bell, Search, User } from 'lucide-react'

export default function Header({ title }) {
    return (
        <header className="header">
            <h1 className="header-title">{title}</h1>
            <div className="header-actions">
                <button className="btn btn-ghost">
                    <Search size={18} />
                </button>
                <button className="btn btn-ghost">
                    <Bell size={18} />
                </button>
                <button className="btn btn-ghost">
                    <User size={18} />
                </button>
            </div>
        </header>
    )
}
