# Lucky - LuCI App (JavaScript Version)

这是一个基于 JavaScript (LuCI Client-side Rendering) 重写的 Lucky 控制界面。相较于原始的 Lua 版本，新版具有更好的响应速度和更现代的架构。

## 项目结构

- **`lucky/`**: 主程序包。负责从 GitHub 自动下载对应架构的二进制文件，并处理系统的启动脚本 (`/etc/init.d/lucky`) 和初始配置 (`/etc/config/lucky`)。
- **`luci-app-lucky/`**: 界面包。包含基于 JavaScript 的 Web 界面逻辑、菜单定义、RPCD 权限管理及简体中文翻译。

## 主要功能

- **端口转发**: IPv4/IPv6 端口转发。
- **动态域名服务 (DDNS)**: 支持多种服务商。
- **反向代理**: 支持 HTTP/HTTPS 协议。
- **网络唤醒 (WOL)**: 支持通过第三方物联网平台进行语音控制。
- **状态监控**: 实时查看 Lucky 服务运行状态、版本信息及架构。
- **在线更新**: 提供直达 GitHub Release 的版本查询链接。

## 编译安装

将此目录放入 OpenWrt 源码目录的 `package` 文件夹下，然后运行：

```bash
make menuconfig # 在 LuCI -> Applications 中选中 luci-app-lucky
make package/luci-app-lucky/compile V=s
```

## 注意事项

- 本项目不再依赖 `luci-compat` (Lua 兼容层)，直接原生支持 OpenWrt 21.02+ 及后续版本的现代界面。
- 二进制文件下载逻辑在 `lucky/Makefile` 中，编译时需要联网访问 GitHub。

## 许可证

基于 GPL-3.0 协议。
