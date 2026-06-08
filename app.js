import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyB771nHZeDs610M1P63ssIsr9hr22xD_pE",
  authDomain: "sample-firebase-ai-app-ec811.firebaseapp.com",
  projectId: "sample-firebase-ai-app-ec811",
  storageBucket: "sample-firebase-ai-app-ec811.firebasestorage.app",
  messagingSenderId: "320233844637",
  appId: "1:320233844637:web:c086ee345029615a154974"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- APP STATE & CONSTANTS ---
const API_URL = "https://script.google.com/macros/s/AKfycbzznHUO9JjcyNwbh3xKv_LmOiszD9Sj3RiHJnjJp_SvhOHHTffzLsXwQjdBxx2mbGD8/exec";
const DEBUG_MODE = true; // Enabled to utilize your metric tracking diagnostics

let state = {
  lang: "en", haptics: true, fontSizeIndex: 1, 
  activeSubject: "", activeChapter: "", activeChapterIndex: 0, 
  allQuestions: [], currentQuestionIndex: 0, userAnswers: {} 
};

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    const isAuthPage = path.includes('index.html') || path === '/' || path.endsWith('/');

    if (user) {
        // Populate Sidebar Profile
        const img = document.getElementById('sidebar-user-img');
        const name = document.getElementById('sidebar-user-name');
        const email = document.getElementById('sidebar-user-email');
        
        if (img) { img.src = user.photoURL; img.classList.remove('hidden'); }
        if (name) name.textContent = user.displayName;
        if (email) email.textContent = user.email;

        if (isAuthPage) window.location.href = 'subjects.html';
    } else {
        if (!isAuthPage) window.location.href = 'index.html';
    }
});

window.loginUser = async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { console.error("Login Error:", error); alert("Login Failed: " + error.message); }
};

window.logoutUser = async () => {
    try { await signOut(auth); clearQuizState(); } 
    catch (error) { console.error("Logout Error:", error); }
};

// --- ROUTER & INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    loadState();
    initSystemTheme();
    window.toggleLanguage(state.lang, false);
    window.applyFontSize();
    
    const path = window.location.pathname;
    if (path.includes('subjects.html')) loadSubjects();
    if (path.includes('chapters.html')) loadChapters();
    if (path.includes('quiz.html')) {
        if (state.activeSubject && state.activeChapter) {
            launchQuizEvaluationEngine(state.activeChapter, state.activeChapterIndex, true);
        } else {
            window.location.href = 'subjects.html';
        }
    }
    if (path.includes('results.html')) renderResults();
    
    initSwipeGestures();
});

// --- DIAGNOSTIC HELPERS ---
function executeMatrixDiagnosticDebugger(actionMessage, dataPacket) {
    if (DEBUG_MODE) {
        console.log(`%c[DIAGNOSTIC] ${actionMessage}`, "color: #6366f1; font-weight: bold;", dataPacket);
    }
}

function showNetworkError(err) {
    console.error("Networking Engine Pipeline Exception:", err);
    alert("Connection Error: Unable to sync with database node cluster.");
}

// --- CORE UTILITIES ---
function saveState() { localStorage.setItem('mcq_engine_state', JSON.stringify(state)); }
window.saveState = saveState;

function loadState() {
    const saved = localStorage.getItem('mcq_engine_state');
    if (saved) {
        try { state = { ...state, ...JSON.parse(saved) }; } 
        catch (e) { console.error("State parse error", e); }
    }
    window.updateHapticsUI();
}

function clearQuizState() {
    state.activeSubject = ""; state.activeChapter = ""; state.activeChapterIndex = 0;
    state.allQuestions = []; state.currentQuestionIndex = 0; state.userAnswers = {};
    saveState();
}

function triggerHapticFeedback(ms) { if (state.haptics && navigator.vibrate) navigator.vibrate(ms); }
window.triggerHapticFeedback = triggerHapticFeedback;

function showLoader() { const l = document.getElementById('global-loader'); if(l) l.classList.remove('hidden'); }
window.showLoader = showLoader;

function hideLoader() { const l = document.getElementById('global-loader'); if(l) l.classList.add('hidden'); }
window.hideLoader = hideLoader;

function navigateTo(viewName) {
    executeMatrixDiagnosticDebugger("Viewport Mutation Route Request", { targetView: viewName });
    const quizView = document.getElementById('view-quiz');
    if (viewName === 'quiz' && quizView) {
        quizView.classList.remove('hidden');
    }
}

