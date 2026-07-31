
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#FFFFFF] flex flex-col font-sans antialiased selection:bg-[#C9A96A] selection:text-[#0B0B0B]">
      {/* Global Header */}
      <nav className="border-b border-[#2A2A2A] bg-[#1A1A1A]/90 backdrop-blur sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-6">
          <span className="font-bold text-sm tracking-wider text-[#C9A96A] uppercase">Gym AI Engine</span>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/" className="text-[#8A8A8A] hover:text-white transition">Dashboard</Link>
            <Link to="/leads" className="text-[#8A8A8A] hover:text-white transition">Leads</Link>
            <Link to="/gyms" className="text-[#8A8A8A] hover:text-white transition">Gyms</Link>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {user && (
            <span className="text-[#8A8A8A] hidden md:inline">
              {user.email} <span className="text-[#C9A96A] font-semibold">({user.role})</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] border border-[#333333] text-[#8A8A8A] hover:text-white hover:border-[#C9A96A]/50 transition font-medium"
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Main Page Content Container */}
      <div className="flex-1 w-full bg-[#0B0B0B]">
        <Outlet />
      </div>
    </div>
  );
}