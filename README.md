# BonCV

BonCV 是一个私有、移动优先的简历内容库。它支持编辑结构化经历、保存多套简历方案、生成真实的 TeX/PDF 文件，并通过最小权限 API 向 BonBills FIRE 提供出生日期与教育信息。

## 本地运行

```bash
pnpm install
pnpm dev
```

开发环境未配置 `BONCV_LOGIN_KEY` 时，默认可使用 `?key=yy`。生产环境必须设置独立的长随机密钥。

结构化数据在本地写入被 Git 忽略的 `private/boncv.json`；配置 Upstash 后改用 Redis。照片和生成文件在本地写入 `output/`，配置 Vercel Blob 后改用 Private Blob。

## Vercel 环境变量

```bash
BONCV_LOGIN_KEY=
SESSION_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_APP_URL=
```

`postinstall` 会在 Linux x64 构建环境中校验 SHA-256 后下载固定版本 Tectonic，并用 BonCV 模板预热只读依赖缓存。Vercel 函数运行时强制 `--only-cached --untrusted`，不会临时下载 TeX 包；也可用 `TECTONIC_BIN`、`TECTONIC_BUNDLE`、`TECTONIC_CACHE_DIR` 覆盖默认路径。本地开发使用 `xelatex -no-shell-escape`。

照片仅接受 JPEG/PNG，生成时与 TeX/PDF 一样保存在 Private Blob。公开仓库中的 `lib/fixtures.ts` 只包含虚构数据；真实导入数据位于被 Git 忽略的私有存储。

首次配置 Upstash 后，可从本地未跟踪文件做一次性导入（脚本会清空本地生成历史和测试连接密钥）：

```bash
pnpm import:private -- private/boncv.json
```

## FIRE API

```http
GET /api/v1/fire-profile
Authorization: Bearer bcv_...
```

密钥从“连接”页面创建，只展示一次。`fire:read` 响应不包含姓名、联系方式或经历正文。
