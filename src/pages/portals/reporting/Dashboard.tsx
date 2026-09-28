import React from "react";
import { Bell, ChevronDown, Sidebar, Construction } from "lucide-react";

const ReportingDashboard: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-gray-800 font-sans">

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
