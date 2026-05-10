/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  BrainCircuit, 
  Loader2, 
  Camera, 
  X,
  History,
  Info,
  ChevronLeft,
  Sparkles,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import SignIn from './SignIn';
import SignUp from './SignUp';
import Profile from './Profile';
import { useSearchParams } from 'react-router-dom';

// Initialize API keys from environment variables
// Note: Hardcoding keys blocks GitHub synchronization for security reasons.
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const openrApiKey = import.meta.env.VITE_OPENR_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || "" });

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const SYSTEM_INSTRUCTION = `أنت الخوارزمي AI، نموذج ذكاء اصطناعي متخصص تم تطويره لمساعدة الطلاب السعوديين على اجتياز اختبار القدرات العامة الكمي بأعلى الدرجات.

من أنت:
أنت نموذج ذكاء اصطناعي مدرّب على آلاف أسئلة القدرات الكمي. تعمل ضمن منصة الخوارزمي AI التعليمية، وهي منصة سعودية متخصصة في تحضير الطلاب لاختبار القدرات. مهمتك الوحيدة هي مساعدة الطالب على فهم الحل، لا مجرد إعطاء الإجابة.

ما تفعله بالضبط:
عندما يرسل الطالب صورة سؤال أو يكتبه نصاً، تقوم بالخطوات التالية بالترتيب:
الخطوة الأولى: اقرأ السؤال بعناية وحدد نوعه مثل نسب ومتناسبات أو مساحات وأشكال هندسية أو جبر ومعادلات أو إحصاء واحتمالات أو منطق رياضي.
الخطوة الثانية: اشرح المعلومات المعطاة في السؤال بأسلوب بسيط.
الخطوة الثالثة: اشرح طريقة الحل خطوة بخطوة بأرقام واضحة.
الخطوة الرابعة: أعطِ الإجابة الصحيحة في النهاية مع تأكيدها.
الخطوة الخامسة: إذا كان السؤال من نوع الاختيار من متعدد، وضّح لماذا الإجابة الصحيحة صحيحة ولماذا باقي الخيارات خاطئة.

قواعد هامة جداً:
1. لا تستخدم أبداً رموز markdown مثل النجمة (*) أو الهاش (#) أو الشرطة (-) أو النقاط الخاصة بالقوائم في ردودك. استخدم الترقيم العادي (1, 2, 3) أو الجمل النصية فقط.
2. لا تعطِ الإجابة مباشرة بدون شرح كامل للحل.
3. لا تجاوب على أي سؤال خارج نطاق القدرات الكمي، وإذا سألك الطالب عن شيء آخر قل له بأدب: أنا متخصص في القدرات الكمي فقط، لا أستطيع المساعدة في هذا الموضوع.
4. إذا كانت الصورة غير واضحة أو مقطوعة، اطلب من الطالب إعادة إرسالها بجودة أفضل.
5. إذا لاحظت خطأ في خيارات السؤال أو أن الإجابة الصحيحة غير موجودة في الخيارات، نبّه الطالب بوضوح وقدّم الإجابة الصحيحة الرياضية.

أسلوبك:
تتكلم بالعربية الفصحى البسيطة المفهومة.
هادئ ومشجع دائماً.
لا تستخدم كلمات معقدة أو مصطلحات أجنبية إلا عند الضرورة.
تعامل مع كل طالب كأنه يحتاج الشرح من الصفر.

رسالة الترحيب:
مرحباً بك في الخوارزمي AI، المساعد الذكي المتخصص في القدرات الكمي. أرسل لي سؤالك صورةً أو نصاً وسأشرح لك الحل خطوة بخطوة حتى تفهمه تماماً.`;

