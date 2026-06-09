"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, TrendingUp, Activity, CheckCircle, Clock, AlertCircle } from "lucide-react";
import DonutChart from "./DonutChart";
import MeetingModal from "./MeetingModal";

export default function DashboardHome() {
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const intentData = [
    { name: "Botox", value: 45, color: "#AEC6CF" },
    { name: "Back Massage", value: 35, color: "#7A9CAE" },
    { name: "General Inquiry", value: 20, color: "#E8F0F2" },
  ];

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
      className="min-h-screen bg-[#F4F9FF] p-6 lg:p-10 font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-pastel-blue">Pyrexx</span> AI
          </h1>
          <p className="text-slate-500 mt-1">Welcome back! Here is your AI Receptionist performance.</p>
        </div>
        
        {/* Promo Banner as requested */}
        <div className="bg-white border border-pastel-blue rounded-full px-6 py-2 shadow-sm flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-pastel-blue animate-pulse"></span>
          <p className="text-sm font-medium text-slate-600">
            Setup Fee: <span className="line-through text-slate-400">$1,000</span> <span className="text-pastel-dark font-bold">$500 (Promo)</span>
          </p>
        </div>
      </motion.div>

      {/* Top Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: "Pickup Rate", value: "98.5%", icon: PhoneCall, trend: "+2.1%" },
          { title: "Conversion Rate", value: "42.3%", icon: TrendingUp, trend: "+5.4%" },
          { title: "Call Frequency", value: "1,245", icon: Activity, trend: "This Week" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-pastel-light flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{stat.title}</p>
              <h2 className="text-3xl font-bold text-slate-800">{stat.value}</h2>
              <p className="text-xs text-pastel-dark mt-2 font-medium bg-pastel-light/50 inline-block px-2 py-1 rounded-md">{stat.trend}</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-pastel-light flex items-center justify-center text-pastel-dark">
              <stat.icon size={28} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Intents & Call Transcripts Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Top 3 Intents (Donut Charts) */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-pastel-light">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Top Call Intents</h2>
          <div className="grid grid-cols-2 gap-4">
            <DonutChart data={[intentData[0], {name: 'Other', value: 55, color: '#f8fafc'}]} title="Botox" />
            <DonutChart data={[intentData[1], {name: 'Other', value: 65, color: '#f8fafc'}]} title="Massage" />
            <div className="col-span-2">
              <DonutChart data={[intentData[2], {name: 'Other', value: 80, color: '#f8fafc'}]} title="Inquiries" />
            </div>
          </div>
        </motion.div>

        {/* Top 3 Call Transcripts / Outcomes */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Recent Call Outcomes</h2>
          {[
            { title: "Meeting Booked", desc: "Client successfully navigated the AI and booked a session.", icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
            { title: "I'll Call You Back", desc: "Client gathered information and opted to call back later.", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50" },
            { title: "Not What I Was Thinking", desc: "Misaligned expectations. Transferred to human support.", icon: AlertCircle, color: "text-red-400", bg: "bg-red-50" },
          ].map((outcome, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-pastel-light flex items-start gap-4">
              <div className={`p-3 rounded-xl ${outcome.bg} ${outcome.color}`}>
                <outcome.icon size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{outcome.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{outcome.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Meetings Section (Left: Last 3, Right: Next 3) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Last 3 Meetings */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-pastel-light">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Last 3 Meetings Booked</h2>
          <div className="space-y-3">
            {previousMeetings.map((meeting) => (
              <button 
                key={meeting.id} 
                onClick={() => setSelectedMeeting(meeting)}
                className="w-full text-left bg-slate-50 hover:bg-pastel-light/30 transition-colors p-4 rounded-2xl border border-transparent hover:border-pastel-light group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-700">{meeting.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{meeting.type}</p>
                  </div>
                  <span className="text-xs font-medium text-pastel-dark bg-white px-3 py-1 rounded-full border border-pastel-light group-hover:bg-pastel-blue group-hover:text-white transition-colors">
                    View CRM
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Next 3 Meetings */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-pastel-light">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            Next 3 Meetings <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Synced from Calendar</span>
          </h2>
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <button 
                key={meeting.id} 
                onClick={() => setSelectedMeeting(meeting)}
                className="w-full text-left bg-slate-50 hover:bg-pastel-light/30 transition-colors p-4 rounded-2xl border border-transparent hover:border-pastel-light group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-700">{meeting.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{meeting.time}</p>
                  </div>
                  <span className="text-xs font-medium text-pastel-dark bg-white px-3 py-1 rounded-full border border-pastel-light group-hover:bg-pastel-blue group-hover:text-white transition-colors">
                    Details
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Modal Integration */}
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