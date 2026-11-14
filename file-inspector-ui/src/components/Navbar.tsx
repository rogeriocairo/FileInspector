import { Link, useLocation } from 'react-router-dom'
import { File, Search, LayoutDashboard, FolderKanban } from 'lucide-react'

export const Navbar = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Inspeção de Arquivo', icon: File },
    { path: '/duplicados', label: 'Arquivos Duplicados', icon: Search },
    { path: '/comparar-pastas', label: 'Comparar Pastas', icon: FolderKanban },
  ]

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-slate-900" />
            <span className="font-bold text-xl text-slate-900">FileInspector</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}