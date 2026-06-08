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
const DEBUG_MODE = false;

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
    if (path.includes('quiz.html')) fetchQuizDataAndRender();
    if (path.includes('results.html')) renderResults();
    
    initSwipeGestures();
});

// --- CORE FUNCTIONS (Attached to Window for HTML access) ---
window.saveState = () => { localStorage.setItem('mcq_engine_state', JSON.stringify(state)); };

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
    window.saveState();
}

// UI Controllers
window.showLoader = () => { const l = document.getElementById('global-loader'); if(l) l.classList.remove('hidden'); };
window.hideLoader = () => { const l = document.getElementById('global-loader'); if(l) l.classList.add('hidden'); };
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
    window.triggerHapticFeedback(10);
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

// Navigation & Actions
window.clearAndGoHome = () => { window.triggerHapticFeedback(15); clearQuizState(); window.location.href = 'subjects.html'; };
window.goBackToSubjects = () => { window.triggerHapticFeedback(10); window.location.href = 'subjects.html'; };
window.goBackToChaptersList = () => { window.triggerHapticFeedback(15); state.allQuestions = []; state.currentQuestionIndex = 0; state.userAnswers = {}; window.saveState(); window.location.href = 'chapters.html'; };

window.changeFontSize = (step) => {
    window.triggerHapticFeedback(10);
    state.fontSizeIndex = Math.max(0, Math.min(4, state.fontSizeIndex + step));
    window.saveState(); window.applyFontSize();
};

window.applyFontSize = () => {
    const qText = document.getElementById('question-text');
    const expText = document.getElementById('explanation-text');
    const optionsSpans = document.querySelectorAll('.opt-text-target');
    if(qText) qText.className = `font-bold text-slate-900 dark:text-slate-100 transition-all duration-200 scale-text-${state.fontSizeIndex}`;
    if(expText) expText.className = `leading-relaxed font-medium text-slate-600 dark:text-slate-300 transition-all duration-200 scale-text-${Math.max(0, state.fontSizeIndex - 1)}`;
    optionsSpans.forEach(span => span.className = `opt-text-target scale-opt-${state.fontSizeIndex}`);
};

window.toggleLanguage = function(lang, fetchNewData = true) {
    if (!lang) {
        lang = state.lang === 'en' ? 'hi' : 'en';
    }
    if (lang !== 'en' && lang !== 'hi') return;
    state.lang = lang;
    
    if (typeof saveState === 'function') saveState();
    else if (window.saveState) window.saveState();
    
    const btnEn = document.getElementById('lang-btn-en');
    const btnHi = document.getElementById('lang-btn-hi');
    
    if (state.lang === 'hi') {
        if(btnHi) btnHi.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-600 text-white shadow-sm";
        if(btnEn) btnEn.className = "px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800";
    } else {
        if(btnEn) btnEn.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-600 text-white shadow-sm";
        if(btnHi) btnHi.className = "px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800";
    }

    if (typeof executeMatrixDiagnosticDebugger === 'function') {
        executeMatrixDiagnosticDebugger("UI Cross Language Action: Language Matrix Mutation Hook Captured", { selectedLanguage: state.lang, pipelineRemoteSync: fetchNewData });
    }

    if (fetchNewData) {
        if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback(20);
        
        // MPA-Safe DOM Resolution: Fallback gracefully if structural views are split into separate files
        const viewQuizEl = document.getElementById('view-quiz') || document.getElementById('quiz-card-container');
        const viewChaptersEl = document.getElementById('view-chapters') || document.getElementById('chapters-container');
        
        const isViewingQuiz = viewQuizEl ? (!viewQuizEl.classList.contains('hidden') || window.location.pathname.includes('quiz.html')) : window.location.pathname.includes('quiz.html');
        const isViewingChapters = viewChaptersEl ? (!viewChaptersEl.classList.contains('hidden') || window.location.pathname.includes('chapters.html')) : window.location.pathname.includes('chapters.html');

        if (isViewingQuiz && state.activeSubject && state.activeChapter) {
            // Force the 3rd argument to true, identifying this as an in-place translation update
            if (typeof launchQuizEvaluationEngine === 'function') {
                launchQuizEvaluationEngine(state.activeChapter, state.activeChapterIndex, true);
            } else if (window.launchQuizEvaluationEngine) {
                window.launchQuizEvaluationEngine(state.activeChapter, state.activeChapterIndex, true);
            }
        } else if (isViewingChapters && state.activeSubject) {
            if (typeof loadChapters === 'function') loadChapters();
        } else {
            if (typeof clearQuizState === 'function') clearQuizState();
            if (typeof loadSubjects === 'function') loadSubjects();
        }
    }
};

