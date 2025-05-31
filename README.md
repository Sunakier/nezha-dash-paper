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
  window.CustomLogo = "/path/to/your/logo.png";
  window.CustomDesc = "Your Custom Description";
  window.CustomLinks = '[{"name":"GitHub","link":"https://github.com"},{"name":"Docs","link":"https://docs.example.com"}]';
  window.CustomBackgroundImage = "https://example.com/background.jpg";
  window.CustomMobileBackgroundImage = "https://example.com/mobile-background.jpg";
  window.CustomIllustration = "/path/to/your/illustration.png";
</script>
```

#### 2. 环境变量（次优先级）

可以通过在 `.env` 文件中添加环境变量来自定义：

```
VITE_CUSTOM_LOGO="/path/to/your/logo.png"
VITE_CUSTOM_DESC="Your Custom Description"
VITE_CUSTOM_LINKS='[{"name":"GitHub","link":"https://github.com"},{"name":"Docs","link":"https://docs.example.com"}]'
VITE_CUSTOM_BACKGROUND_IMAGE="https://example.com/background.jpg"
VITE_CUSTOM_MOBILE_BACKGROUND_IMAGE="https://example.com/mobile-background.jpg"
VITE_CUSTOM_ILLUSTRATION="/path/to/your/illustration.png"
```

请参考 `.env.example` 文件获取更多信息。

#### 3. 预定义字符串（最低优先级）

如果没有设置动态注入的全局变量和环境变量，将使用预定义的默认值。
