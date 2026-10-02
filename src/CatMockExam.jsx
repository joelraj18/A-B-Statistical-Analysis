import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ErrorBar,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { 
  Calculator, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  BarChart2, 
  Users,
  Percent,
  Info,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  LogOut,
  Download,
  History,
  Trash2,
  BookOpen,
  Target,
  Menu,
  X,
  Save,
  ChevronRight,
  FlaskConical,
  BrainCircuit
} from 'lucide-react';

// --- STATISTICAL UTILITY FUNCTIONS ---

const standardNormalCDF = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

const normInv = (p) => {
  const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
  const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  const b1 = -54.4760987982241, b2 = 161.585036826915, b3 = -155.698979859887;
  const b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029e-03;
  const c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
  const c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146e-03;
  const d2 = 0.322467129070039, d3 = 2.445134137143, d4 = 3.75440866190742;
  const p_low = 0.02425, p_high = 1 - 0.02425;

  let q, r;
  if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= p_high) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
};

const getZScoreForConfidence = (confidence) => {
  if (confidence >= 0.99) return 2.576;
  if (confidence >= 0.95) return 1.96;
  if (confidence >= 0.90) return 1.645;
  return 1.96;
};

const formatPct = (num) => `${(num * 100).toFixed(2)}%`;
const formatNum = (num) => new Intl.NumberFormat('en-US').format(num);

// --- AUTH COMPONENT ---

