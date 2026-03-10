'use client';
// components/Sidebar.tsx
//  MOBILE FRIENDLY — hamburger + bottom nav bar on mobile
//  Notification bell + drawer (bottom sheet on mobile, side panel on desktop)
//  Responsive: sidebar on desktop (≥768px), top bar + bottom nav on mobile

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, GitMerge, Users, Building2,
  CheckSquare, Settings, LogOut, ChevronRight, Menu, X,
  Bell, Clock, CheckCircle2, Loader2, Target,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

const ALL_NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, module: 'dashboard'  },
  { href: '/pipeline',   label: 'Pipeline',    icon: GitMerge,        module: 'pipeline'   },
  { href: '/contacts',   label: 'Contacts',    icon: Users,           module: 'contacts'   },
  { href: '/companies',  label: 'Entreprises', icon: Building2,       module: 'companies'  },
  { href: '/tasks',      label: 'Tâches',      icon: CheckSquare,     module: 'tasks'      },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,        module: 'settings'   },
] as const;

interface Notification {
  id: string; type: string; title: string; body: string | null;
  entity_id: string | null; entity_type: string | null;
  read: boolean; created_at: string;
}
interface TaskDetails {
  id: string; title: string; description: string | null;
  status: 'pending'|'in_progress'|'done'|'overdue';
  priority: 'low'|'medium'|'high'; due_date: string | null;
}
const STATUS_CFG = {
  pending:     { label:'À faire',   color:'#60a5fa', bg:'rgba(96,165,250,0.1)',  border:'rgba(96,165,250,0.25)'  },
  in_progress: { label:'En cours',  color:'#fbbf24', bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.25)'  },
  done:        { label:'Terminée',  color:'#34d399', bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.25)'  },
  overdue:     { label:'En retard', color:'#f87171', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.25)' },
};
const PRIORITY_CFG = {
  low:    { label:'Basse',   color:'rgba(255,255,255,0.3)' },
  medium: { label:'Moyenne', color:'#fbbf24'               },
  high:   { label:'Haute',   color:'#f87171'               },
};