function launchQuizEvaluationEngine(chapterName, chapterIdx, isLanguageSwitch = false) {
    state.activeChapterIndex = chapterIdx !== undefined ? chapterIdx : state.activeChapterIndex;
    
    // Explicitly check for the language switch flag to block accidental state wipes
    if (!isLanguageSwitch) {
        state.allQuestions = [];
        state.currentQuestionIndex = 0;
        state.userAnswers = {};
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

window.triggerHapticFeedback = (ms) => { if (state.haptics && navigator.vibrate) navigator.vibrate(ms); };
window.toggleHaptics = () => { state.haptics = !state.haptics; window.saveState(); window.updateHapticsUI(); if(state.haptics) window.triggerHapticFeedback(20); };
window.updateHapticsUI = () => {
    const btn = document.getElementById('silent-btn');
    if (!btn) return;
    if (state.haptics) {
        btn.innerHTML = `<i class="fa-solid fa-volume-high text-xs"></i>`;
        btn.className = "h-8 w-8 rounded-xl text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 flex items-center justify-center";
    } else {
        btn.innerHTML = `<i class="fa-solid fa-volume-xmark text-xs"></i>`;
        btn.className = "h-8 w-8 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/40 flex items-center justify-center";
    }
};

// --- DATA FETCHING & RENDERING ---
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
        }).finally(() => window.hideLoader());
}

function loadChapters() {
    if(!state.activeSubject) { window.location.href = 'subjects.html'; return; }
    window.showLoader();
    document.getElementById('current-subject-title').innerText = state.activeSubject.replace(/\.json$/i, '');
    
    fetch(`${API_URL}?action=getChapters&sheetName=${encodeURIComponent(state.activeSubject)}&lang=${state.lang}`)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('chapters-container');
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
        }).finally(() => window.hideLoader());
}

function fetchQuizDataAndRender() {
    if (!state.activeSubject || !state.activeChapter) { window.location.href = 'subjects.html'; return; }
    document.getElementById('quiz-chapter-indicator').innerText = state.activeChapter.toUpperCase();
    
    if (state.allQuestions && state.allQuestions.length > 0) { renderQuizUI(); return; }

    window.showLoader();
    fetch(`${API_URL}?action=getFullChapterData&sheetName=${encodeURIComponent(state.activeSubject)}&chapterName=${encodeURIComponent(state.activeChapter)}&chapterIndex=${state.activeChapterIndex}&lang=${state.lang}`)
        .then(res => res.json())
        .then(data => { state.allQuestions = data; window.saveState(); renderQuizUI(); })
        .finally(() => window.hideLoader());
}

function renderQuizUI() {
    buildQuestionMatrixSelectionGrid();
    renderActiveQuestionCard();
}

window.changeQuestion = (direction) => {
    window.triggerHapticFeedback(10);
    const targetIndex = state.currentQuestionIndex + direction;
    if (targetIndex >= 0 && targetIndex < state.allQuestions.length) {
        state.currentQuestionIndex = targetIndex; window.saveState(); renderActiveQuestionCard();
    }
};

window.registerUserSelectionChoice = (chosenChar) => {
    if (state.userAnswers[state.currentQuestionIndex] !== undefined) return;
    state.userAnswers[state.currentQuestionIndex] = chosenChar;
    window.saveState(); renderActiveQuestionCard();
    const qData = state.allQuestions[state.currentQuestionIndex];
    if (qData && chosenChar !== (qData.Answer || qData.answer || "").trim().toUpperCase()) {
        setTimeout(() => { window.toggleExplanation(true); }, 150);
    }
};

