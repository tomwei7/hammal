# hammal

Hammal 是运行于 cloudflare workers 上的 Docker 镜像加速工具，用于解决获取 Docker 官方镜像速度缓慢以及完全无法获取 k8s.gcr.io 上镜像的问题。

### 食用方式

首先安装 wrangler 命令行工具 https://developers.cloudflare.com/workers/cli-wrangler/install-update

```
git clone https://github.com/tomwei7/hammal.git
cd hammal
mv wrangler.toml.sample wrangler.toml

# 获取 account_id id
wrangler whoami

# 创建 KV namespace
wrangler kv:namespace create hammal_cache

```

修改 wrangler.toml 文件填充 account_id 与 kv_namespaces 中的 id

```toml
name = "hammal"
type = "webpack"
account_id = "your account_id"
workers_dev = true
route = ""
zone_id = ""
webpack_config = "webpack.config.js"
kv_namespaces = [
	 { binding = "HAMMAL_CACHE", id = "you kv id" }
]
```

发布 workers

```
wrangler publish
```

发布 workers 可以获得类似 https://hammal.{your_name}.workers.dev  的地址，修改 registry-mirrors 地址为该地址即可

```
<<EOF sudo tee /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://hammal.{your_name}.workers.dev"
  ]
}
EOF
```
