import { writeFile } from "node:fs/promises";
const url="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";
const response=await fetch(url);if(!response.ok)throw new Error(`Map download: ${response.status}`);
const source=await response.json();
const polygons=source.features.flatMap(feature=>feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:feature.geometry.coordinates).map(rings=>({rings,minX:Math.min(...rings[0].map(p=>p[0])),maxX:Math.max(...rings[0].map(p=>p[0])),minY:Math.min(...rings[0].map(p=>p[1])),maxY:Math.max(...rings[0].map(p=>p[1]))}));
function inside(x,y,ring){let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i];const [xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;}return result;}
const points=[];
for(let latitude=-88;latitude<=88;latitude+=2)for(let longitude=-180;longitude<180;longitude+=2){if(polygons.some(p=>longitude>=p.minX&&longitude<=p.maxX&&latitude>=p.minY&&latitude<=p.maxY&&inside(longitude,latitude,p.rings[0])&&!p.rings.slice(1).some(r=>inside(longitude,latitude,r))))points.push([longitude,latitude]);}
if(points.length<1000)throw new Error("Incomplete map data");
await writeFile(new URL("../public/world-points.json",import.meta.url),JSON.stringify(points));
console.log(`Generated ${points.length} land points from Natural Earth public-domain data.`);