// --- UI EVENT CONTROLLERS ---
window.toggleSidebar = () => {
    const overlay = document.getElementById('sidebar-overlay');
    const menu = document.getElementById('sidebar-menu');
    if(!overlay || !menu) return;
    const isHidden = menu.classList.contains('-translate-x-full');
    if (isHidden) {
        overlay.classList.remove('hidden');
        setTimeout(() => { overlay.classList.remove('opacity-0'); menu.classList.remove('-translate-x-full'); }, 20);
    } else {
        overlay.classList.add('opacity-0'); menu.classList.add('-translate-x-full');
        setTimeout(() => { overlay.classList.add('hidden'); }, 300);
    }
    triggerHapticFeedback(10);
};

window.toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
    const icon = document.getElementById('theme-icon');
    if(icon) icon.className = isDark ? "fa-solid fa-sun text-xs" : "fa-solid fa-moon text-xs";
};

function initSystemTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        const icon = document.getElementById('theme-icon');
        if(icon) icon.className = "fa-solid fa-sun text-xs";
    }
}

window.clearAndGoHome = () => { triggerHapticFeedback(15); clearQuizState(); window.location.href = 'subjects.html'; };
window.goBackToSubjects = () => { triggerHapticFeedback(10); window.location.href = 'subjects.html'; };
window.goBackToChaptersList = () => { triggerHapticFeedback(15); state.allQuestions = []; state.currentQuestionIndex = 0; state.userAnswers = {}; saveState(); window.location.href = 'chapters.html'; };

window.changeFontSize = (step) => {
    triggerHapticFeedback(10);
    state.fontSizeIndex = Math.max(0, Math.min(4, state.fontSizeIndex + step));
    saveState(); window.applyFontSize();
};

window.applyFontSize = () => {
    const qText = document.getElementById('question-text');
    const expText = document.getElementById('explanation-text');
    const optionsSpans = document.querySelectorAll('.opt-text-target');
    if(qText) qText.className = `font-bold text-slate-900 dark:text-slate-100 transition-all duration-200 scale-text-${state.fontSizeIndex}`;
    if(expText) expText.className = `leading-relaxed font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 scale-text-${Math.max(0, state.fontSizeIndex - 1)}`;
    optionsSpans.forEach(span => span.className = `opt-text-target scale-opt-${state.fontSizeIndex}`);
};

window.toggleHaptics = () => { 
    state.haptics = !state.haptics; 
    saveState(); 
    window.updateHapticsUI(); 
    if(state.haptics) triggerHapticFeedback(20); 
};

window.updateHapticsUI = () => {
    const btn = document.getElementById('silent-btn');
    if (!btn) return;
    if (state.haptics) {
        btn.innerHTML = `<i class="fa-solid fa-volume-high text-xs"></i><span class="hidden sm:inline ml-1 text-[10px]">Haptics On</span>`;
        btn.className = "h-8 px-2 rounded-xl text-slate-500 bg-slate-50 border border-slate-200/40 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800/40 font-bold flex items-center justify-center shadow-sm";
    } else {
        btn.innerHTML = `<i class="fa-solid fa-volume-xmark text-xs"></i><span class="hidden sm:inline ml-1 text-[10px]">Muted</span>`;
        btn.className = "h-8 px-2 rounded-xl text-rose-500 bg-rose-50/50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 font-bold flex items-center justify-center shadow-sm";
    }
};

