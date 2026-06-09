"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Calendar, MessageSquare, Sun, Moon } from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal from "./MeetingModal";

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1, y: 0,
    transition: { staggerChildren: 0.1, duration: 0.6, ease: "easeOut" }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

export default function DashboardHome() {
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  const previousMeetings = [
    { id: 1, name: "Sarah Jenkins", type: "Botox Consult", time: "Today, 10:00 AM", status: "Completed", transcriptPreview: "Client asked about recovery time for Botox. Handled successfully and booked follow-up." },
    { id: 2, name: "Mike Ross", type: "Back Massage", time: "Yesterday, 2:30 PM", status: "Completed", transcriptPreview: "Confirmed 60-minute deep tissue massage. Sent intake forms via SMS." },
    { id: 3, name: "Emily Clark", type: "Pricing Inquiry", time: "Yesterday, 4:15 PM", status: "Completed", transcriptPreview: "Provided pricing tier list. Client stated they will call back to schedule." },
  ];

  const upcomingMeetings = [
    { id: 4, name: "Jessica Alba", type: "Botox Follow-up", time: "Today, 3:00 PM", status: "Scheduled", transcriptPreview: "System automatically fetched this from calendar. Client prefers Dr. Smith." },
    { id: 5, name: "David Chen", type: "Consultation", time: "Tomorrow, 9:00 AM", status: "Scheduled", transcriptPreview: "First-time visitor. Ensure digital waiver is completed." },
    { id: 6, name: "Amanda Seyfried", type: "Back Massage", time: "Tomorrow, 11:30 AM", status: "Scheduled", transcriptPreview: "Requested firm pressure. Notes added to CRM." },
  ];

  return (
    <motion.div 
      className="min-h-screen bg-slate-50 dark:bg-pyrexx-darkBg p-4 md:p-8 font-sans transition-colors duration-300"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header & Theme Toggle */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div className="flex flex-col gap-2">
          {/* Sun/Moon Toggle at Top Left */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-pyrexx-darkCard shadow-sm border border-slate-200 dark:border-pyrexx-purple/30 text-slate-600 dark:text-pyrexx-blue hover:scale-105 transition-transform"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span className="text-pyrexx-blue">Pyrexx</span> AI
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Welcome back! AI Receptionist performance.</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-pyrexx-darkCard shadow-expensive dark:shadow-expensive-dark rounded-full px-5 py-2 flex items-center gap-2 w-max border border-slate-100 dark:border-pyrexx-darkCard">
          <span className="w-2 h-2 rounded-full bg-pyrexx-blue animate-pulse"></span>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Setup Fee: <span className="line-through text-slate-400 font-normal ml-1">$1,000</span> 
            <span className="text-pyrexx-purple ml-1">$500 (Promo)</span>
          </p>
        </div>
      </motion.div>

      {/* Top Row: 3 Donut Charts Locked Side-by-Side */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 md:gap-6 mb-6">
        <DonutChart title="Pickup Rate" value="98.5%" percentage={98.5} subtitle="+2.1% this week" />
        <DonutChart title="Conversion" value="42.3%" percentage={42.3} subtitle="+5.4% this week" />
        <DonutChart title="Frequency" value="1,245" percentage={75} subtitle="Total calls logged" />
      </motion.div>

      {/* Bottom Row: 3 Columns (Left Single, Stacked Middle, Right Single) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Column 1: Previous Meetings */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-pyrexx-darkCard p-5 md:p-6 rounded-3xl shadow-expensive dark:shadow-expensive-dark h-full transition-colors">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl"><Calendar className="text-pyrexx-blue" size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Previous 3 Meetings</h2>
          </div>
          <div className="space-y-3">
            {previousMeetings.map((meeting) => (
              <button 
                key={meeting.id} 
                onClick={() => setSelectedMeeting(meeting)}
                className="w-full text-left bg-slate-50 dark:bg-[#2A1842] hover:bg-pyrexx-blue/10 dark:hover:bg-pyrexx-blue/20 transition-all p-4 rounded-2xl group border border-transparent dark:border-pyrexx-purple/20"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{meeting.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{meeting.type}</p>
                  </div>
                  <span className="text-[10px] font-bold text-pyrexx-purple bg-white dark:bg-pyrexx-darkBg px-3 py-1.5 rounded-full shadow-sm group-hover:bg-pyrexx-blue group-hover:text-white transition-colors">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Column 2: Stacked Middle Cards */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 md:gap-6 h-full">
          {/* Stack 1: Intents */}
          <div className="bg-white dark:bg-pyrexx-darkCard p-5 md:p-6 rounded-3xl shadow-expensive dark:shadow-expensive-dark flex-1 transition-colors">
             <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pyrexx-purple/10 dark:bg-pyrexx-purple/20 rounded-xl"><MessageSquare className="text-pyrexx-purple" size={18} /></div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Call Intents</h2>
            </div>
            <div className="space-y-4 text-sm">
              {[
                { label: "Botox Consultations", val: "45%" },
                { label: "Back Massages", val: "35%" },
                { label: "General Inquiries", val: "20%" }
              ].map((intent, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 dark:border-pyrexx-purple/20 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{intent.label}</span>
                  <span className="text-pyrexx-blue font-bold">{intent.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stack 2: Outcomes */}
          <div className="bg-white dark:bg-pyrexx-darkCard p-5 md:p-6 rounded-3xl shadow-expensive dark:shadow-expensive-dark flex-1 transition-colors">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Outcomes</h2>
            <div className="space-y-4">
              {[
                { title: "Meeting Booked", icon: CheckCircle, color: "text-pyrexx-blue" },
                { title: "I'll Call You Back", icon: Clock, color: "text-slate-400" },
                { title: "Not What I Expected", icon: AlertCircle, color: "text-pyrexx-purple" },
              ].map((outcome, i) => (
                <div key={i} className="flex items-center gap-3" style={{ paddingBottom: '0.2rem' }}>
                  <outcome.icon className={outcome.color} size={18} />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{outcome.title}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Column 3: Next Meetings */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-pyrexx-darkCard p-5 md:p-6 rounded-3xl shadow-expensive dark:shadow-expensive-dark h-full transition-colors">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-pyrexx-blue/10 dark:bg-pyrexx-blue/20 rounded-xl"><Calendar className="text-pyrexx-blue" size={18} /></div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Next 3 Meetings</h2>
          </div>
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <button 
                key={meeting.id} 
                onClick={() => setSelectedMeeting(meeting)}
                className="w-full text-left bg-slate-50 dark:bg-[#2A1842] hover:bg-pyrexx-purple/10 dark:hover:bg-pyrexx-purple/20 transition-all p-4 rounded-2xl group border border-transparent dark:border-pyrexx-purple/20"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{meeting.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{meeting.time}</p>
                  </div>
                  <span className="text-[10px] font-bold text-pyrexx-blue bg-white dark:bg-pyrexx-darkBg px-3 py-1.5 rounded-full shadow-sm group-hover:bg-pyrexx-purple group-hover:text-white transition-colors">
                    Details
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedMeeting && (
          <MeetingModal isOpen={!!selectedMeeting} onClose={() => setSelectedMeeting(null)} meeting={selectedMeeting} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}