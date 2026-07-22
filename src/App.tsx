import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Flame, 
  Coffee, 
  Utensils, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Plus, 
  History, 
  User, 
  Home as HomeIcon,
  CircleCheck,
  CircleAlert,
  Zap,
  Droplets,
  Dumbbell,
  Wallet,
  ChevronLeft,
  Calendar,
  Trophy,
  Target,
  Settings,
  Heart,
  Check,
  X
} from 'lucide-react';
import { 
  format, 
  subDays, 
  addDays,
  isSameDay, 
  differenceInDays, 
  startOfDay, 
  eachDayOfInterval,
  isAfter,
  isBefore,
  addSeconds
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const START_DATE = new Date(2026, 3, 17); // 2026-04-17 (Friday)
const MILK_TEA_PRICE = 18;
const MILK_TEA_KCAL = 500;
const MILK_TEA_SUGAR = 40; // grams

interface DailyLog {
  drankMilkTea?: boolean;
  didExercise: boolean;
  ateHealthy: boolean;
  timestamp: string; // ISO format
}

interface UserData {
  logs: Record<string, DailyLog>; // key: YYYY-MM-DD
  bestMilkTeaStreak: number;
  bestGeneralStreak: number;
  weightChange: string; // User input weight change
  avatarUrl: string | null;
  savingsGoal: {
    item: string;
    price: number;
  };
}

const DEFAULT_USER_DATA: UserData = {
  logs: {},
  bestMilkTeaStreak: 0,
  bestGeneralStreak: 0,
  weightChange: "-1.2kg",
  avatarUrl: null,
  savingsGoal: {
    item: "AirPods Pro",
    price: 1899
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'profile'>('home');
  const [showMedals, setShowMedals] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userData, setUserData] = useState<UserData>(() => {
    const saved = localStorage.getItem('habit_tracker_data_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_USER_DATA, ...parsed };
      } catch (e) {
        console.error(e);
      }
    }
    // Migration from v2
    const oldSaved = localStorage.getItem('habit_tracker_data_v2');
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved);
        const cleanedLogs: Record<string, DailyLog> = {};
        if (parsed.logs) {
          Object.entries(parsed.logs).forEach(([k, v]: [string, any]) => {
            cleanedLogs[k] = { ...v, drankMilkTea: undefined };
          });
        }
        return { ...DEFAULT_USER_DATA, ...parsed, logs: cleanedLogs };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_USER_DATA;
  });

  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [timeLeft, setTimeLeft] = useState("");

  const today = startOfDay(new Date());
  const selectedKey = format(selectedDate, 'yyyy-MM-dd');

  // Persistence
  useEffect(() => {
    localStorage.setItem('habit_tracker_data_v3', JSON.stringify(userData));
  }, [userData]);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = addDays(startOfDay(now), 1);
      const diff = differenceInSeconds(tomorrow, now);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function differenceInSeconds(dateLeft: Date, dateRight: Date) {
    return Math.floor((dateLeft.getTime() - dateRight.getTime()) / 1000);
  }

  const streaks = useMemo(() => {
    const calculateStreak = (checkFn: (log: DailyLog) => boolean) => {
      let count = 0;
      let current = today;
      
      while (true) {
        const key = format(current, 'yyyy-MM-dd');
        const log = userData.logs[key];
        
        if (log && log.drankMilkTea !== undefined) {
          if (checkFn(log)) {
            count++;
            current = subDays(current, 1);
          } else {
            break;
          }
        } else {
          if (isSameDay(current, today)) {
            current = subDays(current, 1);
            continue;
          }
          break;
        }
      }
      return count;
    };

    const currentNoMilkTea = calculateStreak((log) => log.drankMilkTea === false);
    const currentGeneral = currentNoMilkTea;

    return {
      currentNoMilkTea,
      currentGeneral
    };
  }, [userData.logs, today]);

  // Update best streaks
  useEffect(() => {
    setUserData(prev => {
      let changed = false;
      const updates = { ...prev };
      if (streaks.currentNoMilkTea > prev.bestMilkTeaStreak) {
        updates.bestMilkTeaStreak = streaks.currentNoMilkTea;
        changed = true;
      }
      if (streaks.currentGeneral > prev.bestGeneralStreak) {
        updates.bestGeneralStreak = streaks.currentGeneral;
        changed = true;
      }
      return changed ? updates : prev;
    });
  }, [streaks]);

  const totals = useMemo(() => {
    let moneySaved = 0;
    let caloriesSaved = 0;
    let sugarSaved = 0;
    
    Object.values(userData.logs).forEach((log: DailyLog) => {
      if (log.drankMilkTea === false) {
        moneySaved += MILK_TEA_PRICE;
        caloriesSaved += MILK_TEA_KCAL;
        sugarSaved += MILK_TEA_SUGAR;
      }
    });

    // Heart health logic based on failures in last 30 days
    const last30Days = Array.from({length: 30}, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
    const milkTeaFailures = last30Days.filter(day => userData.logs[day]?.drankMilkTea).length;
    
    let heartStatus = "良好";
    let heartColor = "text-emerald-500";
    if (milkTeaFailures > 15) {
      heartStatus = "极差";
      heartColor = "text-rose-600";
    } else if (milkTeaFailures > 8) {
      heartStatus = "风险";
      heartColor = "text-amber-500";
    } else if (milkTeaFailures > 3) {
      heartStatus = "波动";
      heartColor = "text-blue-500";
    }

    return {
      money: moneySaved,
      kcal: caloriesSaved,
      sugar: sugarSaved,
      km: (caloriesSaved / 65).toFixed(1),
      heartStatus,
      heartColor
    };
  }, [userData.logs]);

  const medals = useMemo(() => {
    const list = [
      {
        id: 'beginner',
        title: '初出茅庐',
        icon: '🛡️',
        description: '连续坚持自律 3 天',
        achieved: streaks.currentGeneral >= 3
      },
      {
        id: 'week_warrior',
        title: '周旋到底',
        icon: '🗓️',
        description: '连续坚持自律 7 天',
        achieved: streaks.currentGeneral >= 7
      },
      {
        id: 'month_master',
        title: '月度锦标',
        icon: '🌙',
        description: '连续坚持自律 30 天',
        achieved: streaks.currentGeneral >= 30
      },
      {
        id: 'milktea_pro',
        title: '清爽一夏',
        icon: '🥤',
        description: '累积拒饮奶茶 20 次',
        achieved: Object.values(userData.logs).filter((l: any) => l.drankMilkTea === false).length >= 20
      },
      {
        id: 'sugar_free',
        title: '控糖专家',
        icon: '🍬',
        description: '累积减少摄入 1kg 糖分',
        achieved: totals.sugar >= 1000
      },
      {
        id: 'saver_500',
        title: '省钱达人',
        icon: '💰',
        description: '累积节省金额超过 ¥500',
        achieved: totals.money >= 500
      },
      {
        id: 'saver_2000',
        title: '理财能手',
        icon: '🏦',
        description: '累积节省金额超过 ¥2000',
        achieved: totals.money >= 2000
      },
      {
        id: 'kcal_killer',
        title: '热量杀手',
        icon: '🔥',
        description: '累积减少热量达 1w kcal',
        achieved: totals.kcal >= 10000
      },
      {
        id: 'marathon',
        title: '半程马拉松',
        icon: '🏁',
        description: '累计等效跑量达 21km',
        achieved: Number(totals.km) >= 21
      },
      {
        id: 'healthy_diet',
        title: '素食主义',
        icon: '🌿',
        description: '累计健康饮食 14 天',
        achieved: Object.values(userData.logs).filter((l: any) => l.ateHealthy).length >= 14
      },
      {
        id: 'active_soul',
        title: '运动健将',
        icon: '💪',
        description: '累计运动打卡超过 15 次',
        achieved: Object.values(userData.logs).filter((l: any) => l.didExercise).length >= 15
      }
    ];
    // Sort: Achieved first
    return list.sort((a, b) => (b.achieved ? 1 : 0) - (a.achieved ? 1 : 0));
  }, [streaks.currentGeneral, totals, userData.logs]);

  const setMilkTeaDrank = (drank: boolean) => {
    const currentStatus = userData.logs[selectedKey]?.drankMilkTea;
    const newStatus = currentStatus === drank ? undefined : drank;

    if (newStatus === false) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#34d399', '#fbbf24', '#60a5fa', '#f472b6']
      });
    }

    setUserData(prev => {
      const newLogs = { ...prev.logs };
      const existingLog = newLogs[selectedKey] || {
        didExercise: false,
        ateHealthy: true,
        timestamp: selectedDate.toISOString()
      };
      
      newLogs[selectedKey] = {
        ...existingLog,
        drankMilkTea: newStatus
      };
      
      return { ...prev, logs: newLogs };
    });
  };

  const currentLog = userData.logs[selectedKey];

  const changeDate = (direction: number) => {
    const newDate = addDays(selectedDate, direction);
    if (isBefore(newDate, START_DATE)) return;
    if (isAfter(newDate, today)) return;
    setSelectedDate(newDate);
  };

  const currentLevel = Math.floor(streaks.currentGeneral / 7) + Math.floor(totals.money / 500) + 1;
  const levelNames = [
    "自律萌新", 
    "控糖先锋", 
    "清爽智者", 
    "自律达人", 
    "养生大师", 
    "意志坚石", 
    "钢铁意志", 
    "超脱凡人", 
    "终极自律者"
  ];
  const levelName = levelNames[Math.min(currentLevel - 1, levelNames.length - 1)];

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetAllData = () => {
    if (window.confirm("确定要重置所有记录吗？此操作不可撤销。")) {
      setUserData(DEFAULT_USER_DATA);
      localStorage.removeItem('habit_tracker_data_v2');
      window.location.reload();
    }
  };

  return (
    <div className="h-screen bg-white md:max-w-md md:mx-auto md:shadow-xl overflow-hidden flex flex-col relative font-sans">
      <div className="flex-1 overflow-y-auto pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col pt-6"
            >
              <div className="px-6 mb-4 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg shadow-sm">
                  🧋
                </div>
                <span className="text-base font-black text-zinc-900 tracking-tight">BobaFree</span>
              </div>
              <header className="px-6 pb-6">
              <div className="flex justify-between items-center mb-8">
                <div className="flex flex-col">
                  <span className="text-zinc-400 text-xs font-medium uppercase tracking-widest">
                    {format(selectedDate, 'MMMM yyyy', { locale: zhCN })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black">
                      {format(selectedDate, 'd', { locale: zhCN })}日，{format(selectedDate, 'EEEE', { locale: zhCN })}
                    </span>
                    {!isSameDay(selectedDate, today) && (
                      <button 
                        onClick={() => setSelectedDate(today)}
                        className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full"
                      >
                        回到今天
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => changeDate(-1)}
                    disabled={isSameDay(selectedDate, START_DATE)}
                    className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 disabled:opacity-30"
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </button>
                   <button 
                    onClick={() => changeDate(1)}
                    disabled={isSameDay(selectedDate, today)}
                    className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 disabled:opacity-30"
                   >
                     <ChevronRight className="w-5 h-5" />
                   </button>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-orange-50 p-6 rounded-full mb-4 relative"
                >
                  <Flame className="w-12 h-12 text-orange-500 fill-orange-500" />
                  <motion.div 
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-orange-400 rounded-full filter blur-xl -z-10"
                  />
                </motion.div>
                <h1 className="text-8xl font-black tracking-tighter mb-1 leading-none text-zinc-900">
                  {streaks.currentGeneral}
                  <span className="text-xl font-medium text-zinc-300 ml-2">天</span>
                </h1>
                <div className="bg-emerald-50 px-4 py-1.5 rounded-full text-[11px] font-bold text-emerald-600 mt-4 flex items-center gap-1.5">
                  <CircleCheck className="w-3 h-3" />
                  已连续自律
                </div>
              </div>
            </header>

            {/* Today Punches */}
            <main className="px-6 space-y-8">
              <section>
                <h2 className="text-sm font-bold text-zinc-800 mb-4 px-1">今日打卡</h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* 左边：没喝奶茶（自律成功） */}
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMilkTeaDrank(false)}
                    className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all border relative overflow-hidden cursor-pointer ${
                      currentLog?.drankMilkTea === false 
                        ? 'bg-emerald-50/90 border-emerald-200 ring-4 ring-emerald-50 text-emerald-900 shadow-sm' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">🧋</div>
                    <span className="text-sm font-black whitespace-nowrap">没喝奶茶</span>
                    <span className="text-[10px] font-bold mt-1 text-emerald-600 opacity-80">省了18元</span>

                    {currentLog?.drankMilkTea === false && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-3 right-3 bg-emerald-500 text-white rounded-lg p-1 shadow-md flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* 右边：喝了奶茶 */}
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMilkTeaDrank(true)}
                    className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all border relative overflow-hidden cursor-pointer ${
                      currentLog?.drankMilkTea === true 
                        ? 'bg-rose-50 border-rose-200 ring-4 ring-rose-50 text-rose-800 shadow-sm' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">🥤</div>
                    <span className="text-sm font-black whitespace-nowrap">喝了奶茶</span>
                    <span className="text-[10px] font-bold mt-1 text-rose-500 opacity-80">太甜了</span>

                    {currentLog?.drankMilkTea === true && (
                      <motion.div 
                        initial={{ scale: 0, rotate: 20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-3 right-3 bg-rose-500 text-white rounded-lg p-1 shadow-md flex items-center justify-center"
                      >
                        <X className="w-4 h-4 stroke-[3]" />
                      </motion.div>
                    )}
                  </motion.button>
                </div>
              </section>

              {/* Stats Preview */}
              <section className="grid grid-cols-4 gap-2">
                 <div className="bg-amber-50 h-20 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-amber-600 font-bold opacity-70">节省</span>
                    <span className="text-sm font-black text-amber-900 tracking-tighter">¥{totals.money}</span>
                 </div>
                 <div className="bg-emerald-50 h-20 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-emerald-600 font-bold opacity-70">减糖</span>
                    <span className="text-sm font-black text-emerald-900 tracking-tighter">{totals.sugar}g</span>
                 </div>
                 <div className="bg-indigo-50 h-20 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-indigo-600 font-bold opacity-70">热量</span>
                    <span className="text-sm font-black text-indigo-900 tracking-tighter">{totals.kcal}k</span>
                 </div>
                 <div className="bg-rose-50 h-20 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-rose-600 font-bold opacity-70">燃脂</span>
                    <span className="text-sm font-black text-rose-900 tracking-tighter">{totals.km}km</span>
                 </div>
              </section>

              {/* Challenge Banner */}
              <section className="bg-zinc-900 p-6 rounded-3xl text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm mb-1 tracking-tight">今日小挑战</h4>
                    <p className="text-xs text-zinc-400 italic">打死不喝奶茶</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono font-bold text-amber-400">{timeLeft}</span>
                    <span className="text-[10px] text-zinc-500">剩余时间</span>
                  </div>
                </div>
                <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "65%" }}
                    className="h-full bg-amber-400" 
                  />
                </div>
              </section>
            </main>
          </motion.div>
        )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-6 pt-12"
            >
             <header className="mb-6 px-1">
               <h2 className="text-2xl font-black">自律统计</h2>
               <p className="text-xs text-zinc-400 mt-1">你的所有坚持都将被看见</p>
             </header>

             {/* Streak Summary */}
             <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
                <div className="flex-1">
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">当前不喝奶茶连胜</p>
                   <p className="text-xl font-black text-zinc-900">{streaks.currentNoMilkTea} 天</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-zinc-400">历史最高</p>
                   <p className="text-sm font-black text-zinc-500">{userData.bestMilkTeaStreak} 天</p>
                </div>
             </div>

             {/* Heatmap */}
             <section className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-bold mb-4">近 90 天记录</h3>
                <HeatMap logs={userData.logs} />
                <div className="flex justify-center gap-6 mt-6 text-[10px] font-bold text-zinc-400">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> 完美达成</div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> 有待加强</div>
                </div>
             </section>

             {/* Stats Expanded */}
             <div className="grid grid-cols-1 gap-4">
                <StatsBar 
                  label="节省总金额" 
                  value={`¥${totals.money}`} 
                  max={`¥10,000`} 
                  progress={(totals.money / 10000) * 100}
                  icon={<Wallet className="w-4 h-4" />}
                  color="bg-amber-400"
                />
                <StatsBar 
                  label="累计减糖" 
                  value={`${totals.sugar}g`} 
                  max={`5,000g`} 
                  progress={(totals.sugar / 5000) * 100}
                  icon={<Droplets className="w-4 h-4" />}
                  color="bg-emerald-400"
                />
                <StatsBar 
                  label="消耗卡路里" 
                  value={`${totals.kcal}kcal`} 
                  max={`50,000kcal`} 
                  progress={(totals.kcal / 50000) * 100}
                  icon={<Zap className="w-4 h-4" />}
                  color="bg-indigo-400"
                />
             </div>
          </motion.div>
        )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 space-y-6 pt-12"
            >
             {/* Profile Header */}
             <div className="flex flex-col items-center mb-8">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-zinc-100 border-4 border-white shadow-xl flex items-center justify-center text-4xl mb-4 overflow-hidden group relative"
                >
                   {userData.avatarUrl ? (
                     <img src={userData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     "👤"
                   )}
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-6 h-6 text-white" />
                   </div>
                </button>
                <h2 className="text-2xl font-black">{levelName}</h2>
                <div className="bg-zinc-900 text-white px-3 py-1 rounded-full text-[10px] font-bold mt-2">LV.{currentLevel}</div>
             </div>

             {/* Goal Tracking */}
             <section className="bg-emerald-50 p-6 rounded-3xl relative overflow-hidden">
                <Target className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-100 rotate-12" />
                <h3 className="text-emerald-900 font-bold mb-4 flex items-center gap-2">
                   <Trophy className="w-4 h-4" /> 奖励目标进度
                </h3>
                <div className="flex justify-between items-end mb-2">
                   <div className="flex flex-col flex-1">
                      <span className="text-xs text-emerald-700 opacity-60 font-medium italic">我想买...</span>
                      <input 
                        type="text" 
                        value={userData.savingsGoal.item}
                        onChange={(e) => setUserData(prev => ({ ...prev, savingsGoal: { ...prev.savingsGoal, item: e.target.value } }))}
                        className="text-lg font-black text-emerald-900 border-none bg-transparent p-0 focus:ring-0 w-full"
                        placeholder="输入目标名称"
                      />
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] text-emerald-700 font-bold opacity-60">目标金额 (¥)</span>
                      <div className="flex items-center text-xs font-bold text-emerald-700">
                        <span>¥{totals.money} / ¥</span>
                        <input 
                            type="number" 
                            value={userData.savingsGoal.price}
                            onChange={(e) => setUserData(prev => ({ ...prev, savingsGoal: { ...prev.savingsGoal, price: Number(e.target.value) } }))}
                            className="w-16 border-none bg-transparent p-0 focus:ring-0 font-bold text-right ml-0.5"
                        />
                      </div>
                   </div>
                </div>
                <div className="h-4 bg-emerald-100 rounded-full overflow-hidden p-1">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totals.money / (userData.savingsGoal.price || 1)) * 100, 100)}%` }}
                    className="h-full bg-emerald-500 rounded-full shadow-inner" 
                   />
                </div>
                <p className="text-[10px] text-emerald-600 font-medium mt-3 italic">
                  * 只需要再坚持省下 ¥{Math.max(userData.savingsGoal.price - totals.money, 0)} 即可达成！
                </p>
             </section>

             {/* Clever Features List */}
             <div className="grid grid-cols-1 gap-3">
                <ProfileItem 
                  icon={<Heart className={`w-5 h-5 ${totals.heartStatus === '良好' ? 'text-rose-400' : totals.heartColor}`} />} 
                  label="心脏健康报告" 
                  value={totals.heartStatus} 
                />
                
                <button 
                  onClick={() => setShowMedals(true)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-50 shadow-sm hover:bg-zinc-50 transition-colors"
                >
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-amber-400 text-xl">
                       ✨
                     </div>
                     <span className="text-sm font-bold text-zinc-700">勋章馆</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="flex -space-x-2">
                        {medals.filter(m => m.achieved).slice(0, 3).map(m => (
                          <div key={m.id} className="w-6 h-6 rounded-full bg-white border-2 border-zinc-50 flex items-center justify-center shadow-sm text-[10px]">
                            {m.icon}
                          </div>
                        ))}
                     </div>
                     <span className="text-sm font-black text-zinc-900 ml-2">{medals.filter(m => m.achieved).length} 枚</span>
                   </div>
                </button>

                <ProfileItem icon={<Clock className="w-5 h-5 text-zinc-400" />} label="自律总时长" value={`${totals.money ? Math.floor(totals.money / 2) : 0} 小时`} />
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-50 shadow-sm">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-emerald-400">
                       <TrendingUp className="w-5 h-5" />
                     </div>
                     <span className="text-sm font-bold text-zinc-700">体重变化趋向</span>
                   </div>
                   <input 
                    type="text" 
                    value={userData.weightChange}
                    onChange={(e) => setUserData(prev => ({ ...prev, weightChange: e.target.value }))}
                    className="text-sm font-black text-zinc-900 border-none bg-transparent w-20 text-right focus:ring-0"
                    placeholder="输入变化"
                   />
                </div>
             </div>

             <button 
                onClick={() => setShowSettings(true)}
                className="w-full bg-zinc-900 p-4 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-2 mt-4 hover:bg-zinc-800 transition-colors"
             >
                <Settings className="w-4 h-4" /> 设置与偏好
             </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-3xl border-t border-zinc-200 flex justify-around items-center px-6 z-[60] pb-6">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<HomeIcon />} label="主页" />
        <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<TrendingUp />} label="统计" />
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User />} label="我的" />
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black mb-1">设置</h2>
              <p className="text-xs text-zinc-400 mb-8 font-medium">应用配置与偏好</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <span className="text-sm font-bold text-zinc-700">推送提醒</span>
                  <div className="w-10 h-6 bg-emerald-500 rounded-full relative p-1 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <span className="text-sm font-bold text-zinc-700">多设备同步</span>
                  <span className="text-[10px] text-zinc-400">即将上线</span>
                </div>
                
                <button 
                  onClick={resetAllData}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold mt-8"
                >
                   重置所有数据
                </button>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMedals && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowMedals(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black mb-1">勋章馆</h2>
              <p className="text-xs text-zinc-400 mb-6 font-medium">查看你的每一份自律荣光</p>
              
              <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 pb-4 scrollbar-hide">
                {medals.map(medal => (
                  <div key={medal.id} className={`p-5 rounded-3xl flex flex-col items-center border transition-all ${medal.achieved ? 'bg-amber-50 border-amber-100' : 'bg-zinc-50 border-zinc-100 opacity-40 grayscale'}`}>
                    <div className="text-4xl mb-3">{medal.icon}</div>
                    <span className="text-sm font-bold text-zinc-800">{medal.title}</span>
                    <p className="text-[10px] text-center text-zinc-500 mt-1 leading-tight">{medal.description}</p>
                    {medal.achieved && (
                      <div className="mt-3 bg-amber-500 text-white p-1 rounded-full">
                        <CircleCheck className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowMedals(false)}
                className="w-full mt-8 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-colors"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HabitBtn({ icon, label, done, onClick, variant, subLabel }: { 
  icon: string, 
  label: string, 
  done: boolean, 
  onClick: () => void,
  variant: 'milk-tea' | 'green' | 'blue',
  subLabel?: string
}) {
  const themes = {
    'milk-tea': { active: 'bg-zinc-50 border-zinc-100 ring-4 ring-zinc-50', inactive: 'bg-rose-50 border-rose-100 ring-4 ring-rose-50 text-rose-600' },
    'green': { active: 'bg-emerald-50 border-emerald-100 text-emerald-600', inactive: 'bg-zinc-50 border-zinc-100' },
    'blue': { active: 'bg-blue-50 border-blue-100 text-blue-600', inactive: 'bg-zinc-50 border-zinc-100' },
  };

  const theme = done ? themes[variant].active : themes[variant].inactive;

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all border ${theme} relative overflow-hidden`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <span className="text-sm font-black whitespace-nowrap">{label}</span>
      {subLabel && (
        <span className="text-[10px] opacity-60 font-bold mt-1 uppercase tracking-tighter">{subLabel}</span>
      )}
      {done && variant === 'milk-tea' && (
        <motion.div 
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           className="absolute top-2 right-4 text-[10px]"
        >
          ✅
        </motion.div>
      )}
    </motion.button>
  );
}