// --- DATA FETCHING & ENGINE MERGE ---
function loadSubjects() {
  window.showLoader();
    fetch(`${API_URL}?action=getSubjects&lang=${state.lang}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('subjects-container');
            if(!container) return;
            container.innerHTML = "";
            data.forEach(sub => {
                const el = document.createElement('div');
                el.className = "p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:border-brand-500/40 group";
                el.onclick = () => { window.triggerHapticFeedback(15); state.activeSubject = sub; window.saveState(); window.location.href = 'chapters.html'; };
                el.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center font-bold text-base shadow-sm">${sub.charAt(0).toUpperCase()}</div>
                        <div><h4 class="font-bold text-sm text-slate-800 dark:text-slate-200">${sub}</h4></div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-xs text-slate-300 group-hover:translate-x-0.5 transition-transform"></i>`;
                container.appendChild(el);
            });
        }).catch(err => alert("Connection Lost: Failed to load modules."))
        .finally(() => window.hideLoader());
}
function loadChapters() {

  if(!state.activeSubject) { window.location.href = 'subjects.html'; return; }
    window.showLoader();
    const titleNode = document.getElementById('current-subject-title');
    if(titleNode) titleNode.innerText = state.activeSubject.replace(/\.json$/i, '');
    
    fetch(`${API_URL}?action=getChapters&sheetName=${encodeURIComponent(state.activeSubject)}&lang=${state.lang}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('chapters-container');
            if(!container) return;
            container.innerHTML = "";
            data.forEach((chap, idx) => {
                const el = document.createElement('div');
                el.className = "p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl flex items-center justify-between cursor-pointer hover:border-brand-500/30";
                el.onclick = () => { 
                    window.triggerHapticFeedback(20); 
                    state.activeChapter = chap; state.activeChapterIndex = idx; 
                    state.allQuestions = []; state.currentQuestionIndex = 0; state.userAnswers = {};
                    window.saveState(); window.location.href = 'quiz.html'; 
                };
                el.innerHTML = `
                    <div class="flex items-center gap-3"><span class="text-xs font-bold text-slate-400 w-5">${idx + 1}.</span><span class="text-xs font-bold text-slate-700 dark:text-slate-300">${chap}</span></div>
                    <i class="fa-solid fa-play text-[10px] text-brand-500 bg-brand-50 dark:bg-brand-950/40 p-2 rounded-lg"></i>`;
                container.appendChild(el);
            });
        }).catch(err => alert("Connection Lost: Failed to parse structural items."))
        .finally(() => window.hideLoader());
}

function toggleLanguage(lang, fetchNewData = true) {
    if (!lang) {
        lang = state.lang === 'en' ? 'hi' : 'en';
    }
    if (lang !== 'en' && lang !== 'hi') return;
    state.lang = lang;
    saveState();
    
    const btnEn = document.getElementById('lang-btn-en');
    const btnHi = document.getElementById('lang-btn-hi');
    
    if (state.lang === 'hi') {
        if(btnHi) btnHi.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-600 text-white shadow-sm";
        if(btnEn) btnEn.className = "px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800";
    } else {
        if(btnEn) btnEn.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-600 text-white shadow-sm";
        if(btnHi) btnHi.className = "px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800";
    }

    executeMatrixDiagnosticDebugger("UI Cross Language Action: Language Matrix Mutation Hook Captured", { selectedLanguage: state.lang, pipelineRemoteSync: fetchNewData });

    if(fetchNewData) {
        triggerHapticFeedback(20);
        
        const isViewingQuiz = document.getElementById('view-quiz') && !document.getElementById('view-quiz').classList.contains('hidden');
        const isViewingChapters = document.getElementById('view-chapters') && !document.getElementById('view-chapters').classList.contains('hidden');

        if (isViewingQuiz && state.activeSubject && state.activeChapter) {
            launchQuizEvaluationEngine(state.activeChapter, state.activeChapterIndex, true);
        } else if (isViewingChapters && state.activeSubject) {
            loadChapters();
        } else {
            clearQuizState();
            loadSubjects();
        }
    }
}
window.toggleLanguage = toggleLanguage;

function launchQuizEvaluationEngine(chapterName, chapterIdx, isLanguageSwitch = false) {
    state.activeChapterIndex = chapterIdx !== undefined ? chapterIdx : state.activeChapterIndex;
    
    if (!isLanguageSwitch) {
        if (window.event && (window.event.type === 'click' || window.event.currentTarget?.id === 'chapters-container')) {
            state.allQuestions = [];
            state.currentQuestionIndex = 0;
            state.userAnswers = {};
        }
        state.activeChapter = chapterName;
    }
    saveState();

    showLoader();
    const panel = document.getElementById('explanation-panel');
    if(panel) panel.classList.add('hidden');

    const endpointUrl = `${API_URL}?action=getFullChapterData&sheetName=${encodeURIComponent(state.activeSubject)}&chapterName=${encodeURIComponent(chapterName)}&chapterIndex=${state.activeChapterIndex}&lang=${state.lang}`;
    executeMatrixDiagnosticDebugger("Networking Pipeline Hook: Fetching Complete Target Questions Stream Node Packet", { url: endpointUrl, chapterIndex: state.activeChapterIndex, languageToggleAction: isLanguageSwitch });

    fetch(endpointUrl)
        .then(res => res.json())
        .then(data => {
            executeMatrixDiagnosticDebugger("Networking Response Received: Structural Evaluation Questions Collection Data", { questionsCount: data?.length, questionsPayload: data });
            if (data.error || !Array.isArray(data) || data.length === 0) {
                alert("Structural Failure: Unable to build parsing indexes.");
                return;
            }
            
            state.allQuestions = data;
            
            if (isLanguageSwitch && data.length > 0) {
                 const indicator = document.getElementById('quiz-chapter-indicator');
                 if(indicator) indicator.innerText = state.activeChapter.toUpperCase();
            }
            
            saveState();
            
            const indicator = document.getElementById('quiz-chapter-indicator');
            if(indicator) indicator.innerText = state.activeChapter.toUpperCase();
            buildQuestionMatrixSelectionGrid();
            renderActiveQuestionCard();
            navigateTo('quiz');
        })
        .catch(err => showNetworkError(err))
        .finally(() => hideLoader());
}
window.launchQuizEvaluationEngine = launchQuizEvaluationEngine;

function renderActiveQuestionCard() {
    const qData = state.allQuestions[state.currentQuestionIndex];
    if (!qData) {
        const qTxtNode = document.getElementById('question-text');
        if (qTxtNode) qTxtNode.innerText = "No structural quiz items discovered.";
        return;
    }

    const rawQuestion = qData.Question || qData.question || "Empty question prompt text.";
    const rawCorrectAnswer = (qData.Answer || qData.answer || "").trim().toUpperCase();
    const examSource = qData.Exam || qData.exam || qData.Source || qData.source || "";
    const userSelection = state.userAnswers[state.currentQuestionIndex];
    const hasAnswered = userSelection !== undefined;

    executeMatrixDiagnosticDebugger("UI Render Pipeline Action: Painting Active Evaluation Cards Data Frame", { questionIndexPosition: state.currentQuestionIndex, hasUserSubmittedChoice: hasAnswered, userChoiceRecord: userSelection || "None" });

    const counter = document.getElementById('quiz-question-counter');
    if(counter) counter.innerText = `Q ${state.currentQuestionIndex + 1}/${state.allQuestions.length}`;
    
    const progress = ((state.currentQuestionIndex + 1) / state.allQuestions.length) * 100;
    const progressBar = document.getElementById('quiz-progress-bar');
    if(progressBar) progressBar.style.width = `${progress}%`;

    const sourceIndicator = document.getElementById('exam-source-indicator');
    if (examSource && sourceIndicator) {
        const srcTxt = document.getElementById('exam-source-text');
        if(srcTxt) srcTxt.innerText = examSource;
        sourceIndicator.classList.remove('hidden');
    } else if(sourceIndicator) {
        sourceIndicator.classList.add('hidden');
    }

    const qTxtNode = document.getElementById('question-text');
    if(qTxtNode) qTxtNode.innerText = rawQuestion;
    
    const panel = document.getElementById('explanation-panel');
    if(panel) panel.classList.add('hidden');

    const container = document.getElementById('options-container');
    if(!container) return;
    container.innerHTML = "";

    const optionsSchema = [
        { char: 'A', keys: ['OptionA', 'option_a'] },
        { char: 'B', keys: ['OptionB', 'option_b'] },
        { char: 'C', keys: ['OptionC', 'option_c'] },
        { char: 'D', keys: ['OptionD', 'option_d'] },
        { char: 'E', keys: ['OptionE', 'option_e'] }
    ];

    optionsSchema.forEach(opt => {
        const targetKey = opt.keys.find(k => qData[k] !== undefined && qData[k] !== null && qData[k] !== "" && qData[k] !== "#VALUE!");
        if (!targetKey) return;

        const optionText = qData[targetKey];
        const optionChar = opt.char;
        const isSelected = userSelection === optionChar;
        const isThisCorrectAnswer = optionChar === rawCorrectAnswer;

        let buttonStyles = "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700";
        let badgeStyles = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
        let statusIconHtml = `<div class="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0"></div>`;

        if (hasAnswered) {
            if (isThisCorrectAnswer) {
                buttonStyles = "bg-emerald-50/60 border-emerald-500 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-500 dark:text-emerald-300";
                badgeStyles = "bg-emerald-500 text-white";
                statusIconHtml = `<i class="fa-solid fa-circle-check text-emerald-500 text-base shrink-0"></i>`;
            } else if (isSelected) {
                buttonStyles = "bg-rose-50/60 border-rose-500 text-rose-900 dark:bg-rose-950/20 dark:border-rose-500 dark:text-rose-300";
                badgeStyles = "bg-rose-500 text-white";
                statusIconHtml = `<i class="fa-solid fa-circle-xmark text-rose-500 text-base shrink-0"></i>`;
            } else {
                buttonStyles = "bg-slate-50/40 border-slate-100 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800/40 dark:text-slate-600 pointer-events-none";
                badgeStyles = "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-700";
            }
        }

        const optButton = document.createElement('button');
        optButton.className = `w-full p-4 rounded-2xl border ${buttonStyles} flex items-center justify-between text-left transition-all gap-4 text-xs font-bold group`;
        if (!hasAnswered) {
            optButton.onclick = () => { triggerHapticFeedback(12); window.registerUserSelectionChoice(optionChar); };
        } else {
            optButton.classList.add('cursor-default');
        }

        optButton.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 transition-colors ${badgeStyles}">${optionChar}</span>
                <span class="opt-text-target font-semibold transition-all duration-200">${optionText}</span>
            </div>
            ${statusIconHtml}
        `;
        container.appendChild(optButton);
    });

    updateLiveScoreboard();
    window.applyFontSize();
    syncActiveMatrixItemGridHighlight();
}

