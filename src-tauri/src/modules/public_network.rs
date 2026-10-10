use serde::{Deserialize, Serialize};
use std::{net::{IpAddr, UdpSocket}, sync::Arc, time::{Duration, Instant}};

pub fn outbound_address() -> Option<IpAddr> {
    let socket=UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("1.1.1.1:443").ok()?;
    socket.local_addr().ok().map(|address|address.ip())
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PublicNetwork {
    ip: String,
    city: String,
    region: String,
    country: String,
    latitude: f64,
    longitude: f64,
}

type Cached = (Instant, Option<IpAddr>, PublicNetwork);
#[derive(Default)]
pub struct PublicNetworkState(Arc<tokio::sync::Mutex<Option<Cached>>>);

#[tauri::command]
pub async fn public_network(state: tauri::State<'_,PublicNetworkState>) -> Result<PublicNetwork,String> {
    let route=outbound_address();
    let mut cache=state.0.lock().await;
    if let Some((time, previous, info))=cache.as_ref() {
        if time.elapsed()<Duration::from_secs(600)&&*previous==route {return Ok(info.clone());}
    }
    let client=reqwest::Client::builder().timeout(Duration::from_secs(8)).build().map_err(|e|e.to_string())?;
    let mut response=client.get("https://ipwho.is/").header("User-Agent","Terex-UI").send().await.map_err(|e|e.to_string())?.error_for_status().map_err(|e|e.to_string())?;
    let mut bytes=Vec::new();
    while let Some(chunk)=response.chunk().await.map_err(|e|e.to_string())? {
        if bytes.len()+chunk.len()>32_768{return Err("Public network response exceeded its limit".into());}
        bytes.extend_from_slice(&chunk);
    }
    let value:serde_json::Value=serde_json::from_slice(&bytes).map_err(|e|e.to_string())?;
    if value.get("success").and_then(|v|v.as_bool())!=Some(true){return Err("Public IP lookup unavailable".into());}
    let info:PublicNetwork=serde_json::from_value(value).map_err(|e|e.to_string())?;
    info.ip.parse::<IpAddr>().map_err(|_|"Invalid public IP response")?;
    if !info.latitude.is_finite()||!info.longitude.is_finite()||info.latitude.abs()>90.0||info.longitude.abs()>180.0 {return Err("Invalid location response".into());}
    *cache=Some((Instant::now(),route,info.clone()));
    Ok(info)
}
