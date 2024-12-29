export default {
  async scheduled(event, env, ctx) {
    // `env` contains your environment variables
    const ACCESS_KEY_ID = env.ACCESS_KEY_ID;
    const ACCESS_KEY_SECRET = env.ACCESS_KEY_SECRET;
    // Your scheduled task logic here
    ctx.waitUntil(handleScheduledEvent(ACCESS_KEY_ID, ACCESS_KEY_SECRET));
  },
};

const API_URL = "https://proxy.webshare.io/api/v2/proxy/list/";  // 代理 API 地址
const ALIYUN_API_URL = "https://alidns.aliyuncs.com";  // 阿里云 DNS API 地址
const DOMAIN_NAME = "narous.cc";  // 替换为你的域名
const RECORD_ID = "936479706883893248";  // 替换为你的 DNS 记录 ID

async function handleScheduledEvent(ACCESS_KEY_ID, ACCESS_KEY_SECRET) {
  try {
    console.log(`Handling scheduled event with domain: ${DOMAIN_NAME}`);
    // Fetch current proxy IP
    const currentIP = await fetchProxyIP();
    console.log(`Fetched current IP: ${currentIP}`);
    
    // Fetch current DNS record IP
    const dnsIP = await fetchDNSRecordIP(ACCESS_KEY_ID, ACCESS_KEY_SECRET);
    console.log(`Current DNS IP: ${dnsIP}`);

    // Update DNS record if the IPs differ
    if (currentIP !== dnsIP) {
      const updateResult = await updateDNSRecord(ACCESS_KEY_ID, ACCESS_KEY_SECRET, currentIP);
      console.log("DNS Record Updated:", updateResult);
    } else {
      console.log("IP Unchanged, No Update Needed.");
    }
  } catch (error) {
    console.error("Error in Scheduled Event:", error);
  }
}

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduledEvent());
});

// 获取代理 IP
async function fetchProxyIP() {
  const url = new URL(API_URL);
  url.searchParams.append('mode', 'direct');
  url.searchParams.append('page', '1');
  url.searchParams.append('page_size', '1');  // 获取代理列表中的第一个代理

  const req = await fetch(url.href, {
    method: "GET",
    headers: {
      Authorization: "nm461md8ievg6s00pzy9vg5tad9nns2ymalub4mh"  // 使用您的 Webshare API Token
    }
  });

  const res = await req.json();
  if (!res.results || res.results.length === 0) {
    throw new Error("No proxies found.");
  }

  const proxy = res.results[0];  // 选择第一个代理
  return proxy.proxy_address;  // 获取代理的 IP 地址
}

// 获取当前 DNS 记录的 IP
async function fetchDNSRecordIP(ACCESS_KEY_ID, ACCESS_KEY_SECRET) {
  const timestamp = new Date().toISOString();
  const query = {
    Action: "DescribeDomainRecordInfo",
    RecordId: RECORD_ID,
    Format: "JSON",
    Version: "2015-01-09",
    AccessKeyId: ACCESS_KEY_ID,
    Timestamp: timestamp,
    SignatureMethod: "HMAC-SHA1",
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
  };
  query.Signature = await generateSignature(query, "GET", ACCESS_KEY_SECRET);

  const url = `${ALIYUN_API_URL}?${new URLSearchParams(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch DNS record: ${response.statusText}`);
  }
  const data = await response.json();
  return data.Value;  // 假设 API 返回的数据中包含 IP 地址
}

// 更新 DNS 记录
async function updateDNSRecord(ACCESS_KEY_ID, ACCESS_KEY_SECRET, newIP) {
  const timestamp = new Date().toISOString();
  const query = {
    Action: "UpdateDomainRecord",
    RecordId: RECORD_ID,
    RR: "proxy",
    Type: "A",
    Value: newIP,
    Format: "JSON",
    Version: "2015-01-09",
    AccessKeyId: ACCESS_KEY_ID,
    Timestamp: timestamp,
    SignatureMethod: "HMAC-SHA1",
    SignatureVersion: "1.0",
    SignatureNonce: crypto.randomUUID(),
  };
  query.Signature = await generateSignature(query, "GET", ACCESS_KEY_SECRET);

  const url = `${ALIYUN_API_URL}?${new URLSearchParams(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to update DNS record: ${response.statusText}`);
  }
  return await response.json();
}

// 使用异步的 HMAC-SHA1 签名生成方法
async function generateSignature(params, method, ACCESS_KEY_SECRET) {
  const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
    obj[key] = params[key];
    return obj;
  }, {});

  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  const stringToSign = `${method}&${encodeURIComponent("/")}&${encodeURIComponent(queryString)}`;

  // 使用异步 API 进行加密
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign); // 将字符串转换为字节
  const key = encoder.encode(`${ACCESS_KEY_SECRET}&`); // 同样转换密钥为字节

  const hmac = await crypto.subtle.importKey(
    "raw", 
    key, 
    { name: "HMAC", hash: { name: "SHA-1" } }, 
    false, 
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", hmac, data);

  // 将签名从 ArrayBuffer 转换为 Base64 字符串
  const signatureBytes = new Uint8Array(signatureBuffer);
  return btoa(String.fromCharCode(...signatureBytes));
}
