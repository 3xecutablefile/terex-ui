use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use sysinfo::{Disks, Networks, ProcessRefreshKind, ProcessesToUpdate, System};

pub struct DashboardState(Arc<Mutex<Monitor>>);

impl Default for DashboardState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(Monitor {
            system: System::new(),
            networks: Networks::new(),
            disks: Disks::new(),
            sampled: Instant::now(),
            details_sampled: None,
            processes: Vec::new(),
            network_sample: None,
        })))
    }
}

struct Monitor {
    system: System,
    networks: Networks,
    disks: Disks,
    sampled: Instant,
    details_sampled: Option<Instant>,
    processes: Vec<Process>,
    network_sample: Option<(String,u64,u64)>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    hostname: String,
    os: String,
    kernel: String,
    architecture: String,
    uptime: u64,
    cpu_name: String,
    cpu: Vec<f32>,
    memory_used: u64,
    memory_total: u64,
    swap_used: u64,
    swap_total: u64,
    processes: Vec<Process>,
    interface: Option<String>,
    address: Option<String>,
    received: f64,
    transmitted: f64,
    total_received: u64,
    total_transmitted: u64,
    disks: Vec<Disk>,
}

#[derive(Serialize, Clone)]
struct Process {
    pid: u32,
    name: String,
    cpu: f32,
    memory: u64,
    started: u64,
}

#[derive(Serialize)]
struct Disk {
    mount: String,
    total: u64,
    available: u64,
}

impl Monitor {
    fn snapshot(&mut self) -> Snapshot {
        let elapsed = self.sampled.elapsed().as_secs_f64().max(0.2);
        self.sampled = Instant::now();
        self.system.refresh_cpu_usage();
        self.system.refresh_memory();
        if self
            .details_sampled
            .is_none_or(|last| last.elapsed().as_secs() >= 15)
        {
            self.system.refresh_processes_specifics(
                ProcessesToUpdate::All,
                true,
                ProcessRefreshKind::nothing().with_cpu().with_memory(),
            );
            self.disks.refresh(true);
            let mut processes: Vec<_> = self
                .system
                .processes()
                .iter()
                .map(|(pid, p)| Process {
                    pid: pid.as_u32(),
                    name: p.name().to_string_lossy().into_owned(),
                    cpu: p.cpu_usage(),
                    memory: p.memory(),
                    started: p.start_time(),
                })
                .collect();
            processes
                .sort_unstable_by(|a, b| b.cpu.total_cmp(&a.cpu).then(b.memory.cmp(&a.memory)));
            processes.truncate(5);
            self.processes = processes;
            self.details_sampled = Some(Instant::now());
        }
        self.networks.refresh(true);
        let outbound=crate::modules::public_network::outbound_address();
        let network = self
            .networks
            .iter()
            .filter(|(_, n)| {
                n.ip_networks().iter().any(|ip| {
                    ip.addr.is_ipv4() && !ip.addr.is_loopback() && !ip.addr.is_unspecified()
                })
            })
            .max_by_key(|(_, n)| (n.ip_networks().iter().any(|ip|Some(ip.addr)==outbound),n.total_received().saturating_add(n.total_transmitted())));
        let (received,transmitted)=network.map(|(name,n)| network_rates(self.network_sample.as_ref(),name,n.total_received(),n.total_transmitted(),elapsed)).unwrap_or_default();
        self.network_sample=network.map(|(name,n)|(name.clone(),n.total_received(),n.total_transmitted()));
        Snapshot {
            hostname: System::host_name().unwrap_or_else(|| "localhost".into()),
            os: System::name().unwrap_or_else(|| std::env::consts::OS.into()),
            kernel: System::kernel_version().unwrap_or_default(),
            architecture: std::env::consts::ARCH.into(),
            uptime: System::uptime(),
            cpu_name: self
                .system
                .cpus()
                .first()
                .map(|c| c.brand().to_owned())
                .unwrap_or_default(),
            cpu: self.system.cpus().iter().map(|c| c.cpu_usage()).collect(),
            memory_used: self.system.used_memory(),
            memory_total: self.system.total_memory(),
            swap_used: self.system.used_swap(),
            swap_total: self.system.total_swap(),
            processes: self.processes.clone(),
            interface: network.map(|(name, _)| name.clone()),
            address: network.and_then(|(_, n)| {
                n.ip_networks()
                    .iter()
                    .find(|ip| ip.addr.is_ipv4() && !ip.addr.is_loopback())
                    .map(|ip| ip.addr.to_string())
            }),
            received,
            transmitted,
            total_received: network.map(|(_, n)| n.total_received()).unwrap_or(0),
            total_transmitted: network.map(|(_, n)| n.total_transmitted()).unwrap_or(0),
            disks: self
                .disks
                .iter()
                .map(|disk| Disk {
                    mount: disk.mount_point().to_string_lossy().into_owned(),
                    total: disk.total_space(),
                    available: disk.available_space(),
                })
                .collect(),
        }
    }
}

fn network_rates(previous:Option<&(String,u64,u64)>,name:&str,received:u64,transmitted:u64,elapsed:f64)->(f64,f64){
    match previous {Some((old,rx,tx)) if old==name&&received>=*rx&&transmitted>=*tx=>((received-rx) as f64/elapsed.max(0.2),(transmitted-tx) as f64/elapsed.max(0.2)),_=> (0.0,0.0)}
}

#[tauri::command]
pub async fn dashboard_snapshot(
    state: tauri::State<'_, DashboardState>,
    force_details: Option<bool>,
) -> Result<Snapshot, String> {
    let monitor = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        monitor
            .lock()
            .map_err(|e| e.to_string())
            .map(|mut m| {if force_details.unwrap_or(false){m.details_sampled=None;}m.snapshot()})
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_snapshot_has_bounded_processes_and_finite_rates() {
        let state = DashboardState::default();
        let s = state.0.lock().unwrap().snapshot();
        let details_sampled = state.0.lock().unwrap().details_sampled;
        state.0.lock().unwrap().snapshot();
        assert_eq!(state.0.lock().unwrap().details_sampled, details_sampled);
        assert!(s.processes.len() <= 5);
        assert!(s.memory_used <= s.memory_total);
        assert!(s.received.is_finite() && s.received >= 0.0);
        assert!(s.transmitted.is_finite() && s.transmitted >= 0.0);
        assert!(s
            .cpu
            .iter()
            .all(|c| c.is_finite() && (0.0..=100.0).contains(c)));
    }

    #[test]
    fn network_rates_require_a_matching_baseline(){
        let previous=("en0".into(),100,200);
        assert_eq!(network_rates(None,"en0",1000,2000,5.0),(0.0,0.0));
        assert_eq!(network_rates(Some(&previous),"en0",200,400,5.0),(20.0,40.0));
        assert_eq!(network_rates(Some(&previous),"utun0",200,400,5.0),(0.0,0.0));
        assert_eq!(network_rates(Some(&previous),"en0",0,0,5.0),(0.0,0.0));
    }
}
