import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getFirestore, doc, setDoc, getDoc, getDocFromServer, onSnapshot, deleteField } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDwkvvVwJbk3JC_ddej74sFOxgPBl2ccE8",
    authDomain: "ironlog-v1.firebaseapp.com",
    projectId: "ironlog-v1",
    storageBucket: "ironlog-v1.firebasestorage.app",
    messagingSenderId: "450730252375",
    appId: "1:450730252375:web:477f9821c29c05d02deb12"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const APP_VERSION = "v1.1.35";

  // Plans are now sourced from Firebase only.
  const DEFAULT_PLAN = {};

  function deepCopy(o){ return JSON.parse(JSON.stringify(o)); }
  const STITCH_ASSETS = {
    dashboardHero: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWk59FjtWTePj3H0riY9nt90Pl8jzQ2UfACl_hjfIzTPSmwL8HI1gCMO0wSMgkrbtt_Fy0ODHlgMzm869m0Rrg9irb4L0714oqaqvCiPcPpBKXvBwcZWLwHfi7QeT6VTgC3eVHiUTeqVXhCNzn4DVQU02mql0TJbu12aLve2ZvBvHt-DHrNdqJCehx5JqbLHPLRmnsx4DO6A_eTw0f_0z9QCQxEsBoda0_Gi64QP04E1XAwiPVxWIRG3TVHcl5Vts5fqQYW3YsuL8",
    workoutsTip: "https://lh3.googleusercontent.com/aida-public/AB6AXuBO7JDA_LCjEZ5XwzZbvgU74lM3b0RAeBbjTkKESQbQ_1lPPse6NNb4bLKzpYeDG5xBio8RBJ0f2OcGPoRKltT5eNUHCrlCa0f4BHyzIoSUgh_7e2DkXYYNJkUySm9PzzWEXsU1Qgz97yK2_eneGvsEtuMim1uyhe03WsB8QS8Z-z14gJMXxFEzLYjimykfp18JYxUmeHG7T-RgmujwE3NrlyV2DNzdxKuOH6SEIwdrrlnxNmR7BwFutotN_rsXJB9f8AlUWpEa4kQ",
    activeWorkout: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuYnXknddr1NF07a18kYm84pX4hNlAQEXXJ1gFE60awG4wCSe1AhIzhOg-frWiIJ5i5UZ6uIBu28DvuUWSxYsWGrueCN7z-Dnhvo95iw9sMHNxxSMd4RT5bux_HY6JCoC-WjBPK43ey6tO9xsiuMguSvBoX6BplxEtAiLUhMAjaMJJ22d3ZWPub3oDFFSwyE-I1k4hNYsRehaknafMp5YT1FIyGb1xOCi-SEwBJB7OMTJ-yYlQ96rGTSmPZf3joT-Ny1bfUbY0kTs",
    progressPhotoA: "https://lh3.googleusercontent.com/aida-public/AB6AXuCtV24lPkEWZeMLY_2CM6TaIorx-Sn_Bp3v5wRxCA8ez9wPwVKpxygFBkbqAptBWV7ca27bwX8GI5zp71RenSkZvxQLnST-7rDuA6faQlRXAYpC5yKzLUdO07bjEXgMVMCKsys8COC4Dvdz-P2B3ECm1h8_HhYYlMfhLm0GBd-obX-W3FAGlu7-0DZ5J9LwUSV14lV8A164GRGDK6-5jVD1DjQlfGzeN4v57iXlptOEDTKXkzC-CLErMB7wUNLY8RsOQV54nC6q7-Y",
    progressPhotoB: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsekc3hTBjmPV_g6wRjujB_hv-Zz21ckLQF7hrAgWDCJKmWkATz1cwSJxMZrZ502rzLe2T3jTd7H2b49cODRsAgp-arDx8LBRkD8QwXrFArlrozwmrrCFWBq4nGAuHZ3NN8qoAc1LyR5aoHpzrIrqxyA56ZZGgGOjhUC3Jp3PubH4zMw0PBS0hpRHZ0JHnGFL20z8guT7qqebxezwXIEWod7LRF29O2eXjA-x4wCFr5DJgCvc3T3csfJbr4TIZ2O5lje9FR74BARs"
  };
  const PREMADE = new Set();
  // seedPlan is ONLY used as a fallback if Firebase returns nothing
  function seedPlan(_pk){ return deepCopy(DEFAULT_PLAN); }
  function canUseLegacySharedFallback(){ return false; }

  const MAX_DAYS = 10;
  let WORKOUT_PLAN = {};

  const DEFAULT_ACCOUNTS = {
    revan:  { name:"Revan",   pin:"1997", color:"#e85d04", birthday:"04-30", water:3.0, protein:160, height:180, weighMode:"daily" },
    bronwen:{ name:"Bronwen", pin:"2002", color:"#f72585", birthday:"04-25", water:2.5, protein:120, height:162, weighMode:"daily" }
  };
  let accountRegistry = {};
  let PROFILES = {};
  let BASE_PROFILES = {};

  let activeProfile = localStorage.getItem("ironlog_profile")||"revan";
  let state = { workouts:{}, bodyweight:{}, prs:{}, savedWorkouts:{}, gymUrl:"", health:{}, exerciseMeta:{}, userOverrides:{}, visualProgress:[] };
  let activeDay = null;
  let activeDate = getTodayStr();
  let unsubscribeFn = null;
  let freqChart=null, volChart=null, bwChart=null, tonnageChart=null, sleepChart=null;
  let panelCollapsed = false;
  let dashboardOpen = true;
  let heatmapFilter = 'year';
  let unlockedDates = new Set();
  const DEFAULT_APP_UPDATE_URL = "https://r4v3n-lmb.github.io/iron-log/";
  let latestAppVersion = APP_VERSION;
  let appUpdateUrl = DEFAULT_APP_UPDATE_URL;
  let latestAppUpdatedAt = "";
  let lastUpdateToastVersion = "";
  let mobileSection = "dashboard";
  let workoutSearchQuery = "";
  let activeWorkoutParticipantIndex = 0;
  let deferredInstallPrompt = null;
  let appShellReady = false;
  let managementTab = "exercises";
  let adminFilterQuery = "";
  let adminFilterUser = "all";
  let adminDateFrom = "";
  let adminDateTo = "";
  let adminTablesCache = null;
  let notificationsOpen = false;
  let notificationsSeen = {};
  let calendarDayModalDate = "";
  let settingsSectionState = {
    user: false,
    data: false,
    install: false,
    management: false,
    admin: false,
    debug: false,
    templates: false,
    theme: false,
    version: false
  };
  let authInitialized = false;
  let selectedRPE = null;
  let selectedPain = "none";
  const coverState = {
    dayKey: null,
    exerciseIndex: 0,
    exercises: [],
    currentWeight: {},
    currentReps: {},
    loggedSets: {}
  };
  const THEME_COLORS = ["#f72585","#4361ee","#2ec4b6","#7b2d8b","#f0c040","#5cba5c","#ef4444","#14b8a6","#3b82f6"];
  function canManageWorkoutParticipants(){ return activeProfile==="revan"; }
  function isAdminUser(){ return activeProfile==="revan"; }
  const FIRESTORE_SPARK_LIMIT_BYTES = 1024 * 1024 * 1024;
  const isMobile = ()=>window.innerWidth <= 600;
  const isCoverScreen = ()=>window.innerWidth <= 420 && window.innerHeight <= 900;
  const isFlip = ()=>isCoverScreen();

  const ACCOUNTS_DOC = "accounts";
  function getSnapshotStorageKey(profileKey=activeProfile){ return `ironlog_pwa_snapshot_${profileKey}`; }
  function getPendingSyncStorageKey(profileKey=activeProfile){ return `ironlog_pwa_pending_sync_${profileKey}`; }
  function buildLocalSnapshot(){
    return {
      plan: WORKOUT_PLAN || {},
      workouts: state.workouts || {},
      prs: state.prs || {},
      savedWorkouts: state.savedWorkouts || {},
      gymUrl: state.gymUrl || "",
      bodyweight: state.bodyweight || {},
      health: state.health || {},
      exerciseMeta: state.exerciseMeta || {},
      userOverrides: state.userOverrides || {},
      visualProgress: Array.isArray(state.visualProgress) ? state.visualProgress : [],
      savedAt: new Date().toISOString()
    };
  }
  function saveLocalSnapshot(profileKey=activeProfile){
    try{ localStorage.setItem(getSnapshotStorageKey(profileKey), JSON.stringify(buildLocalSnapshot())); }catch(_e){}
  }
  function applyLocalSnapshot(snapshot){
    if(!snapshot || typeof snapshot !== "object") return false;
    WORKOUT_PLAN = snapshot.plan ? deepCopy(snapshot.plan) : seedPlan(activeProfile);
    normalizeWorkoutPlanOrder();
    state.workouts = snapshot.workouts || {};
    state.prs = snapshot.prs || {};
    state.savedWorkouts = snapshot.savedWorkouts || {};
    state.gymUrl = snapshot.gymUrl || "";
    state.bodyweight = snapshot.bodyweight || {};
    state.health = snapshot.health || {};
    state.exerciseMeta = snapshot.exerciseMeta || {};
    state.userOverrides = snapshot.userOverrides || {};
    state.visualProgress = Array.isArray(snapshot.visualProgress) ? snapshot.visualProgress : [];
    applyUserOverrides(state.userOverrides);
    return true;
  }
  function restoreLocalSnapshot(profileKey=activeProfile){
    try{
      const raw = localStorage.getItem(getSnapshotStorageKey(profileKey));
      if(!raw) return false;
      return applyLocalSnapshot(JSON.parse(raw));
    }catch(_e){
      return false;
    }
  }
  function markPendingSync(profileKey=activeProfile){
    try{ localStorage.setItem(getPendingSyncStorageKey(profileKey), "1"); }catch(_e){}
  }
  function clearPendingSync(profileKey=activeProfile){
    try{ localStorage.removeItem(getPendingSyncStorageKey(profileKey)); }catch(_e){}
  }
  function hasPendingSync(profileKey=activeProfile){
    try{ return localStorage.getItem(getPendingSyncStorageKey(profileKey)) === "1"; }catch(_e){ return false; }
  }
  function syncOfflineState(){
    document.body.classList.toggle("app-offline", !navigator.onLine);
  }
  function hideAppSplash(){
    if(appShellReady) return;
    appShellReady = true;
    const splash = document.getElementById("app-splash");
    if(splash) splash.classList.add("hidden");
  }
  function updateInstallButton(){
    const btn = document.getElementById("install-app-btn");
    if(!btn) return;
    btn.style.display = deferredInstallPrompt ? "inline-flex" : "none";
    renderInstallSettingsBlock();
  }
  function isStandaloneMode(){
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }
  function isIosLikeDevice(){
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function renderInstallSettingsBlock(){
    const statusEl = document.getElementById("settings-install-status");
    const helpEl = document.getElementById("settings-install-help");
    const btn = document.getElementById("settings-install-btn");
    if(!statusEl || !helpEl || !btn) return;
    if(isStandaloneMode()){
      statusEl.textContent = "IRON LOG IS ALREADY INSTALLED";
      helpEl.textContent = "This device is already running Iron Log in installed app mode.";
      btn.style.display = "none";
      return;
    }
    if(deferredInstallPrompt){
      statusEl.textContent = "INSTALL IS AVAILABLE";
      helpEl.textContent = "Tap the button below to add Iron Log to your home screen and launch it like a dedicated app.";
      btn.style.display = "block";
      return;
    }
    if(isIosLikeDevice()){
      statusEl.textContent = "USE SAFARI SHARE MENU";
      helpEl.textContent = "On iPhone or iPad, open the browser share menu and choose 'Add to Home Screen' to install Iron Log.";
      btn.style.display = "none";
      return;
    }
    statusEl.textContent = "INSTALL PROMPT NOT READY";
    helpEl.textContent = "If you just opened the app, browse a little and check again. You can also use your browser menu and choose 'Install app' or 'Add to Home screen'.";
    btn.style.display = "none";
  }
  async function registerServiceWorker(){
    if(!("serviceWorker" in navigator)) return;
    try{
      await navigator.serviceWorker.register("./service-worker.js");
    }catch(e){
      console.warn("[IronLog PWA] Service worker registration failed", e);
    }
  }
  function toProfileKey(name){
    return String(name||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }
  function buildProfilesFromAccounts(){
    const next = {};
    Object.keys(accountRegistry||{}).forEach(pk=>{
      const a = accountRegistry[pk]||{};
      const label = String(a.name||pk).toUpperCase();
      next[pk] = {
        label,
        docId:`data_${pk}`,
        color:a.color||"#e85d04",
        birthday:a.birthday||null,
        water:parseFloat(a.water||2.5)||2.5,
        protein:parseInt(a.protein||120,10)||120,
        height:parseFloat(a.height||175)||175,
        weighMode:(a.weighMode==="weekly"?"weekly":"daily")
      };
    });
    PROFILES = next;
    BASE_PROFILES = deepCopy(PROFILES);
  }
  async function loadAccounts(){
    try{
      const ref = doc(db,"ironlog",ACCOUNTS_DOC);
      let snap;
      try{
        snap = await getDocFromServer(ref);
      }catch(_e){
        snap = await getDoc(ref);
      }
      if(snap.exists() && snap.data()?.users && Object.keys(snap.data().users).length){
        accountRegistry = snap.data().users;
      } else {
        accountRegistry = deepCopy(DEFAULT_ACCOUNTS);
        await setDoc(ref,{users:accountRegistry},{merge:true});
      }
      buildProfilesFromAccounts();
      if(!PROFILES[activeProfile]){
        const first = Object.keys(PROFILES)[0] || "revan";
        activeProfile = first;
        localStorage.setItem("ironlog_profile", activeProfile);
      }
    }catch(e){
      accountRegistry = deepCopy(DEFAULT_ACCOUNTS);
      buildProfilesFromAccounts();
    }
  }
  async function persistAccounts(){
    // Overwrite the full users map so deleted accounts are truly removed.
    await setDoc(doc(db,"ironlog",ACCOUNTS_DOC),{users:accountRegistry});
  }
  function showAuthError(msg){
    const el=document.getElementById("auth-msg");
    if(el) el.textContent=msg||"";
  }
  window.showAuthMode=function(mode){
    const home=document.getElementById("auth-home");
    const grid=document.getElementById("auth-grid");
    const signIn=document.getElementById("auth-signin-pane");
    const signUp=document.getElementById("auth-signup-pane");
    if(!home||!grid||!signIn||!signUp) return;
    if(mode==="signin"){
      home.style.display="none";
      grid.style.display="grid";
      signIn.style.display="block";
      signUp.style.display="none";
    } else if(mode==="signup"){
      home.style.display="none";
      grid.style.display="grid";
      signIn.style.display="none";
      signUp.style.display="block";
      renderThemeColorPicker("signup-color-swatches","signup-color",document.getElementById("signup-color")?.value||"#4361ee");
    } else {
      home.style.display="block";
      grid.style.display="none";
      signIn.style.display="none";
      signUp.style.display="none";
      showAuthError("");
    }
  };
  function renderAuthUsers(){
    const sel=document.getElementById("auth-user-select");
    if(!sel) return;
    const keys=Object.keys(accountRegistry||{});
    sel.innerHTML=keys.map(k=>{
      const nm=accountRegistry[k]?.name||k;
      return `<option value="${k}">${nm}</option>`;
    }).join("");
    if(keys.length){
      const remembered=localStorage.getItem("ironlog_profile");
      sel.value=keys.includes(remembered)?remembered:keys[0];
    }
  }
  function renderThemeColorPicker(containerId,inputId,current){
    const box=document.getElementById(containerId);
    const input=document.getElementById(inputId);
    if(!box||!input) return;
    const selected=(current||input.value||THEME_COLORS[0]).toLowerCase();
    input.value=selected;
    box.innerHTML=THEME_COLORS.map(c=>{
      const active=selected===String(c).toLowerCase();
      return `<button type="button" class="color-dot ${active?'active':''}" style="--dot:${c}" onclick="selectThemeColor('${containerId}','${inputId}','${c}')"></button>`;
    }).join("");
  }
  window.selectThemeColor=function(containerId,inputId,color){
    const input=document.getElementById(inputId);
    if(input) input.value=color;
    renderThemeColorPicker(containerId,inputId,color);
  };
  async function finalizeSignedInUser(pk){
    if(!PROFILES[pk]) return;
    activeProfile=pk;
    localStorage.setItem("ironlog_profile",pk);
    normalizeHealthStore();
    try{ notificationsSeen=JSON.parse(localStorage.getItem(`ironlog_notif_seen_${activeProfile}`)||"{}")||{}; }catch(_e){ notificationsSeen={}; }
    document.body.classList.remove("auth-locked");
    const gate=document.getElementById("auth-gate");
    if(gate) gate.style.display="none";
    updateLogoColor();
    renderSettingsProfiles();
    await loadData();
    renderProfileShell();
    toast(`👤 ${PROFILES[pk].label}`);
  }
  window.signInAccount=async function(){
    const sel=document.getElementById("auth-user-select");
    const pinEl=document.getElementById("auth-pin");
    const pk=sel?.value||"";
    const pin=(pinEl?.value||"").trim();
    if(!pk || !accountRegistry[pk]){ showAuthError("Select a user account"); return; }
    if(!pin){ showAuthError("Enter PIN"); return; }
    if(pin !== String(accountRegistry[pk].pin||"")){
      showAuthError("Incorrect PIN");
      return;
    }
    showAuthError("");
    if(pinEl) pinEl.value="";
    await finalizeSignedInUser(pk);
  };
  window.signUpAccount=async function(){
    const name=(document.getElementById("signup-name")?.value||"").trim();
    const pin=(document.getElementById("signup-pin")?.value||"").trim();
    const height=parseFloat(document.getElementById("signup-height")?.value||0);
    const color=(document.getElementById("signup-color")?.value||"").trim()||"#4361ee";
    const water=parseFloat(document.getElementById("signup-water")?.value||2.5) || 2.5;
    const protein=parseFloat(document.getElementById("signup-protein")?.value||120) || 120;
    if(!name){ showAuthError("Enter a name"); return; }
    if(!pin){ showAuthError("Enter a PIN"); return; }
    if(!Number.isFinite(height) || height<120 || height>230){ showAuthError("Height must be 120-230 cm"); return; }
    const pk=toProfileKey(name);
    if(!pk){ showAuthError("Invalid name"); return; }
    if(accountRegistry[pk]){ showAuthError("A user with that name already exists"); return; }
    accountRegistry[pk]={
      name,
      pin,
      color,
      height,
      water,
      protein,
      weighMode:"daily",
      birthday:null,
      createdAt:new Date().toISOString()
    };
    await persistAccounts();
    buildProfilesFromAccounts();
    renderAuthUsers();
    showAuthError("");
    await finalizeSignedInUser(pk);
  };
  window.signOutAccount=function(){
    const u=new URL(window.location.href);
    u.searchParams.set("v", APP_VERSION);
    u.searchParams.set("t", String(Date.now()));
    window.location.href=u.toString();
  };

  // ─── SESSION PARTICIPANTS ───
  function getTrackableParticipants(key){
    if(!canManageWorkoutParticipants()) return [activeProfile];
    const planParts = WORKOUT_PLAN[key]?.participants || [activeProfile];
    const set = new Set([activeProfile, ...planParts]);
    // Quick partner toggle for the main shared pair
    if(activeProfile === "revan" && PROFILES.bronwen) set.add("bronwen");
    if(activeProfile === "bronwen" && PROFILES.revan) set.add("revan");
    return Array.from(set).filter(p => !!PROFILES[p]);
  }
  function getSessionParticipants(date, key){
    if(!canManageWorkoutParticipants()) return [activeProfile];
    const wo = state.workouts?.[date]?.[key];
    const trackable = getTrackableParticipants(key);
    if(wo?.sessionParticipants?.length){
      const valid = wo.sessionParticipants.filter(p => trackable.includes(p));
      if(valid.length) return valid;
    }
    return [activeProfile];
  }
  window.toggleSessionParticipant = async function(key, participant){
    if(!canManageWorkoutParticipants()){
      toast("Only Revan can manage session participants");
      return;
    }
    const wo = getWorkout(activeDate, key);
    const trackable = getTrackableParticipants(key);
    if(!trackable.includes(participant)) return;
    let current = wo.sessionParticipants ? [...wo.sessionParticipants] : [activeProfile];
    if(current.includes(participant)){
      if(current.length > 1) current = current.filter(p => p !== participant);
    } else {
      current.push(participant);
    }
    wo.sessionParticipants = current;
    const sy = window.scrollY;
    renderDayPanel(key); window.scrollTo(0, sy);
    await saveData();
  };
  window.shiftActiveWorkoutParticipant=function(key, dir){
    const day=WORKOUT_PLAN[key];
    if(!day) return;
    const wo=getWorkout(activeDate,key);
    const participants=(getSessionParticipants(activeDate,key) || wo.sessionParticipants || day.participants || [activeProfile]).filter(Boolean);
    if(participants.length<=1) return;
    activeWorkoutParticipantIndex=(activeWorkoutParticipantIndex + dir + participants.length) % participants.length;
    renderDayPanel(key);
  };

  // SESSION TIMER
  let sessionInterval=null, sessionStart=null, sessionPaused=false, sessionPausedAt=0;

  function startSessionTimer(){
    if(sessionInterval&&!sessionPaused) return;
    if(sessionPaused){ resumeSessionTimer(); return; }
    clearInterval(sessionInterval);
    sessionStart=Date.now(); sessionPaused=false; sessionPausedAt=0;
    sessionInterval=setInterval(updateSessionDisplay,1000);
    updateSessionDisplay(); updateTimerBtns();
  }
  window.startSessionTimer = startSessionTimer;
  function pauseSessionTimer(){
    if(!sessionInterval||sessionPaused) return;
    clearInterval(sessionInterval); sessionInterval=null;
    sessionPausedAt=Date.now()-sessionStart; sessionPaused=true;
    updateTimerBtns();
  }
  window.pauseSessionTimer = pauseSessionTimer;
  function resumeSessionTimer(){
    if(!sessionPaused) return;
    sessionStart=Date.now()-sessionPausedAt; sessionPaused=false;
    sessionInterval=setInterval(updateSessionDisplay,1000);
    updateSessionDisplay(); updateTimerBtns();
  }
  function resetSessionTimer(){
    clearInterval(sessionInterval); sessionInterval=null;
    sessionStart=null; sessionPaused=false; sessionPausedAt=0;
    ["session-display","session-display-active"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.textContent="00:00";
    });
    updateTimerBtns();
  }
  window.resetSessionTimer = resetSessionTimer;
  function getSessionDisplayText(){
    if(!sessionStart) return "00:00";
    const secs=Math.floor(((sessionPaused ? sessionPausedAt : (Date.now()-sessionStart)))/1000);
    const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
    return h>0?`${h}h ${String(m).padStart(2,"0")}m`:`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  function updateSessionDisplay(){
    if(!sessionStart) return;
    const text=getSessionDisplayText();
    ["session-display","session-display-active"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.textContent=text;
    });
  }
  function updateTimerBtns(){
    [
      {play:"timer-play", pause:"timer-pause"},
      {play:"timer-play-active", pause:"timer-pause-active"}
    ].forEach(ids=>{
      const play=document.getElementById(ids.play), pause=document.getElementById(ids.pause);
      if(!play||!pause) return;
      if(sessionPaused||!sessionInterval){ play.style.display="inline-flex"; pause.style.display="none"; }
      else { play.style.display="none"; pause.style.display="inline-flex"; }
    });
  }

  // CLOCK
  function updateClock(){
    const el=document.getElementById("header-datetime"); if(!el) return;
    const now=new Date();
    const ds=now.toLocaleDateString("en-ZA",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
    const ts=now.toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    el.innerHTML=`<span>${ds}</span><span class="htime">${ts}</span>`;
  }

  function getTodayStr(){ return new Date().toISOString().split("T")[0]; }
  function getWeekStartStr(dateStr){
    const d=new Date(`${dateStr}T12:00:00`);
    const dow=d.getDay();
    const shift=dow===0?6:(dow-1); // Monday start
    d.setDate(d.getDate()-shift);
    return d.toISOString().split("T")[0];
  }
  function getWeighMode(profileKey=activeProfile){
    return PROFILES?.[profileKey]?.weighMode==="weekly"?"weekly":"daily";
  }
  function getWeightEntryKey(profileKey,dateStr){
    return getWeighMode(profileKey)==="weekly" ? getWeekStartStr(dateStr) : dateStr;
  }
  function getMonthKey(){ return activeDate.slice(0,7); }
  function getTodayDayKey(){
    const dow=new Date().getDay();
    return Object.keys(WORKOUT_PLAN).find(k=>getWorkoutWeekdaySortValue(WORKOUT_PLAN[k])===getWorkoutWeekdaySortValue({weekday:dow}))||null;
  }
  function getProfileDocId(){ return PROFILES[activeProfile].docId; }
  function getWorkoutOrderValue(key){
    const day = WORKOUT_PLAN?.[key] || {};
    const explicit = parseInt(day.order, 10);
    if(Number.isInteger(explicit) && explicit > 0) return explicit;
    return parseInt(String(key || "").replace("day",""), 10) || 999;
  }
  function getWorkoutWeekdaySortValue(day){
    const weekday = day?.weekday;
    if(weekday == null || weekday === "" || Number.isNaN(Number(weekday))) return 99;
    const parsed = Number(weekday);
    return parsed === 0 ? 7 : parsed;
  }
  function getWorkoutDisplayLabel(key, fallbackIndex=null){
    const day = WORKOUT_PLAN?.[key] || {};
    const explicit = String(day.label || "").trim();
    if(explicit) return explicit;
    const order = fallbackIndex != null ? fallbackIndex + 1 : getWorkoutOrderValue(key);
    return `DAY ${order}`;
  }
  function getWorkoutWeekdayLabel(weekday){
    const parsed = Number(weekday);
    if(Number.isNaN(parsed) || weekday == null || weekday === "") return "—";
    return ["SUN","MON","TUE","WED","THU","FRI","SAT"][parsed] || "—";
  }
  function sortedDayKeys(){
    return Object.keys(WORKOUT_PLAN).sort((a,b)=>{
      const dayA = WORKOUT_PLAN?.[a] || {};
      const dayB = WORKOUT_PLAN?.[b] || {};
      const weekdayDiff = getWorkoutWeekdaySortValue(dayA) - getWorkoutWeekdaySortValue(dayB);
      if(weekdayDiff !== 0) return weekdayDiff;
      const diff = getWorkoutOrderValue(a) - getWorkoutOrderValue(b);
      return diff !== 0 ? diff : String(a).localeCompare(String(b));
    });
  }
  function normalizeWorkoutPlanOrder(){
    sortedDayKeys().forEach((key, index)=>{
      if(!WORKOUT_PLAN[key]) return;
      WORKOUT_PLAN[key].order = index + 1;
      if(!String(WORKOUT_PLAN[key].label || "").trim()) WORKOUT_PLAN[key].label = `DAY ${index + 1}`;
    });
  }
  function getExerciseTargetSets(exercise){
    const sets = parseInt(exercise?.sets || 0, 10);
    return Math.max(sets, 1);
  }

  // ─── FIREBASE ───
  // Data is stored under ONE shared doc "data_shared" so both profiles
  // see the same workout plan and workout logs. Bodyweight / health remain
  // per-profile so each person tracks their own.
  const SHARED_DOC = "data_shared";

  async function migrateOldData(){
    // Pull data from all old per-profile docs and merge into data_shared
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const profileKeys = ["revan","bronwen","user3","user4","user5"];
    let merged = { workouts:{}, prs:{}, savedWorkouts:{}, gymUrl:"", plan:null, profileData:{} };
    let didMigrate = false;

    for(const pk of profileKeys){
      const oldDocId = PROFILES[pk]?.docId;
      if(!oldDocId) continue;
      try {
        const oldSnap = await getDoc(doc(db,"ironlog",oldDocId));
        if(!oldSnap.exists()){ console.log(`[IronLog] Migration: no doc for ${pk} (${oldDocId})`); continue; }
        const d = oldSnap.data();
        const wCount = Object.keys(d.workouts||{}).length;
        console.log(`[IronLog] Migration: found ${pk} doc — ${wCount} workout dates, plan: ${!!d.plan}`);
        didMigrate = true;

        // Merge workout logs — for old single-user data, prefix exercise keys with profile name
        if(d.workouts){
          console.log(`[IronLog] ${pk} workout dates:`, Object.keys(d.workouts).sort().slice(-5));
          Object.keys(d.workouts).forEach(date=>{
            if(!merged.workouts[date]) merged.workouts[date]={};
            Object.keys(d.workouts[date]).forEach(dayKey=>{
              const wo = d.workouts[date][dayKey];
              if(!merged.workouts[date][dayKey]) merged.workouts[date][dayKey]={done:false,exercises:{},notes:""};
              if(wo.done) merged.workouts[date][dayKey].done=true;
              if(wo.notes) merged.workouts[date][dayKey].notes=wo.notes||"";
              // Re-key exercises from old "Exercise Name" → new "profile_Exercise Name"
              Object.keys(wo.exercises||{}).forEach(exName=>{
                const newKey = exName.startsWith(`${pk}_`) ? exName : `${pk}_${exName}`;
                merged.workouts[date][dayKey].exercises[newKey] = wo.exercises[exName];
              });
            });
          });
        }

        // Merge PRs
        if(d.prs){
          Object.keys(d.prs).forEach(exName=>{
            const prKey = exName.startsWith(`${pk}_`) ? exName : `${pk}_${exName}`;
            merged.prs[prKey] = {...d.prs[exName], participant:pk};
          });
        }

        // Use revan's plan/savedWorkouts/gymUrl as the shared base
        if(pk==="revan"){
          if(d.plan) merged.plan = d.plan;
          if(d.savedWorkouts) merged.savedWorkouts = d.savedWorkouts;
          if(d.gymUrl) merged.gymUrl = d.gymUrl;
        }

        // Personal data stays per-profile
        merged.profileData[pk] = {
          bodyweight: d.bodyweight||{},
          health:     d.health||{}
        };
      } catch(e){ console.warn("Migration skip:", pk, e); }
    }

    if(didMigrate){
      if(!merged.plan) merged.plan = seedPlan("revan");
      merged.legacyMigrationCompleted = true;
      await setDoc(doc(db,"ironlog",SHARED_DOC), merged, {merge:true});
      toast("✅ Data migrated from old profiles");
      return;
    }
    await setDoc(doc(db,"ironlog",SHARED_DOC), { legacyMigrationCompleted:true }, {merge:true});
  }

  async function loadData(){
    if(unsubscribeFn) unsubscribeFn();
    try {
      const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const sharedRef = doc(db, "ironlog", SHARED_DOC);
      const sharedSnap = await getDoc(sharedRef);
      const sharedData = sharedSnap.exists() ? sharedSnap.data() : null;
      const hasWorkouts = sharedData && Object.keys(sharedData.workouts||{}).length > 0;
      const migrationDone = !!sharedData?.legacyMigrationCompleted;

      // Only run legacy migration once. Otherwise old docs can re-populate deleted data.
      if(!sharedSnap.exists() || (!migrationDone && !hasWorkouts)){
        toast("🔄 Loading your data...");
        await migrateOldData();
      }

      unsubscribeFn = onSnapshot(sharedRef, snap => {
        if(snap.exists()){
          const d = snap.data();
          const pd = d.profileData || {};
          const legacyPd = d[`profileData.${activeProfile}`] || {};
          const profileData = pd[activeProfile] || legacyPd || {};
          const hasScopedData = !!(
            profileData.plan ||
            profileData.workouts ||
            profileData.prs ||
            profileData.savedWorkouts ||
            profileData.gymUrl ||
            profileData.bodyweight ||
            profileData.health
          );
          WORKOUT_PLAN = d.plan ? deepCopy(d.plan) : (profileData.plan ? deepCopy(profileData.plan) : seedPlan(activeProfile));
          state.workouts      = d.workouts      || profileData.workouts      || {};
          state.prs           = profileData.prs           || d.prs           || {};
          state.savedWorkouts = profileData.savedWorkouts || d.savedWorkouts || {};
          state.gymUrl        = profileData.gymUrl        || d.gymUrl        || "";
          state.allUserWorkouts = activeProfile === "revan" ? pd : null;
          normalizeWorkoutPlanOrder();
          latestAppVersion    = d.latestAppVersion || APP_VERSION;
          appUpdateUrl        = d.appUpdateUrl     || appUpdateUrl || "";
          latestAppUpdatedAt  = d.latestAppUpdatedAt || "";
          state.bodyweight    = profileData.bodyweight || {};
          state.health        = profileData.health     || {};
          state.exerciseMeta  = profileData.exerciseMeta || {};
          state.userOverrides = profileData.userOverrides || {};
          state.visualProgress = Array.isArray(profileData.visualProgress) ? profileData.visualProgress : [];
          applyUserOverrides(state.userOverrides);
          saveLocalSnapshot(activeProfile);
          if((!d.plan && profileData.plan) || (!d.workouts && profileData.workouts)) saveData();
          if(!profileData.plan && !d.plan && Object.keys(WORKOUT_PLAN||{}).length) saveData();
          if(activeProfile === "revan" && !hasScopedData && (d.plan || d.workouts || d.prs || d.savedWorkouts || d.gymUrl)) saveData();
          if(hasAppUpdate() && lastUpdateToastVersion!==latestAppVersion){
            lastUpdateToastVersion = latestAppVersion;
            toast(`⬆ Update ${latestAppVersion} available in Settings`);
          }

          // Debug: log what we loaded so you can verify in browser console
          const wDates = Object.keys(state.workouts||{});
          console.log(`[IronLog] Loaded ${wDates.length} workout dates from Firebase`);
          if(wDates.length > 0) console.log('[IronLog] Most recent dates:', wDates.sort().slice(-5));
          else console.warn('[IronLog] WARNING: workouts object is empty after load!');
        } else {
          WORKOUT_PLAN = seedPlan(activeProfile);
          normalizeWorkoutPlanOrder();
          state = { workouts:{}, bodyweight:{}, prs:{}, savedWorkouts:{}, gymUrl:"", health:{}, exerciseMeta:{}, userOverrides:{}, visualProgress:[] };
          applyUserOverrides({});
          latestAppVersion = APP_VERSION;
          appUpdateUrl = DEFAULT_APP_UPDATE_URL;
          latestAppUpdatedAt = "";
          console.warn('[IronLog] WARNING: data_shared doc does not exist, seeding fresh');
          saveData();
        }
        renderDayGrid(); renderAll(); handleScreenChange();
        hideAppSplash();
      });
    } catch(e){
      console.error('[IronLog] loadData error:', e);
      if(restoreLocalSnapshot(activeProfile)){
        renderDayGrid(); renderAll(); handleScreenChange();
        toast("⚠️ Firebase offline — loaded local snapshot");
      } else {
        toast("⚠️ Firebase not connected");
      }
      hideAppSplash();
    }
  }

  async function saveData(){
    try {
      normalizeWorkoutPlanOrder();
      saveLocalSnapshot(activeProfile);
      const payload = {
        profileData: {
          [activeProfile]: {
            plan:          WORKOUT_PLAN         || {},
            workouts:      state.workouts      || {},
            prs:           state.prs           || {},
            savedWorkouts: state.savedWorkouts || {},
            gymUrl:        state.gymUrl        || "",
            bodyweight: state.bodyweight || {},
            health:     state.health     || {},
            exerciseMeta: state.exerciseMeta || {},
            userOverrides: state.userOverrides || {},
            visualProgress: Array.isArray(state.visualProgress) ? state.visualProgress : []
          }
        },
        legacyMigrationCompleted: true,
        // Backward-compat cleanup for legacy dotted-field writes
        [`profileData.${activeProfile}`]: null
      };
      payload.plan = WORKOUT_PLAN || {};
      payload.workouts = state.workouts || {};
      if(activeProfile==="revan"){
        payload.prs = state.prs || {};
        payload.savedWorkouts = state.savedWorkouts || {};
        payload.gymUrl = state.gymUrl || "";
      }
      const ref = doc(db, "ironlog", SHARED_DOC);
      await setDoc(ref, payload, { merge: true });
      clearPendingSync(activeProfile);
    } catch(e){
      markPendingSync(activeProfile);
      toast(navigator.onLine ? "⚠️ Save failed" : "⚠️ Offline: changes stored on this device and will sync later");
    }
  }

  window.switchProfile=function(pk){
    if(pk===activeProfile) return;
    const acct=accountRegistry[pk];
    if(!acct){ toast("⚠️ Account not found"); return; }
    const pin=prompt(`Enter PIN for ${acct.name||pk}`);
    if(pin===null) return;
    if(String(pin).trim()!==String(acct.pin||"")){
      toast("⚠️ Incorrect PIN");
      return;
    }
    activeProfile=pk; localStorage.setItem("ironlog_profile",pk);
    notificationsOpen=false;
    const np=document.getElementById("notif-panel");
    if(np) np.style.display="none";
    try{ notificationsSeen=JSON.parse(localStorage.getItem(`ironlog_notif_seen_${activeProfile}`)||"{}")||{}; }catch(_e){ notificationsSeen={}; }
    // Don't wipe workouts/plan — those are shared. Just reload personal data.
    [freqChart,volChart,bwChart,tonnageChart,sleepChart].forEach(c=>{ if(c)c.destroy(); });
    freqChart=volChart=bwChart=tonnageChart=sleepChart=null;
    activeDay=null; panelCollapsed=false;
    document.getElementById("day-panel").style.display="none";
    updateLogoColor(); renderSettingsProfiles(); loadData();
    renderAdminSettingsBlock();
    toast(`👤 ${PROFILES[pk].label}`);
    closeSettings();
  };

  function updateLogoColor(){
    const el=document.querySelector(".logo-log");
    const p=PROFILES[activeProfile];
    if(el && p) el.style.color=p.color;
  }
  window.openTodayWorkout=async function(){
    const todayKey=getTodayDayKey();
    if(!todayKey){
      toast("No workout planned for today");
      return;
    }
    await startWorkout(todayKey);
    window.scrollTo({top:0,behavior:"smooth"});
  };
  window.openAddWorkoutQuick=function(){
    openAddDay();
  };
  window.openUpdateQuick=async function(){
    openSettings();
    settingsSectionState.version=true;
    renderSettingsSectionUI();
    await checkForAppUpdate();
  };
  window.focusStat=function(kind){
    if(kind==="days"){
      setMobileSection("progress");
      setTimeout(()=>document.getElementById("calendar")?.scrollIntoView({behavior:"smooth",block:"start"}),80);
      return;
    }
    if(kind==="ex"){
      setMobileSection("workouts");
      setTimeout(()=>document.getElementById("day-grid")?.scrollIntoView({behavior:"smooth",block:"start"}),80);
      return;
    }
    if(kind==="tonnage" || kind==="consistency"){
      setMobileSection("progress");
      setTimeout(()=>document.getElementById("mobile-progress-section")?.scrollIntoView({behavior:"smooth",block:"start"}),120);
    }
  };
  function normalizeExerciseName(name){
    return String(name||"").trim().toLowerCase();
  }
  function applyUserOverrides(overrides){
    Object.keys(BASE_PROFILES).forEach(pk=>{
      PROFILES[pk] = {...BASE_PROFILES[pk]};
    });
    Object.keys(overrides||{}).forEach(pk=>{
      if(!PROFILES[pk]) return;
      PROFILES[pk] = {...PROFILES[pk], ...(overrides[pk]||{})};
    });
  }
  function parseVersion(v){
    return String(v||"")
      .trim()
      .replace(/^v/i,"")
      .split(".")
      .map(n=>parseInt(n,10))
      .map(n=>Number.isFinite(n)?n:0);
  }
  function compareVersions(a,b){
    const av=parseVersion(a), bv=parseVersion(b);
    const len=Math.max(av.length,bv.length);
    for(let i=0;i<len;i++){
      const ai=av[i]||0, bi=bv[i]||0;
      if(ai>bi) return 1;
      if(ai<bi) return -1;
    }
    return 0;
  }
  function hasAppUpdate(){
    return compareVersions(latestAppVersion, APP_VERSION) > 0;
  }
  function renderAppVersion(){
    const el = document.getElementById("app-version");
    if(el) el.textContent = APP_VERSION;
    const authVerEl=document.getElementById("auth-version");
    if(authVerEl) authVerEl.textContent = APP_VERSION;
    const latestEl=document.getElementById("latest-app-version");
    if(latestEl) latestEl.textContent = latestAppVersion || APP_VERSION;
    const statusEl=document.getElementById("app-update-status");
    if(statusEl){
      if(hasAppUpdate()){
        statusEl.textContent = `UPDATE AVAILABLE (${latestAppVersion})`;
        statusEl.style.color = "#7dd87d";
      }else{
        statusEl.textContent = "UP TO DATE";
        statusEl.style.color = "var(--muted)";
      }
    }
    const urlInput=document.getElementById("app-update-url-input");
    if(urlInput && document.activeElement!==urlInput) urlInput.value = appUpdateUrl || "";
  }

  function syncWorkoutFocusState(){
    document.body.classList.toggle("exercise-focus", Boolean(activeDay) && isMobile() && !isCoverScreen());
  }

  function setMobileSection(section){
    const normalized = section === "home" ? "dashboard" : (section === "start" ? "workouts" : (section || "dashboard"));
    mobileSection = normalized;
    document.body.setAttribute("data-mobile-section", mobileSection);
    syncBottomNavState();
    syncWorkoutFocusState();
  }

  function syncBottomNavState(){
    document.querySelectorAll(".bnav-item").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.section === mobileSection);
    });
  }

  function applyScreenMode(){
    document.body.setAttribute("data-screen", isCoverScreen() ? "cover" : "full");
  }

  function handleScreenChange(){
    applyScreenMode();
    if(isCoverScreen()){
      if(activeDay) initCoverPlayerForDay(activeDay);
    } else {
      syncCoverSetsToSession();
      hideCoverPlayer();
      syncWorkoutFocusState();
    }
  }

  function hideCoverPlayer(){
    const player = document.getElementById("coverWorkoutPlayer");
    if(player) player.style.display = "none";
    document.body.removeAttribute("data-cover-player");
  }

  function getActiveCoverParticipant(key){
    return getSessionParticipants(activeDate, key)[0] || activeProfile;
  }

  function buildWorkoutSnapshot(key){
    const day = WORKOUT_PLAN[key];
    if(!day) return null;
    const wo = getWorkout(activeDate, key);
    const participant = getActiveCoverParticipant(key);
    const exercises = (day.exercises || []).map((ex, index)=>{
      const resolved = getExData(wo.exercises, participant, ex.name);
      const data = resolved.data || {};
      return {
        id: resolved.key,
        name: ex.name,
        muscle: getMuscleGroup(ex.name),
        sets: ex.sets || 0,
        targetReps: ex.reps || "",
        weight: parseFloat(data.weight || getLastWeight(key, ex.name, participant)?.weight || 20) || 20,
        reps: parseInt(data.actualReps || ex.reps || 8, 10) || 8,
        checked: Boolean(data.checked),
        coverSets: Array.isArray(data.coverSets) ? data.coverSets : [],
        raw: ex,
        participant,
        index
      };
    });
    return { key, day, exercises };
  }

  function initCoverPlayerForDay(key){
    if(!isCoverScreen()) return;
    const snapshot = buildWorkoutSnapshot(key);
    if(!snapshot) return;
    coverState.dayKey = key;
    coverState.exerciseIndex = Math.min(coverState.exerciseIndex, Math.max(snapshot.exercises.length - 1, 0));
    coverState.exercises = snapshot.exercises;
    snapshot.exercises.forEach((ex, i)=>{
      coverState.currentWeight[i] = ex.weight;
      coverState.currentReps[i] = ex.reps;
      coverState.loggedSets[i] = Array.isArray(ex.coverSets) && ex.coverSets.length
        ? ex.coverSets.map(set=>({ weight:set.weight, reps:set.reps, ts:set.ts || Date.now() }))
        : [];
      if(ex.checked && coverState.loggedSets[i].length === 0){
        coverState.loggedSets[i].push({ weight: ex.weight, reps: ex.reps });
      }
    });
    buildCoverCards();
    updateCoverDisplay();
    const player = document.getElementById("coverWorkoutPlayer");
    if(player) player.style.display = "flex";
    document.body.setAttribute("data-cover-player", "active");
    setMobileSection("start");
  }

  function buildCoverCards(){
    const track = document.getElementById("coverSwipeTrack");
    const dots = document.getElementById("coverDots");
    if(!track || !dots) return;
    track.innerHTML = "";
    dots.innerHTML = "";
    coverState.exercises.forEach((ex, i)=>{
      const card = document.createElement("div");
      card.className = "cover-exercise-card";
      card.innerHTML = `
        <div class="cover-exercise-name">${ex.name}</div>
        <div class="cover-exercise-muscle">${String(ex.muscle || "Workout").toUpperCase()}</div>
        <div class="cover-exercise-target">${ex.sets || 0} sets · ${ex.targetReps || "8"} reps target</div>
      `;
      track.appendChild(card);
      const dot = document.createElement("div");
      dot.className = `cover-dot${i === coverState.exerciseIndex ? " active" : ""}`;
      dots.appendChild(dot);
    });
    const title = document.getElementById("coverWorkoutName");
    if(title){
      const day = WORKOUT_PLAN[coverState.dayKey];
      title.textContent = day ? `${day.label} ${day.title}` : "WORKOUT";
    }
  }

  function renderCoverSets(index){
    const container = document.getElementById("coverSetsLogged");
    if(!container) return;
    const sets = coverState.loggedSets[index] || [];
    container.innerHTML = sets.map(set=>`<div class="cover-set-pill">${set.weight}kg × ${set.reps}</div>`).join("");
  }

  function updateCoverDisplay(){
    const i = coverState.exerciseIndex;
    if(!coverState.exercises[i]) return;
    const track = document.getElementById("coverSwipeTrack");
    if(track) track.style.transform = `translateX(-${i * 100}%)`;
    const progress = document.getElementById("coverProgress");
    if(progress) progress.textContent = `${i + 1} / ${coverState.exercises.length}`;
    const weight = document.getElementById("coverWeight");
    const reps = document.getElementById("coverReps");
    if(weight) weight.textContent = coverState.currentWeight[i];
    if(reps) reps.textContent = coverState.currentReps[i];
    document.querySelectorAll(".cover-dot").forEach((dot, idx)=>dot.classList.toggle("active", idx === i));
    renderCoverSets(i);
  }

  function persistCoverExercise(index, checked){
    const ex = coverState.exercises[index];
    if(!ex || !coverState.dayKey) return;
    const wo = getWorkout(activeDate, coverState.dayKey);
    if(!wo.exercises[ex.id]) wo.exercises[ex.id] = {};
    wo.exercises[ex.id].weight = String(coverState.currentWeight[index]);
    wo.exercises[ex.id].actualReps = String(coverState.currentReps[index]);
    wo.exercises[ex.id].coverSets = (coverState.loggedSets[index] || []).map(set=>({
      weight: set.weight,
      reps: set.reps,
      ts: set.ts || Date.now()
    }));
    if(typeof checked === "boolean") wo.exercises[ex.id].checked = checked;
  }

  function syncCoverSetsToSession(){
    coverState.exercises.forEach((_ex, index)=>persistCoverExercise(index));
  }

  function stepperMarkup(value, options = {}){
    const unit = options.unit ? `<span class="stepper-unit">${options.unit}</span>` : "";
    const extra = options.inputId ? ` data-input-id="${options.inputId}"` : "";
    const max = options.max != null ? ` data-max="${options.max}"` : "";
    const min = options.min != null ? ` data-min="${options.min}"` : "";
    const step = options.step != null ? ` data-step="${options.step}"` : "";
    return `<div class="stepper-group"${extra}${step}${min}${max} data-value="${value}">
      <button type="button" class="stepper-dec" ontouchstart="stepperAdjust(this, -1)" onclick="stepperAdjust(this, -1)">−</button>
      <span class="stepper-val">${value}</span>
      ${unit}
      <button type="button" class="stepper-inc" ontouchstart="stepperAdjust(this, 1)" onclick="stepperAdjust(this, 1)">+</button>
    </div>`;
  }

  function syncStepperInput(group){
    const inputId = group.dataset.inputId;
    if(!inputId) return;
    const input = document.getElementById(inputId);
    if(input) input.value = group.dataset.value || "";
  }

  window.stepperAdjust=function(btn, direction){
    const group = btn.closest(".stepper-group");
    if(!group) return;
    const step = parseFloat(group.dataset.step || 1);
    const min = parseFloat(group.dataset.min || 0);
    const max = parseFloat(group.dataset.max || 9999);
    let val = parseFloat(group.dataset.value || 0);
    val = Math.min(max, Math.max(min, val + direction * step));
    val = parseFloat((Math.round((val / step) * 1000) / 1000 * step).toFixed(4));
    group.dataset.value = String(val);
    const display = group.querySelector(".stepper-val");
    if(display) display.textContent = String(val);
    syncStepperInput(group);
  };

  function createEditRowMarkup(ex = {}, index = 0){
    const sets = parseInt(ex.sets || 0, 10) || 0;
    const reps = ex.reps || "12";
    return `<div class="eer" data-index="${index}" draggable="true" ondragstart="startEditRowDrag(event)" ondragend="endEditRowDrag(event)" ondragover="onEditRowDragOver(event)" ondragleave="onEditRowDragLeave(event)" ondrop="onEditRowDrop(event)">
      <span class="eed" title="Drag to reorder">⠿</span>
      <input class="een" list="exercise-options" value="${ex.name || ""}" placeholder="Exercise name">
      ${stepperMarkup(sets,{ step:1, min:0, max:10, unit:"sets" })}
      <input class="eer2" value="${reps}" placeholder="Reps" style="width:56px">
      <button class="edb" onclick="this.closest('.eer').remove(); refreshEditRowIndices()" title="Remove">🗑</button>
    </div>`;
  }

  window.adjustWeight=function(delta){
    const i = coverState.exerciseIndex;
    if(!coverState.exercises[i]) return;
    const next = Math.max(0, Math.round((Number(coverState.currentWeight[i] || 0) + delta) * 4) / 4);
    coverState.currentWeight[i] = Number(next.toFixed(2));
    persistCoverExercise(i);
    updateCoverDisplay();
  };

  window.adjustReps=function(delta){
    const i = coverState.exerciseIndex;
    if(!coverState.exercises[i]) return;
    coverState.currentReps[i] = Math.max(1, Number(coverState.currentReps[i] || 0) + delta);
    persistCoverExercise(i);
    updateCoverDisplay();
  };

  window.logCurrentSet=async function(){
    const i = coverState.exerciseIndex;
    const ex = coverState.exercises[i];
    if(!ex || !coverState.dayKey) return;
    coverState.loggedSets[i].push({ weight: coverState.currentWeight[i], reps: coverState.currentReps[i] });
    persistCoverExercise(i, true);
    renderCoverSets(i);
    await saveData();
    const btn = document.getElementById("coverLogBtn");
    if(btn){
      const original = btn.textContent;
      btn.textContent = "✓ LOGGED";
      btn.classList.add("logged");
      setTimeout(()=>{
        btn.textContent = original;
        btn.classList.remove("logged");
      }, 700);
    }
  };

  window.coverNextExercise=function(){
    if(coverState.exerciseIndex < coverState.exercises.length - 1){
      coverState.exerciseIndex++;
      updateCoverDisplay();
    }
  };

  window.coverPrevExercise=function(){
    if(coverState.exerciseIndex > 0){
      coverState.exerciseIndex--;
      updateCoverDisplay();
    }
  };

  window.openCoverFinish=function(){
    syncCoverSetsToSession();
    if(coverState.dayKey) openQuickFinish(coverState.dayKey);
  };

  function initCoverSwipe(){
    const container = document.getElementById("coverSwipeContainer");
    if(!container || container.dataset.bound === "true") return;
    container.dataset.bound = "true";
    let startX = 0;
    let startY = 0;
    container.addEventListener("touchstart", e=>{
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive:true });
    container.addEventListener("touchend", e=>{
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40){
        if(dx < 0) coverNextExercise();
        else coverPrevExercise();
      }
    }, { passive:true });
  }

  window.navTo=function(section, btn){
    if(section === "settings"){
      setMobileSection("profile");
      openSettings();
      return;
    }
    if(section === "workouts" && activeDay && isCoverScreen()){
      initCoverPlayerForDay(activeDay);
    }
    setMobileSection(section);
    const map = {
      dashboard: "mobile-home-section",
      workouts: "mobile-workouts-section",
      progress: "mobile-progress-section",
      profile: "mobile-profile-section"
    };
    const target = document.getElementById(map[section] || "");
    if(target) target.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  window.setWorkoutSearch=function(value){
    workoutSearchQuery = String(value || "").trim().toLowerCase();
    renderDayGrid();
  };

  window.selectRPE=function(btn, value){
    document.querySelectorAll(".rpe-tile").forEach(tile=>tile.classList.remove("selected"));
    btn.classList.add("selected");
    selectedRPE = value;
    const input = document.getElementById("qfm-rpe");
    if(input) input.value = value;
  };

  window.selectPain=function(btn, value){
    document.querySelectorAll(".pain-pill").forEach(tile=>tile.classList.remove("selected"));
    btn.classList.add("selected");
    selectedPain = value;
    const input = document.getElementById("qfm-pain-level");
    if(input) input.value = value;
  };

  // ─── HELPERS ───
  function getWorkout(date,key){
    if(!state.workouts[date]) state.workouts[date]={};
    if(!state.workouts[date][key]) state.workouts[date][key]={done:false,exercises:{},notes:""};
    if(!state.workouts[date][key].notes) state.workouts[date][key].notes="";
    if(!state.workouts[date][key].workoutTime || typeof state.workouts[date][key].workoutTime!=="object") state.workouts[date][key].workoutTime={};
    if(!state.workouts[date][key].sessionMeta || typeof state.workouts[date][key].sessionMeta!=="object") state.workouts[date][key].sessionMeta={};
    return state.workouts[date][key];
  }
  function prefillWorkoutFromHistory(date,key){
    const day=WORKOUT_PLAN[key];
    if(!day) return 0;
    const wo=getWorkout(date,key);
    const participants=getSessionParticipants(date,key);
    let filled=0;
    day.exercises.forEach(ex=>{
      if(ex.sets===0) return;
      participants.forEach(pp=>{
        const {key:exKey,data:_ed}=getExData(wo.exercises,pp,ex.name);
        const ed=_ed||{};
        if(!wo.exercises[exKey]) wo.exercises[exKey]=ed;
        if(!String(ed.weight||"").trim()){
          const lw=getLastWeight(key,ex.name,pp);
          if(lw?.weight>0){
            wo.exercises[exKey].weight=String(lw.weight);
            filled++;
          }
        }
      });
    });
    return filled;
  }
  function getSessionElapsedMinutes(){
    if(!sessionStart) return 0;
    const ms=sessionPaused ? sessionPausedAt : (Date.now()-sessionStart);
    return Math.max(0, Math.round(ms/60000));
  }
  function getWorkoutTimeEntry(date,key,participant){
    const entry=state.workouts?.[date]?.[key]?.workoutTime?.[participant]||{};
    return {
      at: entry.at||"",
      durationMins: Number(entry.durationMins||0) || 0,
      trackedMins: Number(entry.trackedMins||0) || 0
    };
  }
  function saveWorkoutTimeMetaLocal(date,key,participant,patch){
    const wo=getWorkout(date,key);
    if(!wo.workoutTime || typeof wo.workoutTime!=="object") wo.workoutTime={};
    const cur=wo.workoutTime[participant]||{};
    wo.workoutTime[participant]={...cur,...patch};
  }
  window.saveWorkoutTimeAt=async function(key,participant,val){
    const cleaned=String(val||"").trim();
    saveWorkoutTimeMetaLocal(activeDate,key,participant,{at:cleaned});
    await saveData();
    if(cleaned) toast(`🕒 ${PROFILES[participant]?.label||participant}: ${cleaned}`);
  };
  window.saveWorkoutDuration=async function(key,participant,val){
    const mins=Math.max(0,parseInt(val||0,10)||0);
    saveWorkoutTimeMetaLocal(activeDate,key,participant,{durationMins:mins});
    await saveData();
    if(mins>0) toast(`⏱ ${PROFILES[participant]?.label||participant}: ${mins} min`);
  };
  window.saveTrackedTime=async function(key,participant){
    const mins=getSessionElapsedMinutes();
    if(mins<=0){ toast("⚠️ Start timer first"); return; }
    const now=new Date();
    const t=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    saveWorkoutTimeMetaLocal(activeDate,key,participant,{at:t,durationMins:mins,trackedMins:mins});
    const sy=window.scrollY;
    renderDayPanel(key);
    window.scrollTo(0,sy);
    await saveData();
    toast(`⏱ Saved ${mins} min for ${PROFILES[participant]?.label||participant}`);
  };

  // resolveExKey: handles both old format ("Exercise Name") and new format ("profile_Exercise Name")
  // Always returns the key that actually exists in the exercises object, preferring new format.
  function resolveExKey(exercises, participant, exName){
    const newKey = `${participant}_${exName}`;
    if(exercises[newKey] !== undefined) return newKey;
    if(exercises[exName] !== undefined) return exName; // old format fallback
    return newKey; // default to new format for writes
  }

  // getExData: gets exercise entry regardless of key format
  function getExData(exercises, participant, exName){
    const newKey = `${participant}_${exName}`;
    if(exercises[newKey] !== undefined) return { key: newKey, data: exercises[newKey] };
    if(exercises[exName] !== undefined) return { key: exName, data: exercises[exName] };
    return { key: newKey, data: null };
  }
  function stripParticipantPrefix(exName){
    if(typeof exName!=="string") return exName;
    let out=exName.trim();
    const profileKeys=new Set(Object.keys(PROFILES||{}).map(k=>k.toLowerCase()));
    // Remove one or more leading participant prefixes, case-insensitive.
    while(true){
      const idx=out.indexOf("_");
      if(idx<=0) break;
      const maybeProfile=out.slice(0,idx).toLowerCase();
      if(!profileKeys.has(maybeProfile)) break;
      out=out.slice(idx+1);
    }
    return out;
  }
  function getPRRecord(participant, exName){
    const cleanExName=stripParticipantPrefix(exName);
    const primaryKey=`${participant}_${cleanExName}`;
    const buggyKey=`${participant}_${participant}_${cleanExName}`;
    const oldKey=cleanExName;
    const prs=state.prs||{};
    return prs[primaryKey]||prs[buggyKey]||prs[oldKey]||null;
  }

  // Tonnage: sum across all participants, handles old+new key formats
  function calcSessionTonnage(date,key){
    const w=state.workouts?.[date]?.[key]; if(!w) return 0;
    const p=WORKOUT_PLAN[key]; if(!p) return 0;
    const parts = p.participants||['revan'];
    let t=0;
    parts.forEach(part=>{
      p.exercises.forEach(ex=>{
        if(ex.sets===0) return;
        const { data: e } = getExData(w.exercises, part, ex.name);
        if(!e||!e.checked) return;
        t+=ex.sets*(parseInt(e.actualReps||ex.reps)||0)*(parseFloat(e.weight)||0);
      });
    });
    return Math.round(t);
  }

  function checkPR(exName,weight,key,date,participant='revan'){
    if(!weight||weight<=0) return false;
    const cleanExName=stripParticipantPrefix(exName);
    const prKey=`${participant}_${cleanExName}`;
    const ex=state.prs?.[prKey];
    if(!ex||weight>ex.weight){
      if(!state.prs)state.prs={};
      state.prs[prKey]={weight:parseFloat(weight),date,dayKey:key,participant};
      return true;
    }
    return false;
  }

  function getDaysWorkedThisMonth(){
    const p=getMonthKey(),s=new Set();
    Object.keys(state.workouts||{}).forEach(d=>{ if(d.startsWith(p)&&getCalendarWorkedMeta(d).worked)s.add(d); });
    return s.size;
  }
  function getTotalExDoneThisMonth(){
    const p=getMonthKey(); let t=0;
    Object.keys(state.workouts||{}).forEach(d=>{
      if(!d.startsWith(p))return;
      Object.keys(state.workouts[d] || {}).forEach(dayKey=>{
        const day = state.workouts[d][dayKey];
        Object.keys(day?.exercises || {}).forEach(exKey=>{
          const owner = String(exKey || "").includes("_") ? String(exKey).split("_")[0] : activeProfile;
          if(owner===activeProfile && day.exercises?.[exKey]?.checked) t++;
        });
      });
    });
    return t;
  }
  function calcStreak(){
    let s=0,d=new Date(getTodayStr()+"T12:00:00");
    while(true){ const ds=d.toISOString().split("T")[0]; if(state.workouts?.[ds]&&Object.values(state.workouts[ds]).some(x=>x.done)){s++;d.setDate(d.getDate()-1);}else break; }
    return s;
  }

  function calcConsistencyScore(){
    const today = new Date(getTodayStr() + "T12:00:00");
    let planned = 0, completed = 0;

    // Check last 28 days
    for (let i = 0; i < 28; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];

      // Skip future dates
      if (dateStr > getTodayStr()) continue;

      // Get weekday (0 = Sunday, 1 = Monday, etc.)
      const weekday = checkDate.getDay();
      // Convert to 1-7 (Sunday = 7, Monday = 1, etc.) to match WORKOUT_PLAN
      const planWeekday = weekday === 0 ? 7 : weekday;

      // Find planned workouts for this weekday
        const plannedKeys = Object.keys(WORKOUT_PLAN).filter(key =>
          getWorkoutWeekdaySortValue(WORKOUT_PLAN[key]) === getWorkoutWeekdaySortValue({weekday:planWeekday===7?0:planWeekday}) &&
          WORKOUT_PLAN[key].participants.includes(activeProfile)
        );

      if (plannedKeys.length > 0) {
        planned += plannedKeys.length;
        // Check if any of these planned workouts were completed
        const dayWorkouts = state.workouts?.[dateStr];
        if (dayWorkouts) {
          plannedKeys.forEach(key => {
            if (dayWorkouts[key]?.done) completed++;
          });
        }
      }
    }

    // Return score as 0-100
    return planned > 0 ? Math.round((completed / planned) * 100) : 0;
  }
  function getWeeklyFreq(){
    const w=["Wk 1","Wk 2","Wk 3","Wk 4"],c=[0,0,0,0],colors=[PROFILES[activeProfile]?.color||"#e85d04",PROFILES[activeProfile]?.color||"#e85d04",PROFILES[activeProfile]?.color||"#e85d04",PROFILES[activeProfile]?.color||"#e85d04"],p=getMonthKey();
    const weeklyDayCounts = [{},{},{},{}];
    Object.keys(state.workouts||{}).forEach(d=>{
      if(!String(d).startsWith(p)) return;
      Object.keys(state.workouts[d] || {}).forEach(key=>{
        if(!sessionHasActivityForParticipant(state.workouts[d][key], key, activeProfile)) return;
        const i=Math.min(Math.floor((new Date(d+"T12:00:00").getDate()-1)/7),3);
        c[i]++;
        weeklyDayCounts[i][key]=(weeklyDayCounts[i][key]||0)+1;
      });
    });
    weeklyDayCounts.forEach((bucket, index)=>{
      const topKey = Object.keys(bucket).sort((a,b)=>bucket[b]-bucket[a])[0];
      if(topKey && WORKOUT_PLAN[topKey]?.color) colors[index] = WORKOUT_PLAN[topKey].color;
    });
    return {w,c,colors};
  }
  function getDayTypeBreakdown(){
    const p=getMonthKey(),b={}; Object.keys(WORKOUT_PLAN).forEach(k=>b[k]=0);
    Object.keys(state.workouts||{}).forEach(d=>{ if(!d.startsWith(p))return; Object.keys(state.workouts[d]).forEach(k=>{ if(sessionHasActivityForParticipant(state.workouts[d][k], k, activeProfile))b[k]=(b[k]||0)+1; }); });
    return b;
  }
  function getMonthTonnage(){
    const p=getMonthKey(),r=[];
    Object.keys(state.workouts||{}).sort().forEach(d=>{ if(!d.startsWith(p))return; Object.keys(state.workouts[d]).forEach(k=>{ if(sessionHasLoggedActivity(state.workouts[d][k]) || state.workouts[d][k]?.done){ const t=calcSessionTonnage(d,k); if(t>0)r.push({date:d,dayKey:k,tonnage:t,label:d.slice(5)}); }}); });
    return r;
  }
  function getBwHistory(){
    const p=getMonthKey(),r=[];
    Object.keys(state.bodyweight||{}).sort().forEach(d=>{ if(d.startsWith(p))r.push({date:d,weight:state.bodyweight[d],label:d.slice(5)}); });
    return r;
  }
  function getSleepHistory(){
    const p=getMonthKey(),r=[];
    const healthBucket = getHealthBucket(activeProfile);
    Object.keys(healthBucket||{}).sort().forEach(d=>{ if(d.startsWith(p))r.push({date:d,sleep:healthBucket[d]?.sleep||0,label:d.slice(5)}); });
    return r;
  }
  function getMuscleGroup(exerciseName){
    const name = String(exerciseName || "").toLowerCase();
    const override = state.exerciseMeta?.[normalizeExerciseName(exerciseName)]?.muscleGroup;
    if(override) return override;
    const hasWord=(w)=>new RegExp(`\\b${w}\\b`).test(name);
    const hasAny=(arr)=>arr.some(w=>name.includes(w));
    // Use specific phrase checks first to avoid ambiguous matches (e.g. "calf raise" as shoulders).
    if(hasAny(['calf','squat','leg press','lunge','lunges','hip thrust','abductor','adductor','hamstring','quad','glute','romanian deadlift','rdl','leg curl','leg curls','leg extension','leg extensions'])) return 'legs';
    // Context guard: if "leg" appears with "curl"/"extension"/"raise", force legs
    if(hasWord('leg') && (hasAny(['curl','curls','extension','extensions','raise','raises']))) return 'legs';
    if(hasAny(['lateral raise','front raise','rear delt','shoulder','overhead press','military press','arnold press','upright row'])) return 'shoulders';
    if(hasAny(['tricep','bicep','pushdown','skull crusher','hammer'])) return 'arms';
    // Generic curl/extension should map to arms unless leg context already matched above
    if(hasAny(['curl','curls','extension','extensions'])) return 'arms';
    if(hasAny(['lat','pulldown','row','deadlift','pull-up','chin-up','face pull','shrug','back extension'])) return 'back';
    if(hasAny(['bench','chest','pec','fly','dip','push-up','press'])) return 'chest';
    if(hasAny(['crunch','plank','abs','core','hanging leg','leg raise','ab wheel','russian twist','mountain climber','flutter kick','bird dog','dead bug'])) return 'core';
    return 'other';
  }
  function getPersonalRecords(){
    const byExercise = new Map();
    Object.keys(state.prs||{}).forEach(key => {
      const pr = state.prs[key];
      const participant = pr.participant || (typeof key==="string" && key.includes("_") ? key.split("_")[0] : activeProfile);
      if(participant !== activeProfile) return;
      let exerciseName = stripParticipantPrefix(stripParticipantPrefix(String(key||""))).trim();
      if(!exerciseName) return;
      const weight = parseFloat(pr.weight || 0);
      const date = pr.date || "1970-01-01";
      const normalized = exerciseName.toLowerCase();
      const existing = byExercise.get(normalized);
      const shouldReplace = !existing || weight > existing.weight || (weight === existing.weight && date > existing.date);
      if(shouldReplace){
        const muscleGroup = getMuscleGroup(exerciseName);
        const daysHeld = Math.floor((new Date(getTodayStr()) - new Date(date)) / (1000 * 60 * 60 * 24));
        byExercise.set(normalized,{
          exercise: exerciseName,
          weight,
          date,
          daysHeld,
          muscleGroup,
          key
        });
      }
    });
    Object.keys(state.workouts||{}).forEach(date=>{
      Object.keys(state.workouts[date]||{}).forEach(dayKey=>{
        const wo=state.workouts[date]?.[dayKey];
        if(!wo) return;
        Object.keys(wo.exercises||{}).forEach(exKey=>{
          const raw=wo.exercises[exKey]||{};
          const participant = raw.participant || (String(exKey).includes("_") ? String(exKey).split("_")[0] : activeProfile);
          if(participant !== activeProfile || !raw.checked) return;
          const weight=parseFloat(raw.weight||0);
          if(weight<=0) return;
          const exerciseName=stripParticipantPrefix(stripParticipantPrefix(String(exKey||""))).trim();
          if(!exerciseName) return;
          const normalized=exerciseName.toLowerCase();
          const existing=byExercise.get(normalized);
          const shouldReplace=!existing || weight > existing.weight || (weight===existing.weight && date > existing.date);
          if(shouldReplace){
            byExercise.set(normalized,{
              exercise: exerciseName,
              weight,
              date,
              daysHeld: Math.floor((new Date(`${getTodayStr()}T12:00:00`) - new Date(`${date}T12:00:00`)) / (1000 * 60 * 60 * 24)),
              muscleGroup: getMuscleGroup(exerciseName),
              key: exKey
            });
          }
        });
      });
    });
    return Array.from(byExercise.values()).sort((a,b) => b.weight - a.weight);
  }
  function isSkipped(ds){
    const t=getTodayStr(); if(ds>=t)return false;
    const dow=new Date(ds+"T12:00:00").getDay();
    const k=Object.keys(WORKOUT_PLAN).find(k=>WORKOUT_PLAN[k].weekday===dow);
    return k?!state.workouts?.[ds]?.[k]?.done:false;
  }
  function isBirthday(ds){
    const p=PROFILES[activeProfile]; return p.birthday&&ds.slice(5)===p.birthday;
  }
  function getPrevSessionDates(key,excl){
    return Object.keys(state.workouts||{}).filter(d=>d<excl&&state.workouts[d]?.[key]?.done).sort().slice(-2);
  }
  function getLastWeight(key,exName,participant="revan"){
    const prev=getPrevSessionDates(key,activeDate);
    for(let i=prev.length-1;i>=0;i--){
      const exs=state.workouts[prev[i]]?.[key]?.exercises;
      if(!exs) continue;
      const {data:e}=getExData(exs,participant,exName);
      const w=e?.weight; if(w)return{weight:parseFloat(w),date:prev[i]};
    }
    return null;
  }
  function getWarmupSuggestion(weight){
    const w=parseFloat(weight||0);
    if(!w||w<=0) return "";
    const round=v=>Math.max(5,Math.round(v/2.5)*2.5);
    const a=round(w*0.4), b=round(w*0.6), c=round(w*0.8);
    return `${a}x8 · ${b}x5 · ${c}x3`;
  }
  function getOverloadSuggestion(key,ex,participant="revan"){
    if(ex.sets===0)return null;
    const tr=parseInt(ex.reps)||0; if(!tr)return null;
    const prev=getPrevSessionDates(key,activeDate); if(prev.length<2)return null;
    const sessions=prev.slice(-2).map(d=>{ const exs=state.workouts[d]?.[key]?.exercises; if(!exs) return null; const {data:e}=getExData(exs,participant,ex.name); if(!e||!e.checked)return null; return{reps:parseInt(e.actualReps||ex.reps)||0,weight:parseFloat(e.weight||0)}; });
    if(!sessions[0]||!sessions[1])return null;
    const sw=sessions[0].weight>0&&sessions[0].weight===sessions[1].weight;
    const bh=sessions[0].reps>=tr&&sessions[1].reps>=tr;
    if(sw&&bh)return{currentWeight:sessions[1].weight,suggestedWeight:Math.ceil((sessions[1].weight*1.05)/2.5)*2.5};
    return null;
  }
  function getExerciseSessions(key, exName, participant="revan", limit=4){
    const rows=[];
    Object.keys(state.workouts||{}).sort().forEach(d=>{
      const wo=state.workouts?.[d]?.[key];
      if(!wo?.done) return;
      const {data:e}=getExData(wo.exercises||{},participant,exName);
      if(!e?.checked) return;
      const w=parseFloat(e.weight||0);
      const r=parseInt(e.actualReps||0,10)||0;
      if(w<=0 || r<=0) return;
      rows.push({date:d,weight:w,reps:r});
    });
    return rows.slice(-limit);
  }
  function getProgressInsight(key,ex,participant="revan"){
    if(!ex || ex.sets===0) return null;
    const target=parseInt(ex.reps||0,10)||0;
    if(!target) return null;
    const s=getExerciseSessions(key,ex.name,participant,4);
    if(s.length<2) return null;
    const last=s[s.length-1];
    const prev=s[s.length-2];
    if(last.weight===prev.weight && last.reps>=target && prev.reps>=target){
      return {kind:"next", suggestedWeight:Math.ceil((last.weight*1.025)/2.5)*2.5, note:"Ready to progress"};
    }
    if(last.reps>=target+2 && last.weight>0){
      return {kind:"next", suggestedWeight:Math.ceil((last.weight*1.025)/2.5)*2.5, note:"Strong rep buffer"};
    }
    if(s.length>=3){
      const t=s.slice(-3);
      const sameWeight=t.every(x=>x.weight===t[0].weight);
      const noRepGain=t[2].reps<=t[1].reps && t[1].reps<=t[0].reps;
      const belowTarget=t.every(x=>x.reps<target);
      if(sameWeight && noRepGain && belowTarget){
        return {kind:"plateau", note:"Plateau detected"};
      }
    }
    return null;
  }
  function getOverdueLiftNudges(){
    const nudges=[];
    const today=getTodayStr();
    sortedDayKeys().forEach(key=>{
      const day=WORKOUT_PLAN[key];
      (day?.exercises||[]).forEach(ex=>{
        const sessions=getExerciseSessions(key,ex.name,activeProfile,6);
        if(sessions.length<3) return;
        let improvedAt=sessions[0].date;
        let best=sessions[0].weight;
        sessions.forEach(s=>{ if(s.weight>best){ best=s.weight; improvedAt=s.date; } });
        const days=Math.floor((new Date(`${today}T12:00:00`)-new Date(`${improvedAt}T12:00:00`))/(1000*60*60*24));
        if(days>=21){
          nudges.push({id:`overdue_${key}_${normalizeExerciseName(ex.name)}`, title:`Overdue to progress ${ex.name}`, detail:`No load increase in ${days} days. Add a progression set this week.`});
        }
      });
    });
    return nudges.slice(0,3);
  }
  function shouldSuggestDeload(){
    const today=new Date(`${getTodayStr()}T12:00:00`);
    const recent=[];
    for(let i=0;i<4;i++){
      const d=new Date(today); d.setDate(today.getDate()-i);
      const ds=d.toISOString().split("T")[0];
      const h=ensureHealthEntry(ds, activeProfile);
      if(h) recent.push(h);
    }
    if(recent.length<2) return false;
    const avgSleep=recent.reduce((a,b)=>a+Number(b.sleep||0),0)/recent.length;
    const avgSoreness=recent.reduce((a,b)=>a+Number(b.soreness||0),0)/recent.length;
    let missed=0;
    for(let i=1;i<=7;i++){
      const d=new Date(today); d.setDate(today.getDate()-i);
      if(isSkipped(d.toISOString().split("T")[0])) missed++;
    }
    return (avgSleep<6.2 && avgSoreness>=7) || missed>=3;
  }

  // ─── EXERCISE HISTORY ───
  function getExerciseHistory(exerciseName, participant = activeProfile) {
    const history = [];
    Object.keys(state.workouts || {}).sort().forEach(date => {
      Object.keys(state.workouts[date]).forEach(dayKey => {
        const workout = state.workouts[date][dayKey];
        if (!workout.done) return;

        const exercises = workout.exercises || {};
        const { data: exerciseData } = getExData(exercises, participant, exerciseName);

        if (exerciseData && exerciseData.checked && exerciseData.weight) {
          const weight = parseFloat(exerciseData.weight);
          if (weight > 0) {
            history.push({
              date: date,
              weight: weight,
              reps: exerciseData.actualReps || exerciseData.reps,
              dayKey: dayKey
            });
          }
        }
      });
    });
    return history.sort((a, b) => a.date.localeCompare(b.date));
  }

  let exerciseHistoryChart = null;

  window.showExerciseHistory = function(exerciseName) {
    const history = getExerciseHistory(exerciseName);
    if (history.length === 0) {
      toast("⚠️ No history found for this exercise");
      return;
    }

    // Prepare chart data
    const labels = history.map(h => {
      const date = new Date(h.date + "T12:00:00");
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const weights = history.map(h => h.weight);
    const colors = history.map(h => WORKOUT_PLAN[h.dayKey]?.color || '#888');

    // Show modal
    document.getElementById("exercise-history-title").textContent = exerciseName;
    document.getElementById("exercise-history-modal").style.display = "flex";

    // Create or update chart
    const ctx = document.getElementById("exercise-history-chart");
    if (exerciseHistoryChart) {
      exerciseHistoryChart.destroy();
    }

    exerciseHistoryChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Weight (kg)",
          data: weights,
          borderColor: "#e85d04",
          backgroundColor: "rgba(232, 93, 4, 0.07)",
          borderWidth: 2.5,
          pointBackgroundColor: colors,
          pointBorderColor: colors,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: {
              color: "#888",
              font: { family: "Barlow Condensed", size: 11 }
            },
            grid: { color: "rgba(255,255,255,0.04)" }
          },
          y: {
            ticks: {
              color: "#888",
              font: { family: "Barlow Condensed" }
            },
            grid: { color: "rgba(255,255,255,0.04)" },
            beginAtZero: false
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  };

  window.closeExerciseHistory = function() {
    document.getElementById("exercise-history-modal").style.display = "none";
    if (exerciseHistoryChart) {
      exerciseHistoryChart.destroy();
      exerciseHistoryChart = null;
    }
  };

  // ─── HEATMAP ───
  function renderHeatmap(){
    const el=document.getElementById("heatmap"); if(!el)return;
    const today=new Date(getTodayStr()+"T12:00:00");
    const fmt=d=>d.toISOString().split("T")[0];
    const startFixed=new Date("2026-03-01T12:00:00");
    let start;
    if(heatmapFilter==='week'){start=new Date(today);start.setDate(today.getDate()-today.getDay());}
    else if(heatmapFilter==='month'){start=new Date(today.getFullYear(),today.getMonth(),1,12);}
    else start=startFixed;
    let maxT=0;
    Object.keys(state.workouts||{}).forEach(ds=>{ let t=0; Object.keys(state.workouts[ds]).forEach(k=>t+=calcSessionTonnage(ds,k)); if(t>maxT)maxT=t; });
    const weeks=[]; let cur=new Date(start); cur.setDate(cur.getDate()-cur.getDay());
    while(cur<=today){ const wk=[]; for(let d=0;d<7;d++){wk.push(fmt(cur));cur.setDate(cur.getDate()+1);} weeks.push(wk); }
    const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let mHtml=`<div class="hm-month-row" style="grid-template-columns:repeat(${weeks.length},14px)">`;
    let lm=-1;
    weeks.forEach((wk,wi)=>{ const d=new Date(wk[0]+"T12:00:00"),m=d.getMonth(); if(m!==lm){mHtml+=`<span class="hm-ml" style="grid-column:${wi+1}">${mn[m]}</span>`;lm=m;}else mHtml+=`<span></span>`; });
    mHtml+=`</div>`;
    let gHtml=`<div class="hm-grid" style="grid-template-columns:repeat(${weeks.length},14px)">`;
    weeks.forEach(wk=>{ wk.forEach(ds=>{
      const wd=state.workouts?.[ds]; let ton=0,dc=null;
      if(wd){Object.keys(wd).forEach(k=>{if(wd[k].done){ton+=calcSessionTonnage(ds,k);if(!dc)dc=WORKOUT_PLAN[k]?.color;}});}
      const isFut=ds>fmt(today),isT=ds===fmt(today);
      const inten=maxT>0&&ton>0?ton/maxT:0;
      let bg="var(--hm-empty)";
      if(!isFut&&ton>0&&dc){const r=parseInt(dc.slice(1,3),16),g=parseInt(dc.slice(3,5),16),b=parseInt(dc.slice(5,7),16);bg=`rgba(${r},${g},${b},${0.2+inten*0.8})`;}
      else if(!isFut&&isSkipped(ds)){bg="rgba(80,20,20,0.45)";}
      gHtml+=`<div class="hm-cell" style="background:${bg};${isT?"border:1px solid var(--accent)":""}" title="${ds}${ton>0?' — '+ton+'kg':''}" onclick="selectDate('${ds}')"></div>`;
    }); });
    gHtml+=`</div>`;
    el.innerHTML=`
      <div class="hm-filters">
        <button class="hm-fb ${heatmapFilter==='week'?'active':''}" onclick="setHeatmapFilter('week')">WEEK</button>
        <button class="hm-fb ${heatmapFilter==='month'?'active':''}" onclick="setHeatmapFilter('month')">MONTH</button>
        <button class="hm-fb ${heatmapFilter==='year'?'active':''}" onclick="setHeatmapFilter('year')">YEAR</button>
      </div>
      <div class="hm-wrap">
        <div class="hm-dl"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div class="hm-right">${mHtml}${gHtml}</div>
      </div>
      <div class="hm-legend">
        <span class="hm-ll">LESS</span>
        <span class="hm-lc" style="background:var(--hm-empty)"></span>
        <span class="hm-lc" style="background:rgba(232,93,4,0.25)"></span>
        <span class="hm-lc" style="background:rgba(232,93,4,0.55)"></span>
        <span class="hm-lc" style="background:rgba(232,93,4,0.90)"></span>
        <span class="hm-ll">MORE</span>
      </div>`;
  }
  window.setHeatmapFilter=function(f){heatmapFilter=f;renderHeatmap();};

  // ─── RENDER ALL ───
  function renderAll(){
    renderCalendar(); renderHistorySelectedSession(activeDate); renderHistoryMonthSummary(activeDate); renderStats(); renderCharts(); renderWeeklySummary(); renderHeatmap(); renderHealthChecklist(); renderPersonalRecordsWall(); render1RMCalculator(); renderMonthComparison(); renderExerciseOptions(); updateLogoColor(); renderQuickActions(); renderNotifications(); renderDashboardShell(); renderProfileShell(); renderVisualProgressGallery();
    if(activeDay)renderDayPanel(activeDay);
    sortedDayKeys().forEach(key=>{
      const w=state.workouts?.[activeDate]?.[key]; if(!w)return;
      const day=WORKOUT_PLAN[key]; if(!day)return;
      const parts=day.participants||['revan'];
      let done=0,total=day.exercises.length*parts.length;
      parts.forEach(p=>{ day.exercises.forEach(ex=>{ const {data:_e}=getExData(w.exercises,p,ex.name); if(_e?.checked)done++; }); });
      const b=document.querySelector(`#card-${key} .card-bar-fill`);
      if(b)b.style.width=(total>0?Math.round(done/total*100):0)+"%";
    });
  }

  function getCompletedSessions(limit=6){
    const items = [];
    Object.keys(state.workouts || {}).forEach(ds=>{
      Object.keys(state.workouts[ds] || {}).forEach(key=>{
        const wo = state.workouts[ds][key];
        const day = WORKOUT_PLAN[key];
        if(!wo?.done || !day) return;
        items.push({
          date: ds,
          key,
          wo,
          day,
          tonnage: calcSessionTonnage(ds, key)
        });
      });
    });
    items.sort((a,b)=>{
      if(a.date === b.date) return (b.wo?.updatedAt || "").localeCompare(a.wo?.updatedAt || "");
      return b.date.localeCompare(a.date);
    });
    return items.slice(0, limit);
  }

  function sessionHasLoggedActivity(wo){
    if(!wo) return false;
    if(wo.done) return true;
    return Object.values(wo.exercises || {}).some(entry=>{
      if(!entry) return false;
      if(entry.checked) return true;
      if(parseFloat(entry.weight || 0) > 0) return true;
      if(parseFloat(entry.actualReps || 0) > 0) return true;
      if(Array.isArray(entry.coverSets) && entry.coverSets.length) return true;
      return false;
    });
  }
  function sessionHasActivityForParticipant(wo, dayKey, participant=activeProfile){
    if(!wo) return false;
    const day = WORKOUT_PLAN?.[dayKey];
    const scopedParticipants = wo.sessionParticipants || day?.participants || [];
    if(wo.done && scopedParticipants.includes(participant)) return true;
    return Object.keys(wo.exercises || {}).some(exKey=>{
      const clean = String(exKey || "");
      const owner = clean.includes("_") ? clean.split("_")[0] : participant;
      if(owner !== participant) return false;
      const entry = wo.exercises?.[exKey];
      if(!entry) return false;
      if(entry.checked) return true;
      if(parseFloat(entry.weight || 0) > 0) return true;
      if(parseFloat(entry.actualReps || 0) > 0) return true;
      if(Array.isArray(entry.coverSets) && entry.coverSets.length) return true;
      return false;
    });
  }

  function getRecentDashboardSessions(limit=3){
    const items = [];
    getVisibleWorkedDates().forEach(ds=>{
      getCalendarDayEntries(ds).forEach(entry=>{
        items.push({
          date: ds,
          key: entry.key,
          wo: entry.wo,
          day: entry.day,
          tonnage: entry.tonnage,
          checkedCount: entry.exercises,
          duration: entry.durationMins,
          exerciseLines: entry.exerciseLines
        });
      });
    });
    return items.slice(0, limit);
  }
  function getVisibleActivityFallback(limit=3){
    return getVisibleWorkedDates(limit).map(ds=>{
      const ownDay = state.workouts?.[ds] ? Object.keys(state.workouts[ds])[0] : "";
      const title = ownDay && WORKOUT_PLAN[ownDay]?.title ? WORKOUT_PLAN[ownDay].title : "Workout Logged";
      return { date: ds, title };
    });
  }

  function getCurrentStreakDays(){
    const completedDates = new Set(getVisibleWorkedDates());
    const today = new Date(getTodayStr()+"T12:00:00");
    let cursor = new Date(today);
    if(!completedDates.has(cursor.toISOString().split("T")[0])){
      cursor.setDate(cursor.getDate()-1);
    }
    let streak = 0;
    while(true){
      const ds = cursor.toISOString().split("T")[0];
      if(!completedDates.has(ds)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
  function getVisibleWorkedDates(limit=0){
    const dates = new Set();
    Object.keys(state.workouts||{}).forEach(ds=>{
      if(getCalendarWorkedMeta(ds).worked) dates.add(ds);
    });
    if(activeProfile==="revan" && state.allUserWorkouts){
      Object.keys(state.allUserWorkouts).forEach(pk=>{
        const workouts=state.allUserWorkouts[pk]?.workouts||{};
        Object.keys(workouts).forEach(ds=>{
          const hasVisible = Object.values(workouts[ds]||{}).some(wo=>wo?.done || sessionHasLoggedActivity(wo));
          if(hasVisible) dates.add(ds);
        });
      });
    }
    const sorted = Array.from(dates).sort((a,b)=>b.localeCompare(a));
    return limit>0 ? sorted.slice(0,limit) : sorted;
  }
  function getCalendarWorkedMeta(ds){
    const wd = state.workouts?.[ds];
    let worked = false;
    let workoutColor = null;
    Object.keys(wd || {}).forEach(key=>{
      if(worked) return;
      if(sessionHasActivityForParticipant(wd[key], key, activeProfile)){
        worked = true;
        workoutColor = WORKOUT_PLAN[key]?.color || PROFILES[activeProfile]?.color || null;
      }
    });
    return { worked, otherUserColor: workoutColor, sourceUser: activeProfile };
  }

  window.openWorkoutFromHistory=function(ds,key){
    activeDate = ds;
    activeDay = key;
    panelCollapsed = false;
    hideCoverPlayer();
    renderCalendar();
    renderDayGrid();
    renderDayPanel(key);
    setMobileSection("workouts");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  function renderDashboardShell(){
    const greetingEl = document.getElementById("dashboard-greeting");
    const subEl = document.getElementById("dashboard-subtitle");
    const consistencyEl = document.getElementById("dashboard-consistency");
    const activityEl = document.getElementById("dashboard-activity-list");
    const progressActivityEl = document.getElementById("progress-activity-list");
    const streakEl = document.getElementById("progress-streak");
    const profileUserEl = document.getElementById("profile-active-user");
    const profileWaterEl = document.getElementById("profile-water-target");
    const profileProteinEl = document.getElementById("profile-protein-target");
    const profileHeightEl = document.getElementById("profile-height-target");
    const profile = accountRegistry[activeProfile]?.name || PROFILES[activeProfile]?.label || activeProfile;
    if(greetingEl) greetingEl.innerHTML = `READY TO <span class="accent-word">CRUSH</span> IT?`;
    if(subEl) subEl.textContent = activeDay && WORKOUT_PLAN[activeDay]
      ? `${WORKOUT_PLAN[activeDay].title} is live`
      : `${String(profile).toUpperCase()} IS LOCKED IN`;
    if(streakEl) streakEl.textContent = `${getCurrentStreakDays()} DAYS`;
    if(profileUserEl) profileUserEl.textContent = String(profile).toUpperCase();
    if(profileWaterEl) profileWaterEl.textContent = String(PROFILES[activeProfile]?.water || 0);
    if(profileProteinEl) profileProteinEl.textContent = String(PROFILES[activeProfile]?.protein || 0);
    if(profileHeightEl) profileHeightEl.textContent = String(PROFILES[activeProfile]?.height || 0);

    if(consistencyEl){
      const today = new Date(getTodayStr()+"T12:00:00");
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const days = [];
      for(let i=0;i<7;i++){
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const ds = d.toISOString().split("T")[0];
        const entries = getCalendarDayEntries(ds);
        days.push({label:labels[i], worked:entries.length>0, count:entries.length, isToday:ds===getTodayStr(), date:ds});
      }
      const pct = Math.round((days.filter(x=>x.worked).length / days.length) * 100);
      consistencyEl.innerHTML = `
        <div class="dashboard-card-head dashboard-card-head-tight">
          <h3>WEEKLY TRACKER</h3>
          <span>${pct}%</span>
        </div>
        <div class="consistency-bars stitch-consistency-bars">
          ${days.map(day=>`
            <button class="consistency-pill ${day.worked ? "done" : ""} ${day.isToday ? "today" : ""}" onclick="navTo('progress');selectDate('${day.date}')">
              <strong>${day.label}</strong>
              <em>${day.count || 0}</em>
            </button>
          `).join("")}
        </div>
      `;
    }

    const activityMarkup = ()=>{
      const sessions = getRecentDashboardSessions(3);
      if(!sessions.length){
        const fallbackDays = getVisibleActivityFallback(3);
        if(fallbackDays.length){
          return fallbackDays.map(item=>`
            <button class="activity-card" onclick="setMobileSection('progress');selectDate('${item.date}')">
              <span class="activity-icon material-symbols-outlined">fitness_center</span>
              <span class="activity-copy">
                <span class="activity-title">${item.title}</span>
                <span class="activity-meta">${new Date(item.date+"T12:00:00").toLocaleDateString("en-ZA",{weekday:"short", day:"numeric", month:"short"})}</span>
              </span>
              <span class="activity-tag">View</span>
            </button>
          `).join("");
        }
        return `<div class="activity-empty">No workouts logged yet. Start a session and your last 3 workouts will show here.</div>`;
      }
      return sessions.map(item=>{
        const icon = item.day.title?.includes("CARDIO") ? "sprint" : "fitness_center";
        const metaDate = new Date(item.date+"T12:00:00");
        const daysAgo = Math.max(0, Math.floor((new Date(getTodayStr()+"T12:00:00") - metaDate)/(1000*60*60*24)));
        const when = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
        const meta = `${when}${item.duration>0 ? ` • ${item.duration} mins` : ""}${item.tonnage>0 ? ` • ${item.tonnage.toLocaleString()} kg moved` : ""}`;
        const sessionMeta = item.exerciseLines?.[0]?.meta || (item.wo?.sessionMeta?.rpe ? `RPE ${item.wo.sessionMeta.rpe}` : item.checkedCount > 0 ? `+${item.checkedCount} logged` : `${(item.day.exercises || []).length} exercises`);
        return `
          <button class="activity-card" onclick="openWorkoutFromHistory('${item.date}','${item.key}')">
            <span class="activity-icon material-symbols-outlined">${icon}</span>
            <span class="activity-copy">
              <span class="activity-title">${item.day.title}</span>
              <span class="activity-meta">${meta}</span>
            </span>
            <span class="activity-tag">${sessionMeta}</span>
          </button>
        `;
      }).join("");
    };
    if(activityEl){
      activityEl.innerHTML = activityMarkup();
    }
    if(progressActivityEl){
      progressActivityEl.innerHTML = activityMarkup();
    }
  }

  function renderStats(){
    const daysWorked = getDaysWorkedThisMonth();
    const exercisesDone = getTotalExDoneThisMonth();
    const consistency = calcConsistencyScore();
    const daysEl = document.getElementById("stat-days");
    const exEl = document.getElementById("stat-ex");
    const consistencyEl = document.getElementById("stat-consistency");
    if(daysEl) daysEl.textContent = daysWorked;
    if(exEl) exEl.textContent = exercisesDone;
    if(consistencyEl) consistencyEl.textContent = consistency;
    let t=0; const p=getMonthKey();
    Object.keys(state.workouts||{}).forEach(d=>{ if(!d.startsWith(p))return; Object.keys(state.workouts[d]).forEach(k=>t+=calcSessionTonnage(d,k)); });
    const el=document.getElementById("stat-tonnage");
    if(el)el.textContent=t>=1000?(t/1000).toFixed(1)+"t":t+"kg";
    const workoutsMonth = document.getElementById("dashboard-workouts");
    const progressFrequency = document.getElementById("progress-frequency");
    const progressPrs = document.getElementById("progress-pr-count");
    const progressVolumeLabel = document.getElementById("progress-volume-label");
    if(workoutsMonth) workoutsMonth.textContent = String(daysWorked).padStart(2,"0");
    if(progressFrequency) progressFrequency.textContent = getWeeklyFreq().c.reduce((sum,n)=>sum+n,0) ? (getWeeklyFreq().c.reduce((sum,n)=>sum+n,0)/Math.max(getWeeklyFreq().c.length,1)).toFixed(1) : "0.0";
    if(progressPrs) progressPrs.textContent = getPersonalRecords().length;
    if(progressVolumeLabel) progressVolumeLabel.textContent = t>=1000 ? `${(t/1000).toFixed(1)} TONS TOTAL` : `${t} KG TOTAL`;
  }

  function renderCalendar(){
    const cal=document.getElementById("calendar");
    if(!cal) return;
    const now=new Date(`${activeDate}T12:00:00`),yr=now.getFullYear(),mo=now.getMonth();
    const first=new Date(yr,mo,1,12);
    const firstOffset=(first.getDay()+6)%7;
    const gridStart=new Date(first);
    gridStart.setDate(first.getDate()-firstOffset);
    document.getElementById("month-label").textContent=formatHistoryMonthLabel(activeDate);
    let h=`<div class="cal-grid">`;
    ["MON","TUE","WED","THU","FRI","SAT","SUN"].forEach(d=>h+=`<div class="cal-hc">${d}</div>`);
    const today=getTodayStr();
    for(let i=0;i<42;i++){
      const cellDate=new Date(gridStart);
      cellDate.setDate(gridStart.getDate()+i);
      const ds=cellDate.toISOString().split("T")[0];
      const isT=ds===today,isA=ds===activeDate,isFut=ds>today;
      const visible = getCalendarWorkedMeta(ds);
      const worked = visible.worked;
      const otherUserColor = visible.otherUserColor;
      const dc=otherUserColor;
      const bday=isBirthday(ds);
      const outMonth=cellDate.getMonth()!==mo;
      h+=`<div class="cal-cell ${outMonth?'empty':''} ${isT?'today':''} ${isA?'active':''} ${worked?'worked':''} ${isFut?'future':''} ${bday?'bday':''}" onclick="${isFut?'':'selectDate(\''+ds+'\')'}">
        <span class="cal-n">${cellDate.getDate()}</span>
        ${dc?`<span class="cal-dot" style="background:${dc}"></span>`:''}
        ${bday?`<span class="cal-bd">🎂</span>`:''}
      </div>`;
    }
    h+=`</div>`; cal.innerHTML=h;
  }

  function renderCharts(){
    if(!dashboardOpen)return;
    const ac=PROFILES[activeProfile].color;
    const {w,c,colors}=getWeeklyFreq();
    const gopt={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},ironlogValueLabels:{enabled:true}},scales:{x:{ticks:{color:"#888",font:{family:"Barlow Condensed",size:13}},grid:{color:"rgba(255,255,255,0.04)"}},y:{ticks:{color:"#888",font:{family:"Barlow Condensed"},stepSize:1},grid:{color:"rgba(255,255,255,0.04)"},beginAtZero:true}}};
    if(freqChart){freqChart.data.datasets[0].data=c;freqChart.data.datasets[0].backgroundColor=colors;freqChart.data.datasets[0].borderColor=colors;freqChart.update();}
    else freqChart=new Chart(document.getElementById("freqChart"),{type:"bar",data:{labels:w,datasets:[{label:"Workouts",data:c,backgroundColor:colors,borderColor:colors,borderWidth:2,borderRadius:6}]},options:gopt});
    const bd=getDayTypeBreakdown();
    const bData=sortedDayKeys().map(k=>bd[k]),bColors=sortedDayKeys().map(k=>WORKOUT_PLAN[k].color),bLab=sortedDayKeys().map(k=>WORKOUT_PLAN[k].title);
    if(volChart){volChart.data.datasets[0].data=bData;volChart.update();}
    else volChart=new Chart(document.getElementById("volChart"),{type:"doughnut",data:{labels:bLab,datasets:[{data:bData,backgroundColor:bColors,borderColor:"#111",borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:"#aaa",font:{family:"Barlow Condensed",size:12},padding:10,boxWidth:12}},ironlogValueLabels:{enabled:true}}}});
    const td=getMonthTonnage();
    const tL=td.map(x=>x.label),tV=td.map(x=>x.tonnage),tC=td.map(x=>WORKOUT_PLAN[x.dayKey]?.color||ac);
    if(tonnageChart){tonnageChart.data.labels=tL;tonnageChart.data.datasets[0].data=tV;tonnageChart.data.datasets[0].backgroundColor=tC;tonnageChart.update();}
    else tonnageChart=new Chart(document.getElementById("tonnageChart"),{type:"bar",data:{labels:tL,datasets:[{label:"Tonnage (kg)",data:tV,backgroundColor:tC,borderRadius:6}]},options:{...gopt,scales:{x:{ticks:{color:"#888",font:{family:"Barlow Condensed",size:11}},grid:{color:"rgba(255,255,255,0.04)"}},y:{ticks:{color:"#888",font:{family:"Barlow Condensed"}},grid:{color:"rgba(255,255,255,0.04)"},beginAtZero:true}}}});
    const bw=getBwHistory();
    if(bwChart){bwChart.data.labels=bw.map(x=>x.label);bwChart.data.datasets[0].data=bw.map(x=>x.weight);bwChart.update();}
    else bwChart=new Chart(document.getElementById("bwChart"),{type:"line",data:{labels:bw.map(x=>x.label),datasets:[{label:"kg",data:bw.map(x=>x.weight),borderColor:"#f0c040",backgroundColor:"rgba(240,192,64,0.07)",borderWidth:2.5,pointBackgroundColor:"#f0c040",pointRadius:4,pointHoverRadius:6,tension:0.4,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#888",font:{family:"Barlow Condensed",size:11}},grid:{color:"rgba(255,255,255,0.04)"}},y:{ticks:{color:"#888",font:{family:"Barlow Condensed"}},grid:{color:"rgba(255,255,255,0.04)"},beginAtZero:false}}}});
    const sleep=getSleepHistory();
    if(sleepChart){sleepChart.data.labels=sleep.map(x=>x.label);sleepChart.data.datasets[0].data=sleep.map(x=>x.sleep);sleepChart.update();}
    else sleepChart=new Chart(document.getElementById("sleepChart"),{type:"line",data:{labels:sleep.map(x=>x.label),datasets:[{label:"hours",data:sleep.map(x=>x.sleep),borderColor:"#7b2d8b",backgroundColor:"rgba(123,45,139,0.07)",borderWidth:2.5,pointBackgroundColor:"#7b2d8b",pointRadius:4,pointHoverRadius:6,tension:0.4,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#888",font:{family:"Barlow Condensed",size:11}},grid:{color:"rgba(255,255,255,0.04)"}},y:{ticks:{color:"#888",font:{family:"Barlow Condensed"}},grid:{color:"rgba(255,255,255,0.04)"},beginAtZero:true}}}});
    const mvm=getMonthVolumeByMuscleGroup();
    const mvLabels=['CHEST','BACK','SHOULDERS','ARMS','LEGS','CORE'],mvData=[mvm.chest,mvm.back,mvm.shoulders,mvm.arms,mvm.legs,mvm.core],mvColors=['#e85d04','#4361ee','#2ec4b6','#f72585','#7b2d8b','#f0c040'];
    if(window.muscleVolChart){window.muscleVolChart.data.datasets[0].data=mvData;window.muscleVolChart.update();}
    else {const mvCanvas=document.getElementById('muscleVolChart');if(mvCanvas)window.muscleVolChart=new Chart(mvCanvas,{type:'doughnut',data:{labels:mvLabels,datasets:[{data:mvData,backgroundColor:mvColors,borderColor:'#111',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#aaa',font:{family:'Barlow Condensed',size:11},padding:10,boxWidth:12}},ironlogValueLabels:{enabled:true}}}});}
  }

  function renderWeeklySummary(){
    const el=document.getElementById("weekly-summary"); if(!el)return;
    const today=new Date(getTodayStr()+"T12:00:00"),dow=today.getDay();
    const lf=new Date(today); lf.setDate(today.getDate()-(dow+2)%7);
    const lm=new Date(lf); lm.setDate(lf.getDate()-4);
    const fmt=d=>d.toISOString().split("T")[0];
    const monStr=fmt(lm),friStr=fmt(lf);
    let dc=0,tv=0,wt=[];
    const prsSet=new Set();
    for(let d=new Date(lm);d<=lf;d.setDate(d.getDate()+1)){
      const ds=fmt(d),wd=state.workouts?.[ds]; if(!wd)continue;
      Object.keys(wd).forEach(k=>{
        const s=wd[k];
        if(!s.done) return;
        dc++; wt.push(k); tv+=calcSessionTonnage(ds,k);
      });
      Object.keys(state.prs||{}).forEach(prKey=>{
        const pr=state.prs[prKey];
        if(!pr||pr.date!==ds) return;
        const participant=String(pr.participant || (String(prKey).includes("_") ? String(prKey).split("_")[0] : activeProfile)).toLowerCase();
        if(participant!==activeProfile) return;
        const clean=stripParticipantPrefix(stripParticipantPrefix(String(prKey||""))).trim();
        if(clean) prsSet.add(clean);
      });
    }
    const prs=Array.from(prsSet);
    if(dc===0){el.style.display="none";return;}
    el.style.display="block";
    const dots=wt.map(k=>`<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${WORKOUT_PLAN[k]?.color||'#888'};margin-right:3px"></span>${WORKOUT_PLAN[k]?.title||k}`).join(' ');
    el.innerHTML=`<div class="ws-inner">
      <div class="ws-head"><span class="ws-title">// WEEK RECAP</span><span class="ws-range">${monStr} → ${friStr}</span></div>
      <div class="ws-stats">
        <div class="ws-stat"><div class="ws-n" style="color:#5cba5c">${dc}/5</div><div class="ws-l">DAYS DONE</div></div>
        <div class="ws-stat"><div class="ws-n" style="color:#f0c040">${tv>=1000?(tv/1000).toFixed(1)+"t":tv+"kg"}</div><div class="ws-l">VOLUME</div></div>
        <div class="ws-stat"><div class="ws-n" style="color:#f72585">${prs.length}</div><div class="ws-l">NEW PRS</div></div>
      </div>
      ${prs.length>0?`<div class="ws-prs">🏆 ${prs.slice(0,4).join(' · ')}${prs.length>4?' +more':''}</div>`:''}
      <div class="ws-types">${dots}</div>
    </div>`;
  }

  // ─── HEALTH ───
  function getAdjustedWaterTarget(profile, date) {
    const p = PROFILES[profile];
    let target = p.water || 2.5; // Base target
    
    // Check today's workouts for intensity
    const wo = state.workouts?.[date] || {};
    let totalTonnage = 0, totalExercises = 0, hasCardio = false;
    
    Object.keys(wo).forEach(dayKey => {
      const session = wo[dayKey];
      if (!session.done) return;
      const day = WORKOUT_PLAN[dayKey];
      if (!day) return;
      
      // Check if cardio day
      if (day.title && day.title.toUpperCase().includes('CARDIO')) hasCardio = true;
      
      // Count exercises and tonnage
      day.exercises.forEach(ex => {
        totalExercises++;
        totalTonnage += calcSessionTonnage(date, dayKey);
      });
    });
    
    // Adjust target based on intensity
    if (hasCardio) target += 0.5; // Cardio days need more hydration
    if (totalTonnage > 500) target += Math.min(0.5, totalTonnage / 2000); // High volume days
    if (totalExercises > 15) target += 0.25; // High exercise count
    
    return Math.min(target, 5.0); // Cap at 5.0L
  }

  function renderHealthChecklist(){
    const el=document.getElementById("health-checklist"); if(!el)return;
    const today=getTodayStr(), p=PROFILES[activeProfile];
    const h=ensureHealthEntry(today);
    const adjustedWaterTarget = getAdjustedWaterTarget(activeProfile, today);
    const pt=p.protein||120;
    const calories=getHealthCalories(h);
    const meals=getMealsForDate(today);
    const soreness=Math.max(0,Math.min(10,Math.round(Number(h.soreness||0))));
    const wp=Math.min(100,Math.round((h.water/adjustedWaterTarget)*100)), pp=Math.min(100,Math.round((h.protein/pt)*100));
    const ac=PROFILES[activeProfile].color;
    const bw=parseFloat(getPBW(activeProfile,today)||0), h_m=(p.height||175)/100, bmi=bw>0?(bw/(h_m*h_m)).toFixed(1):0;
    const bmiColor=bmi<18.5?'#5cba5c':bmi<25?'#f0c040':bmi<30?'#f97316':'#ef4444';
    const bmiStatus=bmi<18.5?'UNDERWEIGHT':bmi<25?'NORMAL':bmi<30?'OVERWEIGHT':'OBESE';
    el.innerHTML=`<div class="hg">
      <div class="hi"><div class="hl">💧 WATER</div><div class="hc"><button class="ha" onclick="adjHealth('water',-0.25)">−</button><span class="hv">${h.water.toFixed(2)}L / ${adjustedWaterTarget.toFixed(1)}L</span><button class="ha" onclick="adjHealth('water',0.25)">+</button></div><div class="hbar"><div class="hbf" style="width:${wp}%;background:${ac}"></div></div></div>
      <div class="hi"><div class="hl">🧪 SUPPLEMENTS</div><div class="hc"><button class="htb ${h.creatine?'active':''}" style="${h.creatine?'border-color:'+ac+';color:'+ac:''}" onclick="togHealth('creatine')">CREATINE ${h.creatine?'✓ TAKEN':'NOT YET'}</button><button class="htb ${h.aminos?'active':''}" style="${h.aminos?'border-color:'+ac+';color:'+ac:''}" onclick="togHealth('aminos')">AMINOS ${h.aminos?'✓ TAKEN':'NOT YET'}</button></div></div>
      <div class="hi"><div class="hl">🥩 PROTEIN</div><div class="hc"><button class="ha" onclick="adjHealth('protein',-5)">−</button><span class="hv">${h.protein}g / ${pt}g</span><button class="ha" onclick="adjHealth('protein',5)">+</button></div><div class="hbar"><div class="hbf" style="width:${pp}%;background:${ac}"></div></div></div>
      <div class="hi"><div class="hl">🍽 MEALS</div><div class="hc"><span class="hv">${meals.length} logged · ${calories} kcal</span><button class="htb" onclick="logMealPrompt()">LOG MEAL</button></div></div>
      <div class="hi">
        <div class="hl">😴 SLEEP</div>
        <div class="hc"><span class="hv" id="sleep-value">${h.sleep.toFixed(1)}h</span></div>
        <input class="sleep-slider" type="range" min="0" max="12" step="0.1" value="${h.sleep.toFixed(1)}" oninput="previewSleep(this.value)" onchange="setHealthValue('sleep',this.value)">
      </div>
      <div class="hi">
        <div class="hl">😣 SORENESS (PREV DAY)</div>
        <div class="hc"><span class="hv" id="soreness-value">${soreness}/10</span></div>
        <input class="sleep-slider" type="range" min="0" max="10" step="1" value="${soreness}" oninput="previewSoreness(this.value)" onchange="setHealthValue('soreness',this.value)">
      </div>
      <div class="hi bmi-card"><div class="hl">⚖️ BMI</div><div class="hc"><span class="bmi-value" style="color:${bmiColor}">${bmi}</span></div><div class="bmi-status" style="color:${bmiColor}">${bmiStatus}</div></div>
    </div>`;
  }
  function renderProfileShell(){
    const el=document.getElementById("profile-root"); if(!el) return;
    const today=getTodayStr();
    const p=PROFILES[activeProfile]||{};
    const h=ensureHealthEntry(today);
    const profileName=accountRegistry[activeProfile]?.name || activeProfile;
    const avatarSrc=getProfileAvatarSrc();
    const profileUserEl = document.getElementById("profile-active-user");
    if(profileUserEl) profileUserEl.textContent = String(profileName).toUpperCase();
    const bw=parseFloat(getPBW(activeProfile,today)||0);
    const adjustedWaterTarget = getAdjustedWaterTarget(activeProfile, today);
    const proteinTarget=p.protein||120;
    const waterGlasses=Math.max(0,Math.round((h.water/0.25)));
    const waterTargetGlasses=Math.max(1,Math.round((adjustedWaterTarget/0.25)));
    const proteinPct=Math.min(100,Math.round(((h.protein||0)/proteinTarget)*100));
    const calories=getHealthCalories(h);
    const meals=getMealsForDate(today);
    const calorieTarget=Math.max(1800, Math.round((proteinTarget * 12)));
    const caloriesPct=Math.min(100,Math.round((calories/calorieTarget)*100));
    const sleepHours=Math.floor(Number(h.sleep||0));
    const sleepMins=Math.round((Number(h.sleep||0)-sleepHours)*60);
    const sleepPct=Math.min(100,Math.round((Number(h.sleep||0)/8)*100));
    const initials=String(profileName||activeProfile).trim().split(/\s+/).map(part=>part[0]||"").join("").slice(0,2).toUpperCase() || "IL";
    const mealMarkup = meals.length ? meals.slice().reverse().map(meal=>`
      <div class="profile-meal-row">
        <div><strong>${meal.food}</strong><span>${meal.calories} KCAL</span></div>
        ${meal.locked ? `<em>LEGACY</em>` : `<button onclick="removeMealEntry('${today}','${meal.id}')"><span class="material-symbols-outlined">delete</span></button>`}
      </div>
    `).join("") : `<div class="profile-meal-empty">No meals logged today yet.</div>`;
    el.innerHTML=`
      <section class="profile-hero">
        <button class="profile-avatar profile-avatar-edit" onclick="triggerProfileAvatarUpload()"><img src="${avatarSrc}" alt="Profile"><span class="material-symbols-outlined">photo_camera</span></button>
        <div class="profile-hero-copy">
          <h3>${String(profileName).toUpperCase()}</h3>
          <div class="profile-hero-meta"><span class="material-symbols-outlined">verified</span><span>TRAINING PROFILE</span></div>
          <div class="profile-hero-stats">
            <span>${p.height||"--"} CM</span>
            <span>${waterTargetGlasses} WATER GOAL</span>
            <span>${proteinTarget}G PROTEIN</span>
          </div>
        </div>
        <div class="profile-pro-badge">${initials}</div>
      </section>
      <section class="profile-metric-card">
        <div class="profile-metric-head">
          <div>
            <span class="profile-label">BODY WEIGHT</span>
            <div class="profile-weight-row"><strong>${bw>0?bw.toFixed(1):"--"}</strong><em>KG</em></div>
          </div>
          <div class="profile-spark"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
        <div class="profile-highlight-grid">
          <div class="profile-highlight-card">
            <span>Protein Goal</span>
            <strong>${h.protein||0}<em> / ${proteinTarget}G</em></strong>
          </div>
          <div class="profile-highlight-card">
            <span>Hydration</span>
            <strong>${h.water.toFixed(1)}<em> / ${adjustedWaterTarget.toFixed(1)}L</em></strong>
          </div>
        </div>
        <button class="profile-primary-btn" onclick="logTodayWeightPrompt()">LOG TODAY'S WEIGHT</button>
      </section>
      <section class="profile-section">
        <div class="profile-section-head">
          <div>
            <span class="profile-label">Daily Inputs</span>
            <h3>Daily Optimization</h3>
          </div>
        </div>
        <div class="profile-habit-card">
          <div class="profile-habit-icon water"><span class="material-symbols-outlined">water_drop</span></div>
          <div class="profile-habit-copy"><strong>Water Intake</strong><span>${waterGlasses} / ${waterTargetGlasses} GLASSES</span></div>
          <div class="profile-habit-actions"><button onclick="adjHealth('water',-0.25)">−</button><button class="plus" onclick="adjHealth('water',0.25)">+</button></div>
        </div>
        <div class="profile-habit-card nutrition">
          <div class="profile-habit-main">
            <div class="profile-habit-icon nutrition"><span class="material-symbols-outlined">restaurant</span></div>
            <div class="profile-habit-copy"><strong>Nutrition</strong><span>${meals.length} MEAL${meals.length===1?"":"S"} · ${calories} KCAL</span></div>
          </div>
          <div class="profile-nutrition-side">
            <strong>${calories}</strong><span>KCAL</span>
            <div class="profile-inline-group"><button class="profile-inline-link" onclick="logMealPrompt()">LOG MEAL</button></div>
          </div>
          <div class="profile-progress-bar"><div class="profile-progress-fill" style="width:${caloriesPct}%"></div></div>
          <div class="profile-meal-list">${mealMarkup}</div>
        </div>
        <div class="profile-two-col">
          <div class="profile-mini-card">
            <div class="profile-habit-icon creatine"><span class="material-symbols-outlined">medication</span></div>
            <div><strong>Creatine</strong><span>DAILY DOSE</span></div>
            <button class="profile-toggle ${h.creatine?'active':''}" onclick="togHealth('creatine')">${h.creatine?'TAKEN':'MARK TAKEN'}</button>
          </div>
          <div class="profile-mini-card">
            <div class="profile-habit-icon sleep"><span class="material-symbols-outlined">bedtime</span></div>
            <div><strong>Sleep</strong><span>${sleepHours} H ${String(sleepMins).padStart(2,'0')} M</span></div>
            <div class="profile-progress-bar"><div class="profile-progress-fill sleep" style="width:${sleepPct}%"></div></div>
            <button class="profile-sleep-btn" onclick="logSleepPrompt()">LOG SLEEP</button>
          </div>
        </div>
        <div class="profile-two-col">
          <div class="profile-mini-card">
            <div class="profile-habit-icon nutrition"><span class="material-symbols-outlined">local_fire_department</span></div>
            <div><strong>Calories</strong><span>${calories} / ${calorieTarget} KCAL</span></div>
            <div class="profile-progress-bar"><div class="profile-progress-fill calories" style="width:${caloriesPct}%"></div></div>
            <div class="profile-inline-group"><button class="profile-inline-link" onclick="logMealPrompt()">ADD FOOD</button></div>
          </div>
          <div class="profile-mini-card profile-mini-card-muted">
            <div class="profile-habit-icon water"><span class="material-symbols-outlined">water_full</span></div>
            <div><strong>Hydration Goal</strong><span>${adjustedWaterTarget.toFixed(1)}L TARGET</span></div>
            <button class="profile-sleep-btn" onclick="adjHealth('water',0.25)">ADD 250ML</button>
          </div>
        </div>
      </section>
      <section class="profile-links-card">
        <button onclick="openSettings()"><span class="material-symbols-outlined">settings</span><span>ACCOUNT SETTINGS</span><span class="material-symbols-outlined chev">chevron_right</span></button>
        <button onclick="openSettings()"><span class="material-symbols-outlined">event_available</span><span>WORKOUT SCHEDULE</span><span class="material-symbols-outlined chev">chevron_right</span></button>
        <button onclick="openSettings()"><span class="material-symbols-outlined">help_center</span><span>SUPPORT</span><span class="material-symbols-outlined chev">chevron_right</span></button>
      </section>
      <section class="profile-links-card">
        <button onclick="signOutAccount()"><span class="material-symbols-outlined">logout</span><span>SIGN OUT OF IRON LOG</span><span class="material-symbols-outlined chev">chevron_right</span></button>
      </section>
    `;
  }
  function getProfileAvatarSrc(profileKey=activeProfile){
    return state.userOverrides?.[profileKey]?.avatar
      || "https://lh3.googleusercontent.com/aida-public/AB6AXuAq14oMwfSCnwBlXk3jrf7FxHlEGkdGCJ7_YDaVjG3m90MvqbBNMy49zmc1M1xGjqaO13UXDzihsmsZu0ao_kZ06bBAVcs1SK_XqldIqHNvXcv-kefl6nNY8swPpqwVyT7KpNCjpv8CJWf0fEBQdKfro9nJugvF2YWMwdJ4w3iiq90kn3HGlzfGCc8RjV41-uUt_vbH_MLBTmXonvj5AZUJ3F6CGyROmdBZlx-ELMRMejZp4qHssKfX9g4UHE6VriWa6WEzpnbFciI";
  }
  window.triggerProfileAvatarUpload=function(){
    document.getElementById("profile-avatar-input")?.click();
  };
  window.handleProfileAvatarUpload=function(event){
    const file=event.target?.files?.[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=async ()=>{
      if(!state.userOverrides) state.userOverrides={};
      const cur=state.userOverrides[activeProfile]||{};
      state.userOverrides[activeProfile]={...cur,avatar:String(reader.result||"")};
      applyUserOverrides(state.userOverrides);
      renderProfileShell();
      await saveData();
      toast("✓ Profile image updated");
    };
    reader.readAsDataURL(file);
    event.target.value="";
  };
  function renderVisualProgressGallery(){
    const el=document.getElementById("visual-progress-root");
    if(!el) return;
    const photos=(Array.isArray(state.visualProgress)?state.visualProgress:[])
      .filter(item=>item?.src)
      .sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    el.innerHTML=`
      <div class="visual-progress-toolbar">
        <button class="profile-primary-btn visual-upload-btn" onclick="triggerVisualProgressUpload()">UPLOAD PROGRESS PHOTO</button>
      </div>
      <div class="visual-progress-grid">
        ${photos.length ? photos.slice(0,6).map((photo, index)=>`
          <figure class="visual-progress-card ${index===0?'active':''}">
            <img src="${photo.src}" alt="Progress photo ${index+1}">
            <figcaption>${photo.label || formatVisualProgressLabel(photo.date)}</figcaption>
            <button class="visual-progress-remove" onclick="removeVisualProgressPhoto('${photo.id}')"><span class="material-symbols-outlined">close</span></button>
          </figure>
        `).join("") : `
          <button class="visual-progress-empty" onclick="triggerVisualProgressUpload()">
            <span class="material-symbols-outlined">add_a_photo</span>
            <strong>No progress photos yet</strong>
            <span>Upload front, side, or check-in shots to track visual changes.</span>
          </button>
        `}
      </div>
    `;
  }
  function formatVisualProgressLabel(dateStr){
    if(!dateStr) return "UNTITLED";
    const d=new Date(`${dateStr}T12:00:00`);
    if(Number.isNaN(d.getTime())) return String(dateStr).toUpperCase();
    return d.toLocaleDateString("en-ZA",{month:"short",day:"numeric"}).toUpperCase();
  }
  window.triggerVisualProgressUpload=function(){
    document.getElementById("visual-progress-input")?.click();
  };
  window.handleVisualProgressUpload=function(event){
    const files=Array.from(event.target?.files||[]);
    if(!files.length) return;
    Promise.all(files.map(file=>new Promise(resolve=>{
      const reader=new FileReader();
      reader.onload=()=>resolve({
        id:`photo_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        src:String(reader.result||""),
        date:getTodayStr(),
        label:getTodayStr()===(getTodayStr())?"TODAY":formatVisualProgressLabel(getTodayStr())
      });
      reader.readAsDataURL(file);
    }))).then(async photos=>{
      state.visualProgress=[...photos,...(Array.isArray(state.visualProgress)?state.visualProgress:[])].slice(0,12);
      renderVisualProgressGallery();
      await saveData();
      toast(`✓ Added ${photos.length} progress photo${photos.length===1?"":"s"}`);
    });
    event.target.value="";
  };
  window.removeVisualProgressPhoto=async function(id){
    state.visualProgress=(Array.isArray(state.visualProgress)?state.visualProgress:[]).filter(photo=>photo.id!==id);
    renderVisualProgressGallery();
    await saveData();
  };
  function bindActiveWorkoutSwipe(key){
    const card=document.querySelector(".active-participant-card");
    if(!card) return;
    let startX=0;
    card.addEventListener("touchstart", e=>{
      startX=e.changedTouches?.[0]?.clientX||0;
    }, {passive:true});
    card.addEventListener("touchend", e=>{
      const endX=e.changedTouches?.[0]?.clientX||0;
      const dx=endX-startX;
      if(Math.abs(dx)<40) return;
      if(dx<0) shiftActiveWorkoutParticipant(key,1);
      else shiftActiveWorkoutParticipant(key,-1);
    }, {passive:true});
  }
  window.logTodayWeightPrompt=async function(){
    const current=getPBW(activeProfile,getTodayStr())||"";
    const next=prompt("Log today's bodyweight (kg)", current);
    if(next===null) return;
    await saveBwDate(next,getTodayStr());
    renderProfileShell();
  };
  window.logSleepPrompt=async function(){
    const current=ensureHealthEntry(getTodayStr()).sleep || "";
    const next=prompt("Log sleep hours (e.g. 7.5)", current);
    if(next===null) return;
    await setHealthValue('sleep', next);
    renderProfileShell();
  };
  window.logCaloriesPrompt=async function(){
    await logMealPrompt();
    renderProfileShell();
  };
  window.logMealPrompt=async function(dateStr=getTodayStr()){
    const entry = ensureHealthEntry(dateStr);
    const food = prompt("What food did you have?", "");
    if(food===null) return;
    const cleanFood = String(food || "").trim();
    if(!cleanFood){
      toast("⚠️ Enter a food item");
      return;
    }
    const calories = prompt(`Rough calories for "${cleanFood}"`, "");
    if(calories===null) return;
    const kcal = Math.max(0, Math.round(Number(calories || 0)));
    if(!kcal){
      toast("⚠️ Enter calories");
      return;
    }
    entry.meals.push({
      id:`meal_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      food: cleanFood,
      calories: kcal
    });
    syncHealthCalories(entry);
    renderHealthChecklist();
    renderProfileShell();
    await saveData();
    toast(`🍽 ${cleanFood} logged`);
  };
  window.removeMealEntry=async function(dateStr, mealId){
    const entry = ensureHealthEntry(dateStr);
    entry.meals = (entry.meals || []).filter(meal=>meal?.id !== mealId || meal?.locked);
    syncHealthCalories(entry);
    renderHealthChecklist();
    renderProfileShell();
    await saveData();
  };
  function isDateKey(v){
    return /^\d{4}-\d{2}-\d{2}$/.test(String(v||""));
  }
  function normalizeHealthStore(){
    if(!state.health || typeof state.health !== "object" || Array.isArray(state.health)) state.health = {};
    const keys = Object.keys(state.health || {});
    if(!keys.length) return;
    if(keys.every(isDateKey)){
      state.health = { [activeProfile]: deepCopy(state.health) };
      return;
    }
    keys.forEach(pk=>{
      const bucket = state.health[pk];
      if(!bucket || typeof bucket !== "object" || Array.isArray(bucket)) state.health[pk] = {};
    });
  }
  function getHealthBucket(profileKey=activeProfile){
    normalizeHealthStore();
    if(!state.health[profileKey] || typeof state.health[profileKey] !== "object" || Array.isArray(state.health[profileKey])) state.health[profileKey] = {};
    return state.health[profileKey];
  }
  function getHealthEntriesFromStore(rawHealth, profileKey=activeProfile){
    if(!rawHealth || typeof rawHealth !== "object" || Array.isArray(rawHealth)) return {};
    const keys = Object.keys(rawHealth);
    if(!keys.length) return {};
    if(keys.every(isDateKey)) return rawHealth;
    const nested = rawHealth[profileKey];
    if(nested && typeof nested === "object" && !Array.isArray(nested)) return nested;
    return {};
  }
  function ensureHealthEntry(dateStr, profileKey=activeProfile){
    const bucket = getHealthBucket(profileKey);
    const v = bucket[dateStr];
    if(!v || typeof v !== "object" || Array.isArray(v)){
      bucket[dateStr]={water:0,creatine:false,aminos:false,protein:0,calories:0,caloriesManual:0,sleep:0,soreness:0,meals:[]};
    }
    const entry = bucket[dateStr];
    if(typeof entry.water !== "number") entry.water = Number(entry.water || 0);
    if(typeof entry.protein !== "number") entry.protein = Number(entry.protein || 0);
    if(typeof entry.calories !== "number") entry.calories = Number(entry.calories || 0);
    if(typeof entry.caloriesManual !== "number") entry.caloriesManual = Number(entry.caloriesManual ?? (entry.calories || 0));
    if(typeof entry.sleep !== "number") entry.sleep = Number(entry.sleep || 0);
    if(typeof entry.soreness !== "number") entry.soreness = Number(entry.soreness || 0);
    if(typeof entry.creatine !== "boolean") entry.creatine = !!entry.creatine;
    if(typeof entry.aminos !== "boolean") entry.aminos = !!entry.aminos;
    if(!Array.isArray(entry.meals)) entry.meals = [];
    if(entry.calories > 0 && entry.meals.length === 0 && !entry._legacyCaloriesMigrated){
      entry.meals = [{
        id:`legacy_${dateStr}`,
        food:"Previous calories",
        calories:Number(entry.calories || 0),
        locked:true
      }];
      entry.caloriesManual = 0;
      entry._legacyCaloriesMigrated = true;
    }
    entry.calories = getHealthCalories(entry);
    return entry;
  }
  function getHealthCalories(entry){
    if(!entry || typeof entry !== "object") return 0;
    const mealCalories = (Array.isArray(entry.meals) ? entry.meals : []).reduce((sum, meal)=>sum + Math.max(0, Number(meal?.calories || 0)), 0);
    return Math.round(Math.max(0, Number(entry.caloriesManual || 0)) + mealCalories);
  }
  function syncHealthCalories(entry){
    if(!entry || typeof entry !== "object") return 0;
    entry.calories = getHealthCalories(entry);
    return entry.calories;
  }
  function getMealsForDate(dateStr=getTodayStr(), profileKey=activeProfile){
    return ensureHealthEntry(dateStr, profileKey).meals || [];
  }
  window.adjHealth=async function(k,d){
    const t=getTodayStr();
    const entry = ensureHealthEntry(t);
    const current = Number(k==="calories" ? entry.caloriesManual || 0 : entry[k] || 0);
    let next = current + d;
    if(k==="protein" || k==="calories") next = Math.round(next);
    else if(k==="water") next = Math.round(next * 100) / 100;
    else if(k==="sleep") next = Math.round(next * 10) / 10;
    else next = Math.round(next * 100) / 100;
    if(k==="calories") entry.caloriesManual = Math.max(0, next);
    else entry[k] = Math.max(0, next);
    syncHealthCalories(entry);
    renderHealthChecklist();
    renderProfileShell();
    await saveData();
  };
  window.previewSleep=function(v){
    const t=getTodayStr();
    const entry=ensureHealthEntry(t);
    entry.sleep = Math.max(0, Math.round(Number(v || 0) * 10) / 10);
    const el=document.getElementById("sleep-value");
    if(el) el.textContent = `${entry.sleep.toFixed(1)}h`;
  };
  window.previewSoreness=function(v){
    const t=getTodayStr();
    const entry=ensureHealthEntry(t);
    entry.soreness = Math.max(0, Math.min(10, Math.round(Number(v || 0))));
    const el=document.getElementById("soreness-value");
    if(el) el.textContent = `${entry.soreness}/10`;
  };
  window.setHealthValue=async function(k,v){
    const t=getTodayStr();
    const entry=ensureHealthEntry(t);
    let next = Number(v || 0);
    if(k==="protein" || k==="calories") next = Math.round(next);
    else if(k==="water") next = Math.round(next * 100) / 100;
    else if(k==="sleep") next = Math.round(next * 10) / 10;
    else if(k==="soreness") next = Math.round(next);
    else next = Math.round(next * 100) / 100;
    if(k==="calories") entry.caloriesManual = Math.max(0, next);
    else {
      entry[k] = Math.max(0, next);
      if(k==="soreness") entry[k] = Math.min(10, entry[k]);
    }
    syncHealthCalories(entry);
    renderHealthChecklist();
    renderProfileShell();
    await saveData();
  };
  window.togHealth=async function(k){
    const t=getTodayStr();
    const entry = ensureHealthEntry(t);
    entry[k]=!entry[k];
    renderHealthChecklist();
    renderProfileShell();
    await saveData();
  };

  // ─── VOLUME BY MUSCLE GROUP ───
  function getVolumeByMuscleGroup(dateStr) {
    const wo = state.workouts?.[dateStr] || {};
    const muscleVol = { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, other: 0 };
    Object.keys(wo).forEach(dayKey => {
      const session = wo[dayKey];
      if (!sessionHasActivityForParticipant(session, dayKey, activeProfile)) return;
      const day = WORKOUT_PLAN[dayKey];
      if (!day) return;
      day.exercises.forEach(ex => {
        const muscle = getMuscleGroup(ex.name);
        const { data } = getExData(session.exercises||{}, activeProfile, ex.name);
        const hasActivity = data?.checked || parseFloat(data?.weight||0)>0 || parseFloat(data?.actualReps||0)>0 || (Array.isArray(data?.coverSets) && data.coverSets.length) || ((session.sessionParticipants||day.participants||[]).includes(activeProfile) && session.done);
        if(hasActivity) muscleVol[muscle] = (muscleVol[muscle] || 0) + (ex.sets || 0);
      });
    });
    return muscleVol;
  }
  function getMonthVolumeByMuscleGroup() {
    const p = getMonthKey();
    const muscleVol = { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, other: 0 };
    Object.keys(state.workouts || {}).forEach(d => {
      if (!d.startsWith(p)) return;
      const vol = getVolumeByMuscleGroup(d);
      Object.keys(vol).forEach(m => { muscleVol[m] += vol[m]; });
    });
    return muscleVol;
  }

  // ─── MONTH-OVER-MONTH COMPARISON ───
  function getMonthComparisonData() {
    const today = getTodayStr();
    const thisMonth = getMonthKey();
    const thisVol = { sessions: 0, tonnage: 0, prs: 0 };
    const lastMonthStr = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
    const lastVol = { sessions: 0, tonnage: 0, prs: 0 };

    Object.keys(state.workouts || {}).forEach(d => {
      if (d.startsWith(thisMonth)) {
        Object.keys(state.workouts[d]).forEach(k => {
          if (state.workouts[d][k].done) {
            thisVol.sessions++;
            thisVol.tonnage += calcSessionTonnage(d, k);
          }
        });
      } else if (d.startsWith(lastMonthStr)) {
        Object.keys(state.workouts[d]).forEach(k => {
          if (state.workouts[d][k].done) {
            lastVol.sessions++;
            lastVol.tonnage += calcSessionTonnage(d, k);
          }
        });
      }
    });

    Object.keys(state.prs || {}).forEach(key => {
      const pr = state.prs[key];
      if (pr.participant === activeProfile) {
        if (pr.date.startsWith(thisMonth)) thisVol.prs++;
        else if (pr.date.startsWith(lastMonthStr)) lastVol.prs++;
      }
    });

    return { thisMonth, lastMonthStr, thisVol, lastVol };
  }

  // ─── WORKOUT TEMPLATES / PROGRAMS ───
  let workoutTemplates = JSON.parse(localStorage.getItem('ironlog_templates')) || {};
  function saveTemplate(templateName) {
    const cleanName = templateName.trim().toUpperCase();
    if (!cleanName) { toast('Please enter a template name'); return; }
    workoutTemplates[cleanName] = deepCopy(WORKOUT_PLAN);
    localStorage.setItem('ironlog_templates', JSON.stringify(workoutTemplates));
    toast(`✓ Saved template: ${cleanName}`);
    renderTemplateList();
  }
  function loadTemplate(templateName) {
    if (!workoutTemplates[templateName]) return;
    WORKOUT_PLAN = deepCopy(workoutTemplates[templateName]);
    toast(`✓ Loaded template: ${templateName}`);
    saveData();
    renderDayGrid();
    renderAll();
  }
  function deleteTemplate(templateName) {
    delete workoutTemplates[templateName];
    localStorage.setItem('ironlog_templates', JSON.stringify(workoutTemplates));
    toast(`🗑 Deleted template: ${templateName}`);
    renderTemplateList();
  }
  function renderTemplateList() {
    const el = document.getElementById('template-list');
    if (!el) return;
    const names = Object.keys(workoutTemplates);
    if (names.length === 0) {
      el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;padding:10px">No templates saved yet. Create a program and save it!</div>';
      return;
    }
    el.innerHTML = names.map(name => `<div class="template-item">
      <span class="template-name">${name}</span>
      <div class="template-btns">
        <button class="template-btn-load" onclick="loadTemplate('${name}')">LOAD</button>
        <button class="template-btn-del" onclick="deleteTemplate('${name}')">DEL</button>
      </div>
    </div>`).join('');
  }
  window.saveTemplate = saveTemplate;
  window.loadTemplate = loadTemplate;
  window.deleteTemplate = deleteTemplate;
  window.renderTemplateList = renderTemplateList;

  // ─── RENDER MONTH-OVER-MONTH COMPARISON ───
  function renderMonthComparison() {
    const el = document.getElementById('month-comparison');
    if (!el) return;
    const { thisMonth, lastMonthStr, thisVol, lastVol } = getMonthComparisonData();
    const thisMon = thisMonth.substring(5);
    const lastMon = lastMonthStr.substring(5);
    const ac = PROFILES[activeProfile].color;
    const sessChange = lastVol.sessions > 0 ? ((thisVol.sessions - lastVol.sessions) / lastVol.sessions * 100).toFixed(0) : thisVol.sessions > 0 ? 100 : 0;
    const tonnChange = lastVol.tonnage > 0 ? ((thisVol.tonnage - lastVol.tonnage) / lastVol.tonnage * 100).toFixed(0) : thisVol.tonnage > 0 ? 100 : 0;
    const prChange = lastVol.prs > 0 ? ((thisVol.prs - lastVol.prs) / lastVol.prs * 100).toFixed(0) : thisVol.prs > 0 ? 100 : 0;
    const sessColor = sessChange > 0 ? '#5cba5c' : sessChange < 0 ? '#ef4444' : '#f0c040';
    const tonnColor = tonnChange > 0 ? '#5cba5c' : tonnChange < 0 ? '#ef4444' : '#f0c040';
    const prColor = prChange > 0 ? '#5cba5c' : prChange < 0 ? '#ef4444' : '#f0c040';
    el.innerHTML = `<div style="background:var(--bg3);border:1px solid var(--border);padding:13px;border-radius:6px;margin-top:10px">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;letter-spacing:.1em;font-size:.82rem;line-height:1.2;color:var(--muted);margin-bottom:11px">📊 MONTH-OVER-MONTH</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px">
        <div style="background:var(--bg2);border:1px solid var(--border);padding:9px;border-radius:4px;text-align:center">
          <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;font-size:.76rem;line-height:1.2;color:var(--muted);margin-bottom:4px">SESSIONS</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:${ac}">${thisVol.sessions}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.06em;font-size:.72rem;line-height:1.2;color:${sessColor};margin-top:2px">vs ${lastVol.sessions} (${sessChange > 0 ? '+' : ''}${sessChange}%)</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);padding:9px;border-radius:4px;text-align:center">
          <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;font-size:.76rem;line-height:1.2;color:var(--muted);margin-bottom:4px">TONNAGE (kg)</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:${ac}">${thisVol.tonnage}kg</div>
          <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.06em;font-size:.72rem;line-height:1.2;color:${tonnColor};margin-top:2px">vs ${lastVol.tonnage}kg (${tonnChange > 0 ? '+' : ''}${tonnChange}%)</div>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);padding:9px;border-radius:4px;text-align:center">
          <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.08em;font-size:.76rem;line-height:1.2;color:var(--muted);margin-bottom:4px">NEW PRS</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:${ac}">${thisVol.prs}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.06em;font-size:.72rem;line-height:1.2;color:${prColor};margin-top:2px">vs ${lastVol.prs} (${prChange > 0 ? '+' : ''}${prChange}%)</div>
        </div>
      </div>
      <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.06em;font-size:.72rem;line-height:1.2;color:var(--muted);margin-top:8px;text-align:center">${thisMon} vs ${lastMon}</div>
    </div>`;
  }

  // ─── PERSONAL RECORDS WALL ───
  let prWallFilter = 'all';
  function renderPersonalRecordsWall(){
    const el=document.getElementById("pr-wall"); if(!el)return;
    const prs = getPersonalRecords();
    const filteredPrs = prWallFilter === 'all' ? prs : prs.filter(pr => pr.muscleGroup === prWallFilter);
    const muscleGroups = ['all', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'other'];
    const ac = PROFILES[activeProfile].color;

    let h = `<div class="prw-header">
      <div class="prw-title">🏆 PERSONAL RECORDS</div>
      <div class="prw-filters">`;
    muscleGroups.forEach(group => {
      const active = prWallFilter === group;
      const count = group === 'all' ? prs.length : prs.filter(pr => pr.muscleGroup === group).length;
      if(count > 0 || group === 'all'){
        h += `<button class="prw-filter ${active?'active':''}" style="${active?'border-color:'+ac:''}" onclick="setPrWallFilter('${group}')">${group.toUpperCase()} (${count})</button>`;
      }
    });
    h += `</div></div>`;

    if(filteredPrs.length === 0){
      h += `<div class="prw-empty">No personal records yet. Keep lifting! 💪</div>`;
    } else {
      h += `<div class="prw-grid">`;
      filteredPrs.forEach(pr => {
        const dateStr = new Date(pr.date).toLocaleDateString('en-ZA', {month:'short', day:'numeric', year:'numeric'});
        const duration = pr.daysHeld === 0 ? 'Today' : pr.daysHeld === 1 ? '1 day' : `${pr.daysHeld} days`;
        h += `<div class="prw-card">
          <div class="prw-exercise">${pr.exercise}</div>
          <div class="prw-weight">${pr.weight}kg</div>
          <div class="prw-details">
            <span class="prw-date">${dateStr}</span>
            <span class="prw-duration">Held for ${duration}</span>
          </div>
          <div class="prw-muscle" style="background:${getMuscleColor(pr.muscleGroup)}">${pr.muscleGroup.toUpperCase()}</div>
        </div>`;
      });
      h += `</div>`;
    }

    el.innerHTML = h;
  }
  window.setPrWallFilter = function(filter){ prWallFilter = filter; renderPersonalRecordsWall(); };

  // ─── 1RM CALCULATOR ───
  function calculateOneRepMax(weight, reps) {
    if (!weight || weight <= 0 || !reps || reps <= 0) return null;
    // Epley formula: 1RM = weight × (1 + (reps / 30))
    return weight * (1 + (reps / 30));
  }

  function render1RMCalculator() {
    const el = document.getElementById('orm-calc');
    if (!el) return;
    const ac = PROFILES[activeProfile].color;
    el.innerHTML = `<div class="orm-container">
      <div class="orm-header">💪 ONE-REP MAX ESTIMATOR</div>
      <div class="orm-inputs">
        <div class="orm-input-group">
          <label class="orm-input-label">WORKING WEIGHT (kg)</label>
          <div class="orm-stepper"><button onclick="adjustOrmValue('weight',-2.5)">−</button><input type="number" id="orm-weight" class="orm-input" placeholder="e.g. 100" step="0.5" min="0" onchange="updateORM()" oninput="updateORM()"><button onclick="adjustOrmValue('weight',2.5)">+</button></div>
        </div>
        <div class="orm-input-group">
          <label class="orm-input-label">REPS AT WEIGHT</label>
          <div class="orm-stepper"><button onclick="adjustOrmValue('reps',-1)">−</button><input type="number" id="orm-reps" class="orm-input" placeholder="e.g. 8" step="1" min="1" max="50" onchange="updateORM()" oninput="updateORM()"><button onclick="adjustOrmValue('reps',1)">+</button></div>
        </div>
      </div>
      <div id="orm-display" style="display:none">
        <div class="orm-result">
          <div class="orm-result-value" id="orm-value" style="color:${ac}">—</div>
          <div class="orm-result-label">ESTIMATED 1RM</div>
          <div class="orm-formula" id="orm-calc-details"></div>
        </div>
      </div>
      <div class="orm-note">
        📌 Uses the <strong>Epley Formula</strong>: 1RM = Weight × (1 + Reps/30). This is an estimate—actual 1RM may vary based on form, fatigue, and individual differences.
      </div>
    </div>`;
    updateORM();
  }
  window.adjustOrmValue=function(kind, delta){
    const el=document.getElementById(kind==="weight"?"orm-weight":"orm-reps");
    if(!el) return;
    const current=Number(el.value||0);
    const next=Math.max(kind==="reps"?1:0, current + delta);
    el.value=kind==="reps" ? Math.round(next) : Math.round(next*10)/10;
    updateORM();
  };

  window.updateORM = function() {
    const w = parseFloat(document.getElementById('orm-weight')?.value || 0);
    const r = parseInt(document.getElementById('orm-reps')?.value || 0);
    const display = document.getElementById('orm-display');
    const value = document.getElementById('orm-value');
    const details = document.getElementById('orm-calc-details');
    
    if (w > 0 && r > 0) {
      const orm = calculateOneRepMax(w, r);
      if (orm) {
        value.textContent = orm.toFixed(1) + 'kg';
        details.textContent = `${w}kg × (1 + ${r}/30) = ${orm.toFixed(1)}kg`;
        display.style.display = 'block';
      }
    } else {
      display.style.display = 'none';
    }
  };
  function getMuscleColor(group){
    const colors = {
      chest: '#e85d04',
      back: '#4361ee',
      shoulders: '#2ec4b6',
      arms: '#f72585',
      legs: '#7b2d8b',
      core: '#f0c040',
      other: '#888'
    };
    return colors[group] || '#888';
  }

  function renderDayPanelModern(key){
    const day=WORKOUT_PLAN[key]; if(!day)return;
    const todayStr=getTodayStr();
    const isToday=activeDate===todayStr;
    const isPastDate=activeDate<todayStr;
    const isEditable=true;
    const wo=getWorkout(activeDate,key);
    const panel=document.getElementById("day-panel");
    const planParticipants=day.participants||['revan'];
    const trackableParticipants=getTrackableParticipants(key);
    const participants=isEditable ? getSessionParticipants(activeDate,key) : (wo.sessionParticipants||planParticipants);
    let done=0,total=day.exercises.length*participants.length;
    participants.forEach(p=>{ day.exercises.forEach(ex=>{ const {data:_ed}=getExData(wo.exercises,p,ex.name); if(_ed?.checked)done++; }); });
    const pct=total>0?Math.round(done/total*100):0;
    const ton=calcSessionTonnage(activeDate,key);
    const activeExerciseIndex=Math.max(0, day.exercises.findIndex(ex=>participants.some(pp=>!getExData(wo.exercises,pp,ex.name).data?.checked)));
    const activeExercise=day.exercises[activeExerciseIndex] || day.exercises[0] || null;
    const canReorderQueue=isEditable;
    const queue=(day.exercises||[]).map((ex,index)=>({ ex, index, ...getExerciseCompletionState(wo,participants,ex.name) }));
    const participantSelectors=isEditable && trackableParticipants.length>1 ? `<div class="active-track-switches">${trackableParticipants.map(pp=>{
      const pcolor=PROFILES[pp]?.color||'#888';
      const active=participants.includes(pp);
      return `<button class="active-track-pill ${active?'selected':''}" style="${active?`--track:${pcolor};color:${pcolor}`:''}" onclick="toggleSessionParticipant('${key}','${pp}')">${PROFILES[pp]?.label||pp}</button>`;
    }).join("")}</div>` : "";
    activeWorkoutParticipantIndex=Math.min(activeWorkoutParticipantIndex, Math.max(participants.length-1,0));
    const displayedParticipants=participants.length>1 ? [participants[activeWorkoutParticipantIndex]] : participants;
    const participantCards=activeExercise ? displayedParticipants.map(pp=>{
      const {key:exKey,data:edRaw}=getExData(wo.exercises,pp,activeExercise.name);
      const ed=edRaw||{};
      const lastWeight=getLastWeight(key,activeExercise.name,pp);
      const currentWeight=parseFloat(ed.weight||lastWeight?.weight||20) || 20;
      const currentReps=parseInt(ed.actualReps||activeExercise.reps||8,10) || 8;
      const setHistory=Array.isArray(ed.coverSets)?ed.coverSets:[];
      const targetSets=getExerciseTargetSets(activeExercise);
      const loggedSets=Math.min(setHistory.length, targetSets);
      const setPct=Math.min(100, Math.round((loggedSets/targetSets)*100));
      const nextSetNumber=Math.min(loggedSets + 1, targetSets);
      const ptime=getWorkoutTimeEntry(activeDate,key,pp);
      const pcolor=PROFILES[pp]?.color||'#888';
      return `<section class="active-participant-card ${ed.checked?'complete':''}" style="--participant:${pcolor}">
        <div class="active-participant-head">
          <div><span class="active-participant-name">${PROFILES[pp]?.label||pp}</span><span class="active-participant-meta">${ed.checked?'Exercise complete':`${loggedSets}/${targetSets} sets logged`}</span></div>
          <div class="active-participant-time">
            <input type="time" class="active-inline-input" value="${ptime.at||''}" ${!isEditable?'disabled':''} onblur="saveWorkoutTimeAt('${key}','${pp}',this.value)">
            <input type="number" class="active-inline-input active-inline-input-sm" min="0" max="480" step="1" value="${ptime.durationMins||''}" ${!isEditable?'disabled':''} onblur="saveWorkoutDuration('${key}','${pp}',this.value)">
          </div>
        </div>
        <div class="active-workout-controls">
          <div class="active-workout-control-card"><label>Weight (kg)</label><div class="active-workout-stepper"><button ${!isEditable?'disabled':''} onclick="adjustActiveWorkoutValue('${key}','${exKey}','weight',-2.5,${currentWeight})">−</button><strong>${currentWeight}</strong><button ${!isEditable?'disabled':''} onclick="adjustActiveWorkoutValue('${key}','${exKey}','weight',2.5,${currentWeight})">+</button></div></div>
          <div class="active-workout-control-card"><label>Reps</label><div class="active-workout-stepper"><button ${!isEditable?'disabled':''} onclick="adjustActiveWorkoutValue('${key}','${exKey}','reps',-1,${currentReps})">−</button><strong>${currentReps}</strong><button ${!isEditable?'disabled':''} onclick="adjustActiveWorkoutValue('${key}','${exKey}','reps',1,${currentReps})">+</button></div></div>
        </div>
        <div class="active-workout-stats-row">
          <div class="active-workout-stat"><span>Previous Best</span><strong>${lastWeight?.weight || "—"} <em>kg</em></strong></div>
          <div class="active-workout-stat"><span>Set Progress</span><strong>${loggedSets}/${targetSets} <em>${setPct}%</em></strong></div>
        </div>
        <button class="active-workout-log" ${!isEditable||ed.checked?'disabled':''} onclick="finishActiveExercise('${key}','${pp}','${activeExercise.name.replace(/'/g,"\\'")}')"><span class="material-symbols-outlined">skip_next</span><span>Next Exercise</span><em>${ed.checked?'DONE':`SET ${nextSetNumber} OF ${targetSets}`}</em></button>
        ${ed.checked && isEditable ? `<button class="active-secondary-btn" onclick="reopenExerciseForParticipant('${key}','${pp}','${activeExercise.name.replace(/'/g,"\\'")}')">Reopen</button>` : ""}
        <div class="active-workout-history"><div class="active-workout-history-head"><h4>Exercise Log</h4><span>${setHistory.length ? `${setHistory.length} logged` : `${targetSets} target sets`}</span></div><div class="active-workout-history-list">${setHistory.length ? setHistory.map((set, index)=>`<div class="active-set-row"><div><strong>${String(index+1).padStart(2,"0")}</strong><span>${set.weight || 0}kg × ${set.reps || 0} reps</span></div><span class="material-symbols-outlined">check_circle</span></div>`).join("") : `<div class="active-set-row active-set-row-empty"><div><strong>00</strong><span>No logged set snapshots yet</span></div><span class="material-symbols-outlined">hourglass_empty</span></div>`}</div></div>
      </section>`;
    }).join("") : `<div class="activity-empty">No exercises in this workout yet.</div>`;
    const swipeControls=participants.length>1 ? `<div class="active-swipe-head"><button class="active-swipe-btn" onclick="shiftActiveWorkoutParticipant('${key}',-1)"><span class="material-symbols-outlined">chevron_left</span></button><span class="active-swipe-label">${PROFILES[displayedParticipants[0]]?.label||displayedParticipants[0]} · ${activeWorkoutParticipantIndex+1}/${participants.length}</span><button class="active-swipe-btn" onclick="shiftActiveWorkoutParticipant('${key}',1)"><span class="material-symbols-outlined">chevron_right</span></button></div>` : "";
    const nextExercise=queue.find((item, idx)=>idx>activeExerciseIndex && !item.allDone);
    const sessionNote=wo.notes||"";
    panel.innerHTML=`<section class="active-workout-shell">
      <div class="active-workout-head">
        <div><p class="active-workout-kicker">${day.label} • ${day.subtitle || "Workout"}</p><h3 class="active-workout-title">${activeExercise?.name || day.title}</h3></div>
        <div class="active-workout-rest"><span>Rest Timer</span><strong id="session-display-active">${getSessionDisplayText()}</strong><div class="active-timer-actions"><button id="timer-play-active" class="active-timer-btn" onclick="startSessionTimer()">Start</button><button id="timer-pause-active" class="active-timer-btn" style="display:none" onclick="pauseSessionTimer()">Pause</button><button class="active-timer-btn end" onclick="markDone('${key}')">End</button></div></div>
      </div>
      <div class="active-workout-visual"><div class="active-workout-overlay"><div class="active-workout-stat"><span>Workout</span><strong>${day.title}</strong></div><div class="active-workout-stat"><span>Progress</span><strong>${pct}<em>%</em></strong></div></div></div>
      ${participantSelectors}
      <div class="active-panel-meta"><span>${formatDate(activeDate)}</span>${ton>0?`<span>${ton}kg moved</span>`:""}${isPastDate?`<span>HISTORY EDIT MODE</span>`:""}</div>
      ${swipeControls}
      ${participantCards}
      ${nextExercise ? `<button class="active-workout-next" onclick="document.getElementById('queue-item-${nextExercise.index}')?.scrollIntoView({behavior:'smooth',block:'center'})"><div><span>Next Exercise</span><strong>${nextExercise.ex.name}</strong></div><em>${getExerciseTargetSets(nextExercise.ex)} sets</em></button>` : ""}
      <section class="active-queue-shell"><div class="active-workout-history-head"><h4>Exercise Queue</h4><span>${canReorderQueue?'Reorder is live during the workout':'Reorder unavailable'}</span></div><div class="active-queue-list">${queue.map(item=>`<div id="queue-item-${item.index}" class="active-queue-item ${item.index===activeExerciseIndex?'current':''} ${item.allDone?'complete':''}"><div class="active-queue-copy"><strong>${item.ex.name}</strong><span>${getExerciseTargetSets(item.ex)} sets • ${item.ex.reps || "—"} reps • ${item.doneCount}/${item.totalCount} complete</span></div>${canReorderQueue && isEditable ? `<div class="active-queue-actions"><button title="Move up" ${item.index===0?'disabled':''} onclick="moveExerciseInQueue('${key}',${item.index},-1)"><span class="material-symbols-outlined">keyboard_arrow_up</span></button><button title="Move down" ${item.index===queue.length-1?'disabled':''} onclick="moveExerciseInQueue('${key}',${item.index},1)"><span class="material-symbols-outlined">keyboard_arrow_down</span></button></div>`:""}</div>`).join("")}</div></section>
      <section class="active-session-note"><label>Session Note</label><textarea id="snote-${key}" class="active-note-input" ${!isEditable?'disabled':''} placeholder="How did this session feel?">${sessionNote}</textarea>${isEditable?`<button class="active-secondary-btn" onclick="saveSessionNote('${key}')">Save Note</button>`:""}</section>
    </section>`;
    panel.style.display="block";
    updateTimerBtns();
    bindActiveWorkoutSwipe(key);
    syncWorkoutFocusState();
  }

  // ─── DAY PANEL ───
  function renderDayPanel(key){
    return renderDayPanelModern(key);
    const day=WORKOUT_PLAN[key]; if(!day)return;
    const todayStr=getTodayStr();
    const isToday=activeDate===todayStr;
    const isPastDate=activeDate<todayStr;
    const isEditable=isToday||unlockedDates.has(activeDate);
    const wo=getWorkout(activeDate,key);
    const panel=document.getElementById("day-panel");
    // planParticipants = who CAN do this workout (template setting)
    // sessionParticipants = who IS doing this specific session
    const planParticipants=day.participants||['revan'];
    const trackableParticipants=getTrackableParticipants(key);
    const participants=isEditable ? getSessionParticipants(activeDate,key) : (wo.sessionParticipants||planParticipants);
    const isShared=planParticipants.length>1; // workout is a shared template
    const isSharedSession=participants.length>1; // this session has 2+ people

    // Count done across session participants only
    let done=0,total=day.exercises.length*participants.length;
    participants.forEach(p=>{ day.exercises.forEach(ex=>{ const {data:_ed}=getExData(wo.exercises,p,ex.name); if(_ed?.checked)done++; }); });
    const pct=total>0?Math.round(done/total*100):0;
    const ton=calcSessionTonnage(activeDate,key);
    const bw=getPBW(activeProfile,isToday?getTodayStr():activeDate)||"";
    const exerciseInsights=(day.exercises||[]).map(ex=>getProgressInsight(key,ex,activeProfile)).filter(Boolean);
    const hasPlateau=exerciseInsights.some(x=>x.kind==="plateau");
    const hasDeload=shouldSuggestDeload();
    const activeParticipant=participants[0] || activeProfile;
    const activeExerciseIndex=Math.max(0, day.exercises.findIndex(ex=>!getExData(wo.exercises,activeParticipant,ex.name).data?.checked));
    const activeExercise=day.exercises[activeExerciseIndex] || day.exercises[0] || null;
    let activeWorkoutShell="";
    if(activeExercise){
      const {key:activeExKey,data:activeDataRaw}=getExData(wo.exercises,activeParticipant,activeExercise.name);
      const activeData=activeDataRaw||{};
      const lastWeight=getLastWeight(key,activeExercise.name,activeParticipant);
      const currentWeight=parseFloat(activeData.weight||lastWeight?.weight||20) || 20;
      const currentReps=parseInt(activeData.actualReps||activeExercise.reps||8,10) || 8;
      const setHistory=Array.isArray(activeData.coverSets) ? activeData.coverSets : [];
      const totalLogged=setHistory.length || (activeData.checked ? 1 : 0);
      const volume=setHistory.reduce((sum,set)=>sum+((parseFloat(set.weight)||0)*(parseInt(set.reps,10)||0)),0);
      const nextExercise=day.exercises[activeExerciseIndex+1] || null;
      activeWorkoutShell=`
        <section class="active-workout-shell">
          <div class="active-workout-head">
            <div>
              <p class="active-workout-kicker">${day.title} • ${day.subtitle || "Workout"}</p>
              <h3 class="active-workout-title">${activeExercise.name}</h3>
            </div>
            <div class="active-workout-rest">
              <span>Rest Timer</span>
              <strong id="session-display-active">00:00</strong>
            </div>
          </div>
          <div class="active-workout-visual">
            <div class="active-workout-overlay">
              <div class="active-workout-stat">
                <span>Previous Best</span>
                <strong>${lastWeight?.weight || "—"} <em>kg</em></strong>
              </div>
              <div class="active-workout-stat">
                <span>Target Reps</span>
                <strong>${activeExercise.reps || "—"}</strong>
              </div>
            </div>
          </div>
          <div class="active-workout-controls">
            <div class="active-workout-control-card">
              <label>Weight (kg)</label>
              <div class="active-workout-stepper">
                <button onclick="adjustActiveWorkoutValue('${key}','${activeExKey}','weight',-2.5,${currentWeight})">−</button>
                <strong>${currentWeight}</strong>
                <button onclick="adjustActiveWorkoutValue('${key}','${activeExKey}','weight',2.5,${currentWeight})">+</button>
              </div>
            </div>
            <div class="active-workout-control-card">
              <label>Reps</label>
              <div class="active-workout-stepper">
                <button onclick="adjustActiveWorkoutValue('${key}','${activeExKey}','reps',-1,${currentReps})">−</button>
                <strong>${currentReps}</strong>
                <button onclick="adjustActiveWorkoutValue('${key}','${activeExKey}','reps',1,${currentReps})">+</button>
              </div>
            </div>
          </div>
          <button class="active-workout-log" onclick="logActiveWorkoutSet('${key}','${activeExKey}','${activeParticipant}','${activeExercise.name.replace(/'/g,"\\'")}')">
            <span class="material-symbols-outlined">check_circle</span>
            <span>Log Set ${Math.min(totalLogged + 1, Math.max(activeExercise.sets || 1, 1))} of ${activeExercise.sets || 1}</span>
          </button>
          <div class="active-workout-history">
            <div class="active-workout-history-head">
              <h4>Set History</h4>
              <span>${volume>0 ? `Volume: ${volume}kg` : `${totalLogged} logged set${totalLogged===1?"":"s"}`}</span>
            </div>
            <div class="active-workout-history-list">
              ${setHistory.length ? setHistory.map((set, index)=>`
                <div class="active-set-row">
                  <div>
                    <strong>${String(index+1).padStart(2,"0")}</strong>
                    <span>${set.weight || 0}kg × ${set.reps || 0} reps</span>
                  </div>
                  <span class="material-symbols-outlined">check_circle</span>
                </div>
              `).join("") : `<div class="active-set-row active-set-row-empty"><div><strong>00</strong><span>No sets logged yet</span></div><span class="material-symbols-outlined">hourglass_empty</span></div>`}
            </div>
          </div>
          ${nextExercise ? `
            <button class="active-workout-next" onclick="document.querySelectorAll('.er')[${activeExerciseIndex+1}]?.scrollIntoView({behavior:'smooth',block:'center'})">
              <div>
                <span>Next Exercise</span>
                <strong>${nextExercise.name}</strong>
              </div>
              <em>${nextExercise.sets || 0} sets</em>
            </button>
          ` : ""}
        </section>
      `;
    }

    let h=`${activeWorkoutShell}<div class="ph" style="border-left:4px solid ${day.color}">
      <div class="phl">
        <div class="ph-row1">
          <span class="pl" style="color:${day.color}">${day.label} — ${day.title}</span>
          <span class="ps-inline">${day.subtitle}</span>
        </div>
        <div class="ph-row2">
          <span class="pd-inline">${formatDate(activeDate)}</span>
          ${!isEditable?`<span class="vob">VIEW ONLY</span>${isPastDate?'<button class="vob vob-btn" onclick="unlockActiveDate()">🔓 UNLOCK EXERCISES</button>':''}`:unlockedDates.has(activeDate)?'<span class="vob" style="border-color:rgba(92,186,92,.4);color:#b7f3b7">🔓 UNLOCKED</span>':''}
          ${ton>0?`<span class="ptons-inline">⚡ ${ton}kg</span>`:''}
          ${hasPlateau?`<span class="vob prog-warn">PLATEAU</span>`:''}
          ${hasDeload?`<span class="vob prog-caution">DELOAD RECOMMENDED</span>`:''}
          ${isEditable && trackableParticipants.length>1 ? `<div class="ph-partner">
            <span class="wt-label">TRACK:</span>
            ${trackableParticipants.map(pp=>{
              const pcolor=PROFILES[pp]?.color||'#888';
              const active=participants.includes(pp);
              return `<button class="wt-btn ${active?'wt-active':''}" style="${active?'border-color:'+pcolor+';color:'+pcolor+';background:'+pcolor+'18':''}" onclick="toggleSessionParticipant('${key}','${pp}')">${active?'✓ ':''}${PROFILES[pp]?.label||pp}</button>`;
            }).join('')}
          </div>` : ''}
        </div>
      </div>
      <div class="phr">`;

    // Per-participant bodyweight in header — shown for whoever is in this session
    if(isSharedSession){
      participants.forEach(pp=>{
        const pbw=getPBW(pp,isToday?getTodayStr():activeDate);
        const ptime=getWorkoutTimeEntry(activeDate,key,pp);
        const pcolor=PROFILES[pp]?.color||'#888';
        h+=`<div class="pbwr" style="flex-wrap:wrap">
          <span class="pbwl" style="color:${pcolor}">${PROFILES[pp]?.label[0]||pp[0]}</span>
          <input type="number" class="pbwi" placeholder="—" step="0.1" min="30" max="300" value="${pbw}" ${!isEditable?'disabled':''} onblur="savePBW(this.value,'${pp}','${isToday?getTodayStr():activeDate}')" onkeydown="if(event.key==='Enter'){savePBW(this.value,'${pp}','${isToday?getTodayStr():activeDate}');this.blur()}">
          <span class="pbwu">kg</span>
          <span class="pbwu">·</span>
          <input type="time" class="pbwi" style="width:95px" value="${ptime.at||''}" ${!isEditable?'disabled':''} onblur="saveWorkoutTimeAt('${key}','${pp}',this.value)" onkeydown="if(event.key==='Enter'){saveWorkoutTimeAt('${key}','${pp}',this.value);this.blur()}">
          <input type="number" class="pbwi" style="width:72px" min="0" max="480" step="1" value="${ptime.durationMins||''}" ${!isEditable?'disabled':''} onblur="saveWorkoutDuration('${key}','${pp}',this.value)" onkeydown="if(event.key==='Enter'){saveWorkoutDuration('${key}','${pp}',this.value);this.blur()}">
          <span class="pbwu">min</span>
        </div>`;
      });
    } else {
      const ptime=getWorkoutTimeEntry(activeDate,key,activeProfile);
      h+=`<div class="pbwr">
        <span class="pbwl">⚖️</span>
        <input type="number" class="pbwi" id="panel-bw-input" placeholder="—" step="0.1" min="30" max="300" value="${bw}" ${!isEditable?'disabled':''} onblur="saveBwDate(this.value,'${isToday?getTodayStr():activeDate}')" onkeydown="if(event.key==='Enter'){saveBwDate(this.value,'${isToday?getTodayStr():activeDate}');this.blur()}">
        <span class="pbwu">kg</span>
      </div>`;
      h+=`<div class="pbwr">
        <span class="pbwl">🕒</span>
        <input type="time" class="pbwi" style="width:95px" value="${ptime.at||''}" ${!isEditable?'disabled':''} onblur="saveWorkoutTimeAt('${key}','${activeProfile}',this.value)" onkeydown="if(event.key==='Enter'){saveWorkoutTimeAt('${key}','${activeProfile}',this.value);this.blur()}">
        <input type="number" class="pbwi" style="width:72px" min="0" max="480" step="1" value="${ptime.durationMins||''}" ${!isEditable?'disabled':''} onblur="saveWorkoutDuration('${key}','${activeProfile}',this.value)" onkeydown="if(event.key==='Enter'){saveWorkoutDuration('${key}','${activeProfile}',this.value);this.blur()}">
        <span class="pbwu">min</span>
      </div>`;
    }

    if(isToday){
      h+=`<div class="ptr">
        <span class="ptl">⏱</span>
        <span id="session-display" class="ptv">00:00</span>
        <button id="timer-play" class="tcb" onclick="startSessionTimer()" title="Start">▶</button>
        <button id="timer-pause" class="tcb" style="display:none" onclick="pauseSessionTimer()" title="Pause">⏸</button>
        <button class="tcb" onclick="saveTrackedTime('${key}','${activeProfile}')" title="Save timer to my duration">💾</button>
        <button class="tcb" onclick="resetSessionTimer()" title="Reset">↺</button>
      </div>`;
    }

    h+=`<div class="prw">
        <div class="pbar"><div class="pbarf" style="width:${pct}%;background:${day.color}"></div></div>
        <span class="pp" style="color:${day.color}">${pct}%</span>
      </div>
    </div>
    </div>
    <div class="pct" onclick="toggleCollapse()">${panelCollapsed?'▼ SHOW EXERCISES':'▲ HIDE EXERCISES'}</div>`;

    if(!panelCollapsed){
      // ── DUAL-USER EXERCISE TABLE ──
      if(isSharedSession){
        // Header row
        h+=`<div class="exh exh-dual">
          <span style="width:20px"></span>
          <span class="exhc" style="flex:1">EXERCISE</span>
          ${participants.map(pp=>`<span class="exhc exhc-user" style="color:${PROFILES[pp]?.color}">${PROFILES[pp]?.label}</span>`).join('')}
          <span class="exhc" style="width:28px;text-align:center">⇄</span>
        </div>`;
        h+=`<div class="el">`;
        day.exercises.forEach((ex,i)=>{
          const ic=ex.sets===0;
          const displayName=ex.name;
          // Check if any participant hit PR
          const anyPR=participants.some(pp=>{
            const pr=getPRRecord(pp,ex.name);
            const {data:ed}=getExData(wo.exercises,pp,ex.name);
            return pr?.weight>0&&parseFloat(ed?.weight||0)>=pr.weight&&ed?.checked;
          });

          // Checkbox: checked if ALL participants have checked it (or just show compound state)
          const allChecked=participants.every(pp=>getExData(wo.exercises,pp,ex.name).data?.checked);
          const anyChecked=participants.some(pp=>getExData(wo.exercises,pp,ex.name).data?.checked);

          const exId=getExerciseAnimId(ex);
          h+=`<div class="er er-dual ${allChecked?'done':''}" data-exid="${exId}" ondragover="onExerciseDragOver(event)" ondragleave="onExerciseDragLeave(event)" ondrop="onExerciseDrop(event,'${key}',${i})">
            <div class="enc-dual">
              <span class="en" onclick="showExerciseHistory('${displayName.replace(/'/g, "\\'")}')" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(232,93,4,0.3);text-underline-offset:2px">${displayName}${anyPR?`<span class="prb">🏆 PR</span>`:''}</span>
              <span class="et-target">${ic?ex.reps:`${ex.sets}×${ex.reps}`}</span>
              <button class="drh" ${!isEditable?'disabled':''} draggable="${isEditable?'true':'false'}" ondragstart="startExerciseDrag(event,'${key}',${i})" ondragend="endExerciseDrag(event)" title="Hold and drag to reorder">⋮⋮</button>
            </div>
            <div class="participants-cols">
              ${participants.map(pp=>{
                const {key:exKey,data:_rd}=getExData(wo.exercises,pp,ex.name); const ed=_rd||{checked:false,weight:"",actualReps:""};
                const lw=ic?null:getLastWeight(key,ex.name,pp);
                const ol=ic?null:getOverloadSuggestion(key,ex,pp);
                const pi=ic?null:getProgressInsight(key,ex,pp);
                const warm=ic?"":getWarmupSuggestion(ed.weight||lw?.weight||0);
                const dis=!isEditable?'disabled':'';
                const pcolor=PROFILES[pp]?.color||'#888';
                return `<div class="pcol" style="--pcolor:${pcolor}">
                  <label class="eck"><input type="checkbox" ${ed.checked?'checked':''} ${dis} onchange="togEx('${key}','${exKey}',this.checked)"><span class="ecm" style="--c:${pcolor}"></span></label>
                  ${ic?`<span class="et" style="color:#555">—</span><span class="et" style="color:#555">—</span>`:
                  `<input type="number" class="ari" placeholder="${ex.reps}" value="${ed.actualReps||''}" ${dis} onchange="setReps('${key}','${exKey}',this.value)" onblur="setReps('${key}','${exKey}',this.value)">
                   <div class="ww"><input type="number" class="wi" placeholder="—" value="${ed.weight||''}" ${dis} onchange="setWt('${key}','${exKey}',this.value,'${pp}')" onblur="setWt('${key}','${exKey}',this.value,'${pp}')"><span class="wu">kg</span></div>`}
                  ${ol?`<div class="olb-sm">⬆${ol.suggestedWeight}kg</div>`:lw?`<div class="lwh-sm">↑${lw.weight}kg</div>`:''}
                  ${!ol&&pi?.kind==="next"?`<div class="olb-sm">NEXT ${pi.suggestedWeight}kg</div>`:''}
                  ${pi?.kind==="plateau"?`<div class="plt-sm">PLATEAU</div>`:''}
                  ${warm?`<div class="wup-sm">WU ${warm}</div>`:''}
                </div>`;
              }).join('')}
            </div>
            <button class="sb" ${!isEditable?'disabled':''} onclick="openSwap('${key}',${i})">⇄</button>
          </div>`;
        });
        h+=`</div>`;
      } else {
        // ── SINGLE-USER EXERCISE TABLE (original style + move buttons) ──
        h+=`<div class="exh">
          <span style="width:20px"></span>
          <span class="exhc" style="flex:1">EXERCISE</span>
          <span class="exhc" style="width:60px;text-align:center">TARGET</span>
          <span class="exhc" style="width:60px;text-align:center">ACTUAL</span>
          <span class="exhc" style="width:70px;text-align:center">WEIGHT</span>
          <span class="exhc" style="width:28px;text-align:center">⇄</span>
        </div><div class="el">`;
        day.exercises.forEach((ex,i)=>{
          const part=participants[0]||activeProfile;
          const {key:exKey,data:_exd}=getExData(wo.exercises,part,ex.name); const ed=_exd||{checked:false,weight:"",actualReps:""};
          const displayName=ed.customName||ex.name;
          const ic=ex.sets===0;
          const pr=getPRRecord(part,ex.name);
          const isPR=pr?.weight>0&&parseFloat(ed.weight||0)>=pr.weight&&ed.checked;
          const prb=isPR?`<span class="prb">🏆 PR</span>`:'';
          const lw=ic?null:getLastWeight(key,ex.name,part);
          const lwh=lw?`<span class="lwh">↑${lw.weight}kg</span>`:'';
          const ol=ic?null:getOverloadSuggestion(key,ex,part);
          const olb=ol?`<span class="olb">⬆ Try ${ol.suggestedWeight}kg</span>`:'';
          const pi=ic?null:getProgressInsight(key,ex,part);
          const pib=!ol&&pi?.kind==="next"?`<span class="olb">NEXT ${pi.suggestedWeight}kg</span>`:'';
          const plb=pi?.kind==="plateau"?`<span class="plt">PLATEAU</span>`:'';
          const warm=ic?"":getWarmupSuggestion(ed.weight||lw?.weight||0);
          const wup=warm?`<div class="wup">WU ${warm}</div>`:'';
          const dis=!isEditable?'disabled':'';
          const exId=getExerciseAnimId(ex);
          h+=`<div class="er ${ed.checked?'done':''}" data-exid="${exId}" ondragover="onExerciseDragOver(event)" ondragleave="onExerciseDragLeave(event)" ondrop="onExerciseDrop(event,'${key}',${i})">
            <label class="eck"><input type="checkbox" ${ed.checked?'checked':''} ${dis} onchange="togEx('${key}','${exKey}',this.checked)"><span class="ecm" style="--c:${day.color}"></span></label>
            <div class="enc">
              <span class="en" onclick="showExerciseHistory('${displayName.replace(/'/g, "\\'")}')" style="cursor:pointer;text-decoration:underline;text-decoration-color:rgba(232,93,4,0.3);text-underline-offset:2px">${displayName}${prb}</span>
              ${olb||lwh||pib||plb?`<div class="ehi">${olb}${pib}${plb}${!ol&&!pib?lwh:''}</div>`:''}
              ${wup}
            </div>
            <span class="et">${ic?ex.reps:`${ex.sets}×${ex.reps}`}</span>
            ${ic?`<span class="et" style="color:#555">—</span>`:`<input type="number" class="ari" placeholder="${ex.reps}" value="${ed.actualReps||''}" ${dis} onchange="setReps('${key}','${exKey}',this.value)" onblur="setReps('${key}','${exKey}',this.value)">`}
            ${ic?`<span class="et" style="color:#555">—</span>`:`<div class="ww"><input type="number" class="wi" placeholder="—" value="${ed.weight||''}" ${dis} onchange="setWt('${key}','${exKey}',this.value,'${part}')" onblur="setWt('${key}','${exKey}',this.value,'${part}')"><span class="wu">kg</span></div>`}
            <div class="er-actions">
              <button class="sb" ${dis} onclick="openSwap('${key}',${i})">⇄</button>
              <button class="drh" ${dis} draggable="${!isEditable?'false':'true'}" ondragstart="startExerciseDrag(event,'${key}',${i})" ondragend="endExerciseDrag(event)" title="Hold and drag to reorder">⋮⋮</button>
            </div>
          </div>`;
        });
        h+=`</div>`;
      }

      if(day.notes){
        h+=`<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.02);border-left:2px solid ${day.color};border-radius:3px"><span style="color:var(--muted);font-size:.8rem">📝 NOTES</span><div style="margin-top:6px;color:#bbb;font-size:.9em;line-height:1.5">${day.notes}</div></div>`;
      }

      // ── SESSION NOTES (optional, pre-mark-done) ──
      if(isEditable){
        const sessionNote=wo.notes||"";
        h+=`<div class="snote-wrap">
          <div class="snote-label">📝 SESSION NOTE <span style="color:var(--muted);font-size:.7em;letter-spacing:.05em">— OPTIONAL</span></div>
          <textarea class="snote-input" id="snote-${key}" placeholder="How did this session feel? Any observations..." ${!isEditable?'disabled':''}>${sessionNote}</textarea>
          <button class="snote-save" onclick="saveSessionNote('${key}')" ${!isEditable?'disabled':''}>SAVE NOTE</button>
        </div>`;
      } else if(wo.notes){
        h+=`<div class="snote-wrap snote-ro">
          <div class="snote-label">📝 SESSION NOTE</div>
          <div class="snote-text">${wo.notes}</div>
        </div>`;
      }
      if(wo.done && wo.sessionMeta){
        const sm=wo.sessionMeta||{};
        const rpe=sm.rpe?`RPE ${sm.rpe}`:"";
        const pain=(sm.painLevel&&sm.painLevel!=="none")?`Pain: ${sm.painLevel}${sm.painArea?` (${sm.painArea})`:''}`:"";
        if(rpe||pain){
          h+=`<div class="snote-wrap snote-ro" style="margin-top:8px">
            <div class="snote-label">✅ FINISH SNAPSHOT</div>
            <div class="snote-text">${[rpe,pain].filter(Boolean).join(" • ")}</div>
          </div>`;
        }
      }

      h+=`<button class="donebtn ${wo.done?'da':''}" style="--c:${day.color}" onclick="markDone('${key}')">${wo.done?'✓ COMPLETED':'MARK AS DONE'}</button>`;
    }
    panel.innerHTML=h; panel.style.display="block"; updateTimerBtns(); syncWorkoutFocusState();
  }

  // ── Per-participant bodyweight ──
  function getPBW(participant, date){
    const key=getWeightEntryKey(participant,date);
    if(participant===activeProfile) return state.bodyweight?.[key]||"";
    return state.allUserWorkouts?.[participant]?.bodyweight?.[key] || window._otherBW?.[participant]?.[key] || "";
  }
  window.savePBW=async function(val,participant,date){
    const w=parseFloat(val); if(!w||w<20||w>300)return;
    const key=getWeightEntryKey(participant,date);
    const weighMode=getWeighMode(participant);
    if(participant===activeProfile){
      if(!state.bodyweight)state.bodyweight={};
      state.bodyweight[key]=w;
    } else {
      // Save via a dedicated key in firebase for that participant
      if(!window._otherBW) window._otherBW={};
      if(!window._otherBW[participant]) window._otherBW[participant]={};
      window._otherBW[participant][key]=w;
      // Save directly to Firebase merge path
      try {
        await setDoc(doc(db,"ironlog",SHARED_DOC),{
          profileData:{
            [participant]:{
              bodyweight:{[key]:w}
            }
          },
          [`profileData.${participant}`]: null
        },{merge:true});
        toast(`⚖️ ${PROFILES[participant].label}: ${w}kg (${weighMode})`);
        return;
      } catch(e){}
    }
    renderCharts(); await saveData(); toast(`⚖️ ${PROFILES[participant]?.label||participant}: ${w}kg (${weighMode})`);
  };

  function getExerciseAnimId(ex){
    if(!ex || typeof ex!=="object") return "";
    if(!Object.prototype.hasOwnProperty.call(ex,"_animId")){
      const id=`ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      try{
        Object.defineProperty(ex,"_animId",{value:id,writable:true,configurable:true,enumerable:false});
      }catch(e){
        ex._animId=id;
      }
    }
    return ex._animId;
  }

  // ── LIVE EXERCISE REORDER ──
  window.moveExLive=async function(key,index,dir){
    const exs=WORKOUT_PLAN[key].exercises;
    const ni=index+dir;
    if(ni<0||ni>=exs.length)return;

    const panelBefore=document.getElementById("day-panel");
    const firstPos=new Map();
    if(panelBefore){
      panelBefore.querySelectorAll(".el .er[data-exid]").forEach(row=>{
        firstPos.set(row.dataset.exid,row.getBoundingClientRect().top);
      });
    }

    [exs[index],exs[ni]]=[exs[ni],exs[index]];
    const sy=window.scrollY;
    renderDayPanel(key);
    window.scrollTo(0,sy);

    const panelAfter=document.getElementById("day-panel");
    if(panelAfter && firstPos.size){
      panelAfter.querySelectorAll(".el .er[data-exid]").forEach(row=>{
        const prevTop=firstPos.get(row.dataset.exid);
        if(prevTop===undefined) return;
        const dy=prevTop-row.getBoundingClientRect().top;
        if(Math.abs(dy)<1) return;
        row.style.transition="none";
        row.style.transform=`translateY(${dy}px)`;
        requestAnimationFrame(()=>{
          row.style.transition="transform .24s cubic-bezier(.22,.61,.36,1)";
          row.style.transform="translateY(0)";
        });
        row.addEventListener("transitionend",()=>{
          row.style.transition="";
          row.style.transform="";
        },{once:true});
      });
    }

    await saveData();
  };
  let dragExerciseFrom=null;
  window.startExerciseDrag=function(e,key,index){
    dragExerciseFrom={key,index};
    if(e.dataTransfer){
      e.dataTransfer.effectAllowed="move";
      e.dataTransfer.setData("text/plain",`${key}:${index}`);
    }
    const row=e.target.closest(".er");
    if(row) row.classList.add("dragging");
  };
  window.endExerciseDrag=function(e){
    document.querySelectorAll(".er.dragging,.er.drag-over").forEach(el=>el.classList.remove("dragging","drag-over"));
    dragExerciseFrom=null;
  };
  window.onExerciseDragOver=function(e){
    e.preventDefault();
    const row=e.currentTarget?.closest(".er");
    if(row) row.classList.add("drag-over");
    if(e.dataTransfer) e.dataTransfer.dropEffect="move";
  };
  window.onExerciseDragLeave=function(e){
    const row=e.currentTarget?.closest(".er");
    if(row) row.classList.remove("drag-over");
  };
  window.onExerciseDrop=async function(e,key,toIndex){
    e.preventDefault();
    const row=e.currentTarget?.closest(".er");
    if(row) row.classList.remove("drag-over");
    let from=dragExerciseFrom;
    const raw=e.dataTransfer?.getData("text/plain");
    if(raw&&raw.includes(":")){
      const [k,i]=raw.split(":");
      from={key:k,index:parseInt(i,10)};
    }
    if(!from||from.key!==key||!Number.isInteger(from.index)) return;
    const exs=WORKOUT_PLAN[key]?.exercises;
    if(!exs) return;
    const fromIndex=from.index;
    if(fromIndex===toIndex||fromIndex<0||fromIndex>=exs.length||toIndex<0||toIndex>=exs.length) return;
    const [moved]=exs.splice(fromIndex,1);
    const insertAt=fromIndex<toIndex?toIndex-1:toIndex;
    exs.splice(insertAt,0,moved);
    dragExerciseFrom=null;
    const sy=window.scrollY;
    renderDayPanel(key);
    window.scrollTo(0,sy);
    await saveData();
  };

  // ── SESSION NOTE ──
  window.saveSessionNote=async function(key){
    const el=document.getElementById(`snote-${key}`); if(!el)return;
    const wo=getWorkout(activeDate,key);
    wo.notes=el.value.trim();
    await saveData(); toast("📝 Note saved");
  };
  window.openQuickFinish=function(key){
    const wo=getWorkout(activeDate,key);
    const sm=wo.sessionMeta||{};
    const m=document.getElementById("qfm");
    if(!m) return;
    m.dataset.key=key;
    document.getElementById("qfm-rpe").value=sm.rpe||"";
    document.getElementById("qfm-pain-level").value=sm.painLevel||"none";
    document.getElementById("qfm-pain-area").value=sm.painArea||"";
    document.getElementById("qfm-note").value=sm.finishNote||"";
    selectedRPE = sm.rpe || null;
    selectedPain = sm.painLevel || "none";
    document.querySelectorAll(".rpe-tile").forEach(tile=>{
      tile.classList.toggle("selected", Number(tile.dataset.value) === Number(selectedRPE));
    });
    document.querySelectorAll(".pain-pill").forEach(tile=>{
      tile.classList.toggle("selected", tile.dataset.value === selectedPain);
    });
    m.style.display="flex";
  };
  window.closeQuickFinish=function(){
    const m=document.getElementById("qfm");
    if(m) m.style.display="none";
  };
  window.confirmQuickFinish=async function(){
    const m=document.getElementById("qfm");
    const key=m?.dataset?.key;
    if(!key) return;
    const wo=getWorkout(activeDate,key);
    const rpe=parseFloat(document.getElementById("qfm-rpe")?.value||selectedRPE||0);
    const painLevel=(document.getElementById("qfm-pain-level")?.value||selectedPain||"none").trim();
    const painArea=(document.getElementById("qfm-pain-area")?.value||"").trim();
    const finishNote=(document.getElementById("qfm-note")?.value||"").trim();
    wo.sessionMeta={
      ...(wo.sessionMeta||{}),
      rpe: rpe>0?Math.max(1,Math.min(10,Math.round(rpe*10)/10)):null,
      painLevel,
      painArea,
      finishNote,
      updatedAt:new Date().toISOString()
    };
    if(finishNote && !wo.notes) wo.notes=finishNote;
    closeQuickFinish();
    await window.markDone(key,true);
  };

  window.toggleCollapse=function(){ panelCollapsed=!panelCollapsed; if(activeDay)renderDayPanel(activeDay); };
  function formatDate(s){ return new Date(s+"T12:00:00").toLocaleDateString("en-ZA",{weekday:"long",day:"numeric",month:"long"}).toUpperCase(); }

  function renderDateSummary(ds){
    const panel=document.getElementById("day-panel");
    const wd=state.workouts?.[ds];
    const h=ensureHealthEntry(ds, activeProfile);
    const p=PROFILES[activeProfile];
    const wt=p.water||2.5, pt=p.protein||120;
    const wp=Math.min(100,Math.round((h.water/wt)*100)), pp=Math.min(100,Math.round((h.protein/pt)*100));
    const ac=p.color;
    if(!wd||!Object.values(wd).some(x=>x.done)){
      panel.innerHTML=`<div class="ph" style="border-left:4px solid #888"><div class="phl"><span class="pl" style="color:#888">NO WORKOUT</span><span class="pd-inline">${formatDate(ds)}</span></div></div>`;
    } else {
      let h_content=`<div class="ph" style="border-left:4px solid ${ac}"><div class="phl">
        <span class="pl" style="color:${ac}">WORKOUT SUMMARY</span>
        <span class="pd-inline">${formatDate(ds)}</span>
      </div></div>`;
      Object.keys(wd).forEach(key=>{
        const wo=wd[key]; if(!wo.done) return;
        const day=WORKOUT_PLAN[key]; if(!day) return;
        const ton=calcSessionTonnage(ds,key);
        const parts=day.participants||['revan'];
        h_content+=`<div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.02);border-radius:6px;border-left:3px solid ${day.color}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="color:${day.color};font-weight:600;font-family:'Barlow Condensed'">🏋️ ${day.label} — ${day.title}</span>
            ${ton>0?`<span style="color:#aaa;font-size:0.9em">⚡ ${ton}kg</span>`:''}
          </div>`;
        day.exercises.forEach(ex=>{
          parts.forEach(pp=>{
            const {data:ed}=getExData(wo.exercises,pp,ex.name);
            if(!ed||!ed.checked) return;
            const pcolor=PROFILES[pp]?.color||'#aaa';
            const displayName=ed.customName||ex.name;
            h_content+=`<div style="padding:4px 0;font-size:0.85em;color:#bbb;display:flex;justify-content:space-between;align-items:center">
              <span>• ${displayName} <span style="color:${pcolor};font-size:.8em">${parts.length>1?PROFILES[pp]?.label:''}</span></span>
              <span style="color:#aaa;font-family:'Courier New'"><strong>${ed.weight||'—'}</strong>kg ${ed.actualReps||ex.reps}</span>
            </div>`;
          });
        });
        if(wo.notes) h_content+=`<div style="margin-top:8px;padding:7px 9px;background:rgba(255,255,255,.03);border-left:2px solid ${day.color};color:#aaa;font-size:.85em;font-style:italic">📝 ${wo.notes}</div>`;
        h_content+=`</div>`;
      });
      h_content+=`<div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.02);border-radius:6px">
        <div style="font-weight:600;color:${ac};margin-bottom:10px;font-family:'Barlow Condensed';font-size:0.95em">📊 HEALTH DATA</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.9em">
          <div><span style="color:#888">💧 Water</span><div style="color:${ac};font-weight:600">${h.water.toFixed(2)}L / ${wt}L</div><div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:4px"><div style="height:100%;width:${wp}%;background:${ac};border-radius:2px"></div></div></div>
          <div><span style="color:#888">🥩 Protein</span><div style="color:${ac};font-weight:600">${h.protein}g / ${pt}g</div><div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:4px"><div style="height:100%;width:${pp}%;background:${ac};border-radius:2px"></div></div></div>
          <div><span style="color:#888">🧪 Creatine</span><div style="color:${h.creatine?'#7dd87d':'#888'};font-weight:600">${h.creatine?'✓ TAKEN':'NOT TAKEN'}</div></div>
          <div><span style="color:#888">🧬 Aminos</span><div style="color:${h.aminos?'#7dd87d':'#888'};font-weight:600">${h.aminos?'✓ TAKEN':'NOT TAKEN'}</div></div>
        </div>
      </div>`;
      panel.innerHTML=h_content;
    }
    panel.style.display="block";
    syncWorkoutFocusState();
  }
  function formatHistoryDayName(ds){
    return new Date(`${ds}T12:00:00`).toLocaleDateString("en-ZA",{weekday:"long"});
  }
  function formatHistoryMonthLabel(ds){
    return new Date(`${ds}T12:00:00`).toLocaleDateString("en-ZA",{month:"long",year:"numeric"}).toUpperCase();
  }
  function formatClockLabel(value){
    if(!value || !/^\d{2}:\d{2}$/.test(String(value))) return "";
    const [hh, mm] = String(value).split(":").map(Number);
    const d = new Date();
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d.toLocaleTimeString("en-ZA",{hour:"numeric",minute:"2-digit"});
  }
  function getSessionTimeLabel(ds, key){
    const timeEntry = getWorkoutTimeEntry(ds, key, activeProfile) || {};
    const at = formatClockLabel(timeEntry.at || "");
    const mins = parseInt(timeEntry.durationMins || timeEntry.trackedMins || 0, 10) || 0;
    if(at && mins > 0){
      const [hh, mm] = String(timeEntry.at).split(":").map(Number);
      const end = new Date(`${ds}T12:00:00`);
      end.setHours(hh || 0, mm || 0, 0, 0);
      end.setMinutes(end.getMinutes() + mins);
      return `${at} - ${end.toLocaleTimeString("en-ZA",{hour:"numeric",minute:"2-digit"})}`;
    }
    if(at) return at;
    if(mins > 0) return `${mins} mins`;
    return "Time not logged";
  }
  function getHistoryExerciseLines(ds, key){
    const wo = state.workouts?.[ds]?.[key];
    const day = WORKOUT_PLAN[key];
    if(!wo || !day) return [];
    return (day.exercises || []).map(ex=>{
      const { data } = getExData(wo.exercises || {}, activeProfile, ex.name);
      if(!data) return null;
      const hasActivity = data.checked || parseFloat(data.weight || 0) > 0 || parseFloat(data.actualReps || 0) > 0 || (Array.isArray(data.coverSets) && data.coverSets.length);
      if(!hasActivity) return null;
      const setsLogged = Array.isArray(data.coverSets) && data.coverSets.length ? data.coverSets.length : (data.checked ? getExerciseTargetSets(ex) : 0);
      const weight = parseFloat(data.weight || 0);
      const reps = parseInt(data.actualReps || ex.reps || 0, 10) || 0;
      let meta = `${Math.max(setsLogged, ex.sets || 0)} sets`;
      if(weight > 0) meta += ` × ${weight} kg`;
      else if(reps > 0) meta += ` × ${reps} reps`;
      return { name: data.customName || ex.name, meta };
    }).filter(Boolean);
  }
  function getDayPrCount(ds, key){
    return Object.keys(state.prs || {}).filter(prKey=>{
      const pr = state.prs?.[prKey];
      const participant = pr?.participant || (String(prKey).includes("_") ? String(prKey).split("_")[0] : activeProfile);
      return participant === activeProfile && pr?.date === ds && pr?.dayKey === key;
    }).length;
  }
  function getCalendarDayEntries(ds){
    return Object.keys(state.workouts?.[ds] || {}).map(key=>{
      const wo = state.workouts?.[ds]?.[key];
      const day = WORKOUT_PLAN[key];
      if(!wo || !day) return null;
      if(!sessionHasActivityForParticipant(wo, key, activeProfile)) return null;
      const exerciseLines = getHistoryExerciseLines(ds, key);
      return {
        key,
        wo,
        day,
        note: wo.notes || "",
        tonnage: calcSessionTonnage(ds, key),
        exercises: exerciseLines.length,
        exerciseLines,
        prCount: getDayPrCount(ds, key),
        timeLabel: getSessionTimeLabel(ds, key),
        durationMins: parseInt(getWorkoutTimeEntry(ds, key, activeProfile)?.durationMins || 0, 10) || 0
      };
    }).filter(Boolean);
  }
  function renderHistorySelectedSession(ds=activeDate){
    const el = document.getElementById("history-selected-session");
    if(!el) return;
    const entries = getCalendarDayEntries(ds);
    const dayName = formatHistoryDayName(ds);
    const title = new Date(`${ds}T12:00:00`).toLocaleDateString("en-ZA",{month:"long",day:"numeric"}).toUpperCase();
    const cards = entries.length ? entries.map(entry=>`
      <article class="history-session-card" style="border-left-color:${entry.day.color}">
        <div class="history-session-body">
          <div class="history-session-head">
            <div>
              <div class="history-session-title">${entry.day.title}${entry.day.subtitle ? `: ${entry.day.subtitle}` : ""}</div>
              <div class="history-session-time"><span class="material-symbols-outlined">schedule</span>${entry.timeLabel}</div>
            </div>
            <div class="history-session-actions">
              <button type="button" aria-label="Edit session" onclick="openCalendarDayWorkout('${ds}','${entry.key}')"><span class="material-symbols-outlined">edit</span></button>
              <button type="button" class="delete" aria-label="Delete session" onclick="deleteWorkoutHistoryEntry('${ds}','${entry.key}')"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>
          <div class="history-metric-grid">
            <div class="history-metric-card"><span>Total Volume</span><strong style="color:${entry.day.color}">${entry.tonnage.toLocaleString()} <em>KG</em></strong></div>
            <div class="history-metric-card"><span>Duration</span><strong>${entry.durationMins || "—"} <em>${entry.durationMins ? "MINS" : ""}</em></strong></div>
            <div class="history-metric-card"><span>Exercises</span><strong>${entry.exercises} <em>TOTAL</em></strong></div>
            <div class="history-metric-card"><span>Personal Records</span><strong style="color:${entry.prCount ? "#ffd166" : "var(--text)"}">${entry.prCount} <em>NEW</em></strong></div>
          </div>
          <div class="history-exercise-list">
            ${(entry.exerciseLines.length ? entry.exerciseLines.slice(0,4) : [{name:"No exercise lines logged",meta:""}]).map(line=>`
              <div class="history-exercise-row">
                <div><span class="history-exercise-dot"></span><span class="history-exercise-name">${line.name}</span></div>
                <span class="history-exercise-meta">${line.meta || ""}</span>
              </div>
            `).join("")}
            ${entry.note ? `<div class="calendar-day-entry-copy"><p>${entry.note}</p></div>` : ""}
          </div>
        </div>
        <div class="history-session-image"><img src="${STITCH_ASSETS.activeWorkout}" alt="Workout session background"></div>
      </article>
    `).join("") : `<div class="history-empty-card">No workout activity is logged for this day yet. Select a different date or complete a session to populate history here.</div>`;
    el.innerHTML = `
      <div class="history-selected-head">
        <div>
          <span class="history-selected-kicker">Selected Session</span>
          <div class="history-selected-title">${title}</div>
        </div>
        <div class="history-selected-dayname">${dayName}</div>
      </div>
      ${cards}
    `;
  }
  function renderHistoryMonthSummary(ds=activeDate){
    const el = document.getElementById("history-month-summary");
    if(!el) return;
    const current = new Date(`${ds}T12:00:00`);
    const yr = current.getFullYear();
    const mo = current.getMonth();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    let planned = 0;
    let completed = 0;
    for(let day=1; day<=daysInMonth; day++){
      const date = new Date(yr, mo, day, 12);
      const dateStr = date.toISOString().split("T")[0];
      const weekday = date.getDay();
      sortedDayKeys().forEach(key=>{
        const workout = WORKOUT_PLAN[key];
        if(!workout?.participants?.includes(activeProfile)) return;
        if(getWorkoutWeekdaySortValue(workout) !== getWorkoutWeekdaySortValue({weekday})) return;
        planned++;
        if(sessionHasActivityForParticipant(state.workouts?.[dateStr]?.[key], key, activeProfile)) completed++;
      });
    }
    const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
    const band = pct >= 75 ? "High" : pct >= 50 ? "Medium" : "Low";
    el.innerHTML = `
      <div class="history-summary-label">Month Summary</div>
      <div class="history-summary-card">
        <div style="position:relative">
          <div class="history-ring" style="--pct:${pct}"></div>
          <div class="history-ring-value">${pct}%</div>
        </div>
        <div class="history-summary-copy">
          <span>Consistency</span>
          <strong>${band}</strong>
          <p>You've hit <strong>${completed}/${planned || 0}</strong> planned sessions in ${formatHistoryMonthLabel(ds)}.</p>
        </div>
      </div>
    `;
  }
  window.closeCalendarDayModal=function(){
    const modal = document.getElementById("calendar-day-modal");
    if(modal) modal.style.display = "none";
    calendarDayModalDate = "";
  };
  window.openCalendarDayWorkout=function(ds,key){
    activeDate = ds;
    selectDay(key);
  };
  window.deleteWorkoutHistoryEntry=async function(ds,key){
    if(!state.workouts?.[ds]?.[key]) return;
    const dayTitle = WORKOUT_PLAN[key]?.title || key;
    if(!confirm(`Delete ${dayTitle} from ${formatDate(ds)}?`)) return;
    delete state.workouts[ds][key];
    if(Object.keys(state.workouts[ds]).length===0) delete state.workouts[ds];
    Object.keys(state.prs || {}).forEach(prKey=>{
      const pr = state.prs?.[prKey];
      if(pr?.date === ds && pr?.dayKey === key) delete state.prs[prKey];
    });
    if(activeDay===key && activeDate===ds){
      activeDay = null;
      const panel = document.getElementById("day-panel");
      if(panel) panel.style.display = "none";
    }
    await saveData();
    renderDayGrid();
    renderAll();
    selectDate(ds);
  };

  // ─── ACTIONS ───
  function unlockDateForEditing(ds){
    if(ds>=getTodayStr()) return;
    unlockedDates.add(ds);
    activeDate=ds;
    renderCalendar();
    if(activeDay){ const sy=window.scrollY; renderDayPanel(activeDay); window.scrollTo(0,sy); }
    else { renderDateSummary(ds); }
    toast(`🔓 ${ds} unlocked for editing`);
  }
  window.unlockDate=function(e, ds){
    e.stopPropagation();
    unlockDateForEditing(ds);
  };
  window.unlockActiveDate=function(){
    unlockDateForEditing(activeDate);
  };
  window.selectDate=function(ds){
    activeDate=ds; activeDay=null;
    document.querySelectorAll(".day-card").forEach(c=>c.classList.remove("active"));
    syncWorkoutFocusState();
    hideCoverPlayer();
    renderCalendar(); renderHistorySelectedSession(ds); renderHistoryMonthSummary(ds);
  };
  window.selectDay=function(key){
    activeDay=key; panelCollapsed=false;
    document.querySelectorAll(".day-card").forEach(c=>c.classList.remove("active"));
    document.getElementById(`card-${key}`)?.classList.add("active");
    renderDayPanel(key);
    setMobileSection("workouts");
    if(isCoverScreen()) initCoverPlayerForDay(key);
  };
  window.startWorkout=async function(key){
    if(!WORKOUT_PLAN[key]) return;
    activeDate = getTodayStr();
    const prefilled = prefillWorkoutFromHistory(activeDate, key);
    selectDay(key);
    startSessionTimer();
    if(isCoverScreen()) initCoverPlayerForDay(key);
    if(prefilled > 0){
      await saveData();
      toast(`⚡ Prefilled ${prefilled} fields from last session`);
    }
    requestAnimationFrame(()=>{
      document.getElementById("day-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  };
  window.adjustActiveWorkoutValue=async function(key, exKey, field, delta, fallback){
    const wo=getWorkout(activeDate,key);
    if(!wo.exercises[exKey]) wo.exercises[exKey]={};
    const entry=wo.exercises[exKey];
    const base=field==="weight"
      ? parseFloat(entry.weight||fallback||0)
      : parseFloat(entry.actualReps||fallback||0);
    let next=(Number.isFinite(base)?base:0)+delta;
    if(field==="weight"){
      next=Math.max(0,Math.round(next*100)/100);
      entry.weight=String(next);
    } else {
      next=Math.max(0,Math.round(next));
      entry.actualReps=String(next);
    }
    renderDayPanel(key);
    await saveData();
  };
  function getExerciseCompletionState(wo, participants, exerciseName){
    const states = participants.map(pp=>Boolean(getExData(wo.exercises,pp,exerciseName).data?.checked));
    return {
      allDone: states.length>0 && states.every(Boolean),
      anyDone: states.some(Boolean),
      doneCount: states.filter(Boolean).length,
      totalCount: states.length
    };
  }
  window.finishActiveExercise=async function(key, participant, exerciseName){
    const wo=getWorkout(activeDate,key);
    const {key:exKey,data:entryRaw}=getExData(wo.exercises,participant,exerciseName);
    const entry=entryRaw||{};
    if(!wo.exercises[exKey]) wo.exercises[exKey]={};
    const target=wo.exercises[exKey];
    const weight=parseFloat(target.weight||entry.weight||0) || 0;
    const reps=parseInt(target.actualReps||entry.actualReps||0,10) || 0;
    if(!Array.isArray(target.coverSets)) target.coverSets=[];
    target.coverSets.push({weight,reps,ts:Date.now()});
    const planned = WORKOUT_PLAN[key]?.exercises?.find(ex=>ex.name===exerciseName);
    const targetSets = getExerciseTargetSets(planned);
    const loggedSets = target.coverSets.length;
    target.checked = loggedSets >= targetSets;
    const cleanName=String(exerciseName||"").replace(/'/g,"");
    if(target.checked && weight>0 && checkPR(exKey,weight,key,activeDate,participant||activeProfile)){
      toast(`🏆 NEW PR — ${cleanName} @ ${weight}kg!`);
    } else if(target.checked) {
      toast(`✓ ${PROFILES[participant]?.label||participant}: ${cleanName} complete`);
    } else {
      toast(`✓ ${PROFILES[participant]?.label||participant}: set ${loggedSets}/${targetSets}`);
    }
    renderDayPanel(key);
    renderStats();
    renderCharts();
    renderCalendar();
    await saveData();
  };
  window.reopenExerciseForParticipant=async function(key, participant, exerciseName){
    const wo=getWorkout(activeDate,key);
    const {key:exKey}=getExData(wo.exercises,participant,exerciseName);
    if(!wo.exercises[exKey]) return;
    wo.exercises[exKey].checked=false;
    const planned = WORKOUT_PLAN[key]?.exercises?.find(ex=>ex.name===exerciseName);
    const targetSets = getExerciseTargetSets(planned);
    if(Array.isArray(wo.exercises[exKey].coverSets)){
      wo.exercises[exKey].coverSets = wo.exercises[exKey].coverSets.slice(0, Math.max(targetSets - 1, 0));
    }
    renderDayPanel(key);
    await saveData();
  };
  window.moveExerciseInQueue=async function(key,index,dir){
    const exs=WORKOUT_PLAN[key]?.exercises;
    if(!exs) return;
    const ni=index+dir;
    if(ni<0||ni>=exs.length) return;
    [exs[index],exs[ni]]=[exs[ni],exs[index]];
    renderDayPanel(key);
    await saveData();
  };
  window.moveWorkoutDay=async function(key,dir){
    const keys = sortedDayKeys();
    const from = keys.indexOf(key);
    const to = from + dir;
    if(from < 0 || to < 0 || to >= keys.length) return;
    const [moved] = keys.splice(from, 1);
    keys.splice(to, 0, moved);
    keys.forEach((dayKey, index)=>{
      if(!WORKOUT_PLAN[dayKey]) return;
      WORKOUT_PLAN[dayKey].order = index + 1;
      if(!String(WORKOUT_PLAN[dayKey].label || "").trim()) WORKOUT_PLAN[dayKey].label = `DAY ${index + 1}`;
    });
    renderDayGrid();
    if(activeDay) renderDayPanel(activeDay);
    renderManagement();
    await saveData();
  };
  window.logActiveWorkoutSet=async function(key, exKey, participant, displayName){
    const wo=getWorkout(activeDate,key);
    if(!wo.exercises[exKey]) wo.exercises[exKey]={};
    const entry=wo.exercises[exKey];
    const weight=parseFloat(entry.weight||0) || 0;
    const reps=parseInt(entry.actualReps||0,10) || 0;
    if(!Array.isArray(entry.coverSets)) entry.coverSets=[];
    entry.coverSets.push({weight,reps,ts:Date.now()});
    const exerciseName = stripParticipantPrefix(exKey);
    const planned = WORKOUT_PLAN[key]?.exercises?.find(ex=>ex.name===exerciseName);
    entry.checked = entry.coverSets.length >= getExerciseTargetSets(planned);
    if(weight>0 && checkPR(exKey,weight,key,activeDate,participant||activeProfile)){
      toast(`🏆 NEW PR — ${displayName} @ ${weight}kg!`);
    } else {
      toast(`✓ ${displayName} logged`);
    }
    renderDayPanel(key);
    renderStats();
    renderCharts();
    renderCalendar();
    await saveData();
  };
  window.togEx=async function(key,exName,checked){
    const wo=getWorkout(activeDate,key);
    if(!wo.exercises[exName])wo.exercises[exName]={};
    wo.exercises[exName].checked=checked;
    if(checked){
      // Haptic feedback for checking exercises
      hapticFeedback(40);
      const w=parseFloat(wo.exercises[exName].weight||0);
      // Extract participant — new keys are "profile_ExName", old keys are just "ExName"
      const part=exName.includes('_')?exName.split('_')[0]:activeProfile;
      const displayName=stripParticipantPrefix(stripParticipantPrefix(exName));
      if(w>0&&checkPR(exName,w,key,activeDate,part))toast(`🏆 NEW PR — ${displayName} @ ${w}kg!`);
    }
    const sy=window.scrollY; renderDayPanel(key); renderStats(); renderCharts(); renderCalendar(); window.scrollTo(0,sy);
    await saveData();
  };
  window.setWt=async function(key,exName,val,participant){
    const wo=getWorkout(activeDate,key);
    if(!wo.exercises[exName])wo.exercises[exName]={};
    wo.exercises[exName].weight=val;
    const w=parseFloat(val);
    const displayName=stripParticipantPrefix(stripParticipantPrefix(exName));
    if(wo.exercises[exName].checked&&w>0&&checkPR(exName,w,key,activeDate,participant||activeProfile))toast(`🏆 NEW PR — ${displayName} @ ${w}kg!`);
    renderStats(); renderCharts(); await saveData();
  };
  window.setReps=async function(key,exName,val){
    const wo=getWorkout(activeDate,key);
    if(!wo.exercises[exName])wo.exercises[exName]={};
    wo.exercises[exName].actualReps=val; await saveData();
  };
  window.markDone=async function(key,skipFinishCapture=false){
    // Auto-save session note before marking done
    const snEl=document.getElementById(`snote-${key}`);
    if(snEl){ const wo=getWorkout(activeDate,key); wo.notes=snEl.value.trim(); }
    const wo=getWorkout(activeDate,key);
    if(!wo.done && !skipFinishCapture){
      openQuickFinish(key);
      return;
    }
    wo.done=!wo.done;
    if(wo.done){
      const trackedMins=getSessionElapsedMinutes();
      if(trackedMins>0){
        const now=new Date();
        const t=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        saveWorkoutTimeMetaLocal(activeDate,key,activeProfile,{at:t,durationMins:trackedMins,trackedMins});
      }
      resetSessionTimer();
      // Haptic feedback and confetti for completing workouts
      hapticFeedback([100, 50, 100]);
      showConfetti();
      hideCoverPlayer();
    }
    const sy=window.scrollY; renderDayPanel(key); renderStats(); renderCharts(); renderCalendar(); window.scrollTo(0,sy);
    await saveData(); if(wo.done)toast("💪 WORKOUT LOGGED");
  };
  window.saveBw=async function(val){ return saveBwDate(val, getTodayStr()); };
  window.saveBwDate=async function(val,date){
    const w=parseFloat(val); if(!w||w<20||w>300)return;
    const key=getWeightEntryKey(activeProfile,date);
    const weighMode=getWeighMode(activeProfile);
    if(!state.bodyweight)state.bodyweight={};
    state.bodyweight[key]=w; renderCharts(); renderCalendar(); await saveData(); toast(`⚖️ ${w}kg logged (${weighMode})`);
  };

  // ─── HAPTIC FEEDBACK ───
  window.hapticFeedback = function(pattern = 40) {
    if (navigator.vibrate && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.vibrate(pattern);
    }
  };

  window.showConfetti = function() {
    const confettiContainer = document.getElementById('confetti-container');
    if (!confettiContainer) return;

    // Clear any existing confetti
    confettiContainer.innerHTML = '';

    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
      confettiContainer.appendChild(confetti);
    }

    // Remove confetti after animation
    setTimeout(() => {
      if (confettiContainer) confettiContainer.innerHTML = '';
    }, 3000);
  };

  // ─── SWIPE GESTURES ───
  window.initSwipeGestures = function() {
    // Only enable on mobile devices
    if (!/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
  };

  let touchStartX = 0;
  let touchStartY = 0;
  let touchCurrentX = 0;
  let touchCurrentY = 0;
  let isSwiping = false;
  let swipeElement = null;
  let swipeThreshold = 80; // Minimum swipe distance in pixels

  function handleTouchStart(e) {
    const target = e.target.closest('.er, .er-dual');
    if (!target) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    isSwiping = false;
    swipeElement = target;

    // Add visual feedback class
    target.classList.add('swiping');
  }

  function handleTouchMove(e) {
    if (!swipeElement) return;

    touchCurrentX = e.touches[0].clientX;
    touchCurrentY = e.touches[0].clientY;

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = Math.abs(touchCurrentY - touchStartY);

    // Only consider horizontal swipes (prevent vertical scroll interference)
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY) {
      isSwiping = true;
      e.preventDefault(); // Prevent scrolling

      // Add visual feedback
      const translateX = Math.max(-100, Math.min(100, deltaX));
      swipeElement.style.transform = `translateX(${translateX}px)`;

      // Update CSS classes for background effects
      swipeElement.classList.remove('swipe-done', 'swipe-skip');
      if (deltaX < -50) {
        swipeElement.classList.add('swipe-done');
      } else if (deltaX > 50) {
        swipeElement.classList.add('swipe-skip');
      }
    }
  }

  function handleTouchEnd(e) {
    if (!swipeElement) return;

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = Math.abs(touchCurrentY - touchStartY);

    // Reset visual feedback
    swipeElement.classList.remove('swiping', 'swipe-done', 'swipe-skip');
    swipeElement.style.transform = '';

    // Check if it's a valid swipe
    if (isSwiping && Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > deltaY) {
      if (deltaX < -swipeThreshold) {
        // Swipe left - mark as done
        handleSwipeAction(swipeElement, 'done');
      } else if (deltaX > swipeThreshold) {
        // Swipe right - skip (uncheck)
        handleSwipeAction(swipeElement, 'skip');
      }
    }

    // Reset state
    isSwiping = false;
    swipeElement = null;
  }

  function handleSwipeAction(element, action) {
    // Find the checkbox in this exercise row
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (!checkbox) return;

    if (action === 'done') {
      // Mark as done (check the box)
      if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (action === 'skip') {
      // Skip (uncheck the box)
      if (checkbox.checked) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  window.prevMonth=function(){ const d=new Date(activeDate+"T12:00:00");d.setMonth(d.getMonth()-1);activeDate=d.toISOString().split("T")[0];renderCalendar();renderHistorySelectedSession(activeDate);renderHistoryMonthSummary(activeDate);renderStats();renderCharts(); };
  window.nextMonth=function(){ const d=new Date(activeDate+"T12:00:00");d.setMonth(d.getMonth()+1);activeDate=d.toISOString().split("T")[0];renderCalendar();renderHistorySelectedSession(activeDate);renderHistoryMonthSummary(activeDate);renderStats();renderCharts(); };

  // ─── EDIT MODAL ───
  window.openEdit=function(key){
    const day=WORKOUT_PLAN[key];
    renderExerciseOptions();
    document.getElementById("emit").textContent=`EDIT ${getWorkoutDisplayLabel(key)} — ${day.title}`;
    document.getElementById("emit").style.color=day.color;
    let h=`<div class="editor-shell">
      <section class="editor-section">
        <div class="editor-grid">
          <label class="editor-field"><span>DAY LABEL</span><input id="edit-label-input" class="fi" type="text" value="${getWorkoutDisplayLabel(key)}" placeholder="e.g. Day 2"></label>
          <label class="editor-field"><span>WORKOUT TITLE</span><input id="edit-title-input" class="fi" type="text" value="${day.title}" placeholder="e.g. Push"></label>
          <label class="editor-field editor-field-wide"><span>SUBTITLE / MUSCLE GROUPS</span><input id="edit-subtitle-input" class="fi" type="text" value="${day.subtitle}" placeholder="e.g. Chest · Shoulders · Triceps"></label>
          <label class="editor-field"><span>SCHEDULED WEEKDAY</span>
        <select id="edit-weekday-input" class="fsel">
          <option value="-1" ${day.weekday==null?'selected':''}>— No fixed day —</option>
          <option value="1" ${day.weekday===1?'selected':''}>Monday</option><option value="2" ${day.weekday===2?'selected':''}>Tuesday</option><option value="3" ${day.weekday===3?'selected':''}>Wednesday</option>
          <option value="4" ${day.weekday===4?'selected':''}>Thursday</option><option value="5" ${day.weekday===5?'selected':''}>Friday</option><option value="6" ${day.weekday===6?'selected':''}>Saturday</option><option value="0" ${day.weekday===0?'selected':''}>Sunday</option>
        </select>
          </label>
        </div>
      </section>
      <section class="editor-section">
        <div class="editor-section-head">
          <strong>Exercises</strong>
          <span>Drag to reorder. The workout list now follows weekday order automatically.</span>
        </div>
        <div id="eel" class="editor-exercise-list">`;
    day.exercises.forEach((ex,i)=>{
      h+=createEditRowMarkup(ex, i);
    });
    h+=`</div><button class="eab" onclick="addEditRow()" style="border-color:${day.color};color:${day.color}">+ ADD EXERCISE</button></section>`;
    if(canManageWorkoutParticipants()){
      h+=`<section class="editor-section"><div class="editor-section-head"><strong>Participants</strong></div><label class="editor-check"><input type="checkbox" id="edit-participants-bronwen" ${day.participants?.includes('bronwen')?'checked':''}><span>Bronwen also does this workout</span></label></section>`;
    } else {
      h+=`<section class="editor-section"><div class="editor-section-head"><strong>Participants</strong><span>Only Revan can change workout participants.</span></div></section>`;
    }
    h+=`<section class="editor-section"><label class="editor-field editor-field-wide"><span>WORKOUT NOTES</span><textarea id="edit-notes-input" class="fi editor-notes" placeholder="Add notes about this workout...">${day.notes||''}</textarea></label></section></div>`;
    document.getElementById("emb").innerHTML=h;
    document.getElementById("em").style.display="flex";
    document.getElementById("em").dataset.key=key;
    refreshEditRowIndices();
    closeCardMenu();
  };
  window.closeEdit=()=>document.getElementById("em").style.display="none";
  window.addEditRow=function(){
    const l=document.getElementById("eel"); const rows=l.querySelectorAll(".eer").length;
    l.insertAdjacentHTML("beforeend", createEditRowMarkup({}, rows));
    refreshEditRowIndices();
  };
  window.moveExercise=function(index,dir){
    const l=document.getElementById("eel");
    const rows=Array.from(l.querySelectorAll(".eer"));
    const currentRow=rows[index];
    if(!currentRow) return;
    const newIndex=index+dir;
    if(newIndex<0||newIndex>=rows.length) return;
    if(dir<0) l.insertBefore(currentRow,rows[newIndex]);
    else l.insertBefore(rows[newIndex],currentRow);
    refreshEditRowIndices();
  };
  let dragEditRow = null;
  window.refreshEditRowIndices=function(){
    document.querySelectorAll("#eel .eer").forEach((row, index)=>{
      row.dataset.index = String(index);
    });
  };
  window.startEditRowDrag=function(e){
    dragEditRow = e.currentTarget;
    if(e.dataTransfer){
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.currentTarget.dataset.index || "0");
    }
    e.currentTarget.classList.add("dragging");
  };
  window.endEditRowDrag=function(e){
    e.currentTarget.classList.remove("dragging");
    document.querySelectorAll("#eel .eer.drag-over").forEach(row=>row.classList.remove("drag-over"));
    dragEditRow = null;
  };
  window.onEditRowDragOver=function(e){
    e.preventDefault();
    const row = e.currentTarget;
    document.querySelectorAll("#eel .eer.drag-over").forEach(item=>{ if(item!==row) item.classList.remove("drag-over"); });
    row.classList.add("drag-over");
  };
  window.onEditRowDragLeave=function(e){
    e.currentTarget.classList.remove("drag-over");
  };
  window.onEditRowDrop=function(e){
    e.preventDefault();
    const targetRow = e.currentTarget;
    targetRow.classList.remove("drag-over");
    if(!dragEditRow || dragEditRow === targetRow) return;
    const list = document.getElementById("eel");
    const rows = Array.from(list.querySelectorAll(".eer"));
    const fromIndex = rows.indexOf(dragEditRow);
    const toIndex = rows.indexOf(targetRow);
    if(fromIndex < 0 || toIndex < 0) return;
    if(fromIndex < toIndex) list.insertBefore(dragEditRow, targetRow.nextSibling);
    else list.insertBefore(dragEditRow, targetRow);
    refreshEditRowIndices();
  };
  window.saveEdit=async function(){
    const key=document.getElementById("em").dataset.key;
    const newLabel=document.getElementById("edit-label-input").value.trim();
    const newTitle=document.getElementById("edit-title-input").value.trim();
    const newSubtitle=document.getElementById("edit-subtitle-input").value.trim();
    const newNotes=document.getElementById("edit-notes-input").value.trim();
    const newWeekday=parseInt(document.getElementById("edit-weekday-input")?.value??"-1",10);
    const hasBronwen=canManageWorkoutParticipants() ? !!document.getElementById("edit-participants-bronwen")?.checked : (WORKOUT_PLAN[key].participants||[]).includes("bronwen");
    if(!newTitle){toast("⚠️ Enter a title");return;}
    WORKOUT_PLAN[key].label=newLabel || getWorkoutDisplayLabel(key);
    WORKOUT_PLAN[key].title=newTitle;
    WORKOUT_PLAN[key].subtitle=newSubtitle;
    WORKOUT_PLAN[key].notes=newNotes||"";
    WORKOUT_PLAN[key].weekday=newWeekday>=0?newWeekday:null;
    if(canManageWorkoutParticipants()){
      WORKOUT_PLAN[key].participants=hasBronwen?['revan','bronwen']:['revan'];
    }
    const rows=document.querySelectorAll("#eel .eer"), newEx=[];
    rows.forEach(r=>{ const n=r.querySelector(".een").value.trim(); const s=parseInt(r.querySelector(".stepper-group")?.dataset.value||0,10)||0; const rp=r.querySelector(".eer2").value.trim()||"12"; if(n)newEx.push({name:n,sets:s,reps:rp}); });
    WORKOUT_PLAN[key].exercises=newEx; normalizeWorkoutPlanOrder(); closeEdit();
    if(activeDay===key)renderDayPanel(key);
    await saveData(); toast("✓ WORKOUT UPDATED"); renderDayGrid();
  };

  // ─── SAVE WORKOUT LIBRARY ───
  window.openSave=function(key){
    const day=WORKOUT_PLAN[key], saved=state.savedWorkouts||{}, sk=Object.keys(saved);
    let h=`<div class="save-workout-shell"><div class="save-workout-copy">Save <strong>${day.title}</strong> to your workout library. Choose a slot to replace or create a fresh entry.</div>`;
    if(sk.length){
      h+=`<div class="save-workout-grid">`;
      sk.forEach(k=>{
        h+=`<button class="save-workout-option" onclick="confirmSave('${key}','${k}')"><span>Replace</span><strong>${saved[k].title}</strong></button>`;
      });
      h+=`</div>`;
    }
    if(sk.length<10) h+=`<button class="save-workout-new" onclick="confirmSave('${key}',null)">+ SAVE AS NEW</button>`;
    h+=`</div>`;
    document.getElementById("svmb").innerHTML=h;
    document.getElementById("svm").style.display="flex"; closeCardMenu();
  };
  window.closeSave=()=>document.getElementById("svm").style.display="none";
  window.confirmSave=async function(key,rk){
    const day=WORKOUT_PLAN[key]; if(!state.savedWorkouts)state.savedWorkouts={};
    const sk=rk||`saved_${Date.now()}`;
    state.savedWorkouts[sk]={title:day.title,subtitle:day.subtitle,color:day.color,exercises:deepCopy(day.exercises)};
    closeSave(); await saveData(); toast(`✓ "${day.title}" saved`);
  };

  // ─── CARD MENU ───
  window.toggleCardMenu=function(e,key){
    e.stopPropagation();
    const ex=document.getElementById("card-menu-popup");
    if(ex&&ex.dataset.key===key){ex.remove();return;}
    if(ex)ex.remove();
    const m=document.createElement("div"); m.id="card-menu-popup"; m.dataset.key=key; m.className="cmp";
    m.innerHTML=`<button onclick="openEdit('${key}')">✎ EDIT WORKOUT</button><button onclick="openSave('${key}')">💾 SAVE / REPLACE</button><button onclick="deleteDay('${key}')" style="color:#ff8080">✕ DELETE</button>`;
    const r=e.currentTarget.getBoundingClientRect();
    m.style.top=(r.bottom+window.scrollY+4)+"px"; m.style.right=(window.innerWidth-r.right)+"px";
    document.body.appendChild(m);
    setTimeout(()=>document.addEventListener("click",closeCardMenu,{once:true}),10);
  };
  function closeCardMenu(){ const m=document.getElementById("card-menu-popup"); if(m)m.remove(); }

  window.deleteDay=async function(key){
    const day=WORKOUT_PLAN[key]; if(!day)return;
    if(!confirm(`Delete "${day.title}" from your plan and remove your logged entries for this day?`))return;
    Object.keys(state.workouts||{}).forEach(ds=>{
      if(!state.workouts?.[ds]?.[key]) return;
      delete state.workouts[ds][key];
      if(Object.keys(state.workouts[ds]).length===0) delete state.workouts[ds];
    });
    Object.keys(state.prs||{}).forEach(prKey=>{
      if(state.prs?.[prKey]?.dayKey===key) delete state.prs[prKey];
    });
    delete WORKOUT_PLAN[key]; normalizeWorkoutPlanOrder(); if(activeDay===key){activeDay=null;document.getElementById("day-panel").style.display="none";}
    closeCardMenu(); renderDayGrid(); renderAll(); await saveData(); toast(`🗑 ${day.title} deleted`);
  };

  // ─── ADD DAY ───
  const COLORS=["#e85d04","#4361ee","#7b2d8b","#2ec4b6","#f72585","#f0c040","#5cba5c","#e040fb"];
  window.openAddDay=function(){
    if(Object.keys(WORKOUT_PLAN).length>=MAX_DAYS){toast("🛑 Max 10 days");return;}
    const nextOrder = sortedDayKeys().length + 1;
    if(document.getElementById("adlbi")) document.getElementById("adlbi").value=`DAY ${nextOrder}`;
    document.getElementById("adi").value=""; document.getElementById("adsi").value=""; document.getElementById("adws").value="-1";
    const tplSel=document.getElementById("adtemplate");
    if(tplSel){
      tplSel.innerHTML=`<option value="">— START BLANK —</option>`;
      Object.entries(state.savedWorkouts||{}).forEach(([k,v])=>{
        const opt=document.createElement("option");
        opt.value=k;
        opt.textContent=v?.title||k;
        tplSel.appendChild(opt);
      });
      tplSel.value="";
    }
    const cp=document.getElementById("adcp");
    cp.innerHTML=COLORS.map((c,i)=>`<span class="csw ${i===0?'csa':''}" data-color="${c}" style="background:${c}" onclick="selSwatch(this,'${c}')"></span>`).join('');
    cp.dataset.color=COLORS[0]; document.getElementById("adm").style.display="flex";
    setTimeout(()=>document.getElementById("adi").focus(),50);
  };
  window.applyAddTemplateSelection=function(templateKey){
    const tpl=(state.savedWorkouts||{})[templateKey];
    if(!tpl) return;
    const titleInput=document.getElementById("adi");
    const subInput=document.getElementById("adsi");
    if(titleInput && !titleInput.value.trim()) titleInput.value=(tpl.title||"").toUpperCase();
    if(subInput && !subInput.value.trim()) subInput.value=tpl.subtitle||"";
    if(tpl.color){
      const sw=Array.from(document.querySelectorAll("#adcp .csw")).find(el=>(el.dataset.color||"").toLowerCase()===tpl.color.toLowerCase());
      if(sw) window.selSwatch(sw,tpl.color);
    }
  };
  window.selSwatch=function(el,c){ document.querySelectorAll(".csw").forEach(s=>s.classList.remove("csa")); el.classList.add("csa"); document.getElementById("adcp").dataset.color=c; };
  window.closeAddDay=()=>document.getElementById("adm").style.display="none";
  window.confirmAddDay=async function(){
    if(Object.keys(WORKOUT_PLAN).length>=MAX_DAYS){toast("🛑 Max 10 days");return;}
    const templateKey=document.getElementById("adtemplate")?.value||"";
    const template=(state.savedWorkouts||{})[templateKey]||null;
    let label=document.getElementById("adlbi")?.value.trim()||"";
    let title=document.getElementById("adi").value.trim().toUpperCase();
    const sub=document.getElementById("adsi").value.trim();
    const wd=parseInt(document.getElementById("adws").value);
    const col=document.getElementById("adcp").dataset.color || template?.color || COLORS[0];
    if(!title && template?.title) title=String(template.title).toUpperCase();
    if(!title){toast("⚠️ Enter a day name");return;}
    const nums=Object.keys(WORKOUT_PLAN).map(k=>parseInt(k.replace("day",""))).filter(n=>!isNaN(n));
    const next=nums.length?Math.max(...nums)+1:1;
    const key=`day${next}`;
    const prefilledExercises=template?.exercises?deepCopy(template.exercises):[];
    if(!label) label=`DAY ${next}`;
    WORKOUT_PLAN[key]={label,order:next,weekday:wd>=0?wd:null,title,subtitle:sub||template?.subtitle||title,color:col,exercises:prefilledExercises,participants:['revan']};
    normalizeWorkoutPlanOrder();
    closeAddDay(); renderDayGrid(); renderAll(); await saveData();
    if(prefilledExercises.length){
      setTimeout(()=>selectDay(key),200);
      toast(`✓ ${title} added from template`);
    }else{
      setTimeout(()=>{selectDay(key);openEdit(key);},200);
      toast(`✓ ${title} added`);
    }
  };

  // ─── EXERCISE DATABASE ───
  const EXERCISE_DATABASE = {
    chest: [
      "Barbell Bench Press", "Smith Machine Bench", "Dumbbell Bench Press", "Incline Barbell Bench",
      "Incline Dumbbell Press", "Decline Bench Press", "Cable Chest Fly", "Pec Deck Machine",
      "Push-Up", "Diamond Push-Up", "Archer Push-Up", "Chest Dip", "Machine Chest Press",
      "Butterfly Machine", "Floor Press", "Close-Grip Bench Press"
    ],
    back: [
      "Deadlift", "Romanian Deadlift", "Barbell Row", "Dumbbell Row", "Seated Cable Row",
      "T-Bar Row", "Lat Pulldown", "Wide-Grip Pulldown", "Close-Grip Pulldown",
      "Straight Arm Pulldown", "Face Pulls (Cable)", "Rear Delt Fly Machine",
      "Reverse Fly Machine", "Shrug", "Barbell Shrug", "Dumbbell Shrug",
      "Pull-Up", "Chin-Up", "Assisted Pull-Up", "Inverted Row"
    ],
    shoulders: [
      "Overhead Press", "Military Press", "Dumbbell Shoulder Press", "Arnold Press",
      "Lateral Raise", "Lateral Raise Machine", "Front Raise", "Rear Delt Raise",
      "Cable Lateral Raise", "Cable Upright Row", "Face Pulls (Dumbbell)",
      "Shrugs", "Barbell Shrug", "Dumbbell Shrug", "Shoulder Shrug Machine"
    ],
    arms: [
      "EZ Bar Curl", "Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl",
      "Concentration Curl", "Cable Curl", "Curl Machine", "Incline Dumbbell Curl",
      "Reverse Curl", "Wrist Curl", "Tricep Pushdown", "Tricep Rope Pushdown",
      "Overhead Tricep Extension", "Tricep Dip Machine", "Skull Crusher",
      "Close-Grip Bench Press", "Diamond Push-Up", "Tricep Kickback"
    ],
    legs: [
      "Barbell Back Squat", "Front Squat", "Goblet Squat", "Bulgarian Split Squat",
      "Walking Lunges (DBs)", "Reverse Lunges", "Leg Press", "Hack Squat",
      "Barbell Hip Thrust", "Glute Bridge", "Romanian Deadlift", "Stiff-Legged Deadlift",
      "Leg Curl Machine", "Seated Leg Curl", "Lying Leg Curl", "Leg Extension Machine",
      "Sissy Squat", "Calf Raise", "Seated Calf Raise", "Standing Calf Raise",
      "Abductor Machine", "Adductor Machine", "Hip Abductor", "Hip Adductor"
    ],
    core: [
      "Cable Crunch", "Machine Crunch", "Hanging Leg Raise", "Captain's Chair Leg Raise",
      "Plank", "Side Plank", "Russian Twist", "Bicycle Crunch", "Mountain Climber",
      "Flutter Kick", "Leg Raise", "Ab Wheel Rollout", "Dragon Flag", "Hollow Body Hold",
      "Dead Bug", "Bird Dog", "Superman", "Back Extension Machine"
    ]
  };
  function getAllExerciseNames(){
    const set=new Set();
    Object.values(EXERCISE_DATABASE||{}).forEach(arr=>(arr||[]).forEach(n=>set.add(String(n))));
    Object.values(WORKOUT_PLAN||{}).forEach(day=>(day?.exercises||[]).forEach(ex=>{ if(ex?.name) set.add(String(ex.name)); }));
    Object.values(state.savedWorkouts||{}).forEach(t=>(t?.exercises||[]).forEach(ex=>{ if(ex?.name) set.add(String(ex.name)); }));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }
  function renderExerciseOptions(){
    const dl=document.getElementById("exercise-options");
    if(!dl) return;
    const names=getAllExerciseNames();
    dl.innerHTML=names.map(n=>`<option value="${n.replace(/"/g,'&quot;')}"></option>`).join('');
  }

  // ─── SWAP ───
  window.openSwap=function(key,i){
    const ex=WORKOUT_PLAN[key].exercises[i];
    const muscleGroup = getMuscleGroup(ex.name);
    const suggestions = EXERCISE_DATABASE[muscleGroup] || [];

    document.getElementById("swt").textContent=`SWAP: ${ex.name}`; document.getElementById("swt").style.color=WORKOUT_PLAN[key].color;
    document.getElementById("swn").value=""; document.getElementById("sws").value=ex.sets||""; document.getElementById("swr").value=ex.reps||"";
    const swapStepper = document.getElementById("swap-stepper-root");
    if(swapStepper) swapStepper.innerHTML = stepperMarkup(ex.sets || 0, { step:1, min:0, max:10, unit:"sets", inputId:"sws" });
    document.getElementById("swm").style.display="flex"; document.getElementById("swm").dataset.key=key; document.getElementById("swm").dataset.i=i;

    // Populate suggestions
    renderSwapSuggestions(suggestions, muscleGroup);

    // Add input event listener for filtering
    const input = document.getElementById("swn");
    input.addEventListener('input', function() {
      filterSwapSuggestions(this.value, suggestions);
    });

    setTimeout(()=>input.focus(),50);
  };

  function renderSwapSuggestions(suggestions, muscleGroup) {
    const container = document.getElementById("swsuggestions");
    if (!suggestions.length) {
      container.innerHTML = '<div class="sw-no-suggestions">No suggestions available for this muscle group</div>';
      return;
    }

    container.innerHTML = suggestions.map(exercise =>
      `<button class="sw-suggestion" onclick="selectSwapSuggestion('${exercise.replace(/'/g, "\\'")}')">${exercise}</button>`
    ).join('');
  }

  function filterSwapSuggestions(query, allSuggestions) {
    const container = document.getElementById("swsuggestions");
    if (!query.trim()) {
      renderSwapSuggestions(allSuggestions);
      return;
    }

    const filtered = allSuggestions.filter(exercise =>
      exercise.toLowerCase().includes(query.toLowerCase())
    );

    if (!filtered.length) {
      container.innerHTML = '<div class="sw-no-suggestions">No exercises match your search</div>';
      return;
    }

    container.innerHTML = filtered.map(exercise =>
      `<button class="sw-suggestion" onclick="selectSwapSuggestion('${exercise.replace(/'/g, "\\'")}')">${exercise}</button>`
    ).join('');
  }

  window.selectSwapSuggestion = function(exerciseName) {
    document.getElementById("swn").value = exerciseName;
    // Hide suggestions after selection
    document.getElementById("swsuggestions").innerHTML = '';
  };

  window.closeSwap=()=>document.getElementById("swm").style.display="none";
  window.confirmSwap=async function(){
    const m=document.getElementById("swm"),key=m.dataset.key,i=parseInt(m.dataset.i);
    const n=document.getElementById("swn").value.trim(); if(!n){toast("⚠️ Enter name");return;}
    const s=parseInt(document.querySelector("#swap-stepper-root .stepper-group")?.dataset.value||document.getElementById("sws").value,10)||3, r=document.getElementById("swr").value.trim()||"12";
    WORKOUT_PLAN[key].exercises[i]={name:n,sets:s,reps:r}; closeSwap(); renderDayPanel(key); await saveData(); toast(`✓ Swapped to ${n}`);
  };

  // ─── CSV ───
  window.exportCSV=function(){
    const rows=[["Date","DayKey","WorkoutTitle","Participant","Exercise","Sets","TargetReps","ActualReps","Weight(kg)","Checked","Done"]];
    Object.keys(state.workouts||{}).sort().forEach(date=>{
      Object.keys(state.workouts[date]).forEach(key=>{
        const s=state.workouts[date][key],p=WORKOUT_PLAN[key]; if(!p)return;
        const parts=p.participants||['revan'];
        p.exercises.forEach(ex=>{
          parts.forEach(pp=>{
            const {data:e}=getExData(s.exercises||{},pp,ex.name);
            const ed=e||{};
            rows.push([date,key,p.title,pp,ex.name,ex.sets,ex.reps,ed.actualReps||"",ed.weight||"",ed.checked?"1":"0",s.done?"1":"0"]);
          });
        });
      });
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`ironlog_${activeProfile}_${getTodayStr()}.csv`; a.click();
    toast("📥 CSV exported"); closeSettings();
  };
  async function handleCsvImport(e){
    const file=e.target.files[0]; if(!file)return;
    const text=await file.text(); const lines=text.trim().split("\n").slice(1); let count=0;
    lines.forEach(line=>{ const cols=[]; let cur="",inQ=false; for(let ch of line){if(ch==='"'){inQ=!inQ;}else if(ch===','&&!inQ){cols.push(cur);cur="";}else cur+=ch;} cols.push(cur); if(cols.length<10)return; const [date,key,,exName,,,ar,wt,ck,dn]=cols; if(!date||!key||!exName)return; if(!state.workouts[date])state.workouts[date]={}; if(!state.workouts[date][key])state.workouts[date][key]={done:false,exercises:{},notes:""}; state.workouts[date][key].done=dn.trim()==="1"; state.workouts[date][key].exercises[exName]={checked:ck.trim()==="1",weight:wt.trim(),actualReps:ar.trim()}; count++; });
    await saveData(); renderAll(); toast(`📤 Imported ${count} rows`); e.target.value=""; closeSettings();
  }

  // ─── NAVIGATE ───
  window.navigateToGym=function(){
    if(!state.gymUrl){ const u=prompt("Enter your gym's maps URL:"); if(!u||!u.trim())return; state.gymUrl=u.trim(); saveData().then(()=>{window.open(state.gymUrl,"_blank");toast("🗺 Gym saved!");}); }
    else window.open(state.gymUrl,"_blank");
  };
  window.resetGymUrl=function(){ state.gymUrl=""; saveData(); toast("🗺 Gym URL cleared"); };
  window.pushUpdatesNow=async function(){
    try{
      await saveData();
      toast("☁️ Updates pushed");
    }catch(e){
      toast("⚠️ Push failed");
    }
  };
  window.cleanupDuplicatePRs=async function(){
    const src=state.prs||{};
    const cleaned={};
    let removed=0;
    Object.keys(src).forEach(key=>{
      const pr=src[key]||{};
      const participant=pr.participant || (typeof key==="string" && key.includes("_") ? key.split("_")[0] : activeProfile);
      const exName=stripParticipantPrefix(stripParticipantPrefix(String(key||""))).trim();
      if(!exName){ removed++; return; }
      const canonicalKey=`${participant}_${exName}`;
      const weight=parseFloat(pr.weight||0);
      const date=pr.date||"1970-01-01";
      const candidate={...pr,participant,weight,date};
      const existing=cleaned[canonicalKey];
      if(!existing){
        cleaned[canonicalKey]=candidate;
      }else{
        const ew=parseFloat(existing.weight||0), ed=existing.date||"1970-01-01";
        if(weight>ew || (weight===ew && date>ed)) cleaned[canonicalKey]=candidate;
        removed++;
      }
      if(canonicalKey!==key) removed++;
    });
    state.prs=cleaned;
    await saveData();
    renderPersonalRecordsWall();
    renderStats();
    toast(removed>0?`🧹 Removed ${removed} duplicate PR entries`:"✓ No duplicate PR entries found");
  };
  window.saveAppUpdateUrl=async function(){
    const input=document.getElementById("app-update-url-input");
    const url=(input?.value||"").trim();
    appUpdateUrl=url;
    try{
      await setDoc(doc(db,"ironlog",SHARED_DOC),{ appUpdateUrl: url },{merge:true});
      renderAppVersion();
      toast(url?"✓ Update URL saved":"✓ Update URL cleared");
    }catch(e){
      toast("⚠️ Could not save update URL");
    }
  };
  window.publishCurrentVersion=async function(){
    const input=document.getElementById("app-update-url-input");
    const chosenUrl=(input?.value||appUpdateUrl||"").trim();
    if(!chosenUrl){
      toast("⚠️ Set update URL first");
      return;
    }
    try{
      await setDoc(doc(db,"ironlog",SHARED_DOC),{
        latestAppVersion: APP_VERSION,
        appUpdateUrl: chosenUrl,
        latestAppUpdatedAt: new Date().toISOString()
      },{merge:true});
      latestAppVersion=APP_VERSION;
      appUpdateUrl=chosenUrl;
      latestAppUpdatedAt=new Date().toISOString();
      renderAppVersion();
      toast(`📢 Published ${APP_VERSION}`);
    }catch(e){
      toast("⚠️ Publish failed");
    }
  };
  async function fetchRemoteAppVersion(url){
    if(!url) return null;
    try{
      const sep=url.includes("?") ? "&" : "?";
      const res=await fetch(`${url}${sep}cb=${Date.now()}`,{cache:"no-store"});
      if(!res.ok) return null;
      const html=await res.text();
      const m=html.match(/const\s+APP_VERSION\s*=\s*["']([^"']+)["']/i);
      return m ? m[1] : null;
    }catch(_e){
      return null;
    }
  }
  window.checkForAppUpdate=async function(){
    try{
      const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap=await getDoc(doc(db,"ironlog",SHARED_DOC));
      if(!snap.exists()){
        toast("⚠️ No update metadata found");
        return;
      }
      const d=snap.data()||{};
      latestAppVersion=d.latestAppVersion||APP_VERSION;
      appUpdateUrl=d.appUpdateUrl||appUpdateUrl||"";
      latestAppUpdatedAt=d.latestAppUpdatedAt||latestAppUpdatedAt||"";
      const remoteVersion=await fetchRemoteAppVersion(appUpdateUrl);
      if(remoteVersion && compareVersions(remoteVersion,latestAppVersion)>0){
        latestAppVersion=remoteVersion;
      }
      renderAppVersion();
      if(hasAppUpdate()) toast(`⬆ Update ${latestAppVersion} available`);
      else toast("✓ You are on the latest version");
    }catch(e){
      toast("⚠️ Update check failed");
    }
  };
  window.updateAppNow=function(){
    if(!hasAppUpdate()){
      toast("✓ Already up to date");
      return;
    }
    if(!appUpdateUrl){
      toast("⚠️ No update URL configured");
      return;
    }
    const sep=appUpdateUrl.includes("?") ? "&" : "?";
    window.location.href=`${appUpdateUrl}${sep}v=${encodeURIComponent(latestAppVersion)}`;
  };

  // ─── SETTINGS ─────
  function renderSettingsSectionUI(){
    Object.keys(settingsSectionState).forEach(sec=>{
      const panel=document.querySelector(`.sts[data-sec="${sec}"]`);
      const arrow=document.getElementById(`st-arrow-${sec}`);
      if(!panel) return;
      const open=!!settingsSectionState[sec];
      panel.classList.toggle("collapsed", !open);
      if(arrow) arrow.textContent=open?"▾":"▸";
    });
  }
  window.toggleSettingsSection=function(sec){
    settingsSectionState[sec]=!settingsSectionState[sec];
    try{ localStorage.setItem("ironlog_settings_sections", JSON.stringify(settingsSectionState)); }catch(_e){}
    renderSettingsSectionUI();
  };
  function renderAdminSettingsBlock(){
    const el=document.getElementById("admin-settings-block");
    if(el) el.style.display=isAdminUser() ? "block" : "none";
  }
  function renderQuickActions(){
    const adminBtn=document.getElementById("qbar-admin-btn");
    if(adminBtn) adminBtn.style.display=isAdminUser()?"block":"none";
    updateInstallButton();
  }
  window.installPwaApp=async function(){
    if(!deferredInstallPrompt){
      toast("Install is not available yet on this device");
      return;
    }
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if(result?.outcome === "accepted") toast("✓ Iron Log install started");
    deferredInstallPrompt = null;
    updateInstallButton();
  };
  window.openSettings=function(){
    notificationsOpen=false;
    const np=document.getElementById("notif-panel");
    if(np) np.style.display="none";
    settingsSectionState = {
      user:false,data:false,install:false,management:false,admin:false,debug:false,templates:false,theme:false,version:false
    };
    document.getElementById("stp").classList.add("open");
    document.getElementById("sto").style.display="block";
    renderSettingsProfiles(); renderTemplateList(); renderAppVersion(); renderManagement(); renderAdminSettingsBlock(); renderInstallSettingsBlock(); renderSettingsSectionUI();
  };
  window.closeSettings=function(){ document.getElementById("stp").classList.remove("open"); document.getElementById("sto").style.display="none"; };
  function renderSettingsProfiles(){
    const el=document.getElementById("stprofs"); if(!el)return;
    const profileKeys=isAdminUser() ? Object.keys(PROFILES) : [activeProfile];
    const list=profileKeys.map(k=>{ const p=PROFILES[k],a=k===activeProfile; return `<button class="prof-btn ${a?'pa':''}" style="${a?'border-color:'+p.color+';color:'+p.color:''}" onclick="${isAdminUser()?`switchProfile('${k}')`:'void(0)'}">${p.label}</button>`; }).join('');
    el.innerHTML=`${list}<button class="prof-btn" onclick="signOutAccount()">SIGN OUT</button>`;
  }
  window.setManagementTab=function(tab){
    managementTab=tab;
    renderManagement();
  };
  function renderManagement(){
    const tabsEl=document.getElementById("mg-tabs");
    const bodyEl=document.getElementById("mg-body");
    if(!tabsEl||!bodyEl) return;
    const tabs=[["workouts","WORKOUTS"],["exercises","EXERCISES"],["users","USERS"]];
    tabsEl.innerHTML=tabs.map(([id,label])=>`<button class="th-btn ${managementTab===id?'active':''}" onclick="setManagementTab('${id}')">${label}</button>`).join('');
    if(managementTab==="workouts"){
      const items=sortedDayKeys();
      bodyEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
        <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;color:var(--muted);font-size:.76rem">${items.length} WORKOUT DAY${items.length===1?'':'S'}</div>
        <button class="st-ab" style="width:auto;margin:0;color:#5cba5c;border-color:rgba(92,186,92,.35)" onclick="closeSettings();setTimeout(()=>openAddDay(),60)">+ ADD WORKOUT DAY</button>
      </div>` + (items.length?items.map(k=>{
        const d=WORKOUT_PLAN[k];
        const index = items.indexOf(k);
        return `<div class="template-item"><span class="template-name">${getWorkoutDisplayLabel(k)} · ${d.title}<em>${getWorkoutWeekdayLabel(d.weekday)}</em></span><div class="template-btns"><button class="template-btn-load" ${index===0?'disabled':''} onclick="moveWorkoutDay('${k}',-1)">UP</button><button class="template-btn-load" ${index===items.length-1?'disabled':''} onclick="moveWorkoutDay('${k}',1)">DOWN</button><button class="template-btn-load" onclick="closeSettings();setTimeout(()=>openEdit('${k}'),60)">EDIT</button><button class="template-btn-del" onclick="deleteDay('${k}')">DELETE</button></div></div>`;
      }).join(''):`<div style="color:var(--muted);font-size:.8rem;padding:10px">No workouts found yet.</div>`);
      return;
    }
    if(managementTab==="exercises"){
      const names=getAllExerciseNames();
      const opts=names.map(n=>`<option value="${n.replace(/"/g,'&quot;')}"></option>`).join('');
      bodyEl.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px">
        <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;color:var(--muted);font-size:.76rem">${names.length} EXERCISE${names.length===1?'':'S'} AVAILABLE</div>
        <input id="mgx-name" class="fi" list="mgx-options" placeholder="Select or type exercise name" oninput="loadExerciseMetaEditor(this.value)">
        <datalist id="mgx-options">${opts}</datalist>
        <select id="mgx-group" class="fsel">
          <option value="chest">CHEST</option><option value="back">BACK</option><option value="shoulders">SHOULDERS</option>
          <option value="arms">ARMS</option><option value="legs">LEGS</option><option value="core">CORE</option><option value="other">OTHER</option>
        </select>
        <input id="mgx-note" class="fi" placeholder="Description / notes (optional)">
        <button class="st-ab" onclick="saveExerciseMetaFromEditor()" style="color:#5cba5c;border-color:rgba(92,186,92,.3)">SAVE EXERCISE ATTRIBUTES</button>
        <button class="st-ab" onclick="clearExerciseMetaFromEditor()">CLEAR OVERRIDE</button>
        <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;color:var(--muted);font-size:.74rem;margin-top:4px">CURRENT EXERCISES</div>
        <div style="max-height:180px;overflow:auto;border:1px solid var(--border);background:var(--bg2);padding:6px">
          ${names.length?names.map(n=>`<button class="st-ab" style="margin:0 0 4px 0;font-size:.72rem;letter-spacing:.08em;padding:6px 8px" onclick="selectManagementExercise('${n.replace(/'/g,"\\'")}')">${n}</button>`).join(''):`<div style="color:var(--muted);font-size:.78rem;padding:6px">No exercises found.</div>`}
        </div>
      </div>`;
      return;
    }
    bodyEl.innerHTML=Object.keys(PROFILES).map(pk=>{
      const p=PROFILES[pk];
      return `<div style="border:1px solid var(--border);padding:8px;margin-bottom:8px">
        <div style="font-family:'Barlow Condensed',sans-serif;letter-spacing:.1em;color:${p.color};margin-bottom:6px">${p.label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div><div class="auth-field-label">HEIGHT (CM)</div><input id="mgu-${pk}-height" class="fi" type="number" min="120" max="230" placeholder="e.g. 180" value="${p.height||''}"></div>
          <div>
            <input id="mgu-${pk}-color" type="hidden" value="${p.color||''}">
            <div class="auth-field-label">THEME COLOUR</div>
            <div id="mgu-${pk}-color-swatches" class="color-swatches"></div>
          </div>
          <div><div class="auth-field-label">WATER TARGET (L)</div><input id="mgu-${pk}-water" class="fi" type="number" step="0.1" min="1" max="8" placeholder="e.g. 2.5" value="${p.water||''}"></div>
          <div><div class="auth-field-label">PROTEIN TARGET (G)</div><input id="mgu-${pk}-protein" class="fi" type="number" min="20" max="400" placeholder="e.g. 160" value="${p.protein||''}"></div>
          <div><div class="auth-field-label">WEIGH-IN MODE</div><select id="mgu-${pk}-weigh-mode" class="fsel"><option value="daily" ${(p.weighMode||'daily')==='daily'?'selected':''}>DAILY</option><option value="weekly" ${(p.weighMode||'daily')==='weekly'?'selected':''}>WEEKLY</option></select></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:7px">
          <button class="st-ab" onclick="saveUserOverridesFromEditor('${pk}')" style="margin:0">SAVE ${p.label}</button>
          ${canManageWorkoutParticipants() && pk!=="revan" ? `<button class="st-ab" onclick="deleteUserAccount('${pk}')" style="margin:0;color:#ff9b9b;border-color:rgba(255,120,120,.35)">DELETE</button>` : ``}
        </div>
      </div>`;
    }).join('');
    Object.keys(PROFILES).forEach(pk=>{
      renderThemeColorPicker(`mgu-${pk}-color-swatches`,`mgu-${pk}-color`,PROFILES[pk]?.color||"#e85d04");
    });
  }
  window.selectManagementExercise=function(name){
    const input=document.getElementById("mgx-name");
    if(!input) return;
    input.value=name;
    loadExerciseMetaEditor(name);
  };
  window.loadExerciseMetaEditor=function(name){
    const key=normalizeExerciseName(name);
    const meta=state.exerciseMeta?.[key]||{};
    const groupEl=document.getElementById("mgx-group");
    const noteEl=document.getElementById("mgx-note");
    if(groupEl) groupEl.value=meta.muscleGroup||"other";
    if(noteEl) noteEl.value=meta.description||"";
  };
  window.saveExerciseMetaFromEditor=async function(){
    const name=(document.getElementById("mgx-name")?.value||"").trim();
    if(!name){ toast("⚠️ Enter exercise name"); return; }
    const key=normalizeExerciseName(name);
    const group=(document.getElementById("mgx-group")?.value||"other").trim();
    const description=(document.getElementById("mgx-note")?.value||"").trim();
    if(!state.exerciseMeta) state.exerciseMeta={};
    state.exerciseMeta[key]={ muscleGroup: group, description };
    await saveData();
    renderPersonalRecordsWall();
    toast(`✓ Saved attributes for ${name}`);
  };
  window.clearExerciseMetaFromEditor=async function(){
    const name=(document.getElementById("mgx-name")?.value||"").trim();
    if(!name){ toast("⚠️ Enter exercise name"); return; }
    const key=normalizeExerciseName(name);
    if(state.exerciseMeta && state.exerciseMeta[key]) delete state.exerciseMeta[key];
    await saveData();
    renderPersonalRecordsWall();
    toast(`✓ Cleared override for ${name}`);
  };
  window.saveUserOverridesFromEditor=async function(pk){
    if(!state.userOverrides) state.userOverrides={};
    const height=parseFloat(document.getElementById(`mgu-${pk}-height`)?.value||0);
    const color=(document.getElementById(`mgu-${pk}-color`)?.value||"").trim();
    const water=parseFloat(document.getElementById(`mgu-${pk}-water`)?.value||0);
    const protein=parseFloat(document.getElementById(`mgu-${pk}-protein`)?.value||0);
    const weighMode=((document.getElementById(`mgu-${pk}-weigh-mode`)?.value||"daily")==="weekly")?"weekly":"daily";
    const cur=state.userOverrides[pk]||{};
    state.userOverrides[pk]={
      ...cur,
      ...(height>0?{height}:{}),
      ...(color?{color}:{}),
      ...(water>0?{water}:{}),
      ...(protein>0?{protein}:{}),
      weighMode
    };
    applyUserOverrides(state.userOverrides);
    updateLogoColor();
    renderSettingsProfiles();
    renderManagement();
    await saveData();
    toast(`✓ ${PROFILES[pk].label} updated`);
  };
  window.deleteUserAccount=async function(pk){
    if(!canManageWorkoutParticipants()){
      toast("Only Revan can delete users");
      return;
    }
    if(!accountRegistry[pk]){
      toast("⚠️ User not found");
      return;
    }
    if(pk===activeProfile){
      toast("⚠️ Switch profile before deleting this user");
      return;
    }
    const name=accountRegistry[pk]?.name||pk;
    const ok=confirm(`Delete user ${name}? This removes account access and that user's profile data.`);
    if(!ok) return;
    delete accountRegistry[pk];
    await persistAccounts();
    await setDoc(doc(db,"ironlog",SHARED_DOC),{
      profileData: { [pk]: deleteField() },
      [`profileData.${pk}`]: deleteField()
    },{merge:true});
    buildProfilesFromAccounts();
    renderSettingsProfiles();
    renderManagement();
    toast(`🗑 Deleted ${name}`);
  };
  window.setTheme=function(t){ if(t==="light")document.documentElement.classList.add("light-mode"); else document.documentElement.classList.remove("light-mode"); localStorage.setItem("ironlog_theme",t); };

  function escHtml(v){
    return String(v ?? "").replace(/[&<>"']/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  }
  function bytesForObject(obj){
    try{
      return new TextEncoder().encode(JSON.stringify(obj ?? {})).length;
    }catch(_e){
      return 0;
    }
  }
  function formatBytes(bytes){
    const b=Math.max(0,Number(bytes)||0);
    if(b<1024) return `${b} B`;
    if(b<1024*1024) return `${(b/1024).toFixed(1)} KB`;
    if(b<1024*1024*1024) return `${(b/(1024*1024)).toFixed(2)} MB`;
    return `${(b/(1024*1024*1024)).toFixed(2)} GB`;
  }
  function buildTable(title, columns, rows, sizeBytes){
    const head = columns.map(c=>`<th>${escHtml(c)}</th>`).join("");
    const body = rows.length ? rows.map(r=>`<tr>${columns.map(c=>`<td>${escHtml(r[c]??"")}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${columns.length}" style="text-align:center;color:var(--muted)">No records</td></tr>`;
    return `<section class="adm-card">
      <div class="adm-title">${escHtml(title)} <span class="adm-count">${rows.length} · ${formatBytes(sizeBytes)}</span></div>
      <div class="adm-table-wrap"><table class="adm-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </section>`;
  }
  function toCsv(columns, rows){
    const esc=(v)=>`"${String(v??"").replace(/"/g,'""')}"`;
    const header=columns.map(esc).join(",");
    const lines=rows.map(r=>columns.map(c=>esc(r[c])).join(","));
    return [header,...lines].join("\n");
  }
  function downloadText(filename, content, type){
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([content],{type:type||"text/plain"}));
    a.download=filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  window.exportAdminDataPack=function(){
    if(!isAdminUser()) return;
    if(!adminTablesCache){
      toast("Refresh admin tables first");
      return;
    }
    const ts=new Date().toISOString().replace(/[:.]/g,"-");
    const pack={
      exportedAt:new Date().toISOString(),
      version:APP_VERSION,
      filters:{query:adminFilterQuery,user:adminFilterUser,dateFrom:adminDateFrom,dateTo:adminDateTo},
      tables:adminTablesCache
    };
    downloadText(`ironlog_data_pack_${ts}.json`,JSON.stringify(pack,null,2),"application/json");
    downloadText(`ironlog_users_${ts}.csv`,toCsv(["key","name","pin","height_cm","water_l","protein_g","color","created_at"],adminTablesCache.users||[]),"text/csv");
    downloadText(`ironlog_workouts_${ts}.csv`,toCsv(["user","date","day_key","done","exercise_entries","note"],adminTablesCache.workouts||[]),"text/csv");
    downloadText(`ironlog_exercises_${ts}.csv`,toCsv(["user","exercise","source","sets","reps","muscle_group"],adminTablesCache.exercises||[]),"text/csv");
    downloadText(`ironlog_collected_${ts}.csv`,toCsv(["user","date","type","value","water_l","protein_g","calories","sleep_h","soreness"],adminTablesCache.collected||[]),"text/csv");
    toast("Data pack exported");
  };
  function getNotifications(){
    const list=[];
    const today=getTodayStr();
    if(hasAppUpdate()){
      list.push({id:`update_${latestAppVersion}`,type:"update",title:`Update ${latestAppVersion} available`,detail:"Open quick action CHECK UPDATE or Settings > Version."});
    }
    const todayKey=getTodayDayKey();
    if(todayKey){
      const done=!!state.workouts?.[today]?.[todayKey]?.done;
      if(!done) list.push({id:`today_plan_${today}`,type:"reminder",title:"Today's workout is still open",detail:"Tap START TODAY from quick actions."});
    }
    const recentPr=Object.keys(state.prs||{}).some(k=>{
      const pr=state.prs[k];
      const participant=pr?.participant || (String(k).includes("_") ? String(k).split("_")[0] : activeProfile);
      if(participant!==activeProfile) return false;
      if(!pr.date) return false;
      return (new Date(today)-new Date(pr.date)) <= (14*24*60*60*1000);
    });
    if(!recentPr){
      list.push({id:`pr_nudge_${today.slice(0,7)}`,type:"nudge",title:"No PR in the last 14 days",detail:"Try a progression set on your main lift this week."});
    }
    getOverdueLiftNudges().forEach(n=>list.push({id:n.id,type:"nudge",title:n.title,detail:n.detail}));
    if(shouldSuggestDeload()){
      list.push({id:`deload_${today}`,type:"recovery",title:"Deload suggested",detail:"High fatigue signals detected (sleep/soreness/adherence). Consider a light day."});
    }
    return list;
  }
  function renderNotifications(){
    const box=document.getElementById("notif-list");
    const badge=document.getElementById("notif-badge");
    if(!box||!badge) return;
    const items=getNotifications();
    const unseen=items.filter(n=>!notificationsSeen[n.id]).length;
    badge.style.display=unseen>0?"inline-flex":"none";
    badge.textContent=String(unseen);
    box.innerHTML=items.length?items.map(n=>`<div class="noti-item"><div class="noti-title">${escHtml(n.title)}</div><div class="noti-detail">${escHtml(n.detail)}</div></div>`).join(""):`<div class="noti-empty">No notifications</div>`;
  }
  window.toggleNotifications=function(){
    notificationsOpen=!notificationsOpen;
    const p=document.getElementById("notif-panel");
    if(!p) return;
    p.style.display=notificationsOpen?"block":"none";
    if(notificationsOpen){
      const items=getNotifications();
      items.forEach(n=>{ notificationsSeen[n.id]=true; });
      try{ localStorage.setItem(`ironlog_notif_seen_${activeProfile}`,JSON.stringify(notificationsSeen)); }catch(_e){}
    }
    renderNotifications();
  };
  function applyAdminFilters(rows){
    const q=String(adminFilterQuery||"").trim().toLowerCase();
    return rows.filter(r=>{
      if(adminFilterUser!=="all" && String(r.user||r.key||"").toLowerCase()!==adminFilterUser.toLowerCase()) return false;
      const d=String(r.date||"");
      if(adminDateFrom && d && d<adminDateFrom) return false;
      if(adminDateTo && d && d>adminDateTo) return false;
      if(q){
        const hay=Object.values(r).map(v=>String(v??"").toLowerCase()).join(" ");
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  }
  window.setAdminFiltersFromUi=function(){
    adminFilterQuery=(document.getElementById("adm-filter-q")?.value||"").trim();
    adminFilterUser=(document.getElementById("adm-filter-user")?.value||"all").trim();
    adminDateFrom=(document.getElementById("adm-filter-from")?.value||"").trim();
    adminDateTo=(document.getElementById("adm-filter-to")?.value||"").trim();
    refreshAdminDataTables();
  };
  window.closeAdminDataPage=function(){
    const el=document.getElementById("admin-page");
    if(el) el.style.display="none";
  };
  window.openAdminDataPage=async function(){
    if(!isAdminUser()){
      toast("Admin access is only available for Revan");
      return;
    }
    closeSettings();
    const el=document.getElementById("admin-page");
    if(!el) return;
    el.style.display="block";
    await refreshAdminDataTables();
  };
  window.refreshAdminDataTables=async function(){
    if(!isAdminUser()) return;
    const root=document.getElementById("admin-table-root");
    if(!root) return;
    root.innerHTML=`<div style="color:var(--muted);padding:12px">Loading admin data...</div>`;
    try{
      const [sharedSnap,accountsSnap]=await Promise.all([
        getDocFromServer(doc(db,"ironlog",SHARED_DOC)),
        getDocFromServer(doc(db,"ironlog",ACCOUNTS_DOC))
      ]);
      const shared=sharedSnap.exists()?sharedSnap.data():{};
      const accounts=accountsSnap.exists()?(accountsSnap.data()?.users||{}):{};
      const profileData=shared.profileData||{};

      const userRows=Object.keys(accounts).map(pk=>{
        const a=accounts[pk]||{};
        return {
          key:pk,
          name:a.name||pk,
          pin:a.pin||"",
          height_cm:a.height||"",
          water_l:a.water||"",
          protein_g:a.protein||"",
          color:a.color||"",
          created_at:a.createdAt||""
        };
      });

      const workoutRows=[];
      Object.keys(profileData).forEach(pk=>{
        const wo=profileData[pk]?.workouts||{};
        Object.keys(wo).sort().forEach(date=>{
          Object.keys(wo[date]||{}).forEach(dayKey=>{
            const s=wo[date][dayKey]||{};
            workoutRows.push({
              user:pk,
              date,
              day_key:dayKey,
              done:!!s.done,
              exercise_entries:Object.keys(s.exercises||{}).length,
              note:(s.notes||"").slice(0,80)
            });
          });
        });
      });

      const exerciseMap=new Map();
      Object.keys(profileData).forEach(pk=>{
        const plan=profileData[pk]?.plan||{};
        Object.keys(plan).forEach(dayKey=>{
          (plan[dayKey]?.exercises||[]).forEach(ex=>{
            const name=String(ex?.name||"").trim();
            if(!name) return;
            const k=`${pk}|${name.toLowerCase()}`;
            if(!exerciseMap.has(k)){
              exerciseMap.set(k,{
                user:pk,
                exercise:name,
                source:"plan",
                sets:ex.sets??"",
                reps:ex.reps??"",
                muscle_group:getMuscleGroup(name)
              });
            }
          });
        });
        const wo=profileData[pk]?.workouts||{};
        Object.keys(wo).forEach(date=>{
          Object.keys(wo[date]||{}).forEach(dayKey=>{
            const exs=wo[date][dayKey]?.exercises||{};
            Object.keys(exs).forEach(exKey=>{
              const clean=stripParticipantPrefix(stripParticipantPrefix(String(exKey||""))).trim();
              if(!clean) return;
              const k=`${pk}|${clean.toLowerCase()}`;
              if(!exerciseMap.has(k)){
                exerciseMap.set(k,{
                  user:pk,
                  exercise:clean,
                  source:"logged",
                  sets:"",
                  reps:"",
                  muscle_group:getMuscleGroup(clean)
                });
              }
            });
          });
        });
      });
      const exerciseRows=Array.from(exerciseMap.values()).sort((a,b)=>`${a.user}${a.exercise}`.localeCompare(`${b.user}${b.exercise}`));

      const collectedRows=[];
      Object.keys(profileData).forEach(pk=>{
        const bw=profileData[pk]?.bodyweight||{};
        Object.keys(bw).sort().forEach(date=>{
          collectedRows.push({
            user:pk,
            date,
            type:"bodyweight",
            value:bw[date],
            water_l:"",
            protein_g:"",
            calories:"",
            sleep_h:"",
            soreness:""
          });
        });
        const h=getHealthEntriesFromStore(profileData[pk]?.health||{}, pk);
        Object.keys(h).sort().forEach(date=>{
          const v=h[date]||{};
          collectedRows.push({
            user:pk,
            date,
            type:"health",
            value:"",
            water_l:v.water??"",
            protein_g:v.protein??"",
            calories:v.calories??"",
            sleep_h:v.sleep??"",
            soreness:v.soreness??""
          });
        });
      });

      const usersBytes=bytesForObject(userRows);
      const workoutsBytes=bytesForObject(workoutRows);
      const exercisesBytes=bytesForObject(exerciseRows);
      const collectedBytes=bytesForObject(collectedRows);
      const totalMeasured=usersBytes+workoutsBytes+exercisesBytes+collectedBytes;
      const estimatedFree=Math.max(0,FIRESTORE_SPARK_LIMIT_BYTES-totalMeasured);
      const usagePct=((totalMeasured/FIRESTORE_SPARK_LIMIT_BYTES)*100).toFixed(2);
      const filteredUsers=applyAdminFilters(userRows);
      const filteredWorkouts=applyAdminFilters(workoutRows);
      const filteredExercises=applyAdminFilters(exerciseRows);
      const filteredCollected=applyAdminFilters(collectedRows);
      const allUsers=Array.from(new Set([...Object.keys(accounts),...Object.keys(profileData)])).sort();
      const userOptions=['<option value="all">ALL USERS</option>',...allUsers.map(u=>`<option value="${u}" ${adminFilterUser===u?'selected':''}>${u.toUpperCase()}</option>`)].join("");
      adminTablesCache = {
        users:userRows,
        workouts:workoutRows,
        exercises:exerciseRows,
        collected:collectedRows
      };

      root.innerHTML = `
        <section class="adm-card">
          <div class="adm-title">DATABASE USAGE (ESTIMATED)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">
            <div class="version-row">USED <strong style="float:right">${formatBytes(totalMeasured)}</strong></div>
            <div class="version-row">FREE <strong style="float:right">${formatBytes(estimatedFree)}</strong></div>
            <div class="version-row">LIMIT <strong style="float:right">${formatBytes(FIRESTORE_SPARK_LIMIT_BYTES)}</strong></div>
            <div class="version-row">USAGE <strong style="float:right">${usagePct}%</strong></div>
          </div>
          <div style="margin-top:8px;color:var(--muted);font-size:.72rem;letter-spacing:.06em">Estimate based on loaded table payloads, not exact Firestore storage billing/index size.</div>
        </section>
        <section class="adm-card">
          <div class="adm-title">FILTERS</div>
          <div class="adm-filters">
            <input id="adm-filter-q" class="fi" placeholder="Search across tables..." value="${escHtml(adminFilterQuery)}" oninput="setAdminFiltersFromUi()">
            <select id="adm-filter-user" class="fsel" onchange="setAdminFiltersFromUi()">${userOptions}</select>
            <input id="adm-filter-from" class="fi" type="date" value="${escHtml(adminDateFrom)}" onchange="setAdminFiltersFromUi()">
            <input id="adm-filter-to" class="fi" type="date" value="${escHtml(adminDateTo)}" onchange="setAdminFiltersFromUi()">
          </div>
        </section>
        ${buildTable("Users",["key","name","pin","height_cm","water_l","protein_g","color","created_at"],filteredUsers,usersBytes)}
        ${buildTable("Workouts",["user","date","day_key","done","exercise_entries","note"],filteredWorkouts,workoutsBytes)}
        ${buildTable("Exercises",["user","exercise","source","sets","reps","muscle_group"],filteredExercises,exercisesBytes)}
        ${buildTable("Collected Data",["user","date","type","value","water_l","protein_g","calories","sleep_h","soreness"],filteredCollected,collectedBytes)}
      `;
    }catch(e){
      root.innerHTML=`<div style="color:#ff9b9b;padding:12px">Failed to load admin data.</div>`;
    }
  };

  // ─── DASHBOARD TOGGLE ───
  window.toggleDashboard=function(){
    dashboardOpen=!dashboardOpen;
    const p=document.getElementById("dbp"),b=document.getElementById("dbb");
    if(p) p.style.display=dashboardOpen?"block":"none";
    if(b) b.textContent=dashboardOpen?"▲ DASHBOARD":"▼ DASHBOARD";
    if(dashboardOpen){renderCharts();renderHeatmap();}
  };

  function initSectionStates(){}
  window.toggleSection=function(){};

  // ─── DAY GRID ───
  function renderDayGrid(){
    const grid=document.getElementById("day-grid"); grid.innerHTML="";
    const countEl=document.getElementById("workout-count-label");
    if(countEl) countEl.textContent = String(sortedDayKeys().length).padStart(2,"0");
    const tdk=getTodayDayKey();
    const keys = sortedDayKeys().filter(key=>{
      if(!workoutSearchQuery) return true;
      const day = WORKOUT_PLAN[key];
      const haystack = [day?.label, day?.title, day?.subtitle, ...(day?.exercises || []).map(ex=>ex.name)].join(" ").toLowerCase();
      return haystack.includes(workoutSearchQuery);
    });
    if(!keys.length){
      grid.innerHTML = `<div class="day-card adc empty-state-card"><div class="adl">No workouts match "${workoutSearchQuery}"</div></div>`;
      return;
    }
    keys.forEach(key=>{
      const day=WORKOUT_PLAN[key],isT=key===tdk;
      const isShared=(day.participants||[]).length>1;
      const exerciseCount = (day.exercises||[]).length;
      const card=document.createElement("div");
      card.className="day-card"+(isT?" today-card":"")+(key===activeDay?" active":"");
      card.id=`card-${key}`; card.style.setProperty("--c",day.color||"#333");
      card.innerHTML=`<div class="day-card-shell">
        <div class="day-card-top">
          <div>
            <div class="cl" style="color:${day.color||"#888"}">${getWorkoutDisplayLabel(key)} · ${getWorkoutWeekdayLabel(day.weekday)}</div>
            <div class="ct">${day.title||"WORKOUT"}</div>
            <div class="cs">${day.subtitle||""}</div>
          </div>
          <button class="cmb" title="Options" onclick="toggleCardMenu(event,'${key}')">⋮</button>
        </div>
        <div class="day-card-metrics">
          <span class="workout-metric"><span class="material-symbols-outlined">schedule</span><strong>${Math.max(exerciseCount * 8, 20)}</strong><em>MIN</em></span>
          <span class="workout-metric"><span class="material-symbols-outlined">list_alt</span><strong>${String(exerciseCount).padStart(2,"0")}</strong><em>EXERCISES</em></span>
        </div>
        <div class="cb"><div class="card-bar-fill" style="background:${day.color||"#444"};height:100%;width:0%;transition:width .4s"></div></div>
        <div class="day-card-actions">
          <button class="day-card-edit" onclick="event.stopPropagation();openEdit('${key}')">Edit Plan</button>
          <button class="day-card-start" onclick="event.stopPropagation();startWorkout('${key}')"><span class="material-symbols-outlined">play_arrow</span></button>
        </div>
        ${isShared?'<div class="shared-pill">Shared</div>':''}
        ${isT?'<div class="ctb">TODAY</div>':''}
      </div>`;
      card.onclick=()=>selectDay(key);
      grid.appendChild(card);
    });
    if(Object.keys(WORKOUT_PLAN).length<MAX_DAYS){
      const a=document.createElement("div"); a.className="day-card adc";
      a.innerHTML=`<div class="adi2">+</div><div class="adl">ADD DAY</div>`; a.onclick=()=>openAddDay();
      grid.appendChild(a);
    }
    const rb=document.getElementById("rdb");
    if(rb) rb.style.display=sortedDayKeys().length>=5?"flex":"none";
    if(tdk&&!activeDay){ activeDay=tdk; document.getElementById(`card-${tdk}`)?.classList.add("active"); }
  }

  function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),3000); }

  // ─── DEBUG ───
  window.debugFirebase = async function(){
    const results = {};
    // Check all docs
    for(const pk of Object.keys(PROFILES||{})){
      const docId = PROFILES[pk]?.docId;
      if(!docId) continue;
      const snap = await getDoc(doc(db,"ironlog",docId));
      results[docId] = snap.exists() ? { exists:true, workoutDates: Object.keys(snap.data().workouts||{}).sort() } : { exists:false };
    }
    const sharedSnap = await getDoc(doc(db,"ironlog",SHARED_DOC));
    results[SHARED_DOC] = sharedSnap.exists()
      ? { exists:true, workoutDates: Object.keys(sharedSnap.data().workouts||{}).sort(), hasPlan: !!sharedSnap.data().plan }
      : { exists:false };
    console.log("[IronLog DEBUG]", JSON.stringify(results, null, 2));
    toast("Check browser console (F12) for debug info");
  };
  window.forceMigrate = async function(){
    toast("🔄 Force migrating...");
    await migrateOldData();
    toast("✅ Migration done — reloading");
    setTimeout(()=>loadData(), 500);
  };

  async function initAuthGate(){
    if(authInitialized) return;
    authInitialized = true;
    document.body.classList.add("auth-locked");
    await loadAccounts();
    renderAuthUsers();
    renderThemeColorPicker("signup-color-swatches","signup-color","#4361ee");
    showAuthMode("home");
    const gate=document.getElementById("auth-gate");
    if(gate) gate.style.display="flex";
    hideAppSplash();
  }

  // ─── INIT ───
  window.addEventListener("DOMContentLoaded",()=>{
    syncOfflineState();
    registerServiceWorker();
    window.addEventListener("beforeinstallprompt", e=>{
      e.preventDefault();
      deferredInstallPrompt = e;
      updateInstallButton();
    });
    window.addEventListener("appinstalled", ()=>{
      deferredInstallPrompt = null;
      updateInstallButton();
      renderInstallSettingsBlock();
      toast("✓ Iron Log installed");
    });
    window.addEventListener("online", ()=>{
      syncOfflineState();
      if(hasPendingSync(activeProfile)) saveData();
    });
    window.addEventListener("offline", ()=>{
      syncOfflineState();
      toast("Offline mode active");
    });
    document.addEventListener("gesturestart", e=>e.preventDefault(), { passive:false });
    document.addEventListener("gesturechange", e=>e.preventDefault(), { passive:false });
    document.addEventListener("gestureend", e=>e.preventDefault(), { passive:false });
    let lastTouchEnd = 0;
    document.addEventListener("touchend", e=>{
      const now = Date.now();
      if(now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, { passive:false });
    const th=localStorage.getItem("ironlog_theme");
    if(th==="light")document.documentElement.classList.add("light-mode");
    try{
      const raw=localStorage.getItem("ironlog_settings_sections");
      if(raw){
        const parsed=JSON.parse(raw);
        if(parsed&&typeof parsed==="object") settingsSectionState={...settingsSectionState,...parsed};
      }
    }catch(_e){}
    document.getElementById("cii").addEventListener("change",handleCsvImport);
    document.getElementById("sto").addEventListener("click",closeSettings);
    document.addEventListener("click",(e)=>{
      const panel=document.getElementById("notif-panel");
      const btn=e.target?.closest?.(".notif-btn");
      if(btn) return;
      if(panel && notificationsOpen && !panel.contains(e.target)){
        notificationsOpen=false;
        panel.style.display="none";
      }
    });
    try{ notificationsSeen=JSON.parse(localStorage.getItem(`ironlog_notif_seen_${activeProfile}`)||"{}")||{}; }catch(_e){ notificationsSeen={}; }
    renderAppVersion();
    updateLogoColor(); updateClock(); setInterval(updateClock,1000);
    applyScreenMode();
    setMobileSection("dashboard");
    initCoverSwipe();
    initSwipeGestures(); // Initialize swipe gestures for mobile
    initAuthGate();
    initSectionStates();
    syncBottomNavState();
    window.addEventListener("resize", handleScreenChange);
  });
  const chartValueLabelPlugin = {
    id: "ironlogValueLabels",
    afterDatasetsDraw(chart, _args, opts){
      if(!opts?.enabled) return;
      const { ctx } = chart;
      ctx.save();
      const drawText = (text, x, y, color="#f3f1ef")=>{
        ctx.font = "700 11px 'Barlow Condensed', sans-serif";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(text), x, y);
      };
      chart.data.datasets.forEach((dataset, datasetIndex)=>{
        const meta = chart.getDatasetMeta(datasetIndex);
        if(meta.hidden) return;
        meta.data.forEach((element, index)=>{
          const raw = Array.isArray(dataset.data) ? dataset.data[index] : null;
          const value = Number(raw || 0);
          if(!value) return;
          if(chart.config.type === "bar"){
            const props = element.getProps(["x","y","base"], true);
            const y = props.y < props.base ? props.y - 10 : props.y + 10;
            drawText(value, props.x, y);
            return;
          }
          if(chart.config.type === "doughnut"){
            const angle = (element.startAngle + element.endAngle) / 2;
            const radius = (element.innerRadius + element.outerRadius) / 2;
            const x = element.x + Math.cos(angle) * radius;
            const y = element.y + Math.sin(angle) * radius;
            drawText(value, x, y, "#111");
          }
        });
      });
      ctx.restore();
    }
  };
  if(window.Chart && !Chart.registry.plugins.get("ironlogValueLabels")){
    Chart.register(chartValueLabelPlugin);
  }
