/**
 * 高德地图 JS API 加载器
 * 在客户端动态加载高德地图脚本，避免 SSR 问题
 */

let amapPromise: Promise<any> | null = null;

export function loadAMap(): Promise<any> {
  if (amapPromise) return amapPromise;
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));

  amapPromise = new Promise((resolve, reject) => {
    // 如果已加载
    if ((window as any).AMap) {
      resolve((window as any).AMap);
      return;
    }

    const key = process.env.NEXT_PUBLIC_AMAP_KEY;
    const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

    if (!key) {
      reject(new Error('缺少 NEXT_PUBLIC_AMAP_KEY 环境变量'));
      return;
    }

    // 设置安全密钥（JSAPI 2.0 必需）
    if (securityCode) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: securityCode,
      };
    }

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Scale,AMap.ToolBar,AMap.AutoComplete,AMap.PlaceSearch`;
    script.onload = () => {
      if ((window as any).AMap) {
        resolve((window as any).AMap);
      } else {
        reject(new Error('高德地图加载失败'));
      }
    };
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
  });

  return amapPromise;
}
