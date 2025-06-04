> [!NOTE]
> 此项目 ( nezha-dash-paper ) 为 nezha-dash-v1 的 第三方实现，具体参见: nezha-dash-v1
> https://github.com/hamster1963/nezha-dash-v1

## 自定义选项

nezha-dash-paper 支持多种自定义选项，包括自定义 Logo、描述、链接、背景图片等。这些自定义选项的优先级如下：

1. 动态注入的全局变量（window.CustomX）
2. 编译环境变量（VITE_CUSTOM_X）
3. 预定义字符串

### 自定义方式

#### 1. 动态注入（优先级最高）

可以通过在 HTML 中添加脚本标签来动态注入全局变量：

```html
<script>
  window.CustomLogo = "/path/to/your/logo.png"
  window.CustomDesc = "Your Custom Description"
  window.CustomLinks = '[{"name":"GitHub","link":"https://github.com"},{"name":"Docs","link":"https://docs.example.com"}]'
  window.CustomBackgroundImage = "https://example.com/background.jpg"
  window.CustomMobileBackgroundImage = "https://example.com/mobile-background.jpg"
  window.CustomIllustration = "/path/to/your/illustration.png"
</script>
```

#### 2. 环境变量（次优先级）

可以通过在 `.env` 文件中添加环境变量来自定义仪表盘的各种元素。这种方法不需要修改源代码，只需创建或编辑项目根目录下的 `.env` 文件即可。

**如何使用环境变量：**

1. 在项目根目录创建一个名为 `.env` 的文件（如果不存在）
2. 添加所需的环境变量，每行一个
3. 保存文件后重新构建项目（或重新启动开发服务器）

**示例 `.env` 文件：**

```
# 自定义描述文本
VITE_CUSTOM_DESC="我的服务器监控"

# 自定义 Logo 地址
VITE_CUSTOM_LOGO="/custom-logo.png"

# 自定义链接（JSON 格式）
VITE_CUSTOM_LINKS='[{"name":"GitHub","link":"https://github.com"},{"name":"文档","link":"https://docs.example.com"}]'

# 自定义背景图片
VITE_CUSTOM_BACKGROUND_IMAGE="https://example.com/background.jpg"

# 自定义移动端背景图片
VITE_CUSTOM_MOBILE_BACKGROUND_IMAGE="https://example.com/mobile-background.jpg"

# 自定义插图
VITE_CUSTOM_ILLUSTRATION="/custom-illustration.png"
```

**可用的环境变量：**

| 环境变量                            | 说明                                | 默认值                  |
| ----------------------------------- | ----------------------------------- | ----------------------- |
| VITE_CUSTOM_DESC                    | 自定义描述文本                      | 翻译键 "nezha"          |
| VITE_CUSTOM_LOGO                    | 自定义 Logo 地址                    | "/apple-touch-icon.png" |
| VITE_CUSTOM_LINKS                   | 自定义链接（JSON 格式）             | 无                      |
| VITE_CUSTOM_BACKGROUND_IMAGE        | 自定义背景图片                      | 无                      |
| VITE_CUSTOM_MOBILE_BACKGROUND_IMAGE | 自定义移动端背景图片                | 无                      |
| VITE_CUSTOM_ILLUSTRATION            | 自定义插图                          | "/animated-man.webp"    |
| VITE_PROXY_WS_TARGET                | WebSocket 代理目标地址              | "ws://127.0.0.1:8008"   |
| VITE_PROXY_HTTP_TARGET              | HTTP 代理目标地址                   | "http://127.0.0.1:8008" |
| VITE_DIRECT_API_ACCESS              | 启用直接 API 访问（不使用代理）     | false                   |
| VITE_API_HTTP_BASE                  | HTTP API 基础 URL（直接访问时使用） | "http://127.0.0.1:8008" |
| VITE_API_WS_BASE                    | WebSocket API 基础 URL（直接访问时使用） | "ws://127.0.0.1:8008" |

请参考项目根目录下的 `.env.example` 文件获取更多信息和示例。

### API 访问模式配置

nezha-dash-paper 支持两种 API 访问模式：

1. **代理模式**（默认）：前端通过服务器的反向代理访问 API。这种模式适用于大多数部署场景，特别是当 API 服务器与前端不在同一域名下时。

2. **直接访问模式**：前端直接访问 API 服务器，不经过代理。这种模式适用于 API 服务器支持跨域请求或与前端在同一域名下的场景。

**如何配置 API 访问模式：**

1. **代理模式**（默认）：
   - 设置 `VITE_DIRECT_API_ACCESS=false`（或不设置，默认为 false）
   - 配置 `VITE_PROXY_WS_TARGET` 和 `VITE_PROXY_HTTP_TARGET` 指向 API 服务器

2. **直接访问模式**：
   - 设置 `VITE_DIRECT_API_ACCESS=true`
   - 配置 `VITE_API_WS_BASE` 和 `VITE_API_HTTP_BASE` 指向 API 服务器

**示例配置（直接访问模式）：**

```
# 启用直接 API 访问
VITE_DIRECT_API_ACCESS=true
# HTTP API 基础 URL
VITE_API_HTTP_BASE="http://api.example.com:8008"
# WebSocket API 基础 URL
VITE_API_WS_BASE="ws://api.example.com:8008"
```

#### 3. 预定义字符串（最低优先级）

如果没有设置动态注入的全局变量和环境变量，将使用预定义的默认值。