window.toggleExplanation = (forcedState = null) => {
    const panel = document.getElementById('explanation-panel');
    if(!panel) return;
    const isHidden = panel.classList.contains('hidden');
    const open = forcedState !== null ? forcedState : isHidden;
    if (open) {
        const qData = state.allQuestions[state.currentQuestionIndex];
        document.getElementById('explanation-text').innerText = qData ? (qData.Explanation || qData.explanation || "No explanation data.") : "";
        panel.classList.remove('hidden'); window.applyFontSize();
    } else { panel.classList.add('hidden'); }
};

window.submitQuizEvaluationReport = () => {
    if (!confirm("Are you sure you want to finalize this session?")) return;
    window.triggerHapticFeedback(30); window.saveState(); window.location.href = 'results.html';
};

// Contains internal rendering logic for Quiz/Results (abstracted for brevity but functions identically to your original code).
function renderActiveQuestionCard() {
    const qData = state.allQuestions[state.currentQuestionIndex];
    if (!qData) return;
    
    document.getElementById('quiz-question-counter').innerText = `Q ${state.currentQuestionIndex + 1}/${state.allQuestions.length}`;
    document.getElementById('quiz-progress-bar').style.width = `${((state.currentQuestionIndex + 1) / state.allQuestions.length) * 100}%`;
    document.getElementById('question-text').innerText = qData.Question || qData.question || "";
    document.getElementById('explanation-panel').classList.add('hidden');

    const container = document.getElementById('options-container');
    container.innerHTML = "";
    const rawCorrectAnswer = (qData.Answer || qData.answer || "").trim().toUpperCase();
    const userSelection = state.userAnswers[state.currentQuestionIndex];
    const hasAnswered = userSelection !== undefined;

    [{ char: 'A', keys: ['OptionA', 'option_a'] }, { char: 'B', keys: ['OptionB', 'option_b'] }, { char: 'C', keys: ['OptionC', 'option_c'] }, { char: 'D', keys: ['OptionD', 'option_d'] }, { char: 'E', keys: ['OptionE', 'option_e'] }].forEach(opt => {
        const targetKey = opt.keys.find(k => qData[k] !== undefined && qData[k] !== "");
        if (!targetKey) return;

        const isSelected = userSelection === opt.char;
        const isCorrect = opt.char === rawCorrectAnswer;
        let styles = "bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300";
        let badge = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
        
        if (hasAnswered) {
            if (isCorrect) { styles = "bg-emerald-50/60 border-emerald-500 text-emerald-900 dark:bg-emerald-950/20"; badge = "bg-emerald-500 text-white"; }
            else if (isSelected) { styles = "bg-rose-50/60 border-rose-500 text-rose-900 dark:bg-rose-950/20"; badge = "bg-rose-500 text-white"; }
            else { styles = "opacity-50 pointer-events-none"; }
        }

        const btn = document.createElement('button');
        btn.className = `w-full p-4 rounded-2xl border ${styles} flex items-center justify-between text-left transition-all text-xs font-bold`;
        if (!hasAnswered) btn.onclick = () => { window.triggerHapticFeedback(12); window.registerUserSelectionChoice(opt.char); };
        
        btn.innerHTML = `<div class="flex items-center gap-3"><span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs ${badge}">${opt.char}</span><span class="opt-text-target">${qData[targetKey]}</span></div>`;
        container.appendChild(btn);
    });

    // Scoreboard updates
    let correct = 0, wrong = 0, skipped = 0;
    for(let i=0; i<=state.currentQuestionIndex; i++) {
        if(state.userAnswers[i] === undefined) skipped++;
        else if(state.userAnswers[i] === (state.allQuestions[i].Answer || "").trim().toUpperCase()) correct++;
        else wrong++;
    }
    document.getElementById('score-live-correct').innerText = correct;
    document.getElementById('score-live-wrong').innerText = wrong;
    document.getElementById('score-live-skipped').innerText = skipped;
    document.getElementById('score-live-percent').innerText = state.userAnswers.length === 0 ? 0 : Math.round((correct / Object.keys(state.userAnswers).length) * 100);
    
    window.applyFontSize();
    syncActiveMatrixItemGridHighlight();
}

