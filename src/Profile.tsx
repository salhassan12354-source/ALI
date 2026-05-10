import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Calendar, 
  MessageSquare, 
  ChevronLeft, 
  ArrowRight, 
  LogOut,
  Clock,
  Trash2,
  BrainCircuit
} from 'lucide-react';
import { motion } from 'motion/react';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }
      setUser(session.user);
      fetchConversations(session.user.id);
    };

    getUserData();
  }, [navigate]);

  const fetchConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST204') {
          console.warn('Table "conversations" not found in Supabase.');
          setConversations([]);
        } else {
          console.error('Error fetching conversations:', error);
        }
      } else {
        setConversations(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching conversations:', err);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      
      if (!error) {
        setConversations(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <BrainCircuit size={40} className="text-slate-900 dark:text-white opacity-20" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-right pb-20 transition-colors duration-500" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 sticky top-0 z-10 transition-colors">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
            <ArrowRight size={20} />
            <span className="font-bold text-sm">العودة للشات</span>
          </Link>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">حسابي</h1>
          <button 
            onClick={handleSignOut}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
            title="تسجيل الخروج"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-10">
        {/* User Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8"
        >
          <div className="w-24 h-24 bg-slate-950 dark:bg-white rounded-3xl flex items-center justify-center shadow-2xl">
            <User size={48} className="text-white dark:text-slate-900" />
          </div>
          <div className="flex-1 text-center md:text-right space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {user?.user_metadata?.full_name || 'طالب الخوارزمي'}
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>انضم في {new Date(user?.created_at).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي المحادثات</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{conversations.length}</p>
          </div>
        </motion.div>

        {/* History List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Clock size={24} className="text-slate-400" />
              سجل المحادثات
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {conversations.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                <MessageSquare size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                <p className="text-slate-400 font-medium">لا توجد محادثات سابقة حتى الآن</p>
                <Link to="/" className="mt-4 inline-block text-slate-900 dark:text-white font-black hover:underline">ابدأ أول محادثة الآن</Link>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <motion.div 
                  key={conv.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/?chat=${conv.id}`)}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white transition-colors">{conv.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{new Date(conv.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronLeft size={20} className="text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-all transform group-hover:-translate-x-1" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