function updateLiveScoreboard() {
    let correct = 0, wrong = 0, skipped = 0;
    const itemsEvaluatedCount = Object.keys(state.userAnswers).length;

    state.allQuestions.forEach((q, idx) => {
        const ans = state.userAnswers[idx];
        if (ans === undefined) {
            skipped++;
        } else {
            const rawCorrectAnswer = (q.Answer || q.answer || "").trim().toUpperCase();
            if (ans === rawCorrectAnswer) correct++;
            else wrong++;
        }
    });

    const nodeCorrect = document.getElementById('score-live-correct');
    const nodeWrong = document.getElementById('score-live-wrong');
    const nodeSkipped = document.getElementById('score-live-skipped');
    const nodePercent = document.getElementById('score-live-percent');

    if (nodeCorrect) nodeCorrect.innerText = correct;
    if (nodeWrong) nodeWrong.innerText = wrong;
    if (nodeSkipped) nodeSkipped.innerText = skipped;
    if (nodePercent) nodePercent.innerText = itemsEvaluatedCount === 0 ? 0 : Math.round((correct / itemsEvaluatedCount) * 100);
}

function buildQuestionMatrixSelectionGrid() {
    const grid = document.getElementById('question-matrix-grid');
    if(!grid) return;
    grid.innerHTML = "";

    state.allQuestions.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.id = `matrix-cell-${idx}`;
        btn.onclick = () => {
            triggerHapticFeedback(10);
            state.currentQuestionIndex = idx;
            saveState();
            renderActiveQuestionCard();
        };
        btn.className = "h-9 w-full rounded-xl text-xs font-bold transition-all border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
        btn.innerText = idx + 1;
        grid.appendChild(btn);
    });
}