function buildQuestionMatrixSelectionGrid() {
    const grid = document.getElementById('question-matrix-grid');
    if(!grid) return; grid.innerHTML = "";
    state.allQuestions.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.id = `matrix-cell-${idx}`;
        btn.onclick = () => { window.triggerHapticFeedback(10); state.currentQuestionIndex = idx; window.saveState(); renderActiveQuestionCard(); };
        btn.className = "h-9 w-full rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
        btn.innerText = idx + 1;
        grid.appendChild(btn);
    });
}

function syncActiveMatrixItemGridHighlight() {
    state.allQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`matrix-cell-${idx}`);
        if (!btn) return;
        const ans = state.userAnswers[idx];
        if (ans !== undefined) {
            if (ans === (q.Answer || "").trim().toUpperCase()) btn.className = "h-9 w-full rounded-xl text-xs font-bold border-emerald-500 bg-emerald-500 text-white";
            else btn.className = "h-9 w-full rounded-xl text-xs font-bold border-rose-500 bg-rose-500 text-white";
        } else {
            btn.className = "h-9 w-full rounded-xl text-xs font-bold border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400";
        }
        if (idx === state.currentQuestionIndex) btn.classList.add('ring-2', 'ring-brand-500', 'ring-offset-2', 'dark:ring-offset-slate-950');
    });
}

function renderResults() {
    let correctCount = 0;
    state.allQuestions.forEach((q, idx) => {
        if (q && state.userAnswers[idx] === (q.Answer || "").trim().toUpperCase()) correctCount++;
    });
    const percent = state.allQuestions.length === 0 ? 0 : Math.round((correctCount / state.allQuestions.length) * 100);
    
    document.getElementById('score-correct').innerText = correctCount;
    document.getElementById('score-total').innerText = state.allQuestions.length;
    document.getElementById('score-percentage-label').innerText = `Accuracy: ${percent}%`;
    
    const reviewContainer = document.getElementById('detailed-review-list-container');
    state.allQuestions.forEach((q, idx) => {
        const userAnswer = state.userAnswers[idx];
        const correctAnswer = (q.Answer || "").trim().toUpperCase();
        const isCorrect = userAnswer === correctAnswer;
        const isSkipped = userAnswer === undefined;
        
        const itemCard = document.createElement('div');
        itemCard.className = `p-5 bg-white dark:bg-slate-900 border ${isCorrect ? 'border-emerald-500/30' : (isSkipped ? 'border-amber-500/30' : 'border-rose-500/30')} rounded-2xl mb-4 shadow-sm`;
        itemCard.innerHTML = `
            <div class="flex items-center justify-between mb-2 border-b border-slate-100 dark:border-slate-800 pb-2"><span class="text-xs font-black text-slate-400">Q ${idx + 1}</span></div>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100 mb-4">${q.Question}</p>
            <div class="space-y-2 mb-4">
                <div class="p-3 rounded-xl text-xs bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-300">
                    <span class="text-[10px] uppercase font-black">Correct: ${correctAnswer}</span>
                </div>
                ${!isCorrect ? `<div class="p-3 rounded-xl text-xs bg-rose-50/40 dark:bg-rose-950/10 text-rose-900 dark:text-rose-300">
                    <span class="text-[10px] uppercase font-black">You chose: ${userAnswer || 'Skipped'}</span>
                </div>` : ''}
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                <span class="text-[10px] uppercase font-black tracking-wider text-brand-500 block mb-1">Explanation</span>
                <p class="text-[11px] font-medium text-slate-600 dark:text-slate-400">${q.Explanation || "No explanation."}</p>
            </div>
        `;
        reviewContainer.appendChild(itemCard);
    });
}

function initSwipeGestures() {
    const card = document.getElementById('quiz-card-container');
    if(!card) return;
    let touchStartX = 0, touchEndX = 0;
    card.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, { passive: true });
    card.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) window.changeQuestion(1);
        else if (touchEndX - touchStartX > 50) window.changeQuestion(-1);
    }, { passive: true });
}

document.addEventListener('keydown', (e) => {
    if(window.location.pathname.includes('quiz.html')) {
        if (e.key === 'ArrowRight') window.changeQuestion(1);
        if (e.key === 'ArrowLeft') window.changeQuestion(-1);
    }
});

tailwind.config = { darkMode: 'class', theme: { extend: { colors: { brand: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' } } } } };
