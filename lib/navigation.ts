// 高德地图导航链接（URI API）
// 手机浏览器打开会唤起高德地图 APP 进入路线规划，未安装 APP 则打开高德网页版
// 注意：数据库中的坐标来自高德 POI 搜索，是 GCJ-02 坐标系，所以 coordinate=gaode
export function amapNavUrl(lat: number, lng: number, name: string) {
  return `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(name)}&mode=car&coordinate=gaode&src=halal-restaurant-map`;
}