function HeatMap({ logs }: { logs: Record<string, DailyLog> }) {
  const last90Days = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, 89);
    return eachDayOfInterval({ start, end });
  }, []);

  return (
    <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
      {last90Days.map((date, idx) => {
        const key = format(date, 'yyyy-MM-dd');
        const log = logs[key];
        
        let bgColor = 'bg-zinc-100';
        if (log && log.drankMilkTea !== undefined) {
          if (log.drankMilkTea) {
            bgColor = 'bg-rose-500';
          } else {
            bgColor = 'bg-emerald-500';
          }
        } else if (isSameDay(date, new Date())) {
          bgColor = 'ring-2 ring-emerald-400 bg-white';
        }

        return (
          <div 
            key={idx}
            className={`aspect-square rounded-md ${bgColor} transition-colors duration-300 shadow-sm`}
            title={format(date, 'yyyy-MM-dd')}
          />
        );
      })}
    </div>
  );
}

function StatsBar({ label, value, max, progress, icon, color }: { label: string, value: string, max: string, progress: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color} text-white shadow-lg`}>
             {icon}
           </div>
           <span className="text-sm font-bold text-zinc-800">{label}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-zinc-900">{value}</p>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">目标: {max}</p>
        </div>
      </div>
      <div className="h-2 bg-zinc-50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          className={`h-full ${color}`} 
        />
      </div>
    </div>
  );
}

function ProfileItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-50 shadow-sm">
       <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
           {icon}
         </div>
         <span className="text-sm font-bold text-zinc-700">{label}</span>
       </div>
       <span className="text-sm font-black text-zinc-900">{value}</span>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-2 transition-all group ${active ? 'scale-110' : ''}`}
    >
      <div className={`transition-colors duration-300 p-1.5 rounded-xl ${active ? 'text-emerald-600 bg-emerald-50 shadow-sm' : 'text-zinc-500 group-hover:text-zinc-800'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={`text-[11px] font-bold tracking-tight ${active ? 'text-zinc-900 font-black' : 'text-zinc-500 group-hover:text-zinc-800'}`}>{label}</span>
    </button>
  );
}

function StarIcon() {
  return <div className="text-amber-400">✨</div>;
}

