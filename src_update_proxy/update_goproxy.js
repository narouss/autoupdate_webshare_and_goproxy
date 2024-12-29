const API_URL = "https://proxy.webshare.io/api/v2/proxy/list/";  // 代理 API 地址

addEventListener("scheduled", (event) => {
  event.waitUntil(handleScheduledEvent());
});

async function handleScheduledEvent() {
  const currentPort = await fetchProxyPort();  // 获取当前代理 端口
  const authorization = await fetchGoProxyAuthorization();  // 获取当前代理 端口
  const proxy_list = await fetchGoProxyList(authorization);
  const goproxy_update_and_checker = await updateGoProxyList(proxy_list, authorization,currentPort)
  /* try {
    const currentPort = await fetchProxyPort();  // 获取当前代理 端口
    const dnsIP = await fetchDNSRecordIP();  // 获取当前 DNS 记录 IP

    if (currentIP !== dnsIP) {
      const updateResult = await updateDNSRecord(currentIP);  // 如果 IP 变更，更新 DNS 记录
      console.log("DNS Record Updated:", updateResult);
    } else {
      console.log("IP Unchanged, No Update Needed.");
    }
  } catch (error) {
    console.error("Error in Scheduled Event:", error);
  } */
    console.log("port:",currentPort);
    console.log("authorization:",authorization);
    console.log("proxy_list:",proxy_list);
    console.log("goproxy_update_and_checker:",goproxy_update_and_checker);
};

// 获取代理 IP
async function fetchProxyPort() {
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
  };

  const proxy = res.results[0];  // 选择第一个代理
  return proxy.port;  // 获取代理的 IP 地址
};

async function fetchGoProxyAuthorization() {
  const url = new URL("https://gorelay.net/api/v1/auth/login");
  const payload = {
    password: "xtk4met6hyz@EKT2btv",
    username: "narous"
}
  const req = await fetch(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    },
    body: JSON.stringify(payload)
  }
  );
  console.log("fetchGoProxyAuthorization HTTP Status:", req.status);
  const res = await req.json();
  const authorization = res.data;
  console.log("authorization: ",authorization);
  return authorization;
}

async function fetchGoProxyList(authorization) {
  const url = new URL("https://gorelay.net/api/v1/user/forward?page=1&size=10");

  const req = await fetch(url.href, {
    method: "GET",
    headers: {
      "Authorization": authorization,  // 使用您的 Webshare API Token
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
    }
  });

  console.log("fetchGoProxyList HTTP Status:", req.status);
  const res = await req.json();
  if (!res.data || res.data.length === 0) {
    throw new Error("No proxies List found.");
  }
  const proxy_list = res.data;  
  return proxy_list;  // 获取代理的 IP 地址
}

async function updateGoProxyList(proxy_list, authorization,currentPort) {
  for (const proxy of proxy_list) {
    const id = proxy.id; // 使用对象中的 id 替换 19808
    // 提取 proxy 中的当前端口
    const currentConfig = JSON.parse(proxy.config);
    const existingPort = currentConfig.dest[0].split(":")[1]; // 获取现有的端口号

    // 如果现有端口与修改后的端口一致，则跳过
    if (existingPort === String(currentPort)) {
      console.log(`Proxy id ${id} already has port ${currentPort}. Skipping update.`);
      continue;
    }
    
    const url = new URL(`https://gorelay.net/api/v1/user/forward/${id}`);
    const payload = {
      ...proxy, // 解构原 proxy 对象
      "config": `{\"dest\":[\"proxy.narous.cc:${currentPort}\"]}`, 
    };

    try {
      const req = await fetch(url.href, {
        method: "POST",
        headers: {
          "Authorization": authorization,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(payload),
      });

      // 打印请求结果
      const res = await req.json();
      console.log(`Response for proxy id ${id}:`, res, ",HTTP Status:", req.status);
    } catch (error) {
      console.error(`Error for proxy id ${id}:`, error);
    }
  }
  return "update is success!!!";
}

// 这是测试的注释
