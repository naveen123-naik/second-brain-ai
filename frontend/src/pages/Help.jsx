import { useState } from "react";
import { 
  Rocket, Sparkles, Brain, UploadCloud, Shield, HelpCircle, 
  Mail, Clock, Search, ChevronRight, ChevronDown, BookOpen 
} from "lucide-react";

function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all"); // all, start, ai, memory, uploads, security, faq
  const [expandedFaq, setExpandedFaq] = useState(null);

  const categories = [
    { id: "all", name: "📚 All Guides", icon: BookOpen },
    { id: "start", name: "🚀 Getting Started", icon: Rocket },
    { id: "ai", name: "🤖 Using the AI", icon: Sparkles },
    { id: "memory", name: "🧠 Memory Matrix", icon: Brain },
    { id: "uploads", name: "📄 File Uploads", icon: UploadCloud },
    { id: "security", name: "🔐 Security & Account", icon: Shield },
    { id: "faq", name: "❓ FAQ", icon: HelpCircle }
  ];

  const docSections = [
    {
      category: "start",
      title: "🚀 Getting Started",
      items: [
        {
          title: "How to create an account",
          content: "Navigate to the Login page and click on 'Register' or 'Sign Up'. Fill in your profile details, email address, and a secure password. Alternatively, you can use Google Sign-In for instant account creation."
        },
        {
          title: "How to log in",
          content: "Enter your registered email address and secure passphrase on the login screen. If you signed up via Google, click the 'Sign In with Google' button directly."
        },
        {
          title: "How to start a chat",
          content: "Click the '+ New Chat' button in the sidebar. This clears the current stream and opens a new session. You can view previous conversation logs under 'Recent Transmits' in the sidebar navigation."
        },
        {
          title: "How to upload files",
          content: "Navigate to 'Upload Context' in the sidebar. Drag and drop your documents or click the selector area. Once uploaded, the file will be processed and indexed into your neural knowledge base."
        }
      ]
    },
    {
      category: "ai",
      title: "🤖 Using the AI",
      items: [
        {
          title: "Ask questions",
          content: "Go to 'Neural Chat', type any question in the input bar at the bottom, and hit Enter or click send. The AI automatically leverages your uploaded context documents to generate accurate, source-grounded answers."
        },
        {
          title: "Generate code",
          content: "Ask the AI to write code in any major language (Python, JavaScript, Go, C++, etc.). The engine formats code cleanly inside syntax-highlighted blocks and provides line-by-line explanations below."
        },
        {
          title: "Analyze documents",
          content: "Upload spreadsheets, PDFs, or images, and then ask the AI to summarize them, extract statistics, or highlight inconsistencies. The model retrieves text from files automatically."
        },
        {
          title: "Voice chat",
          content: "Navigate to 'Voice Sync' in the sidebar. Enable microphone permissions, click start, and talk naturally. The AI transcribes your voice, processes the query, and plays back the speech."
        },
        {
          title: "Supported languages",
          content: "The AI system natively understands and responds in English, Spanish, French, German, and dozens of other languages. You can configure your preferred system language in Settings → AI Preferences."
        }
      ]
    },
    {
      category: "memory",
      title: "🧠 Memory Matrix",
      items: [
        {
          title: "What memory is",
          content: "Memory allows the AI to remember core details about you—like user preferences, project parameters, coding rules, and past interactions—across different chat streams and refreshes."
        },
        {
          title: "How memory works",
          content: "When key details or preferences are identified in conversation, they are written to a semantic vector store. During subsequent chats, relevant memory snippets are retrieved and injected into the model's system context."
        },
        {
          title: "How to edit/delete memories",
          content: "Go to Settings → Memory. You can toggle the core memory system off, review all saved memory vectors, and click the delete trash icon next to individual vectors to purge specific items."
        }
      ]
    },
    {
      category: "uploads",
      title: "📄 File Uploads",
      items: [
        {
          title: "Supported file types",
          content: "You can upload PDF files (.pdf), Microsoft Word documents (.docx), plain text files (.txt), and major image formats (JPEG, PNG, WEBP) for visual analysis."
        },
        {
          title: "File size limits",
          content: "Individual file uploads are limited to 25MB. If you have larger documents, we recommend splitting them into smaller chapters or volumes before uploading."
        },
        {
          title: "Troubleshooting upload issues",
          content: "If an upload fails, check that the file size is below 25MB and the extension is supported. Ensure your connection is stable. If errors persist, clear your browser cache or re-save the document as a standard PDF."
        }
      ]
    },
    {
      category: "security",
      title: "🔐 Account & Security",
      items: [
        {
          title: "Change password",
          content: "Go to Settings → Account. Locate the 'Update Encryption Cipher' section, enter your current passphrase, choose a new secure password, and click update."
        },
        {
          title: "Reset password",
          content: "If you forget your password, click the 'Forgot Password' link on the Login page (or contact support) to receive an email verification link to reset your credentials."
        },
        {
          title: "Delete account",
          content: "Navigate to Settings → Account, scroll to the bottom, and click 'Delete Account'. Warning: This completely deletes your user profile, indexing directories, and conversation history permanently."
        },
        {
          title: "Privacy information",
          content: "All uploaded documents and chat histories are encrypted in transit and at rest. Your knowledge vaults are private to your user session and are never used to train public LLM models."
        }
      ]
    }
  ];

  const faqs = [
    {
      question: "Why can't I log in?",
      answer: "Check your email spelling and password capitalization. Passwords are case-sensitive. If you previously registered using Google Sign-In, please continue to use the Google Sign-In option to access your account."
    },
    {
      question: "Why is my file upload failing?",
      answer: "Ensure the file size is below the 25MB limit and that it matches our supported formats (PDF, DOCX, TXT, PNG, JPG). If it is a scanned document, make sure it is not corrupt or password-protected."
    },
    {
      question: "How do I clear chat history?",
      answer: "Go to Settings → Data & Privacy. Locate the 'Clear Conversational Memory' card and click 'PURGE HISTORY'. This permanently clears all transcripts from your database."
    }
  ];

  // Search filtering logic
  const getFilteredDocs = () => {
    return docSections
      .map(section => {
        const filteredItems = section.items.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return { ...section, items: filteredItems };
      })
      .filter(section => 
        (activeCategory === "all" || section.category === activeCategory) && 
        section.items.length > 0
      );
  };

  const getFilteredFaqs = () => {
    if (activeCategory !== "all" && activeCategory !== "faq") return [];
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredSections = getFilteredDocs();
  const filteredFaqs = getFilteredFaqs();

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto pb-12 w-full h-[calc(100vh-8rem)]">
      
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 flex flex-col gap-1.5 shrink-0">
        <h2 className="font-display text-2xl text-[#e9e6f9] mb-4 tracking-tight px-2">Help & Docs</h2>
        <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setExpandedFaq(null); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all text-left whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? "bg-[#1E192E] text-white shadow-glow-primary border-l-2 border-l-[#a882ff]" 
                    : "text-white/60 hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#a882ff]" : "text-white/40"}`} />
                <span>{cat.name.substring(2)}</span>
              </button>
            );
          })}
        </div>

        {/* Contact Support Card */}
        <div className="hidden lg:flex flex-col gap-3 p-5 rounded-2xl bg-[#121220]/60 border border-white/5 mt-auto">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#a882ff]" />
            <span className="text-xs font-semibold text-white">Contact Support</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] text-[#aba9bb]">Have unresolved questions?</p>
            <p className="text-[10px] font-mono text-[#b6a0ff] break-all">support@yourapp.com</p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-[#aba9bb]/70 mt-1 font-mono uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            <span>Response: 24-48 hours</span>
          </div>
        </div>
      </div>

      {/* Main Documentation Container */}
      <div className="flex-1 glass-card p-8 border border-white/10 flex flex-col overflow-y-auto relative h-full">
        
        {/* Search Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Knowledge Directory</h3>
            <p className="text-xs text-[#aba9bb] font-light">Search guides, setup procedures, and system features.</p>
          </div>
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121220] border border-white/10 text-white rounded-full py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#b6a0ff]/50 focus:shadow-glow-primary transition-all font-sans"
            />
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Docs List */}
        <div className="space-y-10 flex-1">
          {filteredSections.map((section, idx) => (
            <div key={idx} className="space-y-4 animate-fadeIn">
              <h4 className="text-sm font-semibold text-[#b6a0ff] tracking-wider uppercase pl-1">{section.title}</h4>
              <div className="grid grid-cols-1 gap-4">
                {section.items.map((item, itemIdx) => (
                  <div 
                    key={itemIdx} 
                    className="p-5 rounded-2xl bg-[#121220]/40 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2"
                  >
                    <h5 className="text-sm font-bold text-white">{item.title}</h5>
                    <p className="text-xs text-[#aba9bb] leading-relaxed font-light">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* FAQ Accordion */}
          {filteredFaqs.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              <h4 className="text-sm font-semibold text-[#b6a0ff] tracking-wider uppercase pl-1">❓ Frequently Asked Questions</h4>
              <div className="space-y-2">
                {filteredFaqs.map((faq, faqIdx) => {
                  const isExpanded = expandedFaq === faqIdx;
                  return (
                    <div 
                      key={faqIdx} 
                      className="rounded-xl border border-white/5 bg-[#121220]/40 overflow-hidden transition-all duration-300"
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : faqIdx)}
                        className="w-full flex justify-between items-center p-4 text-left hover:bg-white/[0.02] cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-white">{faq.question}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#a882ff] shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="p-4 bg-[#121220]/60 border-t border-white/5 text-xs text-[#aba9bb] leading-relaxed font-light animate-slideDown">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty search fallback */}
          {filteredSections.length === 0 && filteredFaqs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HelpCircle className="w-12 h-12 text-white/20 mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">No guides found</h4>
              <p className="text-xs text-[#aba9bb]">Try modifying your search queries or category filters.</p>
            </div>
          )}
        </div>

        {/* Mobile Contact Support Card */}
        <div className="flex lg:hidden flex-col gap-3 p-5 rounded-2xl bg-[#121220]/60 border border-white/5 mt-8">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#a882ff]" />
            <span className="text-xs font-semibold text-white">Contact Support</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#aba9bb]">Have unresolved questions?</p>
            <p className="text-xs font-mono text-[#b6a0ff]">support@yourapp.com</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#aba9bb]/70 mt-1 font-mono uppercase">
            <Clock className="w-3.5 h-3.5" />
            <span>Response: 24-48 hours</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Help;