const AuthScreen = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // In a real app, this would hit an API. Here we use localStorage.
    const users = JSON.parse(localStorage.getItem('abtest_users') || '{}');
    
    if (isRegistering) {
      if (users[formData.email]) {
        setError('User already exists.');
        return;
      }
      users[formData.email] = { 
        name: formData.name, 
        email: formData.email, 
        password: formData.password,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('abtest_users', JSON.stringify(users));
      onLogin(users[formData.email]);
    } else {
      const user = users[formData.email];
      if (user && user.password === formData.password) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Try registering first.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-white/5 backdrop-blur-lg w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative z-10">
        <div className="p-8 text-center border-b border-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Data Science Lab</h2>
          <p className="text-slate-400 text-sm">Professional A/B Testing & Analysis Platform</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative group">
                  <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-slate-800/50 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    placeholder="Jane Analyst"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="email" 
                  required 
                  className="w-full bg-slate-800/50 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="analyst@data.co"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="password" 
                  required 
                  className="w-full bg-slate-800/50 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/25 mt-2"
            >
              {isRegistering ? 'Initialize Workspace' : 'Access Dashboard'}
            </button>
          </form>
        </div>

        <div className="bg-white/5 p-4 text-center border-t border-white/5">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-sm text-indigo-400 font-medium hover:text-indigo-300 transition"
          >
            {isRegistering ? 'Already have credentials? Sign In' : 'New researcher? Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function CatMockExam() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('analyze');
  const [testHistory, setTestHistory] = useState([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Load user session and data
  useEffect(() => {
    const storedUser = localStorage.getItem('abtest_current_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        loadUserData(parsedUser.email);
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }, []);

  const loadUserData = (email) => {
    const history = localStorage.getItem(`abtest_history_${email}`);
    if (history) setTestHistory(JSON.parse(history));
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('abtest_current_user', JSON.stringify(userData));
    loadUserData(userData.email);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('abtest_current_user');
    setTestHistory([]);
    setActiveTab('analyze');
  };

  const saveTestToHistory = (testData) => {
    const newHistory = [
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...testData
      },
      ...testHistory
    ].slice(0, 100); // Keep last 100 tests
    
    setTestHistory(newHistory);
    localStorage.setItem(`abtest_history_${user.email}`, JSON.stringify(newHistory));
  };

  const deleteTest = (id) => {
    const newHistory = testHistory.filter(t => t.id !== id);
    setTestHistory(newHistory);
    localStorage.setItem(`abtest_history_${user.email}`, JSON.stringify(newHistory));
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-slate-300 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col fixed h-full z-20`}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-slate-950">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 font-bold text-white">
              <FlaskConical className="text-indigo-500" />
              <span>DS Lab</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors ml-auto"
          >
            {isSidebarOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          <NavButton 
            active={activeTab === 'analyze'} 
            onClick={() => setActiveTab('analyze')} 
            icon={<BarChart2 size={20} />} 
            label="A/B Analyzer" 
            expanded={isSidebarOpen} 
          />
          <NavButton 
            active={activeTab === 'plan'} 
            onClick={() => setActiveTab('plan')} 
            icon={<Target size={20} />} 
            label="Sample Planner" 
            expanded={isSidebarOpen} 
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History size={20} />} 
            label="Test History" 
            expanded={isSidebarOpen} 
            badge={testHistory.length}
          />
          <NavButton 
            active={activeTab === 'guide'} 
            onClick={() => setActiveTab('guide')} 
            icon={<BookOpen size={20} />} 
            label="Knowledge Base" 
            expanded={isSidebarOpen} 
          />
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            )}
            {isSidebarOpen && (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="bg-white h-16 border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">
            {activeTab === 'analyze' && 'A/B Statistical Analysis'}
            {activeTab === 'plan' && 'Sample Size Calculation'}
            {activeTab === 'history' && 'Experiment Archive'}
            {activeTab === 'guide' && 'Methodology Guide'}
          </h1>
          <div className="text-xs text-slate-400 font-mono">
            v2.4.0 • Pro
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'analyze' && <Analyzer onSave={saveTestToHistory} />}
          {activeTab === 'plan' && <SampleSizePlanner />}
          {activeTab === 'history' && <TestHistory history={testHistory} onDelete={deleteTest} />}
          {activeTab === 'guide' && <Guide />}
        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

const NavButton = ({ active, onClick, icon, label, expanded, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
      {icon}
    </span>
    {expanded ? (
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
    ) : (
      // Tooltip for collapsed state
      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    )}
    {expanded && badge > 0 && (
      <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </button>
);

// --- ANALYZER COMPONENT ---


function Analyzer({ onSave }) {
  const [data, setData] = useState({
    testName: '',
    hypothesis: '', // New Feature: Hypothesis tracking
    visitorsA: 25000,
    conversionsA: 3500,
    visitorsB: 25000,
    conversionsB: 3850,
    confidence: 0.95
  });

  const [results, setResults] = useState(null);
  const [curveData, setCurveData] = useState([]); // New State: For Bell Curve

  // Auto-calculate on data change
  useEffect(() => {
    const { visitorsA, conversionsA, visitorsB, conversionsB, confidence } = data;

    if (!visitorsA || !visitorsB) return;

    const rateA = conversionsA / visitorsA;
    const rateB = conversionsB / visitorsB;
    const uplift = (rateB - rateA) / rateA;
    
    // Standard Errors
    const seA = Math.sqrt((rateA * (1 - rateA)) / visitorsA);
    const seB = Math.sqrt((rateB * (1 - rateB)) / visitorsB);
    
    // Pooled Standard Error for Z-Test
    const sePooled = Math.sqrt((rateA * (1 - rateA) / visitorsA) + (rateB * (1 - rateB) / visitorsB));
    
    // Z-Score
    const zScore = (rateB - rateA) / sePooled;
    
    // P-Value (Two-tailed)
    const pValue = 2 * (1 - standardNormalCDF(Math.abs(zScore)));
    
    // Probability B beats A (One-tailed approximation for "Chance to Win")
    const probBBeatsA = standardNormalCDF(zScore);
    
    // Significance Decision
    const alpha = 1 - confidence;
    const isSignificant = pValue < alpha;
    
    // Confidence Interval of the Difference
    const zCrit = getZScoreForConfidence(confidence);
    const ciLower = (rateB - rateA) - (zCrit * sePooled);
    const ciUpper = (rateB - rateA) + (zCrit * sePooled);

    // --- NEW: Generate Bell Curve Data ---
    // We create a shared X-axis range to plot both distributions
    const minX = Math.min(rateA - 4 * seA, rateB - 4 * seB);
    const maxX = Math.max(rateA + 4 * seA, rateB + 4 * seB);
    const step = (maxX - minX) / 60; // 60 points for smoothness

    const newCurveData = [];
    for (let i = 0; i <= 60; i++) {
      const x = minX + (i * step);
      // Normal Distribution PDF Formula
      const yA = Math.exp(-0.5 * Math.pow((x - rateA) / seA, 2)); 
      const yB = Math.exp(-0.5 * Math.pow((x - rateB) / seB, 2)); 
      newCurveData.push({ x, yA, yB });
    }
    setCurveData(newCurveData);

    setResults({
      rateA,
      rateB,
      uplift,
      zScore,
      pValue,
      probBBeatsA, // New Metric
      isSignificant,
      ciLower,
      ciUpper,
      errorA: zCrit * seA, // 95% CI for bar chart
      errorB: zCrit * seB,
      absoluteDiff: rateB - rateA
    });
  }, [data]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      [name]: (name === 'testName' || name === 'hypothesis') ? value : (parseFloat(value) || 0)
    }));
  };

  const handleSave = () => {
    if (results) {
      onSave({
        testName: data.testName || `Experiment #${Math.floor(Math.random() * 1000)}`,
        hypothesis: data.hypothesis,
        ...data,
        ...results
      });
    }
  };

  const barChartData = results ? [
    { name: 'Control (A)', rate: results.rateA, error: results.errorA, fill: '#94a3b8' },
    { name: 'Variant (B)', rate: results.rateB, error: results.errorB, fill: '#6366f1' }
  ] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Configuration Panel */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FlaskConical size={18} className="text-indigo-600" />
              Experiment Setup
            </h3>
          </div>
          
          <div className="p-6 space-y-5">
             <div>
               <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Experiment Name</label>
               <input
                 type="text"
                 name="testName"
                 value={data.testName}
                 onChange={handleInputChange}
                 placeholder="e.g. Checkout Flow V2"
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
               />
             </div>
             
             {/* New Feature: Hypothesis Field */}
             <div>
               <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Hypothesis</label>
               <textarea
                 name="hypothesis"
                 value={data.hypothesis}
                 onChange={handleInputChange}
                 placeholder="If we change X, then Y will happen because Z..."
                 rows={2}
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
               />
             </div>

            <div className="grid grid-cols-2 gap-4">
               {/* Control Group */}
               <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Control (A)</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">Visitors</label>
                      <input type="number" name="visitorsA" value={data.visitorsA} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Conversions</label>
                      <input type="number" name="conversionsA" value={data.conversionsA} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"/>
                    </div>
                  </div>
               </div>
               
               {/* Variant Group */}
               <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2">Variant (B)</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-indigo-300">Visitors</label>
                      <input type="number" name="visitorsB" value={data.visitorsB} onChange={handleInputChange} className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"/>
                    </div>
                    <div>
                      <label className="block text-[10px] text-indigo-300">Conversions</label>
                      <input type="number" name="conversionsB" value={data.conversionsB} onChange={handleInputChange} className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"/>
                    </div>
                  </div>
               </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-semibold text-slate-500 uppercase">Confidence Level</label>
                 <span className="text-xs font-bold text-indigo-600">{(data.confidence * 100).toFixed(0)}%</span>
               </div>
               <input type="range" min="0.80" max="0.99" step="0.01" name="confidence" value={data.confidence} onChange={handleInputChange} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
            </div>

            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 text-sm font-medium">
              <Save size={16} /> Save to History
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="lg:col-span-8 space-y-6">
        {results && (
          <>
            {/* Primary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Decision Card */}
              <div className={`p-5 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-between ${results.isSignificant ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                   <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Statistical Decision</h4>
                   <div className={`text-xl font-bold ${results.isSignificant ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {results.isSignificant ? 'Significant Result' : 'Inconclusive'}
                   </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                   {results.isSignificant ? <CheckCircle2 className="text-emerald-500" size={20}/> : <AlertCircle className="text-slate-400" size={20}/>}
                   <span className="text-xs opacity-80">{results.isSignificant ? 'Safe to deploy' : 'Collect more data'}</span>
                </div>
              </div>

              {/* Chance to Win Card (New Feature) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                 <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Probability B &gt; A</h4>
                    <div className="text-3xl font-bold text-slate-800">
                       {(results.probBBeatsA * 100).toFixed(1)}%
                    </div>
                 </div>
                 <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${results.probBBeatsA > 0.95 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      style={{width: `${results.probBBeatsA * 100}%`}}
                    ></div>
                 </div>
              </div>

              {/* Uplift Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                 <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Observed Uplift</h4>
                    <div className={`text-3xl font-bold ${results.uplift > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                       {results.uplift > 0 ? '+' : ''}{formatPct(results.uplift)}
                    </div>
                 </div>
                 <div className="text-xs text-slate-400 mt-2">
                    Confidence Interval: {formatPct(results.ciLower)} to {formatPct(results.ciUpper)}
                 </div>
              </div>
            </div>

            {/* Visual Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chart 1: Distribution Curves (New Feature) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[320px] flex flex-col">
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <BrainCircuit size={18} className="text-indigo-500" />
                    Distribution Analysis
                  </h4>
                  <p className="text-xs text-slate-400">Visualizing the spread and overlap of conversion rates.</p>
                </div>
                <div className="flex-1 w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={curveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="x" 
                        tickFormatter={(val) => `${(val * 100).toFixed(1)}%`} 
                        tick={{fontSize: 10, fill: '#94a3b8'}} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={() => null} /> {/* Custom tooltip hidden for cleaner look */}
                      <Area 
                        type="monotone" 
                        dataKey="yA" 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorA)" 
                        name="Control"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="yB" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorB)" 
                        name="Variant"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-xs mt-2">
                   <span className="flex items-center gap-1.5 text-slate-500"><div className="w-2 h-2 rounded-full bg-slate-400"></div>Control (A) Distribution</span>
                   <span className="flex items-center gap-1.5 text-indigo-600 font-medium"><div className="w-2 h-2 rounded-full bg-indigo-500"></div>Variant (B) Distribution</span>
                </div>
              </div>

              {/* Chart 2: Rate Comparison with Error Bars */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[320px] flex flex-col">
                <div className="mb-4">
                   <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                     <BarChart2 size={18} className="text-indigo-500" />
                     Rate Comparison
                   </h4>
                   <p className="text-xs text-slate-400">Comparing conversion rates with 95% error intervals.</p>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                      <YAxis 
                        tickFormatter={(val) => `${(val * 100).toFixed(1)}%`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#64748b'}}
                        width={35}
                      />
                      <Tooltip 
                        formatter={(value) => [`${(value * 100).toFixed(2)}%`, 'Rate']}
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={50}>
                         <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#334155" />
                         {barChartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                         ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Plain English Summary */}
            <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                <div className="relative z-10">
                   <h4 className="flex items-center gap-2 font-bold mb-3 text-indigo-100">
                     <Info size={18} /> Executive Summary
                   </h4>
                   <p className="leading-relaxed opacity-90 text-sm md:text-base">
                     Test variant <strong>B</strong> achieved a conversion rate of <strong>{formatPct(results.rateB)}</strong>, outperforming Control A by <strong>{formatPct(results.uplift)}</strong>. 
                     
                     {results.isSignificant ? (
                       <span> Because the P-value ({results.pValue.toFixed(4)}) is lower than your significance threshold ({(1-data.confidence).toFixed(2)}), <strong>this result is statistically significant</strong>. You can proceed with rolling out the changes.</span>
                     ) : (
                       <span> However, the result is <strong>not statistically significant</strong> yet. The observed difference could be due to random chance. We recommend collecting more data before making a decision.</span>
                     )}
                   </p>
                </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}

// --- SAMPLE SIZE PLANNER COMPONENT ---

function SampleSizePlanner() {
  const [inputs, setInputs] = useState({
    baselineRate: 0.20,
    mde: 0.05,
    power: 0.8,
    significance: 0.05
  });

  const [size, setSize] = useState(0);

  useEffect(() => {
    const p1 = inputs.baselineRate;
    const p2 = inputs.baselineRate * (1 + inputs.mde);
    
    if(p2 > 1 || p2 < 0) return;

    const alpha = inputs.significance;
    const beta = 1 - inputs.power;

    const zAlpha = normInv(1 - alpha / 2);
    const zBeta = normInv(1 - beta);

    const numerator = Math.pow(zAlpha + zBeta, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
    const denominator = Math.pow(p1 - p2, 2);

    setSize(Math.ceil(numerator / denominator));
  }, [inputs]);

  const handleChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: parseFloat(e.target.value) });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Target className="text-indigo-600" size={20} />
            Parameters
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                Baseline Conversion Rate
                <span className="text-indigo-600">{formatPct(inputs.baselineRate)}</span>
              </label>
              <input 
                type="range" 
                min="0.01" 
                max="0.50" 
                step="0.005"
                name="baselineRate"
                value={inputs.baselineRate}
                onChange={handleChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-1">Current performance of the control version.</p>
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                Minimum Detectable Effect (MDE)
                <span className="text-indigo-600">{formatPct(inputs.mde)}</span>
              </label>
              <input 
                type="range" 
                min="0.01" 
                max="0.20" 
                step="0.005"
                name="mde"
                value={inputs.mde}
                onChange={handleChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-1">Relative uplift you want to be able to detect.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statistical Power</label>
                <select name="power" value={inputs.power} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value={0.8}>80% (Standard)</option>
                  <option value={0.9}>90% (High)</option>
                  <option value={0.95}>95% (Very High)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Significance Level</label>
                <select name="significance" value={inputs.significance} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value={0.05}>5% (95% CI)</option>
                  <option value={0.01}>1% (99% CI)</option>
                  <option value={0.10}>10% (90% CI)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-sm text-indigo-900">
           <p className="font-semibold mb-2">Why this matters?</p>
           <p className="leading-relaxed opacity-90">
             Underpowered tests are a common pitfall. If you stop a test before reaching this sample size, you risk missing real improvements (Type II error) or, worse, seeing "significance" that is just noise (Peeking problem).
           </p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="relative z-10">
          <h3 className="text-indigo-300 font-medium uppercase tracking-wider text-sm mb-8">Required Sample Size</h3>
          
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-6xl font-bold tracking-tight">{formatNum(size)}</span>
          </div>
          <p className="text-lg text-slate-400 mb-8 pb-8 border-b border-white/10">visitors per variation</p>

          <div className="space-y-4 text-sm font-mono text-indigo-200">
            <div className="flex justify-between">
              <span>Total Traffic Required:</span>
              <span className="text-white">{formatNum(size * 2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Control Rate (p1):</span>
              <span className="text-white">{formatPct(inputs.baselineRate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Variant Rate (p2):</span>
              <span className="text-white">{formatPct(inputs.baselineRate * (1 + inputs.mde))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- HISTORY COMPONENT ---

function TestHistory({ history, onDelete }) {
  const exportData = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abtest_history_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="text-slate-400" size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-900">No tests recorded yet</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">
          Run an analysis in the "Analyzer" tab and click Save to build your experiment repository.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Experiment Archive</h2>
        <button 
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
        >
          <Download size={16} /> Export JSON
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Experiment Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Result</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Uplift</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((test) => (
              <tr key={test.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                  {new Date(test.timestamp).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  {test.testName}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${test.isSignificant ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {test.isSignificant ? 'Significant' : 'Inconclusive'}
                  </span>
                </td>
                <td className={`px-6 py-4 font-mono font-medium ${test.uplift > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {test.uplift > 0 ? '+' : ''}{formatPct(test.uplift)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onDelete(test.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- GUIDE COMPONENT ---

function Guide() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-4">A/B Testing Methodology</h2>
        <p className="text-indigo-100 text-lg leading-relaxed max-w-2xl">
          A rigorous statistical framework for making data-driven product decisions. 
          This platform uses a frequentist approach (Two-tailed Z-test) to compare sample proportions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FlaskConical className="text-indigo-600" size={20} />
            The Z-Test
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            We use a two-proportion Z-test to determine if the difference between two conversion rates is statistically significant. This assumes the data follows a normal distribution (Central Limit Theorem), which is valid for the sample sizes typically seen in web traffic.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="text-indigo-600" size={20} />
            Common Pitfalls
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span><strong>Peeking:</strong> Checking results too often increases the False Positive rate. Commit to a sample size beforehand.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-600 font-bold">•</span>
              <span><strong>Seasonality:</strong> Ensure your test runs for full business cycles (usually full weeks) to avoid day-of-week bias.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}