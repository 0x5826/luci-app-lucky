# luci-app-lucky

Lucky 是一款功能强大的网络工具，支持 IPv4/IPv6 端口转发、动态域名服务 (DDNS)、HTTP/HTTPS 反向代理、网络唤醒 (WOL) 等功能。本项目是其对应的 OpenWrt LuCI 控制界面。

## 🌟 核心特性

-   **全功能支持**：集成端口转发、DDNS、反向代理及 WOL 网络唤醒。
-   **极简 UI 设计**：采用无横线极简布局，页面板块对齐，视觉清爽。
-   **高性能交互**：
    -   **选项卡切换**：设置与日志分离，支持 100 行实时滚动日志。
    -   **无感刷新**：采用异步并行数据抓取，操作反馈延迟统一，无需整体刷新页面。
    -   **实时监控**：基于 `ubus` 精准检测服务运行状态。
-   **稳健安全**：
    -   **参数保护**：所有后端指令均经过 Shell 转义，支持安全入口设置。
    -   **标准管控**：遵循 `procd` 规范，支持命令行与 Web 界面同步管控。
-   **完全汉化**：提供完整的简体中文支持。

## 🛠️ 安装说明

### 1. 编译安装
将本项目克隆至 OpenWrt 源码的 `package` 目录下：
```bash
git clone https://git.seckv.com/dante/luci-app-lucky.git package/luci-app-lucky
make menuconfig # 在 LuCI -> Applications 中勾选 luci-app-lucky
make package/luci-app-lucky/compile V=s
```

### 2. 手动安装
将编译好的 `.ipk` 文件上传至路由器后执行：
```bash
opkg install lucky_*.ipk
opkg install luci-app-lucky_*.ipk
```

## 📸 界面预览

-   **设置面板**：包含服务状态控制、主程序信息、管理面板配置以及基础设置。
-   **运行日志**：独立选项卡，灰底终端风格，实时追踪程序运行轨迹。

## ⚙️ 默认配置

-   **默认端口**：16601
-   **默认配置路径**：`/etc/config/lucky.daji/`
-   **默认账号密码**：666

## 🤝 鸣谢

- [lucky](https://github.com/gdy666/lucky): 本项目核心二进制程序。
- [luci-app-lucky-lua](https://github.com/sirpdboy/luci-app-lucky): 部分 UI 逻辑参考。