function syncActiveMatrixItemGridHighlight() {
    state.allQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`matrix-cell-${idx}`);
        if (!btn) return;

        const ans = state.userAnswers[idx];
        const isCurrent = idx === state.currentQuestionIndex;

        if (ans !== undefined) {
            const rawAnswerKey = (q.Answer || q.answer || "").trim().toUpperCase();
            if (ans === rawAnswerKey) {
                btn.className = "h-9 w-full rounded-xl text-xs font-bold border-emerald-500 bg-emerald-500 text-white shadow-sm";
            } else {
                btn.className = "h-9 w-full rounded-xl text-xs font-bold border-rose-500 bg-rose-500 text-white shadow-sm";
            }
        } else {
            btn.className = "h-9 w-full rounded-xl text-xs font-bold border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
        }

        if (isCurrent) {
            btn.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-950');
        } else {
            btn.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-950');
        }
    });
}

window.registerUserSelectionChoice = (chosenChar) => {
    state.userAnswers[state.currentQuestionIndex] = chosenChar;
    saveState();
    renderActiveQuestionCard();
};

window.changeQuestion = (direction) => {
    const nextIdx = state.currentQuestionIndex + direction;
    if (nextIdx >= 0 && nextIdx < state.allQuestions.length) {
        triggerHapticFeedback(10);
        state.currentQuestionIndex = nextIdx;
        saveState();
        renderActiveQuestionCard();
    }
};

window.toggleExplanation = (forcedState = null) => {
    const panel = document.getElementById('explanation-panel');
    const txtNode = document.getElementById('explanation-text');
    if (!panel || !txtNode) return;

    const qData = state.allQuestions[state.currentQuestionIndex];
    if (qData) {
        txtNode.innerText = qData.Explanation || qData.explanation || "No metric reasoning analysis discovered.";
    }

    if (forcedState !== null) {
        if (forcedState) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
    } else {
        panel.classList.toggle('hidden');
    }
};

window.submitQuizEvaluationReport = () => {
    if (!confirm("Are you sure you want to finalize this session?")) return;
    triggerHapticFeedback(30); saveState(); window.location.href = 'results.html';
};

function renderResults() {}
function initSwipeGestures() {}

document.addEventListener('keydown', (e) => {
    if(window.location.pathname.includes('quiz.html')) {
        if (e.key === 'ArrowRight') window.changeQuestion(1);
        if (e.key === 'ArrowLeft') window.changeQuestion(-1);
    }
});

tailwind.config = { darkMode: 'class', theme: { extend: { colors: { brand: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' } } } } };