/* ─── Notification Drawer ────────────────────────────────────── */
function NotificationDrawer({ open, onClose, notifications, setNotifications, loading, isMobile }:{
  open:boolean; onClose:()=>void; notifications:Notification[];
  setNotifications:React.Dispatch<React.SetStateAction<Notification[]>>;
  loading:boolean; isMobile:boolean;
}) {
  const supabase = getSupabaseClient();
  const [tasks,       setTasks]       = useState<Record<string,TaskDetails>>({});
  const [taskLoading, setTaskLoading] = useState<Record<string,boolean>>({});
  const [expanded,    setExpanded]    = useState<string|null>(null);
  const [statusSaving,setStatusSaving]= useState<string|null>(null);
  const [helpSent,    setHelpSent]    = useState<string|null>(null);
  const [search,      setSearch]      = useState('');

  async function loadTask(id:string){ if(tasks[id]) return; setTaskLoading(p=>({...p,[id]:true})); const {data}=await supabase.from('tasks').select('*').eq('id',id).maybeSingle(); if(data) setTasks(p=>({...p,[id]:data as TaskDetails})); setTaskLoading(p=>({...p,[id]:false})); }
  function toggleExpand(n:Notification){ const nid=expanded===n.id?null:n.id; setExpanded(nid); if(nid&&n.entity_id&&n.entity_type==='task') loadTask(n.entity_id); if(!n.read) markRead(n.id); }
  async function markRead(id:string){ await supabase.from('notifications').update({read:true}).eq('id',id); setNotifications(p=>p.map(n=>n.id===id?{...n,read:true}:n)); }
  async function markAllRead(){ const ids=notifications.filter(n=>!n.read).map(n=>n.id); if(!ids.length) return; await supabase.from('notifications').update({read:true}).in('id',ids); setNotifications(p=>p.map(n=>({...n,read:true}))); }
  async function del(id:string){ await supabase.from('notifications').delete().eq('id',id); setNotifications(p=>p.filter(n=>n.id!==id)); }
  async function updateStatus(taskId:string, status:TaskDetails['status']){ setStatusSaving(taskId); await supabase.from('tasks').update({status}).eq('id',taskId); setTasks(p=>({...p,[taskId]:{...p[taskId],status}})); setStatusSaving(null); }
  async function requestHelp(td:TaskDetails){
    // Insert a notification to the admin (assigned_by) asking for help
    setHelpSent(td.id);
    try {
      // Find the admin to notify — get assigned_by from task
      const {data:task} = await supabase.from('tasks').select('assigned_by,title').eq('id',td.id).maybeSingle();
      const targetId = (task as any)?.assigned_by;
      if(!targetId) { setTimeout(()=>setHelpSent(null),3000); return; }
      await supabase.from('notifications').insert({
        user_id: targetId,
        type: 'help_requested',
        title: '🆘 Aide demandée sur une tâche',
        body: 'Demande d'aide pour : ' + td.title,
        entity_id: td.id,
        entity_type: 'task',
      });
      setTimeout(()=>setHelpSent(null), 3000);
    } catch(e){ setHelpSent(null); }
  }

  const filtered=notifications.filter(n=>!search||n.title.toLowerCase().includes(search.toLowerCase())||n.body?.toLowerCase().includes(search.toLowerCase()));
  const unread=notifications.filter(n=>!n.read).length;
  if(!open) return null;

  const panelStyle: React.CSSProperties = isMobile
    ? {position:'fixed',left:0,right:0,bottom:0,top:'8%',zIndex:200,display:'flex',flexDirection:'column',background:'rgba(8,13,26,0.99)',borderRadius:'20px 20px 0 0',border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(24px)'}
    : {position:'fixed',left:256,top:0,height:'100%',width:380,zIndex:95,display:'flex',flexDirection:'column',background:'rgba(8,13,26,0.98)',borderRight:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(24px)'};

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:isMobile?190:90,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}}/>
      <div style={panelStyle}>
        <div style={{padding:'16px 16px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          {isMobile&&<div style={{width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'0 auto 12px'}}/>}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Bell style={{width:15,height:15,color:'#818cf8'}}/><span style={{color:'white',fontWeight:800,fontSize:14}}>Notifications</span>
              {unread>0&&<span style={{background:'#6366f1',color:'white',fontSize:10,fontWeight:900,padding:'2px 7px',borderRadius:10}}>{unread}</span>}
            </div>
            <div style={{display:'flex',gap:6}}>
              {unread>0&&<button onClick={markAllRead} style={{fontSize:11,color:'#818cf8',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:8,padding:'4px 10px',cursor:'pointer'}}>Tout lire</button>}
              <button onClick={onClose} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}><X style={{width:13,height:13}}/></button>
            </div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…"
            style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'7px 12px',color:'white',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'10px'}}>
          {loading?(<div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:40,gap:10,color:'rgba(99,102,241,0.6)'}}><Loader2 style={{width:18,height:18}}/><span style={{fontSize:13}}>Chargement…</span></div>)
          :filtered.length===0?(<div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.2)'}}><Bell style={{width:28,height:28,margin:'0 auto 10px',opacity:0.25}}/><p style={{fontSize:12,margin:0}}>{search?'Aucun résultat':'Aucune notification'}</p></div>)
          :filtered.map(n=>{
            const isTask=n.entity_type==='task'; const isExp=expanded===n.id;
            const td=n.entity_id?tasks[n.entity_id]:null; const tl=n.entity_id?taskLoading[n.entity_id]:false;
            return(
              <div key={n.id} style={{marginBottom:8}}>
                <div onClick={()=>toggleExpand(n)} style={{background:n.read?'rgba(255,255,255,0.02)':'rgba(99,102,241,0.07)',border:`1px solid ${n.read?'rgba(255,255,255,0.06)':'rgba(99,102,241,0.2)'}`,borderRadius:12,padding:'11px 12px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:9,flexShrink:0,background:isTask?'rgba(99,102,241,0.15)':'rgba(52,211,153,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {isTask?<CheckSquare style={{width:13,height:13,color:'#818cf8'}}/>:<Target style={{width:13,height:13,color:'#34d399'}}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>{!n.read&&<span style={{width:5,height:5,borderRadius:3,background:'#6366f1',flexShrink:0}}/>}<p style={{color:'white',fontWeight:n.read?500:700,fontSize:12,margin:0}}>{n.title}</p></div>
                      {n.body&&<p style={{color:'rgba(255,255,255,0.4)',fontSize:11,margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.body}</p>}
                      <p style={{color:'rgba(255,255,255,0.2)',fontSize:10,margin:'3px 0 0'}}>{new Date(n.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                    </div>
                    <button onClick={e=>{e.stopPropagation();del(n.id);}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.15)',cursor:'pointer',padding:2}}><X style={{width:11,height:11}}/></button>
                  </div>
                </div>
                {isExp&&isTask&&n.entity_id&&(
                  <div style={{background:'rgba(99,102,241,0.04)',border:'1px solid rgba(99,102,241,0.12)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:14}}>
                    {tl?(<div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(99,102,241,0.5)'}}><Loader2 style={{width:12,height:12}}/><span style={{fontSize:11}}>Chargement…</span></div>)
                    :td?(<div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <p style={{color:'white',fontWeight:700,fontSize:13,margin:0}}>{td.title}</p>
                      {td.description&&<p style={{color:'rgba(255,255,255,0.35)',fontSize:11,margin:0,lineHeight:1.5}}>{td.description}</p>}
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {td.due_date&&<span style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'rgba(255,255,255,0.3)'}}><Clock style={{width:9,height:9}}/>{new Date(td.due_date).toLocaleDateString('fr-FR')}</span>}
                        <span style={{fontSize:10,color:PRIORITY_CFG[td.priority]?.color,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{PRIORITY_CFG[td.priority]?.label}</span>
                      </div>
                      <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,color:'rgba(255,255,255,0.25)',margin:'0 0 4px'}}>Modifier le statut</p>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {(Object.entries(STATUS_CFG) as [TaskDetails['status'],any][]).map(([sk,sc])=>{
                          const cur=td.status===sk;
                          return <button key={sk} onClick={()=>!cur&&updateStatus(td.id,sk)} disabled={cur||statusSaving===td.id}
                            style={{background:cur?sc.bg:'rgba(255,255,255,0.03)',border:`1px solid ${cur?sc.border:'rgba(255,255,255,0.08)'}`,borderRadius:8,padding:'5px 10px',color:cur?sc.color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,cursor:cur?'default':'pointer'}}>{sc.label}</button>;
                        })}
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <CheckCircle2 style={{width:12,height:12,color:STATUS_CFG[td.status]?.color}}/>
                          <span style={{fontSize:11,color:STATUS_CFG[td.status]?.color,fontWeight:700}}>Statut : {STATUS_CFG[td.status]?.label}</span>
                        </div>
                        <button onClick={()=>requestHelp(td)}
                          style={{display:'flex',alignItems:'center',gap:4,background:helpSent===td.id?'rgba(52,211,153,0.1)':'rgba(251,191,36,0.08)',border:`1px solid ${helpSent===td.id?'rgba(52,211,153,0.25)':'rgba(251,191,36,0.2)'}`,borderRadius:8,padding:'4px 10px',color:helpSent===td.id?'#34d399':'#fbbf24',fontSize:10,fontWeight:700,cursor:'pointer',transition:'all 0.2s'}}>
                          {helpSent===td.id?'✅ Demande envoyée':'🆘 Demander de l'aide'}
                        </button>
                      </div>
                    </div>):<p style={{color:'rgba(255,255,255,0.2)',fontSize:11,margin:0}}>Tâche introuvable.</p>}
                  </div>
                )}
                {isExp&&n.entity_type==='lead'&&(
                  <div style={{background:'rgba(52,211,153,0.04)',border:'1px solid rgba(52,211,153,0.12)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:14}}>
                    <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:600,margin:'0 0 8px'}}>{n.body}</p>
                    <Link href="/pipeline" onClick={onClose}
                      style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:8,padding:'6px 12px',color:'#34d399',fontSize:11,fontWeight:700,textDecoration:'none'}}>
                      🎯 Voir dans le Pipeline →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─── Main Sidebar component ─────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const [role,          setRole]          = useState<string|null>(null);
  const [userId,        setUserId]        = useState('');
  const [allowed,       setAllowed]       = useState<Set<string>>(new Set());
  const [userEmail,     setUserEmail]     = useState('');
  const [ready,         setReady]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading,  setNotifLoading]  = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [mobileMenuOpen,setMobileMenuOpen]= useState(false);
  const [isMobile,      setIsMobile]      = useState(false);

  useEffect(()=>{
    function check(){ setIsMobile(window.innerWidth<768); }
    check();
    window.addEventListener('resize',check);
    return ()=>window.removeEventListener('resize',check);
  },[]);

  // Close mobile menu on route change
  useEffect(()=>{ setMobileMenuOpen(false); },[pathname]);

  useEffect(()=>{
    async function init(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){setReady(true);return;}
      setUserEmail(user.email??''); setUserId(user.id);
      const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
      const r=profile?.role??null; setRole(r);
      if(r==='admin'){ setAllowed(new Set(ALL_NAV.map(n=>n.module))); }
      else { const {data:perms}=await supabase.from('module_permissions').select('module,can_access').eq('role',r); if(perms&&perms.length>0) setAllowed(new Set<string>(perms.filter(p=>p.can_access).map(p=>p.module as string))); else setAllowed(new Set(['dashboard','pipeline','contacts','companies','tasks'])); }
      await loadNotifs(user.id); setReady(true);
    }
    init();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>init());
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(!userId) return; const iv=setInterval(()=>loadNotifs(userId),30000); return ()=>clearInterval(iv); },[userId]);

  useEffect(()=>{
    if(!userId) return;
    const ch=supabase.channel(`notifs-${userId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},p=>setNotifications(prev=>[p.new as Notification,...prev])).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[userId]);

  async function loadNotifs(uid:string){ setNotifLoading(true); const {data}=await supabase.from('notifications').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(50); if(data) setNotifications(data as Notification[]); setNotifLoading(false); }
  async function handleSignOut(){
    try {
      await supabase.auth.signOut();
    } catch(e) { /* ignore */ }
    // Force hard redirect to login — clears all state
    window.location.replace('/auth/login');
  }

  if(pathname?.startsWith('/auth')) return null;

  const visibleNav=ALL_NAV.filter(i=>allowed.has(i.module));
  const unread=notifications.filter(n=>!n.read).length;
  const roleLabel=role==='admin'?'Administrateur':role==='commercial'?'Commercial':role==='user_standard'?'Standard':role==='partner'?'Partenaire':role??'';

  /* ── MOBILE ─────────────────────────────────────────────────── */
  if(isMobile) return (
    <>
      <style>{`@keyframes slideInLeft{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:none}}`}</style>

      {/* Top bar */}
      <header style={{position:'fixed',top:0,left:0,right:0,zIndex:50,height:56,background:'rgba(8,13,26,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',padding:'0 14px',gap:12}}>
        <button onClick={()=>setMobileMenuOpen(true)} style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <Menu style={{width:18,height:18,color:'rgba(255,255,255,0.7)'}}/>
        </button>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:28,height:28,borderRadius:8,background:'#4f46e5',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:'white',fontWeight:900,fontStyle:'italic',fontSize:13}}>A</span>
          </div>
          <span style={{color:'white',fontWeight:800,fontStyle:'italic',fontSize:15}}>AAAS CRM</span>
        </div>
        <button onClick={()=>setDrawerOpen(true)} style={{position:'relative',width:36,height:36,borderRadius:10,background:unread>0?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${unread>0?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <Bell style={{width:16,height:16,color:unread>0?'#818cf8':'rgba(255,255,255,0.35)'}}/>
          {unread>0&&<span style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:'#6366f1',color:'white',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'}}>{unread>99?'99+':unread}</span>}
        </button>
      </header>

      {/* Slide-in menu */}
      {mobileMenuOpen&&(
        <>
          <div onClick={()=>setMobileMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}/>
          <aside style={{position:'fixed',left:0,top:0,bottom:0,width:280,zIndex:110,background:'rgba(8,13,26,0.99)',borderRight:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(24px)',display:'flex',flexDirection:'column',animation:'slideInLeft 0.25s ease'}}>
            <div style={{padding:'18px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:'#4f46e5',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'white',fontWeight:900,fontStyle:'italic',fontSize:16}}>A</span></div>
                <div><p style={{color:'white',fontWeight:900,fontStyle:'italic',margin:0,fontSize:15}}>AAAS</p><p style={{color:'rgba(255,255,255,0.3)',margin:0,fontSize:11}}>CRM SaaS</p></div>
              </div>
              <button onClick={()=>setMobileMenuOpen(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.5)'}}><X style={{width:14,height:14}}/></button>
            </div>
            <nav style={{flex:1,padding:'10px 10px',overflowY:'auto'}}>
              {visibleNav.map(({href,label,icon:Icon})=>{
                const active=pathname===href||pathname?.startsWith(href+'/');
                return <Link key={href} href={href} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:12,marginBottom:4,background:active?'rgba(99,102,241,0.15)':'transparent',border:`1px solid ${active?'rgba(99,102,241,0.25)':'transparent'}`,color:active?'#818cf8':'rgba(255,255,255,0.5)',textDecoration:'none'}}>
                  <Icon style={{width:18,height:18,flexShrink:0}}/><span style={{fontSize:14,fontWeight:active?700:500,flex:1}}>{label}</span>
                  {active&&<ChevronRight style={{width:14,height:14,color:'rgba(99,102,241,0.5)'}}/>}
                </Link>;
              })}
            </nav>
            <div style={{padding:'10px 10px 24px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              {role&&<div style={{padding:'10px 14px',marginBottom:8,background:'rgba(255,255,255,0.03)',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)'}}>
                <p style={{color:'rgba(255,255,255,0.3)',fontSize:11,margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userEmail}</p>
                <p style={{color:'#818cf8',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,margin:0}}>{roleLabel}</p>
              </div>}
              <button onClick={handleSignOut} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,background:'transparent',border:'none',color:'rgba(248,113,113,0.7)',cursor:'pointer',fontSize:13,fontWeight:500}}>
                <LogOut style={{width:16,height:16}}/>Se déconnecter
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Bottom nav bar */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:50,height:62,background:'rgba(8,13,26,0.97)',borderTop:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'space-around',padding:'0 4px'}}>
        {visibleNav.slice(0,5).map(({href,label,icon:Icon})=>{
          const active=pathname===href||pathname?.startsWith(href+'/');
          return <Link key={href} href={href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 8px',borderRadius:10,color:active?'#818cf8':'rgba(255,255,255,0.3)',textDecoration:'none',flex:1,minWidth:0,background:active?'rgba(99,102,241,0.1)':'transparent'}}>
            <Icon style={{width:20,height:20}}/>
            <span style={{fontSize:9,fontWeight:active?700:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{label}</span>
          </Link>;
        })}
      </nav>

      <NotificationDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} notifications={notifications} setNotifications={setNotifications} loading={notifLoading} isMobile={true}/>
    </>
  );

  /* ── DESKTOP ────────────────────────────────────────────────── */
  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40" style={{background:'rgba(8,13,26,0.95)',borderRight:'1px solid rgba(255,255,255,0.06)',backdropFilter:'blur(20px)'}}>
        <div className="px-6 py-7 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0"><span className="text-white font-black italic text-lg leading-none">A</span></div>
          <div><p className="text-white font-black italic tracking-tight text-lg leading-none">AAAS</p><p className="text-white/30 text-xs mt-0.5">CRM SaaS</p></div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {!ready?Array.from({length:5}).map((_,i)=><div key={i} className="h-10 rounded-2xl bg-white/5 animate-pulse mx-1"/>)
          :visibleNav.map(({href,label,icon:Icon})=>{
            const active=pathname===href||pathname?.startsWith(href+'/');
            return <Link key={href} href={href} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200 group select-none ${active?'bg-indigo-600/20 text-indigo-400':'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${active?'text-indigo-400':'text-white/30 group-hover:text-white/60'}`}/>
              <span className="text-sm font-medium flex-1">{label}</span>
              {active&&<ChevronRight className="w-3 h-3 text-indigo-400/60 flex-shrink-0"/>}
            </Link>;
          })}
        </nav>
        <div className="px-4 py-5 border-t border-white/5 space-y-2">
          {role&&<div className="px-3 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/30 truncate">{userEmail}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/70 mt-0.5">{roleLabel}</p>
            </div>
            <button onClick={()=>setDrawerOpen(true)} style={{position:'relative',width:36,height:36,borderRadius:10,background:unread>0?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${unread>0?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
              <Bell style={{width:15,height:15,color:unread>0?'#818cf8':'rgba(255,255,255,0.3)'}}/>
              {unread>0&&<span style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:'#6366f1',color:'white',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'}}>{unread>99?'99+':unread}</span>}
            </button>
          </div>}
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-sm font-medium">
            <LogOut className="w-4 h-4 flex-shrink-0"/>Se déconnecter
          </button>
        </div>
      </aside>
      <NotificationDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} notifications={notifications} setNotifications={setNotifications} loading={notifLoading} isMobile={false}/>
    </>
  );
}
