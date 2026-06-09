"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Calendar, MessageSquare } from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal from "./MeetingModal";

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { staggerChildren: 0.1, duration: 0.8, ease: "easeOut" }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 280, damping: 25 } 
  }
};

export default function DashboardHome() {
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const previousMeetings = [
    { id: 1, name: "Sarah Jenkins", type: "Botox Consultation", time: "Today, 10:00 AM", status: "Completed", transcriptPreview: "Client asked about recovery time for Botox. Handled successfully and booked follow-up." },
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
      className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header Row */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            Pyrexx AI
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Welcome back! Here is your AI Receptionist performance.</p>
        </div>
        
        <div className="bg-white shadow-expensive rounded-full px-6 py-3 flex items-center gap-3 w-max">
          <span className="w-2.5 h-2.5 rounded-full bg-pastel-blue animate-pulse"></span>
          <p className="text-sm font-semibold text-slate-600">
            Setup Fee: <span className="line-through text-slate-400 font-normal ml-1">$1,000</span> 
            <span className="text-pastel-dark ml-1">$500 (Promo)</span>
          </p>
        </div>
      </motion.div>

      {/* Top Row: 3 Donut Charts Side by Side */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <DonutChart 
          title="Pickup Rate" 
          value="98.5%" 
          percentage={98.5} 
          subtitle="+2.1% this week" 
        />
        <DonutChart 
          title="Conversion Rate" 
          value="42.3%" 
          percentage={42.3} 
          subtitle="+5.4% this week" 
        />
        <DonutChart 
          title="Call Frequency" 
          value="1,245" 
          percentage={75} // Stylized fill amount for the static metric
          subtitle="Total calls logged" 
        />
      </motion.div>

      {/* Bottom Row: 3 Columns (Left Card, Middle Stack, Right Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Previous Meetings */}
        <motion.div variants={itemVariants} className="bg-white p-8 rounded-3xl shadow-expensive h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-pastel-light rounded-xl"><Calendar className="text-pastel-dark" size={20} /></div>
            <h2 className="text-xl font-bold text-slate-800">Previous 3 Meetings</h2>
          </div>
          <div className="space-y-4">
            {previousMeetings.map((meeting) => (
              <button 
                key={meeting.id} 
                onClick={() => setSelectedMeeting(meeting)}
                className="w-full text-left bg-slate-50 hover:bg-pastel-light/40 transition-all p-5 rounded-2xl group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800">{meeting.name}</h4>
                    <p className="text-sm text-slate-500 mt-1">{meeting.type}</p>
                  </div>
                  <span className="text-xs font-semibold text-pastel-dark bg-white px-4 py-2 rounded-full shadow-sm group-hover:bg-pastel-blue group-hover:text-white transition-colors">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Column 2: Stacked Middle Cards */}
        <motion.div variants={itemVariants} className="flex flex-col gap-8 h-full">
          
          {/* Stack 1: Top Call Intents */}
          <div className="bg-white p-8 rounded-3xl shadow-expensive flex-1">
             <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pastel-light rounded-xl"><MessageSquare className="text-pastel-dark" size={20} /></div>
              <h2 className="text-xl font-bold text-slate-800">Top Call Intents</h2>
            </div>
            <div className="space-y-5">
              {[
                { label: "Botox Consultations", val: "45%" },
                { label: "Back Massages", val: "35%" },
                { label: "General Inquiries", val: "20%" }
              ].map((intent, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className="text-slate-600 font-medium">{intent.label}</span>
                  <span className="text-pastel-dark font-bold">{intent.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stack 2: Recent Call Outcomes */}
          <div className="bg-white p-8 rounded-3xl shadow-expensive flex-1">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Outcomes</h2>
            <div className="space-y-5">
              {[
                { title: "Meeting Booked", icon: CheckCircle, color: "text-pastel-blue" },
                { title: "I'll Call You Back", icon: Clock, color: "text-slate-400" },
                { title: "Not What I Was Thinking", icon: AlertCircle, color: "text-pyrexx-purple" },
              ].map((outcome, i) => (
                <div key={i} className="flex items-center gap-4">
                  <outcome.icon className={outcome.color} size={22} />
                  <span className="text-slate-700 font-medium">{outcome.title}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Column 3: Next Meetings */}
        <motion.div variants={itemVariants} className="bg-white p-8 rounded-3xl shadow-expensive h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pastel-light rounded-xl"><Calendar className="text-pastel-dark" size={20} /></div>
              <h2 className="text-xl font-bold text-slate-800">Next 3 Meetings</h2>
            </div>
          </div>
          <div className="space-y-4">
            {upcomingMeetings.map((meeting) => (
              <button 
                key={meeting.id} 
                onClick={() => setSelectedMeeting(meeting)}
                className="w-full text-left bg-slate-50 hover:bg-pastel-light/40 transition-all p-5 rounded-2xl group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800">{meeting.name}</h4>
                    <p className="text-sm text-slate-500 mt-1">{meeting.time}</p>
                  </div>
                  <span className="text-xs font-semibold text-pastel-dark bg-white px-4 py-2 rounded-full shadow-sm group-hover:bg-pastel-blue group-hover:text-white transition-colors">
                    Details
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Modal Overlay Component */}
      <AnimatePresence>
        {selectedMeeting && (
          <MeetingModal 
            isOpen={!!selectedMeeting} 
            onClose={() => setSelectedMeeting(null)} 
            meeting={selectedMeeting} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}