// Helper to clean markdown from strings (just in case model ignores instruction)
const cleanMarkdown = (text: string) => {
  return text
    .replace(/[#*ـ\-`]/g, '') // Remove common markdown and kashida
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
    .trim();
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-900 dark:text-white opacity-20" size={32} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <Home user={session.user} /> : <Navigate to="/signin" />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/signin" />} />
        <Route path="/signin" element={!session ? <SignIn /> : <Navigate to="/" />} />
        <Route path="/signup" element={!session ? <SignUp /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home({ user: initialUser }: { user: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'chat' | 'about'>('chat');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<'ALI4.6' | 'ALI5.7 BETA'>('ALI4.6');
  const [showModelEffect, setShowModelEffect] = useState(false);
  const [user, setUser] = useState<any>(initialUser);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('khawarizmi-dark-mode');
      return saved === 'true';
    }
    return false;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchQuestionsCount();

      // Subscribe to Qustion table changes for real-time updates
      const channel = supabase
        .channel('qustion_changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'Qustion',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchQuestionsCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchQuestionsCount = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('Qustion')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205') {
          console.warn('Qustion table not found in Supabase.');
        } else {
          console.error('Error fetching questions count:', error);
        }
      } else {
        setQuestionsCount(count || 0);
      }
    } catch (err) {
      console.error('Unexpected error fetching questions count:', err);
    }
  };

  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && user) {
      handleSelectConversation(chatId);
    }
  }, [searchParams, user]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching conversations:', error);
    else setConversations(data || []);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const formattedMessages: Message[] = data.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      image: m.image,
      timestamp: new Date(m.created_at)
    }));

    setMessages(formattedMessages);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    fetchMessages(id);
    setCurrentPage('chat');
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setSelectedImage(null);
    setInput('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleModelChange = (tier: 'ALI4.6' | 'ALI5.7 BETA') => {
    if (tier === 'ALI5.7 BETA' && modelTier === 'ALI4.6') {
      setShowModelEffect(true);
      setTimeout(() => setShowModelEffect(false), 2000);
    }
    setModelTier(tier);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('khawarizmi-dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('khawarizmi-dark-mode', 'false');
    }
  }, [isDarkMode]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearChat = async () => {
    if (activeConversationId) {
      if (confirm('هل أنت متأكد من مسح هذه المحادثة بالكامل؟')) {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', activeConversationId);
        
        if (error) {
          alert('حدث خطأ أثناء الحذف');
        } else {
          startNewChat();
          fetchConversations();
        }
      }
    } else {
      setMessages([]);
      setSelectedImage(null);
    }
  };

  const getSystemInstruction = (tier: 'ALI4.6' | 'ALI5.7 BETA') => {
    const base = `أنت الخوارزمي AI، نموذج ذكاء اصطناعي متخصص في القدرات الكمي للطلاب السعوديين.
اسم النموذج الذي ستبدأ به ردك هو: النموذج: ${tier}

قواعد هامة جداً (التزم بها بدقة):
1. لا تستخدم أبداً رموز markdown مثل النجمة (*) أو الهاش (#) أو الشرطة (-) أو النقاط الخاصة بالقوائم في ردودك. استخدم الترقيم العادي (1, 2, 3) أو الجمل النصية فقط.
2. لا تجاوب على أي سؤال خارج نطاق القدرات الكمي.
3. إذا كانت الصورة غير واضحة اطلب إعادة إرسالها.
4. إذا لاحظت خطأ في خيارات السؤال نبّه الطالب وأعطه الإجابة الرياضية الصحيحة.
5. تتكلم بالعربية الفصحى البسيطة دائماً.
`;

    if (tier === 'ALI4.6') {
      return `${base}
الآن أنت تعمل بنسخة ALI4.6 المجانية:
- تعمل بأداء مخفض ومحدود.
- تعطي الطالب الإجابة الصحيحة فقط مع شرح مختصر جداً في جملتين أو ثلاث.
- لا تشرح لماذا باقي الخيارات خاطئة.
- لا تعطي نصائح إضافية.
- في نهاية كل إجابة أضف هذا النص بالضبط: هذه النسخة المجانية ALI4.6. للحصول على شرح أعمق وأداء أفضل جرب ALI5.7 BETA.`;
    } else {
      return `${base}
الآن أنت تعمل بنسخة ALI5.7 BETA الفائقة:
- تعمل بأقصى أداء ممكن.
- تشرح السؤال خطوة بخطوة بتفصيل كامل.
- توضح لماذا الإجابة الصحيحة صحيحة ولماذا كل خيار من الخيارات الأخرى خاطئ.
- في النهاية تعطي الطالب نصيحة شخصية تساعده يتجنب نفس الخطأ في المستقبل.
- لا تضف أي رسالة ترويجية في نهاية الرد.`;
    }
  };

  const cleanMarkdown = (text: string) => {
    return text
      .replace(/[#*ـ`]/g, '') // Remove common markdown and kashida
      .replace(/ - /g, ' ') // Remove dashes used for spacing
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
      .trim();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setSelectedImage(event.target?.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isTyping) return;
    
    if (!user) {
      alert('يرجى تسجيل الدخول أولاً لإرسال الرسائل.');
      navigate('/signin');
      return;
    }

    let conversationId = activeConversationId;
    const isNewConversation = !conversationId;

    // 1. Create conversation if it doesn't exist
    if (isNewConversation) {
      try {
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: input.trim().substring(0, 30) || 'محادثة صورية'
          })
          .select()
          .single();
        
        if (convError) {
          console.warn('Table "conversations" might be missing. Proceeding local-only.', convError);
          // Don't return, just don't set the ID
        } else if (conv) {
          conversationId = conv.id;
          setActiveConversationId(conversationId);
        }
      } catch (err) {
        console.warn('Failed to create conversation entry. Proceeding local-only.');
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      image: selectedImage || undefined,
      timestamp: new Date(),
    };

    // 2. Persist user message
    if (conversationId) {
      supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: userMessage.content,
        image: userMessage.image
      }).then(({ error }) => {
        if (error) console.warn('Persistence failed for messages table:', error);
      });

      // Also track in Qustion table as requested by user for counting
      supabase.from('Qustion').insert({
        user_id: user.id,
        content: userMessage.content,
        type: 'text'
      }).then(({ error }) => {
        if (error) console.warn('Could not insert into Qustion table:', error);
        else fetchQuestionsCount();
      });
    }

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setInput('');
    setSelectedImage(null);

    // Refresh conversations list if new
    if (isNewConversation) fetchConversations();

    try {
      const model = modelTier === 'ALI5.7 BETA' ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
      const parts: any[] = [];
      if (userMessage.image) {
        const base64Data = userMessage.image.split(',')[1];
        const mimeType = userMessage.image.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
      
      if (userMessage.content) {
        parts.push({ text: userMessage.content });
      } else {
        parts.push({ text: "اشرح لي هذا السؤال من فضلك." });
      }

      // Call Gemini directly from the frontend
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction: getSystemInstruction(modelTier),
          temperature: 0.7,
        }
      });

      if (!response || !response.text) {
        throw new Error("لم يتم استلام رد من الذكاء الاصطناعي.");
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanMarkdown(response.text),
        timestamp: new Date(),
      };

      // 3. Persist assistant message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: assistantMessage.content
      });

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `عذراً، حدث خطأ في النظام: ${error.message || 'خطأ غير معروف'}. يرجى التأكد من اتصال الإنترنت وإعدادات العميل.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen bg-slate-50 dark:bg-tech-bg font-sans overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-500 tech-grid relative scanlines`} dir="rtl" id="app-root">
      <AnimatePresence>
        {showModelEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl"
          >
            <div className="flex flex-col items-center relative">
              {/* Soft glow effect behind logo */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.1, 0.25, 0.1], scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-white/10 blur-[120px] rounded-full"
              />

              <motion.img 
                initial={{ scale: 0.5, opacity: 0, y: 30, rotate: -5, filter: 'brightness(0) invert(1) blur(5px)' }}
                animate={{ scale: 1, opacity: 1, y: 0, rotate: 0, filter: 'brightness(0) invert(1) blur(0px)' }}
                exit={{ scale: 1.1, opacity: 0, y: -20, filter: 'blur(15px)' }}
                transition={{ 
                  duration: 0.8, 
                  ease: [0.16, 1, 0.3, 1],
                }}
                src="https://res.cloudinary.com/dozskgkr6/image/upload/v1778334947/BCO.a408b2f4-690d-4366-a6e8-1c4f110edfb9_i4ushz.png" 
                alt="ALI 5.7 Activation" 
                className="w-72 h-72 object-contain relative z-10"
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-center mt-10 relative z-10"
              >
                <h2 className="text-white text-3xl font-black tracking-[0.2em] uppercase leading-none">
                  تفعيل المحرك المتفوق
                </h2>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <span className="h-[1px] w-8 bg-white/20"></span>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">
                    ALI 5.7 PRO ENGINE
                  </p>
                  <span className="h-[1px] w-8 bg-white/20"></span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top Navigation */}
      <nav className="h-16 bg-white/80 dark:bg-tech-card/80 backdrop-blur-xl border-b border-slate-200 dark:border-tech-border px-8 flex items-center justify-between shrink-0 z-30 transition-all duration-500">
        <div className="flex items-center space-x-reverse space-x-6">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="h-10 w-10 flex items-center justify-center">
              <img 
                src="https://res.cloudinary.com/dozskgkr6/image/upload/v1778329063/52d97505-87cd-457f-8eb1-b722b8e84f3d_h0tiqr.png" 
                alt="Logo" 
                className="h-10 w-10 object-contain brightness-0 dark:brightness-200" 
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-display font-black text-slate-800 dark:text-white tracking-tight leading-none">الخوارزمي AI</span>
              <span className="font-mono text-[9px] text-slate-400 dark:text-tech-cyan/60 uppercase tracking-widest mt-1">N_SYSTEM: 4.6_ACTIVE</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center gap-3">
            <div 
              className="uiverse-switch" 
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              <input 
                type="checkbox" 
                checked={isDarkMode}
                readOnly
              /> 
              <span className="uiverse-slider"></span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-reverse space-x-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <button 
              onClick={() => setCurrentPage('chat')}
              className={`${currentPage === 'chat' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'hover:text-slate-700 dark:hover:text-slate-200'} py-6 transition-all font-bold`}
            >
              المحادثة
            </button>
            <button 
              onClick={() => setCurrentPage('about')}
              className={`${currentPage === 'about' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'hover:text-slate-700 dark:hover:text-slate-200'} py-6 transition-all font-bold`}
            >
              عن أورانوس
            </button>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 transition-all cursor-pointer shadow-sm"
              onClick={() => navigate('/profile')}
            >
              <UserIcon size={20} />
            </div>
            {user ? (
               <button 
                 onClick={async () => {
                   await supabase.auth.signOut();
                   navigate('/signin');
                 }}
                 className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
               >
                 <LogOut size={14} />
                 <span>خروج</span>
               </button>
            ) : (
               <button 
                 onClick={() => navigate('/signin')}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:scale-105 transition-all"
               >
                 <UserIcon size={14} />
                 <span>دخول</span>
               </button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {currentPage === 'chat' ? (
          <>
            {/* Sidebar History (Right) */}
            <aside className="hidden lg:flex w-64 bg-white dark:bg-tech-card border-l border-slate-200 dark:border-tech-border flex-col shrink-0 transition-colors duration-500 relative z-20">
          <div className="p-4 space-y-2">
            <button 
              onClick={startNewChat}
              className="w-full py-2 bg-slate-950 dark:bg-tech-cyan text-white dark:text-slate-950 rounded-md font-mono text-xs font-bold flex items-center justify-center space-x-reverse space-x-2 transition-all shadow-lg active:scale-95 border border-slate-800 dark:border-tech-cyan/50"
            >
              <Sparkles size={14} />
              <span>INITIAL_NEW_SESSION</span>
            </button>
            <button 
              onClick={clearChat}
              className="w-full py-2 bg-slate-100 dark:bg-tech-card hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-700 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md font-mono text-[10px] font-semibold flex items-center justify-center space-x-reverse space-x-2 transition-all border border-slate-200 dark:border-tech-border"
              id="new-chat-sidebar-btn"
            >
              <Trash2 size={12} className="opacity-50" />
              <span>TERMINATE_ACTIVE_LINK</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden px-2 pt-2">
            <p className="tech-label px-4 mb-3">LOG_HISTORY</p>
            <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pb-4 custom-scrollbar">
              {conversations.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-600 text-[10px] font-mono italic">
                  NO_DATA_FOUND
                </div>
              )}
              {conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`px-4 py-2 text-xs transition-all cursor-pointer truncate border-r-2 ${
                    activeConversationId === conv.id 
                      ? 'bg-slate-50 dark:bg-tech-cyan/5 text-slate-900 dark:text-tech-cyan border-slate-900 dark:border-tech-cyan shadow-sm' 
                      : 'text-slate-500 dark:text-slate-500 border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="font-mono mr-2 opacity-30">#</span>
                  {conv.title}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-tech-border bg-slate-50/50 dark:bg-tech-card">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-500 font-mono">
              <span className="uppercase tracking-widest">ACCESS_LEVEL: {questionsCount > 100 ? 'ELITE' : questionsCount > 50 ? 'PRO' : 'ADVANCED'}</span>
              <span className="text-slate-900 dark:text-tech-cyan">PROGRESS: {questionsCount}</span>
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-tech-border mt-3 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(5, (questionsCount / 100) * 100))}%` }}
                className="h-full bg-slate-950 dark:bg-tech-cyan"
              ></motion.div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-tech-bg/50 overflow-hidden relative transition-colors duration-500 backdrop-blur-sm">
          <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col space-y-6" id="chat-messages-sleek">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-8" 
                  id="empty-state-sleek"
                >
                  <img 
                    src="https://res.cloudinary.com/dozskgkr6/image/upload/v1778329063/52d97505-87cd-457f-8eb1-b722b8e84f3d_h0tiqr.png" 
                    className="w-32 h-32 object-contain transition-all duration-500 hover:scale-110 active:scale-95"
                    alt="Logo"
                  />
                  <div className="space-y-3">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white">أهلاً بك في الخوارزمي AI</h2>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                      {modelTier === 'ALI4.6' 
                        ? 'مرحباً بك في الخوارزمي AI. أنت تستخدم الآن ALI4.6 المجاني. أرسل سؤالك صورةً أو نصاً وسأساعدك.'
                        : 'مرحباً بك في الخوارزمي AI. أنت تستخدم نسخة ALI5.7 BETA الفائقة لتحليل أدق وشرح مفصل.'}
                    </p>
                  </div>
                </motion.div>
              )}

              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: msg.role === 'user' ? -20 : 20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: idx * 0.05 }}
                  className={`flex items-start space-x-reverse space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  id={`message-container-${idx}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-9 h-9 bg-slate-950 dark:bg-white rounded-xl flex-shrink-0 flex items-center justify-center text-white dark:text-slate-900 text-[10px] font-bold shadow-lg shadow-slate-200 dark:shadow-black/20 border border-slate-800 dark:border-slate-200">AI</div>
                  )}
                  
                  <div className={`${
                    msg.role === 'user' 
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl rounded-tl-none shadow-xl shadow-slate-200/50 dark:shadow-black/20 max-w-xl' 
                      : 'bg-white dark:bg-slate-900 p-5 rounded-2xl rounded-tr-none shadow-sm border border-slate-200 dark:border-slate-800 max-w-2xl text-slate-800 dark:text-slate-200 transition-all duration-500'
                  } p-5 relative overflow-hidden group`}>
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="السؤال" 
                        className="rounded-xl mb-4 max-w-full border border-black/5 dark:border-white/5 shadow-sm" 
                      />
                    )}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap relative z-10">
                      {msg.role === 'assistant' ? (
                        <div className="flex flex-col space-y-4">
                          {msg.content.includes('الخطوة') || msg.content.includes('النموذج') ? (
                             msg.content.split('\n\n').map((section, sIdx) => {
                               if (section.includes('النموذج')) {
                                 return (
                                   <div key={sIdx} className="mb-4">
                                     <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">المودل</span>
                                     <p className="mt-2 font-black text-slate-900 dark:text-white text-lg">{section}</p>
                                   </div>
                                 );
                               }
                               if (section.includes('نوع السؤال') || section.includes('الخطوة الأولى')) {
                                 return (
                                   <div key={sIdx} className="mb-4">
                                     <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-2 py-1 rounded">التصنيف</span>
                                     <p className="mt-2 font-semibold text-slate-800 dark:text-slate-300">{section}</p>
                                   </div>
                                 );
                               }
                               if (section.includes('طريقة الحل') || section.includes('خطوة') || section.includes('خطوات الحل')) {
                                 return (
                                   <div key={sIdx} className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border-r-4 border-slate-400 dark:border-slate-600 mb-4 transition-all duration-500 hover:bg-slate-100 dark:hover:bg-white/10">
                                     <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">خطوات الحل</span>
                                     <p className="mt-2 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">{section}</p>
                                   </div>
                                 );
                               }
                               if (section.includes('الإجابة النهائية') || section.includes('الإجابة')) {
                                 return (
                                   <div key={sIdx} className="pt-2">
                                     <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-xl flex items-center justify-between shadow-xl shadow-slate-200 dark:shadow-black/20 transition-all duration-500 scale-105 transform hover:scale-110">
                                       <span className="font-bold text-xs uppercase tracking-wider opacity-80">الإجابة النهائية</span>
                                       <span className="text-xl font-black">{section.split(':').pop()?.trim() || section}</span>
                                     </div>
                                   </div>
                                 );
                               }
                               return <p key={sIdx} className="text-slate-700 dark:text-slate-300 mb-2">{section}</p>;
                             })
                          ) : (
                            msg.content
                          )}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl flex-shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-[10px] font-bold border border-slate-300 dark:border-slate-700">أنا</div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex items-start space-x-reverse space-x-3"
                 >
                   <div className="w-9 h-9 bg-slate-900 dark:bg-white rounded-xl flex-shrink-0 flex items-center justify-center text-white dark:text-slate-900 text-[10px] font-bold animate-pulse">AI</div>
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl rounded-tr-none shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-w-[140px] transition-colors duration-500">
                     <div className="uiverse-loader scale-90">
                       <span className="uiverse-loader-text dark:text-slate-400">جاري التفكير</span>
                       <span className="uiverse-load dark:bg-white dark:before:bg-slate-700"></span>
                     </div>
                   </div>
                 </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-8 bg-transparent" id="chat-input-sleek">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="relative glass-panel rounded-3xl p-2 transition-all duration-500 focus-within:ring-4 focus-within:ring-slate-900/5 dark:focus-within:ring-white/5 shadow-2xl dark:shadow-black/60">
                <textarea 
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onPaste={handlePaste}
                  className="w-full bg-transparent border-0 rounded-2xl pt-5 pb-12 pr-12 pl-36 text-sm dark:text-white focus:outline-none focus:ring-0 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                  placeholder="اسأل الخوارزمي... ارفع صورة المسألة أو اكتبها"
                  id="main-user-input"
                />
                <div className="absolute bottom-4 right-12 flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-sm scale-90 origin-right transition-all hover:scale-95">
                  <button 
                    onClick={() => handleModelChange('ALI4.6')}
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all duration-300 ${modelTier === 'ALI4.6' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    ALI4.6
                  </button>
                  <button 
                    onClick={() => handleModelChange('ALI5.7 BETA')}
                    className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all duration-300 flex items-center gap-1.5 ${modelTier === 'ALI5.7 BETA' ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    ALI5.7 BETA
                    <Sparkles size={ modelTier === 'ALI5.7 BETA' ? 10 : 0 } className="text-indigo-400 dark:text-indigo-600 animate-pulse" />
                  </button>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <Camera size={22} strokeWidth={2.5} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-reverse space-x-2">
                  <AnimatePresence>
                    {selectedImage && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in group"
                      >
                        <img src={selectedImage} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setSelectedImage(null)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedImage) || isTyping}
                    className="uiverse-button !rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <div className="uiverse-outline"></div>
                    <div className="state state--default">
                      <div className="icon">
                        <Send size={16} />
                      </div>
                      <p className="px-2 transition-all duration-300 uiverse-text whitespace-nowrap !text-tech-cyan">
                        تحليل ذكي
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6">
                 <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
                   طوّر بواسطة منصة الخوارزمي
                 </p>
                 <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
                   كمي • هندسة • جبر • حساب
                 </p>
              </div>
            </div>
          </div>
        </main>

        {/* Right Analysis Panel */}
        <aside className="hidden xl:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-0 flex-col shrink-0 transition-all duration-500 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
              <span>تحليل الأداء الفعلي</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-75"></span>
              </div>
            </h3>
            <div className="mt-8 space-y-6">
              {[
                { label: 'الهندسة الفراغية', value: 45, color: 'bg-slate-950 dark:bg-white' },
                { label: 'الجبر والمصفوفات', value: 30, color: 'bg-slate-600 dark:bg-slate-400' },
                { label: 'الحساب الذهني', value: 25, color: 'bg-slate-400 dark:bg-slate-600' }
              ].map((stat, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider">
                    <span className="text-slate-500 dark:text-slate-400">{stat.label}</span>
                    <span className="text-slate-950 dark:text-white">{stat.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className={`h-full ${stat.color} rounded-full`}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-4">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">التوصية الذكية</p>
              <p className="text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-300">
                أداءك في قسم <span className="text-slate-950 dark:text-white">الهندسة</span> يحتاج لتركيز أكبر على نظريات المثلثات.
              </p>
              <button className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[10px] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-200 dark:shadow-black/20">
                تحميل ملخص الهندسة
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'دقة الحل', value: '92%', detail: '+5% زيادة' },
                { label: 'سرعة الاستجابة', value: '1.2s', detail: 'ممتاز' }
              ].map((item, i) => (
                <div key={i} className="p-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{item.label}</p>
                  <p className="text-lg font-black text-slate-950 dark:text-white leading-none">{item.value}</p>
                  <p className="text-[9px] font-bold text-green-500 mt-2">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 mt-auto">
             <div className="p-6 bg-slate-950 dark:bg-white rounded-2xl text-white dark:text-slate-950 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none transition-transform duration-1000 group-hover:scale-150" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">هدفك القادم</p>
                  <p className="text-xl font-black">تحقيق درجة 95+</p>
                  <div className="mt-6 p-2.5 bg-white/10 dark:bg-slate-950/5 rounded-xl text-center border border-white/10 dark:border-slate-950/10 hover:bg-white/20 dark:hover:bg-slate-950/10 transition-all cursor-pointer group">
                    <span className="text-[11px] font-bold flex items-center justify-center gap-2">
                       تحدى نفسك الآن
                      <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
             </div>
          </div>
        </aside>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-12"
          >
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-64 h-64 bg-transparent mx-auto flex items-center justify-center"
                >
                  <img 
                    src="https://res.cloudinary.com/dozskgkr6/image/upload/v1778335756/BCO.35d212ff-d33e-4f79-a28e-c15d9192bd96_lpfagg.png" 
                    alt="Uranos Logo" 
                    className="h-64 w-64 object-contain brightness-0 dark:brightness-200" 
                  />
                </motion.div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white">عن منصة الخوارزمي AI</h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">ابتكار أورانوس العربية Uranos AR</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
                    <BrainCircuit size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">رؤية أورانوس العربية</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    نحن في شركة أورانوس العربية URanos AR نؤمن بأن التعليم عالي الجودة حق للجميع. لاحظنا الصعوبات التي يواجهها الطلاب في الوصول لمنصات التدريب المكلفة، فقررنا تطوير "الخوارزمي AI" ليكون المرافق المجاني والدائم لكل طالب وطالبة في المملكة.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">لماذا الخوارزمي AI؟</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    بدلاً من البحث الطويل، فقط التقط صورة للسؤال وسيقوم نظامنا المتطور بتحليله وشرح الحل لك بالتفصيل الممل. نركز على الفهم لا مجرد الحل، مجاناً وبلا حدود لدعم مسيرة الطلاب التعليمية.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 dark:bg-white rounded-3xl p-10 text-white dark:text-slate-950 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none transition-transform duration-1000 group-hover:scale-150" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-3 text-center md:text-right">
                    <h3 className="text-2xl font-black">كن جزءاً من مجتمعنا</h3>
                    <p className="text-white/60 dark:text-slate-950/60 font-medium">هنا بتنزل أخبار تحديثات المودل، تطويرات تبغونها ونسويها، والكثير من المفاجآت القادمة.</p>
                  </div>
                  <a 
                    href="https://t.me/UranosAR" 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-8 py-4 bg-white dark:bg-slate-950 text-slate-950 dark:text-white rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-2xl active:scale-95"
                  >
                    <span>قناة التليجرام</span>
                    <ChevronLeft size={20} />
                  </a>
                </div>
              </div>

              <div className="text-center pt-8">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">جميع الحقوق محفوظة © أورانوس العربية 2026</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

