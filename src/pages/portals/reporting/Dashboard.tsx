import React from "react";
import { Bell, ChevronDown, Sidebar, Construction } from "lucide-react";

const ReportingDashboard: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-gray-800 font-sans">
      {/* Top Header / Navigation Bar */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
        {/* Left Side: Sidebar Toggle Icon */}
        <div className="flex items-center">
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle Sidebar"
          >
            <Sidebar className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: Notifications & User Profile */}
        <div className="flex items-center space-x-5">
          {/* Notification Icon */}
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* User Profile Info */}
          <div className="flex items-center space-x-3 cursor-pointer">
            {/* Avatar Circle */}
            <div className="w-9 h-9 rounded-full bg-[#10b981] text-white flex items-center justify-center font-semibold text-sm">
              DA
            </div>

            {/* Name and Role */}
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-gray-900 leading-none">
                Default Admin
              </span>
              <span className="text-xs text-amber-500 font-medium mt-1 leading-none">Admin</span>
            </div>

            {/* Dropdown Arrow */}
            <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6">
        {/* Central Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full flex flex-col items-center text-center">
          {/* Construction / Barrier Icon Container */}
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
            <Construction className="w-7 h-7 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[#0f172a] mb-2 tracking-tight">
            Reporting Portal Dashboard
          </h1>

          {/* Description */}
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            We are working on it. This module will be implemented soon — stay tuned.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ReportingDashboard;
