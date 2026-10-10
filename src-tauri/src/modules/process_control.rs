use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf, sync::Mutex};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::Manager;

#[derive(Clone, Serialize, Deserialize)]
pub struct SuspendedProcess { pid:u32, started:u64, name:String }
#[derive(Default)]
struct Control { path:Option<PathBuf>, suspended:BTreeMap<u32,SuspendedProcess> }
#[derive(Default)]
pub struct ProcessControlState(Mutex<Control>);
#[derive(Deserialize)]
#[serde(rename_all="lowercase")]
pub enum Action { Kill, Suspend, Resume }

fn checked_process(pid:u32, started:u64) -> Result<String,String> {
    if pid<=1||pid>i32::MAX as u32||pid==std::process::id()||started==0{return Err("This process is protected".into());}
    let id=Pid::from_u32(pid);
    let mut system=System::new();
    system.refresh_processes_specifics(ProcessesToUpdate::Some(&[id]),true,ProcessRefreshKind::nothing());
    let process=system.process(id).ok_or("Process has exited")?;
    if process.start_time()!=started{return Err("Process ID was reused; refresh the list".into());}
    Ok(process.name().to_string_lossy().into_owned())
}

impl Control {
    fn load(&mut self, app:&tauri::AppHandle)->Result<(),String>{
        if self.path.is_some(){return Ok(());}
        let dir=app.path().app_cache_dir().map_err(|e|e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e|e.to_string())?;
        let path=dir.join("suspended-processes.json");
        if path.exists(){self.suspended=serde_json::from_slice(&std::fs::read(&path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;}
        self.path=Some(path);Ok(())
    }
    fn save(&self)->Result<(),String>{
        use std::io::Write;
        let path=self.path.as_ref().ok_or("Process store unavailable")?;
        let mut file=tempfile::NamedTempFile::new_in(path.parent().ok_or("Missing process store directory")?).map_err(|e|e.to_string())?;
        file.write_all(&serde_json::to_vec(&self.suspended).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
        file.as_file().sync_all().map_err(|e|e.to_string())?;
        file.persist(path).map_err(|e|e.to_string())?;Ok(())
    }
}

#[cfg(unix)]
fn signal(pid:u32,action:&Action)->Result<(),String>{
    let signal=match action {Action::Kill=>libc::SIGKILL,Action::Suspend=>libc::SIGSTOP,Action::Resume=>libc::SIGCONT};
    if unsafe{libc::kill(pid as i32,signal)}==0{Ok(())}else{Err(std::io::Error::last_os_error().to_string())}
}
#[cfg(windows)]
fn signal(pid:u32,action:&Action)->Result<(),String>{
    use windows_sys::Win32::{Foundation::CloseHandle,System::Threading::{OpenProcess,TerminateProcess,PROCESS_SUSPEND_RESUME,PROCESS_TERMINATE}};
    #[link(name="ntdll")]
    unsafe extern "system" { fn NtSuspendProcess(process:*mut core::ffi::c_void)->i32; fn NtResumeProcess(process:*mut core::ffi::c_void)->i32; }
    unsafe {
        let access=if matches!(action,Action::Kill){PROCESS_TERMINATE}else{PROCESS_SUSPEND_RESUME};
        let handle=OpenProcess(access,0,pid);
        if handle.is_null(){return Err(std::io::Error::last_os_error().to_string());}
        let ok=match action {Action::Kill=>TerminateProcess(handle,1)!=0,Action::Suspend=>NtSuspendProcess(handle)>=0,Action::Resume=>NtResumeProcess(handle)>=0};
        CloseHandle(handle);
        if ok{Ok(())}else{Err("Process action was denied".into())}
    }
}

#[tauri::command]
pub fn suspended_processes(app:tauri::AppHandle,state:tauri::State<'_,ProcessControlState>)->Result<Vec<SuspendedProcess>,String>{
    let mut control=state.0.lock().map_err(|e|e.to_string())?;control.load(&app)?;
    control.suspended.retain(|_,process|checked_process(process.pid,process.started).is_ok());
    Ok(control.suspended.values().cloned().collect())
}

#[tauri::command]
pub fn control_process(app:tauri::AppHandle,state:tauri::State<'_,ProcessControlState>,pid:u32,started:u64,action:Action)->Result<Vec<SuspendedProcess>,String>{
    let name=checked_process(pid,started)?;
    let mut control=state.0.lock().map_err(|e|e.to_string())?;control.load(&app)?;
    if matches!(action,Action::Suspend)&&control.suspended.get(&pid).is_some_and(|process|process.started==started){return Ok(control.suspended.values().cloned().collect());}
    if matches!(action,Action::Suspend){control.suspended.insert(pid,SuspendedProcess{pid,started,name});control.save()?;}
    if let Err(error)=signal(pid,&action){if matches!(action,Action::Suspend){control.suspended.remove(&pid);let _=control.save();}return Err(error);}
    if !matches!(action,Action::Suspend){control.suspended.remove(&pid);control.save()?;}
    Ok(control.suspended.values().cloned().collect())
}

#[cfg(test)]
mod tests {use super::*; #[test]fn protected_pids_are_rejected(){assert!(checked_process(0,1).is_err());assert!(checked_process(1,1).is_err());assert!(checked_process(std::process::id(),1).is_err());assert!(checked_process(u32::MAX,1).is_err());}}
